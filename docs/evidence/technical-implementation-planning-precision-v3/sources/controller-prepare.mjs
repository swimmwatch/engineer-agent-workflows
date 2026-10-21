import { mkdtemp, mkdir, readFile, writeFile, copyFile, cp, symlink, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const repo=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const control=dirname(fileURLToPath(import.meta.url));
const root=await mkdtemp(join(tmpdir(),"eaw-tip-p03-precision-v3-"));
const baseline=join(repo,".cache/technical-implementation-planning-baseline");
const original=JSON.parse(await readFile(join(baseline,"benchmark-baseline.json"),"utf8"));
const sha=b=>createHash("sha256").update(b).digest("hex");
const sources={};
for(const variant of ["baseline","candidate"]){
 const target=join(root,"sources",variant);await mkdir(target,{recursive:true});
 for(const [relative,digest]of Object.entries(original.sha256)){
  const source=join(baseline,relative),bytes=await readFile(source);if(sha(bytes)!==digest)throw Error("Baseline input drift: "+relative);
  const output=join(target,relative);await mkdir(dirname(output),{recursive:true});await writeFile(output,bytes);
 }
 for(const relative of [".prettierrc.json",".gitignore"]){try{await copyFile(join(baseline,relative),join(target,relative));}catch{}}
 const additional=[];
 async function rendererInputs(directory,prefix){for(const entry of await readdir(directory,{withFileTypes:true})){const relative=prefix+entry.name;if(entry.isDirectory())await rendererInputs(join(directory,entry.name),relative+"/");else if(entry.isFile())additional.push(relative);}}
 for(const name of ["scripts","catalog"])await rendererInputs(join(baseline,name),name+"/");
 additional.push("LICENSE","README.md");
 for(const relative of additional){const bytes=await readFile(join(baseline,relative));const historical=spawnSync("rtk",["proxy","git","show",`${original.source_revision}:${relative}`],{cwd:repo,maxBuffer:16*1024*1024});if(historical.status!==0||sha(bytes)!==sha(historical.stdout))throw Error("Unverified renderer input: "+relative);await mkdir(dirname(join(target,relative)),{recursive:true});await writeFile(join(target,relative),bytes);}
 await symlink(join(repo,"node_modules"),join(target,"node_modules"),"dir");
 if(variant==="candidate"){
  for(const relative of ["skills","shared"]){await cp(join(repo,relative),join(target,relative),{recursive:true,force:true});}
  for(const relative of ["packages/engineer-agent-workflow-mcp/src","scripts","catalog"]){await cp(join(repo,relative),join(target,relative),{recursive:true,force:true});}
 }
 for(const script of ["build","generate"]){const result=spawnSync("rtk",["npm","run",script],{cwd:target,encoding:"utf8",timeout:120000});if(result.status!==0)throw Error(`${variant} ${script} failed: ${result.stdout}\n${result.stderr}`);}
 const files={};
 async function scan(directory,prefix="") {for(const entry of await readdir(directory,{withFileTypes:true})){if(["node_modules",".git",".codegraph"].includes(entry.name))continue;const relative=prefix+entry.name,path=join(directory,entry.name);if(entry.isDirectory())await scan(path,relative+"/");else if(entry.isFile())files[relative]=sha(await readFile(path));}}
 await scan(target);
 sources[variant]={path:target,manifest:{variant,baselineRevision:original.source_revision,files},digest:sha(JSON.stringify(files))};
}
const fixtures={};for(const name of ["technical-agreement-registry.json","technical-agreement-answers.json","technical-agreement-starters.json","technical-agreement-oracle.mjs","TRIALS.md"]){fixtures[name]=sha(await readFile(join(repo,"tests/fixtures/workflow-loop",name)));}
const state={root,sources,fixtures,model:"gpt-6.1-sol",effort:"medium",client:"codex-cli 0.163.0",status:"prepared",runs:[]};
await mkdir(control,{recursive:true,mode:0o700});await writeFile(join(control,"control.json"),JSON.stringify(state,null,2)+"\n",{mode:0o600});
process.stdout.write(JSON.stringify({status:state.status,baselineInputs:Object.keys(original.sha256).length,sourceDigests:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,v.digest])),fixtureCount:Object.keys(fixtures).length})+"\n");

