# Concrete Efficiency Changes by Skill and MCP Boundary

## Purpose

This follow-up replaces the earlier three broad buckets with concrete explanatory notes grouped by actual skill/consumer and change ownership. It is **not** an implementation plan, approved specification bundle or authorization to change skills/MCP. A note can contain several independently testable corrections; twelve notes do not imply twelve specifications.

Each aspect explains: the exact current step, the trigger, the unnecessary work or mismatch, a minimal proposed change, existing mechanisms to preserve, source/test links and a focused verification boundary. Proposed tests are not reported as executed.

The evidence is the completed [audit](<../audit.md>) and its independent verification, not a new project-wide audit. Source/distribution baselines were compared again at 2026-10-26T18:52:23Z: all 447 source and 459 distribution hashes were unchanged. Final delivery checks record whether that remains true. These are point-in-time byte checks, not perpetual protection against concurrent edits or proof of runtime qualification.

Artifacts are English under the existing project/request convention. No numeric time/token gain has been measured. Source-confirmed engineering opportunities, conditional instruction risks and research hypotheses are distinguished within each note.

## Reading map: pick the skill/path you intend to change

| Note | Concrete moment to inspect | Findings and change owner |
|---|---|---|
| [01 — Ready-source batching](<01-ready-source-batching.md>) | Specification/planning and appropriate product ready-source selection use separate gets although a matching batch already exists | P01-001 + P02-F03, one shared instruction-adoption family; no new API |
| [02 — Product authoring context](<02-product-authoring-context.md>) | Resume can repropose scope; authors receive unrelated role detail; Definition/Technical discard an already-built document snapshot | P02-F01/F02 and P09-F01; skill/shared instructions plus two MCP preflight loaders |
| [03 — Design planning and catalog](<03-design-planning-and-catalog.md>) | No-design early stop occurs after manual disclosure; token checks reread a source; description paging can repeat no-new-information output | P01-002, P10-F02/F03; one skill entry and related MCP design/catalog paths |
| [04 — Code/security/adversarial review](<04-code-security-and-adversarial-review.md>) | A fix-review handoff lacks compact source identity; asynchronous neutral review can consume another source revision | P03-F01/F02; review skill instructions, not a new ledger/service |
| [05 — Specification review MCP](<05-specification-review-mcp.md>) | Long correction fields use small portions; retained observer context can select a stale cached final body | P06-F01/F02; specification review/follow-up/snapshot internals |
| [06 — Product review MCP](<06-product-review-mcp.md>) | Batch traversal repeats scans/status; cold single reads outlive reuse scope; structured-fit output can fail the final wire guard | P07-F01/F02/F03 and P14-01; shared product review implementation |
| [07 — Task execution and context](<07-task-execution-and-context.md>) | Current owner has a supported active recovery branch not described by prose; dependency closure scans every edge for each node | P09-F02/F03; task-owner instructions and task-context builder |
| [08 — Decisions and requirement links](<08-decisions-and-requirement-links.md>) | Parsed decisions are serialized/reparsed; each batch member rebuilds requirements; bounded decision portions allocate full Unicode arrays | P08-01, P10-F01/F04; state/ledger/requirements/decision reader internals |
| [09 — MCP schema lifecycle](<09-mcp-schema-lifecycle.md>) | A cold lazy validator can read replacement package bytes after startup identity was captured | P14-02; shared serving contract owner, indirect consumers only |
| [10 — Development verification and measurements](<10-development-verification-and-measurements.md>) | Local snapshot checks and baseline qualification duplicate work; benchmark results lack loaded executable identity | P12-F1/F2/F4; maintenance scripts/test ownership, not distributed skills |
| [11 — Benchmark-first research](<11-benchmark-first-research.md>) | Evidence-only replay scans retained history; test-file limits do not describe all child-process load | P08-02/P12-F3; experiments first, no pre-approved storage/concurrency change |
| [12 — Areas without proposed changes](<12-skills-without-proposed-changes.md>) | Six standalone skills and distribution safeguards do not have a new source-confirmed instruction defect | Explicit no-change coverage and future generated-fidelity obligations |

## Skill-to-note matrix

“Shared MCP” means an implementation dependency/consumer relationship, not an instruction to edit the skill. Conditional ready-source use is not a claim that every product author currently invokes that reader.

| Current canonical skill | Start here | Boundary |
|---|---|---|
| [spec-driven-development](<../../../../../skills/spec-driven-development/SKILL.md>) | [01](<01-ready-source-batching.md>), [05](<05-specification-review-mcp.md>), [07](<07-task-execution-and-context.md>), [08](<08-decisions-and-requirement-links.md>) | Exact product source inputs, completeness/correction review, task context and shared decision services |
| [planning-and-task-breakdown](<../../../../../skills/planning-and-task-breakdown/SKILL.md>) | [01](<01-ready-source-batching.md>), [07](<07-task-execution-and-context.md>) | Task authoring/ready-source and task-context/recovery instructions; do not rewrite existing efficient planning parser as a new defect |
| [incremental-implementation](<../../../../../skills/incremental-implementation/SKILL.md>) | [07](<07-task-execution-and-context.md>), baseline in [01](<01-ready-source-batching.md>) | Task execution/recovery; batch adoption already exists as a preservation example |
| [design-planning](<../../../../../skills/design-planning/SKILL.md>) | [03](<03-design-planning-and-catalog.md>), shared checks in [08](<08-decisions-and-requirement-links.md>) | Eligibility disclosure and design/catalog/reference validation, not live Penpot canvas work |
| [idea-refine](<../../../../../skills/idea-refine/SKILL.md>) | [02](<02-product-authoring-context.md>), [06](<06-product-review-mcp.md>) | Durable product authoring/review; [01](<01-ready-source-batching.md>) explicitly limits upstream-source applicability |
| [product-definition](<../../../../../skills/product-definition/SKILL.md>) | [02](<02-product-authoring-context.md>), [06](<06-product-review-mcp.md>) | Authoring/review and Definition preflight; ready input selection is qualified in [01](<01-ready-source-batching.md>) |
| [technical-design](<../../../../../skills/technical-design/SKILL.md>) | [01](<01-ready-source-batching.md>), [02](<02-product-authoring-context.md>), [06](<06-product-review-mcp.md>) | Pre-draft exact sources, shared authoring instructions and Technical preflight/review |
| [product-roadmap](<../../../../../skills/product-roadmap/SKILL.md>) | [01](<01-ready-source-batching.md>), [02](<02-product-authoring-context.md>), [06](<06-product-review-mcp.md>), [07](<07-task-execution-and-context.md>) | Ready source selection, authoring/review, task dependency context and recovery guidance |
| [code-review-and-quality](<../../../../../skills/code-review-and-quality/SKILL.md>) | [04](<04-code-security-and-adversarial-review.md>) | Optional explicit fix-review handoff, not a new implementation gate |
| [security-and-hardening](<../../../../../skills/security-and-hardening/SKILL.md>) | [04](<04-code-security-and-adversarial-review.md>) | Scoped security follow-up; changed threat/policy inputs invalidate prior evidence |
| [doubt-driven-development](<../../../../../skills/doubt-driven-development/SKILL.md>) | [04](<04-code-security-and-adversarial-review.md>) | Fresh neutral reviewer and source/contract identity |
| [context-engineering](<../../../../../skills/context-engineering/SKILL.md>) | [12](<12-skills-without-proposed-changes.md>) | No new source-confirmed canonical change |
| [context-scouting](<../../../../../skills/context-scouting/SKILL.md>) | [12](<12-skills-without-proposed-changes.md>) | No new source-confirmed canonical change |
| [interview-me](<../../../../../skills/interview-me/SKILL.md>) | [12](<12-skills-without-proposed-changes.md>) | Do not transfer the product resume ambiguity to this standalone skill without evidence |
| [code-simplification](<../../../../../skills/code-simplification/SKILL.md>) | [12](<12-skills-without-proposed-changes.md>) | No new source-confirmed canonical change |
| [documentation-and-adrs](<../../../../../skills/documentation-and-adrs/SKILL.md>) | [12](<12-skills-without-proposed-changes.md>) | No new source-confirmed canonical change |
| [performance-optimization](<../../../../../skills/performance-optimization/SKILL.md>) | [12](<12-skills-without-proposed-changes.md>), maintenance distinction in [10](<10-development-verification-and-measurements.md>) | Benchmark script findings do not automatically imply a skill rewrite |

## What must be coordinated rather than implemented independently

- [01](<01-ready-source-batching.md>), [02](<02-product-authoring-context.md>) and [07](<07-task-execution-and-context.md>) can touch the same canonical [product workflow reference](<../../../../../shared/references/product-workflow.md>). Agree one owner for shared wording; correct owner-recovery instructions before moving them to role-specific sections.
- [05](<05-specification-review-mcp.md>) and [06](<06-product-review-mcp.md>) share response-budget conventions, not the same review contract. Keep separate exact reconstruction/receipt tests.
- [06](<06-product-review-mcp.md>) and [08](<08-decisions-and-requirement-links.md>) reuse data under different read/mutation lifetimes. Do not generalize them into a global cache or erase freshness observations.
- [03](<03-design-planning-and-catalog.md>) and [08](<08-decisions-and-requirement-links.md>) meet at requirement/token/reference validation. Reducing acquisition/parsing never removes validation of any reference.
- [09](<09-mcp-schema-lifecycle.md>) and [10](<10-development-verification-and-measurements.md>) must agree on loaded-runtime identity, but evidence attribution does not require changing every schema consumer.
- [11](<11-benchmark-first-research.md>) is not a prerequisite for safe, independently tested local changes elsewhere. Its findings remain research until materiality and compatibility are established.

## How to use the notes in later chats

Choose the actual consumer/change boundary, read its note and cited problem/source evidence, then confirm the current implementation before specifying a fix. Do not turn all recommendations into mandatory scope. Keep each discriminating test attached to its particular defect; only combine regression sets after individual correctness is clear. Whole-specification semantic consistency, actual user consent, independent reviewer source consumption, locks, receipts and recovery ownership remain requirements, not duplicate work.

All 27 original finding references are assigned; P01-001/P02-F03 remain one family. No new substantive finding is introduced here. Separate implementation/specification authority is still required.

## Concurrent work and delivery checks

During documentation, three new untracked review fixture/test files appeared outside this audit directory. They were not created or modified by this follow-up's agents. Their relevant contents were inspected read-only and the affected [specification-review note](<05-specification-review-mcp.md>) was qualified. All 447 original source and 459 distribution baseline hashes remained unchanged. Do not infer implementation, test success or author identity from the new test files alone.

The [first validation](<validation.json>) retained an overly strict whole-status-equality failure: it detected the additions, not a changed/deleted original input. Exact worktree equality is not a requirement when concurrent work must be preserved. The corrected [final validation](<validation-final.json>) separately checks original bytes/artifacts, HEAD, retained initial status entries, all current additive changes, documentation coverage and link bounds. The failed observation is retained rather than relabeled as a pass.
