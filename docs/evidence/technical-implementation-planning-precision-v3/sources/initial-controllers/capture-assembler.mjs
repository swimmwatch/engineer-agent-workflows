// One-off derivation of the existing evidence format from actual captures.
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {dirname,join,resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const control=dirname(fileURLToPath(import.meta.url)),repo=resolve(control,'../..'),out=join(repo,'docs/evidence/technical-implementation-planning-precision-v3');
const state=JSON.parse(await readFile(join(control,'control.json'),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const save=async(p,x)=>{await mkdir(dirname(p),{recursive:true});await writeFile(p,JSON.stringify(x,null,2)+'\n');};
const artifacts=new Map(),ref=async path=>{const relative=path.startsWith(out+'/')?path.slice(out.length+1):path,digest=sha(await readFile(join(out,relative)));artifacts.set(relative,{ref:relative,digest});return{ref:relative,digest};};
const capture=async p=>{const folder=join(out,p);for(const f of await readdir(folder)){if(/\.(?:json|jsonl|md|mjs)$/.test(f))await ref(join(folder,f));}};
const records=state.runs.filter(r=>r.matrix==='precision-v3');
if(records.length!==8||records.some(r=>r.status!=='product-checks-passed'))throw Error('Measured matrix is incomplete');
const preservation=[];
for(const variant of ['baseline','candidate']){const source=state.sources[variant],changed=[];for(const [p,digest]of Object.entries(source.manifest.files)){try{if(sha(await readFile(join(source.path,p)))!==digest)changed.push(p);}catch{changed.push(p);}}preservation.push({variant,sourceDigest:source.digest,fileCount:Object.keys(source.manifest.files).length,changed});}
await save(join(out,'sources/post-run-preservation.json'),{classification:'ACTUAL',checkedAt:new Date().toISOString(),sources:preservation});
if(preservation.some(s=>s.changed.length))throw Error('Frozen workflow source bytes changed');
const frozen=await ref('frozen-inputs.json'),sourceRefs={baseline:await ref('sources/baseline.json'),candidate:await ref('sources/candidate.json')};
const bundle=await ref('sources/comparison.json');await ref('sources/post-run-preservation.json');
const sourceResult=item=>item?.result?.structuredContent?.result;
const production=p=>!p.startsWith('docs/')&&!p.startsWith('.')&&!['test.mjs','test-process.mjs','unrelated.txt'].includes(basename(p))&&!p.endsWith('.test.mjs');
const actor=(s,role)=>({actorId:`${role}:${s.sessionId}`,sessionId:s.sessionId,actualModel:s.reportedModel});
async function evaluationError(e,folder){
 if(!e.error)return null;
 // JsonlClient.close intentionally kills its owned group and emits failure.
 // Preserve that raw error; recognize it only after captured successful completion.
 const records=(await readFile(join(folder,'evaluation.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
 const completed=records.findLast(r=>r.message.method==='turn/completed');
 const last=records.filter(r=>r.message.method==='item/completed'&&r.message.params.item.type==='agentMessage').at(-1);
 if(e.error==='App-server exited: SIGTERM'&&e.terminal==='completed'&&e.verdict&&completed?.message.params.turn.status==='completed'&&last?.atMs<=completed.atMs)return null;
 return e.error;
}
const evaluation=(runId,e,r)=>({runId,reviewerType:'external',status:e.verdict?.verdict,reviewerActorId:`review:${e.sessionId}`,reviewerSessionId:e.sessionId,reviewerModel:e.actualModel,evidenceRef:r.ref,evidenceDigest:r.digest,rawControllerError:e.error,teardownNote:e.error==='App-server exited: SIGTERM'?'Expected owned-process close after captured completed turn; raw diagnostic retained.':undefined});
const evaluations=[],runs=[],metrics=[];
for(const raw of records){
 const folder=join(out,'matrix',raw.id),result=await json(join(folder,'result.json')),e=await json(join(folder,'evaluation.json'));
 if(await evaluationError(e,folder)||!e.verdict)throw Error(`Missing usable independent evaluation: ${raw.id}`);
 const er=await ref(join(folder,'evaluation.json'));evaluations.push(evaluation(raw.id,e,er));await capture(`matrix/${raw.id}`);
 const plan=result.stages[0],impl=result.stages.slice(1),scenarioId=`${raw.fixture}-${raw.variant}`,ars=Array.from({length:raw.fixture==='b1'?5:4},(_,index)=>`${scenarioId}-AR-${index+1}`);
 const setupId=`setup:${raw.id}`,specPath=join(raw.app,`docs/specs/${raw.fixture}/spec.md`),specBytes=await readFile(specPath),specDigest=sha(specBytes);
 await mkdir(join(folder,'inputs'),{recursive:true});await writeFile(join(folder,'inputs/spec.md'),specBytes);
 const setup={classification:'SIMULATION',kind:'frozen-approved',depth:raw.fixture==='b1'?'Standard':'Lite',profiles:['core'],explicitFixtureScope:true,before:result.before,specificationDigest:specDigest,inputPolicy:frozen,note:'Frozen fixture setup, not a specification model run or real human consent.'};
 await save(join(folder,'inputs/setup.json'),setup);const setupRef=await ref(join(folder,'inputs/setup.json'));await ref(join(folder,'inputs/spec.md'));
 await mkdir(join(folder,'planning'),{recursive:true});for(const f of await readdir(join(raw.app,`docs/specs/${raw.fixture}/tasks`))){if(f.endsWith('.md')){await copyFile(join(raw.app,`docs/specs/${raw.fixture}/tasks`,f),join(folder,'planning',f));await ref(join(folder,'planning',f));}}
 await mkdir(join(folder,'final'),{recursive:true});for(const f of Object.keys(result.finalFiles).filter(p=>!p.startsWith('docs/'))){await mkdir(dirname(join(folder,'final',f)),{recursive:true});await copyFile(join(raw.app,f),join(folder,'final',f));await ref(join(folder,'final',f));}
 const ev=[],emit=(atMs,type,data={})=>ev.push({atMs,type,...data});
 emit(plan.startMs-5,'stage_started',{stage:'specification',evidenceRef:setupRef.ref});
 emit(plan.startMs-4,'profile_confirmation',{explicit:true,depth:setup.depth,profiles:['core'],classification:'SIMULATION',evidenceRef:setupRef.ref});
 emit(plan.startMs-3,'artifact_write',{stage:'specification',target:'specification-artifact',artifact:'spec.md',digest:specDigest,evidenceRef:`matrix/${raw.id}/inputs/spec.md`,observedBy:'fixture-setup'});
 emit(plan.startMs-2,'stage_completed',{stage:'specification',status:'passed',contractDigest:specDigest,evidenceRef:setupRef.ref});
 emit(plan.startMs,'stage_started',{stage:'planning',sessionId:plan.sessionId});
 const approved=plan.items.find(x=>x.item.tool==='specification_check_state'&&sourceResult(x.item)?.status==='pass');
 if(!approved)throw Error(`No actor approved input check: ${raw.id}`);
 emit(approved.atMs,'contract_read',{status:'approved',digest:specDigest,itemId:approved.item.id});
 const profile=plan.items.find(x=>x.item.type==='commandExecution'&&x.item.exitCode===0&&/core-planning\.md/.test(x.item.command));
 if(profile)emit(profile.atMs,'profile_reference_read',{stage:'planning',profile:'core',itemId:profile.item.id});
 for(const w of plan.writes)emit(w.atMs,'artifact_write',{stage:'planning',target:'planning-artifact',artifact:basename(w.path),path:w.path,itemId:w.itemId,digest:w.after});
 for(const p of e.verdict.packetEvidence??[])emit(plan.endMs-0.01,'packet_declared',{packetId:p.packetId,requirementIds:p.requirementIds,requiredProofs:p.requiredProofs.map(q=>q.testId),evidenceRef:er.ref});
 emit(plan.endMs,'stage_completed',{stage:'planning',status:plan.error?'incomplete':'passed'});
 emit(impl[0].startMs,'stage_started',{stage:'implementation'});
 const technicalAgreements=[];
 for(const s of impl){
  const pe=e.verdict.packetEvidence?.find(p=>p.stageId===s.stageId);if(!pe)throw Error(`Missing reviewed packet map: ${raw.id}/${s.stageId}`);
  const item=id=>{const x=s.items.find(x=>x.item.id===id);if(!x)throw Error(`Unresolved actual item ${raw.id}/${s.stageId}/${id}`);return x;};
  const red=pe.redItemId?item(pe.redItemId):null,green=pe.greenItemId?item(pe.greenItemId):null,check=pe.finalCheckItemId?item(pe.finalCheckItemId):null;
  const writes=s.writes.filter(w=>production(w.path));
  const begin=s.writes.find(w=>w.path==='test.mjs')?.atMs??red?.atMs??writes[0]?.atMs??s.startMs;
  emit(s.startMs,'packet_authorized',{packetId:pe.packetId,classification:'SIMULATION',source:`matrix/${raw.id}/${s.stageId}.jsonl`,evidence:'Explicit single-packet invocation prompt'});
  const prereq=s.items.filter(x=>x.atMs<=begin&&(x.item.tool==='specification_check_state'&&sourceResult(x.item)?.status==='pass'||x.item.type==='commandExecution'&&x.item.exitCode===0&&/git (?:rev-parse|status|diff)|verify-engineering-manual/.test(x.item.command)));
  if(prereq.length)emit(Math.min(begin-0.003,prereq.at(-1).atMs),'packet_prerequisites',{packetId:pe.packetId,status:'passed',itemIds:prereq.map(x=>x.item.id),evidenceRef:er.ref});
  emit(begin-0.001,'packet_started',{packetId:pe.packetId,sessionId:s.sessionId,observedBy:'derived-first-packet-action'});
  const testId=`${pe.packetId}:behavior`;
  if(red){if(red.item.exitCode===0)throw Error('Reviewed RED command actually passed');emit(red.atMs,'test_observation',{packetId:pe.packetId,testId,phase:'red',status:'failed',meaningful:pe.redMeaningful,contractAligned:pe.redMeaningful,requirementIds:pe.requirementIds,itemId:red.item.id,evidenceRef:er.ref});}
  for(const w of writes)emit(w.atMs,'artifact_write',{stage:'implementation',target:'production',packetId:pe.packetId,artifact:w.path,itemId:w.itemId,digest:w.after});
  if(green){if(green.item.exitCode!==0)throw Error('Reviewed GREEN command did not pass');emit(green.atMs,'test_observation',{packetId:pe.packetId,testId,phase:'green',status:'passed',meaningful:true,contractAligned:true,itemId:green.item.id});}
  for(const proof of pe.requiredProofs){
   const mutation=proof.mutationItemId?item(proof.mutationItemId):null,restored=proof.restoredItemId?item(proof.restoredItemId):null;
   if(mutation)emit(mutation.atMs,'test_observation',{packetId:pe.packetId,testId:proof.testId,phase:'prove',status:mutation.item.exitCode!==0?'failed':'passed',meaningful:true,contractAligned:true,mutationId:mutation.item.id,itemId:mutation.item.id,evidenceRef:er.ref});
   const isPassedTest=x=>x.item.type==='commandExecution'&&x.item.exitCode===0&&/--test|npm test/.test(x.item.command);
   const restoredTest=restored&&(isPassedTest(restored)?restored:s.items.find(x=>x.atMs>restored.atMs&&isPassedTest(x)));
   if(restoredTest)emit(restoredTest.atMs,'test_observation',{packetId:pe.packetId,testId:proof.testId,phase:'restored-green',status:'passed',mutationId:mutation?.item.id,itemId:restoredTest.item.id,restorationItemId:restored.item.id,evidenceRef:er.ref});
  }
  if(check){if(check.item.exitCode!==0)throw Error('Reviewed final command did not pass');emit(check.atMs+0.0001,'check',{stage:'implementation',packetId:pe.packetId,checkId:`${pe.packetId}:final`,status:'passed',itemId:check.item.id,note:check.item.id===green?.item.id?'Two facts from one actual command; no second execution claimed.':undefined});}
  emit(s.endMs-0.0001,'packet_completed',{packetId:pe.packetId,status:'passed',observedBy:'actor-checklist-and-completion-claim',evidenceRef:er.ref});
  if(raw.variant==='candidate'){
   const entry=pe.entryGateItemId?item(pe.entryGateItemId):null,exit=pe.exitGateItemId?item(pe.exitGateItemId):null;
   const gate=x=>x?{...sourceResult(x.item),atMs:x.atMs,itemId:x.item.id,observedBy:'actor',proposalDigest:sourceResult(x.item)?.proposal_digest,agreementRef:sourceResult(x.item)?.agreement_ref}:null;
   if(entry&&(entry.item.tool!=='planning_packet_check'||entry.item.arguments.packet_id!==pe.packetId)||exit&&(exit.item.tool!=='planning_packet_check'||exit.item.arguments.packet_id!==pe.packetId))throw Error('Reviewed readiness item belongs to another packet');
   const value=sourceResult(entry?.item);
   technicalAgreements.push({packetId:pe.packetId,requestId:pe.nativeQuestionRequestId,proposalDigest:value?.proposal_digest,agreementRef:value?.agreement_ref,firstWriteAtMs:writes[0]?.atMs,lastWriteAtMs:writes.at(-1)?.atMs,entry:gate(entry),exit:gate(exit)});
  }
 }
 emit(impl.at(-1).endMs,'stage_completed',{stage:'implementation',status:'passed'});
 const resultRef=await ref(join(folder,'result.json'));
 emit(result.verification.endMs,'external_acceptance',{status:result.verification.local.exitCode===0&&result.verification.oracle.exitCode===0?'passed':'failed',requirementIds:ars,evidenceRef:resultRef.ref,evidenceDigest:resultRef.digest});
 emit(result.verification.endMs+0.001,'evaluation_claim',{evidenceRef:er.ref,status:e.verdict.verdict});
 ev.sort((a,b)=>a.atMs-b.atMs);ev.forEach((x,i)=>x.seq=i+1);
 const tracePath=join(folder,'derived-trace.json');await save(tracePath,{classification:'ACTUAL',traceKind:'derived-trace',note:'Facts derived from raw captures; simulation setup/authorization stays labeled. Actor completion claims do not establish full quality: required proof observations and the independent verdict remain authoritative, including any incomplete baseline.',events:ev});const trace=await ref(tracePath);
 const phases=[...result.stages.map(s=>({stage:s.stage,sessionId:s.sessionId,startMs:s.startMs,endMs:s.endMs})),{stage:'verification',sessionId:`oracle:${raw.id}`,startMs:result.verification.startMs,endMs:result.verification.endMs}];
 const questions=result.stages.flatMap(s=>s.nativeQuestions),respondentMs=questions.reduce((n,q)=>n+q.answeredAtMs-q.askedAtMs,0),blockingRespondentMs=questions.filter(q=>q.blocking).reduce((n,q)=>n+q.answeredAtMs-q.askedAtMs,0),elapsedMs=phases.at(-1).endMs-phases[0].startMs,phaseMs=phases.reduce((n,p)=>n+p.endMs-p.startMs,0);
 const stageTokens=[];for(const s of result.stages){const records=(await readFile(join(folder,`${s.stageId}.jsonl`),'utf8')).trim().split('\n').map(JSON.parse);const last=records.filter(r=>r.message.method==='thread/tokenUsage/updated').at(-1);stageTokens.push({stageId:s.stageId,sessionId:s.sessionId,total:last?.message.params.tokenUsage.total??null});}
 const tokens=stageTokens.every(s=>s.total)?Object.fromEntries(Object.keys(stageTokens[0].total).map(k=>[k,stageTokens.reduce((n,s)=>n+s.total[k],0)])):null;
 const benchmark={clock:'monotonic-ms',startMs:phases[0].startMs,endMs:phases.at(-1).endMs,setupMs:result.setupMs,elapsedMs,respondentMs,blockingRespondentMs,orchestrationMs:elapsedMs-phaseMs,activeMs:phaseMs-blockingRespondentMs,phases,tokens,stageTokens};
 const sourceRefsForRun=await Promise.all([`${folder}/result.json`,`${folder}/evaluation.json`,...result.stages.map(s=>`${folder}/${s.stageId}.jsonl`)].map(ref));
 const comparisonOutcome=raw.variant==='baseline'&&e.verdict.verdict==='incomplete'&&e.verdict.packetEvidence.some(p=>p.requiredProofs.some(q=>!q.mutationItemId||!q.restoredItemId))?{status:'incomplete',findingCodes:['required-prove-missing'],evidenceRef:er.ref,evidenceDigest:er.digest}:undefined;
 runs.push({runId:raw.id,host:'codex',scenarioId,comparisonOutcome,provenance:{classification:'ACTUAL',actualHost:'codex',traceKind:'derived-trace',traceRef:trace.ref,traceDigest:trace.digest,bundleRef:bundle.ref,bundleDigest:bundle.digest,sourceRefs:sourceRefsForRun},stageActors:{specification:{actorId:setupId,sessionId:setupId,kind:'fixture-setup',actualModel:null},planning:actor(plan,'planning'),implementation:impl.map(s=>actor(s,'implementation'))},specificationSetup:{kind:'frozen-approved',status:'approved',...setupRef,sourceVersion:result.before.source_version,specificationVersion:result.before.specification_version,reviewRef:result.before.review_ref},workflowSource:{variant:raw.variant,...sourceRefs[raw.variant],sourceIdentity:result.workflowSourceDigest},benchmark,nativeQuestions:questions,technicalAgreements,events:ev});
 metrics.push({runId:raw.id,fixture:raw.fixture,variant:raw.variant,repetition:raw.repetition,sourceIdentity:result.workflowSourceDigest,benchmark,questionRounds:questions.length,toolCalls:result.stages.reduce((n,s)=>n+s.items.filter(x=>['commandExecution','mcpToolCall','dynamicToolCall'].includes(x.item.type)).length,0),firstAttemptSuccess:e.verdict.firstAttemptSuccess,correctiveCycles:e.verdict.correctiveCycles,qualityVerdict:e.verdict.verdict});
}
const focusedRuns=[];
for(const id of ['q3-partial-resume','q4-shared-drift','q5-execution-boundaries','q6-behavior-routing']){
 const folder=join(out,'focused',id),r=await json(join(folder,'result.json')),e=await json(join(folder,'evaluation.json'));if(await evaluationError(e,folder)||!e.verdict)throw Error('Focused evaluation is incomplete: '+id);
 await capture(`focused/${id}`);const rr=await ref(join(folder,'result.json')),er=await ref(join(folder,'evaluation.json'));evaluations.push(evaluation(id,e,er));
 const stages=(await readdir(folder)).filter(f=>f.endsWith('.json')&&!['result.json','evaluation.json'].includes(f));const actors={};for(const f of stages){const s=await json(join(folder,f));if(s.sessionId&&s.stage)(actors[s.stage]??=[]).push(actor(s,s.stage));}
 const obs=Object.fromEntries(e.verdict.observations.map(o=>[o.id,o.passed]));if(obs.materialChangeReturnedToPlanning!==undefined)obs.materialChangeReturnedTo=obs.materialChangeReturnedToPlanning?'planning':'unknown';if(obs.returnedToSpecification!==undefined)obs.returnedTo=obs.returnedToSpecification?'specification':'unknown';
 const events=[{seq:1,type:'evaluation_claim',status:e.verdict.verdict,evidenceRef:er.ref}];
 const rawRefs=await Promise.all((await readdir(folder)).filter(f=>f.endsWith('.jsonl')&&f!=='evaluation.jsonl').map(f=>ref(join(folder,f))));
 focusedRuns.push({runId:id,host:'codex',scenarioId:id,provenance:{classification:'ACTUAL',actualHost:'codex',traceKind:'derived-trace',traceRef:rr.ref,traceDigest:rr.digest,bundleRef:bundle.ref,bundleDigest:bundle.digest,sourceRefs:[rr,er,...rawRefs]},stageActors:actors,focusedObservations:{...obs,evidenceRef:rr.ref,evidenceDigest:rr.digest},events});
}
const roles=Object.fromEntries(['specification','planning','implementation','review'].map(x=>[x,state.model]));
await capture('sources');for(const p of ['precision-correction.json','sources/capture-source-manifest.json'])await ref(p);
const describe=values=>{const a=values.filter(x=>typeof x==='number').sort((a,b)=>a-b);return{n:a.length,median:a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:null,min:a[0]??null,max:a.at(-1)??null};};
const measures=r=>({elapsedMs:r.benchmark.elapsedMs,planningMs:r.benchmark.phases.filter(p=>p.stage==='planning').reduce((n,p)=>n+p.endMs-p.startMs,0),implementationMs:r.benchmark.phases.filter(p=>p.stage==='implementation').reduce((n,p)=>n+p.endMs-p.startMs,0),verificationMs:r.benchmark.phases.filter(p=>p.stage==='verification').reduce((n,p)=>n+p.endMs-p.startMs,0),setupMs:r.benchmark.setupMs,respondentMs:r.benchmark.respondentMs,orchestrationMs:r.benchmark.orchestrationMs,activeMs:r.benchmark.activeMs,questionRounds:r.questionRounds,toolCalls:r.toolCalls,totalTokens:r.benchmark.tokens?.totalTokens??null});
const summaries=[],pairs=[];
for(const fixture of ['b1','b2']){
 for(const variant of ['baseline','candidate']){const group=metrics.filter(r=>r.fixture===fixture&&r.variant===variant);summaries.push({fixture,variant,sourceIdentity:group[0]?.sourceIdentity,measures:Object.fromEntries(Object.keys(measures(group[0])).map(k=>[k,describe(group.map(r=>measures(r)[k]))]))});}
 for(const repetition of [1,2]){const baseline=metrics.find(r=>r.fixture===fixture&&r.variant==='baseline'&&r.repetition===repetition),candidate=metrics.find(r=>r.fixture===fixture&&r.variant==='candidate'&&r.repetition===repetition);if(!baseline||!candidate)throw Error('Paired repetition identity missing');const a=measures(baseline),b=measures(candidate);pairs.push({fixture,repetition,baseline:baseline.runId,candidate:candidate.runId,candidateMinusBaseline:Object.fromEntries(Object.keys(a).map(k=>[k,a[k]===null||b[k]===null?null:b[k]-a[k]]))});}
}
await save(join(out,'metrics.json'),{classification:'ACTUAL',runs:metrics,summaries,pairs,note:'Two repetitions are descriptive; simulation answers have no human deliberation delay. Unknown token totals remain null.'});await ref('metrics.json');
const evidence={schemaVersion:1,classification:'ACTUAL',selectedHostRoles:{codex:roles},fullPasses:[1,2].map(pass=>({pass,sourceRef:bundle.ref,sourceDigest:bundle.digest,sourceBeforeDigest:bundle.digest,sourceAfterDigest:bundle.digest,sourceChanged:false,runs:runs.filter(r=>r.runId.endsWith('-'+pass))})),holdoutRuns:[],focusedRuns,evaluations,artifacts:[...artifacts.values()]};
await save(join(out,'evidence.json'),evidence);console.log(JSON.stringify({runs:runs.length,focusedRuns:focusedRuns.length,evaluations:evaluations.length,artifacts:artifacts.size}));

