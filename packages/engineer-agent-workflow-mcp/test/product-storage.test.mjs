import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { URL } from "node:url";
import { promisify } from "node:util";

import {
  loadGeneration,
  readObject,
  saveGeneration,
  saveObject,
} from "../dist/product/storage.js";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const DOCUMENT_A_ID = "22222222-2222-4222-8222-222222222222";
const DOCUMENT_B_ID = "33333333-3333-4333-8333-333333333333";
const DECISION_ID = "44444444-4444-4444-8444-444444444444";
const REVIEW_ID = "55555555-5555-4555-8555-555555555555";
const PRIOR_DOCUMENT_ID = "66666666-6666-4666-8666-666666666666";
const CANDIDATE_ID = "77777777-7777-4777-8777-777777777777";
const executeFile = promisify(execFile);
const storageModuleUrl = new URL("../dist/product/storage.js", import.meta.url).href;

const bytes = (value) => Buffer.from(value, "utf8");

function expectCode(code) {
  return (error) => {
    assert.equal(error?.code, code);
    assert.doesNotMatch(error?.message ?? "", /\/tmp\/|\\Users\\|EAW_PRODUCT_DATA_DIR/u);
    return true;
  };
}

async function temporaryRoot(t) {
  const root = await mkdtemp(join(tmpdir(), "eaw-product-storage-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function loadGenerationInFreshProcess(root, digest, expectedCode = "") {
  const script = `
    const [moduleUrl, root, productId, digest, expectedCode] = process.argv.slice(1);
    const { loadGeneration } = await import(moduleUrl);
    try {
      const loaded = await loadGeneration(root, productId, digest);
      if (expectedCode || loaded.sha256 !== digest) process.exitCode = 1;
    } catch (error) {
      if (!expectedCode || error?.code !== expectedCode) process.exitCode = 1;
    }
  `;
  await executeFile(
    process.execPath,
    ["--input-type=module", "--eval", script, storageModuleUrl, root, PRODUCT_ID, digest, expectedCode],
    { maxBuffer: 1024 },
  );
}

function registry(documentA, documentB) {
  return {
    schema_version: 1,
    kind: "registry",
    product_id: PRODUCT_ID,
    documents: [
      {
        id: DOCUMENT_A_ID,
        artifact: "prd",
        role: "semantic",
        subject: "Goals",
        relative_path: "prd/goals.md",
        object_sha256: documentA.sha256,
      },
      {
        id: DOCUMENT_B_ID,
        artifact: "technical-design",
        role: "semantic",
        subject: "Storage",
        relative_path: "technical-design/storage.md",
        object_sha256: documentB.sha256,
      },
    ],
    element_metadata: [],
  };
}

function reverseObjectKeys(value) {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).reverse().map(([key, nested]) => [key, reverseObjectKeys(nested)]),
    );
  }
  return value;
}

function generation({ parent = null, registryObject, decisionObject, upstreamPins = [] }) {
  return {
    schema_version: 1,
    kind: "generation",
    product_id: PRODUCT_ID,
    parent,
    registry: { id: DOCUMENT_A_ID, object_sha256: registryObject.sha256 },
    ready_artifacts: upstreamPins.length === 0
      ? []
      : [{
          artifact: "prd",
          source_version: upstreamPins[0].object_sha256,
          review_id: REVIEW_ID,
          upstream_pins: upstreamPins,
        }],
    decision_heads: [{
      decision_ref: {
        product_id: PRODUCT_ID,
        artifact: "prd",
        id: DECISION_ID,
        revision: 1,
      },
      object_sha256: decisionObject.sha256,
    }],
    relations: [],
  };
}

async function saveRegistry(root, value) {
  return saveObject(root, {
    productId: PRODUCT_ID,
    kind: "record",
    bytes: bytes(`${JSON.stringify(value)}\n`),
  });
}

async function seedReadyGeneration(t) {
  const root = await temporaryRoot(t);
  const documentA = await saveObject(root, {
    productId: PRODUCT_ID,
    kind: "markdown",
    bytes: bytes("### GOAL-0001: Durable history\n\nKeep accepted source bytes.\n"),
  });
  const documentB = await saveObject(root, {
    productId: PRODUCT_ID,
    kind: "markdown",
    bytes: bytes("### TECH-0001: Storage boundary\n\nUse immutable objects.\n"),
  });
  const priorDocument = await saveObject(root, {
    productId: PRODUCT_ID,
    kind: "markdown",
    bytes: bytes("### GOAL-0000: Prior accepted goal\n\nRetain this historical source.\n"),
  });
  const decisionBytes = bytes(`${JSON.stringify({
    schema_version: 1,
    kind: "decision",
    ref: { product_id: PRODUCT_ID, artifact: "prd", id: DECISION_ID, revision: 1 },
    state: "observed",
    category: "storage",
    question: null,
    text: "Retain accepted bytes.",
    source: "fixture",
    selected_ids: [],
    predecessors: [],
    affected_refs: [],
    reconsider_when: null,
    candidate_id: CANDIDATE_ID,
  })}\n`);
  const decisionObject = await saveObject(root, {
    productId: PRODUCT_ID,
    kind: "decision",
    artifact: "prd",
    decisionId: DECISION_ID,
    revision: 1,
    bytes: decisionBytes,
  });
  const baseRegistryObject = await saveRegistry(root, {
    schema_version: 1,
    kind: "registry",
    product_id: PRODUCT_ID,
    documents: [{
      id: PRIOR_DOCUMENT_ID,
      artifact: "prd",
      role: "semantic",
      subject: "Prior goals",
      relative_path: "prd/prior-goals.md",
      object_sha256: priorDocument.sha256,
    }],
    element_metadata: [],
  });
  const baseGeneration = await saveGeneration(
    root,
    generation({ registryObject: baseRegistryObject, decisionObject }),
  );
  const registryObject = await saveRegistry(root, registry(documentA, documentB));
  const sourcePin = {
    product_id: PRODUCT_ID,
    artifact: "prd",
    source_kind: "markdown",
    source_id: PRIOR_DOCUMENT_ID,
    generation: baseGeneration.sha256,
    object_sha256: priorDocument.sha256,
    element_ids: ["GOAL-0000"],
    decision_ref: null,
  };
  const readyGeneration = await saveGeneration(
    root,
    generation({
      parent: baseGeneration.sha256,
      registryObject,
      decisionObject,
      upstreamPins: [sourcePin],
    }),
  );
  return {
    root,
    documentA,
    documentB,
    priorDocument,
    decisionBytes,
    decisionObject,
    registryObject,
    readyGeneration,
    sourcePin,
  };
}

test("Q04: unchanged objects are reused and historical generations retain exact bytes", async (t) => {
  const fixture = await seedReadyGeneration(t);
  const duplicateDocument = await saveObject(fixture.root, {
    productId: PRODUCT_ID,
    kind: "markdown",
    bytes: await readObject(fixture.root, fixture.documentA),
  });
  assert.equal(duplicateDocument.sha256, fixture.documentA.sha256);
  assert.equal(duplicateDocument.relativePath, fixture.documentA.relativePath);
  assert.equal(duplicateDocument.reused, true);

  const generations = [fixture.readyGeneration];
  const reorderedGeneration = await saveGeneration(
    fixture.root,
    reverseObjectKeys(generation({
      parent: fixture.readyGeneration.sha256,
      registryObject: fixture.registryObject,
      decisionObject: fixture.decisionObject,
      upstreamPins: [fixture.sourcePin],
    })),
  );
  const canonicalGeneration = await saveGeneration(
    fixture.root,
    generation({
      parent: fixture.readyGeneration.sha256,
      registryObject: fixture.registryObject,
      decisionObject: fixture.decisionObject,
      upstreamPins: [fixture.sourcePin],
    }),
  );
  assert.equal(reorderedGeneration.sha256, canonicalGeneration.sha256);
  assert.equal(canonicalGeneration.reused, true);
  const expectedBodies = [
    "### TECH-0001: Storage boundary\n\nUse immutable objects, version two.\n",
    "### TECH-0001: Storage boundary\n\nUse immutable objects, version three.\n",
  ];
  let parent = fixture.readyGeneration.sha256;
  for (const body of expectedBodies) {
    const changedDocument = await saveObject(fixture.root, {
      productId: PRODUCT_ID,
      kind: "markdown",
      bytes: bytes(body),
    });
    const changedRegistry = await saveRegistry(
      fixture.root,
      registry(fixture.documentA, changedDocument),
    );
    const changedGeneration = await saveGeneration(
      fixture.root,
      generation({
        parent,
        registryObject: changedRegistry,
        decisionObject: fixture.decisionObject,
        upstreamPins: [fixture.sourcePin],
      }),
    );
    generations.push(changedGeneration);
    parent = changedGeneration.sha256;
  }

  const original = await loadGeneration(
    fixture.root,
    PRODUCT_ID,
    fixture.readyGeneration.sha256,
  );
  assert.deepEqual(
    original.documents.map((document) => [document.id, Buffer.from(document.bytes).toString("utf8")]),
    [
      [DOCUMENT_A_ID, "### GOAL-0001: Durable history\n\nKeep accepted source bytes.\n"],
      [DOCUMENT_B_ID, "### TECH-0001: Storage boundary\n\nUse immutable objects.\n"],
    ],
  );
  assert.equal(Buffer.from(original.decisions[0].bytes).toString("utf8"), fixture.decisionBytes.toString("utf8"));
  assert.equal(
    Buffer.from(original.sourcePins[0].bytes).toString("utf8"),
    "### GOAL-0000: Prior accepted goal\n\nRetain this historical source.\n",
  );

  const reopened = await loadGeneration(
    fixture.root,
    PRODUCT_ID,
    fixture.readyGeneration.sha256,
  );
  assert.deepEqual(reopened.documents, original.documents);
  await loadGenerationInFreshProcess(fixture.root, fixture.readyGeneration.sha256);

  const objectNames = await readdir(join(fixture.root, "products", PRODUCT_ID, "objects"));
  assert.equal(new Set(objectNames).size, 9);
  assert.equal((await readdir(join(fixture.root, "products", PRODUCT_ID, "decisions", "prd", DECISION_ID))).length, 1);
  assert.equal((await readdir(join(fixture.root, "products", PRODUCT_ID, "generations"))).length, 5);
  assert.deepEqual(
    (await readdir(join(fixture.root, "products", PRODUCT_ID))).sort(),
    ["decisions", "generations", "objects"],
  );
  assert.equal(generations.length, 3);
});

test("Q05: missing or corrupt pins fail closed without draft or latest fallback", async (t) => {
  const fixture = await seedReadyGeneration(t);
  await assert.rejects(
    saveObject(fixture.root, {
      productId: PRODUCT_ID,
      kind: "markdown",
      bytes: Buffer.alloc((16 * 1024 * 1024) + 1),
    }),
    expectCode("SOURCE_LIMIT"),
  );
  const longElementId = `LIMIT-${"X".repeat(117)}-0000`;
  const oversizedPin = {
    ...fixture.sourcePin,
    generation: "f".repeat(64),
    element_ids: Array.from({ length: 1000 }, () => longElementId),
  };
  await assert.rejects(
    saveGeneration(
      fixture.root,
      generation({
        parent: fixture.readyGeneration.sha256,
        registryObject: fixture.registryObject,
        decisionObject: fixture.decisionObject,
        upstreamPins: Array.from({ length: 140 }, () => oversizedPin),
      }),
    ),
    expectCode("SOURCE_LIMIT"),
  );
  const pinnedPath = join(fixture.root, fixture.priorDocument.relativePath);
  const originalBytes = await readFile(pinnedPath);
  const draftPath = join(
    fixture.root,
    "products",
    PRODUCT_ID,
    "drafts",
    "66666666-6666-4666-8666-666666666666",
    "documents",
    "prd",
    "goals.md",
  );
  await mkdir(dirname(draftPath), { recursive: true });
  await writeFile(draftPath, "### GOAL-0001: Latest draft\n\nDo not use this body.\n");

  await assert.rejects(
    saveGeneration(
      fixture.root,
      generation({
        parent: fixture.readyGeneration.sha256,
        registryObject: fixture.registryObject,
        decisionObject: fixture.decisionObject,
        upstreamPins: [{ ...fixture.sourcePin, source_id: DOCUMENT_A_ID }],
      }),
    ),
    expectCode("SOURCE_CHANGED"),
  );

  await rm(pinnedPath);
  await assert.rejects(
    loadGeneration(fixture.root, PRODUCT_ID, fixture.readyGeneration.sha256),
    expectCode("MISSING_EVIDENCE"),
  );

  await mkdir(dirname(pinnedPath), { recursive: true });
  await writeFile(pinnedPath, originalBytes);
  await writeFile(pinnedPath, "corrupt retained bytes");
  await assert.rejects(
    loadGeneration(fixture.root, PRODUCT_ID, fixture.readyGeneration.sha256),
    expectCode("SOURCE_CHANGED"),
  );

  await assert.rejects(
    loadGeneration(fixture.root, PRODUCT_ID, fixture.readyGeneration.sha256),
    expectCode("SOURCE_CHANGED"),
  );
  await loadGenerationInFreshProcess(
    fixture.root,
    fixture.readyGeneration.sha256,
    "SOURCE_CHANGED",
  );
});

test("Q05: storage opens retained evidence without following links and reports cleanup failure", async () => {
  const source = await readFile(new URL("../src/product/storage.ts", import.meta.url), "utf8");
  assert.match(source, /open\(path, constants\.O_RDONLY \| constants\.O_NOFOLLOW\)/u);
  assert.doesNotMatch(source, /handle\.close\(\)\.catch/u);
});
