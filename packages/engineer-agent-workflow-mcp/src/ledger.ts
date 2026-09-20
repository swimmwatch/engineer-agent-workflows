import { createHash } from "node:crypto";

import { isAlias, isMap, isNode, isSeq, parseAllDocuments } from "yaml";
import type { Node } from "yaml";

const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const MAX_REVISIONS = 100_000;
const MAX_DECISION_ID_LENGTH = 512;
const MAX_ERROR_MESSAGE_LENGTH = 512;
const SPECIFICATION_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type LedgerErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "UNSAFE_PATH"
  | "SOURCE_CHANGED"
  | "SOURCE_LIMIT"
  | "INVALID_YAML"
  | "INVALID_LEDGER"
  | "INVALID_CURSOR"
  | "STALE_CURSOR"
  | "RESULT_LIMIT"
  | "INTERNAL_ERROR";

export class LedgerError extends Error {
  readonly code: LedgerErrorCode;

  constructor(code: LedgerErrorCode, message: string) {
    super(message.slice(0, MAX_ERROR_MESSAGE_LENGTH));
    this.name = "LedgerError";
    this.code = code;
  }
}

export type JsonValue = JsonObject | JsonValue[] | boolean | null | number | string;

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface Decision extends JsonObject {
  readonly id: string;
  readonly revision: number;
  readonly category: string;
  readonly state: string;
  readonly provenance: string;
}

export interface Ledger {
  readonly specification: string;
  readonly version: string;
  readonly decisions: readonly Decision[];
  readonly current: readonly Decision[];
  readonly warningCounts: Readonly<Record<string, number>>;
}

export interface SearchFilters {
  readonly ids?: readonly string[] | undefined;
  readonly states?: readonly string[] | undefined;
  readonly categories?: readonly string[] | undefined;
  readonly requirement_ids?: readonly string[] | undefined;
  readonly text?: string | undefined;
  readonly history?: boolean | undefined;
}

/** Parses and validates the data-only decision journal format. */
export function parseLedger(bytes: Uint8Array, specification: string): Ledger {
  validateSpecification(specification);
  if (bytes.byteLength > MAX_SOURCE_BYTES) {
    throw new LedgerError("SOURCE_LIMIT", "Decision source exceeds the 16 MiB limit.");
  }

  const source = decodeUtf8(bytes);
  const document = parseSingleDocument(source);
  validateYamlNodes(document.contents);

  let parsed: unknown;
  try {
    parsed = document.toJS({ mapAsMap: false, maxAliasCount: 0 });
  } catch {
    throw new LedgerError("INVALID_YAML", "Decision source cannot be converted safely.");
  }

  const root = requireJsonObject(parsed, "Decision source root must be a mapping.");
  validateRoot(root, specification);
  const rawDecisions = root.decisions;
  if (!Array.isArray(rawDecisions)) {
    throw new LedgerError("INVALID_LEDGER", "Decision source must contain a decisions list.");
  }
  if (rawDecisions.length > MAX_REVISIONS) {
    throw new LedgerError("SOURCE_LIMIT", "Decision source exceeds the revision limit.");
  }

  const decisions = rawDecisions.map(validateDecision);
  validateUniquePairs(decisions);
  validateSupersedesLinks(decisions);

  const sortedDecisions = [...decisions].sort(compareDecisions);
  const { current, warningCounts } = selectCurrent(sortedDecisions);
  const version = createHash("sha256").update(bytes).digest("hex");

  return {
    specification,
    version,
    decisions: sortedDecisions,
    current,
    warningCounts,
  };
}

/** Returns deterministic records matching the supplied reader-level filters. */
export function searchDecisions(ledger: Ledger, filters: SearchFilters): Decision[] {
  const candidates = filters.history ? ledger.decisions : ledger.current;
  const text = filters.text?.toLowerCase();

  return candidates.filter((decision) => {
    if (!matchesAny(filters.ids, decision.id)) return false;
    if (!matchesAny(filters.states, decision.state)) return false;
    if (!matchesAny(filters.categories, decision.category)) return false;
    if (!matchesRequirementIds(filters.requirement_ids, decision.requirement_ids)) return false;
    if (text !== undefined && !stringifyContent(decision).toLowerCase().includes(text)) {
      return false;
    }
    return true;
  });
}

/** Returns the selected current revision, or the explicitly requested historical revision. */
export function findDecision(ledger: Ledger, id: string, revision?: number): Decision {
  const candidates = revision === undefined ? ledger.current : ledger.decisions;
  const found = candidates.find(
    (decision) => decision.id === id && (revision === undefined || decision.revision === revision),
  );
  if (found === undefined) {
    throw new LedgerError("NOT_FOUND", "Requested decision revision was not found.");
  }
  return found;
}

function validateSpecification(specification: string): void {
  if (
    specification.length === 0 ||
    specification.length > 128 ||
    !SPECIFICATION_PATTERN.test(specification)
  ) {
    throw new LedgerError("INVALID_INPUT", "Specification name is invalid.");
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new LedgerError("INVALID_YAML", "Decision source is not valid UTF-8 YAML.");
  }
}

function parseSingleDocument(source: string) {
  let documents;
  try {
    documents = parseAllDocuments(source, {
      merge: false,
      prettyErrors: false,
      resolveKnownTags: false,
      schema: "core",
      stringKeys: true,
      uniqueKeys: true,
    });
  } catch {
    throw new LedgerError("INVALID_YAML", "Decision source is malformed YAML.");
  }
  if (documents.length !== 1 || documents[0] === undefined || documents[0].errors.length > 0) {
    throw new LedgerError("INVALID_YAML", "Decision source must contain one valid YAML document.");
  }
  return documents[0];
}

function validateYamlNodes(node: Node | null): void {
  if (node === null) return;
  if (isAlias(node) || node.tag !== undefined) {
    throw new LedgerError("INVALID_YAML", "Decision source uses unsupported YAML features.");
  }
  if (isMap(node)) {
    for (const pair of node.items) {
      validateUnknownYamlNode(pair.key);
      validateUnknownYamlNode(pair.value);
    }
    return;
  }
  if (isSeq(node)) {
    for (const item of node.items) validateUnknownYamlNode(item);
  }
}

function validateUnknownYamlNode(value: unknown): void {
  if (isNode(value)) validateYamlNodes(value);
}

function validateRoot(root: JsonObject, specification: string): void {
  if (root.schema_version !== 1) {
    throw new LedgerError("INVALID_LEDGER", "Decision source schema version is unsupported.");
  }
  if (root.spec_slug !== specification) {
    throw new LedgerError("INVALID_LEDGER", "Decision source specification does not match the request.");
  }
}

function validateDecision(value: JsonValue): Decision {
  const decision = requireJsonObject(value, "Decision record must be a mapping.");
  validateDecisionId(decision);
  validateRequiredString(decision, "category");
  validateRequiredString(decision, "state");
  validateRequiredString(decision, "provenance");
  if (!isPositiveSafeInteger(decision.revision)) {
    throw new LedgerError("INVALID_LEDGER", "Decision revision must be a positive safe integer.");
  }
  validateOptionalFields(decision);
  return decision as Decision;
}

function validateDecisionId(decision: JsonObject): void {
  if (!isNonemptyString(decision.id) || decision.id.length > MAX_DECISION_ID_LENGTH) {
    throw new LedgerError("INVALID_LEDGER", "Decision ID must be a nonempty string of at most 512 characters.");
  }
}

function validateOptionalFields(decision: JsonObject): void {
  if (Object.hasOwn(decision, "answer") && decision.answer !== null && !isDecisionAnswer(decision.answer)) {
    throw new LedgerError("INVALID_LEDGER", "Decision answer must be null or a complete answer mapping.");
  }
  if (Object.hasOwn(decision, "question") && decision.question !== null && !isDecisionQuestion(decision.question)) {
    throw new LedgerError("INVALID_LEDGER", "Decision question must be null or a complete question mapping.");
  }
  if (Object.hasOwn(decision, "evidence") && !isStringArray(decision.evidence)) {
    throw new LedgerError("INVALID_LEDGER", "Decision evidence must be a string list.");
  }
  if (Object.hasOwn(decision, "requirement_ids") && !isStringArray(decision.requirement_ids)) {
    throw new LedgerError("INVALID_LEDGER", "Decision requirement IDs must be a string list.");
  }
  if (Object.hasOwn(decision, "status") && !isNonemptyString(decision.status)) {
    throw new LedgerError("INVALID_LEDGER", "Decision status must be a nonempty string.");
  }
  if (Object.hasOwn(decision, "rationale") && typeof decision.rationale !== "string") {
    throw new LedgerError("INVALID_LEDGER", "Decision rationale must be a string.");
  }
  if (
    Object.hasOwn(decision, "supersedes_revision") &&
    decision.supersedes_revision !== null &&
    !isPositiveSafeInteger(decision.supersedes_revision)
  ) {
    throw new LedgerError("INVALID_LEDGER", "Decision supersedes revision must be null or positive.");
  }
}

function isDecisionAnswer(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    typeof value.text === "string" &&
    isStringArray(value.selected_ids)
  );
}

function isDecisionQuestion(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    isNonemptyString(value.text) &&
    isNonemptyString(value.kind) &&
    Array.isArray(value.options) &&
    value.options.every(isQuestionOption)
  );
}

function isQuestionOption(value: unknown): value is JsonObject {
  return isJsonObject(value) && isNonemptyString(value.id) && isNonemptyString(value.label);
}

function validateUniquePairs(decisions: readonly Decision[]): void {
  const pairs = new Set<string>();
  for (const decision of decisions) {
    const pair = decisionPair(decision.id, decision.revision);
    if (pairs.has(pair)) {
      throw new LedgerError("INVALID_LEDGER", "Decision ID and revision pairs must be unique.");
    }
    pairs.add(pair);
  }
}

function validateSupersedesLinks(decisions: readonly Decision[]): void {
  const pairs = new Set(decisions.map((decision) => decisionPair(decision.id, decision.revision)));
  for (const decision of decisions) {
    const supersededRevision = decision.supersedes_revision;
    if (supersededRevision === undefined || supersededRevision === null) continue;
    if (!isPositiveSafeInteger(supersededRevision)) {
      throw new LedgerError("INVALID_LEDGER", "Decision supersedes link is invalid.");
    }
    if (supersededRevision >= decision.revision || !pairs.has(decisionPair(decision.id, supersededRevision))) {
      throw new LedgerError("INVALID_LEDGER", "Decision supersedes link is invalid.");
    }
  }
}

function selectCurrent(decisions: readonly Decision[]): {
  readonly current: Decision[];
  readonly warningCounts: Record<string, number>;
} {
  const byId = new Map<string, Decision[]>();
  for (const decision of decisions) {
    const group = byId.get(decision.id);
    if (group === undefined) byId.set(decision.id, [decision]);
    else group.push(decision);
  }

  const current: Decision[] = [];
  let multipleCurrentRevisions = 0;
  for (const records of byId.values()) {
    const nonSuperseded = records.filter((decision) => decision.state !== "superseded");
    if (nonSuperseded.length === 0) continue;
    const consumed = new Set(
      records.flatMap((decision) => (
        decision.supersedes_revision === undefined || decision.supersedes_revision === null
          ? []
          : [decision.supersedes_revision]
      )),
    );
    const heads = nonSuperseded.filter((decision) => !consumed.has(decision.revision));
    if (heads.length > 1) multipleCurrentRevisions += 1;
    const newest = nonSuperseded.at(-1);
    if (newest !== undefined) current.push(newest);
  }

  return {
    current: current.sort(compareDecisions),
    warningCounts: { multiple_current_revisions: multipleCurrentRevisions },
  };
}

function compareDecisions(left: Decision, right: Decision): number {
  return left.id.localeCompare(right.id) || left.revision - right.revision;
}

function matchesAny(values: readonly string[] | undefined, candidate: string): boolean {
  return values === undefined || values.length === 0 || values.includes(candidate);
}

function matchesRequirementIds(
  values: readonly string[] | undefined,
  requirementIds: JsonValue | undefined,
): boolean {
  if (values === undefined || values.length === 0) return true;
  if (!Array.isArray(requirementIds)) return false;
  return requirementIds.some(
    (requirementId) => typeof requirementId === "string" && values.includes(requirementId),
  );
}

function stringifyContent(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(stringifyContent).join("\n");
  const content: string[] = [];
  for (const key of Object.keys(value)) {
    const field = value[key];
    if (field !== undefined) content.push(stringifyContent(field));
  }
  return content.join("\n");
}

function requireJsonObject(value: unknown, message: string): JsonObject {
  if (!isJsonObject(value)) throw new LedgerError("INVALID_LEDGER", message);
  return value;
}

function isJsonObject(value: unknown): value is JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  return Object.values(value).every(isJsonValue);
}

function isJsonValue(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (Array.isArray(value) && value.every(isJsonValue)) ||
    isJsonObject(value)
  );
}

function isStringArray(value: unknown): value is JsonValue[] {
  return Array.isArray(value) && value.every(isNonemptyString);
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function validateRequiredString(decision: JsonObject, field: string): void {
  if (!isNonemptyString(decision[field])) {
    throw new LedgerError("INVALID_LEDGER", `Decision ${field} must be a nonempty string.`);
  }
}

function decisionPair(id: string, revision: number): string {
  return `${id}\u0000${revision}`;
}
