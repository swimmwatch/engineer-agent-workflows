import assert from "node:assert/strict";
import test from "node:test";
import { renderHostTemplate } from "../scripts/lib/distribution.mjs";

const template = "Author: {{HOST_AUTHOR_MODEL}}\nImplement: {{HOST_IMPLEMENTATION_MODEL}}\nReview: {{HOST_REVIEW_MODEL}}";

function nativeReviewModelGuidanceUsesActualRolesAndPreservesTheMainModel() {
  const token = "{{HOST_NATIVE_REVIEW_HOST_GUIDANCE}}";
  const harness = renderHostTemplate(token, "deepseek-harness", "native-review.md").toString();
  assert.match(harness, /list_subagent_models.*ask_user_question/s);
  assert.match(harness, /explicit advertised `provider` and `model` pairs/);
  assert.match(harness, /roles\.judge.*roles\.final/s);
  assert.match(harness, /same task\/role while available/);
  assert.match(harness, /pending answer.*blocks dispatch.*never silently inherit or substitute/s);
  assert.match(harness, /no inspection role or main-model switch/);
  assert.doesNotMatch(harness, /deepseek-flash|gpt-6-luna|end the turn when only child/);
  const codex = renderHostTemplate(token, "codex", "native-review.md").toString();
  assert.match(codex, /ordinary independent checker/);
  assert.doesNotMatch(codex, /list_subagent_models|ask_user_question|scriptPath/);
  const claude = renderHostTemplate(token, "claude-code", "native-review.md").toString();
  assert.match(claude, /actual schema.*scriptPath/s);
  assert.match(claude, /advisory recommendations do not change the main model/);
  assert.doesNotMatch(claude, /list_subagent_models|ask_user_question/);
}
test("native review selects judging and final routes without inheriting scout or main model choices", nativeReviewModelGuidanceUsesActualRolesAndPreservesTheMainModel);

test("host model recommendations render independently without cross-host names", () => {
  const codex = renderHostTemplate(template, "codex", "SKILL.md").toString();
  const claude = renderHostTemplate(template, "claude-code", "SKILL.md").toString();
  assert.match(codex, /Author: Sol/);
  assert.match(codex, /Implement: GPT-6\.1 Terra/);
  assert.match(codex, /Review: Sol.*Astra/);
  assert.doesNotMatch(codex, /Opus|Sonnet|\{\{/);
  assert.equal(claude, "Author: Opus\nImplement: Sonnet\nReview: Opus");
  assert.doesNotMatch(claude, /Terra|Sol|Astra|\{\{/);
});

test("model recommendation placeholders preserve strict rejection of unknown roles", () => {
  assert.throws(() => renderHostTemplate("{{HOST_UNKNOWN_MODEL}}", "codex", "SKILL.md"),
    /unknown host template variable/);
});

test("scout models render exact native names without changing other model roles", () => {
  for (const [host, model] of [["codex", "gpt-6-luna"], ["claude-code", "haiku"]]) {
    assert.equal(renderHostTemplate("{{HOST_SCOUT_MODEL}}", host, "SKILL.md").toString(), model);
    assert.equal(renderHostTemplate(`${template}\nScout: {{HOST_SCOUT_MODEL}}`, host, "SKILL.md").toString(),
      `${renderHostTemplate(template, host, "SKILL.md")}\nScout: ${model}`);
  }
});
