const dir = args.audit_dir;
const protocol = `${dir}/protocol.md`;
const limit = args.concurrency;
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 8) throw new Error('Invalid bounded pool size');
const tasks = [
  ['P01','sol',['spec-driven-development','planning-and-task-breakdown','incremental-implementation','design-planning'].map(x=>`skill:${x}`),'A B E','Canonical specification/planning/implementation/design skills and references: end-to-end repeated reads, progressive disclosure, approvals, handoffs, stage ownership, optional review gates, mechanical versus substantive final checking. Do not invoke skills or Penpot.'],
  ['P02','sol',['idea-refine','product-definition','technical-design','product-roadmap'].map(x=>`skill:${x}`),'A B C E','Four canonical product workflow skills/references: actual session and batch usage, interview context, review loops, exact source pins, stage boundaries, recovery. P07/P09 own deep implementation.'],
  ['P03','sol',['code-review-and-quality','security-and-hardening','doubt-driven-development'].map(x=>`skill:${x}`),'A B E','Three canonical quality/security/adversarial skills/references: overlapping checks, scoped follow-up, freshness, independent-review guarantees, concise handoff and optional versus mandatory gates.'],
  ['P04','luna',['context-engineering','context-scouting','interview-me'].map(x=>`skill:${x}`),'A B','Three canonical context/interview skills/references, including current local scouting and native question changes. Find repeated context work; preserve route selection/consent. Inspect only relevant host differences; escalate ambiguous cross-component contracts.'],
  ['P05','luna',['code-simplification','documentation-and-adrs','performance-optimization'].map(x=>`skill:${x}`),'A H','Three canonical maintenance skills/references: repeated instructions/context work, shared manual reuse, output size, verification and measurement discipline. Include evidence for no-finding areas.'],
  ['P06','sol',['component:specification-review'],'B C D E','MCP reviews.ts, review-model/followup/snapshots, corresponding tests and completeness reference: full/follow-up/scope expansion, inherited verdicts, freshness, read/record batch, changed source reads, receipts and final consistency. Current response-budget/read-efficiency work may already solve old issues.'],
  ['P07','sol',['component:product-review'],'B C D E','Product review.ts/review-blocks and tests: existing get/record batches, pagination/size, read reuse, source verification, inherited recheck/scope expansion, final consistency, stale/partial/unknown outcomes and benchmarks (do not run them).'],
  ['P08','sol',['component:workflow-storage','component:product-storage','component:transactions-and-recovery'],'C D H','state.ts, ledger.ts, product/storage.ts, product/operations.ts and tests: locks/interprocess concurrency, transaction/atomicity/replay/receipts, serialization, request-local reuse, freshness and recovery. Establish guarantees before proposing efficiency changes.'],
  ['P09','sol',['component:product-sessions-context','component:product-roadmap-tasks','component:product-documents-amendments'],'B C D H','Product sessions/context/interview/documents, roadmap/tasks/bindings and definition/technical paths: real transitions, session_call and sources batches, amendment activation, exact inputs, reconciliation/idempotency/recovery. Focused flow exploration; P07/P08 own deep review/storage.'],
  ['P10','sol',['component:scenario-decisions-requirements','component:scope-planning-design','component:catalog-experience'],'B C D','decisions/requirements/scope/planning/checks/design/penpot/catalog/experience/service and tests: existing find/get/list/batch, repeated validation/parsing, lifecycle/errors, instruction-to-scenario use. This is code integration audit, not a Penpot design; no Penpot invocation.'],
  ['P11','luna',['component:canonical-shared-resources','component:generation-validation','component:host-distributions-packaging'],'F A','Generator/renderer/distribution/catalog/skill-document validators, shared ownership, all 3 generated hosts including current Harness export: fidelity/leakage, digests, rollback, check mode, packaging and size constraints. Static read-only comparison; do not execute generation/check/pack/install.'],
  ['P12','sol',['component:test-runner-ci','component:build-development-cycle','component:lifecycle-qualification'],'G H','Root/package scripts, run-tests/build-dev, both CI workflows, lifecycle/qualification/test isolation and benchmark harness. Find duplicate builds/checks/resource competition. Only you may run a selected safe existing read-only test after checking side effects/prebuilt identity; no build/generation/pack/full suite/global config.'],
  ['P13','luna',['component:documentation-existing-workflows','component:measurement-evidence'],'B F H','README and current docs/index/local-development/product-workflows/context-scouting/deepseek-harness; bounded relevant existing workflow scripts/evidence. Distinguish planned/implemented/runtime/old evidence/fresh measurement. Discover omitted meaningful components. Avoid historical copy crawl or managed YAML parsing.'],
  ['P14','sol',['component:mcp-contract-runtime','component:response-budgets-sources'],'C D H','MCP server/api/main/runtime-info/diagnostics/metadata/source/response-budget and product/tools plus schema loader/config/build-runtime scripts: published envelopes/batch schemas, response limits, request isolation, initialization/capability discovery and serving identity versus checkout. Schema inspection only for explicit contract conflicts; no live YAML parsing.']
].map(([id,model,coverage,aspects,scope])=>({id,model,coverage,aspects,scope}));
const findingSchema = {type:'object',additionalProperties:false,properties:{id:{type:'string'},title:{type:'string'},evidence:{type:'array',items:{type:'string'}},classification:{type:'string',enum:['measured','source-confirmed','hypothesis']},needs_clarification:{type:'boolean'}},required:['id','title','evidence','classification','needs_clarification']};
const resultSchema = {type:'object',additionalProperties:false,properties:{task_id:{type:'string'},status:{type:'string',enum:['complete','partial','blocked','transient_failure']},coverage:{type:'array',items:{type:'string'}},finding_ids:{type:'array',items:{type:'string'}},findings:{type:'array',items:findingSchema},report_path:{type:'string'},limitations:{type:'array',items:{type:'string'}},transient_evidence:{type:'string'}},required:['task_id','status','coverage','finding_ids','findings','report_path','limitations','transient_evidence']};
const verifySchema = {type:'object',additionalProperties:false,properties:{task_id:{type:'string'},status:{type:'string',enum:['complete','partial','blocked','transient_failure']},report_path:{type:'string'},coverage:{type:'array',items:{type:'string'}},reviewed_finding_ids:{type:'array',items:{type:'string'}},accepted_ids:{type:'array',items:{type:'string'}},narrowed_ids:{type:'array',items:{type:'string'}},rejected_ids:{type:'array',items:{type:'string'}},disputed_ids:{type:'array',items:{type:'string'}},no_finding_samples:{type:'array',items:{type:'string'}},limitations:{type:'array',items:{type:'string'}}},required:['task_id','status','report_path','coverage','reviewed_finding_ids','accepted_ids','narrowed_ids','rejected_ids','disputed_ids','no_finding_samples','limitations']};
let active = 0;
let peak = 0;
let starts = 0;
let repairs = 0;
let adjudications = 0;
const events = [];
function valid(result,id,schemaKind='primary') {
  if (!result || result.task_id !== id || result.report_path !== `${dir}/${id}.json`) return false;
  if (schemaKind === 'primary') {
    const ids = result.findings.map(x=>x.id);
    if (new Set(ids).size !== ids.length || ids.some(x=>!result.finding_ids.includes(x)) || result.finding_ids.some(x=>!ids.includes(x))) return false;
  }
  return true;
}
async function invoke(id,model,prompt,schema,phaseName) {
  if (starts >= 23) throw new Error('Audit agent budget exhausted');
  starts++;
  active++;
  peak = Math.max(peak,active);
  const seq = starts;
  events.push({seq,id,model,state:'requested'});
  try {
    const result = await agent(`Recommendation-only process audit. Read ${protocol} first and follow applicable project/personal instructions. Do not create descendants or workflows. Preserve all existing changes. Only write your own unique report ${dir}/${id}.json (and uniquely named supporting audit evidence if necessary). Never run audited skills, generation, installation, publishing, commit, push, build or full tests. Do not parse live managed YAML; discover scenario MCP tools if needed. Saved artifacts must be English and contain no secrets or personal absolute paths. You are assigned model ${model}; record the actual route if observable. Return via the required structured output, not send_message.\n\n${prompt}\n\nWrite the full evidence-rich report BEFORE returning. Compact returned report_path must be exactly ${dir}/${id}.json and task_id exactly ${id}. A partial/blocked check is not complete.`,{label:id,phase:phaseName,provider:args.provider,model:args[model],schema});
    events.push({seq,id,model,state:result===null?'null':'returned',status:result?.status??'missing'});
    return result;
  } finally { active--; }
}
async function pool(items,work) {
  let next=0;
  const output=new Array(items.length).fill(null);
  await parallel(Array.from({length:Math.min(limit,items.length)},()=>async()=>{
    while(next<items.length) {
      const index=next++;
      output[index]=await work(items[index],index);
    }
    return true;
  }));
  return output;
}
phase('Parallel audit');
log(`Task map: ${tasks.length} independent primary tasks; bounded pool ${limit}. Each slot immediately takes the next task.`);
const primary = await pool(tasks,async task=>{
  const raw=await invoke(task.id,task.model,`Task ${task.id}; aspects ${task.aspects}; assigned coverage ${JSON.stringify(task.coverage)}.\n${task.scope}\nEvery finding must follow the full recommendation fields in the protocol, with exact source lines, current optimizations, failure/work scenario, minimal change, qualitative impact, guarantees, measurement plan, complexity and dependencies. Distinguish measured/source-confirmed/hypothesis. Include inspected_paths and no-finding evidence. Return coverage only for actually inspected areas.`,resultSchema,'Parallel audit');
  const result=valid(raw,task.id)?raw:null;
  const missingCoverage=task.coverage.filter(x=>!result?.coverage.includes(x));
  const needsRecovery=!result;
  const confirmedTransient=result?.status==='transient_failure' && result.transient_evidence.length>0;
  const needsClarification=result?.findings.some(x=>x.needs_clarification);
  let repair=null;
  if ((needsRecovery||confirmedTransient||needsClarification||missingCoverage.length) && repairs<args.repair_budget) {
    const repairId=`R${String(++repairs).padStart(2,'0')}`;
    repair=await invoke(repairId,'sol',`Targeted follow-up for ${task.id}, not a restart of the audit. Original assignment: ${task.scope}. Assigned coverage ${JSON.stringify(task.coverage)}. Original compact result ${JSON.stringify(raw)}. Missing returned coverage ${JSON.stringify(missingCoverage)}. First inspect the existing ${dir}/${task.id}.json if it exists. For null/malformed output recover already-saved evidence without re-auditing. If no saved report exists and no confirmed transient evidence exists, mark missing/blocked; do not blindly retry. Only one retry is allowed for a confirmed transient failure. Resolve only the named uncertainty or omitted assigned area with targeted source reads; keep all previous artifacts. Explain whether evidence repairs the original coverage. Use your own finding IDs prefixed ${repairId}. No full tests/build/generation.`,resultSchema,'Targeted clarification');
    if(!valid(repair,repairId)) repair=null;
  }
  return {task_id:task.id,assigned_coverage:task.coverage,aspects:task.aspects,primary:result,repair,missing_initial_coverage:missingCoverage,raw_result_valid:result!==null};
});
phase('Independent verification');
const groups=[
  {id:'V01',ids:['P01','P02','P03','P06','P07'],scope:'Workflow and review ownership; full/follow-up/expanded review, final mechanical checks versus substantive consistency, source freshness and independent-review guarantees.'},
  {id:'V02',ids:['P08','P09','P10','P14'],scope:'MCP contract/state/concurrency/atomicity, batch semantics, request-local reuse, source isolation, idempotency/replay and recovery.'},
  {id:'V03',ids:['P04','P05','P11','P12','P13'],scope:'Context reuse, consent, generated portability, existing optimization mechanisms, packaging/test/CI/development overhead, docs and measurement credibility.'}
];
const verification=await pool(groups,async group=>{
  const assigned=primary.filter(x=>group.ids.includes(x.task_id));
  const checked=await invoke(group.id,'sol',`Independent verification, not author agreement. Focus ${group.scope}. Read these saved primary/repair reports and compact map: ${JSON.stringify(assigned)}. Verify every significant source-confirmed/measured recommendation in this group against relevant current source and tests; hypotheses remain unmeasured. Check whether existing mechanisms already solve it, preserve guarantees, narrow/reject overclaims, deduplicate across reports and sample representative no-finding skills/components. Do not reread the whole repository or all generated copies. Your report must list per-finding verdicts accepted/narrowed/rejected/disputed/not_verified with evidence, duplication links and any replacement minimal recommendation. Record exact IDs that need material adjudication and concrete questions. Missing report/evidence is not a pass.`,verifySchema,'Independent verification');
  const result=valid(checked,group.id,'verification')?checked:null;
  let adjudication=null;
  if(result?.disputed_ids.length && adjudications<args.adjudication_budget) {
    const id=`A${String(++adjudications).padStart(2,'0')}`;
    const answer=await invoke(id,'sol',`Targeted independent adjudication for verifier ${group.id}. Read ${result.report_path} and only the source/primary reports needed for disputed finding IDs ${JSON.stringify(result.disputed_ids)}. Resolve the concrete questions, check existing mechanisms and guarantees; do not restart the audit. Write per-ID accepted/narrowed/rejected/disputed/not_verified verdicts and supporting lines. Include a representative no-finding sample only if needed to resolve the dispute. Your compact accepted/narrowed/rejected/disputed IDs must refer to the original findings.`,verifySchema,'Targeted adjudication');
    if(valid(answer,id,'verification')) adjudication=answer;
  }
  return {group:group.id,task_ids:group.ids,verification:result,adjudication};
});
phase('Evidence synthesis');
const deterministicChecks={
  unique_task_ids:new Set(tasks.map(x=>x.id)).size===tasks.length,
  required_skill_count:tasks.flatMap(x=>x.coverage).filter(x=>x.startsWith('skill:')).length,
  primary_return_count:primary.filter(x=>x.primary!==null).length,
  repair_return_count:primary.filter(x=>x.repair!==null).length,
  verifier_return_count:verification.filter(x=>x.verification!==null).length,
  missing_primary_tasks:primary.filter(x=>x.primary===null).map(x=>x.task_id),
  missing_verifiers:verification.filter(x=>x.verification===null).map(x=>x.group)
};
const plannedSynthesisSeq=starts+1;
const runRecord={primary,verification,deterministic_checks:deterministicChecks,starts_before_synthesis:starts,expected_total_starts:plannedSynthesisSeq,scheduled_peak:peak,scheduled_peak_note:'Maximum simultaneously pending agent() calls, not independently observed provider request concurrency.',events,limits_file:`${dir}/inputs.json`,baseline_file:`${dir}/baseline.json`};
const finalSchema={type:'object',additionalProperties:false,properties:{task_id:{type:'string'},status:{type:'string',enum:['complete','partial','blocked']},report_path:{type:'string'},audit_md:{type:'string'},audit_json:{type:'string'},validation_path:{type:'string'},confirmed_opportunities:{type:'array',items:{type:'string'}},already_optimized:{type:'array',items:{type:'string'}},quick_changes:{type:'array',items:{type:'string'}},contract_changes:{type:'array',items:{type:'string'}},hypotheses:{type:'array',items:{type:'string'}},recommended_order:{type:'array',items:{type:'string'}},limitations:{type:'array',items:{type:'string'}},measurements:{type:'string'},coverage_summary:{type:'string'}},required:['task_id','status','report_path','audit_md','audit_json','validation_path','confirmed_opportunities','already_optimized','quick_changes','contract_changes','hypotheses','recommended_order','limitations','measurements','coverage_summary']};
const final=await invoke('F01','sol',`Synthesize the audit from saved evidence and coverage, not a repository reread. Read ${dir}/inputs.json and baseline.json, then save the following runtime record as ${dir}/workflow-results.json: ${JSON.stringify(runRecord)}. You are the only writer of audit.md, audit.json, validation.json, workflow-results.json and your F01.json. Read primary, repair, verification and adjudication JSON files as needed. Deterministically validate file existence, required report fields, unique finding references, all current 17 skills and significant component coverage and aspects A-H. A returned path alone is not proof of file existence. Use code only for audit JSON/byte hashing/status; never parse live managed YAML. Reconcile contradictory/duplicate findings and only promote independently verified accepted/narrowed recommendations. Unverified/hypothesis findings must stay separate. Perform a final drift comparison against baseline source hashes and reported inspected_paths/citations; re-read only changed relevant sources and re-evaluate affected conclusions. Record new meaningful unassigned components as explicit unverified coverage, not success. Check final HEAD/status and preserve every non-audit change. Save a source-drift evidence JSON and deterministic validation.json. Include all protocol-required recommendation fields, existing optimizations, quick changes versus contract changes versus research hypotheses, dependencies/priorities, actual models/counts and conditional capacity limits. Scheduled peak is not actual model request concurrency. Source-confirmed counts/structural bytes are not measured time/token savings. If exact runtime events or token usage are unavailable, say unavailable; do not search unrelated sessions or credentials. Capture real wall-clock timestamps via a safe tool if useful. Full tests/build/generation were not authorized, so do not mark them passed. audit.md and audit.json must be English and contain no personal absolute paths. Keep primary/partial outputs. Your final returned status is complete only if mandatory coverage and validation really pass; otherwise partial with explicit unverified areas. Return a concise Russian-ready list of substantive conclusions as English structured strings.`,finalSchema,'Evidence synthesis');
return {status:final?.status??'failed',result:final,agents_started:starts,scheduled_peak:peak,deterministic_checks:deterministicChecks,primary_reports:primary.map(x=>({task_id:x.task_id,report:x.primary?.report_path??null,repair:x.repair?.report_path??null})),verification_reports:verification.map(x=>({group:x.group,report:x.verification?.report_path??null,adjudication:x.adjudication?.report_path??null})),audit_dir:dir};
