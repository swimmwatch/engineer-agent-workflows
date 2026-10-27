import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { reviewWorkflowFixture } from "../../packages/engineer-agent-workflow-mcp/test-support/review-workflow-fixture.mjs";

const cases = {
  "sequential-omission": { kind: "omission", requirements: 26, concurrency: 1, expected: "gaps" },
  "native-omission": { kind: "omission", requirements: 26, concurrency: 4, expected: "gaps" },
  "native-clean": { kind: "clean", requirements: 26, concurrency: 4, expected: "reviewed" },
  "native-paraphrase": { kind: "paraphrase", requirements: 1, concurrency: 4, expected: "reviewed" },
  "native-conflict": { kind: "conflict", requirements: 2, concurrency: 4, expected: "gaps", consistency: "conflict" },
};

export function nativeCase(name) {
  const selected = cases[name];
  if (!selected) throw Object.assign(new Error("Unknown native qualification case."), { code: "INVALID_NATIVE_INPUT" });
  return { name, ...selected };
}

function fingerprint(text) { return createHash("sha256").update(text).digest("hex"); }

const inputContract = "A valid input is a non-null, non-array JSON object whose only member is value and whose value is a string. Every other input returns exactly {\"status\":\"error\",\"code\":\"INVALID_INPUT\"}; do not throw an exception. Validate this shape before applying the operation's value rule.";
const pureContract = "The operation is deterministic and performs no external I/O, input mutation, persistent-state access, clock reading or randomness. Returned objects contain exactly the stated keys.";
const emptyRule = "Before the ordinary success result, a valid input with value equal to the zero-length string must return exactly {\"status\":\"error\",\"code\":\"EMPTY_VALUE\"}; it must not return a successful value.";

function readySource() {
  return "Operation CLI-001 receives one JSON value. A valid input is a non-null, non-array object with exactly one member ready whose value is a boolean. Every other input returns exactly {\"status\":\"error\",\"code\":\"INVALID_INPUT\"}; do not throw. If ready is true return exactly {\"status\":\"ok\"}; if ready is false return exactly {\"status\":\"pending\"}. " + pureContract;
}

function readyRequirement() {
  return "CLI-001 is a pure JSON-to-JSON operation. Accept an object containing only the boolean ready; reject every other JSON value with exactly {\"status\":\"error\",\"code\":\"INVALID_INPUT\"}, without throwing. On the valid domain, return exactly {\"status\":\"ok\"} when ready is true, and exactly {\"status\":\"pending\"} when it is false. " + pureContract;
}

function requirementContract(identifier, kind) {
  if (kind === "paraphrase") return readyRequirement();
  const success = identifier === "CLI-001"
    ? "After validation, the ordinary success result is an object with status equal to \"ok\" and value equal to input.value. Preserve the exact string value without normalization or trimming."
    : "After validation, construct result by concatenating the literal string \"" + identifier + ":\" with input.value in that order. Return an object with status equal to \"ok\" and value equal to result. This rule includes a zero-length value.";
  const exception = identifier === "CLI-001" && kind === "clean" ? " " + emptyRule : "";
  return "Operation " + identifier + " receives one JSON value. " + inputContract + " " + success + exception + " " + pureContract;
}

function sourceContract(identifier, kind) {
  if (kind === "paraphrase") return readySource();
  if (identifier === "CLI-001") {
    return "Operation CLI-001 receives one JSON value. " + inputContract
      + " For every valid non-zero-length value return an object with status equal to \"ok\" and value equal to input.value, preserving the exact string value without normalization or trimming. The separately linked zero-length-value instruction owns that valid case; this base instruction does not specify it. " + pureContract;
  }
  return requirementContract(identifier, kind);
}

function controlSource(kind) {
  if (kind === "paraphrase") return readySource();
  if (kind === "conflict") {
    return "For CLI-001, every valid input, including a zero-length value, returns an object with status equal to \"ok\" and value equal to input.value. Apply the same response mapping consistently in every specification section. " + pureContract;
  }
  return "For CLI-001, " + emptyRule + " This rule supplements the base non-zero-length mapping; preserve both without changing the CLI-001 identifier.";
}

async function semanticOracle(fixture, kind, controlReference, specSha256, sourceSha256) {
  const required = [];
  const permitted = [];
  for (let index = 0; index < fixture.review.total_items - 1; index += 1) {
    const read = await fixture.readItem(fixture.author, index);
    const item = read.payload;
    const requirement = item.kind === "requirement" && item.source.id === "CLI-001";
    const source = item.kind === "source" && item.source.id === controlReference.id
      && item.source.revision === controlReference.revision;
    const linkedSource = item.kind === "source" && item.source.requirement_ids?.includes("CLI-001");
    if (requirement || source) required.push(index);
    if (requirement || source || item.kind === "profile" || (kind === "conflict" && linkedSource)) permitted.push(index);
  }
  if (required.length !== 2) throw new Error("The controlled behavior must have one exact source and one requirement item.");
  return { kind: kind === "omission" ? "empty-input-rejection-v2" : "inconsistent-response-v1", requirement_id: "CLI-001",
    detailed_items: fixture.review.total_items - 1, required_finding_item_indices: kind === "omission" ? required : [],
    permitted_finding_item_indices: permitted, spec_sha256: specSha256, source_sha256: sourceSha256 };
}

/** Only synthetic, newly created fixture targets are accepted by the runner. */
export async function createNativeCaseFixture(name, cleanup, options = {}) {
  const selected = nativeCase(name);
  function requirementText(identifier) { return requirementContract(identifier, selected.kind); }
  function sourceText(identifiers) {
    function contract(identifier) { return sourceContract(identifier, selected.kind); }
    return identifiers.map(contract).join("\n\n");
  }
  const fixture = await reviewWorkflowFixture({ after: cleanup }, {
    requirements: selected.requirements, independentSources: true, concurrency: selected.concurrency,
    requirementText, sourceText,
    entrypoint: options.entrypoint,
  });
  let spec = fixture.spec;
  if (selected.kind === "conflict") {
    spec += "\n## CLI-001 response contract\nFor the same CLI-001 operation and the valid input {\"value\":\"ready\"}, the successful result must instead be exactly {\"status\":\"ok\",\"value\":\"other\"}. This section and CLI-001's requirement apply simultaneously to the same input; neither has precedence.\n";
  }
  await writeFile(join(fixture.directory, "spec.md"), spec);
  fixture.spec = spec;
  const source = controlSource(selected.kind);
  const control = await fixture.author.call("decision_record_instruction", {
    category: "fixture", kind: "initial_request", text: source,
    source: "fixture-customer:semantic-control", requirement_ids: ["CLI-001"],
  });
  const review = await fixture.author.call("specification_review_start", { require_consistency: true });
  fixture.selectReview(review);
  const sourceTexts = fixture.ids.map(function contract(identifier) { return sourceContract(identifier, selected.kind); });
  const specSha256 = fingerprint(spec);
  const sourceSha256 = fingerprint(JSON.stringify({ base_sources: sourceTexts, control_source: source }));
  const oracle = ["omission", "conflict"].includes(selected.kind)
    ? await semanticOracle(fixture, selected.kind, control.decision_ref, specSha256, sourceSha256) : null;
  return { fixture, selected, specSha256, sourceSha256, oracle };
}
