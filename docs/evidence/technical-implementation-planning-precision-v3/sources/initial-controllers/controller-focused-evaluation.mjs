import {readFile,writeFile,mkdir,copyFile,chmod,rm} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {JsonlClient} from '../../docs/research/workflow-probe-plans/p03/rpc.mjs';
const control=dirname(fileURLToPath(import.meta.url)),repo=resolve(control,'../..');
const state=JSON.parse(await readFile(join(control,'control.json'),'utf8'));
const sha=x=>createHash('sha256').update(x).digest('hex');
const redact=x=>typeof x==='string'?x.replaceAll(state.root,'$TRIAL_ROOT').replaceAll(repo,'$SOURCE_ROOT').replaceAll(homedir(),'$USER_HOME'):Array.isArray(x)?x.map(redact):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>!/(access.?token|refresh.?token|id.?token|password|secret|email|accountId|authorization|encrypted_content)/i.test(k)).map(([k,v])=>[k,redact(v)])):x;
const cases={
 'q3-partial-resume':['acceptedOnly','nonAnswerPending','savedAnswerReused'],
 'q4-shared-drift':['dependentAgreementsStale','independentAgreementReady','behavioralVersionUnchanged'],
 'q5-execution-boundaries':['legacyStoppedBeforeWrites','privateHelperCompleted','materialChangeReturnedToPlanning'],
 'q6-behavior-routing':['returnedToSpecification','behavioralReviewInvalidated','noProductionWrites'],
};
const schema={type:'object',additionalProperties:false,required:['scenarioId','verdict','observations','findings'],properties:{scenarioId:{type:'string'},verdict:{type:'string',enum:['passed','failed','incomplete']},observations:{type:'array',items:{type:'object',additionalProperties:false,required:['id','passed','evidence'],properties:{id:{type:'string'},passed:{type:'boolean'},evidence:{type:'string'}}}},findings:{type:'array',items:{type:'string'}}}};
for(const [id,required] of Object.entries(cases)){
 if(process.argv[2]&&process.argv[2]!==id)continue;
 const folder=join(repo,'docs/evidence/technical-implementation-planning-precision-v3/focused',id),home=join(state.root,'focused-review-homes',id);
 await readFile(join(folder,'result.json'));await mkdir(home,{recursive:true,mode:0o700});
 const auth=join(process.env.CODEX_HOME??join(homedir(),'.codex'),'auth.json'),before=sha(await readFile(auth));await copyFile(auth,join(home,'auth.json'));await chmod(join(home,'auth.json'),0o600);
 await writeFile(join(home,'config.toml'),'[analytics]\nenabled=false\n[features]\nmulti_agent=false\n',{mode:0o600});
 const records=[],items=[];let thread,terminal,error,finish,closing=false,closeDiagnostic;const done=new Promise(r=>finish=r);
 const client=new JsonlClient('codex',{cwd:repo,maxLineBytes:8*1024*1024,env:{PATH:process.env.PATH,HOME:home,CODEX_HOME:home,LANG:'C.UTF-8',DISABLE_TELEMETRY:'1'},record:(direction,message)=>{if(message.method?.startsWith('account/')||/reasoning/i.test(message.method??'')||message.params?.item?.type==='reasoning')return;records.push({atMs:performance.now(),direction,message:redact(message)});}});
 client.on('notification',m=>{if(m.method==='item/completed'&&m.params.item.type!=='reasoning')items.push({atMs:performance.now(),item:redact(m.params.item)});if(m.method==='turn/completed'){terminal=m.params.turn;finish();}});client.on('failure',e=>{if(closing)closeDiagnostic=e.message;else{error=e.message;records.push({atMs:performance.now(),direction:'transport-error',message:{error:e.message}});finish();}});
 const startMs=performance.now();console.log(JSON.stringify({scenario:id,event:'independent-evaluation-started'}));
 try{
  await client.request('initialize',{clientInfo:{name:'technical-agreement-focused-evaluator',version:'1'},capabilities:{experimentalApi:true}});client.notify({method:'initialized',params:{}});
  thread=await client.request('thread/start',{cwd:repo,model:state.model,approvalPolicy:'never',sandbox:'read-only',ephemeral:true});
  if(thread.model!==state.model||thread.sandbox?.type!=='readOnly')throw Error('Evaluator isolation mismatch');
  const prompt=`Independently evaluate only actual focused qualification ${id}. Read every raw stage JSON/JSONL and result.json under ${folder}, plus frozen-inputs.json in its parent. Read necessary matching packet/plan/source files under ${join(state.root,'focused')}; the result uses $TRIAL_ROOT for ${state.root}. Do not edit, run implementation, read workflow YAML/.workflow files directly, or inspect other trials/reviewer conclusions/hidden oracle source or answer rubric. Repository instructions still apply; all shell commands use rtk. No MCP is configured: captured real scenario results are the read-only evidence, and any unavailable fact remains unknown. Return observations for exactly ${JSON.stringify(required)}, each with exact capture path and item.id or trace index. Check actual native partial response/dismissal and reused accepted reference for Q3; dependent stale/stale versus independent ready plus unchanged specification for Q4; legacy no-production-write stop, permitted private serialization helper with actual passing local/oracle outputs, and material signature/class/ownership request routed to planning before writes for Q5; actual actor routing of behavioral exit 2 to 3 back to specification before writes plus subsequent real MCP review invalidation after the explicitly SIMULATION fixture-owner amendment for Q6. Preconfirmed agreement seeding and owner amendments are SIMULATION setup, never fresh native answers or real human consent. Judge actual model behavior and observed guards, not orchestrator labels. Missing required evidence is incomplete, never pass; terminal completed alone is insufficient. Do not make the user's speed/quality tradeoff decision.`;
  const boundedRead=' Read structured capture files locally with Node or Python, first extracting bounded item metadata and then the exact decisive arguments/results/output by item ID. Do not dump multiple large capture files in one command: result.json includes duplicate actor payloads. This changes only reading efficiency, not the required observations or verdict rules.';
  await client.request('turn/start',{threadId:thread.thread.id,input:[{type:'text',text:prompt+boundedRead}],model:state.model,effort:state.effort,outputSchema:schema});
  await Promise.race([done,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('Evaluation deadline exceeded')),600000);t.unref();})]);if(terminal?.status!=='completed')throw Error(error??'Incomplete focused evaluation');
 }catch(e){error=e.message;}finally{closing=true;await client.close();await rm(home,{recursive:true,force:true});if(sha(await readFile(auth))!==before)error='Source authentication changed independently';}
 let verdict;try{verdict=JSON.parse(items.filter(x=>x.item.type==='agentMessage').at(-1)?.item.text);}catch{error=error??'Missing structured evaluation';}
 const result={classification:'ACTUAL',scenarioId:id,sessionId:thread?.thread?.id??null,actualModel:thread?.model??null,startMs,endMs:performance.now(),terminal:terminal?.status??'incomplete',error:error??null,closeDiagnostic:closeDiagnostic??null,verdict:verdict??null,items};
 await writeFile(join(folder,'evaluation.jsonl'),records.map(x=>JSON.stringify(x)).join('\n')+'\n');await writeFile(join(folder,'evaluation.json'),JSON.stringify(redact(result),null,2)+'\n');console.log(JSON.stringify({scenario:id,event:'independent-evaluation-finished',error:result.error,verdict:verdict?.verdict??null}));
}

