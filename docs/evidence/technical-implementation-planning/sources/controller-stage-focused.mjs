import { readFile, writeFile, mkdir, copyFile, chmod, rm, readdir } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { JsonlClient } from "../../docs/research/workflow-probe-plans/p03/rpc.mjs";
import { connect } from "./mcp.mjs";
const control=dirname(fileURLToPath(import.meta.url)),repo=resolve(control,"../..");
const state=JSON.parse(await readFile(join(control,"control.json"),"utf8"));
const registry=JSON.parse(await readFile(join(repo,"tests/fixtures/workflow-loop/technical-agreement-registry.json"),"utf8"));
const answers=JSON.parse(await readFile(join(repo,"tests/fixtures/workflow-loop/technical-agreement-answers.json"),"utf8"));
const sha=x=>createHash("sha256").update(x).digest("hex");
const now=()=>performance.now();
const output=join(repo,"docs/evidence/technical-implementation-planning/initial");await mkdir(output,{recursive:true});
for(const [file,digest]of Object.entries(state.fixtureDigests)){if(sha(await readFile(join(repo,"tests/fixtures/workflow-loop",file)))!==digest)throw Error("Frozen fixture drift: "+file);}
const redact=value=>{
 if(typeof value==="string")return value.replaceAll(state.root,"$TRIAL_ROOT").replaceAll(repo,"$SOURCE_ROOT").replaceAll(homedir(),"$USER_HOME");
 if(Array.isArray(value))return value.map(redact);
 if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([k])=>!/(access.?token|refresh.?token|id.?token|password|secret|email|accountId|authorization|encrypted_content)/i.test(k)).map(([k,v])=>[k,redact(v)]));
 return value;
};
function snapshot(app){const files={};function walk(dir,prefix=""){for(const e of readdirSync(dir,{withFileTypes:true})){if([".git",".tmp",".workflow",".mcp-home",".product-store"].includes(e.name))continue;const p=prefix+e.name;if(e.isDirectory())walk(join(dir,e.name),p+"/");else if(e.isFile()&&!/(?:^|\/)(?:manifest|decisions|catalog|experience)\.yaml$/.test(p))files[p]=sha(readFileSync(join(dir,e.name)));}}walk(app);return files;}
function respondent(question,fixture){
 const options=question.options??[],text=(question.question??"").toLowerCase();
 const preferred=options.find(o=>/function|stateless|reuse|existing|функци|существующ/i.test(o.label+" "+o.description)&&!/class|hierarch|класс/i.test(o.label));
 if(preferred)return [preferred.label];
 const depth=fixture==="b1"?"standard":"lite";
 const scoped=options.find(o=>o.label.toLowerCase().includes(depth));if(scoped&&/depth|profile|scope|глубин|профил/i.test(text))return[scoped.label];
 if(/commit|install|publish|коммит|установ|публикац/i.test(text))return["SIMULATION: no commit, installation, publication or other external action is authorized."];
 const accept=options.find(o=>/accept|confirm|agree|approve|принять|соглас|подтверд/i.test(o.label)&&!/reject|revise|decline|отклон/i.test(o.label));
 if(accept)return[accept.label];
 const recommended=options.find(o=>/recommended|рекоменд/i.test(o.label+" "+o.description));if(recommended&&!/class|hierarch|класс/i.test(recommended.label))return[recommended.label];
 return["SIMULATION response to this question: "+answers.scenarios[fixture].preferences.join(" ")+" "+answers.commonAnswers.agreement];
}
async function save(path,value){await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(redact(value),null,2)+"\n");}
export async function stage(run,name,packet){
 const source=state.sources[run.sourceKey??run.variant].path,skill=name==="planning"?"planning-and-task-breakdown":"incremental-implementation";
 const skillPath=join(source,"plugins/codex/engineer-agent-workflows/skills",skill,"SKILL.md");
 const stageId=run.stageId??(packet?`implementation-${packet}`:"planning"),folder=join(run.captureRoot??output,run.id);await mkdir(folder,{recursive:true});
 const home=join(state.root,"homes",run.id,stageId);await mkdir(home,{recursive:true,mode:0o700});await mkdir(join(run.app,".tmp"),{recursive:true});
 const auth=join(process.env.CODEX_HOME??join(homedir(),".codex"),"auth.json"),authBefore=sha(await readFile(auth));await copyFile(auth,join(home,"auth.json"));await chmod(join(home,"auth.json"),0o600);
 const config=`[analytics]\nenabled=false\n[features]\ndefault_mode_request_user_input=true\n[sandbox_workspace_write]\nnetwork_access=false\nexclude_slash_tmp=true\nexclude_tmpdir_env_var=true\n[mcp_servers.workflow]\ncommand=${JSON.stringify(process.execPath)}\nargs=[${JSON.stringify(join(source,"packages/engineer-agent-workflow-mcp/dist/main.js"))}]\nrequired=true\n[mcp_servers.workflow.env]\nEAW_PRODUCT_DATA_DIR=${JSON.stringify(join(state.root,"product-store",run.id))}\n`;
 const approvedFixtureTools=["specification_check_state","planning_question_prepare","planning_question_record_answer","planning_question_record_no_answer"];
 const permissionConfig=approvedFixtureTools.map(name=>`\n[mcp_servers.workflow.tools.${name}]\napproval_mode="approve"\n`).join("");
 const effectiveConfig=(config+permissionConfig).replace("default_mode_request_user_input=true\n","default_mode_request_user_input=true\nmulti_agent=false\n");
 await writeFile(join(home,"config.toml"),effectiveConfig,{mode:0o600});
 const records=[],questions=[],writes=[],items=[];let lastFiles=snapshot(run.app),terminal,finish,thread;
 const completion=new Promise(r=>finish=r);const record=(direction,message)=>{if(message.method?.startsWith("account/")||/reasoning/i.test(message.method??""))return;if(message.params?.item?.type==="reasoning")return;records.push({atMs:now(),direction,message:redact(message)});};
 class TrialClient extends JsonlClient {receive(message){if(message.id!==undefined&&message.method==="item/tool/requestUserInput"){
   record("receive",message);const askedAtMs=now();let outcome="answered",explicit=true;
   const latestPrepared=items.filter(x=>x.item.type==="mcpToolCall"&&x.item.tool==="planning_question_prepare").at(-1)?.item.result?.structuredContent?.result;
   let supplied=Object.fromEntries(message.params.questions.map(q=>[q.id,{answers:respondent(q,run.fixture)}]));
   if(run.questionPolicy==="unanswered"){supplied={};outcome="dismissed";explicit=false;}
   if(run.questionPolicy==="partial-first"&&latestPrepared?.proposals?.length){
     if(!run.partialAnswerSent){const first=latestPrepared.proposals[0];supplied=Object.fromEntries(message.params.questions.map(q=>[q.id,{answers:[`SIMULATION: Accept only proposal ${first.id} for packet ${first.packet_id}. Leave every other proposal unresolved; this does not authorize implementation.`]}]));run.partialAnswerSent=true;}
     else{supplied={};outcome="dismissed";explicit=false;}
   }
   const answeredAtMs=now();questions.push({requestId:String(message.id),askedAtMs,answeredAtMs,blocking:message.params.isBlocking===true,outcome,explicit,questions:message.params.questions,answers:supplied});this.send({id:message.id,result:{answers:supplied}});console.log(JSON.stringify({run:run.id,stage:stageId,event:"native-question",round:questions.length}));return;}super.receive(message);}}
 const client=new TrialClient("codex",{cwd:run.app,env:{PATH:process.env.PATH,HOME:home,CODEX_HOME:home,TMPDIR:join(run.app,".tmp"),npm_config_cache:join(run.app,".tmp/npm"),LANG:"C.UTF-8",DISABLE_TELEMETRY:"1"},record});
 client.on("notification",message=>{if(message.method==="turn/completed"){terminal=message.params.turn;finish();}if(message.method==="item/completed"){
   const item=message.params.item;if(item?.type!=="reasoning")items.push({atMs:now(),item:redact(item)});
   const next=snapshot(run.app);for(const p of new Set([...Object.keys(lastFiles),...Object.keys(next)]))if(lastFiles[p]!==next[p])writes.push({atMs:now(),path:p,before:lastFiles[p]??null,after:next[p]??null,itemId:item?.id});lastFiles=next;
 }});client.on("failure",error=>{records.push({atMs:now(),direction:"transport-error",message:{error:error.message}});finish();});
 let startMs,endMs,error;
 try{
  await client.request("initialize",{clientInfo:{name:"technical_agreement_qualification",version:"1"},capabilities:{experimentalApi:true}});client.notify({method:"initialized",params:{}});
  await client.request("skills/extraRoots/set",{extraRoots:[join(source,"plugins/codex/engineer-agent-workflows/skills")]});
  thread=await client.request("thread/start",{cwd:run.app,model:state.model,approvalPolicy:"never",sandbox:"workspace-write",ephemeral:true});if(thread.model!==state.model)throw Error("Reported model differs from frozen selection");
  const roots=thread.runtimeWorkspaceRoots;
  if(thread.cwd!==run.app||thread.approvalPolicy!=="never"||thread.sandbox?.type!=="workspaceWrite"||thread.sandbox.networkAccess!==false||thread.sandbox.excludeSlashTmp!==true||thread.sandbox.excludeTmpdirEnvVar!==true||!Array.isArray(roots)||roots.length!==1||roots[0]!==run.app||!Array.isArray(thread.sandbox.writableRoots)||thread.sandbox.writableRoots.some(p=>p!==run.app&&!p.startsWith(run.app+"/")))throw Error("Effective permissions differ from the frozen fixture policy");
  const selected=registry.scenarios.find(x=>x.id===`${run.fixture}-${run.variant}`);
  const prompt=run.prompt??(name==="planning"?selected.prompt+` The specification slug is ${run.fixture}. The Approved spec and MCP-confirmed scope are frozen SIMULATION inputs. Read their exact current requirements. Do not execute implementation packets.`:`Implement only the explicitly authorized ${packet} packet for specification ${run.fixture}, using its actual current packet, checklist, handoff, requirements and contracts. This SIMULATION invocation authorizes this packet only, with no commit or global/external mutation. Stop after it.`);
  startMs=now();console.log(JSON.stringify({run:run.id,stage:stageId,event:"started"}));
  await client.request("turn/start",{threadId:thread.thread.id,input:[{type:"text",text:`$${skill} ${prompt}`},{type:"skill",name:skill,path:skillPath}],model:state.model,effort:state.effort,collaborationMode:{mode:"default",settings:{model:state.model,reasoning_effort:state.effort,developer_instructions:null}}});
  await Promise.race([completion,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error("Stage safety deadline exceeded; incomplete, not a speed success")),600000);timer.unref();})]);
  endMs=now();if(terminal?.status!=="completed")throw Error("Stage did not complete");
 }catch(e){error=e.message;endMs=now();}finally{await client.close();if(sha(await readFile(auth))!==authBefore)error=(error?error+"; ":"")+"Source authentication changed independently; preservation requires inspection";await rm(home,{recursive:true,force:true});}
 const result={stage:name,stageId,packetId:packet??null,sessionId:thread?.thread?.id??null,requestedModel:state.model,reportedModel:thread?.model??null,startMs,endMs,terminal:terminal?.status??"incomplete",error:error??null,nativeQuestions:questions,writes,items,configDigest:sha(effectiveConfig)};
 await writeFile(join(folder,`${stageId}.jsonl`),records.map(r=>JSON.stringify(r)).join("\n")+"\n");await save(join(folder,`${stageId}.json`),result);
 console.log(JSON.stringify({run:run.id,stage:stageId,event:"finished",terminal:result.terminal,error:result.error,questions:questions.length,writes:writes.length,elapsedMs:endMs-startMs}));return result;
}
const requested=process.argv.slice(2).find(arg=>!arg.startsWith("--"));const available=[...state.schedule,...(state.recoverySchedule??[])];const schedule=requested?available.filter(r=>r.id===requested):process.argv.includes("--matrix=stdio-v2")?(state.recoverySchedule??[]).filter(r=>r.matrix==="stdio-v2"):state.schedule;
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
for(const run of schedule){if(state.runs.some(r=>r.id===run.id))continue;const setupStartMs=now();const result={...run,status:"running",startedAt:new Date().toISOString(),setupStartMs,workflowSourceDigest:state.sources[run.sourceKey??run.variant].digest,stages:[]};state.runs.push(result);await save(join(control,"progress-public.json"),state.runs);await writeFile(join(control,"control.json"),JSON.stringify(state,null,2)+"\n",{mode:0o600});
 try{
  const observer=await connect(state.sources[run.sourceKey??run.variant].path,run.app);await observer.call("specification_open",{project:run.app,specification:run.fixture});result.before=await observer.call("specification_check_state");result.runtime=await observer.call("workflow_runtime_info");await observer.client.close();if(result.before.status!=="pass")throw Error("Frozen fixture prerequisites are not ready");
  result.stages.push(await stage(run,"planning"));result.setupMs=result.stages[0].startMs-setupStartMs;
  if(result.stages[0].error)throw Error(result.stages[0].error);
  if(result.stages[0].writes.some(x=>!x.path.startsWith("docs/")))throw Error("Planning wrote outside authorized planning artifacts");
  const taskDirectory=join(run.app,`docs/specs/${run.fixture}/tasks`);const packets=(await readdir(taskDirectory)).filter(x=>/^\d{2,}_.+\.md$/.test(x)).sort();result.packetFiles=packets;
  if(packets.length!==(run.fixture==="b1"?2:1))throw Error("Planning did not produce the frozen packet count");
  if(process.argv.includes("--planning-only")){result.status="planning-only-incomplete";result.limitation="Required native subprocess checks unavailable; implementation was not invoked.";}else{
  for(let i=0;i<packets.length;i++){const executed=await stage(run,"implementation",packets[i]);result.stages.push(executed);if(executed.error)throw Error(executed.error);const todo=await readFile(join(taskDirectory,"todo.md"),"utf8");if(!todo.split("\n").some(line=>/^\s*-\s*\[[xX]\]/.test(line)&&line.includes(packets[i])))throw Error("Authorized packet remains incomplete; the next packet was not started");}
  const verifyStart=now();const local=spawnSync("rtk",["proxy","npm","test"],{cwd:run.app,encoding:"utf8",timeout:60000});const oracle=spawnSync("rtk",["proxy",process.execPath,join(repo,"tests/fixtures/workflow-loop/technical-agreement-oracle.mjs"),run.fixture,run.app],{cwd:repo,encoding:"utf8",timeout:60000});const verifyEnd=now();result.verification={startMs:verifyStart,endMs:verifyEnd,local:{exitCode:local.status,stdout:local.stdout,stderr:local.stderr},oracle:{exitCode:oracle.status,stdout:oracle.stdout,stderr:oracle.stderr}};
  result.status=local.status===0&&oracle.status===0?"product-checks-passed":"failed";
  }
 }catch(error){result.status="incomplete";result.error=error.message;}
 const final=await connect(state.sources[run.sourceKey??run.variant].path,run.app);try{await final.call("specification_open",{project:run.app,specification:run.fixture});result.after=await final.call("specification_check_state");if(run.variant==="candidate"){let cursor;result.technicalRecords=[];do{const page=await final.call("planning_decision_find",{...(cursor?{cursor}:{})});for(const record of page.items??page.records??[]){let next,text="";do{const item=await final.call("planning_decision_get",{decision_ref:record.decision_ref,...(next?{cursor:next}:{})});text+=item.text;next=item.next_cursor;}while(next);result.technicalRecords.push(JSON.parse(text));}cursor=page.next_cursor;}while(cursor);}}catch(e){result.readbackError=e.message;}finally{await final.client.close();}
 result.finalFiles=snapshot(run.app);result.finishedAt=new Date().toISOString();await save(join(output,run.id,"result.json"),result);await save(join(control,"progress-public.json"),state.runs);await writeFile(join(control,"control.json"),JSON.stringify(state,null,2)+"\n",{mode:0o600});console.log(JSON.stringify({run:run.id,status:result.status,error:result.error??null}));
}

}
