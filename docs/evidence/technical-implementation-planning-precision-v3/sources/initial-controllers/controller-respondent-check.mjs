import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = ".cache/technical-implementation-planning-precision-v3";
const out = "docs/evidence/technical-implementation-planning-precision-v3";
const answers = JSON.parse(await readFile("tests/fixtures/workflow-loop/technical-agreement-answers.json", "utf8"));
const sha = value => createHash("sha256").update(value).digest("hex");
const source = async path => {
  const text = await readFile(path, "utf8");
  return text.slice(text.indexOf("function respondent("), text.indexOf("async function save("));
};
const original = await source(".cache/technical-implementation-planning-qualification/run.mjs");
const corrected = await source(root + "/run.mjs");
const measured = await source(root + "/run-matrix-controller.mjs");
assert.equal(corrected, original);
const respondent = text => new Function("answers", text + "\nreturn respondent;")(answers);
const a = respondent(original), b = respondent(measured), checked = [];
for (const id of await readdir(out + "/matrix")) {
  for (const name of await readdir(out + "/matrix/" + id)) {
    if (!name.endsWith(".json") || name === "result.json" || name === "evaluation.json") continue;
    const stage = JSON.parse(await readFile(out + "/matrix/" + id + "/" + name, "utf8"));
    for (const round of stage.nativeQuestions ?? []) for (const question of round.questions) {
      const expected = a(question, id.slice(0, 2));
      assert.deepEqual(b(question, id.slice(0, 2)), expected, id + "/" + question.id);
      assert.deepEqual(round.answers[question.id].answers, expected, id + "/" + question.id);
      checked.push({ runId: id, stageId: stage.stageId, requestId: round.requestId, questionId: question.id, originalPolicyMatched: true });
    }
  }
}
await writeFile(out + "/controller-policy-check.json", JSON.stringify({
  classification: "ACTUAL", checkedAt: new Date().toISOString(),
  correction: "Preparation copy initially re-encoded Cyrillic regex alternatives; measured matrix source is preserved verbatim. Future focused controller restores the exact original respondent function. Every observed matrix answer is checked against both versions and the captured answer.",
  originalPolicyDigest: sha(original), restoredPolicyDigest: sha(corrected), measuredPolicyDigest: sha(measured), checked,
  limitation: "Equivalence is established only for observed matrix questions; unused branches are not claimed equivalent."
}, null, 2) + "\n");
console.log(JSON.stringify({ originalFunctionRestored: true, questionsChecked: checked.length, allObservedAnswersEquivalent: true }));
