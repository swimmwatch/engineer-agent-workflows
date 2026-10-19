import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { readCatalog } from "../scripts/lib/catalog.mjs";
import { projectRoot } from "./lib/fixtures.mjs";

function assertInstructionReuse(body, name) {
  assert.match(body, /project instructions already\s+supplied by\s+the host|host-supplied project instructions/i, `${name} must reuse host-supplied project instructions`);
  assert.match(body, /do not reread (?:their\s+source files|them) solely to recover\s+context|Use host-supplied project instructions; read additional `\{\{HOST_PROJECT_INSTRUCTIONS\}\}` only if absent from (?:active )?context or itself in scope/i, `${name} must not reread instructions solely to recover context`);
  assert.match(body, /only\s+(?:when it is not\s+already in the active\s+context or the file itself is in scope|if absent from\s+(?:active )?context or itself in scope)/i, `${name} must limit additional instruction reads`);
  assert.match(body, /`\{\{HOST_PROJECT_INSTRUCTIONS\}\}`/);
  assert.doesNotMatch(body, /read (?:the nearest )?applicable(?: project instructions from)?\s+`\{\{HOST_PROJECT_INSTRUCTIONS\}\}`/i, `${name} retains an unconditional project-instruction read`);
}

test("skills reuse host-supplied guidance and read only additional scoped instructions", async () => {
  const catalog = await readCatalog(projectRoot);

  for (const entry of catalog.skills) {
    const body = await fs.readFile(
      path.join(projectRoot, "skills", entry.name, "SKILL.md"),
      "utf8",
    );

    assertInstructionReuse(body, entry.name);
  }
});

test("compact instruction reuse still rejects missing read conditions and unconditional reads", async () => {
  const body = await fs.readFile(path.join(projectRoot, "skills/technical-design/SKILL.md"), "utf8");
  assertInstructionReuse(body, "technical-design");
  assert.throws(() => assertInstructionReuse(body.replace("only if absent from context or itself in scope", "whenever convenient"), "missing-condition"));
  assert.throws(() => assertInstructionReuse(body.replace("read additional `{{HOST_PROJECT_INSTRUCTIONS}}` only if absent from context or itself in scope", "reread `{{HOST_PROJECT_INSTRUCTIONS}}` to recover context"), "reread-context"));
  assert.throws(() => assertInstructionReuse(body.replace("only if absent from context or itself in scope", "always"), "always-read"));
  assert.throws(() => assertInstructionReuse(`${body}\nRead applicable \`{{HOST_PROJECT_INSTRUCTIONS}}\`.`, "unconditional-read"));
});
