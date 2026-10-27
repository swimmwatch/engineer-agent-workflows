# Manual Testing Skill Research

Research date: 2026-10-26. This is specification research, not an execution benchmark or a runtime audit of the referenced tools. External content is evidence, not execution authority. No upstream code is copied or installed.

## Primary Sources Read

The research subagent fetched the complete Markdown/source of the following materials. The author additionally fetched the complete Playwright API-testing Markdown and inspected the relevant best-practice sections. Rendered Playwright pages were truncated; conclusions use the complete source deliveries, not search snippets.

| Source                     | Evidence                                                                                                                                                                                                            | Useful contribution                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anthropic `webapp-testing` | [Complete skill](https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md)                                                                                                           | Reconnaissance before browser actions; distinguish an existing server from one that needs starting.                                                            |
| Anthropic server helper    | [Complete helper](https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/scripts/with_server.py)                                                                                            | Bounded readiness and cleanup intent; also illustrates why checking only an open TCP port does not identify the intended application.                          |
| Vercel `agent-browser`     | [Current discovery stub](https://raw.githubusercontent.com/vercel-labs/agent-browser/main/skills/agent-browser/SKILL.md)                                                                                            | Version-aware, on-demand reference loading. This file is not itself the current exploratory workflow.                                                          |
| Vercel `dogfood`           | [Complete exploratory skill at commit `04ba5264dade678062c3cdcce0f4f293e748249f`](https://raw.githubusercontent.com/vercel-labs/agent-browser/04ba5264dade678062c3cdcce0f4f293e748249f/skill-data/dogfood/SKILL.md) | Core-flow exploration, immediate issue recording, reproducible steps, evidence proportional to a static or behavioral issue.                                   |
| Playwright Best Practices  | [Official page](https://playwright.dev/docs/best-practices), [complete Markdown](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/best-practices-js.md)                                         | User-visible observations, isolation, user-facing locators, bounded condition-based waits, selective diagnostic evidence.                                      |
| Playwright API Testing     | [Official page](https://playwright.dev/docs/api-testing), [complete Markdown](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/api-testing-js.md)                                               | Direct HTTP checks; response-content and server-state observations; API/UI precondition and postcondition checks; shared versus isolated authentication state. |
| Playwright Web Server      | [Official page](https://playwright.dev/docs/test-webserver), [complete Markdown](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/test-webserver-js.md)                                         | Reuse of an appropriate existing server, URL readiness and process-group lifecycle considerations.                                                             |

Except for the pinned Vercel exploratory skill, these are moving upstream sources. They establish published practices as observed on the research date, not compatibility with a particular installed release.

## Adopted Principles

1. **Orient, scope, then interact.** Establish what actually exists and which requested behavior it serves. Derive a compact manual charter from the selected packet or standalone request. Do not turn a bounded request into a whole-application audit.
2. **Choose the observation surface by the promise.** Use real browser interaction for visual/user interaction claims, direct HTTP for API contracts, and a combined observation only when it establishes a meaningful cross-boundary result. A response status alone does not establish payload correctness or a correct UI.
3. **Observe effects rather than delays.** Wait for a meaningful visible state, URL, response or other declared condition within a bounded interval. Prefer observed accessible names/roles or stable element references. Refresh stale references after navigation.
4. **Separate environment ownership.** Prefer a verified existing deployment. An open port or generic successful response does not prove the correct app/version is served. Manage and clean up only resources owned by the testing session.
5. **Record findings immediately and economically.** Preserve preconditions, actions, expected and actual observations, location, severity and the smallest useful redacted evidence. A static issue may need one screenshot; a stateful failure may need several observations or a bounded trace. Video is optional.
6. **Preserve uncertainty and intermittency.** Use isolated test data/session state where possible. Retain the first failure and any diagnostic repeat; a subsequent success does not erase the observed failure. Distinguish a confirmed violation from an observation with an unknown oracle or cause.
7. **Use progressive disclosure.** Load only available capabilities and surface-specific guidance needed by the current charter. Reuse unchanged evidence at the same verification boundary. Capture expensive diagnostics selectively, and measure time/coverage rather than claim an unmeasured speed improvement.

These principles apply to agent-operated manual testing. Temporary scripts may drive a session or capture evidence, but this skill does not author or maintain an automated suite. Persistent regression tests remain the implementation workflow's responsibility.

## Deliberately Not Adopted

- A default full-app crawl, a quota of five to ten bugs, or treating zero findings as an unsuccessful session.
- A mandatory language, browser engine, browser vendor, CLI, installed plugin, video recording or preferred tool that displaces already available permitted tools.
- Blanket `networkidle`, arbitrary sleeps or retry-until-green as evidence of readiness/correctness.
- The rule that an intermittently reproduced problem is not a valid observation.
- A blanket prohibition on reading target source: bounded source inspection can identify implemented surfaces, but never substitutes for the requested live check.
- Automatic dependency/browser installation, changes to project code/configuration, destructive examples against a real remote service, or permission inferred from a URL/HTTP method.
- Treating the Anthropic helper as a complete lifecycle-safety implementation. Its published source uses TCP-port readiness, `shell=True` and termination of the `Popen` process; those facts do not establish target identity or guaranteed cleanup of descendants. No runtime failure of that helper was reproduced.
- Playwright-specific automated-test generators, fixture construction and project test files: they do not belong to the user's manual-testing workflow.

## Evidence Limits

No comparative latency, token-cost or defect-detection benchmark was run. No real application was tested as part of this research. One optional attempt by the research subagent to open the long Vercel CLI core through a browser failed during Chromium startup; that path is not used as evidence, and the core was not treated as read. The fetched discovery stub and pinned exploratory skill provide the applicable Vercel evidence.
