import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { verifyCapturedArtifacts } from "../scripts/lib/captured-evidence.mjs";
import { makeTempTree } from "./lib/fixtures.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");

test("captured files and sorted bundle bytes verify, and changed bytes fail", async (t) => {
  const root = await makeTempTree(t, {
    "trace.jsonl": "actual events\n",
    "source/z.txt": "last",
    "source/a/nested.txt": "first",
  });
  const artifacts = [
    { ref: "trace.jsonl", digest: sha("actual events\n") },
    { ref: "source", kind: "bundle", digest: sha("a/nested.txt\0first\0z.txt\0last\0") },
  ];
  assert.deepEqual(await verifyCapturedArtifacts(artifacts, root), []);
  await fs.writeFile(path.join(root, "source/z.txt"), "changed");
  const findings = await verifyCapturedArtifacts(artifacts, root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].ref, "source");
  assert.equal(findings[0].code, "captured-artifact-invalid");
});

test("missing, duplicate, and escaping references cannot attest source evidence", async (t) => {
  const root = await makeTempTree(t, { "trace.txt": "trace", empty: null });
  for (const ref of ["missing", "/trace.txt", "../trace.txt", "a/../trace.txt", "C:\\trace.txt"]) {
    assert.equal((await verifyCapturedArtifacts([{ ref, digest: sha("trace") }], root)).length, 1);
  }
  assert.equal((await verifyCapturedArtifacts([
    { ref: "trace.txt", digest: sha("trace") },
    { ref: "trace.txt", digest: sha("trace") },
  ], root)).length, 1);
  assert.equal((await verifyCapturedArtifacts([{ ref: "empty", kind: "bundle", digest: sha("") }], root)).length, 1);
});

test("artifact references and source bundles reject symbolic links", async (t) => {
  const root = await makeTempTree(t, { "real/trace.txt": "trace", "bundle/file.txt": "file" });
  await fs.symlink(path.join(root, "real"), path.join(root, "link"), "dir");
  await fs.symlink(path.join(root, "real/trace.txt"), path.join(root, "bundle/link.txt"));
  assert.equal((await verifyCapturedArtifacts([{ ref: "link/trace.txt", digest: sha("trace") }], root)).length, 1);
  assert.equal((await verifyCapturedArtifacts([{ ref: "bundle", kind: "bundle", digest: sha("") }], root)).length, 1);
});

test("captured JSON is exposed only after the same bytes pass digest validation", async (t) => {
  const bytes = '{"variant":"candidate"}\n';
  const root = await makeTempTree(t, { "source.json": bytes, "invalid.json": "not JSON" });
  const jsonDocuments = new Map();
  assert.deepEqual(await verifyCapturedArtifacts([{ ref: "source.json", digest: sha(bytes) }], root, { jsonDocuments }), []);
  assert.deepEqual(jsonDocuments.get("source.json"), { variant: "candidate" });
  await fs.writeFile(path.join(root, "source.json"), '{"variant":"baseline"}\n');
  const rejected = new Map();
  assert.equal((await verifyCapturedArtifacts([{ ref: "source.json", digest: sha(bytes) }], root, { jsonDocuments: rejected })).length, 1);
  assert.equal(rejected.size, 0);
  assert.equal((await verifyCapturedArtifacts([{ ref: "invalid.json", digest: sha("not JSON") }], root, { jsonDocuments: rejected })).length, 1);
  assert.equal(rejected.size, 0);
});
