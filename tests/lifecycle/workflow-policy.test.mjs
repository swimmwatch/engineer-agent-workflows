import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { projectRoot, readFixture } from "../lib/fixtures.mjs";

const workflowPath = path.join(
  projectRoot,
  ".github",
  "workflows",
  "lifecycle.yml",
);

test("manual lifecycle workflow is pinned, read-only, and cross-platform", async () => {
  const workflow = await fs.readFile(workflowPath, "utf8");
  assert.equal(workflow.endsWith("\n"), true);
  assert.equal(workflow.includes("\r"), false);
  assert.match(workflow, /^on:\n  workflow_dispatch:\n/m);
  assert.doesNotMatch(workflow, /^\s+(push|pull_request):/m);
  assert.match(workflow, /^permissions:\n  contents: read\n/m);
  assert.doesNotMatch(workflow, /\bwrite\b|\$\{\{\s*secrets\./);
  assert.match(workflow, /timeout-minutes: 20/);
  assert.match(workflow, /fail-fast: false/);

  for (const runner of ["ubuntu-24.04", "macos-15", "windows-2025"]) {
    assert.equal(workflow.split(runner).length - 1, 1, runner);
  }
  assert.match(workflow, /node-version: 24\.14\.0/);
  assert.match(workflow, /DISABLE_TELEMETRY: "1"/);
  assert.match(workflow, /persist-credentials: false/);
  assert.equal(
    workflow.split("run: npm run test:lifecycle").length - 1,
    1,
  );
  assert.doesNotMatch(workflow, /\bnpm (install|ci)\b|\bcache:/);

  const uses = [...workflow.matchAll(/^\s+uses:\s+([^#\s]+).*$/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(uses, [
    "actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd",
    "actions/setup-node@53b83947a5a98c8d113130e565377fae1a50d02f",
  ]);
  for (const action of uses) {
    assert.match(action, /@[0-9a-f]{40}$/);
  }
});

test("reviewed CLI fixtures are fixed, sanitized, and catalog-bound", async () => {
  const metadata = JSON.parse(
    await readFixture("skills-cli-1.5.20", "metadata.json"),
  );
  const help = await readFixture("skills-cli-1.5.20", "help.txt");
  const unknown = await readFixture(
    "skills-cli-1.5.20",
    "unknown-skill.txt",
  );
  assert.deepEqual(metadata, {
    schemaVersion: 1,
    package: "skills",
    version: "1.5.20",
    nodeMinimum: "22.20.0",
    integrity:
      "sha512-lPl5KzMfTW+qwHFwc8t6R+wAqmdmSHw1+HWbGdJ/FZYbWLdB34bAZNFWiencM5DVoRaKAgXArmfTWMlNAbl9Gg==",
    unknownSkill: {
      name: "definitely-not-a-skill",
      exitCode: 1,
    },
  });
  for (const command of [
    "add <package>",
    "list, ls",
    "update [skills...]",
    "remove [skills]",
  ]) {
    assert.match(help, new RegExp(command.replaceAll("[", "\\[").replaceAll("]", "\\]")));
  }
  assert.match(help, /Update Options:[\s\S]*--global[\s\S]*--project/);
  assert.doesNotMatch(
    `${help}\n${unknown}`,
    /\/home\/|[A-Z]:\\Users\\|TOKEN=|PASSWORD=|PRIVATE_/,
  );
  assert.equal(unknown.trim(), metadata.unknownSkill.name);
});
