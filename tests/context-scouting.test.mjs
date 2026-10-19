import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { parse } from "yaml";

import { readCatalog, readReleaseMetadata } from "../scripts/lib/catalog.mjs";
import {
  buildGeneratedFiles,
  collectReleaseSource,
} from "../scripts/lib/distribution.mjs";
import { validateSkillDocument } from "../scripts/lib/skill-document.mjs";
import {
  copyReleaseSource,
  projectRoot,
  readFixture,
} from "./lib/fixtures.mjs";

const name = "context-scouting";
const documentPath = `skills/${name}/SKILL.md`;

async function loadSource(root) {
  return collectReleaseSource(
    root,
    await readCatalog(root),
    await readReleaseMetadata(root),
  );
}

function assertInstructions(body, reference) {
  const obligations = [
    [/explicit user invocation.*current task/is, "task activation"],
    [/completion or cancellation.*ends/is, "task lifetime"],
    [/Known-file reads.*short checks.*direct lookup/is, "direct lookup"],
    [/Start with one scout.*substantial, independent/is, "bounded delegation"],
    [
      /only after choosing delegation.*references\/delegation\.md/is,
      "conditional reference",
    ],
    [
      /supported.*medium.*otherwise.*(?:omit|do not invent)/is,
      "supported reasoning",
    ],
    [
      /Scouts inspect only.*no edits.*external mutations.*child agents/is,
      "inspection boundary",
    ],
    [/main agent.*decisions, edits, and validation/is, "main ownership"],
    [/unavailable.*disclose.*once.*minimum necessary/is, "bounded fallback"],
    [
      /Do not.*retry.*silently.*(?:escalate|substitute)/is,
      "no silent escalation",
    ],
    [/cancel.*stop.*outstanding.*no.*fallback/is, "cancellation"],
    [/savings.*unmeasured.*comparable/is, "honest efficiency"],
  ];
  for (const [pattern, label] of obligations)
    assert.match(body, pattern, `Missing ${label}`);
  for (const [pattern, label] of [
    [
      /exact question.*absolute.*known facts.*instructions.*scope.*depth.*stopping/is,
      "bounded assignment",
    ],
    [
      /fresh context.*unrelated.*credentials.*private reasoning/is,
      "fresh private context",
    ],
    [/RTK.*CodeGraph.*only.*require/is, "applicable source rules"],
    [/300 words.*paths.*symbols.*line ranges.*links/is, "verifiable summary"],
    [/no-match.*searched scope.*not.*absence/is, "bounded no-match"],
    [
      /decisive source passages.*stale.*targeted follow-ups/is,
      "verification and reuse",
    ],
  ])
    assert.match(reference, pattern, `Missing ${label}`);
}

function assertHostArtifact(files, entry, host, model) {
  const root = `plugins/${host}/engineer-agent-workflows/skills/${name}`;
  const bytes = files.get(`${root}/SKILL.md`);
  assert.ok(bytes, `Missing ${host} skill`);
  if (host === "claude-code") validateSkillDocument(entry, bytes);
  else {
    const frontmatter = parse(bytes.toString().split("---\n")[1]);
    assert.deepEqual(frontmatter, {
      name: entry.name,
      description: entry.description,
    });
  }
  assert.ok(bytes.length <= 4096);
  const body = bytes.toString();
  const reference = files.get(`${root}/references/delegation.md`)?.toString();
  assert.ok(reference, `Missing ${host} reference`);
  assert.match(
    body,
    new RegExp(`Request \x60${model}\x60`),
    `Wrong ${host} scout model`,
  );
  assert.doesNotMatch(`${body}\n${reference}`, /\{\{|mcp__|\/home\//);
  assert.doesNotMatch(
    `${body}\n${reference}`,
    host === "codex"
      ? /CLAUDE\.md|AskUserQuestion|\bhaiku\b/
      : /AGENTS\.md|request_user_input|gpt-6-luna/,
  );
  assertInstructions(body, reference);
  if (host === "codex") {
    const metadata = parse(files.get(`${root}/agents/openai.yaml`).toString());
    assert.equal(metadata.policy.allow_implicit_invocation, false);
  } else {
    assert.equal(files.has(`${root}/agents/openai.yaml`), false);
    assert.match(body, /disable-model-invocation: true/);
    assert.match(body, /user-invocable: true/);
  }
}

test("context scouting is a separate standalone explicit-only catalog identity", async () => {
  const catalog = await readCatalog(projectRoot);
  const entry = catalog.skills.find((skill) => skill.name === name);
  assert.ok(entry, "Missing context-scouting catalog identity");
  assert.equal(
    catalog.skills[catalog.skills.indexOf(entry) - 1].name,
    "context-engineering",
  );
  assert.equal(entry.classification, "standalone");
  assert.deepEqual(entry.dependencies, []);
  assert.ok([...entry.description].length <= 240);
  assert.deepEqual(entry.policies, {
    codex: { allowImplicitInvocation: false },
    claude: { disableModelInvocation: true, userInvocable: true },
  });
});

test("context scouting source and generated maps preserve portable instruction contracts", async (t) => {
  const root = await copyReleaseSource(t);
  const source = await loadSource(root);
  const skill = source.skills.find((skill) => skill.entry.name === name);
  assert.ok(skill, "Missing context-scouting source");
  assert.ok(skill.document.length <= 4096);
  assert.match(skill.document.toString(), /\{\{HOST_SCOUT_MODEL\}\}/);
  assert.doesNotMatch(
    skill.document.toString(),
    /gpt-6-luna|\bhaiku\b|AGENTS\.md|CLAUDE\.md/,
  );
  assert.deepEqual([...skill.assets.keys()], ["references/delegation.md"]);
  const files = buildGeneratedFiles(source);
  assert.deepEqual(buildGeneratedFiles(source), files);
  assertHostArtifact(files, skill.entry, "codex", "gpt-6-luna");
  assertHostArtifact(files, skill.entry, "claude-code", "haiku");
  assert.equal(
    parse(files.get(`skills/${name}/agents/openai.yaml`).toString()).policy
      .allow_implicit_invocation,
    false,
  );
});

test("PROVE rejects wrong model, implicit policy, lost obligations, unresolved token and host leakage", async (t) => {
  const root = await copyReleaseSource(t);
  const original = await fs.readFile(path.join(root, documentPath), "utf8");
  const mutations = [
    [
      "wrong model",
      (text) => text.replace("{{HOST_SCOUT_MODEL}}", "gpt-6-astra"),
      /Wrong codex scout model/,
    ],
    [
      "missing safety",
      (text) =>
        text.replace(
          /Scouts inspect only: no edits, external mutations, installations, commits, or\n\s+child agents\./,
          "",
        ),
      /Missing inspection boundary/,
    ],
    [
      "missing fallback",
      (text) =>
        text.replace(
          /If native delegation[\s\S]*?authorized discovery directly\./,
          "",
        ),
      /Missing bounded fallback/,
    ],
    [
      "unresolved token",
      (text) => `${text}\n{{HOST_SCOUT_MODEL\n`,
      /unresolved host template variable/,
    ],
    ["foreign host", (text) => `${text}\nRead CLAUDE.md.\n`, /CLAUDE/],
  ];
  for (const [label, mutate, expected] of mutations) {
    await fs.writeFile(path.join(root, documentPath), mutate(original));
    const source = await loadSource(root);
    const entry = source.skills.find(
      (skill) => skill.entry.name === name,
    ).entry;
    assert.throws(
      () =>
        assertHostArtifact(
          buildGeneratedFiles(source),
          entry,
          "codex",
          "gpt-6-luna",
        ),
      expected,
      label,
    );
    await fs.writeFile(path.join(root, documentPath), original);
  }
  const catalogPath = path.join(root, "catalog/skills.json");
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
  catalog.skills.find(
    (skill) => skill.name === name,
  ).policies.codex.allowImplicitInvocation = true;
  await fs.writeFile(catalogPath, JSON.stringify(catalog));
  await assert.rejects(
    loadSource(root),
    /Codex implicit invocation must be disabled/,
  );
});

test("native qualification fixtures define observations and independent oracles without simulated passes", async () => {
  const fixture = JSON.parse(
    await readFixture("context-scouting", "scenarios.json"),
  );
  assert.equal(fixture.evidenceKind, "qualification-inputs-only");
  assert.deepEqual(fixture.hosts, ["codex", "claude-code"]);
  for (const id of [
    "invoked",
    "uninvoked",
    "repeated",
    "new-task",
    "direct",
    "multi-file",
    "parallel",
    "override",
    "rejected-model",
    "missing-tools",
    "unsupported-setting",
    "partial",
    "no-match",
    "stale",
    "cancel",
    "stop-unavailable",
    "unmeasured",
  ]) {
    const scenario = fixture.cases.find((item) => item.id === id);
    assert.ok(scenario, `Missing ${id} scenario`);
    assert.ok(scenario.request && scenario.setup);
    assert.ok(
      scenario.requirements.length &&
        scenario.observe.length &&
        scenario.oracle.length,
    );
    assert.equal(Object.hasOwn(scenario, "actual"), false);
    assert.equal(Object.hasOwn(scenario, "passed"), false);
  }
  assert.match(fixture.execution, /real native.*unavailable.*unverified/is);
});
