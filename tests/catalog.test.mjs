import assert from "node:assert/strict";
import test from "node:test";

import {
  APPROVED_SKILL_NAMES,
  dependencyOrder,
  readCatalog,
  readReleaseMetadata,
  validateCatalog,
  validateReleaseMetadata,
  validateSkillEntry,
} from "../scripts/lib/catalog.mjs";
import {
  makeTempTree,
  projectRoot,
  readFixture,
} from "./lib/fixtures.mjs";

test("canonical catalog contains the approved ordered inventory", async () => {
  const catalog = await readCatalog(projectRoot);
  assert.equal(catalog.schemaVersion, 1);
  assert.deepEqual(
    catalog.skills.map((entry) => entry.name),
    APPROVED_SKILL_NAMES,
  );
  assert.equal(catalog.skills.length, 15);
  for (const entry of catalog.skills) {
    assert.ok([...entry.description].length <= 240);
    assert.equal(entry.policies.codex.allowImplicitInvocation, false);
    assert.equal(entry.policies.claude.disableModelInvocation, true);
    assert.equal(entry.policies.claude.userInvocable, true);
  }
});

test("catalog classification and dependency contract is exact", async () => {
  const catalog = await readCatalog(projectRoot);
  const bundleRequired = catalog.skills
    .filter((entry) => entry.classification === "bundle-required")
    .map((entry) => [entry.name, entry.dependencies]);
  assert.deepEqual(bundleRequired, [
    ["incremental-implementation", ["planning-and-task-breakdown"]],
    ["spec-driven-development", ["planning-and-task-breakdown"]],
  ]);
  assert.ok(
    catalog.skills
      .filter((entry) => entry.classification === "standalone")
      .every((entry) => entry.dependencies.length === 0),
  );
});

test("description code-point boundary is enforced", async () => {
  const catalog = await readCatalog(projectRoot);
  const entry = structuredClone(catalog.skills[0]);
  entry.description = "x".repeat(240);
  assert.equal(validateSkillEntry(entry).description.length, 240);
  entry.description = "x".repeat(241);
  assert.throws(() => validateSkillEntry(entry), /240 code points/);
});

test("catalog rejects unknown fields, duplicates, and wrong order", async () => {
  const catalog = await readCatalog(projectRoot);
  const unknown = structuredClone(catalog);
  unknown.extra = true;
  assert.throws(() => validateCatalog(unknown), /unknown field/);

  const duplicate = structuredClone(catalog);
  duplicate.skills[1].name = duplicate.skills[0].name;
  assert.throws(() => validateCatalog(duplicate), /unique/);

  const reordered = structuredClone(catalog);
  [reordered.skills[0], reordered.skills[1]] = [
    reordered.skills[1],
    reordered.skills[0],
  ];
  assert.throws(() => validateCatalog(reordered), /approved inventory/);
});

test("dependency ordering is deterministic and rejects cycles", async () => {
  const catalog = await readCatalog(projectRoot);
  const first = dependencyOrder(catalog.skills);
  const second = dependencyOrder(structuredClone(catalog.skills));
  assert.deepEqual(first, second);
  assert.ok(
    first.indexOf("planning-and-task-breakdown") <
      first.indexOf("incremental-implementation"),
  );
  assert.ok(
    first.indexOf("planning-and-task-breakdown") <
      first.indexOf("spec-driven-development"),
  );

  const cycle = JSON.parse(
    await readFixture("foundation", "cyclic-skills.json"),
  );
  assert.throws(() => dependencyOrder(cycle), /cycle/);
});

test("validated catalog and release boundaries are copy-isolated", async () => {
  const catalog = await readCatalog(projectRoot);
  catalog.skills[0].dependencies.push("mutated");
  catalog.skills[0].policies.codex.allowImplicitInvocation = true;
  const reread = await readCatalog(projectRoot);
  assert.deepEqual(reread.skills[0].dependencies, []);
  assert.equal(reread.skills[0].policies.codex.allowImplicitInvocation, false);

  const release = await readReleaseMetadata(projectRoot);
  release.node.minimum = "0";
  release.publisher.name = "caller mutation";
  assert.equal((await readReleaseMetadata(projectRoot)).node.minimum, "22.20.0");
  assert.equal(
    (await readReleaseMetadata(projectRoot)).publisher.name,
    "Dmitry Vasiliev",
  );
});

test("release metadata matches the reviewed development baseline", async () => {
  const release = await readReleaseMetadata(projectRoot);
  assert.equal(release.version, "0.0.0-development");
  assert.equal(release.releaseReady, false);
  assert.deepEqual(release.channels, ["stable"]);
  assert.equal(release.repository, "swimmwatch/engineer-agent-workflows");
  assert.deepEqual(release.publisher, {
    name: "Dmitry Vasiliev",
    email: "contact.vasiliev.dmitry@gmail.com",
    url: "https://github.com/swimmwatch",
  });
  assert.equal(release.lifecycleTool.version, "1.5.20");
  assert.equal(
    release.lifecycleTool.integrity,
    "sha512-lPl5KzMfTW+qwHFwc8t6R+wAqmdmSHw1+HWbGdJ/FZYbWLdB34bAZNFWiencM5DVoRaKAgXArmfTWMlNAbl9Gg==",
  );
  assert.equal(release.lifecycleTool.telemetry.environment, "DISABLE_TELEMETRY");
  assert.equal(release.lifecycleTool.telemetry.value, "1");

  const unknown = structuredClone(release);
  unknown.commit = "unverified";
  assert.throws(() => validateReleaseMetadata(unknown), /unknown field/);
});

test("JSON readers reject invalid UTF-8 without exposing content", async (t) => {
  const temporary = await makeTempTree(t, {
    "catalog/skills.json": Buffer.from([0xc3, 0x28]),
  });
  await assert.rejects(() => readCatalog(temporary), /valid UTF-8/);
});
