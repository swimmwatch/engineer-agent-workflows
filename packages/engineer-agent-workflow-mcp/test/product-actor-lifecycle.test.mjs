import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { clearTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";
import { createQualificationScope } from "./support/product-e2e-harness.mjs";
import { createTemporaryDirectory } from "./support/temporary-directory.mjs";

test("qualification cleanup owns a temporary directory before allocation settles", async () => {
  const hooks = [];
  const scope = createQualificationScope({ after(callback) { hooks.push(callback); } });
  const prefix = `eaw-allocation-${randomUUID()}-`;
  const creating = createTemporaryDirectory(scope, prefix);
  creating.catch(() => {});
  try {
    await hooks[0]();
    await assert.rejects(creating, /already disposed/);
    assert.deepEqual((await readdir(tmpdir())).filter(name => name.startsWith(prefix)), []);
    assert.throws(() => scope.after(() => {}), /already disposed/);
    await assert.rejects(createTemporaryDirectory(scope, prefix), /already disposed/);
    await delay(20);
    assert.deepEqual((await readdir(tmpdir())).filter(name => name.startsWith(prefix)), [], "a disposed scope must not allocate a new root");
  } finally {
    for (const name of (await readdir(tmpdir())).filter(name => name.startsWith(prefix))) {
      await rm(join(tmpdir(), name), { recursive: true, force: true });
    }
  }
});

const harness = new URL("./support/product-e2e-harness.mjs", import.meta.url).href;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === "ESRCH") return false; throw error; } };

async function fixtureProcessIds(file) {
  try {
    const contents = await readFile(file, "utf8");
    if (!contents.trim()) return [];
    const records = contents.replace(/\n$/u, "").split("\n");
    assert.ok(records.every(value => /^[1-9][0-9]*$/u.test(value)), "invalid owned fixture PID");
    const pids = records.map(Number);
    assert.ok(pids.every(pid => Number.isSafeInteger(pid) && pid > 0), "invalid owned fixture PID");
    return pids;
  }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}

test("lifecycle emergency inventory accepts only positive owned process identifiers", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "eaw-pid-inventory-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "pids");
  for (const value of ["", " \n "]) {
    await writeFile(file, value);
    assert.deepEqual(await fixtureProcessIds(file), []);
  }
  for (const value of ["0", "-1", "NaN", "1.5", "123\n0", "9007199254740992", "1e3", "0x7b", "+123", "123.0", " 123", "123 ", "123\n\n456"]) {
    await writeFile(file, value);
    await assert.rejects(fixtureProcessIds(file), /invalid owned fixture PID/);
  }
  await writeFile(file, "123\n456\n");
  assert.deepEqual(await fixtureProcessIds(file), [123, 456]);
});

for (const mode of ["handshake", "request", "cleanup-failure"]) {
  test(`qualification actor ${mode} cancels or disposes every owned child`, { timeout: 20_000 }, async () => {
    const directory = await mkdtemp(join(tmpdir(), "eaw-actor-lifecycle-"));
    const ownedRoot = join(directory, "owned-store");
    await mkdir(ownedRoot);
    const pidFile = join(directory, "pids");
    const readyFile = join(directory, "ready");
    const reportFile = join(directory, "report.json");
    const server = join(directory, "server.mjs");
    const runner = join(directory, "runner.mjs");
    await writeFile(server, `import {appendFileSync} from 'node:fs';
import {createInterface} from 'node:readline';
appendFileSync(${JSON.stringify(pidFile)}, process.pid+'\\n');
const lines=createInterface({input:process.stdin});
lines.on('line', line=>{ const request=JSON.parse(line);
 if(request.method==='initialize') {
  if(${JSON.stringify(mode)}==='handshake') appendFileSync(${JSON.stringify(readyFile)},'ready\\n');
  else process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result:{protocolVersion:request.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'fixture',version:'1'}}})+'\\n');
 } else if(request.method==='tools/call') appendFileSync(${JSON.stringify(readyFile)},'ready\\n');
});
process.stdin.on('end',()=>process.exit(0));
setInterval(()=>{},1000);
`);
    await writeFile(runner, `import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {actor,createQualificationScope} from ${JSON.stringify(harness)};
const hooks=[]; const controller=new AbortController();
const t=createQualificationScope({signal:controller.signal,after(fn){hooks.push(fn);}});
let rootDisposed=false;
if(${JSON.stringify(mode)}==='cleanup-failure') {
 t.after(async()=>{assert.equal((await pids()).some(alive),false,'clients must close before root disposal');await import('node:fs/promises').then(fs=>fs.rm(${JSON.stringify(ownedRoot)},{recursive:true,force:true}));rootDisposed=true;});
 t.after(()=>{throw new Error('owned-disposer-failure')});
}
const actors=[actor(t,{name:'one',root:${JSON.stringify(ownedRoot)},calls:[],entrypoint:${JSON.stringify(server)}})];
const alive=pid=>{try{process.kill(pid,0);return true}catch(e){if(e.code==='ESRCH')return false;throw e}};
const pids=async()=> {const result=(await readFile(${JSON.stringify(pidFile)},'utf8')).trim().split('\\n').map(Number);assert.ok(result.length>0&&result.every(pid=>Number.isSafeInteger(pid)&&pid>0),'owned PID inventory must be nonempty and valid');return result;};
const errors=[]; let emergency=false;
process.on('unhandledRejection', error=>errors.push(String(error)));
let pending;
try {
 pending=actors[0].raw('pending',{}); pending.catch(()=>{});
 for(let i=0;i<250;i++){try{await readFile(${JSON.stringify(readyFile)});break}catch{await delay(10)}}
 assert.ok((await readFile(${JSON.stringify(readyFile)},'utf8')).includes('ready'),'rendezvous must complete');
 assert.ok((await pids()).every(alive),'rendezvous must observe a real live actor child');
 if(${JSON.stringify(mode)}==='cleanup-failure') {
  const second=actor(t,{name:'two',root:${JSON.stringify(ownedRoot)},calls:[],entrypoint:${JSON.stringify(server)}}); actors.push(second);
  const secondPending=second.raw('pending',{}); secondPending.catch(()=>{});
  for(let i=0;i<250&&(await pids()).length<2;i++)await delay(10);
  assert.equal((await pids()).length,2,'both actual actors must launch');
  assert.ok((await pids()).every(alive),'both owned actors must be live before cleanup');
  await assert.rejects(async()=>{for(const hook of hooks)await hook();}, error=>error instanceof AggregateError&&error.errors.some(reason=>reason.message==='owned-disposer-failure'));
  assert.equal(rootDisposed,true,'root disposer must run despite the earlier failure');
  assert.equal((await pids()).some(alive),false,'one failed disposer must not bypass other owned clients');
 } else {
  controller.abort(new Error('fixture-cancelled'));
  await assert.rejects(Promise.race([pending,delay(3500,undefined,{ref:false}).then(()=>{throw new Error('pending actor did not cancel')})]), error=>!/did not cancel/.test(error.message));
  for(let i=0;i<300&&(await pids()).some(alive);i++)await delay(10);
  assert.equal((await pids()).some(alive),false,'aborted actor child must be gone before emergency cleanup');
  const before=(await pids()).length;
  assert.throws(()=>actor(t,{name:'after-abort',root:${JSON.stringify(ownedRoot)},calls:[],entrypoint:${JSON.stringify(server)}}),/fixture-cancelled|abort/i);
  await assert.rejects(actors[0].restart(),/fixture-cancelled|abort/i);
  await assert.rejects(actors[0].raw('pending',{}),/fixture-cancelled|abort/i);
  assert.equal((await pids()).length,before,'aborted actors must not launch again');
  for(const hook of hooks)await hook();
 }
 await delay(20); assert.deepEqual(errors,[],'no unhandled cleanup/request rejection');
 await writeFile(${JSON.stringify(reportFile)},JSON.stringify({passed:true,emergency:false,pids:await pids()}));
} catch(error) {
 emergency=true; await writeFile(${JSON.stringify(reportFile)},JSON.stringify({passed:false,emergency,error:String(error),pids:await pids()}));
 for(const hook of hooks){try{await hook()}catch{}}
 throw error;
}
`);
    const environment = { ...process.env };
    delete environment.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, [runner], { env: environment, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    let watchdog;
    const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
    try {
      const result = await Promise.race([exited, new Promise(resolve => { watchdog = setTimeout(() => resolve({ watchdog: true }), 12_000); })]);
      assert.equal(result.watchdog, undefined, `the actor runner must exit naturally: ${output}`);
      const report = JSON.parse(await readFile(reportFile, "utf8"));
      assert.equal(report.passed, true, `${JSON.stringify(report)}\n${output}`);
      assert.equal(report.emergency, false);
      assert.deepEqual(result, { code: 0, signal: null });
      assert.equal(report.pids.some(alive), false, "every actual fixture PID must be gone");
    } finally {
      clearTimeout(watchdog);
      child.kill("SIGKILL");
      const pids = await fixtureProcessIds(pidFile);
      // Emergency cleanup runs after every success observation and never supplies passing evidence.
      for (const pid of pids) if (alive(pid)) process.kill(pid, "SIGKILL");
      await exited;
      await delay(20);
      await rm(directory, { recursive: true, force: true });
    }
  });
}
