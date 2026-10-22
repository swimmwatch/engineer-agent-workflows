import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { withTrialHome } from "./trial-home.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "wfe-home-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const profile = join(root, "profile"), home = join(root, "home");
  await mkdir(profile);
  await writeFile(join(profile, "auth.json"), "SIMULATION ONLY");
  return { root, profile, home };
}

test("preparation failure removes copied authentication without touching the profile", async t => {
  const { root, profile, home } = await fixture(t);
  await assert.rejects(withTrialHome(profile, home, async () => {
    assert.equal(await readFile(join(home, "auth.json"), "utf8"), "SIMULATION ONLY");
    await readFile(join(root, "missing-settings.json"));
  }), { code: "ENOENT" });
  await assert.rejects(access(join(home, "auth.json")), { code: "ENOENT" });
  assert.equal(await readFile(join(profile, "auth.json"), "utf8"), "SIMULATION ONLY");
});

test("client shutdown failure still removes authentication and fails the run", async t => {
  const { profile, home } = await fixture(t);
  await assert.rejects(withTrialHome(profile, home, async resources => {
    resources.client = { close: async () => { throw new Error("Shutdown failed"); } };
  }), /Shutdown failed/);
  await assert.rejects(access(join(home, "auth.json")), { code: "ENOENT" });
});

test("copy failure cleans authentication left by partial preparation", async t => {
  const { profile, home } = await fixture(t);
  await mkdir(home);
  await writeFile(join(home, "auth.json"), "SIMULATION PARTIAL COPY");
  await assert.rejects(withTrialHome(join(profile, "absent"), home, async () => {
    assert.fail("Execution must not start after a failed copy");
  }), { code: "ENOENT" });
  await assert.rejects(access(join(home, "auth.json")), { code: "ENOENT" });
});

test("an unreaped process fails cleanup instead of certifying completion", async t => {
  const { profile, home } = await fixture(t);
  await assert.rejects(withTrialHome(profile, home, async resources => {
    resources.client = { close: async () => ({ reaped: false }) };
  }), /not reaped/);
  await assert.rejects(access(join(home, "auth.json")), { code: "ENOENT" });
});

test("successful cleanup retains non-secret evidence and returns the outcome", async t => {
  const { profile, home } = await fixture(t);
  let closed = 0;
  const result = await withTrialHome(profile, home, async resources => {
    resources.client = { close: async () => { closed++; return { reaped: true }; } };
    await writeFile(join(home, "evidence.txt"), "retained");
    return "complete";
  });
  assert.equal(result, "complete");
  assert.equal(closed, 1);
  assert.equal(await readFile(join(home, "evidence.txt"), "utf8"), "retained");
  await assert.rejects(access(join(home, "auth.json")), { code: "ENOENT" });
});
