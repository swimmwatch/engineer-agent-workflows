import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  activateAmendment,
  checkProductCandidate,
  completeProductReview,
  getProductReviewStatus,
  readProductReviewConsistency,
  readProductReviewItem,
  recordProductReviewConsistency,
  startProductReview,
} from "../dist/product/review.js";
import { loadGeneration, saveObject } from "../dist/product/storage.js";
import { workflowTools } from "../dist/server.js";

import { digest, bytes, expectCode, candidateVersion, context, snapshot, artifactOrder, elementIds, fixture, writeCandidate, replaceArtifactDocument, recordItem, completeReview } from "../test-support/product-review-fixture.mjs";

test("P11 publishes independent review, candidate check and activation tools", () => {
  const expected = [
    "product_amendment_activate",
    "product_candidate_check",
    "product_review_complete",
    "product_review_consistency_get",
    "product_review_consistency_record",
    "product_review_get",
    "product_review_record",
    "product_review_start",
    "product_review_status",
  ];
  const tools = workflowTools.filter((tool) => expected.includes(tool.name));
  assert.deepEqual(tools.map((tool) => tool.name).sort(), expected);
  for (const tool of tools) {
    assert.equal(tool.schemaKind, "json");
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.outputSchema.type, "object");
  }
  assert.equal(tools.find((tool) => tool.name === "product_review_status").write, false);
  assert.equal(tools.find((tool) => tool.name === "product_review_get").write, false);
  assert.equal(tools.find((tool) => tool.name === "product_review_consistency_get").write, false);
  assert.equal(tools.find((tool) => tool.name === "product_candidate_check").write, false);
});

test("Q24: all four artifact kinds require a fresh complete independent pass", async (t) => {
  for (const artifact of artifactOrder) {
    const f = await fixture(t, artifact);
    const before = await snapshot(f.root);
    const check = await checkProductCandidate({ root: f.root, context: f.context, candidateRef: f.candidateRef });
    assert.equal(check.result.status, "fail");
    assert.equal(check.result.coverage_status, null);
    assert.equal((await snapshot(f.root)).some(([path]) => path.includes("/reviews/")), false);
    assert.deepEqual(await snapshot(f.root), before, `${artifact} check must be read-only`);
    await assert.rejects(activateAmendment({
      root: f.root, context: f.context, candidates: [f.candidateRef], reviewRefs: [randomUUID()],
    }), expectCode("REVIEW_REQUIRED"));

    const reviewed = await completeReview(f, f.context);
    assert.equal(reviewed.status.coverage_status, "reviewed", artifact);
    const ready = await checkProductCandidate({
      root: f.root, context: reviewed.context, candidateRef: f.candidateRef,
    });
    assert.equal(ready.result.status, "pass", artifact);
    assert.equal(ready.result.review_ref, reviewed.reviewRef);
    const activated = await activateAmendment({
      root: f.root,
      context: reviewed.context,
      candidates: [f.candidateRef],
      reviewRefs: [reviewed.reviewRef],
    });
    const activatedContext = JSON.parse(Buffer.from(activated.context, "base64url").toString("utf8"));
    const generation = await loadGeneration(f.root, f.productId, activatedContext.target_revision);
    const result = generation.generation.ready_artifacts.find((entry) => entry.artifact === artifact);
    assert.equal(result.review_id, reviewed.reviewRef);
    assert.equal(result.source_version, f.candidate.source_version);
    assert.equal(activatedContext.candidate_ref, null);

    const replayed = await activateAmendment({
      root: f.root,
      context: reviewed.context,
      candidates: [f.candidateRef],
      reviewRefs: [reviewed.reviewRef],
    });
    assert.equal(replayed.replayed, true);
    assert.deepEqual(replayed.result, activated.result);
    assert.equal(replayed.context, activated.context);
  }
});

test("Q25: review cursors cannot skip unread portions", async (t) => {
  const f = await fixture(t, "prd");
  const source = `# prd\n\n### ${elementIds.prd}: prd result\n\n#### Outcome\n\n${"x".repeat(14_000)}\n`;
  await replaceArtifactDocument(f, "prd", source);
  const started = await startProductReview({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    mode: "full",
  });
  const first = await readProductReviewItem({
    root: f.root,
    context: started.context,
    reviewRef: started.result.review_ref,
    itemIndex: 1,
  });
  assert.notEqual(first.result.next_cursor, null);
  const decoded = JSON.parse(Buffer.from(first.result.next_cursor, "base64url").toString("utf8"));
  decoded.offset = 12_288;
  const body = Object.fromEntries(Object.entries(decoded)
    .filter(([key]) => key !== "checksum")
    .sort(([left], [right]) => left.localeCompare(right)));
  decoded.checksum = digest(JSON.stringify(body)).slice(0, 16);
  const forged = Buffer.from(JSON.stringify(decoded)).toString("base64url");
  await assert.rejects(readProductReviewItem({
    root: f.root,
    context: started.context,
    reviewRef: started.result.review_ref,
    itemIndex: 1,
    cursor: forged,
  }), expectCode("STALE_CURSOR"));
});

test("Q25: oversized aggregate inventory fails before mutation state is written", async (t) => {
  const f = await fixture(t, "prd");
  const source = `# prd\n\n### ${elementIds.prd}: prd result\n\n#### Outcome\n\n${"x".repeat(8_500_000)}\n`;
  await replaceArtifactDocument(f, "prd", source);
  const before = await snapshot(f.root);
  await assert.rejects(startProductReview({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    mode: "full",
  }), expectCode("SOURCE_LIMIT"));
  assert.deepEqual(await snapshot(f.root), before);
});

test("Q25: observers are byte-stable while reviewer contexts support sequential verdicts", async (t) => {
  const f = await fixture(t, "prd");
  const started = await startProductReview({
    root: f.root, context: f.context, candidateRef: f.candidateRef, mode: "full",
  });
  const first = await recordItem(f, started.result.review_ref, 0, started.context);
  const beforeObserver = await snapshot(f.root);
  const status = await getProductReviewStatus({
    root: f.root, context: first.context, reviewRef: started.result.review_ref,
  });
  const repeated = await startProductReview({
    root: f.root, context: first.context, candidateRef: f.candidateRef, mode: "full",
  });
  assert.deepEqual(repeated.result, status.result);
  assert.deepEqual(await snapshot(f.root), beforeObserver);
  assert.ok(status.result.next_item_index !== null);
  await recordItem(f, started.result.review_ref, status.result.next_item_index, first.context);
  const afterSecond = await getProductReviewStatus({
    root: f.root, context: first.context, reviewRef: started.result.review_ref,
  });
  assert.equal(afterSecond.result.recorded_items, 2);

  const changed = {
    ...f.candidate,
    scope: { ...f.candidate.scope, rationale: [...f.candidate.scope.rationale, "Concurrent semantic change."] },
  };
  const changedWithoutVersion = Object.fromEntries(Object.entries(changed).filter(([key]) => key !== "source_version"));
  const nextCandidate = { ...changedWithoutVersion, source_version: candidateVersion(changedWithoutVersion) };
  await writeCandidate(f, nextCandidate);
  const nextContext = context(f, nextCandidate);
  const stale = await getProductReviewStatus({
    root: f.root, context: nextContext, reviewRef: started.result.review_ref,
  });
  assert.equal(stale.result.coverage_status, "stale");
  await assert.rejects(recordItem(f, started.result.review_ref, 2, first.context), expectCode("CONFLICT"));
});

test("Q26: corrections inherit only unchanged passes and joint activation publishes one generation", async (t) => {
  const f = await fixture(t, "prd");
  const initial = await completeReview(f, f.context, { gapText: "Current prd behavior" });
  assert.equal(initial.status.coverage_status, "gaps");
  assert.ok(initial.gapKey);

  const currentDocument = f.registry.documents.find((entry) => entry.artifact === "prd");
  const nextSource = f.documentBytes.get("prd").toString("utf8").replace(
    "Current prd behavior is explicit.",
    "Corrected prd behavior is explicit and independently testable.",
  );
  const savedDocument = await saveObject(f.root, {
    productId: f.productId, kind: "markdown", bytes: Buffer.from(nextSource),
  });
  const nextRegistry = {
    ...f.registry,
    documents: f.registry.documents.map((entry) => entry.id === currentDocument.id
      ? { ...entry, object_sha256: savedDocument.sha256 }
      : entry),
  };
  const savedRegistry = await saveObject(f.root, {
    productId: f.productId, kind: "record", bytes: bytes(nextRegistry),
  });
  const amendedWithoutVersion = {
    ...f.candidate,
    registry: { id: f.registryId, object_sha256: savedRegistry.sha256 },
  };
  delete amendedWithoutVersion.source_version;
  const amended = { ...amendedWithoutVersion, source_version: candidateVersion(amendedWithoutVersion) };
  await writeCandidate(f, amended);
  f.candidate = amended;
  f.registry = nextRegistry;
  f.registryObject = savedRegistry;
  f.context = context(f, amended);

  const followup = await startProductReview({
    root: f.root,
    context: f.context,
    candidateRef: f.candidateRef,
    mode: "followup",
    parentReviewRef: initial.reviewRef,
    fixes: [{
      finding_key: initial.gapKey,
      changed_refs: [f.refs.prd],
      explanation: "The PRD goal now states the independently testable behavior.",
    }],
  });
  assert.equal(followup.result.recorded_items, followup.result.total_items - 1);
  const corrected = await recordItem(
    f, followup.result.review_ref, followup.result.next_item_index, followup.context,
  );
  let consistency = await readProductReviewConsistency({
    root: f.root, context: corrected.context, reviewRef: followup.result.review_ref,
  });
  while (consistency.result.next_cursor !== null) {
    consistency = await readProductReviewConsistency({
      root: f.root,
      context: corrected.context,
      reviewRef: followup.result.review_ref,
      cursor: consistency.result.next_cursor,
    });
  }
  const consistencyRecorded = await recordProductReviewConsistency({
    root: f.root,
    context: corrected.context,
    reviewRef: followup.result.review_ref,
    readReceipt: consistency.result.read_receipt,
    verdict: "covered",
    explanation: "The complete current PRD remains consistent after the correction.",
    counterexample: null,
  });
  const completedFollowup = await completeProductReview({
    root: f.root,
    context: consistencyRecorded.context,
    reviewRef: followup.result.review_ref,
  });
  assert.equal(completedFollowup.result.coverage_status, "reviewed");

  const ideaCandidateWithoutVersion = {
    ...amendedWithoutVersion,
    candidate_id: randomUUID(),
    artifact: "idea",
    workspace_id: randomUUID(),
    upstream_pins: [],
  };
  const ideaCandidate = {
    ...ideaCandidateWithoutVersion,
    source_version: candidateVersion(ideaCandidateWithoutVersion),
  };
  await writeCandidate(f, ideaCandidate);
  const ideaRef = { product_id: f.productId, candidate_id: ideaCandidate.candidate_id };
  const ideaContext = context(f, ideaCandidate);
  const originalRef = f.candidateRef;
  f.candidateRef = ideaRef;
  f.candidate = ideaCandidate;
  const ideaReview = await completeReview(f, ideaContext);
  f.candidateRef = originalRef;
  f.candidate = amended;

  const activated = await activateAmendment({
    root: f.root,
    context: completedFollowup.context,
    candidates: [ideaRef, originalRef],
    reviewRefs: [ideaReview.reviewRef, followup.result.review_ref],
  });
  const activatedContext = JSON.parse(Buffer.from(activated.context, "base64url").toString("utf8"));
  const generation = await loadGeneration(f.root, f.productId, activatedContext.target_revision);
  assert.equal(generation.generation.parent, f.generation.sha256);
  assert.deepEqual(
    generation.generation.ready_artifacts.map((entry) => entry.artifact).sort(),
    ["idea", "prd"],
  );
  assert.equal(generation.generation.ready_artifacts.find((entry) => entry.artifact === "idea").review_id, ideaReview.reviewRef);
  assert.equal(generation.generation.ready_artifacts.find((entry) => entry.artifact === "prd").review_id, followup.result.review_ref);
});
