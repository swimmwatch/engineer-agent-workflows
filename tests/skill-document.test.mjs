import assert from "node:assert/strict";
import test from "node:test";

import { readCatalog } from "../scripts/lib/catalog.mjs";
import {
  countCodePoints,
  decodeUTF8,
  renderRequiredFrontmatter,
  splitSkillDocument,
  utf8Bytes,
  validateSkillDocument,
} from "../scripts/lib/skill-document.mjs";
import { projectRoot, readFixture } from "./lib/fixtures.mjs";

test("canonical frontmatter renders and validates deterministically", async () => {
  const entry = (await readCatalog(projectRoot)).skills[0];
  const rendered = `${renderRequiredFrontmatter(entry)}# Review\n\nExplicit only.\n`;
  const validated = validateSkillDocument(entry, rendered);
  assert.equal(validated.frontmatter.name, entry.name);
  assert.equal(validated.frontmatter.description, entry.description);
  assert.equal(validated.frontmatter["disable-model-invocation"], true);
  assert.equal(validated.frontmatter["user-invocable"], true);
  assert.equal(
    renderRequiredFrontmatter(entry),
    renderRequiredFrontmatter(structuredClone(entry)),
  );
});

test("fixture document parses with a copied boundary", async () => {
  const document = await readFixture("foundation", "valid-skill.md");
  const first = splitSkillDocument(document);
  first.frontmatter.name = "mutated";
  const second = splitSkillDocument(document);
  assert.equal(second.frontmatter.name, "code-review-and-quality");
  assert.match(second.body, /^# Review/);
});

test("unknown and complex frontmatter is rejected", async () => {
  const unknown = await readFixture(
    "foundation",
    "invalid-unknown-frontmatter.md",
  );
  const complex = await readFixture(
    "foundation",
    "invalid-complex-frontmatter.md",
  );
  assert.throws(() => splitSkillDocument(unknown), /unknown field/);
  assert.throws(
    () => splitSkillDocument(complex),
    /JSON-quoted string|flat scalar fields/,
  );
});

test("malformed, repeated, CRLF, NUL, and blank documents are rejected", async () => {
  const entry = (await readCatalog(projectRoot)).skills[0];
  const header = renderRequiredFrontmatter(entry);
  assert.throws(() => splitSkillDocument("# no frontmatter\n"), /must start/);
  assert.throws(() => splitSkillDocument("---\nname: x\n"), /not terminated/);
  assert.throws(
    () => splitSkillDocument(`${header}---\nsecond\n`),
    /repeated frontmatter/,
  );
  assert.throws(
    () => splitSkillDocument(`${header.replaceAll("\n", "\r\n")}body`),
    /LF line endings/,
  );
  assert.throws(() => splitSkillDocument(`${header}body\0`), /NUL/);
  assert.throws(() => splitSkillDocument(header), /must not be blank/);
});

test("invalid UTF-8 and unpaired surrogates are rejected", () => {
  assert.throws(() => decodeUTF8(Buffer.from([0xc3, 0x28])), /valid UTF-8/);
  assert.throws(() => countCodePoints("\ud800"), /valid Unicode/);
  assert.throws(() => utf8Bytes("\udc00"), /valid Unicode/);
});

test("SKILL.md byte boundary accepts 4096 and rejects 4097", async () => {
  const entry = (await readCatalog(projectRoot)).skills[0];
  const header = renderRequiredFrontmatter(entry);
  const bodyPrefix = "# Review\n\n";
  const padding = 4096 - utf8Bytes(header) - utf8Bytes(bodyPrefix);
  assert.ok(padding > 0);
  const exact = `${header}${bodyPrefix}${"x".repeat(padding)}`;
  assert.equal(utf8Bytes(exact), 4096);
  assert.equal(validateSkillDocument(entry, exact).bytes, 4096);
  assert.throws(
    () => validateSkillDocument(entry, `${exact}x`),
    /exceeds 4096/,
  );
});

test("code-point counting treats supplementary characters as one", () => {
  const value = "😀".repeat(240);
  assert.equal(countCodePoints(value), 240);
  assert.equal(utf8Bytes(value), 960);
});
