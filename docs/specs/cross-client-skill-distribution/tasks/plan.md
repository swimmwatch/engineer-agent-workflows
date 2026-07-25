# Cross-Client Skill Distribution Delivery Plan

Status: Ready for implementation authorization

Specification: [../spec.md](../spec.md)

Decision ledger: [../decisions.yaml](../decisions.yaml)

## Outcome

Deliver one public, MIT-licensed, SemVer collection of 15 explicit-only
engineering Agent Skills. One hand-edited portable `skills/` tree feeds global
Codex and Claude Code installation and one generated native bundle for each
host. The project uses pinned `skills@1.5.20` lifecycle commands and does not
create an installer, lifecycle wrapper, project-local state, or consuming
project mutation.

This plan is planning-only. A numbered packet may be implemented only after
the user explicitly authorizes that packet.

## Proposed Architecture

| Unit | Ownership and responsibility | Dependency direction |
| --- | --- | --- |
| Repository governance | `README.md`, `SECURITY.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, issue/PR templates, and text/repository defaults establish the public project boundary before skill implementation. | Describes verified current state and contribution/security channels; never becomes a second workflow source. |
| `skills/<name>/` | The only hand-edited workflow source, including selectively routed references, assets, and deterministic scripts. | Reads repository guidance and callable host tools at invocation time; never depends on generated host trees. |
| `skills/planning-and-task-breakdown/references/engineering-principles.md` | The sole authoritative engineering manual. | Planning reads it locally; specification and implementation resolve it through the installed sibling bundle. |
| `catalog/skills.json` | Stable skill identities, descriptions, standalone/bundle-required classification, dependencies, and host policy inputs. | Generator and validators depend on the catalog; skill bodies do not depend on generator internals. |
| `catalog/release.json` | Reviewed upstream tool identity and the release version/status used by generated artifacts. | Packaging and release checks consume it; CI never invents a version. |
| `scripts/lib/*.mjs` | Dependency-free Node.js 22.20+ parsing, validation, hashing, tree snapshot, generation, and manifest logic. | Commands depend inward on these pure modules; modules do not invoke `npx` or mutate user profiles. |
| `scripts/generate.mjs` | Deterministically creates committed host metadata and the complete plugin bundle from `skills/` and `catalog/`. | Writes only declared repository outputs; `--check` compares without changing files. |
| `scripts/validate.mjs` | Fails closed on invalid catalog, skill, dependency, frontmatter, size, reference, manifest, or generated-diff state. | Reads canonical and generated artifacts; emits bounded diagnostics. |
| `plugins/engineer-agent-workflows/` | Generated complete native plugin payload containing both coexisting host manifests and all 15 generated release skill directories. | Derived from canonical sources; never edited directly. |
| `.agents/plugins/marketplace.json` | Generated Codex repository marketplace with one complete-bundle plugin entry. | Points to `plugins/engineer-agent-workflows`; version and policy derive from release/catalog data. |
| `.claude-plugin/marketplace.json` | Generated Claude repository marketplace with one complete-bundle plugin entry. | Points to the same generated plugin payload and immutable release identity. |
| `tests/` | Node unit/fixture tests plus isolated lifecycle, host, packaging, privacy, and acceptance harnesses. | May invoke pinned external clients only inside temporary homes and explicit manual gates; never touches real user state. |
| `.github/workflows/` | Least-privilege validation and release gates across supported operating systems. | Calls repository scripts and the pinned upstream CLI; release write permission is isolated to the authorized release job. |

Node built-ins are the default implementation substrate. A dependency may be
added only when a packet supplies evidence that built-ins cannot satisfy its
contract. The repository does not publish a runtime executable.

## Packet Index

| Packet | Outcome | Depends on | Requirements |
| --- | --- | --- | --- |
| [01](01_repository_foundation.md) | Establish public repository governance, the private Node maintenance project, complete catalog model, deterministic validation/generation primitives, fixtures, and legal/security scaffolding. | Approved specification and completed Git/GitHub bootstrap | OUT-001, SCOPE-001, SKILL-001, SKILL-003, SKILL-004, SKILL-005, ARCH-001, ARCH-002, TOOL-001, TOOL-003, SEC-003, REL-003 |
| [02](02_engineering_manual_and_planning.md) | Deliver the canonical engineering manual, generalized planning workflow, packet reference, digest verification, and symbol-level planning fixtures. | 01 | SKILL-002, SKILL-004, MAN-001, MAN-002, PLAN-001, TOK-002, ACC-008, ACC-009 |
| [03](03_specification_and_incremental.md) | Deliver the two bundle-required workflows and shared-manual failure contract while preserving Prompt MCP and review gates. | 02 | SKILL-004, SKILL-005, MAN-001, MAN-002, PLAN-001, MCP-001, ACC-008, ACC-009 |
| [04](04_code_quality_workflows.md) | Generalize review, simplification, doubt, performance, and security workflows with evidence-first fixtures. | 01 | SKILL-001, SKILL-002, SKILL-005, SEC-003, ACC-001, ACC-007 |
| [05](05_context_and_discovery_workflows.md) | Generalize context, ideation, and interview workflows with project discovery and Prompt MCP outcome handling. | 01 | SKILL-001, SKILL-002, SKILL-005, MCP-001, TOK-002, ACC-001, ACC-007 |
| [06](06_documentation_workflows.md) | Generalize documentation and project-documentation maintenance workflows and ADR/current-state distinctions. | 01 | SKILL-001, SKILL-002, SKILL-005, DOC-001, ACC-001, ACC-007 |
| [07](07_delivery_workflows.md) | Generalize pull-request and release workflows with discovered repository policy, signed-tag gates, and separate publishing authorization. | 01 | SKILL-001, SKILL-002, SKILL-005, SEC-002, SEC-003, REL-001, REL-002, ACC-001 |
| [08](08_native_plugin_packaging.md) | Generate the complete release catalog, coexistable explicit-only host metadata, Codex/Claude plugin manifests, and marketplaces. | 02–07 | HOST-001, HOST-002, ARCH-001, ARCH-002, INV-001, INV-002, TOK-001, TOK-002, DIST-001, DIST-006, DIST-007, ACC-001 |
| [09](09_global_lifecycle_isolation.md) | Prove pinned global add/list/update/remove behavior and byte-for-byte consuming-project isolation on Linux, macOS, and Windows. | 08 | HOST-003, HOST-004, TOOL-001, TOOL-002, TOOL-003, DIST-001–DIST-005, SEC-001, SEC-003, ACC-002, ACC-003 |
| [10](10_host_context_acceptance.md) | Verify explicit-only activation, host discovery budgets, progressive disclosure, plugin validation, and supported client floors. | 08, 09 | HOST-001–HOST-004, INV-001, INV-002, TOK-001, TOK-002, DIST-006, DIST-007, ACC-004, ACC-006, ACC-007 |
| [11](11_documentation_and_operations.md) | Publish complete, evidence-bound installation, operation, troubleshooting, privacy, and compatibility guidance. | 08–10 | DIST-002–DIST-007, MCP-001, SEC-001–SEC-003, REL-001, REL-003, DOC-001 |
| [12](12_ci_release_readiness.md) | Add reproducible CI, checksums, version agreement, and separately authorized signed-release gates. | 09–11 | OUT-001, HOST-003, HOST-004, SEC-002, SEC-003, REL-001–REL-003, ACC-005, ACC-006 |

## Dependency Sequence

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
                    └── 10 host/context acceptance (also depends on 09)
                              └── 11 documentation + operations
                                        └── 12 CI/release readiness
```

Packets 04–07 may be implemented in any order after packet 01. Packet 08
requires every workflow group so its generated catalog and native bundle are
complete.

## Requirement Coverage

| Requirement | Owning packet(s) |
| --- | --- |
| OUT-001 | 01, 12 |
| SCOPE-001 | 01 |
| SKILL-001 | 01, 04, 05, 06, 07 |
| SKILL-002 | 02, 04, 05, 06, 07 |
| SKILL-003 | 01 |
| SKILL-004 | 01, 02, 03 |
| SKILL-005 | 01, 03, 04, 05, 06, 07 |
| MAN-001 | 02, 03 |
| MAN-002 | 02, 03 |
| PLAN-001 | 02, 03 |
| HOST-001 | 08, 10 |
| HOST-002 | 08, 10 |
| HOST-003 | 09, 10, 12 |
| HOST-004 | 09, 10, 12 |
| ARCH-001 | 01, 08 |
| ARCH-002 | 01, 08 |
| ARCH-003 | 01 |
| INV-001 | 08, 10 |
| INV-002 | 08, 10 |
| TOK-001 | 08, 10 |
| TOK-002 | 02, 05, 08, 10 |
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
| MCP-001 | 03, 05, 11 |
| SEC-001 | 09, 11 |
| SEC-002 | 07, 11, 12 |
| SEC-003 | 01, 04, 07, 09, 11, 12 |
| REL-001 | 07, 11, 12 |
| REL-002 | 07, 12 |
| REL-003 | 01, 11, 12 |
| DOC-001 | 06, 11 |
| ACC-001 | 02–08 |
| ACC-002 | 09 |
| ACC-003 | 09 |
| ACC-004 | 10 |
| ACC-005 | 12 |
| ACC-006 | 10, 12 |
| ACC-007 | 02, 04–06, 08, 10 |
| ACC-008 | 02, 03 |
| ACC-009 | 02, 03 |

## Global Invariants

- `skills/<name>/` is authoritative; generated plugin skill copies are never
  edited directly.
- All 15 stable names are unique and explicit-only. Descriptions are at most
  240 Unicode code points and complete `SKILL.md` files are at most 4,096
  UTF-8 bytes.
- `planning-and-task-breakdown` is standalone. `incremental-implementation`
  and `spec-driven-development` require the matching complete bundle. The
  other 12 workflows are standalone.
- The engineering manual has one authored copy. Dependent skills validate the
  same release digest and stop before artifact creation on absence or mismatch.
- Normative lifecycle commands pin `skills@1.5.20`, require Node.js 22.20.0 or
  newer, set `DISABLE_TELEMETRY=1`, select global scope, name the target hosts,
  and select explicit skills.
- Tests that invoke hosts or the upstream CLI use isolated temporary profiles
  and snapshot the consuming project before and after. Real user profiles and
  project-local skill directories are out of scope.
- Git/GitHub bootstrap is separately authorized and precedes packet 01.
  Numbered packets do not publish, tag, install global skills, or mutate a real
  host profile without a separately stated authorization or manual gate.

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

Before packet 01 authorization:

1. Every requirement identifier in the approved specification appears in the
   coverage table and in at least one packet.
2. Every packet is self-contained and links from `todo.md`.
3. All relative links resolve.
4. `spec.md` remains `Status: Approved` and unchanged.
5. Local Git uses `main`, `origin` identifies
   `swimmwatch/engineer-agent-workflows`, and no commit, implementation,
   generated plugin, installed skill, or user-profile change exists.
