import assert from "node:assert/strict";
import test from "node:test";
import { packetChecklistComplete } from "./checklist.mjs";
const file = "01_timeout-range.md";
const observed = "# B2 completion checklist\n\nImplementation of [packet 01](01_timeout-range.md) is complete.\n\n- [x] 01: RED\n- [x] 01: GREEN\n- [x] 01: PROVE\n";
test("completed single-packet step checklist accepts its explicit packet link", () => {
  assert.equal(packetChecklistComplete(observed, file), true);
});
test("unfinished single-packet step checklist is rejected", () => {
  assert.equal(packetChecklistComplete(observed.replace("- [x] 01: GREEN", "- [ ] 01: GREEN"), file), false);
});
test("another packet link cannot attest this packet", () => {
  assert.equal(packetChecklistComplete(observed.replaceAll(file, "02_other.md"), file), false);
});
test("ambiguous multi-packet step checklist is rejected", () => {
  assert.equal(packetChecklistComplete(observed + "\n[Other](02_other.md)\n", file), false);
});
test("existing checked filename rows still support pending sibling packets", () => {
  assert.equal(packetChecklistComplete("- [x] [P01](01_timeout-range.md)\n- [ ] [P02](02_other.md)\n", file), true);
});
