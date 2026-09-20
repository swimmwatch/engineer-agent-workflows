import assert from "node:assert/strict";
import test from "node:test";
import { renderHostTemplate } from "../scripts/lib/distribution.mjs";

const template = "Author: {{HOST_AUTHOR_MODEL}}\nImplement: {{HOST_IMPLEMENTATION_MODEL}}\nReview: {{HOST_REVIEW_MODEL}}";

test("host model recommendations render independently without cross-host names", () => {
  const codex = renderHostTemplate(template, "codex", "SKILL.md").toString();
  const claude = renderHostTemplate(template, "claude-code", "SKILL.md").toString();
  assert.match(codex, /Author: Sol/);
  assert.match(codex, /Implement: Terra/);
  assert.match(codex, /Review: Sol.*Astra/);
  assert.doesNotMatch(codex, /Opus|Sonnet|\{\{/);
  assert.equal(claude, "Author: Opus\nImplement: Sonnet\nReview: Opus");
  assert.doesNotMatch(claude, /Terra|Sol|Astra|\{\{/);
});

test("model recommendation placeholders preserve strict rejection of unknown roles", () => {
  assert.throws(() => renderHostTemplate("{{HOST_UNKNOWN_MODEL}}", "codex", "SKILL.md"),
    /unknown host template variable/);
});
