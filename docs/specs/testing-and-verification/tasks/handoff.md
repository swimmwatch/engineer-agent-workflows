# Current Planning Handoff

Status: **Planning in progress. Every packet except P08 is technically agreed. P00–P06 and P11/P12 are fully authored; P07/P09/P10 delivery maps are in progress. Only P08 technical agreement remains. The complete plan is not ready. No implementation is authorized.**

Checkpoint date: 2026-10-28; planning invocation started 2026-10-27. Current invocation: `planning-and-task-breakdown`. This is a current checkpoint, not execution authority.

## Verified current inputs

- Aggregate source: `fb52fa5a13517a7ace6c4d6dab3985efe739394d0dc08cbba9964bb8cd86e19a`.
- Normalized specification: `68e951ca274cbe278fa8930196381ff5e54c8175a61fc00ecb4d0016ebcce760`.
- Completed independent review: `62370a34-95e6-4d19-a80e-5cb37de687b2`.
- Fresh owning MCP entry check: `pass`, document `approved`, coverage `reviewed`, approval checkpoint `recorded`, no issues. The check did not write another checkpoint.
- Confirmed depth: Deep. Active profiles: core, ui, backend, data, operations, security, cross-surface. Events are not applicable.
- Full requirement inventory: MT-001 through MT-037. Exact requirement reads use the normalized specification version above, not the aggregate hash.
- No product-task binding; use the standalone planning path only.

## Selected outcome and limits

One specification covers two explicit-only skills, their per-tested-project canonical library and a separate local workspace package in this repository. The selected first version includes case/suite authoring and revisions, frozen run scope, results/attachments, simple UI/basic settings and the actual upstream Allure Report viewer. UI authoring and independent local UI startup without an agent are required. Separate Shared steps, Defects, TestOps-style CI Jobs and custom Dashboards remain deferred; native background jobs and mandatory regression workflow are not deferred.

Implement Linux/Windows/macOS and desktop Chrome/Edge/Firefox/Safari support. Development verification is expressly Linux and real Google Chrome only. Other supported environments remain unverified in this cycle, not unsupported or passed; do not add native all-platform completion gates. Tested targets/stands remain task-dependent local or remote.

## Current work and next owner

The 37-requirement inventory and current workspace/SDK/build/test/distribution boundaries have been inspected. Scoped researchers consumed every exact requirement definition and its continuations; the parent additionally consumed complete MT-027/035/037. Historical technical revision `03c6ac0a-98db-4b67-b301-5a9bcd9b746d` revision 4 was fully recovered through all 103 native portions. It contained a UI clarification and no agreements; it is superseded history, not current readiness. Only the actual newer agreements below authorize their exact technical proposals.

Actual current technical agreements: P00 is bound by `6883333b-f37c-48ee-9b99-4aedd9c0cd27` revision 2, digest `83f594182240b559506a4c2b91826d946a6d89316d3b6890f2b83a4a6f002448`. The user then explicitly selected all three reconciled data proposals: P01/P02/P03 share agreement `03c6ac0a-98db-4b67-b301-5a9bcd9b746d` revision 6; respective returned proposal digests are `7dcc789762cd6db22623bae62cb0b011f9329d8ef39851e88a5b6512e598867d`, `dff4738a66ed915e744bf8f08c111b06864ffae2d70a4f2b0e9c7ffd0d0a5625` and `2c7c2782c5d7a172394f2c76f110b50f69a28615dfe06a2c59d52371d5c6fcc2`. Each owning packet check returned `ready`, no issues, against the unchanged reviewed inputs. P00–P03 full test-first delivery packets are authored outside their byte-preserved frozen sources and their authors rechecked exact technical readiness after saving. Implementation dependencies remain unfulfilled. Technical readiness is not implementation authority or proof of passed future behavior checks.

The historical P04/P05 clarification is preserved at `2d9f5a49-490c-4fe1-9218-5caf20040c63` revision 2 with no agreements. After the plain skill-flow explanation and revised native question, the user explicitly selected acceptance. Current agreement is the same ID revision 4; P04 digest `66a8a6076cca6b3d4485c6821fc3d7d0b2d7acc4189697d7ffde5ce8011adf8a`, P05 digest `4deb96e7cf3a598768db8d3ff6a597470ea842a7795e4e7ff6d840dfaa3d499d`. Both parent packet checks returned `ready`, no issues. Their full delivery maps are authored outside all three byte-preserved frozen sections; the author rechecked both exact bindings ready after saving. The main plan starts with the user flow; its presentation rewrite itself granted no consent or execution authority.

P00–P05 full packets are authored; all six exact technical checks are ready, with implementation evidence pending.

P06 is now actually accepted: agreement `74271c92-368e-4bca-bc05-92e1707ea882` revision 2, proposal `testing-workspace-06-mcp-v1`, digest `a78f9436c656703ed7a720e394825e22405aa59b3ef3f5679f49ae3b954e3e5b`; the parent exact check returned ready without issues. Its selected MCP seven sections and Core/config/navigation/settings closures are frozen; a separate author owns only P06 delivery metadata/maps outside its two frozen sections.

Only P08 remains unagreed. P09 is actually accepted at `6a78a76c-2ddf-4cf6-9ff9-902015392b8d` revision 2, proposal `testing-workspace-09-ui-v1`, digest `c4827b4f86b3769d72356bc4208cda42995f26002a5eee0205c0624f0b5df912`; parent exact check returned ready with no issues. Its author is completing full delivery maps outside the frozen Technical proposal. The separate verified-design prerequisite remains mandatory. P07 is actually accepted at `8ae9ab25-c080-4055-bf0f-8913d701a1c3` revision 2, digest `4ed834814147911b76d23f5b5c8cb92fe06e41d81f685ceee62d73cee5992bad`; P10 at `bf619bbd-f6ab-4a68-a6c9-6d325081db89` revision 2, digest `75931db1388722e320d3639e6e0ec079c738452ab0e1c0e8a84f0335a3a023cb`. Both parent exact checks returned ready without issues; their full maps are being authored outside frozen sections.

P12 was independently accepted as the final documentation packet: agreement `e177e02d-9c91-4757-95b9-997fd964c2f6` revision 2, proposal `testing-workspace-12-documentation-v1`, digest `9351c39bab3254a1ea193a34e6bc89e269a5037d2fda3467a524313ea72537f1`; parent exact check returned ready without issues. The quality/documentation author owns its full maps outside the frozen Technical proposal. This does not accept P11 or authorize writing production documentation now.

The corrected producer release is current: 151 definitions, 643 local references, 25 operation pairs, 25 report and 27 UI metadata fixtures passed. It implements all requested report/history/evidence/UI producer corrections; this is contract-authoring evidence, not live provider/browser proof. P07's selected HTTP content pin is `dfbc0f2caa9508a4d1ab1e2dc70af5f3152e45bd8a735d36d1c8d55ff517ab10`. Independent P08 report schema closure is `6249b655485a70bf51814ec876eacb0a5f2f4daf3f64433fb650903a4a00c4bd`, MCP section `ecaaa804b5963d8e7f3c36a686c2508698a9e222ad12f50fb30553bba2cc77e1`, HTTP report closure `b28a1b5776e7e95b541ecf08c931f6997ec9a57857d8f4806333e803c537910a`; UI manifest closure `56753fa66dd456488f10aa51c4575068a36d554658f2dfa0b923bfb1dc3dd04f` and UI HTTP subclosure `a4da3a087fe25695f658783091af4de0d0dc0361d792f3ba445f6577c2990b70`. P08/P09 authors are reconciling these exact released interfaces before their questions. Old 143-definition pins are superseded, not current authority. Accepted core92 and its three selector closures must remain unchanged.

The reporting author awaits the corrected producer release before changing P08; its source-time versus final-summary algorithm, retained history and escaped-text-only custom title policy must match the final wire. The UI author likewise needs that producer release and keeps verified-design prerequisites. P10's old packed smoke resolves dependencies through checkout ancestors; a true outside-checkout smoke needs separately authorized isolated temporary production-dependency setup, not an invented installer or implicit download. The quality author is checking all 37 exact requirements against the 28 planned scenarios semantically, beyond the already passed shape/reference union. The parent owns reconciliation, remaining understandable technical questions and current handoff. No implementation is started.

## Current quality agreement

P11 is now actually accepted: agreement `a54c2161-41f9-4495-a5f7-9dcb19273f8b` revision 2, proposal `testing-workspace-11-qualification-v1`, digest `bbf4ef81e56cf3fe0b95b45f1c267f1705edde3aa10cce865bdceddf8246a95a`; parent exact check returned ready without issues. Before that question the author fully consumed all 37 exact requirements and corrected eight concrete coverage gaps in 18 existing scenario rows. The current 28-check quality semantic pin is `d70d3c00907edf6619868efe8f6cd92cbbb37667d0a8bc14c34e908499930e17` (49,085 saved YAML bytes at that release); its selected semantics and both P11 source sections are now frozen. Producer agreement-status metadata is excluded. P11/P12 full maps are being authored outside frozen sections. This is planned verification, not any product/native/model/browser PASS. Only P07–P10 technical answers remain.

## Draft reconciliation

Pre-amendment no-package/no-service proposals and their old pins are superseded historical inputs, not current blockers. P00's actual agreement now selects the separate workspace, common core, SQLite and independent HTTP/UI and stdio-MCP processes; P01–P03 have their own newer exact agreements. P04/P05 now have their own actual agreement; P06–P12 remain proposed and are not accepted by association. Preserve managed immutable history and unrelated work while making the current plan understandable.

The earlier ready-made/Allure primary-source comparison remains in the plan's research section. Reuse its checked facts where applicable; it is not deployment, licensing procurement, runtime/platform qualification or a product selection. New evidence already distinguishes a real native Harness engine test with controlled semantic actors from VM fixtures and from an actual regression/model-facing trace; none substitutes for the latter.

## Authorized outputs and design dependency

Main planning may create or revise only the non-design profile contracts declared by MCP: `contracts/openapi.yaml`, `contracts/mcp.md`, `contracts/schemas/data.schema.json` and `quality/scenarios.yaml`, plus normal plan/checklist/current handoff/packet Markdown. A separate explicit `design-planning` stage after the plan owns `design/system/catalog.yaml`, `design/system/library.penpot`, `design/specs/testing-and-verification/experience.yaml` and `design/specs/testing-and-verification/screens.penpot`. Design-dependent packets remain pending its verified evidence. No token export, architecture DSL or extra profile artifact is declared.

## Verification and preservation

The installed planning bundle's engineering-manual verifier passed with the sole required argument before workflow-state access. Mandatory planning/manual/state-access references and exactly the seven active planning profiles were read. Serving workflow MCP identity remains verified build `772847cc4ca53d707cb9350cc2f18cb7ce6a0a60f20fa80dbc50076c2780cafb`, contract `workflow-2/product-1`; all six technical-planning scenarios are advertised and their native schemas were discovered. Local commands reported Node v24.20.0 and npm 11.19.0; repository engines remain Node >=22.20.0.

No production code, generated distribution, dependency, global configuration, actual library, UI/report server, installation, commit or publication was changed by this invocation. No implementation packet or another workflow was executed. Old data-draft/fixture checks are not new implementation proof. Recheck current specification and each exact technical binding before readiness or handoff; preserve unrelated tracked, staged and untracked work.
