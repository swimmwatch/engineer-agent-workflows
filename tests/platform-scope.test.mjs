import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = file => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const spec = "skills/spec-driven-development/references/";
const plan = "skills/planning-and-task-breakdown/references/";

test("platform triage precedes profile loading and preserves established scope", async () => {
  const scope = await read(`${spec}adaptive-scope.md`);
  const platform = scope.indexOf("## Platform Support");
  assert.ok(platform >= 0, "initial scope must own platform support");
  const rules = scope.slice(platform, scope.indexOf("## Compact Artifact Registry"));
  for (const required of [
    /before scope confirmation/i, /already established/i, /ask/i,
    /per component/i, /development, build, and runtime/i,
    /single.platform/i, /unanswered/i, /not.*(?:every|all).*combination/is,
    /before\s+calling\s+`scope_propose`/i, /do not batch.*scope confirmation/is,
  ]) assert.match(rules, required);
  assert.match(scope, /only.*active profile/is);
});

test("platform decisions use existing persistence and behavioral requirements", async () => {
  const interview = await read(`${spec}specification-interview.md`);
  assert.match(interview, /platform support.*requirement\s+IDs/is);
  assert.match(interview, /question_prepare/);
  assert.match(interview, /question_record_answer/);
  assert.match(interview, /no new manifest fields/i);
  assert.match(interview, /unsupported.*(?:behavior|environments)/is);
  const platform = interview.slice(interview.indexOf("Record agreed platform support"), interview.indexOf("Keep the artifact behavioral"));
  assert.match(platform, /`decision_link_requirements`/);
  assert.match(platform, /before.*Approved/is);
  assert.match(platform, /context.*unchanged/is);
  assert.match(platform, /`Status: Draft`/);
  assert.match(platform, /only then.*Approved/is);
  assert.match(platform, /`decision_find` with only the latest context/i);
  assert.match(platform, /do not.*replace saved answers/is);
});

test("all eight profiles carry domain-specific platform obligations", async () => {
  const domains = {
    core: /paths.*permissions.*shell/is,
    ui: /browsers.*devices.*input/is,
    backend: /server.*runtime/is,
    events: /producer.*consumer.*protocol/is,
    data: /encoding.*locale.*file.system/is,
    operations: /build.*deployment.*runtime/is,
    security: /permission.*isolation.*secret/is,
    "cross-surface": /cross.platform.*end.to.end/is,
  };
  for (const [profile, domain] of Object.entries(domains)) {
    for (const [base, suffix] of [[spec, "requirements"], [plan, "planning"]]) {
      const content = await read(`${base}${profile}-${suffix}.md`);
      const rules = content.slice(content.indexOf("## Platform Applicability"));
      assert.match(rules, /agreed platform support/i, `${profile}/${suffix}`);
      assert.match(rules, domain, `${profile}/${suffix}`);
      assert.match(rules, /(?:material|applicable)/i);
    }
  }
});

test("planning inherits support, requires coverage, and reports unavailable evidence", async () => {
  const content = await read(`${plan}adaptive-planning.md`);
  const rules = content.slice(content.indexOf("## Platform Verification"), content.indexOf("## Output By Depth"));
  for (const required of [
    /inherit/i, /each supported/i, /requirement IDs/i,
    /unavailable|unverified/i, /not.*(?:pass|verified)/is,
    /return.*specification/is, /do not.*repeat/is,
  ]) assert.match(rules, required);
  const design = await read("skills/design-planning/references/penpot-workflow.md");
  assert.match(design, /agreed platform support.*browsers.*devices.*input/is);
  assert.match(design, /(?:preview|snapshot).*not.*(?:browser|runtime)/is);
});
