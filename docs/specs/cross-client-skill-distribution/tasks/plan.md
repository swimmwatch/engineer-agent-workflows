# Cross-Client Skill Distribution Delivery Plan

Status: Ready for implementation authorization

Specification: [../spec.md](../spec.md)

Decision ledger: [../decisions.yaml](../decisions.yaml)

Confirmed scope: [../manifest.yaml](../manifest.yaml)

## Outcome

Deliver one public, MIT-licensed, SemVer collection of 15 explicit-only
engineering Agent Skills. One hand-edited template-based `skills/` tree feeds
separate generated Codex and Claude Code artifacts. Global lifecycle uses one
matching `add --copy` command per host, and native marketplaces point to the
matching generated bundle. The project uses pinned `skills@1.5.20` commands
and does not create an installer, lifecycle wrapper, project-local state, or
consuming-project mutation.

The corrective adaptive revision keeps specification and planning as two
existing workflows. Specification owns confirmed depth, profiles, behavioral
requirements, and the manifest; planning depends on that Approved bundle and
owns its declared reviewable contracts and test-first task packets.

This plan is planning-only. A numbered packet may be implemented only after
the user explicitly authorizes that packet.

## Proposed Architecture

| Unit | Ownership and responsibility | Dependency direction |
| --- | --- | --- |
| Repository governance | `README.md`, security, contribution, support, and repository defaults define the public project boundary. | Describes verified current state; never becomes a second workflow source. |
| `skills/<name>/` | Hand-edited workflow templates and non-generated assets. | Uses only declared host variables and runtime project evidence; never depends on generated plugin trees. |
| `shared/` | Sole authoritative engineering manual, test discipline, and deterministic verifier. | Generation creates authenticated copies for consuming skills in each host artifact. |
| `docs/specs/<slug>/decisions.yaml` | Append-only, non-sensitive history of observed facts, proposals, user answers, and supersession. | Specification writes revisions; planning reads but does not rewrite scope decisions. |
| `docs/specs/<slug>/manifest.yaml` | Deterministic current confirmed depth, composable profile states, rationale, and required planning artifacts. | Specification owns it; planning validates and consumes it. |
| `skills/spec-driven-development/` | Standalone adaptive behavioral specification workflow and conditionally loaded core/UI/backend references. | Produces Approved `spec.md`, decisions, and manifest; never creates planning artifacts. |
| `skills/planning-and-task-breakdown/` | Adaptive planning workflow and core/UI/backend planning references. | Depends on matching specification workflow; creates only manifest-listed reviewable contracts and task packets. |
| `catalog/skills.json` | Stable identities, descriptions, classification, dependencies, and host-policy inputs. | Generator and validators consume it; skill bodies do not depend on generator internals. |
| `catalog/release.json` | Reviewed upstream tool identity and release version/status. | Packaging and release checks consume it; CI never invents a version. |
| `scripts/lib/*.mjs` | Dependency-free parsing, validation, hashing, template rendering, generation, and manifest logic. | Commands depend inward on pure modules; modules do not invoke `npx` or mutate user profiles. |
| `scripts/generate.mjs` | Deterministically creates committed host artifacts; `--check` compares without mutation. | Writes only declared repository outputs and replaces the complete managed `plugins/` tree atomically. |
| `scripts/validate.mjs` | Fails closed on invalid catalog, template, skill, dependency, frontmatter, size, reference, manifest, or generated state. | Reads canonical and generated artifacts; emits bounded diagnostics. |
| `plugins/codex/engineer-agent-workflows/` | Generated complete Codex plugin with Codex-rendered values and all 15 skills. | Derived from canonical templates; contains no Claude-only values. |
| `plugins/claude-code/engineer-agent-workflows/` | Generated complete Claude Code plugin with Claude-rendered values and all 15 skills. | Derived from canonical templates; contains no Codex-only values or sidecars. |
| `.agents/plugins/marketplace.json` | Generated Codex marketplace entry. | Points only to the Codex plugin root. |
| `.claude-plugin/marketplace.json` | Generated Claude marketplace entry. | Points only to the Claude Code plugin root. |
| `tests/` | Unit, fixture, packaging, lifecycle, privacy, and acceptance harnesses. | May invoke pinned external clients only inside temporary homes and explicit manual gates. |
| `.github/workflows/` | Least-privilege validation and release gates across supported operating systems. | Calls repository scripts and pinned upstream CLI; release writes remain separately authorized. |

Node built-ins are the default implementation substrate. A dependency may be
added only when a packet supplies evidence that built-ins cannot satisfy its
contract. The repository does not publish a runtime executable.

## Packet Index

| Packet | Outcome | Depends on | Requirements |
| --- | --- | --- | --- |
| [01](01_repository_foundation.md) | Establish public repository governance, the private Node maintenance project, complete catalog model, deterministic validation/generation primitives, fixtures, and legal/security scaffolding. | Approved specification and completed Git/GitHub bootstrap | OUT-001, SCOPE-001, SKILL-001, SKILL-003, SKILL-004, SKILL-005, ARCH-001, ARCH-002, TOOL-001, TOOL-003, SEC-003, REL-003 |
| [02](02_engineering_manual_and_planning.md) | Deliver the canonical engineering and test-discipline references, generalized planning workflow, test-first packet and conditional documentation references, digest verification, host-native material questions, and symbol-level planning fixtures. | 01 | SKILL-002, SKILL-004, MAN-001, MAN-002, TEST-001, PLAN-001, PLAN-002, INT-001, TOK-002, DOC-001, ACC-008, ACC-009 |
| [03](03_specification_and_incremental.md) | Historical delivery of specification and incremental workflows, shared-resource failure handling, host-native decisions, test-first implementation, and review gates. Packet 13 supersedes its dependency description. | 02 | SKILL-004, SKILL-005, MAN-001, MAN-002, TEST-001, PLAN-001, PLAN-002, INT-001, ACC-008, ACC-009 |
| [04](04_code_quality_workflows.md) | Generalize review, simplification, doubt, performance, and security workflows with evidence-first fixtures and a fresh-context host-native doubt reviewer. | 01 | SKILL-001, SKILL-002, SKILL-005, QUAL-001, SEC-003, ACC-001, ACC-007, ACC-010 |
| [05](05_context_and_discovery_workflows.md) | Generalize context, ideation, and interview workflows with project discovery and host-native question outcome handling. | 01 | SKILL-001, SKILL-002, SKILL-005, INT-001, MCP-001, TOK-002, ACC-001, ACC-004, ACC-007 |
| [06](06_documentation_workflows.md) | Generalize documentation and project-documentation maintenance workflows and ADR/current-state distinctions. | 01 | SKILL-001, SKILL-002, SKILL-005, DOC-001, ACC-001, ACC-007 |
| [07](07_delivery_workflows.md) | Generalize pull-request and release workflows with discovered repository policy, signed-tag gates, and separate publishing authorization. | 01 | SKILL-001, SKILL-002, SKILL-005, SEC-002, SEC-003, REL-001, REL-002, ACC-001 |
| [08](08_native_plugin_packaging.md) | Generate isolated Codex and Claude Code bundles from one strict template source and validate cross-host separation. | 02-07 | HOST-001, HOST-002, ARCH-001, ARCH-002, INV-001, INV-002, TOK-001, TOK-002, DIST-001, DIST-006, DIST-007, ACC-001 |
| [09](09_global_lifecycle_isolation.md) | Prove separate host-specific global `add --copy`, list, repeat-add replacement, and remove behavior with byte-for-byte consuming-project isolation. | 08 | HOST-003, HOST-004, TOOL-001, TOOL-002, TOOL-003, DIST-001-DIST-005, SEC-001, SEC-003, ACC-002, ACC-003 |
| [10](10_host_context_acceptance.md) | Verify explicit-only activation, host discovery budgets, progressive disclosure, all host-native question workflows, test-first/documentation/reviewer behavior, plugin validation, and supported client floors. | 08, 09 | HOST-001–HOST-004, INV-001, INV-002, TOK-001, TOK-002, DIST-006, DIST-007, TEST-001, PLAN-002, INT-001, QUAL-001, ACC-004, ACC-006–ACC-010 |
| [11](11_documentation_and_operations.md) | Publish complete, evidence-bound installation, operation, test-first planning, question-tool, troubleshooting, privacy, and compatibility guidance. | 08–10 | DIST-002–DIST-007, TEST-001, PLAN-002, INT-001, MCP-001, SEC-001–SEC-003, REL-001, REL-003, DOC-001 |
| [12](12_ci_release_readiness.md) | Add reproducible CI, checksums, version agreement, and separately authorized signed-release gates. | 09–11 | OUT-001, HOST-003, HOST-004, SEC-002, SEC-003, REL-001–REL-003, ACC-005, ACC-006 |
| [13](13_adaptive_specification_and_planning.md) | Correct the existing specification/planning pair with confirmed adaptive depth, composable profiles, deterministic scope state, profile contracts, dependency reversal, and test-first validation. | Historical 02, 03, 08 | SKILL-004, SKILL-005, SPEC-001, MAN-001, TEST-001, PLAN-001–PLAN-003, INT-001, TOK-002, DOC-001, ACC-001, ACC-008, ACC-009 |

## Dependency Sequence

Packet [14](14_workflow_forward_testing.md) is the current authorized correction
after Packet 13: it owns bounded execution, host model recommendations, and the
empirical workflow loop (SPEC-001, PLAN-001–PLAN-003, EXEC-001, EVAL-001,
TEST-001, INT-001, TOK-002, HOST-001, HOST-002, DOC-001, ACC-008, ACC-009).
It does not authorize Packet 10 or global/client mutations.

```text
01 foundation
├── 02 manual + planning ── 03 specification + incremental
├── 04 code quality
├── 05 context + discovery
├── 06 documentation
└── 07 delivery
          │
          └── 08 generated plugin packaging
                    ├── 09 global lifecycle isolation
                    └── 13 adaptive specification + planning correction
                              │
                              └── 10 host/context acceptance (also depends on 09)
                                        └── 11 documentation + operations
                                                  └── 12 CI/release readiness
```

Packets 04–07 may be implemented in any order after packet 01. Packet 08
requires every workflow group so its generated catalog and native bundle are
complete. Packet 13 is a corrective packet over the historical 02/03/08
artifacts and shall complete before Packets 10–12; its number does not imply a
later runtime dependency.

## Requirement Coverage

| Requirement | Owning packet(s) |
| --- | --- |
| OUT-001 | 01, 12 |
| SCOPE-001 | 01 |
| SKILL-001 | 01, 04, 05, 06, 07 |
| SKILL-002 | 02, 04, 05, 06, 07 |
| SKILL-003 | 01 |
| SKILL-004 | 01, 02, 03, 13 |
| SKILL-005 | 01, 03, 04, 05, 06, 07, 13 |
| SPEC-001 | 13, 14 |
| MAN-001 | 02, 03, 13 |
| MAN-002 | 02, 03 |
| PLAN-001 | 02, 03, 13, 14 |
| EXEC-001 | 14 |
| EVAL-001 | 14 |
| HOST-001 | 08, 10, 14 |
| HOST-002 | 08, 10, 14 |
| HOST-003 | 09, 10, 12 |
| HOST-004 | 09, 10, 12 |
| ARCH-001 | 01, 08 |
| ARCH-002 | 01, 08 |
| ARCH-003 | 01 |
| INV-001 | 08, 10 |
| INV-002 | 08, 10 |
| TOK-001 | 08, 10 |
| TOK-002 | 02, 05, 08, 10, 13, 14 |
| TOOL-001 | 01, 09 |
| TOOL-002 | 09 |
| TOOL-003 | 01, 09 |
| DIST-001 | 08, 09 |
| DIST-002 | 09, 11 |
| DIST-003 | 09, 11 |
| DIST-004 | 09, 11 |
| DIST-005 | 09, 11 |
| DIST-006 | 08, 10, 11 |
| DIST-007 | 08, 10, 11 |
| TEST-001 | 02, 03, 10, 11, 13, 14 |
| PLAN-002 | 02, 03, 10, 11, 13, 14 |
| PLAN-003 | 13, 14 |
| INT-001 | 02, 03, 05, 10, 11, 13, 14 |
| QUAL-001 | 04, 10 |
| MCP-001 | 05, 11 |
| SEC-001 | 09, 11 |
| SEC-002 | 07, 11, 12 |
| SEC-003 | 01, 04, 07, 09, 11, 12 |
| REL-001 | 07, 11, 12 |
| REL-002 | 07, 12 |
| REL-003 | 01, 11, 12 |
| DOC-001 | 02, 06, 11, 13, 14 |
| ACC-001 | 02–08, 13 |
| ACC-002 | 09 |
| ACC-003 | 09 |
| ACC-004 | 05, 10 |
| ACC-005 | 12 |
| ACC-006 | 10, 12 |
| ACC-007 | 02, 04–06, 08, 10 |
| ACC-008 | 02, 03, 10, 13, 14 |
| ACC-009 | 02, 03, 10, 13, 14 |
| ACC-010 | 04, 10 |

## Global Invariants

- `skills/<name>/SKILL.md`, non-generated assets, renderer mappings, and root
  `shared/` are authoritative. Generated shared resources and both host
  plugin trees are never edited directly.
- All 15 stable names are unique and explicit-only. Descriptions are at most
  240 Unicode code points and complete `SKILL.md` files are at most 4,096
  UTF-8 bytes.
- `spec-driven-development` is standalone.
  `planning-and-task-breakdown` depends on the matching specification workflow,
  and `incremental-implementation` depends on the matching planning workflow.
  The other 12 workflows are standalone.
- Specification confirms the highest applicable `Lite`, `Standard`, or `Deep`
  depth and composable profiles, stores history in `decisions.yaml`, stores
  current scope in `manifest.yaml`, and creates no planning artifact. Planning
  requires that Approved and confirmed bundle and owns manifest-listed
  reviewable contracts.
- Incremental execution validates the existing plan and performs one authorized
  packet. Optional independent review and commits are not completion or
  next-invocation gates; actual prerequisites and required checks still apply.
- The engineering manual and test discipline each have one authored root copy.
  Consuming skills use generated byte-identical local copies, validate release
  digests, and stop before artifact creation on absence or mismatch.
- Codex and Claude Code artifacts are generated from the same templates but
  contain only their own host-specific values and metadata.
- Normative lifecycle commands pin `skills@1.5.20`, require Node.js 22.20.0 or
  newer, set `DISABLE_TELEMETRY=1`, use global scope, name exactly one target
  host per add, select the matching source, use `--copy`, and select explicit
  skills. Replacement repeats the matching add; `skills update` is not used.
- Tests invoke the upstream CLI only with isolated temporary profiles and
  snapshot the consuming project before and after. Real user profiles and
  project-local skill directories are out of scope.
- Numbered packets do not publish, tag, install global skills, or mutate a real
  host profile without separately stated authorization and a manual gate.

## Manual Gates And Unresolved Inputs

- **Resolved repository identity:** public repository
  `swimmwatch/engineer-agent-workflows`, with local default branch `main` and
  HTTPS origin
  `https://github.com/swimmwatch/engineer-agent-workflows.git`.
- **MANUAL GATE — release version:** before packet 12 validates a stable
  release, the user must confirm the exact SemVer. Development metadata may use
  an explicitly non-release placeholder that cannot pass the release gate.
- **MANUAL GATE — client/account coverage:** local Codex CLI/IDE, Claude Code,
  hosted/account, and organization-managed tests require separately authorized
  client and account mutations.
- **MANUAL GATE — signed publication:** a human creates the signed tag and
  separately authorizes GitHub Release publication. CI must not invent either.

## Planning Verification

Before any remaining or corrective packet authorization:

1. Every requirement identifier in the approved specification appears in the
   coverage table and in at least one packet.
2. Every packet is self-contained and links from `todo.md`.
3. All relative links resolve.
4. `spec.md` remains `Status: Approved`; `manifest.yaml` is confirmed and
   consistent; revised scope and architectural decisions are checkpointed in
   `decisions.yaml`.
5. Local Git and generated changes remain within the authorized packet; no
   commit, installation, user-profile mutation or publication is inferred.
