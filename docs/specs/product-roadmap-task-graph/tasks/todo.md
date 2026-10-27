# Product Roadmap Task Graph Checklist

Planning is complete after its recorded checks. All execution entries start incomplete; technical agreement does not authorize implementation.

## Execution

- [ ] [P01 — graph kernel](01_graph-kernel.md) — next, after separate explicit invocation.
- [ ] [P02 — graph store](02_graph-store.md) — requires P01.
- [ ] [P03 — github reader](03_github-reader.md) — requires P01, P02.
- [ ] [P04 — sync coordinator](04_sync-coordinator.md) — requires P01, P02, P03.
- [ ] [P05 — mcp and spec signal](05_mcp-and-spec-signal.md) — requires P02, P03, P04.
- [ ] [P06 — http viewer](06_http-viewer.md) — requires P01, P02, P04, P05.
- [ ] [P07 — browser viewer](07_browser-viewer.md) — requires P01, P05, P06.
- [ ] [P08 — workflow packaging](08_workflow-packaging.md) — requires P05, P06, P07.
- [ ] [P09 — Linux and private GitHub acceptance](09_linux-acceptance.md) — requires P01, P02, P03, P04, P05, P06, P07, P08; create one private test repository/Project and pass Q-GITHUB-LIVE, retaining local fault/capacity checks.
- [ ] [P10 — developer documentation](10_developer-documentation.md) — requires P09.

Only mark one entry complete after its required RED/GREEN/PROVE, local checks, fresh specification/agreement checks and current handoff update. Do not use optional review or commit as a next-packet gate.
