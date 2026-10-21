import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

test("stdio fixture helper preserves actual arguments, environment, streams and nonzero exit", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/workflow-loop/technical-agreement-starters-stdio.json", import.meta.url), "utf8"));
  const root = await mkdtemp(join(tmpdir(), "technical-stdio-check-"));
  try {
    await writeFile(join(root, "test-process.mjs"), fixture.fixtures.b1.files["test-process.mjs"]);
    await writeFile(join(root, "cli.mjs"), "process.stdout.write(JSON.stringify(process.argv.slice(2)));process.stderr.write(process.env.TEST_MARKER);process.exitCode=Number(process.env.TEST_EXIT);\n");
    const { runCli } = await import(pathToFileURL(join(root, "test-process.mjs")));
    const result = runCli(["space value", "-1"], { env: { TEST_MARKER: "actual-stderr", TEST_EXIT: "7" } });
    assert.equal(result.status, 7);
    assert.equal(result.signal, null);
    assert.equal(result.stdout, '["space value","-1"]');
    assert.equal(result.stderr, "actual-stderr");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
