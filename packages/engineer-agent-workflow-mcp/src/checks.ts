import { z } from "zod";
import { tool } from "./api.js";
import { verifyRequirements } from "./decisions.js";
import { mechanicalCoverage, requirementSource } from "./requirements.js";
import { reviewState } from "./reviews.js";
import { designCatalog, validateCatalog, validateExperience, verifyTokens } from "./design.js";
import { verifyOperations } from "./experience.js";
import { inspectExport } from "./penpot.js";
import { confirmedScope, currentRecords, requireDesign, requireDesignRead } from "./scope.js";
import { contextInput, decode, fail, load, obj, readDependency, result, rows, strings, WorkflowError } from "./state.js";
import type { Context, Data } from "./state.js";

async function checked(context: Context, check: () => Promise<Data>): Promise<Data> {
  try { return result(context, await check()); }
  catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    return result(context, { status: "fail", local_status: "fail", issues: [{ code: error.code, message: error.message, ...error.details }] });
  }
}
async function checkLibrary(context: Context, catalog: Data): Promise<void> {
  validateCatalog(catalog);
  for (const component of rows(catalog.components)) {
    await verifyTokens(context, catalog, strings(component.token_refs ?? []));
    for (const variant of rows(component.variants)) await verifyTokens(context, catalog, strings(variant.token_refs ?? []));
  }
  const snapshot = obj(catalog.snapshot);
  if (snapshot.status !== "verified") fail("EVIDENCE_REQUIRED", "Shared library snapshot remains pending.");
  if (snapshot.sha256 !== await inspectExport(context, catalog)) fail("STALE_SNAPSHOT", "Shared library export changed after registration.");
  const evidence = obj(catalog.extensions ?? {});
  if (![evidence.export_evidence, evidence.import_evidence, evidence.inspection_evidence].every((v) => typeof v === "string" && v.length > 0)) fail("EVIDENCE_REQUIRED", "External export, import and inspection evidence is missing.");
}
export async function specificationState(context: Context, expected?: string, observeApproval = true): Promise<Data> {
  await confirmedScope(context);
  const current = currentRecords((await load(context, "decisions")).value), pending = current.filter((r) => ["needs_user", "blocked"].includes(String(r.state)));
  if (pending.length) fail("ANSWER_REQUIRED", "Resolve the pending material questions first.", { decision_ids: pending.slice(0, 20).map((r) => r.id), total: pending.length });
  if (!await readDependency(context, `docs/specs/${context.specification}/spec.md`)) {
    return {
      status: "fail",
      local_status: "fail",
      document_status: "missing",
      coverage_status: "legacy_unverified",
      approval_checkpoint_status: "not_applicable",
      approval_checkpoint_written: false,
      source_version: null,
      specification_version: null,
      review_ref: null,
      semantic_correctness_proven: false,
      reviewer_independence_authenticated: false,
      issues: [{ code: "PREREQUISITE_REQUIRED", message: "Write the behavior specification before the completion check." }],
      checked: ["scope_consistency", "decision_resolution"],
      not_checked: ["requirement_references", "review_freshness", "behavior_completeness", "user_answer_authenticity", "reviewer_independence"],
      approved_by_tool: false,
    };
  }
  const ledger = (await load(context, "decisions")).value;
  const source = await requirementSource(context, ledger.specification_reviews !== undefined);
  const review = await reviewState(context, source, ledger, expected, observeApproval);
  if (review.document_status === "missing") {
    return {
      status: "fail",
      ...review,
      issues: [{ code: "INVALID_SPECIFICATION", message: "The behavior specification needs an explicit Draft or Approved status." }],
      checked: ["scope_consistency", "decision_resolution", "requirement_references", "review_freshness"],
      not_checked: ["behavior_completeness", "user_answer_authenticity", "reviewer_independence"],
      approved_by_tool: false,
    };
  }
  if (review.coverage_status !== "legacy_unverified" && source.requirements.length) {
    const issues = mechanicalCoverage(source, ledger);
    if (issues.length) return { status: "fail", ...review, issues: issues.slice(0, 20), total_issues: issues.length, approved_by_tool: false };
  } else if (review.coverage_status !== "legacy_unverified") return { status: "fail", ...review, issues: [{ code: "INVALID_SPECIFICATION", message: "Validated specifications require explicit requirement definitions." }], approved_by_tool: false };
  else await verifyRequirements(context, current.flatMap((decision) => strings(decision.requirement_ids ?? [])), true);
  const ready = ["legacy_unverified", "reviewed"].includes(String(review.coverage_status));
  return { status: ready ? "pass" : "fail", ...review, issues: ready ? [] : [{ code: "REVIEW_REQUIRED", message: "The completeness review is incomplete, failed, or stale." }], checked: ["scope_consistency", "decision_resolution", "requirement_references", "review_freshness"], not_checked: ["behavior_completeness", "user_answer_authenticity", "reviewer_independence"], approved_by_tool: false };
}

export const checkTools = [
  tool("specification_check_state", "Report document status, mechanical and review freshness, plus approval-checkpoint status and whether this call wrote it; only an observed author-made Draft-to-Approved transition can add the checkpoint.", z.object({ ...contextInput, expected_source_version: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict(), true, async (a) => {
    const context = decode(a.context);
    return checked(context, async () => {
      return specificationState(context, a.expected_source_version);
    });
  }),
  tool("design_system_check", "Check shared catalog, token references and current native export; distinguish local evidence from external design inspection.", z.object(contextInput).strict(), false, async (a) => {
    const context = decode(a.context);
    return checked(context, async () => {
      await requireDesignRead(context);
      const catalog = await designCatalog(context); await checkLibrary(context, catalog);
      return { status: "unverified", local_status: "pass", external_status: "not_reproduced", issues: [], not_checked: ["live_penpot", "visual_quality", "accessibility"] };
    });
  }),
  tool("screen_design_check", "Check screen state, component and operation references plus both native snapshots; does not reproduce live Penpot inspection.", z.object(contextInput).strict(), false, async (a) => {
    const context = decode(a.context);
    return checked(context, async () => {
      await requireDesign(context, "experience");
      const catalog = await designCatalog(context), value = (await load(context, "experience")).value;
      await checkLibrary(context, catalog); validateExperience(value, catalog, context.specification);
      if (obj(value.system).snapshot_sha256 !== obj(catalog.snapshot).sha256) fail("STALE_SNAPSHOT", "Screens reference an older shared-library snapshot.");
      for (const screen of rows(value.screens)) {
        await verifyRequirements(context, strings(screen.requirement_ids));
        for (const action of rows(screen.actions)) { await verifyRequirements(context, strings(action.requirement_ids)); await verifyOperations(context, strings(action.operation_refs ?? [])); }
      }
      if (obj(value.snapshot).status !== "verified" || obj(value.snapshot).sha256 !== await inspectExport(context, value, catalog)) fail("STALE_SNAPSHOT", "Screen export is pending or has changed.");
      const evidence = obj(value.extensions ?? {});
      if (![evidence.export_evidence, evidence.import_evidence, evidence.inspection_evidence].every((v) => typeof v === "string" && v.length > 0)) fail("EVIDENCE_REQUIRED", "External screen evidence is missing.");
      return { status: "unverified", local_status: "pass", external_status: "not_reproduced", issues: [], not_checked: ["live_penpot", "visual_quality", "accessibility"] };
    });
  }),
];
