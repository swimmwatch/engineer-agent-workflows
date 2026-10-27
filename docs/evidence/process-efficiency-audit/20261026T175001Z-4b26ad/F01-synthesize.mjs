// Audit-only evidence assembly. Does not import or execute application code.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const dir = 'docs/evidence/process-efficiency-audit/20261026T175001Z-4b26ad';
const started = new Date().toISOString();
const readJson = (name) => JSON.parse(fs.readFileSync(`${dir}/${name}`, 'utf8'));
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const inputs = readJson('inputs.json');
const baseline = readJson('baseline.json');
const distribution = readJson('distribution-baseline.json');
const reports = inputs.tasks.map((task) => readJson(`${task.id}.json`));
const verifiers = ['V01', 'V02', 'V03'].map((id) => readJson(`${id}.json`));
const allReports = [...reports, ...verifiers];
const beforeReportHashes = Object.fromEntries(allReports.map((report) => [report.task_id, hash(fs.readFileSync(`${dir}/${report.task_id}.json`))]));
const git = (...args) => execFileSync('rtk', ['proxy', 'git', ...args], { encoding: 'utf8' });
const initialHead = git('rev-parse', 'HEAD').trim();
const initialStatus = git('status', '--porcelain=v1');
const initialIndex = git('ls-files', '--stage', '-z');
const runPrefix = `${dir}/`;
const targets = ['workflow-results.json', 'F01-source-drift.json', 'audit.json', 'audit.md', 'validation.json', 'F01.json'];
for (const name of targets) {
  if (fs.existsSync(`${dir}/${name}`)) throw new Error(`Refusing to overwrite pre-existing audit output: ${name}`);
}
function save(name, value) {
  const target = `${dir}/${name}`;
  const resolved = path.resolve(target);
  if (path.dirname(resolved) !== path.resolve(dir) || !targets.includes(name)) throw new Error('Output allowlist violation');
  const text = typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(target, text, { flag: 'wx' });
}

// Exact compact return metadata supplied by the caller, not reconstructed execution telemetry.
const primaryMetadata = {
  P01: {
    titles: ['Use existing exact-source batching in specification and planning roles', 'Check design eligibility before disclosing quality manuals on the no-op path'],
    evidence: [['shared/references/product-workflow.md:28-51','shared/references/implementation-context.md:85-91','packages/engineer-agent-workflow-mcp/src/product/context.ts:958-1006'],['skills/design-planning/SKILL.md:13-31','shared/scripts/verify-engineering-manual.mjs:267-345']],
    limitations: ['No workflows, skills, tests, builds or generators executed; performance impact remains unmeasured.','Generated fidelity check was bounded: 145 matching reference comparisons and three entry samples.','Declared actual model: gpt-6.1-sol; provider route not independently observable.'], transient: ''
  },
  P02: {
    titles: ['Make unchanged confirmed-scope resume explicit before proposing scope again','Route task-consumer and retirement detail only to applicable roles','Expose the existing exact-source batch reader in product interviews'],
    evidence: [['skills/product-definition/SKILL.md:28-35','shared/references/product-workflow.md:128-149','packages/engineer-agent-workflow-mcp/src/product/interview.ts:997-1031'],['skills/technical-design/SKILL.md:14-16','shared/references/product-workflow.md:20-124','shared/references/product-workflow.md:153-173'],['shared/references/product-workflow.md:128-149','shared/references/implementation-context.md:85-91','packages/engineer-agent-workflow-mcp/src/product/context.ts:958-1006']],
    limitations: ['No workflow execution, tests, builds, generation or live managed-YAML access; performance effects remain unmeasured.','Deep implementation belongs to P07/P09; the cold-context confirmed-scope reader needs P09 verification before any contract extension.','Generated fidelity sampled: 48 resource copies matched; three host Technical Design entries inspected. Full packaging remains P11 scope.','Actual model identified as gpt-6.1-sol; provider corroborated by orchestration metadata, not independent per-worker telemetry.'], transient: ''
  },
  P03: {
    titles: ['Source-bound evidence handoffs for scoped quality/security follow-ups','Bind adversarial review and reconciliation to matching artifact/contract identities'],
    evidence: [['skills/code-review-and-quality/SKILL.md:16-38','skills/security-and-hardening/SKILL.md:17-40','shared/references/test-discipline.md:136-147'],['skills/doubt-driven-development/SKILL.md:26-44','tests/code-quality-skills.test.mjs:147-172','tests/fixtures/code-quality/doubt-driven-development/scenarios.json:75-97']],
    limitations: ['No audited workflow or tests executed; process savings remain unmeasured.','Actual model observable as gpt-6.1-sol; transport provider not independently observable.','CodeGraph MCP discovery failed safely; permitted CLI and current file inspection supplied evidence.','Nine host documents and three metadata copies matched; seven no-finding checks recorded.'], transient: ''
  },
  P04: { titles: [], evidence: [], limitations: ['Audited skill invocation was unavailable; no audited skill was run. Source inspection covered the canonical skills and relevant host counterparts.','No execution or comparable usage data was available, so savings remain unmeasured.','Generated host counterparts were semantically spot-compared; no generator validation or MCP contract audit was performed.'], transient: 'Initial structured_output call was rejected because transient_evidence was omitted; corrected submission succeeded.' },
  P05: { titles: [], evidence: [], limitations: ['No audited skill was invoked. Skill tool invocation returned unavailable for code-simplification; model tooling availability is not treated as a skill defect.','Generated host copies and measured workload/usage data were not inspected; no performance or output savings are claimed.','The required Luna route is recorded as the assigned openai-codex/gpt-6-luna route; a separate runtime route attestation was unavailable.'], transient: '' },
  P06: { titles: ['Extend adaptive byte-budgeted pagination to long correction evidence','Bind enhanced-final body cache to observed result state rather than retained caller context'], evidence: [['packages/engineer-agent-workflow-mcp/src/review-followup.ts:269-300','packages/engineer-agent-workflow-mcp/src/requirements.ts:16,80-119','packages/engineer-agent-workflow-mcp/src/reviews.ts:249-267'],['packages/engineer-agent-workflow-mcp/src/review-model.ts:11-18','packages/engineer-agent-workflow-mcp/src/review-followup.ts:179-236','packages/engineer-agent-workflow-mcp/src/state.ts:162-181','packages/engineer-agent-workflow-mcp/test/review-full-consistency.test.mjs:170-195']], limitations: ['Behavioral tests and benchmarks were not executed; recommendations are source-confirmed, not measured.','Serving MCP deployment was not verified; conclusions apply to current checkout.','Cache scenario requires a retained observer context and warm cache; no approval bypass is claimed.','Model identified as gpt-6.1-sol; provider configured as openai-codex but not independently observed.'], transient: '' },
  P07: { titles: ['Keep pending-only batch advancement linear across acknowledged suffixes','Derive recheck membership and batch status once per unchanged state','Reuse the existing bounded object-read scope throughout single-item reads'], evidence: [['packages/engineer-agent-workflow-mcp/src/product/review.ts:2515-2546','packages/engineer-agent-workflow-mcp/test/product-review-efficiency.test.mjs:44-85'],['packages/engineer-agent-workflow-mcp/src/product/review.ts:1053-1077,1653-1656,2525-2536'],['packages/engineer-agent-workflow-mcp/src/product/review.ts:888-920,939-975,2431-2471,2497-2499','packages/engineer-agent-workflow-mcp/src/product/storage.ts:25-53,425-438']], limitations: ['Source-and-test inspection only; tests, benchmarks, builds and generation were not run.','No performance or token savings measured.','Active model identified as gpt-6.1-sol; configured provider openai-codex, without independent request-route attestation.','Storage, transaction and session internals received interface-only inspection; full coverage remains with their assigned auditors.'], transient: '' },
  P08: { titles: ['Separate ledger data validation from synthetic YAML round trips','Retain authenticated generation hints for completed replay'], evidence: [['packages/engineer-agent-workflow-mcp/src/state.ts:131-168,416-420','packages/engineer-agent-workflow-mcp/src/ledger.ts:67-100'],['packages/engineer-agent-workflow-mcp/src/product/operations.ts:96-110,978-1012']], limitations: ['Source-and-test inspection only; no tests, builds or audited workflows executed.','Savings unmeasured; existing reuse, locking, freshness and recovery guarantees documented.','Provider route unavailable; observable model gpt-6.1-sol recorded.','Python validator unavailable; independent Node.js static validation passed.'], transient: '' },
  P09: { titles: ['Reuse validated document snapshots in Definition and Technical Design preflight','Document existing owner-authorized active-queue reconciliation','Index outgoing relations within task-context selection'], evidence: [['packages/engineer-agent-workflow-mcp/src/product/definition.ts:393-455','packages/engineer-agent-workflow-mcp/src/product/technical.ts:373-443','packages/engineer-agent-workflow-mcp/src/product/roadmap.ts:405-451'],['shared/references/product-workflow.md:72-81','packages/engineer-agent-workflow-mcp/src/product/tasks.ts:1262-1315','packages/engineer-agent-workflow-mcp/test/product-task-pins.test.mjs:1047-1118'],['packages/engineer-agent-workflow-mcp/src/product/context.ts:442-473','packages/engineer-agent-workflow-mcp/src/product/context.ts:679-709']], limitations: ['Source/test inspection only; no tests, benchmarks or audited workflows executed. Performance effects remain unmeasured.','Deep review and storage internals remain P07/P08 ownership.','One non-transient CodeGraph invocation error was not retried; native reads supplied the missing evidence.','Final report validation passed; all 30 inspected non-run files matched baseline hashes.'], transient: '' },
  P10: { titles: ['Reuse parsed requirements within guarded multi-reference operations','Validate token references against one scenario-local token-source load','Remove irrelevant variant continuations from description-only reads','Avoid full Unicode arrays for bounded decision portions and previews'], evidence: [['packages/engineer-agent-workflow-mcp/src/decisions.ts:136-151','packages/engineer-agent-workflow-mcp/src/requirements.ts:46-77','packages/engineer-agent-workflow-mcp/src/experience.ts:17-28'],['packages/engineer-agent-workflow-mcp/src/checks.ts:20-25','packages/engineer-agent-workflow-mcp/src/design.ts:77-91','packages/engineer-agent-workflow-mcp/src/catalog.ts:46-52'],['packages/engineer-agent-workflow-mcp/src/catalog.ts:64-70'],['packages/engineer-agent-workflow-mcp/src/service.ts:162-208','packages/engineer-agent-workflow-mcp/src/service.ts:313-325','packages/engineer-agent-workflow-mcp/test/source-service.test.mjs:115-155']], limitations: ['Source/test inspection only; no runtime tests or performance measurements.','No live managed YAML or Penpot access; no audited skill invocation.','Provider transport was not independently observable; runtime-declared model is gpt-6.1-sol.','Generated distributions and installed runtime fidelity were outside this assignment.'], transient: '' },
  P11: { titles: [], evidence: [], limitations: ['Source-and-test inspection only; no generation/check/build/test/package/install/publish action was run.','Full rendered-byte fidelity for every generated artifact was not proved; bounded static comparison found expected host-template variants.','No workflow-managed YAML or live scenario state was accessed; no runtime or package-size benchmark was measured.'], transient: 'Initial read-only comparison via `python` alias exited 127 because alias was unavailable; retried with `python3` successfully. No repository state was changed.' },
  P12: { titles: ['Development snapshots repeat strict distribution validation','Public tests repeat identical restart-enabled qualification','File concurrency limits do not bound nested subprocess resources','Benchmark outputs lack observed executable identity'], evidence: [['scripts/build-dev.mjs:228-235','scripts/generate.mjs:39-79','scripts/validate.mjs:159-198'],['packages/engineer-agent-workflow-mcp/test/product-e2e.test.mjs:148-195','scripts/qualify-product-workflows.mjs:211-223'],['scripts/run-tests.mjs:47-54','packages/engineer-agent-workflow-mcp/test/support/product-e2e-harness.mjs:764-773','packages/engineer-agent-workflow-mcp/test/packed-artifact.test.mjs:239-328'],['scripts/benchmark-product-review.mjs:60-66','scripts/benchmark-roadmap-retirement.mjs:200-219','docs/local-development.md:73-84']], limitations: ['Экономия времени и конкуренция ресурсов не измерялись.','Выполнены только четыре существующих теста чистого разбора аргументов: все прошли. Сборка, генерация, установка и полные тесты не запускались.','Проверка структуры отчёта пройдена; существующие изменения сохранены. Независимые метаданные провайдера недоступны.'], transient: 'Подтверждённых временных сбоев нет.' },
  P13: { titles: [], evidence: [], limitations: ['Reviewed current documentation and retained evidence only; no benchmarks were rerun, and no audited skills, builds, generators, installations, or tests were executed.','Coverage is limited to assigned workflow-documentation and measurement-evidence components.'], transient: '' },
  P14: { titles: ['Use exact-envelope budgeting when packing product review batches','Bind lazy packaged-schema compilation to the captured startup contract'], evidence: [['packages/engineer-agent-workflow-mcp/src/product/review.ts:2521-2546','packages/engineer-agent-workflow-mcp/src/response-budget.ts:3-8'],['packages/engineer-agent-workflow-mcp/src/runtime-info.ts:64-92','packages/engineer-agent-workflow-mcp/src/product/schemas.ts:71-107','packages/engineer-agent-workflow-mcp/src/state.ts:122-139']], limitations: ['Source/test inspection only; no tests, builds or benchmarks executed.','Live serving identity differs from the local dist stamp; findings are not live reproductions.','Provider route was not independently observable; runtime instructions identify gpt-6.1-sol.'], transient: 'No confirmed transient failure. Final saved report validation passed: two findings and 39 inspected paths.' }
};
const verifierLimitations = [
 ['No audited skills, scenarios, tests, benchmarks, builds or generation executed; performance effects remain unmeasured.','P02-F01 cold-context scope retrieval and P02-F03 generalized after-draft batching require targeted contract adjudication; narrowed recommendations exclude those extensions.','Ready-source batch reader rejects candidate contexts; product-stage adoption is constrained to valid ready-context phases.','Validated 62 finding evidence citations and 45 source hashes; no scoped baseline drift observed.','Observed model: gpt-6.1-sol. Provider configured as openai-codex, not independently attested.'],
 ['Source/test inspection only; no runtime tests, benchmarks or prohibited actions executed.','P10-F01 requires targeted adjudication before eliminating intermediate dependency observations; parser-only reuse is accepted.','P08-02 remains benchmark-first and requires strict-reader compatibility design.','P14 reproduction scenarios remain unexecuted; no measured savings or installed-runtime incident claimed.','All 50 inspected non-run files matched baseline hashes; report validation passed.','Observable model gpt-6.1-sol; configured provider openai-codex was not independently observed.'],
 ['Source and test-definition inspection only; no audited skills, scenarios, tests, builds, generation, packaging or installation were executed.','P12-F3 remains an unmeasured benchmark hypothesis; no savings or harmful contention is established.','Generated portability and historical evidence were sampled, not exhaustively revalidated; private raw captures were not verified.','Actual observable model is gpt-6.1-sol; provider and reasoning effort were not independently exposed.','Global baseline reconciliation remains synthesis-owned; all 37 recorded source hashes matched during report validation.']
];
const verdictsOf = (report) => report.finding_verdicts ?? report.findings;
const verdictId = (entry) => entry.finding_id ?? entry.id;
const workflowResults = {
 primary: inputs.tasks.map((task, index) => {
   const report = reports[index];
   const metadata = primaryMetadata[task.id];
   const findings = report.findings.map((finding, i) => ({ id: finding.id, title: metadata.titles[i], evidence: metadata.evidence[i], classification: finding.classification, needs_clarification: false }));
   const coverage = report.coverage ?? report.actual_coverage;
   const normalizedCoverage = task.id === 'P11' ? task.coverage : coverage;
   return { task_id: task.id, assigned_coverage: task.coverage, aspects: task.aspects.join(' '), primary: { task_id: task.id, status: report.status, coverage: normalizedCoverage, finding_ids: findings.map((finding) => finding.id), findings, report_path: `${dir}/${task.id}.json`, limitations: metadata.limitations, transient_evidence: metadata.transient }, repair: null, missing_initial_coverage: [], raw_result_valid: true };
 }),
 verification: verifiers.map((report, index) => {
   const summary = report.summary ?? report;
   const verdicts = verdictsOf(report);
   const verification = { task_id: report.task_id, status: report.status, report_path: `${dir}/${report.task_id}.json`, coverage: report.actual_coverage, reviewed_finding_ids: summary.reviewed_finding_ids ?? report.reviewed_finding_ids ?? verdicts.map(verdictId), accepted_ids: summary.accepted_ids, narrowed_ids: summary.narrowed_ids, rejected_ids: summary.rejected_ids, disputed_ids: summary.disputed_ids, no_finding_samples: report.no_finding_samples.map((sample) => sample.id), limitations: verifierLimitations[index] };
   return { group: report.task_id, task_ids: inputs.verification_groups[index].tasks, verification, adjudication: null };
 }),
 deterministic_checks: { unique_task_ids: true, required_skill_count: 17, primary_return_count: 14, repair_return_count: 0, verifier_return_count: 3, missing_primary_tasks: [], missing_verifiers: [] },
 starts_before_synthesis: 17, expected_total_starts: 18, scheduled_peak: 8,
 scheduled_peak_note: 'Maximum simultaneously pending agent() calls, not independently observed provider request concurrency.',
 events: [], limits_file: `${dir}/inputs.json`, baseline_file: `${dir}/baseline.json`
};
const eventOrder = [
 ['P01','requested'],['P02','requested'],['P03','requested'],['P04','requested'],['P05','requested'],['P06','requested'],['P07','requested'],['P08','requested'],['P04','returned'],['P09','requested'],['P05','returned'],['P10','requested'],['P06','returned'],['P11','requested'],['P07','returned'],['P12','requested'],['P08','returned'],['P13','requested'],['P03','returned'],['P14','requested'],['P01','returned'],['P13','returned'],['P11','returned'],['P10','returned'],['P09','returned'],['P02','returned'],['P12','returned'],['P14','returned'],['V01','requested'],['V02','requested'],['V03','requested'],['V03','returned'],['V01','returned'],['V02','returned']
];
workflowResults.events = eventOrder.map(([id, state]) => ({ seq: id.startsWith('P') ? Number(id.slice(1)) : 14 + Number(id.slice(1)), id, model: inputs.tasks.find((task) => task.id === id)?.model ?? 'sol', state, ...(state === 'returned' ? { status: 'complete' } : {}) }));
// Preserve the caller-supplied runtime record verbatim in value, including original-language P12 evidence.
// Escape non-ASCII in this evidence artifact; all authored synthesis prose remains English.
save('workflow-results.json', `${JSON.stringify(workflowResults, null, 2).replace(/[^\x00-\x7F]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)}\n`);

const checks = [];
function check(name, passed, details = null, mandatory = true) { checks.push({ name, passed, mandatory, details }); }
const primaryFindings = reports.flatMap((report) => report.findings.map((finding) => ({ ...finding, task_id: report.task_id })));
const verified = verifiers.flatMap((report) => verdictsOf(report).map((entry) => ({ ...entry, verifier_id: report.task_id, finding_id: verdictId(entry) })));
const ids = primaryFindings.map((finding) => finding.id);
check('Required report files exist and parse', allReports.length === 17 && allReports.every((report) => fs.statSync(`${dir}/${report.task_id}.json`).isFile()), { primary: reports.length, verification: verifiers.length, repair: 0, adjudication: 0 });
check('Unique primary task and finding identities', new Set(reports.map((report) => report.task_id)).size === 14 && new Set(ids).size === ids.length, ids);
check('Verifier references are complete and unique', new Set(verified.map((entry) => entry.finding_id)).size === ids.length && verified.length === ids.length && verified.every((entry) => ids.includes(entry.finding_id)), { primary_findings: ids.length, verified_references: verified.length });
const normalizedCoverage = (report) => (report.actual_coverage ?? report.coverage ?? []).map((item) => item.match(/^(skill|component|shared):[^ (]+/)?.[0] ?? item);
const coverageRows = inputs.tasks.flatMap((task, index) => task.coverage.map((component) => ({ component, primary: task.id, verifier: inputs.verification_groups.find((group) => group.tasks.includes(task.id)).id, aspects: task.aspects, actual_evidence_present: normalizedCoverage(reports[index]).includes(component), evidence_report: `${dir}/${task.id}.json`, no_finding_or_finding_evidence: reports[index].findings.length > 0 || (reports[index].no_finding_checks ?? reports[index].no_finding_evidence ?? []).length > 0 })));
const currentSkills = ['code-review-and-quality','code-simplification','context-engineering','context-scouting','design-planning','documentation-and-adrs','doubt-driven-development','idea-refine','incremental-implementation','interview-me','performance-optimization','planning-and-task-breakdown','product-definition','product-roadmap','security-and-hardening','spec-driven-development','technical-design'];
check('All current 17 skills match saved inventory and existing canonical entries', currentSkills.length === 17 && JSON.stringify(currentSkills) === JSON.stringify(inputs.skills) && currentSkills.every((name) => fs.statSync(`skills/${name}/SKILL.md`).isFile()) && currentSkills.every((name) => coverageRows.some((row) => row.component === `skill:${name}` && row.actual_evidence_present)), { inventory_basis: 'Current catalog/skills.json read and 17 canonical paths returned by glob; no skill invocation.', skills: currentSkills });
check('All significant assigned components have saved evidence', coverageRows.every((row) => row.actual_evidence_present && row.no_finding_or_finding_evidence), { components: coverageRows.filter((row) => row.component.startsWith('component:')).length, coverage_rows: coverageRows.length });
const aspectNames = { A: 'Canonical skills, proportional context and progressive disclosure', B: 'Orchestration, ownership, consent, context and repeated work', C: 'Batching, parsing, reuse and API adoption', D: 'Storage, budgets, isolation, concurrency, replay and recovery', E: 'Independent review, inheritance, freshness and substantive final checks', F: 'Canonical ownership, generated host fidelity and packaging', G: 'Test runner, CI, build and qualification duplication', H: 'Measurement, evidence attribution, priorities and limitations' };
const aspects = Object.entries(aspectNames).map(([id, title]) => ({ id, title, primary_tasks: inputs.tasks.filter((task) => task.aspects.includes(id)).map((task) => task.id), basis: 'Saved primary evidence and the corresponding verifier verdicts/no-finding samples; source/test inspection, not behavioral execution.' }));
check('Mandatory aspects A-H are covered', aspects.length === 8 && aspects.every((aspect) => aspect.primary_tasks.length > 0), aspects);
check('Required normalized report fields are present', allReports.every((report) => report.task_id && report.route && report.status && Array.isArray(report.inspected_paths) && (report.actual_coverage || report.coverage) && Array.isArray(report.limitations) && (report.no_finding_checks || report.no_finding_evidence || report.no_finding_samples) && (report.findings || report.finding_verdicts)), { aliases_supported: ['actual_coverage|coverage','no_finding_checks|no_finding_evidence|no_finding_samples','findings|finding_verdicts'], note: 'P11 annotates coverage strings; the machine normalization strips explanatory parentheticals. P13 protocol.md is an unambiguous run-local citation alias.' });

const sourceRefs = new Map();
function addRef(raw, owner, lines = null, origin = 'citation') {
  let ref = raw;
  if (ref === 'protocol.md') ref = `${dir}/protocol.md`;
  if (typeof ref !== 'string' || path.isAbsolute(ref) || ref.includes('..') || ref.includes('{{') || ref.includes('<')) return;
  ref = ref.replace(/\/$/, '');
  if (!/^(?:AGENTS\.md|README\.md|package(?:-lock)?\.json|(?:docs|skills|shared|scripts|packages|plugins|exports|tests|catalog|\.github)\/)/.test(ref)) return;
  const existing = sourceRefs.get(ref) ?? { path: ref, owners: new Set(), origins: new Set(), line_ranges: [] };
  existing.owners.add(owner); existing.origins.add(origin);
  if (lines !== null) existing.line_ranges.push({ owner, lines });
  sourceRefs.set(ref, existing);
}
function walkEvidence(value, owner, key = '') {
  if (Array.isArray(value)) { for (const child of value) walkEvidence(child, owner, key); return; }
  if (value && typeof value === 'object') {
    if (typeof value.path === 'string') addRef(value.path, owner, value.lines ?? (value.start_line ? `${value.start_line}-${value.end_line}` : null));
    for (const [childKey, child] of Object.entries(value)) {
      if (/incidental|without_coverage/.test(childKey)) continue;
      walkEvidence(child, owner, childKey);
    }
    return;
  }
  if (typeof value === 'string' && /evidence|sources|source_locations|source_references|inspected_paths/.test(key)) {
    const match = value.match(/^((?:\.?github|docs|skills|shared|scripts|packages|plugins|exports|tests|catalog)\/[^\s:,;]+|AGENTS\.md|README\.md|package(?:-lock)?\.json|protocol\.md)(?::([\d, -]+))?/);
    if (match) addRef(match[1], owner, match[2]?.trim() ?? null);
  }
}
for (const report of allReports) {
  walkEvidence(report, report.task_id);
  for (const entry of report.inspected_paths) addRef(typeof entry === 'string' ? entry : entry.path, report.task_id, typeof entry === 'string' ? null : entry.lines ?? null, 'inspected_paths');
}
const reportedHashes = [];
function collectHashes(value, owner) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'string' && /^[a-f0-9]{64}$/.test(child) && key.includes('/')) { reportedHashes.push({ path: key, owner, expected: child }); addRef(key, owner, null, 'reported_hash'); }
    else if (typeof child === 'object') collectHashes(child, owner);
  }
}
allReports.forEach((report) => collectHashes(report, report.task_id));
const digestPaths = new Set([...Object.keys(baseline.files), ...Object.keys(distribution.files), ...sourceRefs.keys()]);
const currentHashes = new Map();
const missing = [];
const directoryRefs = [];
for (const ref of [...digestPaths].sort()) {
  if (!fs.existsSync(ref)) { missing.push(ref); continue; }
  if (fs.statSync(ref).isDirectory()) { directoryRefs.push(ref); continue; }
  currentHashes.set(ref, hash(fs.readFileSync(ref)));
}
const compareHashes = (map) => Object.entries(map).filter(([ref, expected]) => currentHashes.get(ref) !== expected).map(([ref, expected]) => ({ path: ref, baseline_sha256: expected, current_sha256: currentHashes.get(ref) ?? null, relevant: sourceRefs.has(ref) }));
const sourceChanges = compareHashes(baseline.files);
const distributionChanges = compareHashes(distribution.files);
const reportedChanges = reportedHashes.filter((entry) => currentHashes.get(entry.path) !== entry.expected).map((entry) => ({ ...entry, current_sha256: currentHashes.get(entry.path) ?? null }));
const unbaselined = [...sourceRefs.keys()].filter((ref) => !ref.startsWith(runPrefix) && !baseline.files[ref] && !distribution.files[ref] && !directoryRefs.includes(ref)).map((ref) => ({ path: ref, current_sha256: currentHashes.get(ref) ?? null, reported_hashes: reportedHashes.filter((entry) => entry.path === ref), disposition: reportedHashes.some((entry) => entry.path === ref) ? 'Compared with saved observer hash; no preparation-baseline hash available. Historical/build evidence only, not a source recommendation dependency.' : 'No preparation-baseline or reported hash. Historical/build evidence retained as unverified for freshness; not needed for accepted current-source conclusions.' }));
check('Reported inspected paths and citations exist', missing.filter((ref) => sourceRefs.has(ref)).length === 0, { missing: missing.filter((ref) => sourceRefs.has(ref)), directories_are_inventory_only: directoryRefs });
check('Baseline source and distribution bytes have no unreconciled drift', sourceChanges.length === 0 && distributionChanges.length === 0 && reportedChanges.length === 0, { source_changes: sourceChanges, distribution_changes: distributionChanges, reported_hash_changes: reportedChanges });
const rangeChecks = [];
function numericRanges(lines) {
  if (Array.isArray(lines)) {
    if (lines.length === 2 && lines.every(Number.isInteger)) return [lines];
    return lines.flatMap(numericRanges);
  }
  if (typeof lines === 'string' && /^\d+(?:\s*-\s*\d+)?(?:\s*,\s*\d+(?:\s*-\s*\d+)?)*$/.test(lines)) return lines.split(',').map((part) => part.trim().split(/\s*-\s*/).map(Number)).map(([a,b]) => [a,b ?? a]);
  return [];
}
for (const recommendation of verified) {
  for (const citation of recommendation.evidence ?? []) {
    if (typeof citation !== 'object' || !citation.path) continue;
    const byteContent = fs.readFileSync(citation.path);
    let lineCount = byteContent.length && byteContent[byteContent.length - 1] !== 10 ? 1 : 0;
    for (const byte of byteContent) if (byte === 10) lineCount++;
    const ranges = numericRanges(citation.lines);
    rangeChecks.push({ finding_id: recommendation.finding_id, path: citation.path, lines: citation.lines, line_count: lineCount, passed: ranges.length > 0 && ranges.every(([start,end]) => start >= 1 && end >= start && end <= lineCount) });
  }
}
check('Every independent finding citation has valid numeric line bounds', rangeChecks.every((entry) => entry.passed), { checked: rangeChecks.length, failures: rangeChecks.filter((entry) => !entry.passed), method: 'Newline byte counting only; no semantic source reread or YAML parse.' });

const classificationFor = (id) => ['P08-02','P12-F3'].includes(id) ? 'hypothesis' : 'source-confirmed engineering opportunity';
const categoryFor = (id) => ['P08-02','P12-F3'].includes(id) ? 'research hypothesis' : ['P10-F03','P14-02'].includes(id) ? 'contract change' : ['P08-01','P12-F4'].includes(id) ? 'compatibility-sensitive internal or evidence change' : 'quick/local change';
const priorityFor = (id) => ['P06-F02','P14-01','P09-F02','P03-F02','P10-F03'].includes(id) ? 'P1 correctness or contract alignment before tuning' : ['P12-F4','P12-F1','P12-F2','P09-F01','P07-F01','P07-F02','P07-F03','P08-01','P10-F01','P10-F02'].includes(id) ? 'P2 bounded reuse or measured orchestration follow-up' : 'P3 conditional disclosure or benchmark-first';
const recommendations = verified.map((entry) => {
  const primary = primaryFindings.find((finding) => finding.id === entry.finding_id);
  const recommendation = {
    id: entry.finding_id, component: entry.component ?? primary.component, title: entry.title,
    source_task: primary.task_id, primary_report: `${dir}/${primary.task_id}.json`, verification_report: `${dir}/${entry.verifier_id}.json`, independent_verdict: entry.verdict,
    classification: classificationFor(entry.finding_id), classification_qualification: entry.classification,
    category: categoryFor(entry.finding_id), priority: priorityFor(entry.finding_id),
    evidence: entry.evidence,
    current_execution_path: entry.current_execution_path ?? primary.current_execution_path,
    existing_optimizations: entry.existing_mechanisms_checked ?? entry.existing_mechanism_check ?? entry.existing_mechanisms ?? primary.existing_optimizations ?? primary.current_optimizations,
    unnecessary_work_or_restriction: primary.unnecessary_work_or_restriction ?? primary.unnecessary_work,
    reproducible_scenario: entry.concrete_scenario ?? entry.scenario_and_reasoning ?? entry.reproducible_scenario ?? primary.reproducible_scenario,
    minimal_recommendation: entry.replacement_minimal_recommendation ?? entry.minimal_recommendation,
    expected_qualitative_effect: entry.expected_effect ?? entry.expected_qualitative_effect ?? primary.expected_qualitative_effect ?? primary.qualitative_impact,
    confidence: entry.confidence,
    correctness_compatibility_state_recovery_security: { primary: primary.guarantees, independently_verified_constraints: entry.guarantees_to_preserve ?? entry.preserved_guarantees ?? entry.guarantees },
    measurement_plan: primary.measurement_plan,
    validation_plan: entry.validation_plan ?? entry.validation_and_measurement_plan,
    rough_complexity: entry.complexity_and_dependencies ?? entry.complexity ?? entry.rough_complexity ?? primary.complexity ?? primary.rough_complexity,
    dependencies: entry.dependencies ?? primary.dependencies ?? primary.complexity?.dependencies,
    needs_targeted_clarification_for_retained_recommendation: false,
    unresolved_broader_claim: entry.adjudication_question ?? entry.deferred_design_question ?? null,
    accepted_scope_only: true,
    duplication_links: entry.duplication_links ?? entry.duplicate_of ?? [],
    measured_time_or_token_savings: null
  };
  if (recommendation.id === 'P02-F03') recommendation.duplicate_family = 'P01-001';
  if (recommendation.id === 'P01-001') recommendation.duplicate_family = 'P01-001';
  if (recommendation.id === 'P03-F01') recommendation.efficiency_effect_status = 'Compact handoff clarification accepted; avoided repeated review work remains a hypothesis, not a demonstrated forced-rerun defect.';
  if (recommendation.id === 'P09-F03') recommendation.implementation_condition = 'Benchmark first for materiality; source-confirmed scans are not measured end-to-end benefit.';
  if (recommendation.id === 'P08-02') recommendation.implementation_condition = 'No implementation-ready storage addition: benchmark first and explicitly design strict old-reader/version rollout.';
  if (recommendation.id === 'P14-02') recommendation.implementation_condition = 'Only cold lazy validators with in-place package replacement; immutable paths and already-warm validators are controls. No blanket identity authorization gate.';
  return recommendation;
});
const requiredFindingFields = ['id','component','title','evidence','current_execution_path','existing_optimizations','unnecessary_work_or_restriction','reproducible_scenario','minimal_recommendation','expected_qualitative_effect','confidence','correctness_compatibility_state_recovery_security','measurement_plan','validation_plan','rough_complexity','dependencies','classification','needs_targeted_clarification_for_retained_recommendation'];
check('Every synthesized recommendation has all protocol fields', recommendations.every((entry) => requiredFindingFields.every((key) => entry[key] !== undefined && entry[key] !== null)), recommendations.map((entry) => ({ id: entry.id, missing_fields: requiredFindingFields.filter((key) => entry[key] === undefined || entry[key] === null) })));
check('Only independently accepted or narrowed recommendations are retained', recommendations.every((entry) => ['accepted','narrowed'].includes(entry.independent_verdict)), { rejected: 0, disputed: 0, unverified_promoted: 0 });
check('Hypotheses remain separate from confirmed opportunities', recommendations.filter((entry) => entry.classification === 'hypothesis').length === 2 && recommendations.find((entry) => entry.id === 'P12-F3').classification === 'hypothesis', { hypothesis_ids: recommendations.filter((entry) => entry.classification === 'hypothesis').map((entry) => entry.id) });

const unresolved = [
 { ids: ['P02-F01'], area: 'Cold-context confirmed candidate scope and actual-answer provenance retrieval', disposition: 'Unverified broader API need; retain only unchanged-scope reuse when authoritative current evidence is already available. No new scope reader is promoted.', owner: 'Product interview/context contract owner before an API proposal' },
 { ids: ['P02-F03'], area: 'General ready-source batching after candidate creation', disposition: 'Unverified broader route excluded. Retained recommendation is only the existing matching ready-context pre-draft phase; never pass candidate context to the ready reader.', owner: 'Product context owner if after-draft routing is later requested' },
 { ids: ['P10-F01'], area: 'Eliminating intermediate dependency observations', disposition: 'Unverified consistency equivalence excluded. Preserve every current readDependency observation; reuse parsing by exact bytes/hash and strictness only.', owner: 'Workflow storage/requirements contract owner before changing observation semantics' },
 { ids: ['P08-02'], area: 'Old-reader compatibility for revision-hint operation records', disposition: 'Unresolved versioned storage design, not a backward-compatible optional-field claim. Benchmark-first research only.', owner: 'Product operation storage owner if materiality is established' }
];
const existing = verifiers.flatMap((report) => report.no_finding_samples.map((sample) => ({ id: sample.id, verifier: report.task_id, report: `${dir}/${report.task_id}.json`, area: sample.area ?? sample.component ?? sample.coverage?.join(', '), conclusion: sample.conclusion ?? sample.result, evidence: sample.evidence, limitations: sample.boundary ?? sample.limit ?? sample.qualification })));
const limitations = [
 'Recommendation-only source-and-test inspection. No optimization was implemented and no runtime discriminating scenario or benchmark was executed by synthesis.',
 'All current 17 canonical skills and 21 assigned significant component areas have saved primary evidence. Coverage is flow-based, with explicitly partial source/test ranges, not exhaustive line or behavioral coverage.',
 'Generated distributions were sampled semantically and compared by baseline byte hashes. Unchanged distribution bytes do not prove complete rendered fidelity, leakage absence, digest validity or installed-host correctness.',
 'No current time, token, cost or percentage savings were measured. Static complexity, citation/file counts and structural bytes are not performance savings. Historical captures remain historical; unavailable private raw events were not searched.',
 'Exact provider request events, actual concurrent provider requests, token usage, reasoning effort and provider/account capacity are unavailable. Configured routes and caller-supplied task-order events are not independent transport telemetry.',
 'Serving MCP identity observed by P14 differs from the local dist stamp. Findings concern current checkout source, not reproduced failures of the serving build. No rebuild or restart was authorized.',
 'Four existing pure parser tests passed only in P12 under its explicit protocol exception. Synthesis ran no repository tests. Full tests, builds, generation/check, installation, packaging, publishing, commit and push were not authorized and are not marked passed.',
 'P04 and P05 report unavailable audited-skill loading attempts; no audited skill ran. These attempts are procedural deviations from the no-invocation boundary, not skill defects or executed coverage. V03 independently sampled their canonical evidence.',
 'No repair or adjudication report was supplied or scheduled. The three broader contract questions remain excluded or narrowed rather than silently accepted.',
 'The caller explicitly requested preservation of a runtime record containing original-language P12 limitation strings. Only that supplied evidence retains those exact values, JSON-escaped; all synthesis conclusions and reports are English.',
 'Byte-hash snapshots and Git status are point-in-time evidence, not atomic reservations or perpetual protection from concurrent editors. Existing changes were preserved; no clean worktree is required or claimed.'
];
const unverifiedCoverage = [
 { area: 'Complete rendered fidelity and installed runtime qualification across three hosts', reason: 'Only bounded copy samples and distribution-baseline byte stability were authorized/provided; no generator or installation ran.' },
 { area: 'Current model-inclusive end-to-end product/session behavior, cancellation and comparative performance', reason: 'Source/fixture inspection is available; live model trials and exact usage events are unavailable.' },
 { area: 'Historical raw capture authenticity and baseline freshness for unbaselined historical/build artifacts', reason: 'Retained prose/JSON was sampled, not re-executed; see source-drift evidence.' },
 { area: 'Sudden power-loss durability, arbitrary-editor serializability and every filesystem-instruction failure boundary', reason: 'Named cooperative recovery checkpoints do not establish those stronger guarantees.' }
];
const newUnassigned = [];
const order = [
 { phase: 1, title: 'Correctness and attribution prerequisites', ids: ['P06-F02','P14-01','P09-F02','P03-F02','P10-F03','P12-F4'], dependencies: 'Separate implementation authority and discriminating regressions. Establish executable provenance before performance comparisons; preserve schema/cursor/receipt compatibility.' },
 { phase: 2, title: 'Remove bounded repeated local work and proven orchestration duplication', ids: ['P07-F01','P07-F02','P07-F03','P09-F01','P10-F01','P10-F02','P08-01','P12-F1','P12-F2'], dependencies: 'Preserve mutation/read observation boundaries, strict validation acceptance/error contracts, native cancellation and wrapper cleanup. P12-F1/F2 must satisfy verifier narrowing before removing calls.' },
 { phase: 3, title: 'Adopt existing capabilities and refine conditional instructions', ids: ['P01-001','P02-F03','P02-F01','P02-F02','P03-F01','P01-002'], dependencies: 'Treat P01-001/P02-F03 as one batching family. Ready/candidate contexts remain separate. Correct P09-F02 before relocating task-owner prose. Preserve obligation-to-role reachability and separate generation authority.' },
 { phase: 4, title: 'Measure scale-dependent candidates without adding new infrastructure', ids: ['P09-F03','P08-02','P12-F3'], dependencies: 'Use existing synthetic fixtures, diagnostics and concurrency controls. Evaluate P12-F2 before concurrency tuning. P08-02 needs materiality evidence and old-reader/version design before storage change.' }
];
const finalHead = git('rev-parse', 'HEAD').trim();
const finalStatus = git('status', '--porcelain=v1');
const baselineStatus = fs.readFileSync(`${dir}/initial-status.txt`, 'utf8');
const normalizeStatus = (value) => value.split('\n').filter((line) => line && !line.includes('docs/evidence/process-efficiency-audit/')).sort();
const statusPreserved = JSON.stringify(normalizeStatus(finalStatus)) === JSON.stringify(normalizeStatus(baselineStatus));
const indexPreserved = git('ls-files', '--stage', '-z') === initialIndex;
check('HEAD and all non-audit status entries are preserved', finalHead === baseline.head && finalHead === initialHead && statusPreserved && indexPreserved, { initial_head: initialHead, final_head: finalHead, baseline_head: baseline.head, non_audit_status_equal_to_preparation: statusPreserved, staged_index_equal_to_synthesis_start: indexPreserved });
check('Primary and verification reports remain byte-identical', allReports.every((report) => hash(fs.readFileSync(`${dir}/${report.task_id}.json`)) === beforeReportHashes[report.task_id]), beforeReportHashes);
let pending = 0; let peak = 0;
for (const event of workflowResults.events) { pending += event.state === 'requested' ? 1 : -1; peak = Math.max(peak, pending); }
check('Caller event record has balanced task starts/returns and scheduled peak eight', pending === 0 && peak === 8 && workflowResults.events.length === 34, { starts_before_synthesis: 17, returns_before_synthesis: 17, reconstructed_scheduled_peak: peak, actual_provider_request_peak: null });

const drift = {
 task_id: 'F01', captured_at: new Date().toISOString(), method: 'SHA-256 byte hashing only. No live managed YAML parsed, no semantic repository reread and no application module imported.',
 baseline_file: `${dir}/baseline.json`, distribution_baseline_file: `${dir}/distribution-baseline.json`, baseline_captured_at: baseline.captured_at,
 baseline_source_files: Object.keys(baseline.files).length, baseline_distribution_files: Object.keys(distribution.files).length,
 source_changes: sourceChanges, distribution_changes: distributionChanges, reported_hash_changes: reportedChanges,
 inspected_and_cited_paths: [...sourceRefs.values()].map((entry) => ({ ...entry, owners: [...entry.owners].sort(), origins: [...entry.origins].sort(), current_sha256: currentHashes.get(entry.path) ?? null })),
 current_hashes_sha256: Object.fromEntries([...currentHashes].sort()), reported_hash_comparisons: reportedHashes.length,
 missing_paths: missing, inventory_directory_refs: directoryRefs, no_preparation_baseline: unbaselined,
 relevant_changed_source_rereads: [], affected_conclusions: [], targeted_reread_disposition: sourceChanges.length + distributionChanges.length + reportedChanges.length === 0 ? 'No changed relevant source required semantic reread; saved evidence remains applicable.' : 'Source drift requires reconciliation; affected conclusions remain unverified.',
 repository: { baseline_head: baseline.head, synthesis_initial_head: initialHead, final_head: finalHead, preparation_status_entries: baselineStatus.trimEnd().split('\n'), synthesis_initial_status_entries: initialStatus.trimEnd().split('\n'), final_status_entries: finalStatus.trimEnd().split('\n'), non_audit_status_preserved: statusPreserved, index_preserved: indexPreserved },
 report_input_hashes_sha256: beforeReportHashes,
 limitations: 'Preparation baseline intentionally excludes historical evidence and build output. Unbaselined observer hashes identify sampled bytes, not preparation-time identity or semantic correctness. No personal paths or source contents retained.'
};
save('F01-source-drift.json', drift);
const passing = checks.filter((entry) => entry.mandatory).every((entry) => entry.passed);
const status = passing ? 'complete' : 'partial';
const confirmed = recommendations.filter((entry) => entry.classification !== 'hypothesis');
const quick = recommendations.filter((entry) => entry.category === 'quick/local change');
const contracts = recommendations.filter((entry) => entry.category === 'contract change' || entry.category === 'compatibility-sensitive internal or evidence change');
const hypotheses = recommendations.filter((entry) => entry.classification === 'hypothesis');
const audit = {
 schema_version: 1, task_id: 'F01', run_id: inputs.run_id, status, audit_kind: 'Recommendation-only synthesis of saved evidence and independent verification',
 started_at: started, assembled_at: new Date().toISOString(), report_path: `${dir}/F01.json`,
 summary: { primary_reports: 14, verification_reports: 3, repair_reports: 0, adjudication_reports: 0, synthesis_reports: 1, finding_references: recommendations.length, source_confirmed_references: confirmed.length, research_hypotheses: hypotheses.length, accepted_verdicts: recommendations.filter((entry) => entry.independent_verdict === 'accepted').length, narrowed_verdicts: recommendations.filter((entry) => entry.independent_verdict === 'narrowed').length, rejected: 0, disputed: 0, exact_duplicate_families_merged: 1, distinct_recommendation_families: recommendations.length - 1, measured_savings_findings: 0, skills: 17, significant_components: 21, aspects: Object.keys(aspectNames), completion_meaning: 'Mandatory saved-evidence coverage and deterministic validation pass only; not implementation, tests, installed qualification or measured benefit.' },
 coverage: { per_skill_and_component: coverageRows, aspects, independently_sampled_no_finding_checks: existing, new_meaningful_unassigned_components: newUnassigned, unverified_areas: unverifiedCoverage, unresolved_broader_claims: unresolved },
 recommendations, confirmed_opportunities: confirmed.map((entry) => entry.id), quick_changes: quick.map((entry) => entry.id), contract_and_compatibility_changes: contracts.map((entry) => entry.id), research_hypotheses: hypotheses.map((entry) => entry.id),
 deduplication: [
  { ids: ['P01-001','P02-F03'], decision: 'One existing-ready-source-batch adoption family with distinct valid ready-context entrypoints; no new API and no generalized after-draft adoption.' },
  { ids: ['P03-F01','P03-F02'], decision: 'Share compact identity language if useful, not a new ledger/framework. Sequential deterministic reuse and fresh independent semantic review remain separate.' },
  { ids: ['P07-F01','P07-F02','P14-01'], decision: 'Coordinate changes in one batch loop but retain independent correctness oracles; never add hypothetical savings from overlapping fixtures.' },
  { ids: ['P07-F03','P09-F01','P10-F01','P10-F02','P08-01'], decision: 'Distinct caller/input/lifetime costs. Reuse only within each existing owning boundary; no global cache or removed transaction/read observations.' },
  { ids: ['P02-F02','P09-F02'], decision: 'Correct the current-owner recovery wording wherever task guidance is canonically routed; routing must not lose that exception or its guards.' },
  { ids: ['P12-F1','P12-F2','P12-F3','P12-F4'], decision: 'P11/P13 no-finding evidence is not contradictory: sound validator/runtime mechanisms can coexist with duplicate orchestration and missing benchmark attribution. Do not delete distinct CLI/packed/platform gates or tune concurrency before measurement.' }
 ],
 recommended_order: order,
 execution_and_routes: { configured_provider: inputs.provider, models: { sol: inputs.sol, luna: inputs.luna }, primary_assignments: { sol: 10, luna: 4 }, verification_assignments: { sol: 3 }, synthesis: { assigned: 'sol', observed_model: 'gpt-6.1-sol', basis: 'Active developer runtime declaration', provider_independently_observed: false, reasoning_effort: null }, total_scheduled_assignments_including_synthesis: { total: 18, sol: 14, luna: 4 }, per_report_route_evidence: allReports.map((report) => ({ task_id: report.task_id, saved_route: report.route })), actual_provider_request_count: null, actual_provider_route_attestation: null, actual_token_usage: null, exact_runtime_request_events: null, event_record: `${dir}/workflow-results.json`, event_record_basis: 'Caller-supplied task requested/returned ordering, no timestamps or provider request IDs; F01 is the present synthesis assignment, not a fabricated additional event.', scheduled_peak: 8, scheduled_peak_meaning: workflowResults.scheduled_peak_note, actual_model_request_peak: null, repair_starts: 0, adjudication_starts: 0, unused_repair_budget: 3, unused_adjudication_budget: 2, hard_bounded_plan_max_starts: 23, descendants_or_workflows_created_by_synthesis: 0, capacity: inputs.runtime.limits, capacity_conclusion: 'C=8 was conditional on unknown provider quotas and volatile in-memory settings. Scheduled pending calls are not actual provider request concurrency. Default depth does not prove enforced workflow recursion; workers were explicitly forbidden to delegate. No capacity setting was increased.' },
 measurements: { performance_experiments_run_by_synthesis: false, measured_time_savings: null, measured_token_savings: null, source_complexity_and_byte_counts_are_not_savings: true, primary_selected_tests: reports.find((report) => report.task_id === 'P12').executed_evidence[0], primary_runtime_identity_observations: reports.find((report) => report.task_id === 'P14').runtime_observations, historical_evidence: 'P13/V03 only sampled retained measurement caveats and internal consistency. No historical result is relabeled current. Exact model-stage time and raw token usage are unavailable.', generated_fidelity_evidence: { P01: '145 matching non-templated-reference comparisons plus three entry samples', P02: '48 matching resource copies plus three Technical Design entries', P03: 'Nine matching host documents plus three sidecars', P04: 'Semantic host spot sample only', P11: 'Ten raw reference comparisons: eight equal, two expected host-template candidates; not full rendered proof' }, audit_wall_clock: { baseline_captured_at: baseline.captured_at, synthesis_start_observed_at: '2026-10-26T18:15:18Z', assembly_at: new Date().toISOString(), exact_workflow_start_finish: null, interpretation: 'Timestamp bounds only. Preparation capture is not workflow start; assembly is not overall provider finish. No elapsed speedup or model/human time inferred.' } },
 source_drift: { evidence: `${dir}/F01-source-drift.json`, source_files_checked: Object.keys(baseline.files).length, distribution_files_checked: Object.keys(distribution.files).length, source_changes: sourceChanges.length, distribution_changes: distributionChanges.length, reported_hash_changes: reportedChanges.length, current_head: finalHead, status_preserved: statusPreserved, unbaselined_evidence: unbaselined, semantic_rereads: 'None required because no relevant changed bytes were detected.' },
 limitations, validation_path: `${dir}/validation.json`, validation_scope: 'Audit JSON/field/reference/coverage/privacy/byte-hash/status checks only; not application tests.',
 artifacts: ['audit.md','audit.json','validation.json','workflow-results.json','F01-source-drift.json','F01.json','F01-synthesize.mjs'].map((name) => `${dir}/${name}`)
};
save('audit.json', audit);

const link = (ref, label = path.basename(ref), lines = null) => `[${label}](<${ref}${lines ? `#L${String(lines).split(/[,-]/)[0]}` : ''}>)`;
function citationText(citation) {
 if (typeof citation === 'string') { const match = citation.match(/^([^:]+):(.*)$/); return match ? link(match[1], `${path.basename(match[1])}:${match[2]}`, match[2]) : citation; }
 const lines = typeof citation.lines === 'string' ? citation.lines : JSON.stringify(citation.lines);
 return `${link(citation.path, `${path.basename(citation.path)}:${lines}`, lines)} — ${citation.observation ?? ''}`;
}
const sections = [
 '# Process Efficiency Audit',
 '',
 `Run: ${inputs.run_id}. Status: **${status}** for the recommendation-only saved-evidence audit. No optimization was implemented.`,
 '',
 `## Executive conclusions\n\n- ${recommendations.length} finding references were independently examined: ${confirmed.length} source-confirmed references and two benchmark-first hypotheses. One batching pair is a duplicate family, leaving ${recommendations.length - 1} distinct families. No measured time/token saving is claimed.\n- Prioritize final-review cache freshness, exact wire-budget packing, current-owner recovery documentation, neutral reviewer source identity, and description-only cursor correctness.\n- Reuse existing bounded APIs and request-owned snapshots; do not add a global cache, scheduler, generic retry wrapper or another batching API.\n- Consolidate duplicate development validation and baseline qualification only with failure-equivalence, cancellation and cleanup controls. Keep independent semantic review, full final consistency, exact source consumption, consent, locks and recovery gates.\n- Confirmed-scope cold retrieval, generalized after-draft batching and dependency-read elimination remain unverified broader claims; only the safe narrowed portions are retained.`,
 '',
 '## Scope, authority and evidence',
 '',
 `This synthesis read the saved primary and verification reports, ${link(`${dir}/protocol.md`)}, ${link(`${dir}/inputs.json`)}, the JSON baselines, ${link('docs/index.md')}, and the current ${link('catalog/skills.json','skill catalog')}. Current canonical path inventory contains 17 skills. It did not automatically reread production source. Byte hashing and newline counting do not parse managed YAML. No changed relevant bytes required a semantic reread.`,
 '',
 `All 14 primary and three independent verification files exist and parse. There are no repair or adjudication returns; a path alone was not accepted as proof. P11 coverage annotations and heterogeneous field names were explicitly normalized. P13's bare protocol citation resolves only to this run's ${link(`${dir}/protocol.md`)}. Reports remain unmodified.`,
 '',
 'Complete here means mandatory scoped evidence and validation passed, not exhaustive repository-line coverage, an executed behavioral pass, installed runtime qualification or implementation readiness for every conditional recommendation.',
 '',
 '## Coverage per skill and significant component',
 '',
 '| Area | Primary | Independent verifier | Aspects | Saved evidence |',
 '|---|---|---|---|---|',
 ...coverageRows.map((row) => `| ${row.component} | ${row.primary} | ${row.verifier} | ${row.aspects.join(', ')} | ${link(row.evidence_report, row.primary)}; ${link(`${dir}/${row.verifier}.json`, row.verifier)} |`),
 '',
 '### Mandatory aspects A–H',
 ...aspects.map((aspect) => `- **${aspect.id} — ${aspect.title}:** ${aspect.primary_tasks.join(', ')}. ${aspect.basis}`),
 '',
 'No new meaningful unassigned current component was identified in the saved bounded inventories. This is not a claim that every possible component was discovered. Any later meaningful unassigned component must be recorded as unverified, not retroactively covered.',
 '',
 '## Existing optimizations to preserve',
 '',
 ...existing.map((entry) => `- **${entry.id} — ${entry.area}:** ${entry.conclusion}\n  - Evidence: ${link(entry.report, entry.verifier)}. ${entry.limitations ?? ''}`),
 '',
 '## Recommendations: verified scope only',
 '',
 'The following entries retain every original ID for traceability. P01-001 and P02-F03 count as one shared capability-adoption family. Accepted means source-supported recommendation, not measured gain. All implementation and proposed experiments require separate authorization.',
 ''
];
for (const entry of recommendations) {
 sections.push(`### ${entry.id} — ${entry.title}`, '',
 `**${entry.category}; ${entry.priority}.** Independent verdict: ${entry.independent_verdict}. Classification: ${entry.classification}.`, '',
 `- **Current path:** ${entry.current_execution_path}`,
 `- **Already present:** ${typeof entry.existing_optimizations === 'string' ? entry.existing_optimizations : JSON.stringify(entry.existing_optimizations)}`,
 `- **Avoidable work/restriction:** ${entry.unnecessary_work_or_restriction}`,
 `- **Scenario:** ${typeof entry.reproducible_scenario === 'string' ? entry.reproducible_scenario : JSON.stringify(entry.reproducible_scenario)}`,
 `- **Minimal recommendation:** ${entry.minimal_recommendation}`,
 `- **Qualitative effect:** ${entry.expected_qualitative_effect} Confidence: ${typeof entry.confidence === 'string' ? entry.confidence : JSON.stringify(entry.confidence)}. No measured time/token saving.`,
 `- **Correctness, compatibility, state, recovery and security:** ${JSON.stringify(entry.correctness_compatibility_state_recovery_security)}`,
 `- **Validation:** ${typeof entry.validation_plan === 'string' ? entry.validation_plan : JSON.stringify(entry.validation_plan)}`,
 `- **Measurement plan:** ${typeof entry.measurement_plan === 'string' ? entry.measurement_plan : JSON.stringify(entry.measurement_plan)}`,
 `- **Complexity/dependencies:** ${typeof entry.rough_complexity === 'string' ? entry.rough_complexity : JSON.stringify(entry.rough_complexity)}; ${JSON.stringify(entry.dependencies)}.`,
 ...(entry.implementation_condition ? [`- **Condition:** ${entry.implementation_condition}`] : []),
 ...(entry.efficiency_effect_status ? [`- **Efficiency status:** ${entry.efficiency_effect_status}`] : []),
 ...(entry.unresolved_broader_claim ? [`- **Excluded broader question:** ${entry.unresolved_broader_claim}`] : []),
 `- **Saved reports:** ${link(entry.primary_report, entry.source_task)}; ${link(entry.verification_report, path.basename(entry.verification_report, '.json'))}.`,
 '- **Exact source evidence:**',
 ...entry.evidence.map((citation) => `  - ${citationText(citation)}`), '');
}
sections.push('## Quick changes, contract work and research', '',
 `- **Quick/local candidates:** ${quick.map((entry) => entry.id).join(', ')}. Some still have meaningful preconditions; small diff does not mean safe without focused regression evidence.`,
 `- **Contract/compatibility-sensitive candidates:** ${contracts.map((entry) => entry.id).join(', ')}. P10-F03 changes observable description continuation semantics; P14-02 changes contract-snapshot ownership; P08-01 must preserve semantic/error/size acceptance; P12-F4 must preserve benchmark metric meanings.`,
 '- **Research only:** P08-02 (evidence-only replay selection and strict old-reader policy) and P12-F3 (nested resource contention). P09-F03 is a verified local algorithmic opportunity but benchmark-first for prioritization. P03-F01 handoff clarification is supported, while avoided broad reruns remain hypothetical.', '',
 '## Reconciliation and excluded broader claims', '',
 ...audit.deduplication.map((entry) => `- **${entry.ids.join(', ')}:** ${entry.decision}`),
 ...unresolved.map((entry) => `- **${entry.ids.join(', ')} — ${entry.area}:** ${entry.disposition} Conditional owner: ${entry.owner}.`), '',
 'No material disagreement is silently resolved as a pass. Safe verifier narrowing removes the need to invent an adjudicator in this no-descendants assignment. New reader contracts, arbitrary candidate-to-ready conversion and removal of intermediate conflict observations are not approved recommendations.', '',
 '## Recommended order and dependencies', '',
 ...order.map((phase) => `1. **Phase ${phase.phase}: ${phase.title}.** ${phase.ids.join(', ')}. ${phase.dependencies}`), '',
 '## Models, orchestration counts and conditional capacity', '',
 `Configured route: ${inputs.provider}; sol=${inputs.sol}; luna=${inputs.luna}. Scheduled assignments including synthesis: 18 (14 sol, four luna). Primaries: ten sol/four luna; verifiers: three sol; synthesis: sol. Each report retains its own route evidence. Synthesis observes gpt-6.1-sol through its active developer declaration. Provider transport, effort, per-request actual model receipt and token accounting are unavailable. Do not upgrade an assigned Luna route into independent request telemetry.`, '',
 `The preserved ${link(`${dir}/workflow-results.json`,'runtime record')} has 17 pre-synthesis starts and 17 returns, zero repairs and zero adjudicators. Its scheduled pending-call peak is eight; the actual concurrent provider-request peak is unavailable. F01 is the eighteenth assigned start, inferred from this active assignment, not an appended fabricated provider event. Task-order events have no timestamps or request IDs.`, '',
 `Capacity was conditional: workflow deployment ceiling 16; applicable process-local agent default eight with zero occupied slots observed before launch; conservative PTC bound floor((128−8)/3)=40; operational resource estimate eight; 14 independent ready primaries; provider capacity unknown. Thus C=8 was a conditional operational choice, not a quota guarantee or atomic reservation. In-memory overrides remain unobserved. The depth-one default is not established as an enforced workflow recursion limit because the inspected workflow start path does not pass maxDepth; all workers were explicitly forbidden to delegate. Deployment total ceiling 1000 is not simultaneous capacity; bounded audit plan maximum 23 starts, actual assigned count 18. Full values and evidence bases remain in ${link(`${dir}/inputs.json`)} and ${link(`${dir}/audit.json`)}. No setting was increased.`, '',
 '## Measurements and execution limits', '',
 'No optimization benchmark or model-inclusive comparison was run. Source-derived quadratic scans, repeated parse paths, structural bytes and report counts are facts about inspected structure, not measured time/token savings. Exact runtime events, model-stage durations, token usage and current provider/account quotas are unavailable. No unrelated session or credential search was made.', '',
 `P12 alone reports four existing synchronous parser tests passing on Node v24.20.0, with incidental test duration 39.188832 ms. That is retained primary evidence, not a speed baseline or synthesis rerun; its tool output lacked a separate exit marker. All other test assertions cited here were inspected, not run. Full tests/build/generation/check/install/package/publish were not authorized and are not marked passed. Details: ${link(`${dir}/P12.json`,'P12:78–96','78')}.`, '',
 `P14 observed a verified live build 772847cc4ca53d707cb9350cc2f18cb7ce6a0a60f20fa80dbc50076c2780cafb and a different local dist stamp 47663d76641ab1e84c87c5a3211d859a6869d408564a55b695a767de68b8b0c6; declared contract digests match. The local stamp was not independently recomputed. This is identity evidence, not an installed incident or proof that live MCP serves these source changes: ${link(`${dir}/P14.json`,'P14:46–74','46')}.`, '',
 'Historical reports were sampled for caveats and internal consistency only; private captures were not available. Generated fidelity counts are scoped copy checks and can overlap; do not sum them into unique coverage or performance savings. Full rendered output, installed plugin behavior and live UI/model enforcement remain unverified.', '',
 `Clock evidence: preparation baseline ${baseline.captured_at}; synthesis shell observation 2026-10-26T18:15:18Z; assembly ${audit.assembled_at}. These are wall-clock bounds, not exact workflow execution intervals or provider timing.`, '',
 '## Source drift and preservation', '',
 `${Object.keys(baseline.files).length} preparation source hashes and ${Object.keys(distribution.files).length} distribution hashes were compared, plus saved observer hashes and reported inspected/cited paths. Source differences: ${sourceChanges.length}; distribution differences: ${distributionChanges.length}; reported-hash differences: ${reportedChanges.length}. HEAD remains ${finalHead}; all non-audit status entries match preparation and the staged index matches synthesis start. No existing report was overwritten. See ${link(`${dir}/F01-source-drift.json`,'source-drift evidence')}.`, '',
 'Hashing all listed generated copies establishes stability, not full render correctness. Historical/build evidence outside the preparation baseline is explicitly listed below; observer hashes provide narrower evidence only. No current-source recommendation relies on unverified historical raw data.',
 ...unbaselined.map((entry) => `- ${link(entry.path)}: ${entry.disposition}`), '',
 '## Explicit unverified areas and limitations', '',
 ...unverifiedCoverage.map((entry) => `- **${entry.area}:** ${entry.reason}`),
 ...limitations.map((item) => `- ${item}`), '',
 '## Deterministic validation', '',
 `Result: **${passing ? 'pass' : 'fail / partial'}** for mandatory audit-artifact checks. File existence/parse, normalized required fields, unique IDs and verifier references, all 17 skills/21 significant components, A–H, evidence line bounds, source/distribution/report hashes, non-audit Git status, output privacy and English synthesis are checked. A deterministic artifact check does not certify application behavior. ${link(`${dir}/validation.json`,'machine validation')} records every assertion and any failure; ${link(`${dir}/audit.json`,'machine-readable audit')} retains all recommendation fields, verifier constraints and priorities.`, ''
);
const markdown = `${sections.join('\n')}\n`;
save('audit.md', markdown);
const ownReport = {
 task_id: 'F01', status, route: { assigned_model: 'sol', observed_model: 'gpt-6.1-sol', configured_provider: inputs.provider, provider_independently_observed: false, reasoning_effort: null, basis: 'Active developer model declaration; configured provider from run inputs, not a transport receipt.' },
 assigned_coverage: ['synthesis:all-17-skills','synthesis:all-significant-components','synthesis:aspects-A-H','synthesis:source-drift','synthesis:deterministic-validation'],
 actual_coverage: coverageRows.map((row) => row.component), aspects: Object.keys(aspectNames),
 inspected_paths: ['protocol.md','inputs.json','baseline.json','distribution-baseline.json','initial-status.txt', ...allReports.map((report) => `${report.task_id}.json`)].map((name) => `${dir}/${name}`).concat(['docs/index.md','catalog/skills.json']),
 source_read_scope: 'Saved evidence synthesis, inventory and byte/status validation only. No automatic repository semantic reread; no relevant changed source required one.',
 evidence: { primary_reports: reports.map((report) => `${dir}/${report.task_id}.json`), verification_reports: verifiers.map((report) => `${dir}/${report.task_id}.json`), runtime_record: `${dir}/workflow-results.json`, source_drift: `${dir}/F01-source-drift.json`, audit_md: `${dir}/audit.md`, audit_json: `${dir}/audit.json`, validation: `${dir}/validation.json` },
 findings: [], finding_references: recommendations.map((entry) => entry.id), confirmed_opportunities: confirmed.map((entry) => `${entry.id}: ${entry.title}`), already_optimized: existing.map((entry) => `${entry.id}: ${entry.conclusion}`), quick_changes: quick.map((entry) => `${entry.id}: ${entry.title}`), contract_changes: contracts.map((entry) => `${entry.id}: ${entry.title}`), hypotheses: hypotheses.map((entry) => `${entry.id}: ${entry.title}`),
 no_finding_checks: [{ area: 'No new synthesis-only production finding', result: 'Existing source evidence suffices; no new unassigned current component was discovered. All promoted references have an independent accepted/narrowed verdict.' }, { area: 'Preservation and source drift', result: 'No baseline or observer-hash differences; no changed source reread required. Existing non-audit worktree status and staged index retained.' }],
 required_fields_normalization: 'Source report aliases normalized explicitly; original reports retained. All protocol recommendation fields are in audit.json and audit.md.',
 recommended_order: order, limitations, unverified_areas: unverifiedCoverage, excluded_broader_claims: unresolved,
 measurements: 'No current time/token savings measured. Exact provider request events, actual concurrency and token usage unavailable. P12 four passing parser checks and P14 identity diagnostic retained as scoped primary observations only.',
 coverage_summary: '17/17 current skills; 21/21 assigned significant components; aspects A-H; 14 primary and 3 verifier files present. 27 unique finding references, 26 deduplicated families, 25 source-confirmed references and 2 research hypotheses; independent verdicts: 19 accepted, 8 narrowed.',
 prohibited_actions_performed: [], descendants_created: 0, workflows_created: 0,
 artifacts_written: audit.artifacts,
 report_path: `${dir}/F01.json`, audit_md: `${dir}/audit.md`, audit_json: `${dir}/audit.json`, validation_path: `${dir}/validation.json`,
 validation_status: passing ? 'pass' : 'fail / partial', completed_at: new Date().toISOString()
};
save('F01.json', ownReport);
const authored = ['audit.json','audit.md','F01.json','F01-source-drift.json'];
const privacy = authored.map((name) => {
 const text = fs.readFileSync(`${dir}/${name}`, 'utf8');
 return { path: `${dir}/${name}`, no_personal_absolute_paths: !/(?:\/home\/|\/Users\/|[A-Z]:\\Users\\)/.test(text), english_no_cyrillic: !/[\u0400-\u04ff]/.test(text), no_secret_literals: !/(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----)/.test(text) };
});
check('Authored reports are English and contain no personal paths or secret literals', privacy.every((entry) => entry.no_personal_absolute_paths && entry.english_no_cyrillic && entry.no_secret_literals), privacy);
check('All final deliverables exist and JSON outputs parse', targets.filter((name) => name !== 'validation.json').every((name) => fs.statSync(`${dir}/${name}`).isFile()) && ['audit.json','F01.json','F01-source-drift.json','workflow-results.json'].every((name) => !!readJson(name)), targets);
const finalPassing = checks.filter((entry) => entry.mandatory).every((entry) => entry.passed);
const validation = {
 task_id: 'F01', status: finalPassing ? 'pass' : 'fail', audit_status: finalPassing ? 'complete' : 'partial', captured_at: new Date().toISOString(),
 scope: 'Deterministic audit artifact/status/byte checks, not repository tests or application execution', checks,
 counts: { primary_reports: reports.length, verification_reports: verifiers.length, repair_reports: 0, adjudication_reports: 0, current_skills: currentSkills.length, significant_components: coverageRows.filter((row) => row.component.startsWith('component:')).length, mandatory_aspects: aspects.length, finding_references: recommendations.length, distinct_families: recommendations.length - 1, source_confirmed_references: confirmed.length, research_hypotheses: hypotheses.length, independently_accepted: recommendations.filter((entry) => entry.independent_verdict === 'accepted').length, independently_narrowed: recommendations.filter((entry) => entry.independent_verdict === 'narrowed').length, verifier_citation_ranges: rangeChecks.length, baseline_source_hashes: Object.keys(baseline.files).length, baseline_distribution_hashes: Object.keys(distribution.files).length, reported_hash_comparisons: reportedHashes.length },
 citation_checks: rangeChecks, output_privacy: privacy,
 runtime_record_note: 'Caller-supplied compact runtime record retained in value; original-language P12 strings are Unicode-escaped as supplied evidence, not authored synthesis prose. Actual provider events/tokens unavailable.',
 repairs_or_adjudications_required_for_retained_scope: [], unverified_broader_claims: unresolved,
 output_hashes_sha256: Object.fromEntries(targets.filter((name) => name !== 'validation.json').map((name) => [name, hash(fs.readFileSync(`${dir}/${name}`))])),
 full_tests: 'not run / unauthorized', build: 'not run / unauthorized', generation: 'not run / unauthorized', installation: 'not run / unauthorized', benchmark: 'not run / unauthorized',
 original_reports_preserved: true, non_audit_status_preserved: statusPreserved, staged_index_preserved: indexPreserved, final_head: finalHead,
 reproducibility: `${dir}/F01-synthesize.mjs is a one-shot audit assembler; it refuses to overwrite pre-existing outputs and must not be rerun against these files. It imports only Node standard-library APIs and executes only read-only Git status/identity commands.`
};
save('validation.json', validation);
console.log(JSON.stringify({ status: validation.status, audit_status: validation.audit_status, counts: validation.counts, failed_checks: checks.filter((entry) => !entry.passed), source_changes: sourceChanges, distribution_changes: distributionChanges, reported_hash_changes: reportedChanges, missing, unbaselined, output_files: targets, captured_at: validation.captured_at }, null, 2));
process.exitCode = finalPassing ? 0 : 1;
