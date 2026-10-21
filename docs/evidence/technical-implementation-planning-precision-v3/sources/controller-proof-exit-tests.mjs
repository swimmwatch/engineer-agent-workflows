import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mutationTestExit } from "./proof-exit.mjs";
const root = "docs/evidence/technical-implementation-planning-precision-v3/";
const audited = JSON.parse(readFileSync(root + "nested-proof-exits.json", "utf8"));
const stage = JSON.parse(readFileSync(root + audited.capturedStage.ref, "utf8"));
const item = id => stage.items.find(entry => entry.item.id === id).item;
test("actual source-bound nested proof failures retain child exit 1", () => {
  for (const entry of audited.entries) {
    const result = mutationTestExit(item(entry.itemId), audited.entries);
    assert.equal(result.exitCode, 1);
    assert.equal(result.origin, "captured-child-test");
  }
});
test("a forged marker command cannot reuse genuine failure output", () => {
  const original = item(audited.entries[0].itemId);
  assert.equal(mutationTestExit({ ...original, command: "print('MUTATION_EXIT', 1)" }, audited.entries).exitCode, 0);
});
test("changed captured output cannot attest the audited child exit", () => {
  const original = item(audited.entries[0].itemId);
  assert.equal(mutationTestExit({ ...original, aggregatedOutput: original.aggregatedOutput.replace("MUTATION_EXIT 1", "MUTATION_EXIT 0") }, audited.entries).exitCode, 0);
});
test("another item cannot reuse an audited child failure", () => {
  const original = item(audited.entries[0].itemId);
  assert.equal(mutationTestExit({ ...original, id: "unrelated-item" }, audited.entries).exitCode, 0);
});
test("a real final GREEN remains successful", () => {
  const final = stage.items.find(entry => entry.item.type === "commandExecution" && entry.item.exitCode === 0 && entry.item.command.includes("npm test"));
  assert.equal(mutationTestExit(final.item, audited.entries).exitCode, 0);
});
test("nonzero outer command exits retain their actual status", () => {
  assert.equal(mutationTestExit({ id: "failed-command", exitCode: 1 }, audited.entries).exitCode, 1);
});
