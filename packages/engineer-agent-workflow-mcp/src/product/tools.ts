import { readFileSync } from "node:fs";

import Ajv from "ajv";

import type { WorkflowTool } from "../api.js";
import { fail } from "../state.js";
import { productValidationDiagnostics } from "../diagnostics.js";
import { resolveProductRoot } from "./config.js";
import {
  findProductDecisions,
  findProductElements,
  prepareProductContext,
  readContextPage,
  readProductDecision,
  readProductElement,
  readProductSourcesBatch,
} from "./context.js";
import {
  bindWorkspace,
  initializeProduct,
  listProducts,
  productCapabilities,
  resolveWorkspace,
} from "./bindings.js";
import {
  acceptDocumentEdits,
  beginDocumentEdit,
  createDocumentSubject,
  inspectDocumentEdits,
  listProductDocuments,
  moveDocumentElements,
  renameProductDocument,
} from "./documents.js";
import {
  chooseIdeaDirection,
  compareIdeaDirection,
  defineIdeaProblem,
  definePrdElement,
} from "./definition.js";
import {
  answerProductQuestion,
  confirmProductScope,
  draftProductArtifact,
  prepareProductQuestion,
  proposeProductScope,
  recordProductAssumption,
  recordProductInstruction,
  recordProductNoAnswer,
  recordProductObservation,
  recordProductResearch,
  readCandidateRecord,
  resumeProductInterview,
} from "./interview.js";
import {
  defineRoadmapElement,
  linkRoadmapDependency,
  recordRoadmapStageOutcome,
  retireRoadmapTask,
  splitRoadmapTask,
  unlinkRoadmapDependency,
} from "./roadmap.js";
import {
  activateAmendment,
  checkProductCandidate,
  completeProductReview,
  expandProductReviewScope,
  getProductReviewStatus,
  inspectAmendmentImpact,
  inspectAmendmentActivation,
  prepareAmendment,
  readProductReviewConsistency,
  readProductReviewItem,
  readProductReviewBatch,
  rebaseAmendment,
  recordProductReviewConsistency,
  recordProductVerdict,
  recordProductVerdictBatch,
  startProductReview,
} from "./review.js";
import { validateProductRecord } from "./schemas.js";
import {
  checkTaskInputsSummary,
  prepareTaskPacketContext,
  readTaskInputDetails,
  reconcileTaskInputs,
  completeTaskPacket,
  recordSafetyBlock,
  registerTaskSpecificationCopy,
  reserveTaskSpecification,
  resolveSafetyBlock,
  startTaskPacket,
} from "./tasks.js";
import { productSessionHandlers } from "./sessions.js";
import { defineTechnicalElement } from "./technical.js";

interface ProductSchema {
  readonly $id: string;
  readonly definitions: Record<string, Record<string, unknown>>;
}

const productSchema = JSON.parse(
  readFileSync(new URL("../schemas/product.schema.json", import.meta.url), "utf8"),
) as ProductSchema;
const ajv = new Ajv({ allErrors: true, jsonPointers: true, strictKeywords: true });
if (!ajv.validateSchema(productSchema)) throw new Error("Published product schema is invalid.");
ajv.addSchema(productSchema);

function referencedDefinitions(value: unknown, result: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) referencedDefinitions(item, result);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === "$ref" && typeof nested === "string" && nested.startsWith("#/definitions/")) {
      const name = nested.slice("#/definitions/".length);
      if (!result.has(name)) {
        const definition = productSchema.definitions[name];
        if (definition === undefined) throw new Error("Published product schema contains an unresolved definition.");
        result.add(name);
        referencedDefinitions(definition, result);
      }
    } else {
      referencedDefinitions(nested, result);
    }
  }
}

function selfContainedSchema(name: string): Record<string, unknown> {
  const root = productSchema.definitions[name];
  if (root === undefined) throw new Error("Published product schema is missing a tool definition.");
  const references = new Set<string>();
  referencedDefinitions(root, references);
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    ...root,
    definitions: Object.fromEntries([...references].sort().map((reference) => [reference, productSchema.definitions[reference]])),
  };
}

function validator(name: string): Ajv.ValidateFunction {
  const validate = ajv.getSchema(`${productSchema.$id}#/definitions/${name}`);
  if (validate === undefined) throw new Error("Published product schema cannot compile a tool definition.");
  return validate;
}

function productTool(
  name: string,
  description: string,
  inputDefinition: string,
  outputDefinition: "Success_Capabilities" | "Success_OpenResult" | "Success_Page" | "Success_InterviewResume"
  | "Success_MutationResult" | "Success_EditResult" | "Success_Portion" | "Success_ContextSelection" | "Success_SourceBatch"
  | "Success_ReviewStatus" | "Success_ReviewPortion" | "Success_ReviewBatch" | "Success_CheckResult" | "Success_TaskCheckResult"
  | "Success_SessionResult" | "Success_TaskCheckSummary" | "Success_TaskInputDetails" | "Success_CandidateRecordPortion" | "Success_ActivationStatus",
  write: boolean,
  run: (input: Record<string, unknown>) => Promise<Record<string, unknown>>,
  destructive = false,
): WorkflowTool {
  const validateInput = validator(inputDefinition);
  return {
    name,
    description,
    inputSchema: selfContainedSchema(inputDefinition),
    outputSchema: selfContainedSchema(outputDefinition),
    schemaKind: "json",
    write,
    destructive,
    async run(input): Promise<Record<string, unknown>> {
      if (!validateInput(input)) return fail("INVALID_INPUT", "Use the published parameters for this product scenario.",
        productValidationDiagnostics(validateInput.errors ?? [], selfContainedSchema(inputDefinition)));
      const output = await run(input as Record<string, unknown>);
      return await validateProductRecord(outputDefinition, output);
    },
  };
}

function envelope(outcome: {
  readonly context: string | null;
  readonly result: object;
  readonly replayed: boolean;
  readonly operationRef: string | null;
}): Record<string, unknown> {
  return {
    protocol_version: 2,
    context: outcome.context,
    result: outcome.result,
    replayed: outcome.replayed,
    operation_ref: outcome.operationRef,
  };
}

export const productTools: WorkflowTool[] = [
  productTool(
    "product_capabilities",
    "List implemented product workflow scenarios and report whether the configured local product store is available; read only and never initializes storage.",
    "product_capabilities_input",
    "Success_Capabilities",
    false,
    async (input) => envelope(await productCapabilities({ root: resolveProductRoot(), ...(input.representation === undefined ? {} : { representation: input.representation as "explicit-v1" }) })),
  ),
  productTool(
    "product_open",
    "Resolve one absolute local workspace to an explicit product binding and current revision; read only, with no name or remote-URL matching.",
    "product_open_input",
    "Success_OpenResult",
    false,
    async (input) => {
      const workspace = String(input.workspace);
      return envelope(await resolveWorkspace({ root: resolveProductRoot({ workspaceRoots: [workspace] }), workspace }));
    },
  ),
  productTool(
    "product_list",
    "List registered local products in stable bounded pages; read only and does not scan workspaces or initialize storage.",
    "product_list_input",
    "Success_Page",
    false,
    async (input) => envelope(await listProducts({
      root: resolveProductRoot(),
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
      ...(typeof input.limit === "number" ? { limit: input.limit } : {}),
    })),
  ),
  productTool(
    "product_initialize",
    "Explicitly create one local product, its initial Idea draft, and the first workspace binding; never enrolls existing task specifications.",
    "product_initialize_input",
    "Success_MutationResult",
    true,
    async (input) => {
      const workspace = String(input.workspace);
      return envelope(await initializeProduct({
        root: resolveProductRoot({ workspaceRoots: [workspace] }),
        workspace,
        name: String(input.name),
        knownIdea: String(input.known_idea),
      }));
    },
  ),
  productTool(
    "product_bind_workspace",
    "Explicitly bind one unbound absolute workspace to an existing selected product using the supplied user answer and provenance; never guesses or overwrites a binding.",
    "product_bind_workspace_input",
    "Success_MutationResult",
    true,
    async (input) => {
      const workspace = String(input.workspace);
      return envelope(await bindWorkspace({
        root: resolveProductRoot({ workspaceRoots: [workspace] }),
        workspace,
        productId: String(input.product_id),
        bindingAnswer: String(input.binding_answer),
        source: String(input.source),
      }));
    },
  ),
  productTool(
    "product_artifact_draft",
    "Create or exactly resume one isolated artifact candidate from the selected product revision and validated upstream pins.",
    "product_artifact_draft_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await draftProductArtifact({
      root: resolveProductRoot(),
      context: String(input.context),
      artifact: String(input.artifact) as "idea" | "prd" | "technical-design" | "roadmap",
      upstreamPins: input.upstream_pins as never[],
    })),
  ),
  productTool(
    "product_interview_resume",
    "Read the first unresolved question for one selected candidate, including saved options and the latest no-answer outcome; never writes or invents an answer.",
    "product_interview_resume_input",
    "Success_InterviewResume",
    false,
    async (input) => envelope(await resumeProductInterview({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
    })),
  ),
  productTool(
    "product_candidate_record_get",
    "Read one exact retained candidate decision or research record without activation or writes; follow every continuation for complete canonical JSON.",
    "product_candidate_record_get_input",
    "Success_CandidateRecordPortion",
    false,
    async (input) => envelope(await readCandidateRecord({
      root: resolveProductRoot(), context: String(input.context), candidateRef: input.candidate_ref as never,
      recordRef: input.record_ref as never,
      ...(input.cursor === undefined ? {} : { cursor: input.cursor as string }),
    })),
  ),
  productTool(
    "product_scope_propose",
    "Save one candidate-specific depth and profile proposal with an unresolved confirmation question; never treats defaults as consent.",
    "product_scope_propose_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await proposeProductScope({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      depth: input.depth as "lite" | "standard" | "deep",
      profiles: input.profiles as { id: string; reason: string }[],
      rationale: input.rationale as string[],
    })),
  ),
  productTool(
    "product_scope_confirm",
    "Confirm only the exact saved scope proposal backed by its current explicit affirmative answer.",
    "product_scope_confirm_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await confirmProductScope({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      proposalRef: input.proposal_ref as never,
      answerRef: input.answer_ref as never,
    })),
  ),
  productTool(
    "product_question_prepare",
    "Persist one candidate question and its options before the host-native question call; optional revisions preserve predecessor evidence.",
    "product_question_prepare_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await prepareProductQuestion({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      category: String(input.category),
      text: String(input.text),
      options: input.options as { id: string; label: string }[],
      ...(input.revises === undefined ? {} : { revises: input.revises as never }),
    })),
  ),
  productTool(
    "product_question_answer",
    "Record the exact actual native answer to the current saved question with its source; never authenticates consent independently.",
    "product_question_answer_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await answerProductQuestion({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      questionRef: input.question_ref as never,
      text: String(input.text),
      source: String(input.source),
      selectedIds: input.selected_ids as string[],
    })),
  ),
  productTool(
    "product_question_no_answer",
    "Record a dismissed, cancelled, timed-out, unavailable, invalid, or failed native question outcome while leaving it unresolved.",
    "product_question_no_answer_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await recordProductNoAnswer({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      questionRef: input.question_ref as never,
      outcome: input.outcome as "dismissed" | "cancelled" | "timed_out" | "unavailable" | "invalid_response" | "failed",
    })),
  ),
  productTool(
    "product_record_instruction",
    "Preserve one explicit non-sensitive instruction with exact source, predecessor decisions, and affected semantic references.",
    "product_record_instruction_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await recordProductInstruction({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      text: String(input.text),
      source: String(input.source),
      relatedRefs: input.related_refs as never[],
      affectedRefs: input.affected_refs as never[],
    })),
  ),
  productTool(
    "product_record_observation",
    "Record one non-sensitive observed fact and its source as data without treating repository text as executable authority.",
    "product_record_observation_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await recordProductObservation({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      finding: String(input.finding),
      source: String(input.source),
      affectedRefs: input.affected_refs as never[],
    })),
  ),
  productTool(
    "product_record_assumption",
    "Record one explicit non-sensitive assumption and its reconsideration condition without converting it into a fact or consent.",
    "product_record_assumption_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await recordProductAssumption({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      assumption: String(input.assumption),
      reconsiderWhen: String(input.reconsider_when),
      affectedRefs: input.affected_refs as never[],
    })),
  ),
  productTool(
    "product_record_research",
    "Store one bounded non-sensitive research conclusion with source dates, applicability, uncertainty, limitations, and its owning question.",
    "product_record_research_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await recordProductResearch({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      evidence: input.evidence as never,
    })),
  ),
  productTool(
    "idea_define_problem",
    "Create or update one addressed Idea problem from typed product meaning; preserves provenance and never starts another interview or downstream workflow.",
    "idea_define_problem_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await defineIdeaProblem({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      subject: String(input.subject),
      ...(input.element_ref === undefined ? {} : { elementRef: input.element_ref as never }),
      value: input.value,
    })),
    true,
  ),
  productTool(
    "idea_compare_direction",
    "Create or update one addressed candidate Idea direction with typed benefits, trade-offs and evidence links; does not choose it.",
    "idea_compare_direction_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await compareIdeaDirection({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      subject: String(input.subject),
      ...(input.element_ref === undefined ? {} : { elementRef: input.element_ref as never }),
      value: input.value,
    })),
    true,
  ),
  productTool(
    "idea_choose_direction",
    "Mark one compared Idea direction current using an exact saved explicit answer; never fabricates consent or creates a question.",
    "idea_choose_direction_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await chooseIdeaDirection({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      directionRef: input.direction_ref as never,
      answerRef: input.answer_ref as never,
    })),
    true,
  ),
  ...([
    ["prd_define_actor", "PrdActor", "prd_define_actor_input", "Create or update one addressed PRD actor with typed needs and constraints."],
    ["prd_define_goal", "PrdGoal", "prd_define_goal_input", "Create or update one addressed PRD goal while preserving unknown baselines and targets as unknown."],
    ["prd_define_capability", "PrdCapability", "prd_define_capability_input", "Create or update one addressed PRD capability with validated actor links and acceptance intent."],
    ["prd_define_use_case", "PrdUseCase", "prd_define_use_case_input", "Create or update one addressed PRD use case with triggers, preconditions, main, alternative and failure outcomes."],
    ["prd_define_rule", "PrdRule", "prd_define_rule_input", "Create or update one addressed PRD business rule with condition, obligation, exceptions and observation."],
    ["prd_define_constraint", "PrdConstraint", "prd_define_constraint_input", "Create or update one addressed PRD constraint with explicit kind and applicability."],
    ["prd_define_term", "VocabularyTerm", "prd_define_term_input", "Create or update one addressed PRD vocabulary term and aliases."],
  ] as const).map(([name, semanticType, inputDefinition, description]) => productTool(
    name,
    description,
    inputDefinition,
    "Success_MutationResult",
    true,
    async (input) => envelope(await definePrdElement({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      subject: String(input.subject),
      semanticType,
      ...(input.element_ref === undefined ? {} : { elementRef: input.element_ref as never }),
      value: input.value,
    })),
    true,
  )),
  ...([
    [
      "technical_define_boundary",
      "TechnicalBoundary",
      "technical_define_boundary_input",
      "Create or update one shared Technical Design boundary with exact PRD justification, ownership, flows, errors and applicability.",
    ],
    [
      "technical_define_technology",
      "TechnologyChoice",
      "technical_define_technology_input",
      "Create or update one evidence-grounded technology choice with alternatives, rationale, PRD links and revisit condition.",
    ],
    [
      "technical_define_policy",
      "TechnicalPolicy",
      "technical_define_policy_input",
      "Create or update one shared technical policy while retaining exact authoritative-contract reference and applicability.",
    ],
  ] as const).map(([name, semanticType, inputDefinition, description]) => productTool(
    name,
    description,
    inputDefinition,
    "Success_MutationResult",
    true,
    async (input) => envelope(await defineTechnicalElement({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      subject: String(input.subject),
      semanticType,
      ...(input.element_ref === undefined ? {} : { elementRef: input.element_ref as never }),
      value: input.value,
    })),
    true,
  )),
  ...([
    ["roadmap_define_stage", "Stage", "roadmap_define_stage_input", "Create or update one stable Roadmap stage with a user-defined label, order, outcome, verification, boundaries and risks."],
    ["roadmap_define_epic", "Epic", "roadmap_define_epic_input", "Create or update one Roadmap epic linked to exact product goals and one or more stages."],
    ["roadmap_define_story", "Story", "roadmap_define_story_input", "Create or update one user story linked to an exact PRD actor, epic and applicable stages."],
    ["roadmap_define_task", "Task", "roadmap_define_task_input", "Create or update one independent feature, technical or research task without creating its specification."],
  ] as const).map(([name, semanticType, inputDefinition, description]) => productTool(
    name,
    description,
    inputDefinition,
    "Success_MutationResult",
    true,
    async (input) => envelope(await defineRoadmapElement({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      subject: String(input.subject),
      semanticType,
      ...(input.element_ref === undefined ? {} : { elementRef: input.element_ref as never }),
      value: input.value,
    })),
    true,
  )),
  productTool(
    "roadmap_link_dependency",
    "Add one directed dependency between active Roadmap tasks after rejecting duplicates, self-links and cycles.",
    "roadmap_link_dependency_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await linkRoadmapDependency({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      taskRef: input.task_ref as never,
      requiresTaskRef: input.requires_task_ref as never,
    })),
    true,
  ),
  productTool(
    "roadmap_unlink_dependency",
    "Remove one existing task dependency in a candidate with an explicit affected-task answer and reason; rejects unfinished consumer bindings. Link a replacement prerequisite separately.",
    "roadmap_unlink_dependency_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await unlinkRoadmapDependency({
      root: resolveProductRoot(), context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      taskRef: input.task_ref as never, requiresTaskRef: input.requires_task_ref as never,
      answerRef: input.answer_ref as never, reason: String(input.reason),
      ...(input.resume_operation === undefined ? {} : { resumeOperationRef: input.resume_operation as string }),
    })),
    true,
  ),
  productTool(
    "roadmap_retire_task",
    "Retire an active task without completing it or allocating identities. Requires resolved consumers, an explicit answer, reason and existing redistribution recipients; preserves history and rejects unfinished bindings.",
    "roadmap_retire_task_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await retireRoadmapTask({
      root: resolveProductRoot(), context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      taskRef: input.task_ref as never, redistributedTo: input.redistributed_to as never[],
      answerRef: input.answer_ref as never, reason: String(input.reason),
      ...(input.resume_operation === undefined ? {} : { resumeOperationRef: input.resume_operation as string }),
    })),
    true,
  ),
  productTool(
    "roadmap_split_task",
    "Retire one active Roadmap task and create fresh independent task identities; rejects unresolved live dependents and never reuses a specification.",
    "roadmap_split_task_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await splitRoadmapTask({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      taskRef: input.task_ref as never,
      replacements: input.replacements as never[],
      answerRef: input.answer_ref as never,
    })),
    true,
  ),
  productTool(
    "roadmap_record_stage_outcome",
    "Record integrated stage-outcome evidence from scheduled work and a non-task product or technical result; a task counter alone is rejected.",
    "roadmap_record_stage_outcome_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await recordRoadmapStageOutcome({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      stageRef: input.stage_ref as never,
      evidenceRefs: input.evidence_refs as never[],
      observation: String(input.observation),
      source: String(input.source),
    })),
    true,
  ),
  productTool(
    "product_element_find",
    "Find active elements in one pinned product revision by exact artifact and optional literal text; return stable bounded references only.",
    "product_element_find_input",
    "Success_Page",
    false,
    async (input) => envelope(await findProductElements({
      root: resolveProductRoot(),
      context: String(input.context),
      ...(typeof input.artifact === "string" ? { artifact: input.artifact as never } : {}),
      ...(typeof input.text === "string" ? { text: input.text } : {}),
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
      ...(typeof input.limit === "number" ? { limit: input.limit } : {}),
    })),
  ),
  productTool(
    "product_element_get",
    "Read one exact semantic element from its immutable source pin in bounded continuations; never substitutes current or similarly named content.",
    "product_element_get_input",
    "Success_Portion",
    false,
    async (input) => envelope(await readProductElement({
      root: resolveProductRoot(),
      context: String(input.context),
      elementRef: input.element_ref as never,
      pin: input.pin as never,
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
    })),
  ),
  productTool(
    "product_decision_find",
    "Find current product decision heads in one pinned revision by exact artifact and optional literal text; return stable bounded references only.",
    "product_decision_find_input",
    "Success_Page",
    false,
    async (input) => envelope(await findProductDecisions({
      root: resolveProductRoot(),
      context: String(input.context),
      ...(typeof input.artifact === "string" ? { artifact: input.artifact as never } : {}),
      ...(typeof input.text === "string" ? { text: input.text } : {}),
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
      ...(typeof input.limit === "number" ? { limit: input.limit } : {}),
    })),
  ),
  productTool(
    "product_decision_get",
    "Read one exact current or retained historical product decision revision in bounded continuations; never guesses another revision.",
    "product_decision_get_input",
    "Success_Portion",
    false,
    async (input) => envelope(await readProductDecision({
      root: resolveProductRoot(),
      context: String(input.context),
      decisionRef: input.decision_ref as never,
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
    })),
  ),
  productTool(
    "product_sources_get_batch",
    "Read 1-20 exact element or decision portions with request-local integrity reuse, bounded bytes and ordered query-bound continuations; read only.",
    "product_sources_get_batch_input",
    "Success_SourceBatch",
    false,
    async (input) => envelope(await readProductSourcesBatch({
      root: resolveProductRoot(), context: String(input.context), requests: input.requests as never[],
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
    })),
  ),
  productTool(
    "product_context_prepare",
    "Prepare exact task/artifact inputs; implementation packet_id uses validated planning roots with explicit legacy fallback. Required references only expand closure.",
    "product_context_prepare_input",
    "Success_ContextSelection",
    false,
    async (input) => envelope(typeof input.packet_id === "string"
      ? await prepareTaskPacketContext({
        root: resolveProductRoot(), context: String(input.context), taskId: String(input.task_id), packetId: input.packet_id,
        ...(Array.isArray(input.required_refs) ? { requiredRefs: input.required_refs as never[] } : {}),
        ...(typeof input.budget_bytes === "number" ? { budgetBytes: input.budget_bytes } : {}),
      })
      : await prepareProductContext({
      root: resolveProductRoot(),
      context: String(input.context),
      purpose: input.purpose as never,
      ...(typeof input.task_id === "string" ? { taskId: input.task_id } : {}),
      ...(typeof input.artifact === "string" ? { artifact: input.artifact as never } : {}),
      ...(Array.isArray(input.required_refs) ? { requiredRefs: input.required_refs as never[] } : {}),
      ...(typeof input.budget_bytes === "number" ? { budgetBytes: input.budget_bytes } : {}),
    })),
  ),
  productTool(
    "product_context_next",
    "Continue one exact purpose-bound product context inventory using its opaque query- and source-bound cursor; read only.",
    "product_context_next_input",
    "Success_ContextSelection",
    false,
    async (input) => envelope(await readContextPage({
      root: resolveProductRoot(), context: String(input.context), cursor: String(input.cursor),
    })),
  ),
  productTool(
    "product_document_list",
    "List registered navigation and semantic Markdown members for one selected product artifact in stable bounded pages; read only.",
    "product_document_list_input",
    "Success_Page",
    false,
    async (input) => envelope(await listProductDocuments({
      root: resolveProductRoot(),
      context: String(input.context),
      artifact: String(input.artifact) as "idea" | "prd" | "technical-design" | "roadmap",
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
      ...(typeof input.limit === "number" ? { limit: input.limit } : {}),
    })),
  ),
  productTool(
    "product_document_create_subject",
    "Create one explicitly named semantic Markdown subject in the selected draft and regenerate navigation; never creates unrelated empty templates.",
    "product_document_create_subject_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await createDocumentSubject({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      subject: String(input.subject),
      title: String(input.title),
    })),
  ),
  productTool(
    "product_document_move_elements",
    "Move explicitly referenced semantic elements to one registered member of the same artifact while preserving element identities and unrelated bytes.",
    "product_document_move_elements_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await moveDocumentElements({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      elementRefs: input.element_refs as { product_id: string; artifact: "idea" | "prd" | "technical-design" | "roadmap"; element_id: string }[],
      targetDocumentId: String(input.target_document_id),
    })),
  ),
  productTool(
    "product_document_rename",
    "Rename one registered semantic document subject and its server-owned safe path while preserving element identities and regenerating navigation.",
    "product_document_rename_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await renameProductDocument({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      documentId: String(input.document_id),
      subject: String(input.subject),
      title: String(input.title),
    })),
  ),
  productTool(
    "product_document_begin_edit",
    "Return the exact editable draft path and retained base pin for one registered semantic Markdown document; never grants readiness.",
    "product_document_begin_edit_input",
    "Success_EditResult",
    true,
    async (input) => envelope(await beginDocumentEdit({
      root: resolveProductRoot(),
      context: String(input.context),
      artifact: String(input.artifact) as "idea" | "prd" | "technical-design" | "roadmap",
      documentId: String(input.document_id),
    })),
  ),
  productTool(
    "product_document_inspect_edits",
    "Inspect one registered draft document against retained candidate evidence and report changed or unchanged state without adopting edits.",
    "product_document_inspect_edits_input",
    "Success_Page",
    false,
    async (input) => envelope(await inspectDocumentEdits({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      documentId: String(input.document_id),
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
      ...(typeof input.limit === "number" ? { limit: input.limit } : {}),
    })),
  ),
  productTool(
    "product_document_accept_edits",
    "Accept the exact inspected digest of one directly edited registered Markdown member using an existing candidate instruction reference; preserves prior evidence.",
    "product_document_accept_edits_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await acceptDocumentEdits({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      documentId: String(input.document_id),
      observedDigest: String(input.observed_digest),
      instructionRef: input.instruction_ref as {
        product_id: string;
        artifact: "idea" | "prd" | "technical-design" | "roadmap";
        id: string;
        revision: number;
      },
    })),
  ),
  productTool(
    "product_review_start",
    "Start or resume one explicit independent review over the exact selected candidate snapshot; unchanged resume is read only.",
    "product_review_start_input",
    "Success_ReviewStatus",
    true,
    async (input) => envelope(await startProductReview({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      mode: input.mode as "full" | "followup" | "recheck",
      ...(input.parent_candidate_ref === undefined ? {} : { parentCandidateRef: input.parent_candidate_ref as { product_id: string; candidate_id: string } }),
      ...(typeof input.parent_review_ref === "string" ? { parentReviewRef: input.parent_review_ref } : {}),
      ...(Array.isArray(input.fixes) ? { fixes: input.fixes as never[] } : {}),
    })),
  ),
  productTool(
    "product_review_scope_expand",
    "Expand a current pending recheck to exact reviewer-selected blocks; inherited results become pending and fresh consistency is required. Exact retries are safe.",
    "product_review_scope_expand_input",
    "Success_ReviewStatus",
    true,
    async (input) => envelope(await expandProductReviewScope({ root: resolveProductRoot(), context: String(input.context),
      reviewRef: String(input.review_ref), itemKeys: input.item_keys as string[], reason: String(input.reason) })),
  ),
  productTool(
    "product_review_status",
    "Read one review's current coverage and next item without changing review, candidate or product state.",
    "product_review_status_input",
    "Success_ReviewStatus",
    false,
    async (input) => envelope(await getProductReviewStatus({
      root: resolveProductRoot(),
      context: String(input.context),
      reviewRef: String(input.review_ref),
    })),
  ),
  productTool(
    "product_review_get",
    "Read one exact frozen review item in bounded portions and issue a receipt only after the complete item is read.",
    "product_review_get_input",
    "Success_ReviewPortion",
    false,
    async (input) => envelope(await readProductReviewItem({
      root: resolveProductRoot(),
      context: String(input.context),
      reviewRef: String(input.review_ref),
      itemIndex: Number(input.item_index),
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
      ...(input.representation === undefined ? {} : { representation: input.representation as "explicit-v1" }),
    })),
  ),
  productTool(
    "product_review_record",
    "Record one verdict bound to a complete frozen-item read receipt; exact retries never duplicate verdicts.",
    "product_review_record_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await recordProductVerdict({
      root: resolveProductRoot(),
      context: String(input.context),
      reviewRef: String(input.review_ref),
      value: input.value as never,
    })),
  ),
  productTool(
    "product_review_get_batch",
    "Read up to 20 exact frozen review blocks within the response byte budget; finish partial blocks using product_review_get before recording verdicts.",
    "product_review_get_batch_input", "Success_ReviewBatch", false,
    async (input) => envelope(await readProductReviewBatch({ root: resolveProductRoot(), context: String(input.context),
      reviewRef: String(input.review_ref), startIndex: Number(input.start_index),
      ...(input.pending_only === undefined ? {} : { pendingOnly: Boolean(input.pending_only) }),
      ...(input.limit === undefined ? {} : { limit: Number(input.limit) }),
      ...(input.representation === undefined ? {} : { representation: input.representation as "explicit-v1" }),
    })),
  ),
  productTool(
    "product_review_record_batch",
    "Atomically record 1–20 independently justified block verdicts with complete-read receipts; reject overlap and invalid members, and replay the exact saved request without duplicate writes.",
    "product_review_record_batch_input", "Success_MutationResult", true,
    async (input) => envelope(await recordProductVerdictBatch({ root: resolveProductRoot(), context: String(input.context),
      reviewRef: String(input.review_ref), items: input.items as never[],
    })),
  ),
  productTool(
    "product_review_consistency_get",
    "Read final consistency in bounded portions; legacy object_sha256 hashes the saved verdict. Opt-in explicit-v1 separates source and verdict digest domains.",
    "product_review_consistency_get_input",
    "Success_ReviewPortion",
    false,
    async (input) => envelope(await readProductReviewConsistency({
      root: resolveProductRoot(),
      context: String(input.context),
      reviewRef: String(input.review_ref),
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
      ...(input.representation === undefined ? {} : { representation: input.representation as "explicit-v1" }),
    })),
  ),
  productTool(
    "product_review_consistency_record",
    "Record the mandatory final consistency verdict for semantic full review or corrections-only followup; this does not complete or activate the review.",
    "product_review_consistency_record_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await recordProductReviewConsistency({
      root: resolveProductRoot(),
      context: String(input.context),
      reviewRef: String(input.review_ref),
      readReceipt: String(input.read_receipt),
      verdict: input.verdict as "covered" | "gap" | "conflict",
      explanation: String(input.explanation),
      counterexample: typeof input.counterexample === "string" ? input.counterexample : null,
    })),
  ),
  productTool(
    "product_review_complete",
    "Complete a review only after every frozen item and required followup consistency input has a saved verdict.",
    "product_review_complete_input",
    "Success_ReviewStatus",
    true,
    async (input) => envelope(await completeProductReview({
      root: resolveProductRoot(),
      context: String(input.context),
      reviewRef: String(input.review_ref),
    })),
  ),
  productTool(
    "product_candidate_check",
    "Check current lineage, retained pins and fresh independent review evidence without assigning readiness or writing state.",
    "product_candidate_check_input",
    "Success_CheckResult",
    false,
    async (input) => envelope(await checkProductCandidate({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
    })),
  ),
  productTool(
    "product_amendment_prepare",
    "Create one isolated amendment candidate from the exact current ready artifact and record supplied intent evidence without changing ready product meaning.",
    "product_amendment_prepare_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await prepareAmendment({
      root: resolveProductRoot(),
      context: String(input.context),
      artifact: input.artifact as "idea" | "prd" | "technical-design" | "roadmap",
      baseGeneration: String(input.base_generation),
      intentText: String(input.intent_text),
      source: String(input.source),
      ...(input.change_scope === undefined ? {} : { changeScope: input.change_scope as { kind: "task_retirement"; task_ref: { product_id: string; artifact: "roadmap"; element_id: string }; redistributed_to: { product_id: string; artifact: "roadmap"; element_id: string }[] } }),
    })),
  ),
  productTool(
    "product_amendment_impact",
    "List affected product tasks in bounded pages and distinguish frozen started scope from work that must reconcile current inputs; read only.",
    "product_amendment_impact_input",
    "Success_Page",
    false,
    async (input) => envelope(await inspectAmendmentImpact({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
      ...(typeof input.limit === "number" ? { limit: input.limit } : {}),
    })),
  ),
  productTool(
    "product_amendment_rebase",
    "Rebase one isolated candidate only onto an explicitly reconciled compatible retained generation and require fresh impact review afterward.",
    "product_amendment_rebase_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await rebaseAmendment({
      root: resolveProductRoot(),
      context: String(input.context),
      candidateRef: input.candidate_ref as { product_id: string; candidate_id: string },
      newBaseGeneration: String(input.new_base_generation),
      resolutionRef: input.resolution_ref as {
        product_id: string;
        artifact: "idea" | "prd" | "technical-design" | "roadmap";
        id: string;
        revision: number;
      },
    })),
  ),
  productTool(
    "product_amendment_activate",
    "Explicitly publish one to four independently reviewed coherent candidates through one recoverable product head change.",
    "product_amendment_activate_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await activateAmendment({
      root: resolveProductRoot(),
      context: String(input.context),
      candidates: input.candidates as { product_id: string; candidate_id: string }[],
      reviewRefs: input.review_refs as string[],
    })),
    true,
  ),
  productTool(
    "product_amendment_activation_status",
    "Inspect the exact original activation request without writes or lock recovery. Distinguish its published generation from current head; retrieve acknowledgement by exact activation replay.",
    "product_amendment_activation_status_input", "Success_ActivationStatus", false,
    async (input) => envelope(await inspectAmendmentActivation({ root: resolveProductRoot(), context: String(input.context),
      candidates: input.candidates as { product_id: string; candidate_id: string }[], reviewRefs: input.review_refs as string[] })),
  ),
  productTool(
    "task_specification_reserve",
    "Reserve one new absent specification target for one exact Roadmap task; rejects legacy targets and never creates specification content.",
    "task_specification_reserve_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await reserveTaskSpecification({
      root: resolveProductRoot(),
      context: String(input.context),
      taskId: String(input.task_id),
      specificationSlug: String(input.specification_slug),
    })),
  ),
  productTool(
    "task_specification_register_copy",
    "Register the current bound working copy for an existing exact task/specification reservation; never enrolls an unreserved specification.",
    "task_specification_register_copy_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await registerTaskSpecificationCopy({
      root: resolveProductRoot(),
      context: String(input.context),
      taskId: String(input.task_id),
      specificationId: String(input.specification_id),
      specificationSlug: String(input.specification_slug),
    })),
  ),
  productTool(
    "task_inputs_check",
    "Check all task inputs without starting implementation; return bounded status, versions, counts and issue preview. Read exact evidence with task_inputs_details_get and check_ref.",
    "task_inputs_check_input",
    "Success_TaskCheckSummary",
    false,
    async (input) => envelope(await checkTaskInputsSummary({
      root: resolveProductRoot(),
      context: String(input.context),
      taskId: String(input.task_id),
      ...(typeof input.packet_id === "string" ? { packetId: input.packet_id } : {}),
    })),
  ),
  productTool(
    "task_inputs_details_get",
    "Read bounded issues, product pins or plan pins for one exact task check. Repeat task_inputs_check after SOURCE_CHANGED; partial product pins continue element_ids via cursor.",
    "task_inputs_details_get_input",
    "Success_TaskInputDetails",
    false,
    async (input) => envelope(await readTaskInputDetails({
      root: resolveProductRoot(), context: String(input.context), taskId: String(input.task_id),
      checkRef: String(input.check_ref), section: input.section as "issues" | "product_pins" | "plan_pins",
      ...(typeof input.packet_id === "string" ? { packetId: input.packet_id } : {}),
      ...(typeof input.cursor === "string" ? { cursor: input.cursor } : {}),
      ...(typeof input.limit === "number" ? { limit: input.limit } : {}),
    })),
  ),
  productTool(
    "task_inputs_reconcile",
    "Explicitly replan a paused task or recover its active queue with the current owner_ref; retain the active packet and prior execution, and require fresh planning checks. Never starts implementation.",
    "task_inputs_reconcile_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await reconcileTaskInputs({
      root: resolveProductRoot(), context: String(input.context), taskId: String(input.task_id),
      checkRef: String(input.check_ref), packetIds: input.packet_ids as string[],
      invocationSource: String(input.invocation_source),
      ...(typeof input.owner_ref === "string" ? { ownerRef: input.owner_ref } : {}),
    })),
  ),
  productTool(
    "task_packet_start",
    "Start exactly one explicitly invoked implementation packet, freeze task inputs once and return operation_ref as the owner_ref required for completion.",
    "task_packet_start_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await startTaskPacket({
      root: resolveProductRoot(),
      context: String(input.context),
      taskId: String(input.task_id),
      packetId: String(input.packet_id),
      invocationSource: String(input.invocation_source),
      ...(typeof input.check_ref === "string" ? { checkRef: input.check_ref } : {}),
    })),
  ),
  productTool(
    "task_packet_complete",
    "Complete only the current packet with its start operation_ref as owner_ref after frozen-input and full-plan evidence checks; never starts another packet.",
    "task_packet_complete_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await completeTaskPacket({
      root: resolveProductRoot(),
      context: String(input.context),
      taskId: String(input.task_id),
      packetId: String(input.packet_id),
      ownerRef: String(input.owner_ref),
      evidenceRefs: input.evidence_refs as string[],
      taskFinished: Boolean(input.task_finished),
    })),
  ),
  productTool(
    "product_safety_block",
    "Record one concrete security, incompatibility or uncertain-impact finding and block only named task checkpoints until explicit disposition.",
    "product_safety_block_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await recordSafetyBlock({
      root: resolveProductRoot(),
      context: String(input.context),
      affectedRefs: input.affected_refs as {
        product_id: string;
        artifact: "idea" | "prd" | "technical-design" | "roadmap";
        element_id: string;
      }[],
      affectedTaskIds: input.affected_task_ids as string[],
      reason: input.reason as "security" | "incompatibility" | "uncertain_impact",
      explanation: String(input.explanation),
      sourceRef: input.source_ref as {
        product_id: string;
        artifact: "idea" | "prd" | "technical-design" | "roadmap";
        id: string;
        revision: number;
      },
    })),
  ),
  productTool(
    "product_safety_resolve",
    "Resolve one retained safety block only with a current explicit answered disposition; requirement changes still use reviewed amendment activation.",
    "product_safety_resolve_input",
    "Success_MutationResult",
    true,
    async (input) => envelope(await resolveSafetyBlock({
      root: resolveProductRoot(),
      context: String(input.context),
      blockId: String(input.block_id),
      answerRef: input.answer_ref as {
        product_id: string;
        artifact: "idea" | "prd" | "technical-design" | "roadmap";
        id: string;
        revision: number;
      },
    })),
  ),
];

const sessions = productSessionHandlers(productTools);
for (const [name, description, write, run] of [
  ["product_session_open", "Open one candidate-bound logical session with the exact current context; returns supported scenarios and never chooses answers or verdicts.", true,
    async (input: Record<string, unknown>) => sessions.open(resolveProductRoot(), String(input.context), input.candidate_ref as { product_id: string; candidate_id: string })],
  ["product_session_call", "Execute one caller-selected supported scenario with the session context; persist exact identity before dispatch and deliver bounded JSON portions. Unknown outcomes require explicit recovery.", true,
    async (input: Record<string, unknown>) => sessions.call(resolveProductRoot(), input as { session_ref: string; expected_revision: number; request_id: string; scenario: string; arguments: Record<string, unknown> })],
  ["product_session_next", "Deliver the next exact JSON portion or registered source continuation for the matching read_ref; completion requires every portion. Never aggregate an unbounded record.", true,
    async (input: Record<string, unknown>) => sessions.next(resolveProductRoot(), input as { session_ref: string; expected_revision: number; read_ref: string })],
  ["product_session_resume", "Inspect one retained logical session request; replay at most once only with exact completed supported operation evidence. Uncertain effects and active or unknown claims remain blocked.", true,
    async (input: Record<string, unknown>) => sessions.resume(resolveProductRoot(), input as { session_ref: string; expected_revision: number })],
  ["product_session_status", "Read logical session revision, freshness, request acknowledgement and safe effects without writing or silently refreshing contexts.", false,
    async (input: Record<string, unknown>) => sessions.status(resolveProductRoot(), String(input.session_ref))],
] as const) productTools.push(productTool(name, description, `${name}_input`, "Success_SessionResult", write,
  async (input) => ({ protocol_version: 2, context: null, result: await run(input), replayed: false, operation_ref: null })));
