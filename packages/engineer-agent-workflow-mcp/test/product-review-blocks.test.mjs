import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildSemanticBlocks, semanticBlockText, validateSemanticBlocks } from "../dist/product/review-blocks.js";

const ref = (id) => ({ product_id: "product", artifact: "prd", element_id: id });
const atom = (item_key, refs = [], text = item_key) => ({
  item_key, refs, text, text_sha256: createHash("sha256").update(text).digest("hex"),
});
const atoms = [
  atom("scope"), atom("element:prd:PRD-0001", [ref("PRD-0001")]),
  atom("element:prd:PRD-0002", [ref("PRD-0002")]),
  atom("decision:prd:shared:1", [ref("PRD-0001"), ref("PRD-0002")]),
  atom("relation:linked", [ref("PRD-0001"), ref("PRD-0002")]),
  atom("decision:prd:orphan:1"), atom("document:prose"),
];

test("semantic blocks own every atom exactly once and retain shared context", () => {
  const blocks = buildSemanticBlocks(atoms);
  assert.equal(blocks.length, 5);
  assert.deepEqual(blocks.flatMap((block) => block.primary_atoms).sort(), atoms.map((entry) => entry.item_key).sort());
  const second = blocks.find((block) => block.item_key === "element:prd:PRD-0002");
  assert.ok(second.related_atoms.includes("decision:prd:shared:1"));
  assert.ok(second.related_atoms.includes("relation:linked"));
  assert.match(semanticBlockText(atoms, second), /decision:prd:shared:1/u);
  validateSemanticBlocks(atoms, blocks);
  assert.deepEqual(buildSemanticBlocks([...atoms].reverse()), blocks);
});

test("semantic coverage rejects a lost atom, duplicate ownership and missing related evidence", () => {
  const blocks = buildSemanticBlocks(atoms);
  for (const change of [
    (copy) => { copy[0].primary_atoms.pop(); },
    (copy) => { copy[0].primary_atoms.push(copy[1].primary_atoms[0]); },
    (copy) => { copy.find((block) => block.item_key === "element:prd:PRD-0002").related_atoms = []; },
  ]) {
    const copy = JSON.parse(JSON.stringify(blocks));
    change(copy);
    assert.throws(() => validateSemanticBlocks(atoms, copy));
  }
});

test("structurally valid relations remain visible for semantic judgment", () => {
  const input = [atom("element:prd:PRD-0001", [ref("PRD-0001")], "Never collect health data"),
    atom("relation:contradiction", [ref("PRD-0001")], "Implements mandatory health-data collection")];
  const blocks = buildSemanticBlocks(input);
  assert.equal(blocks.length, 1);
  assert.match(semanticBlockText(input, blocks[0]), /Never collect health data/u);
  assert.match(semanticBlockText(input, blocks[0]), /mandatory health-data collection/u);
});

test("changed shared evidence changes every affected block and no unrelated block", () => {
  const input = [...atoms, atom("element:prd:PRD-0003", [ref("PRD-0003")])];
  const blocks = buildSemanticBlocks(input);
  const changed = input.map((entry) => entry.item_key === "decision:prd:shared:1"
    ? atom(entry.item_key, entry.refs, "Changed shared guarantee.") : entry);
  const affected = blocks.filter((block) => semanticBlockText(input, block) !== semanticBlockText(changed, block));
  assert.deepEqual(affected.map((block) => block.item_key), ["element:prd:PRD-0001", "element:prd:PRD-0002"]);
  validateSemanticBlocks(changed, blocks);
});
