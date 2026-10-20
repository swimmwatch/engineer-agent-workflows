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
  let truncated = sourceIssues.length > issues.length;
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
