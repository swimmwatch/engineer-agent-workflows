import { randomUUID } from "node:crypto";
import { z } from "zod";
import { tool } from "./api.js";
import { getRun, inventory, reviewRuns, snapshot, supersedingReview } from "./review-model.js";
import type { Snapshot } from "./review-model.js";
import { saveReviewInputs } from "./review-snapshots.js";
import { contextInput, fail, id, mutate, obj, rows, text, unchanged } from "./state.js";
import type { Context, Data } from "./state.js";

const restartInput = z.object({
  ...contextInput,
  review_ref: id.describe("Exact latest unfinished FULL review identity returned by specification_review_start or specification_review_status."),
  source_version: z.string().regex(/^[a-f0-9]{64}$/).describe("Exact review source_version returned by specification_review_start or current_source_version from status; do not substitute the specification version."),
  reason: text.regex(/\S/u).describe("Non-sensitive audit reason explaining why prior saved evidence cannot be trusted."),
}).strict();

function restartOutput(run: Data, current: Snapshot): Data {
  const items = inventory(current);
  const records = rows(run.results);
  const audit = obj(run.audit_restart);
  const missing = items.findIndex((item, index) => !records.some((record) => record.item_index === index && record.item_key === item.key));
  return {
    review_ref: run.id,
    source_version: run.source_version,
    specification_version: run.specification_version,
    previous_review_ref: audit.previous_review_ref,
    reason: audit.reason,
    total_items: items.length,
    recorded_items: records.length,
    next_item_index: run.completed || missing < 0 ? null : missing,
    consistency_required: run.consistency_required === true,
  };
}

function currentSuccessor(current: Snapshot, reviewRef: string): Data {
  const run = getRun(current, reviewRef);
  if (reviewRuns(current.ledger).at(-1)?.id !== run.id) {
    fail("INVALID_STATE", "The audit restart successor is no longer the latest review; inspect the current review before continuing.");
  }
  return run;
}

async function restartReview(a: z.infer<typeof restartInput>) {
  async function replayRestart(ledger: Data, context: Context, savedResult: Data): Promise<Data> {
    const current = await snapshot(context, ledger);
    if (a.source_version !== current.version) fail("STALE_REVIEW", "Review inputs changed; inspect the current specification before restarting.");
    const successor = currentSuccessor(current, String(savedResult.review_ref));
    return restartOutput(successor, current);
  }
  async function appendGeneration(ledger: Data, context: Context) {
    const current = await snapshot(context, ledger);
    if (a.source_version !== current.version) fail("STALE_REVIEW", "Review inputs changed; inspect the current specification before restarting.");
    const successor = supersedingReview(current, a.review_ref);
    if (successor && obj(successor.audit_restart).reason === a.reason) {
      const fresh = currentSuccessor(current, String(successor.id));
      return unchanged(restartOutput(fresh, current));
    }
    const previous = getRun(current, a.review_ref);
    const runs = reviewRuns(ledger);
    if (previous.completed || previous.followup || runs.at(-1)?.id !== previous.id) {
      fail("INVALID_STATE", "Audit restart requires the latest unfinished FULL review; completed or FOLLOWUP reviews cannot be restarted here.");
    }
    const inputSnapshot = await saveReviewInputs(context, current);
    const run: Data = {
      id: randomUUID(), source_version: current.version, specification_version: current.source.version,
      status_at_start: current.source.status, created_at: new Date().toISOString(),
      completed: false, outcome: "pending", results: [], input_snapshot: inputSnapshot,
      ...(previous.consistency_required === true ? { consistency_required: true } : {}),
      audit_restart: { previous_review_ref: previous.id, reason: a.reason },
    };
    ledger.specification_reviews = { version: 1, runs: [...runs, run] };
    return restartOutput(run, current);
  }
  return mutate(a.context, "decisions", "specification_review_restart", a, appendGeneration, [], replayRestart);
}

export const reviewRestartTools = [
  tool("specification_review_restart", "Restart an unfinished FULL review after evidence loses trust. Preserve its history, record the cause and withdraw all old verdicts; unchanged inputs need no edit. This never approves or completes a review.",
    restartInput, true, restartReview),
];
