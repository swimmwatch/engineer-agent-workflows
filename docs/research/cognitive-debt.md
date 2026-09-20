# Cognitive debt and a small understanding skill

Research date: 2026-09-05

Status: Research and proposal; not an approved specification.

## Recommendation

Add one explicitly invoked, standalone skill, provisionally named
`build-understanding`. Help a person understand a feature, existing code,
specification, plan, change, or technical concept through a short explanation,
a concrete example, and an optional opportunity to apply their understanding.
Work without a specification or a repository when the question allows it.

The proposed outcome is usable human understanding: explaining what happens,
why a relevant decision matters, what could go wrong, and where to verify it.
This is a design hypothesis supported by adjacent research, not an established
treatment or a demonstrated reduction in long-term cognitive debt.

## What the term means

Cognitive debt is used for the accumulated gap between a system and the human
understanding needed to evaluate, maintain, and change it. Margaret-Anne
Storey's framework distinguishes technical debt in code, cognitive debt in
people, and intent debt in missing recorded goals, constraints, and rationale.
Documentation can preserve rationale without proving that someone understands
it. This is a conceptual framework, not a validated numerical measure.
[Storey, 2026](https://arxiv.org/abs/2603.22106).

For this proposal, distinguish immediate cognitive load from accumulated
understanding gaps. Overload can encourage delegating decisions without
examining them; delegation can also reduce immediate effort while leaving
those gaps. Delegation itself is not evidence of debt. The relevant question
is whether the person can still judge the behavior and consequences that
matter for their role. Memorizing every implementation detail is not the goal.

## Evidence and its limits

- **Coding skill formation:** Anthropic reports a randomized study with 52
  mostly junior Python developers learning Trio. The AI group averaged 50% on
  the immediate assessment versus 67% without AI, a difference of 17 percentage
  points. The completion-time difference was not statistically significant.
  Conceptual questions and explanation-seeking appeared in stronger-performing
  interaction patterns, but those patterns were an observational analysis
  within the experiment. They do not establish that a particular prompting
  technique caused better learning. The study does not establish long-term
  effects or outcomes for experienced developers using coding agents.
  [Anthropic, January 2026](https://www.anthropic.com/research/AI-assistance-coding-skills).
- **Comprehension in projects:** A qualitative study analyzed 621 reflective
  diaries from 207 students over eight weeks. It describes black-box AI use,
  contextual mismatch, dependency, and bypassed verification as recurring
  comprehension-debt patterns. Self-reports from an educational setting do not
  establish causal effects in professional engineering teams.
  [Ahmad, April 2026](https://arxiv.org/abs/2604.13277).
- **The frequently cited essay study:** *Your Brain on ChatGPT* involved 54
  participants in the first three sessions and 18 in the fourth. Its writing
  task and EEG observations do not establish universal loss of intelligence
  or long-term harm to software developers. A separate methodological comment
  questions aspects of the design, analysis, and reporting.
  [Kosmyna et al.](https://arxiv.org/abs/2506.08872),
  [methodological comment](https://arxiv.org/abs/2601.00856).
- **Retrieval with feedback:** Learning guidance from cognitive scientist
  Pooja Agarwal recommends applying or retrieving knowledge followed by an
  explanation of why the answer is correct. Feedback can be brief and carry
  no grade. This motivates an optional prediction or explanation question;
  its effectiveness in this proposed skill still needs to be tried.
  [Retrieval Practice](https://www.retrievalpractice.org/strategies/2018/5/25/feedback).

## Existing approaches

| Approach | What already exists | Fit for this request |
| --- | --- | --- |
| Native learning style | Claude Code offers Explanatory insights and a Learning style that asks the user to contribute small pieces of code. | Useful for learning while coding; applies to the conversation and is specific to one host. |
| Comprehension audit | The public `vibe-guard-skills` project includes `/vibe-explain`, which reports opaque code, assumptions, consequences, and maintenance actions. | Useful inspiration for evidence-backed walkthroughs; primarily a code audit, rather than a general question-led dialogue. |
| Proposed standalone skill | A bounded explanation and optional application check grounded in the relevant source. | Covers existing behavior, proposed behavior, and conceptual questions on either supported host. |

The first two descriptions were checked in
[Claude Code documentation](https://code.claude.com/docs/en/output-styles) and
the [vibe-guard-skills README](https://github.com/codecoincognition/vibe-guard-skills/blob/main/README.md).
The external skill was inspected as documentation, not installed or
behaviorally tested. Its debt scoring is not evidence of a person's
understanding. The proposed design borrows the useful explanatory pattern,
without treating an audit score as a learning measure.

## Proposed interaction

1. **Identify the question and the useful scope.** Use the user's wording and
   available context to start with one feature, decision, flow, or concept.
   Ask for clarification only when necessary. Avoid an introductory interview
   for a straightforward question.
2. **Ground the explanation.** Inspect the smallest sufficient set of actual
   sources. Distinguish observed implementation, specified requirements,
   planned implementation, and illustrative examples. Give direct evidence
   for important claims. If sources conflict or are unavailable, state the
   gap rather than completing the story from assumptions.
3. **Build a compact model.** Answer the question directly, then explain the
   relevant actors, input, state change, output, and purpose. Use plain words
   and define necessary terms. Add a small diagram only when relationships
   would otherwise be difficult to follow.
4. **Walk through one example.** Show a representative input and result,
   then a meaningful variation or failure case when it helps. Explain the
   relevant trade-off and what would make another choice reasonable.
   Distinguish documented historical rationale from an inferred justification.
5. **Offer one application check.** For a learning request, invite the user
   to predict the variation or explain a decision in their own words. Do not
   reveal the answer in the same message or require a quiz before answering
   the original question. Honor requests for explanation only. A skipped
   check leaves understanding unverified.
6. **Respond to the actual answer.** Correct the specific misconception with
   evidence or a counterexample. Expand only the part that is still unclear.
   Close with the key takeaway and any unresolved question when useful.

These are adaptable behaviors, not mandatory headings in every answer. A
simple question may need a short paragraph and no exercise. The user controls
pace, detail, and whether to continue. Understanding one example is only local
evidence; do not declare broad mastery, invent a score, or infer understanding
from agreement or silence.

## Example requests

- `Use $build-understanding to explain what this specification would change
  for a user and which decisions still need my judgment.`
- `Use $build-understanding to explain why these plan tasks are ordered this
  way and what would happen if we changed the order.`
- `Use $build-understanding to trace how retries work in the current code.
  Show me where duplicate execution is prevented, if it is.`
- `Use $build-understanding to explain idempotency with one example, then
  check my understanding.`
- `Use $build-understanding to explain this function briefly, without a quiz.`

A hypothetical queue example could explain the difference between processing
a message and acknowledging it. An application check could then ask what
happens if a worker stops between those actions. The explanation must follow
the actual broker configuration and handler code when discussing a real
project; a generic queue example cannot prove the project's behavior.

## Fit with this repository

The current [catalog](../../catalog/skills.json) separates idea refinement,
requirements interviewing, specification, planning, implementation, review,
and documentation. The proposed skill's owner is human comprehension of a
selected question. It can identify an unresolved product choice without
silently deciding it or invoking another workflow.

Use the existing single-source generation model: one canonical skill and
separate Codex and Claude Code artifacts, with explicit invocation on both
hosts. Keep the first version small enough for one `SKILL.md`; scripts,
automatic monitoring, persistent learner profiles, mandatory exercises, and
new service dependencies have no demonstrated requirement here.

Reading ordinary specifications, plans, or code does not require a decision
journal. If an answer requires journal evidence, follow the repository's
MCP-only journal access rule. An unavailable journal leaves that rationale
unverified; do not bypass the rule or block unrelated explanation work.

Explanation does not itself authorize implementation, edits to approved
requirements, global installation, commits, or publication. Keep optional
takeaways in the conversation unless the user asks to save them.

## Proposed acceptance signals

- A code question identifies the actual relevant flow and its limits with
  repository evidence; an unavailable source is reported honestly.
- A specification or plan question separates future behavior from current
  behavior and leaves unresolved decisions unresolved.
- A general technical question works without a repository or specification.
- A short-answer request stays short and does not trigger an interview.
- An optional application check waits for the user's answer; incorrect,
  partial, skipped, and unanswered responses are handled distinctly.
- The skill does not change the project merely because a learning request
  exposes a defect or a possible improvement.

These are proposed behavioral checks, not executed test results. A practical
trial should include a real feature question, a planned-change question, and
a concept question, followed where appropriate by a new example the person
can reason through. Long-term retention would require separate evidence.

## Scope confirmation needed before specification

Propose **Lite** depth with **core** and **cross-surface** profiles: a small
conversational workflow whose shared behavior must survive generation for two
hosts. This is not confirmed scope and no profile references have been loaded.
The repository requires that confirmation before detailed specification work
and separate invocations for planning and implementation. The active session
also exposes no Decision Ledger MCP tools, so specification journal work
cannot proceed until that prerequisite is available. Research and this
proposal do not create or read a decision journal.
