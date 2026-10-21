import { readFile, writeFile, mkdir, cp, readdir, rm } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { reviewFrozen } from "./mcp.mjs";
const control=dirname(fileURLToPath(import.meta.url)), repo=resolve(control,"../..");
const state=JSON.parse(await readFile(join(control,"control.json"),"utf8"));
if(state.runs.length)throw Error("Started trials cannot be refrozen");
const starter=JSON.parse(await readFile(join(repo,"tests/fixtures/workflow-loop/technical-agreement-starters-stdio.json"),"utf8"));
const sha=b=>createHash("sha256").update(b).digest("hex");
export async function connect(source,project,record=()=>{}){
 const transport=new StdioClientTransport({command:process.execPath,args:[join(source,"packages/engineer-agent-workflow-mcp/dist/main.js")],env:{PATH:process.env.PATH,HOME:join(project,".mcp-home"),EAW_PRODUCT_DATA_DIR:join(project,".product-store")},stderr:"pipe"});
 transport.stderr?.resume();const client=new Client({name:"technical-agreement-fixture",version:"1"});await client.connect(transport);let context;
 return {client,async call(name,args={}){const raw=await client.callTool({name,arguments:{...(name==="specification_open"?{}:{context}),...args}});const result=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==="text").text);record({name,args,result});if(raw.isError||result.error)throw Error(`${name}: ${JSON.stringify(result.error??result)}`);context=result.context??context;return result.result;},get context(){return context;}};
}
state.preparedFixtures={};
for(const name of ["b1","b2"]){
 const project=join(state.root,"frozen",name),f=starter.fixtures[name];await rm(project,{recursive:true,force:true});await mkdir(project,{recursive:true});
 for(const[path,body]of Object.entries({...f.files,"AGENTS.md":starter.guidance,".gitignore":".tmp/\n.mcp-home/\n.product-store/\n"})){await mkdir(dirname(join(project,path)),{recursive:true});await writeFile(join(project,path),body);}
 const trace=[];const mcp=await connect(state.sources.baseline.path,project,event=>trace.push(event));
 try{
  await mcp.call("specification_open",{project,specification:name});
  const scope=await mcp.call("scope_propose",{depth:name==="b1"?"standard":"lite",rationale:["Frozen simulation fixture for a bounded workflow comparison."],profiles:[{id:"core",reason:"Dependency-free Node.js command/function contracts."}]});
  const answer=await mcp.call("question_record_answer",{question_ref:scope.question_ref,selected_ids:["confirm"],text:"SIMULATION: confirm exactly this scope and these declared artifacts.",source:"fixture:approved-scope"});
  await mcp.call("scope_confirm",{proposal_ref:scope.question_ref,answer_ref:answer.decision_ref});
  const requirements=f.requirements.map((text,i)=>({id:`${name.toUpperCase()}-${String(i+1).padStart(3,"0")}`,text}));
  const body=`# ${name.toUpperCase()} Frozen Simulation Specification\n\nStatus: Draft\n\nThis is SIMULATION data. Authorizations apply only inside its isolated fixture.\n\n`+requirements.map(x=>`### ${x.id}: Required behavior\n\n${x.text}\n`).join("\n");
  await writeFile(join(project,`docs/specs/${name}/spec.md`),body);
  await mcp.call("decision_record_instruction",{category:"behavior",text:requirements.map(x=>x.text).join("\n"),source:"fixture:frozen-behavior",kind:"initial_request",requirement_ids:requirements.map(x=>x.id)});
  const review=await mcp.call("specification_review_start");let index=0;
  while(index!==null){let cursor,item,text="";do{item=await mcp.call("specification_review_get",{review_ref:review.review_ref,item_index:index,...(cursor?{cursor}:{})});text+=item.text;cursor=item.next_cursor;}while(cursor);const input=JSON.parse(text);await mcp.call("specification_review_record",{review_ref:review.review_ref,item_index:index,read_receipt:item.read_receipt,verdict:"covered",explanation:"Frozen SIMULATION fixture: explicit scope and complete fixed acceptance definitions.",evidence_requirement_ids:input.kind==="source"?(input.source.requirement_ids??[]):[],evidence_source_refs:input.kind==="requirement"?input.source_refs:[]});index=item.next_item_index;}
  await mcp.call("specification_review_complete",{review_ref:review.review_ref});await writeFile(join(project,`docs/specs/${name}/spec.md`),body.replace("Status: Draft","Status: Approved"));
  const checked=await mcp.call("specification_check_state");if(checked.status!=="pass")throw Error("Fixture specification not ready");
  state.preparedFixtures[name]={path:project,checked,specDigest:sha(await readFile(join(project,`docs/specs/${name}/spec.md`))),setupTrace:trace,requirements};
 }finally{await mcp.client.close();}
 const original=spawnSync("rtk",["proxy","npm","test"],{cwd:project,encoding:"utf8"});if(original.status!==0)throw Error("Starter application failed baseline tests");
 const red=spawnSync("rtk",["proxy",process.execPath,join(repo,"tests/fixtures/workflow-loop/technical-agreement-oracle.mjs"),name,project],{cwd:repo,encoding:"utf8"});if(red.status!==1||!/AssertionError/.test(red.stderr))throw Error("Oracle did not discriminate the missing behavior");state.preparedFixtures[name].oracleRed={exitCode:red.status,relevantAssertion:true};
 console.log(JSON.stringify({fixture:name,status:"frozen-approved",oracleRed:red.status}));
}
const ordered=[["b1","baseline",1],["b1","candidate",1],["b2","candidate",1],["b2","baseline",1],["b1","candidate",2],["b1","baseline",2],["b2","baseline",2],["b2","candidate",2]];
state.schedule=ordered.map(([fixture,variant,repetition])=>({fixture,variant,repetition,id:`${fixture}-${variant}-precision-v3-${repetition}`}));
for(const run of state.schedule){const app=join(state.root,"runs",run.id,"app");await mkdir(dirname(app),{recursive:true});await cp(state.preparedFixtures[run.fixture].path,app,{recursive:true});
 const setupTrace=[];const current=await connect(state.sources.baseline.path,app,event=>setupTrace.push(event));try{await current.call("specification_open",{project:app,specification:run.fixture});run.prepared=await reviewFrozen(current);if(run.prepared.status!=="pass")throw Error("Final-worktree fixture review not ready");run.setupTrace=setupTrace;}finally{await current.client.close();}
 for(const args of [["init","--quiet","-b","trial"],["add","."]]){const result=spawnSync("rtk",["proxy","git",...args],{cwd:app,encoding:"utf8"});if(result.status!==0)throw Error("Isolated fixture Git preparation failed");}run.app=app;}
state.fixtureDigests={};for(const name of ["technical-agreement-registry.json","technical-agreement-answers.json","technical-agreement-starters-stdio.json","technical-agreement-oracle.mjs","TRIALS.md"]){state.fixtureDigests[name]=sha(await readFile(join(repo,"tests/fixtures/workflow-loop",name)));}
state.status="fixtures-frozen";await writeFile(join(control,"control.json"),JSON.stringify(state,null,2)+"\n",{mode:0o600});
console.log(JSON.stringify({status:state.status,runs:state.schedule.map(x=>x.id),sourceDigests:Object.fromEntries(Object.entries(state.sources).map(([k,v])=>[k,v.digest]))}));

