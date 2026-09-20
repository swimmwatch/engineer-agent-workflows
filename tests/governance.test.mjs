import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { readCatalog } from "../scripts/lib/catalog.mjs";
import { projectRoot, readFixture } from "./lib/fixtures.mjs";

async function read(relativePath) {
  return await fs.readFile(path.join(projectRoot, relativePath), "utf8");
}

test("required governance files exist", async () => {
  const fixture = JSON.parse(
    await readFixture("foundation", "governance.json"),
  );
  for (const relativePath of fixture.requiredFiles) {
    const stat = await fs.stat(path.join(projectRoot, relativePath));
    assert.ok(stat.isFile(), `${relativePath} must be a file`);
  }
});

test("README is factual, pre-release, and lists the complete catalog", async () => {
  const readme = await read("README.md");
  const catalog = await readCatalog(projectRoot);
  assert.match(readme, /local\s+Codex\s+dev\s+build/i);
  assert.match(readme, /\]\(docs\/local-development\.md\)/);
  assert.match(readme, /pre-release/i);
  assert.doesNotMatch(readme, /\bnpx\b/);
  for (const skill of catalog.skills) {
    assert.match(readme, new RegExp(`\\\`${skill.name}\\\``));
  }
});

test("security and conduct reports use the approved private contact", async () => {
  const fixture = JSON.parse(
    await readFixture("foundation", "governance.json"),
  );
  const security = await read("SECURITY.md");
  const conduct = await read("CODE_OF_CONDUCT.md");
  const issueConfig = await read(".github/ISSUE_TEMPLATE/config.yml");
  assert.match(security, new RegExp(fixture.privateContact));
  assert.match(conduct, new RegExp(fixture.privateContact));
  assert.match(security, /Do not report vulnerabilities in a public issue/);
  assert.match(issueConfig, /security\/policy/);
  assert.match(issueConfig, /never include security details/i);
});

test("repository-local Markdown links resolve", async () => {
  const documents = [
    "README.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "SUPPORT.md",
    "CODE_OF_CONDUCT.md",
  ];
  for (const document of documents) {
    const content = await read(document);
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(?:https?:|mailto:)/.test(target)) {
        continue;
      }
      const resolved = path.resolve(projectRoot, path.dirname(document), target);
      await assert.doesNotReject(() => fs.access(resolved));
    }
  }
});

test("private maintenance package keeps only pinned schema checks outside its MCP workspace", async () => {
  const packageJSON = JSON.parse(await read("package.json"));
  assert.equal(packageJSON.private, true);
  assert.equal(packageJSON.engines.node, ">=22.20.0");
  assert.equal(packageJSON["b" + "in"], undefined);
  assert.equal(packageJSON.dependencies, undefined);
  assert.deepEqual(packageJSON.devDependencies, { ajv: "6.15.0", yaml: "2.9.0" });
  assert.equal(packageJSON.scripts["post" + "install"], undefined);
  assert.deepEqual(packageJSON.workspaces, ["packages/*"]);
  const lock = JSON.parse(await read("package-lock.json"));
  assert.equal(lock.name, packageJSON.name);
  assert.deepEqual(lock.packages[""].devDependencies, packageJSON.devDependencies);
  const workspacePath = "packages/engineer-agent-workflow-mcp";
  const workspace = JSON.parse(await read(`${workspacePath}/package.json`));
  assert.equal(lock.packages[workspacePath].name, workspace.name);
  for (const field of ["dependencies", "devDependencies"]) {
    assert.deepEqual(lock.packages[workspacePath][field], workspace[field]);
    for (const version of Object.values(workspace[field])) {
      assert.match(version, /^\d+\.\d+\.\d+$/);
    }
  }
});

test("governance files contain no personal filesystem path or credential fixture", async () => {
  const fixture = JSON.parse(
    await readFixture("foundation", "governance.json"),
  );
  const files = fixture.requiredFiles.concat(["package.json"]);
  for (const relativePath of files) {
    const content = await read(relativePath);
    assert.doesNotMatch(content, /\/home\/[^/\s]+/);
    assert.doesNotMatch(content, /[A-Za-z]:\\Users\\/);
    assert.doesNotMatch(content, /gh[pousr]_[A-Za-z0-9_]+/);
    assert.doesNotMatch(content, /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/);
  }
});

test("gitignore preserves canonical and generated distribution paths", async () => {
  const ignore = await read(".gitignore");
  assert.doesNotMatch(ignore, /^skills\/?$/m);
  assert.doesNotMatch(ignore, /^plugins\/?$/m);
  assert.doesNotMatch(ignore, /^\.agents\/?$/m);
  assert.doesNotMatch(ignore, /^\.claude-plugin\/?$/m);
});
