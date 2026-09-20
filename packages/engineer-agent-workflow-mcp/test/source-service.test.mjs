import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { executeTool } from "../dist/service.js";

async function makeProject() {
  const project = await mkdtemp(join(tmpdir(), "decision-ledger-mcp-"));
  await mkdir(join(project, "docs", "specs", "alpha"), { recursive: true });
  return project;
}

function journal(specification, decisions) {
  return `schema_version: 1\nspec_slug: ${specification}\ndecisions:\n${decisions.map((decision) => `  - ${Object.entries(decision).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n    ")}`).join("\n")}`;
}

async function writeJournal(project, specification, decisions) {
  const directory = join(project, "docs", "specs", specification);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "decisions.yaml"), journal(specification, decisions));
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error?.code === code);
}

test("catalog isolates projects and does not parse inactive journals", async (t) => {
  const project = await makeProject();
  const otherProject = await makeProject();
  t.after(() => Promise.all([rm(project, { recursive: true, force: true }), rm(otherProject, { recursive: true, force: true })]));

  await writeJournal(project, "alpha", [{ id: "A-1", revision: 1, category: "scope", state: "accepted", provenance: "test" }]);
  await mkdir(join(project, "docs", "specs", "broken"), { recursive: true });
  await writeFile(join(project, "docs", "specs", "broken", "decisions.yaml"), "not: [valid");
  await writeJournal(project, "Invalid_Name", [{ id: "I-1", revision: 1, category: "scope", state: "accepted", provenance: "test" }]);
  await symlink(join(project, "docs", "specs", "alpha", "decisions.yaml"), join(project, "docs", "specs", "broken", "linked.yaml"));
  await writeJournal(otherProject, "beta", [{ id: "B-1", revision: 1, category: "scope", state: "accepted", provenance: "test" }]);

  const catalog = await executeTool("decisions_catalog", { project });
  assert.deepEqual(catalog.items, ["alpha", "broken"]);
  assert.equal(catalog.total, 2);
  assert.equal(catalog.protocol_version, 1);
  assert.equal(typeof catalog.version, "string");

  const other = await executeTool("decisions_catalog", { project: otherProject });
  assert.deepEqual(other.items, ["beta"]);
});

test("catalog stops a streaming direct-entry scan at the configured bound", () => {
  const sourceUrl = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "source.js")).href;
  const program = `
    import { registerHooks } from "node:module";
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === "node:fs/promises") return { url: "mock:fs-promises", shortCircuit: true };
        return nextResolve(specifier, context);
      },
      load(url, context, nextLoad) {
        if (url === "mock:fs-promises") return {
          format: "module", shortCircuit: true,
          source: \`export async function realpath() { return "/project"; }
            export async function lstat() { return { isDirectory: () => true, isSymbolicLink: () => false }; }
            export async function opendir() { return { async *[Symbol.asyncIterator]() { for (let index = 0; index < 100001; index += 1) yield { name: "ignored-" + index, isDirectory: () => false, isSymbolicLink: () => false }; } }; }
            export async function open() { throw new Error("unexpected"); }\`,
        };
        return nextLoad(url, context);
      },
    });
    const { catalogSources } = await import(${JSON.stringify(sourceUrl)});
    try { await catalogSources("/project"); } catch (error) { process.stdout.write(error.code); }
  `;
  const output = execFileSync(process.execPath, ["--input-type=module", "--eval", program], { encoding: "utf8" });
  assert.equal(output, "SOURCE_LIMIT");
});

test("service rejects unsafe source locations before parsing", async (t) => {
  const project = await makeProject();
  t.after(() => rm(project, { recursive: true, force: true }));
  await writeJournal(project, "alpha", [{ id: "A-1", revision: 1, category: "scope", state: "accepted", provenance: "test" }]);
  await symlink(join(project, "docs", "specs", "alpha", "decisions.yaml"), join(project, "docs", "specs", "alpha", "replacement.yaml"));

  await rejectsCode(executeTool("decisions_overview", { project: "relative", specification: "alpha" }), "UNSAFE_PATH");
  await rejectsCode(executeTool("decisions_overview", { project, specification: "../alpha" }), "INVALID_INPUT");
  await rm(join(project, "docs", "specs", "alpha", "decisions.yaml"));
  await symlink(join(project, "docs", "specs", "alpha", "replacement.yaml"), join(project, "docs", "specs", "alpha", "decisions.yaml"));
  await rejectsCode(executeTool("decisions_overview", { project, specification: "alpha" }), "UNSAFE_PATH");
});

test("source access rejects oversized, nested-link and nonregular journals before parsing", async (t) => {
  const oversizedProject = await makeProject();
  const linkedProject = await mkdtemp(join(tmpdir(), "decision-ledger-mcp-"));
  const nonregularProject = await makeProject();
  t.after(() => Promise.all([
    rm(oversizedProject, { recursive: true, force: true }),
    rm(linkedProject, { recursive: true, force: true }),
    rm(nonregularProject, { recursive: true, force: true }),
  ]));

  await writeFile(join(oversizedProject, "docs", "specs", "alpha", "decisions.yaml"), Buffer.alloc(16 * 1024 * 1024 + 1));
  await rejectsCode(executeTool("decisions_overview", { project: oversizedProject, specification: "alpha" }), "SOURCE_LIMIT");

  await mkdir(join(linkedProject, "docs"), { recursive: true });
  await symlink(join(oversizedProject, "docs", "specs"), join(linkedProject, "docs", "specs"));
  await rejectsCode(executeTool("decisions_overview", { project: linkedProject, specification: "alpha" }), "UNSAFE_PATH");

  await rm(join(nonregularProject, "docs", "specs", "alpha"), { recursive: true });
  await mkdir(join(nonregularProject, "docs", "specs", "alpha", "decisions.yaml"), { recursive: true });
  await rejectsCode(executeTool("decisions_overview", { project: nonregularProject, specification: "alpha" }), "UNSAFE_PATH");
});

test("search cursors bind source and exact decision portions reconstruct Unicode text", async (t) => {
  const project = await makeProject();
  const otherProject = await makeProject();
  t.after(() => Promise.all([rm(project, { recursive: true, force: true }), rm(otherProject, { recursive: true, force: true })]));
  const answer = { text: "🙂".repeat(12_500), selected_ids: [] };
  const record = { id: "A-1", revision: 1, category: "scope", state: "accepted", provenance: "test", answer };
  await writeJournal(project, "alpha", [
    record,
    { id: "B-1", revision: 1, category: "scope", state: "accepted", provenance: "test" },
  ]);
  await writeJournal(otherProject, "alpha", [record, { id: "B-1", revision: 1, category: "scope", state: "accepted", provenance: "test" }]);

  const page = await executeTool("decisions_search", { project, specification: "alpha", limit: 1 });
  assert.equal(page.items.length, 1);
  assert.equal(page.complete, false);
  assert.equal(typeof page.next_cursor, "string");
  assert.equal(page.items[0].answer_preview, "🙂".repeat(256));
  assert.equal(page.items[0].answer_truncated, true);
  assert.ok(Buffer.byteLength(JSON.stringify(page)) <= 24 * 1024);

  const first = await executeTool("decisions_get", { project, specification: "alpha", id: "A-1" });
  assert.equal(Array.from(first.text).length, 4096);
  assert.equal(first.complete, false);
  assert.equal(typeof first.next_cursor, "string");
  const parts = [first.text];
  let portion = first;
  while (!portion.complete) {
    portion = await executeTool("decisions_get", { project, specification: "alpha", id: "A-1", cursor: portion.next_cursor });
    assert.ok(Array.from(portion.text).length <= 4096);
    parts.push(portion.text);
  }
  assert.equal(parts.join(""), JSON.stringify(record));
  assert.ok(Buffer.byteLength(JSON.stringify(first)) <= 64 * 1024);

  await rejectsCode(executeTool("decisions_get", { project, specification: "alpha", id: "A-1", cursor: page.next_cursor }), "INVALID_CURSOR");
  await rejectsCode(executeTool("decisions_search", { project, specification: "alpha", states: ["accepted"], limit: 1, cursor: page.next_cursor }), "INVALID_CURSOR");
  await rejectsCode(executeTool("decisions_search", { project: otherProject, specification: "alpha", limit: 1, cursor: page.next_cursor }), "INVALID_CURSOR");

  await writeJournal(project, "alpha", [{ id: "A-1", revision: 1, category: "scope", state: "accepted", provenance: "changed" }]);
  await rejectsCode(executeTool("decisions_search", { project, specification: "alpha", limit: 1, cursor: page.next_cursor }), "STALE_CURSOR");
});

test("search uses digest-bound cursors for legal large queries", async (t) => {
  const project = await makeProject();
  t.after(() => rm(project, { recursive: true, force: true }));
  const ids = Array.from({ length: 12 }, (_, index) => `D-${index}-${"x".repeat(507)}`);
  await writeJournal(project, "alpha", ids.map((id) => ({ id, revision: 1, category: "scope", state: "accepted", provenance: "test" })));

  const first = await executeTool("decisions_search", { project, specification: "alpha", ids, limit: 1 });
  assert.equal(first.complete, false);
  assert.equal(typeof first.next_cursor, "string");
  assert.ok(first.next_cursor.length <= 8192);
  const second = await executeTool("decisions_search", { project, specification: "alpha", ids, limit: 1, cursor: first.next_cursor });
  assert.equal(second.items.length, 1);
});

test("overview counts protected state keys as ordinary data", async (t) => {
  const project = await makeProject();
  t.after(() => rm(project, { recursive: true, force: true }));
  await writeJournal(project, "alpha", [
    { id: "A-1", revision: 1, category: "scope", state: "__proto__", provenance: "test" },
    { id: "B-1", revision: 1, category: "scope", state: "constructor", provenance: "test" },
  ]);

  const overview = await executeTool("decisions_overview", { project, specification: "alpha" });
  assert.equal(overview.states["__proto__"], 1);
  assert.equal(overview.states.constructor, 1);
});

test("cursor remains usable with a long valid absolute project path", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "decision-ledger-mcp-"));
  let project = root;
  for (let index = 0; index < 12; index += 1) {
    project = join(project, "x".repeat(200));
    await mkdir(project);
  }
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeJournal(project, "alpha", [
    { id: "A-1", revision: 1, category: "scope", state: "accepted", provenance: "test" },
    { id: "B-1", revision: 1, category: "scope", state: "accepted", provenance: "test" },
  ]);

  const first = await executeTool("decisions_search", { project, specification: "alpha", limit: 1 });
  assert.equal(typeof first.next_cursor, "string");
  assert.ok(first.next_cursor.length <= 8192);
  const second = await executeTool("decisions_search", { project, specification: "alpha", limit: 1, cursor: first.next_cursor });
  assert.equal(second.items.length, 1);
});

test("cursor remains usable with a valid long control-character project path", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "decision-ledger-mcp-"));
  let project = root;
  for (let index = 0; index < 18; index += 1) {
    project = join(project, "\u0001".repeat(200));
    await mkdir(project);
  }
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeJournal(project, "alpha", [
    { id: "A-1", revision: 1, category: "scope", state: "accepted", provenance: "test" },
    { id: "B-1", revision: 1, category: "scope", state: "accepted", provenance: "test" },
  ]);

  const first = await executeTool("decisions_search", { project, specification: "alpha", limit: 1 });
  assert.equal(typeof first.next_cursor, "string");
  assert.ok(first.next_cursor.length <= 8192);
  const second = await executeTool("decisions_search", { project, specification: "alpha", limit: 1, cursor: first.next_cursor });
  assert.equal(second.items.length, 1);
});
