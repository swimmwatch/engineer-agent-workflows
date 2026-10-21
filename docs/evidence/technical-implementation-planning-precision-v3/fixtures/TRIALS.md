# Frozen customer-answer trial protocol

All scenarios and customer responses in this directory are `SIMULATION` data.
They are neither real customer evidence nor real user approvals. They grant no
authority to publish, change global configuration, or act outside the already
authorized empirical workflow trial. The Linux-only exception belongs only to
`lite-cli-core`; it does not restrict skills, hosts, or the configuration holdout.

## Freeze and isolate

Before invoking any trial model, freeze the registry, adversarial cases,
`customer-answers.json`, this protocol, the generated skill bundle, the starter
application, and the evaluator checks. Record SHA-256 digests, the actual runtime
and browser versions, host, actual model, fresh-context identifier, commands,
fixture time, and run/iteration identifiers. Use each registry scenario's depth,
profile selection, matrix, and required pass counts unchanged.

Prepare a small dependency-free Node.js application for each scenario. Where the
request says an existing behavior exists, materialize that baseline and its
compatibility behavior before the trial. The Deep baseline includes the frozen
legacy store. Confirm baseline prerequisites without pre-implementing the
requested change. The actor may choose ordinary internal organization; the
answers define public and persisted data contracts, not implementation classes,
frameworks, or source filenames.

Except for a deliberate missing-Git safeguard, prepare every implementation
fixture as an isolated Git worktree before model stages. An initial index
snapshot may establish the baseline for scoped diffs without creating commits.
Record that staged baseline and preserve staged/untracked fixture work; do not
require a clean tree or an existing commit. Never initialize or stage the real
source repository as part of fixture setup. Keep preserved older trials intact.

Use separate sibling directories for application and evaluator material. Keep
hidden assertions, acceptance drivers, process output captures, screenshots,
corrupt/recovery snapshots, and artifact snapshots outside application test
discovery and outside any application test glob or symlink. The application's
`npm test` must run only its own tests. Evaluator execution is a distinct command
with a distinct result. Never count a passing application suite as proof that
the evaluator or browser checks ran.

## Respond without inventing decisions

The simulated respondent may use only `commonAnswers` and the current scenario's
answers. Present only relevant answers when the actor asks; do not expose the
other full scenarios, holdouts, answer rubrics, adversarial expected outcomes,
hidden assertions, expected fixes, or previous reviewer conclusions. The initial
actor input is the realistic registry request, applicable skills and repository
guidance, and the actual starter application. For an `inline-confirmed` Lite
scenario, that simulation prompt may also contain explicitly confirmed frozen
facts or a complete scope proposal. Record their exact content with prompt
provenance; do not invent a question-tool invocation or label the prompt a tool
response. The registry label alone confirms no unstated decision.

For scope not already explicitly confirmed, present the exact proposal before
collecting its answer: depth, profiles, important exclusions, rationale, and
planned design/contract artifacts. Record the proposal and explicit simulated
answer in the decision ledger with their actual provenance. Persist that same
confirmed scope in the current manifest and bind its digest to the recorded
proposal and answer. This manifest-confirmation evidence is a separate record,
not a second required question approving the file. Do not ask again when the
manifest faithfully records already confirmed values. Reconfirm a material
depth, profile, or planning-artifact change before replacing its confirmed view.
Load no profile-specific reference until that confirmed view is recorded.

Use the active host's callable question tool and its actual schema when
available. Record its real capability and interaction status; never fabricate
tool results. If the standard tool is unavailable, preserve the exact question,
ask it directly in the conversation, and end the actor's turn. A later recorded
explicit reply to that saved question may resolve the decision through the
workflow's conversational fallback. Keep the original unavailable-tool status
and the later conversational-answer provenance distinct. Native-tool interaction
remains unverified when unavailable; successful fallback does not count as a
native-tool pass. A harness delivery failure is a non-answer, not evidence that
the tool itself is unavailable. Automatic specification approval after resolved
material decisions and a passing gap review remains the workflow rule; this
protocol does not add a separate final specification approval question.

While a required answer is missing, cancelled, or unsuccessfully delivered,
keep the decision pending and the trial incomplete. A later valid explicit
reply may resolve the saved decision without rewriting its earlier status. A
material question not covered by frozen data or a conflict between frozen
answers requires a reviewed fixture revision before a new trial; do not invent
a response or change the fixture mid-trial. Record the exact gap and never infer
consent from elapsed time. A new fixture version cannot retroactively turn an
earlier incomplete trial into a pass. Internal implementation choices that do
not change requirements remain the actor's responsibility.

## Run separate contexts

Use a fresh actual model context for specification, planning, every authorized
implementation packet, and each independent review. Each stage receives the
realistic stage request, applicable skills, relevant frozen customer answers,
and raw current artifacts from prior stages. Do not substitute a coordinator's
summary for required raw artifacts or carry another stage's model conversation
into the context. Record which artifacts and digests were supplied.

Planning receives the actual Approved simulated specification and the current
manifest with evidence linking it to the confirmed scope. Implementation receives
the current raw plan, checklist, handoff, declared contracts, and exactly one
authorized task packet.
Each implementation invocation performs that packet, verifies it, updates the
current checklist/handoff, and stops. A later packet needs its own recorded
invocation; independent review and commits are not additional packet gates.
Commit authority is separate and is not implied by a trial.

Independent review receives the finished raw artifacts, code/diff, relevant
frozen requirements, and real verification results. Reviewers do not receive
expected fixes, evaluator assertion source, previous review conclusions, or
holdout answers. An evaluator may use private assertions, but it must not coach
the actor with those assertions or leak them through application test discovery.
Any later repair iteration records the concrete observed failure and starts the
affected stage in a fresh context, preserving its authority and evidence rules.

## Evaluate actual behavior

Run the application's `npm test` and each required independent acceptance check.
CLI scenarios additionally require actual process stdout, stderr, and exit-status
assertions. UI scenarios require a real browser on local HTTP, with evidence of
keyboard/focus behavior, accessible status/error updates, and responsive states.
UI/API scenarios require browser traffic and direct HTTP against the same real
service. Browser-only stubs, DOM-only tests, screenshots alone, and simulated
network responses do not replace this integration evidence.

Service checks exercise actual local HTTP. Persistence, migration, and recovery
checks use isolated real filesystem state and real process restarts. Record
test-only clock/failure controls and the exact boundary exercised. Demonstrate
Deep migration interruption before crediting interruption recovery; a normal
restart after a completed migration is a different check. An unavailable
browser, runtime, required host/model, or failure-control capability is a failed
or incomplete required check, never a skipped pass.

Keep the hidden holdout applications and answers sealed until the candidate
bundle and evaluation checks are frozen. Their configuration-validator and
session-expiry examples must not be reused as full-case tuning inputs. A holdout
failure may motivate a new candidate, but once disclosed, that example is no
longer an unseen holdout for the next candidate; record that limitation rather
than claiming independent holdout evidence.

Record adversarial trials separately using `adversarial.json`. Inject only the
case's stated realistic condition into the relevant fresh stage; retain its
objective expected outcome in the evaluator. Deliberate incomplete/rejection
outcomes validate that safeguard but cannot count as a completed product loop.
Missing real model, review, environment, or acceptance evidence never counts as
a pass. Report actual results against the registry's required matrix and pass
counts without replacing empirical evidence with fixture expectations.
