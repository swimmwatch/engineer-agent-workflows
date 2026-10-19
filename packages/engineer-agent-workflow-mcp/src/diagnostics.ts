import type { Data } from "./state.js";

const MAX_ISSUES = 20;
const MAX_DETAILS_BYTES = 8192;

export type WorkflowConflictCause =
  | "stale_context"
  | "dependency_changed_during_read"
  | "review_source_changed"
  | "unknown";

const CONFLICT_ISSUE_KINDS = new Set([
  "validation",
  "question_options",
  "batch_member",
  "review_lifecycle",
  "workflow_conflict",
]);
const CONFLICT_CATEGORIES = new Set([
  "duplicate",
  "unknown",
  "foreign",
  "stale",
  "unknown_requirement",
  "unknown_field",
  "invalid_type",
  "too_small",
  "too_big",
  "invalid_value",
  "invalid_format",
  "invalid_union",
  "custom",
  "invalid",
]);

type DiagnosticPath = Array<number | string>;

function record(value: unknown): Data {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Data
    : {};
}

function collectPublishedFields(value: unknown, fields = new Set<string>()): Set<string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return fields;
  const schema = value as Data;
  const properties = record(schema.properties);
  for (const [name, child] of Object.entries(properties)) {
    fields.add(name);
    collectPublishedFields(child, fields);
  }
  collectPublishedFields(schema.items, fields);
  for (const child of Array.isArray(schema.anyOf) ? schema.anyOf : []) {
    collectPublishedFields(child, fields);
  }
  for (const child of Array.isArray(schema.oneOf) ? schema.oneOf : []) {
    collectPublishedFields(child, fields);
  }
  for (const child of Object.values(record(schema.definitions))) {
    collectPublishedFields(child, fields);
  }
  return fields;
}

function validationCategory(code: unknown): string {
  switch (code) {
    case "unrecognized_keys": return "unknown_field";
    case "invalid_type": return "invalid_type";
    case "too_small": return "too_small";
    case "too_big": return "too_big";
    case "invalid_value": return "invalid_value";
    case "invalid_format": return "invalid_format";
    case "invalid_union": return "invalid_union";
    case "custom": return "custom";
    default: return "invalid";
  }
}

function validationIssue(value: unknown, published: ReadonlySet<string>): Data {
  const issue = record(value);
  const path: DiagnosticPath = [];
  for (const segment of Array.isArray(issue.path) ? issue.path : []) {
    if (typeof segment === "number" && Number.isSafeInteger(segment) && segment >= 0) {
      path.push(segment);
    } else if (typeof segment === "string" && published.has(segment)) {
      path.push(segment);
    }
  }
  const rawLimit = issue.code === "too_big" ? issue.maximum
    : issue.code === "too_small" ? issue.minimum
      : undefined;
  return {
    kind: "validation",
    category: validationCategory(issue.code),
    path,
    ...(typeof rawLimit === "number" && Number.isFinite(rawLimit)
      ? { limit: rawLimit }
      : {}),
  };
}

function encodedBytes(value: Data): number {
  return Buffer.byteLength(JSON.stringify(value));
}

export function workflowDiagnostics(
  sourceIssues: readonly Data[],
  nextAction: string,
): Data {
  const issues = structuredClone(sourceIssues.slice(0, MAX_ISSUES));
  let truncated = sourceIssues.length > issues.length || issues.some((issue) => issue.allowed_subjects_complete === false);
  let details: Data = { issues, truncated, next_action: nextAction };

  while (encodedBytes(details) > MAX_DETAILS_BYTES) {
    const question = issues.find((issue) => (
      issue.kind === "question_options"
      && Array.isArray(issue.allowed_option_ids)
      && issue.allowed_option_ids.length > 0
    ));
    if (question && Array.isArray(question.allowed_option_ids)) {
      question.allowed_option_ids.pop();
      question.allowed_option_ids_complete = false;
      question.decision_ref = question.question_ref;
      truncated = true;
    } else if (issues.some((issue) => issue.kind === "document_subject" && Array.isArray(issue.allowed_subjects) && issue.allowed_subjects.length)) {
      const subject = issues.find((issue) => issue.kind === "document_subject")!;
      (subject.allowed_subjects as unknown[]).pop();
      subject.allowed_subjects_complete = false;
      truncated = true;
    } else if (issues.length > 1) {
      issues.pop();
      truncated = true;
    } else {
      const issue = issues[0];
      if (!issue) break;
      if (issue.kind === "validation" && Array.isArray(issue.path) && issue.path.length) {
        issue.path.pop();
      } else {
        issues[0] = {
          kind: issue.kind,
          ...(typeof issue.item_index === "number" ? { item_index: issue.item_index } : {}),
          ...(typeof issue.category === "string" ? { category: issue.category } : {}),
        };
      }
      truncated = true;
    }
    details = { issues, truncated, next_action: nextAction };
  }
  return details;
}

export function validationDiagnostics(
  issues: readonly unknown[],
  publishedSchema: unknown,
): Data {
  const published = collectPublishedFields(publishedSchema);
  return {
    details: workflowDiagnostics(
      issues.map((issue) => validationIssue(issue, published)),
      "use_published_schema",
    ),
  };
}

/** Normalize Ajv v6 JSON-pointer errors without reflecting caller values or keys. */
export function productValidationDiagnostics(
  sourceIssues: readonly unknown[],
  publishedSchema: unknown,
): Data {
  const published = collectPublishedFields(publishedSchema);
  const issues = sourceIssues.map((source) => {
    const issue = record(source);
    const params = record(issue.params);
    const pointer = typeof issue.dataPath === "string" ? issue.dataPath : "";
    const path: DiagnosticPath = [];
    for (const raw of pointer.split("/").slice(1)) {
      const segment = raw.replaceAll("~1", "/").replaceAll("~0", "~");
      if (published.has(segment)) path.push(segment);
      else if (/^(?:0|[1-9][0-9]*)$/u.test(segment) && Number.isSafeInteger(Number(segment))) path.push(Number(segment));
    }
    if (issue.keyword === "required" && typeof params.missingProperty === "string" && published.has(params.missingProperty)) {
      path.push(params.missingProperty);
    }
    const lower = ["minimum", "exclusiveMinimum", "minLength", "minItems", "minProperties"].includes(String(issue.keyword));
    const upper = ["maximum", "exclusiveMaximum", "maxLength", "maxItems", "maxProperties"].includes(String(issue.keyword));
    const category = issue.keyword === "additionalProperties" ? "unknown_field"
      : issue.keyword === "type" || issue.keyword === "required" ? "invalid_type"
        : lower ? "too_small" : upper ? "too_big"
          : issue.keyword === "pattern" || issue.keyword === "format" ? "invalid_format" : "invalid_value";
    const bound = typeof params.limit === "number" && Number.isFinite(params.limit) ? params.limit : undefined;
    const root = record(publishedSchema);
    const resolve = (schema: unknown): Data => {
      let current = record(schema);
      for (let depth = 0; depth < 20 && typeof current.$ref === "string" && current.$ref.startsWith("#/definitions/"); depth += 1) {
        current = record(record(root.definitions)[current.$ref.slice("#/definitions/".length)]);
      }
      return current;
    };
    let constraint = resolve(root);
    for (const segment of path) {
      constraint = resolve(typeof segment === "number" ? constraint.items : record(constraint.properties)[segment]);
    }
    const expected = issue.keyword === "type" && ["object", "array", "string", "integer", "number", "boolean", "null"].includes(String(params.type))
      ? String(params.type)
      : ["required", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "minItems", "maxItems", "minProperties", "maxProperties", "enum", "const", "pattern", "format", "additionalProperties", "anyOf", "oneOf"].includes(String(issue.keyword))
        ? String(issue.keyword) : "published_constraint";
    return {
      kind: "validation", category, path, expected,
      ...(bound === undefined ? {} : { limit: bound, ...(lower ? { minimum: bound } : upper ? { maximum: bound } : {}) }),
      ...(typeof constraint.minimum === "number" ? { minimum: constraint.minimum } : {}),
      ...(typeof constraint.maximum === "number" ? { maximum: constraint.maximum } : {}),
    };
  });
  return { details: workflowDiagnostics(issues, "use_published_schema") };
}

export function documentSubjectDiagnostics(input: {
  readonly allowedSubjects: readonly string[];
  readonly candidateRef: Data;
  readonly ambiguous: boolean;
}): Data {
  const safeSubjects = input.allowedSubjects.filter((subject) => !(
    /(?:(?:authorization\s*:\s*bearer|api[_-]?key\s*[:=]|access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|private[_-]?key\s*[:=]|secret[_-]?access[_-]?key\s*[:=]|password\s*[:=]|secret\s*[:=]|bearer\s+[A-Za-z0-9._~+/-]+)|-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY|(?:AKIA|ASIA)[A-Z0-9]{16}|github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}|(?:\/{1,2}[^\s/]|~[\\/]|[a-z]:[\\/]|\\{1,2}[^\s\\])|[a-z][a-z0-9+.-]*:\/\/[^\s/@]+@)/iu.test(subject)
  ));
  return {
    details: workflowDiagnostics([{
      kind: "document_subject", path: ["subject"], category: input.ambiguous ? "ambiguous" : "unknown",
      expected: "registered_subject", allowed_subjects: [...new Set(safeSubjects)].sort(),
      allowed_subjects_complete: safeSubjects.length === input.allowedSubjects.length,
      discovery: { tool: "product_document_list", candidate_ref: input.candidateRef, arguments: { artifact: "technical-design", limit: 1 } },
    }], "product_document_list"),
  };
}

export function questionOptionsDiagnostics(
  questionRef: Data,
  allowedOptionIds: readonly string[],
): Data {
  return {
    details: workflowDiagnostics([{
      kind: "question_options",
      question_ref: questionRef,
      allowed_option_ids: [...allowedOptionIds],
      allowed_option_ids_complete: true,
    }], "read_saved_question"),
  };
}

export function batchMemberDiagnostics(input: {
  readonly itemIndex: number;
  readonly category: "duplicate" | "unknown" | "foreign" | "stale" | "unknown_requirement";
  readonly requestedRef?: Data;
  readonly currentRef?: Data;
}): Data {
  return {
    details: workflowDiagnostics([{
      kind: "batch_member",
      item_index: input.itemIndex,
      category: input.category,
      ...(input.requestedRef ? { requested_ref: input.requestedRef } : {}),
      ...(input.currentRef ? { current_ref: input.currentRef } : {}),
    }], "reopen_and_inspect_saved_state"),
  };
}

export function reviewLifecycleDiagnostics(input: {
  readonly reviewRef: string;
  readonly mode: "full" | "followup";
  readonly reason: string;
  readonly nextAction: string;
}): Data {
  return {
    details: workflowDiagnostics([{
      kind: "review_lifecycle",
      review_ref: input.reviewRef,
      mode: input.mode,
      reason: input.reason,
      next_action: input.nextAction,
    }], input.nextAction),
  };
}

export function workflowConflictDiagnostics(input: {
  readonly cause: WorkflowConflictCause;
  readonly nextAction: "reopen_and_inspect_review" | "start_fresh_review";
  readonly existingIssues?: readonly Data[];
  readonly review?: {
    readonly reviewRef: string;
    readonly mode: "full" | "followup";
  };
}): Data {
  const issues: Data[] = (input.existingIssues ?? []).map((issue) => {
    const kind = typeof issue.kind === "string" && CONFLICT_ISSUE_KINDS.has(issue.kind)
      ? issue.kind
      : "workflow_conflict";
    return {
      kind,
      ...(typeof issue.item_index === "number" && Number.isSafeInteger(issue.item_index) && issue.item_index >= 0
        ? { item_index: issue.item_index }
        : {}),
      ...(typeof issue.category === "string" && CONFLICT_CATEGORIES.has(issue.category)
        ? { category: issue.category }
        : {}),
      ...(kind === "review_lifecycle" && (issue.mode === "full" || issue.mode === "followup")
        ? { mode: issue.mode }
        : {}),
    };
  });
  if (input.review && !issues.some((issue) => issue.kind === "review_lifecycle")) {
    issues.unshift({
      kind: "review_lifecycle",
      review_ref: input.review.reviewRef,
      mode: input.review.mode,
      reason: input.cause,
      next_action: input.nextAction,
      conflict_cause: input.cause,
    });
  }
  issues.push({
    kind: "workflow_conflict",
    conflict_cause: input.cause,
    next_action: input.nextAction,
  });
  return {
    conflict_cause: input.cause,
    next_action: input.nextAction,
    details: workflowDiagnostics(issues, input.nextAction),
  };
}
