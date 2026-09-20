import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { readCatalog } from "../scripts/lib/catalog.mjs";
import { projectRoot } from "./lib/fixtures.mjs";

test("skills reuse host-supplied guidance and read only additional scoped instructions", async () => {
  const catalog = await readCatalog(projectRoot);

  for (const entry of catalog.skills) {
    const body = await fs.readFile(
      path.join(projectRoot, "skills", entry.name, "SKILL.md"),
      "utf8",
    );

    assert.match(
      body,
      /project instructions already\s+supplied by\s+the host|host-supplied project instructions/i,
      `${entry.name} must reuse host-supplied project instructions`,
    );
    assert.match(
      body,
      /do not reread (?:their\s+source files|them) solely to recover\s+context/i,
      `${entry.name} must not reread instructions solely to recover context`,
    );
    assert.match(
      body,
      /only\s+(?:when it is not\s+already in the active\s+context or the file itself is in scope|if absent from\s+active context or itself in scope)/i,
      `${entry.name} must limit additional instruction reads`,
    );
    assert.match(body, /`\{\{HOST_PROJECT_INSTRUCTIONS\}\}`/);
    assert.doesNotMatch(
      body,
      /read (?:the nearest )?applicable(?: project instructions from)?\s+`\{\{HOST_PROJECT_INSTRUCTIONS\}\}`/i,
      `${entry.name} retains an unconditional project-instruction read`,
    );
  }
});
