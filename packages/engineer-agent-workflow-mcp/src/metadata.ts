type JsonSchema = Record<string, unknown>;

const REFERENCE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  answer_ref: "Exact answer reference returned by the corresponding answer-recording scenario; do not reconstruct it.",
  candidate_ref: "Exact product candidate reference returned by the product draft or mutation being continued.",
  decision_ref: "Exact decision reference returned by the corresponding decision search, read, or write scenario.",
  direction_ref: "Exact Idea direction element reference returned by the corresponding definition or read scenario.",
  element_ref: "Exact semantic element reference returned by the corresponding definition, search, or read scenario.",
  instruction_ref: "Exact instruction reference returned by the corresponding instruction-recording scenario.",
  owner_ref: "Exact packet-owner reference returned when the current task packet was started.",
  parent_review_ref: "Exact completed parent review reference returned by the prior full review.",
  proposal_ref: "Exact scope proposal reference returned by the corresponding scope-proposal scenario.",
  question_ref: "Exact pending question reference returned by the corresponding question-preparation or scope-proposal scenario.",
  requires_task_ref: "Exact active Roadmap task reference that the selected task depends on.",
  resolution_ref: "Exact accepted resolution reference returned by the amendment reconciliation workflow.",
  review_ref: "Exact review reference returned by review start or status; it remains bound to that review snapshot.",
  source_ref: "Exact source reference supporting this safety record; use a server-issued or registered source reference.",
  stage_ref: "Exact Roadmap stage reference returned by the corresponding definition or read scenario.",
  task_ref: "Exact active Roadmap task reference returned by the corresponding definition or read scenario.",
};

const REFERENCE_LIST_DESCRIPTIONS: Readonly<Record<string, string>> = {
  affected_refs: "Exact affected element or decision references already returned or registered by the workflow.",
  element_refs: "Exact semantic element references returned by product definition, search, or read scenarios.",
  operation_refs: "Replacement list of exact operation references; values are deduplicated and must not be reconstructed.",
  related_refs: "Exact related product references already returned or registered by the workflow.",
  required_refs: "Exact required product references selected for this bounded context request.",
  review_refs: "Exact completed review references required for activation; do not substitute status text or candidate versions.",
  token_refs: "Replacement list of exact token references; values are deduplicated before storage.",
};

const FIELD_DESCRIPTIONS: Readonly<Record<string, string>> = {
  changes_receipt: "Receipt returned only after the complete current change inventory was read; use it with the same review.",
  consistency_receipt: "Receipt returned only after the complete consistency evidence was read; use it with the same review snapshot.",
  cursor: "Server-issued next_cursor from the preceding matching page or portion; keep the same tool, source, selectors, and filters, and omit it for the first page.",
  expected_source_version: "Optional source version previously observed by the caller; a mismatch reports changed source state instead of rebasing silently.",
  project: "Absolute path of the project that owns the requested specification workflow artifacts.",
  read_receipt: "Receipt returned only after the corresponding exact review item or consistency source was read completely.",
  report_version: "Exact structured change-report version returned by specification_review_changes_summary for the same parent review and current sources.",
  specification: "Specification slug under the selected project's docs/specs directory.",
  specification_review_ref: "Exact reviewed specification reference recorded by the task workflow.",
  specification_source_version: "Exact approved task-specification source version recorded by the specification workflow.",
};

const TOOL_FIELD_DESCRIPTIONS: Readonly<Record<string, string>> = {
  "requirement_get.source_version": "Optional exact source_version returned by requirement_list for the same specification snapshot; mismatch reports changed source state.",
  "roadmap_record_stage_outcome.evidence_refs": "Exact product element references supporting the integrated stage outcome; use references returned by product definition or element-read scenarios.",
  "specification_review_record.evidence_source_refs": "Exact decision references returned by decision_find or decision_get for original source decisions supporting this requirement verdict.",
  "task_packet_complete.evidence_refs": "Caller-recorded non-sensitive references to verification evidence for the current packet; supply exact plain strings stored with completion.",
};

function isProductTool(name: string): boolean {
  return /^(?:product|idea|prd|technical|roadmap|task)_/u.test(name);
}

function descriptionFor(toolName: string, fieldName: string): string | undefined {
  const toolFieldDescription = TOOL_FIELD_DESCRIPTIONS[`${toolName}.${fieldName}`];
  if (toolFieldDescription !== undefined) return toolFieldDescription;
  if (fieldName === "context") {
    return isProductTool(toolName)
      ? "Opaque product-workflow context returned by product_open or the latest successful product mutation; always use the newest returned value."
      : "Opaque specification-workflow context returned by specification_open or the latest successful mutation; always use the newest returned value.";
  }
  if (fieldName === "cursor" && toolName === "product_context_next") {
    return "Server-issued next_cursor from product_context_prepare or the preceding product_context_next response for the same selection.";
  }
  return FIELD_DESCRIPTIONS[fieldName]
    ?? REFERENCE_DESCRIPTIONS[fieldName]
    ?? REFERENCE_LIST_DESCRIPTIONS[fieldName];
}

export function describeInputSchema(toolName: string, schema: JsonSchema): JsonSchema {
  const properties = schema.properties;
  if (properties === null || typeof properties !== "object" || Array.isArray(properties)) return schema;
  let changed = false;
  const described = Object.fromEntries(Object.entries(properties).map(([fieldName, property]) => {
    const description = descriptionFor(toolName, fieldName);
    if (description === undefined || property === null || typeof property !== "object" || Array.isArray(property)) {
      return [fieldName, property];
    }
    if (typeof (property as JsonSchema).description === "string") return [fieldName, property];
    changed = true;
    return [fieldName, { ...(property as JsonSchema), description }];
  }));
  return changed ? { ...schema, properties: described } : schema;
}
