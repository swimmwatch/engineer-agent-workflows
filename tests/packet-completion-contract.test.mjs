import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("packet author and executor share the required-check completion gate", async () => {
  for (const root of ["", ...["codex", "claude-code"].map(host =>
    `plugins/${host}/engineer-agent-workflows/`)]) {
    const packet = await readFile(new URL(
      `../${root}skills/planning-and-task-breakdown/references/task-packets.md`, import.meta.url), "utf8");
    const start = packet.indexOf("\n9. ");
    assert.notEqual(start, -1, "The packet must expose its completion step.");
    const completion = packet.slice(start, packet.indexOf("Restate exact"));
    assert.match(completion, /every required check passes/);
    assert.match(completion, /unavailable.*incomplete/s);
    const executor = await readFile(new URL(
      `../${root}skills/incremental-implementation/SKILL.md`, import.meta.url), "utf8");
    const gate = /after every required check passes, mark only/iu;
    assert.match(executor, gate);
    assert.doesNotMatch(
      executor.replace("every required check passes", "any check passes"),
      gate,
    );
  }
});
