import { readFile } from "node:fs/promises";
import Ajv from "ajv";
import { z } from "zod";
import {
  fail, hash, id, load, mutateReviewSubmission, obj, readConsistent, rows, unchanged,
} from "./state.js";
import type { Context, Data } from "./state.js";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const entityType = z.enum(["run", "packet_attempt"]);
const bindingSchema = z.object({
  source_version: digest, behavioral_source_version: digest, specification_version: digest,
}).strict();
const mutationSchema = bindingSchema.extend({
  operation_id: id, entity_type: entityType, entity_ref: id,
  expected_revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER - 1),
  payload: z.record(z.string(), z.unknown()),
}).strict();
const readSchema = z.object({
  entity_type: entityType.optional(), entity_ref: id.optional(), operation_id: id.optional(),
  cursor: z.string().min(1).max(8192).optional(),
}).strict().refine(value => Boolean(value.entity_type) === Boolean(value.entity_ref)
  && !(value.entity_type && value.operation_id));
const cursorSchema = z.object({ identity: digest, offset: z.number().int().nonnegative() }).strict();
type Binding = z.infer<typeof bindingSchema>;
type MutationInput = z.infer<typeof mutationSchema>;
type Selection = z.infer<typeof readSchema>;

export interface PacketReviewChange {
  // The owning scenario recomputes its selected Git/packet/agreement inputs here,
  // using guarded dependency reads. Storage cannot infer a review selection.
  source: (context: Context) => Promise<Binding>;
  apply: (current: Data | undefined, context: Context) => Promise<{ entity: Data; result: Data }>
    | { entity: Data; result: Data };
}

function emptyState(): Data { return { schema_version: 1, runs: [], packet_attempts: [] }; }
function collection(type: "run" | "packet_attempt"): "runs" | "packet_attempts" {
  return type === "run" ? "runs" : "packet_attempts";
}
function entityId(type: "run" | "packet_attempt"): "run_id" | "attempt_id" {
  return type === "run" ? "run_id" : "attempt_id";
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const fields = Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    return `{${fields.map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) fail("INVALID_INPUT", "Packet state must contain only JSON data.");
  return encoded;
}

function unique(records: Data[], key: string): Set<unknown> {
  const ids = records.map(record => record[key]);
  if (new Set(ids).size !== ids.length) fail("INVALID_STATE", "Packet state contains duplicate identifiers.", { field: key });
  return new Set(ids);
}

function references(values: unknown, targets: Set<unknown>, field: string): void {
  if (!Array.isArray(values) || values.some(value => !targets.has(value))) {
    fail("BROKEN_REFERENCE", "Packet state contains an unavailable local reference.", { field });
  }
}

function ordered(records: Data[], key: string): void {
  unique(records, key);
  unique(records, "operation_id");
  if (records.some((record, index) => record.sequence !== index + 1)) {
    fail("INVALID_STATE", "Packet evidence sequence must be contiguous.");
  }
}

function validateRun(run: Data, specification: string): void {
  if (run.specification !== specification) fail("BROKEN_REFERENCE", "Review run belongs to another specification.");
  const packets = new Set(run.packet_ids as string[]);
  const units = rows(run.units);
  const unitIds = unique(units, "unit_id");
  const criteria = rows(run.criteria);
  const criterionIds = unique(criteria, "criterion_id");
  const assignments = rows(run.assignments);
  const assignmentIds = unique(assignments, "assignment_id");
  const findings = rows(run.findings);
  const findingIds = unique(findings, "finding_id");
  const executions = rows(run.executions);
  const executionIds = unique(executions, "execution_id");
  const resources = rows(run.resources);
  const resourceIds = unique(resources, "resource_id");
  const invocations = rows(run.invocations);
  const invocationIds = unique(invocations, "invocation_id");
  const assessments = rows(run.assessments);
  const assessmentIds = unique(assessments, "assessment_id");
  for (const record of [...units, ...assignments, ...executions, ...assessments, ...rows(run.events)]) {
    if (record.source_version !== run.source_version) fail("INVALID_STATE", "Run evidence has a different source identity.");
  }
  for (const unit of units) {
    references(unit.packet_ids, packets, "packet_ids");
    references(unit.criterion_ids, criterionIds, "criterion_ids");
    references(unit.depends_on_units, unitIds, "depends_on_units");
  }
  for (const criterion of criteria) {
    references([criterion.packet_id], packets, "packet_id");
    references(criterion.assessment_refs, assessmentIds, "assessment_refs");
  }
  const inputs = rows(run.packet_inputs);
  unique(inputs, "packet_id");
  references(inputs.map(input => input.packet_id), packets, "packet_inputs");
  references([...packets], new Set(inputs.map(input => input.packet_id)), "packet_inputs");
  for (const assignment of assignments) references(assignment.unit_ids, unitIds, "unit_ids");
  for (const finding of findings) {
    references(finding.packet_ids, packets, "packet_ids");
    references(finding.criterion_ids, criterionIds, "criterion_ids");
    unique(rows(finding.propositions), "proposition_id");
    const history = rows(finding.disposition_history);
    unique(history, "disposition_ref");
    if (history.some((entry, index) => entry.sequence !== index + 1 || entry.source_version !== run.source_version)) {
      fail("INVALID_STATE", "Finding disposition history is inconsistent.");
    }
    for (const proposition of rows(finding.propositions)) {
      if (proposition.parent_finding_id !== finding.finding_id) fail("BROKEN_REFERENCE", "Proposition belongs to another finding.");
      references(proposition.affected_packet_ids, packets, "affected_packet_ids");
      references(proposition.criterion_ids, criterionIds, "criterion_ids");
    }
  }
  for (const execution of executions) {
    references(execution.criterion_ids ?? [], criterionIds, "criterion_ids");
    references(execution.resource_refs ?? [], resourceIds, "resource_refs");
    if (execution.finding_ref) references([execution.finding_ref], findingIds, "finding_ref");
    if (execution.reused_execution_ref) references([execution.reused_execution_ref], executionIds, "reused_execution_ref");
  }
  for (const invocation of invocations) {
    if (invocation.resume_of) references([invocation.resume_of], invocationIds, "resume_of");
  }
  for (const assessment of assessments) {
    references([assessment.assignment_id], assignmentIds, "assignment_id");
    references(assessment.unit_ids, unitIds, "unit_ids");
    references(assessment.criterion_ids, criterionIds, "criterion_ids");
    references(assessment.finding_refs, findingIds, "finding_refs");
  }
  for (const key of ["integration_assessment_ref", "consistency_assessment_ref"]) {
    if (run[key]) references([run[key]], assessmentIds, key);
  }
  ordered(rows(run.events), "event_id");
  const entityIds = new Set([run.run_id, ...unitIds, ...criterionIds, ...assignmentIds,
    ...findingIds, ...executionIds, ...resourceIds, ...invocationIds, ...assessmentIds]);
  for (const event of rows(run.events)) references([event.entity_ref], entityIds, "entity_ref");
}

function validateReferences(state: Data, specification: string): void {
  const runs = rows(state.runs);
  const attempts = rows(state.packet_attempts);
  unique(runs, "run_id");
  const attemptIds = unique(attempts, "attempt_id");
  for (const run of runs) validateRun(run, specification);
  for (const attempt of attempts) {
    ordered(rows(attempt.observations), "observation_id");
    if (attempt.prior_attempt_ref) {
      const prior = attempts.find(candidate => candidate.attempt_id === attempt.prior_attempt_ref);
      if (!prior || attempt.prior_attempt_ref === attempt.attempt_id || !attemptIds.has(attempt.prior_attempt_ref)
        || prior.packet_id !== attempt.packet_id || attempts.indexOf(prior) >= attempts.indexOf(attempt)) {
        fail("BROKEN_REFERENCE", "Prior attempt must be an earlier attempt of the same packet.");
      }
    }
  }
  const operations = rows(state.operations ?? []);
  unique(operations, "operation_id");
  const revisions = new Map<string, number>();
  const finalizations = new Map<string, Data>();
  for (const operation of operations) {
    const type = entityType.parse(operation.entity_type);
    const records = rows(state[collection(type)]);
    const entity = records.find(record => record[entityId(type)] === operation.entity_ref);
    if (!entity) fail("BROKEN_REFERENCE", "An acknowledged operation has no owning entity.");
    const key = canonical([type, operation.entity_ref]);
    const revision = (revisions.get(key) ?? 0) + 1;
    if (operation.entity_revision !== revision) fail("INVALID_STATE", "Entity operation revisions are not contiguous.");
    revisions.set(key, revision);
    if (operation.finalization_event_ref !== undefined) {
      const event = type === "run" ? rows(entity.events).find(item => item.event_id === operation.finalization_event_ref) : undefined;
      if (!event || event.kind !== "finalized" || event.source_version !== operation.source_version) {
        fail("BROKEN_REFERENCE", "Finalization history must reference its owning run's finalized event.");
      }
      const finalizationKey = canonical([entity.run_id, event.event_id]);
      if (finalizations.has(finalizationKey)) fail("INVALID_STATE", "A finalized event has duplicate outcome snapshots.");
      finalizations.set(finalizationKey, obj(operation.finalization_snapshot));
    }
  }
  for (const run of runs) {
    const latest = rows(run.events).findLast(event => event.kind === "finalized");
    const saved = latest && finalizations.get(canonical([run.run_id, latest.event_id]));
    if (saved && canonical(saved) !== canonical(run.finalization)) {
      fail("INVALID_STATE", "Current finalization differs from its retained outcome snapshot.");
    }
  }
}

// Validator ownership is per operation, matching the persistence boundary. The
// canonical journal schema remains the only maintained schema source.
async function createStateValidator(): Promise<Ajv.ValidateFunction> {
  const schema = JSON.parse(await readFile(new URL("./schemas/decisions.schema.json", import.meta.url), "utf8")) as Data;
  const definitions = obj(schema.definitions);
  return new Ajv({ allErrors: true, jsonPointers: true }).compile({
    ...obj(definitions.packetReviewState), definitions,
  });
}

function validateState(state: Data, specification: string, validator: Ajv.ValidateFunction): void {
  if (state.schema_version !== 1) fail("UNSUPPORTED_VERSION", "Unsupported packet review state version.");
  if (!validator(state)) fail("INVALID_STATE", "Packet review state does not match its supported schema.", {
    fields: validator.errors?.slice(0, 10).map(error => ({ path: error.dataPath, rule: error.keyword })),
  });
  validateReferences(state, specification);
}

function stateFrom(ledger: Data): Data {
  const extension = obj(ledger.extensions ?? {});
  return obj(extension.packet_review ?? emptyState());
}

export async function readPacketReviewState(context: string, selection: Selection = {}): Promise<Data> {
  const selected = readSchema.parse(selection);
  return readConsistent(context, async current => {
    const validator = await createStateValidator();
    const ledger = (await load(current, "decisions")).value;
    const state = stateFrom(ledger);
    validateState(state, current.specification, validator);
    let value: unknown = state;
    if (selected.entity_type) {
      value = rows(state[collection(selected.entity_type)]).find(record => record[entityId(selected.entity_type!)] === selected.entity_ref);
    } else if (selected.operation_id) {
      value = rows(state.operations ?? []).find(record => record.operation_id === selected.operation_id);
    }
    if (value === undefined) fail("NOT_FOUND", "Packet state selection does not belong to this specification.");
    const text = JSON.stringify(value);
    const sourceVersion = hash(text);
    const identity = hash(canonical([current.project, current.specification, sourceVersion,
      selected.entity_type ?? null, selected.entity_ref ?? null, selected.operation_id ?? null]));
    let offset = 0;
    if (selected.cursor) {
      let cursor;
      try { cursor = cursorSchema.parse(JSON.parse(Buffer.from(selected.cursor, "base64url").toString("utf8"))); }
      catch { return fail("INVALID_CURSOR", "Packet state cursor is invalid."); }
      if (cursor.identity !== identity) fail("STALE_CURSOR", "Packet state or selection changed; restart the read.");
      offset = cursor.offset;
      if (offset >= text.length) fail("INVALID_CURSOR", "Packet state cursor exceeds the selected record.");
    }
    const portion = text.slice(offset, offset + 4096);
    const next = offset + portion.length;
    return { text: portion, source_version: sourceVersion, offset, total_characters: text.length,
      complete: next === text.length,
      next_cursor: next < text.length ? Buffer.from(JSON.stringify({ identity, offset: next })).toString("base64url") : null };
  });
}

function preserveHistory(before: Data, after: Data, type: "run" | "packet_attempt"): void {
  const immutable = type === "run"
    ? ["run_id", "specification", "packet_ids", "mode", "input_issues", "behavioral_source_version", "specification_version", "source_version", "selection", "units", "packet_inputs"]
    : ["attempt_id", "packet_id", "behavioral_source_version", "specification_version", "agreement_ref", "proposal_digest", "required_kinds", "prior_attempt_ref"];
  for (const key of immutable) {
    if (canonical(before[key] ?? null) !== canonical(after[key] ?? null)) fail("CONFLICT", "Acknowledged entity identity cannot be replaced.", { field: key });
  }
  const history = type === "run" ? ["events", "assessments"] : ["observations"];
  for (const key of history) {
    const original = rows(before[key]);
    const next = rows(after[key]);
    if (canonical(next.slice(0, original.length)) !== canonical(original)) fail("CONFLICT", "Acknowledged evidence cannot be removed or rewritten.", { field: key });
  }
  if (type === "packet_attempt" && before.completion_state === "completed" && canonical(before) !== canonical(after)) {
    fail("CONFLICT", "A completed packet attempt is immutable; create a new attempt.");
  }
  if (type === "run") {
    for (const key of ["assignments", "findings", "executions", "resources", "invocations", "criteria"]) {
      const original = rows(before[key]);
      const next = rows(after[key]);
      const identifier = { assignments: "assignment_id", findings: "finding_id", executions: "execution_id",
        resources: "resource_id", invocations: "invocation_id", criteria: "criterion_id" }[key]!;
      for (const record of original) {
        const replacement = next.find(candidate => candidate[identifier] === record[identifier]);
        if (!replacement) fail("CONFLICT", "Acknowledged entities cannot be removed.", { field: key });
        if (key === "resources") {
          for (const field of ["resource_kind", "ownership", "safe_reference", "creator_actor_ref", "creation_evidence_ref"]) {
            if (canonical(record[field] ?? null) !== canonical(replacement[field] ?? null)) {
              fail("CONFLICT", "Resource identity and creation provenance are immutable.", { field });
            }
          }
        }
        if (key === "executions" && !["not_run", "running"].includes(String(record.status))) {
          const priorObservation = { ...record };
          const nextObservation = { ...replacement };
          delete priorObservation.restoration_status;
          delete nextObservation.restoration_status;
          if (canonical(priorObservation) !== canonical(nextObservation)) {
            fail("CONFLICT", "Terminal execution evidence cannot be rewritten.");
          }
        }
        if (key === "findings") {
          const prior = rows(record.disposition_history);
          if (canonical(rows(replacement.disposition_history).slice(0, prior.length)) !== canonical(prior)) {
            fail("CONFLICT", "Finding disposition history cannot be rewritten.");
          }
          for (const field of ["origin_actor_ref", "original_claim", "failure_scenario", "impact", "original_severity"]) {
            if (canonical(record[field]) !== canonical(replacement[field])) fail("CONFLICT", "Original finding evidence is immutable.");
          }
        }
      }
    }
  }
}

function finalizationReceipt(before: Data | undefined, after: Data, type: "run" | "packet_attempt", operations: Data[]): Data {
  if (type !== "run") return {};
  const priorEvents = before ? rows(before.events) : [];
  const newFinalizations = rows(after.events).slice(priorEvents.length).filter(event => event.kind === "finalized");
  if (newFinalizations.length > 1) fail("INVALID_STATE", "Record one finalized outcome per operation.");
  const priorFinalized = priorEvents.findLast(event => event.kind === "finalized");
  if (before && priorFinalized && canonical(before.finalization) !== canonical(after.finalization)) {
    const saved = operations.find(operation => operation.entity_type === "run" && operation.entity_ref === before.run_id
      && operation.finalization_event_ref === priorFinalized.event_id);
    if (!saved || canonical(saved.finalization_snapshot) !== canonical(before.finalization) || newFinalizations.length !== 1) {
      fail("CONFLICT", "Retain the previous outcome and append a finalized event before replacing a finalization.");
    }
  }
  if (!newFinalizations.length) return {};
  return { finalization_event_ref: newFinalizations[0]!.event_id, finalization_snapshot: structuredClone(after.finalization) };
}

export async function mutatePacketReviewState(
  context: string, operation: string, input: MutationInput, change: PacketReviewChange, signal?: AbortSignal,
): Promise<Data> {
  const requested = mutationSchema.parse(input);
  id.parse(operation);
  const payloadDigest = hash(canonical({ operation, input: requested }));
  return mutateReviewSubmission(context, operation, requested, async (ledger, current) => {
    const validator = await createStateValidator();
    const state = stateFrom(ledger);
    validateState(state, current.specification, validator);
    const actual = bindingSchema.parse(await change.source(current));
    for (const key of ["source_version", "behavioral_source_version", "specification_version"] as const) {
      if (actual[key] !== requested[key]) fail("STALE_SOURCE", "Logical packet inputs changed; inspect and prepare a new attempt or run.", {
        operation_applied: false, next_action: "inspect_source_and_prepare", field: key,
      });
    }
    const operations = rows(state.operations ?? []);
    const previous = operations.find(record => record.operation_id === requested.operation_id);
    if (previous) {
      if (previous.payload_digest !== payloadDigest) fail("CONFLICT", "Operation ID already acknowledges different content.");
      return unchanged({ ...obj(previous.result), entity_ref: previous.entity_ref, entity_revision: previous.entity_revision });
    }
    const records = rows(state[collection(requested.entity_type)]);
    const key = entityId(requested.entity_type);
    const existing = records.find(record => record[key] === requested.entity_ref);
    const revision = operations.filter(record => record.entity_type === requested.entity_type
      && record.entity_ref === requested.entity_ref).length;
    if (revision !== requested.expected_revision) fail("CONFLICT", "Entity revision changed; inspect acknowledged operations before retrying.");
    if (existing && revision === 0) fail("INVALID_STATE", "Existing entity has no acknowledged creation operation.");
    const outcome = await change.apply(existing ? structuredClone(existing) : undefined, current);
    const entity = obj(outcome.entity);
    const result = obj(outcome.result);
    if (Buffer.byteLength(canonical(result)) > 4096) fail("RESULT_LIMIT", "Packet operation result exceeds its storage budget.");
    if (entity[key] !== requested.entity_ref) fail("BROKEN_REFERENCE", "Mutation returned a different entity.");
    for (const field of ["behavioral_source_version", "specification_version"] as const) {
      if (entity[field] !== requested[field]) fail("STALE_SOURCE", "Entity does not match the selected specification inputs.");
    }
    if (requested.entity_type === "run" && entity.source_version !== requested.source_version) {
      fail("STALE_SOURCE", "Run does not match the selected source.");
    }
    if (existing) preserveHistory(existing, entity, requested.entity_type);
    const finalization = finalizationReceipt(existing, entity, requested.entity_type, operations);
    state[collection(requested.entity_type)] = existing ? records.map(record => record === existing ? entity : record) : [...records, entity];
    state.operations = [...operations, { operation_id: requested.operation_id, operation,
      entity_type: requested.entity_type, entity_ref: requested.entity_ref, entity_revision: revision + 1,
      source_version: requested.source_version, payload_digest: payloadDigest, result, ...finalization }];
    validateState(state, current.specification, validator);
    if (Object.keys(ledger).length === 0) Object.assign(ledger, { schema_version: 1, spec_slug: current.specification, decisions: [] });
    ledger.extensions = { ...obj(ledger.extensions ?? {}), packet_review: state };
    return { ...result, entity_ref: requested.entity_ref, entity_revision: revision + 1 };
  }, signal);
}
