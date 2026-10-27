import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createSharedStdioHarness } from "./stdio-harness.mjs";

const entrypoint = fileURLToPath(new URL("../dist/main.js", import.meta.url));

async function installFault(settings) {
  const { createRequire, syncBuiltinESMExports } = await import("node:module");
  const { watch } = await import("node:fs");
  const require = createRequire(import.meta.url);
  const fs = require("node:fs/promises");
  const originalOpen = fs.open;
  const originalRename = fs.rename;
  let observedLock = false;
  let pausedRead = false;
  const emit = (name) => process.stderr.write("P00_FIXTURE:" + name + "\n");
  async function waitForRelease() {
    await new Promise((resolve, reject) => {
      const watcher = watch(settings.directory, inspect);
      watcher.on("error", reject);
      function inspect() {
        fs.access(settings.release).then(() => {
          watcher.close();
          resolve();
        }, (error) => {
          if (error.code !== "ENOENT") {
            watcher.close();
            reject(error);
          }
        });
      }
      emit("SOURCE_READ");
      inspect();
    });
  }
  fs.open = async function (...arguments_) {
    const [path, flags] = arguments_;
    if (settings.mode === "lock-attempt" || settings.mode === "observe-cancel") {
      if (!observedLock && flags === "wx" && String(path).endsWith(".workflow-lock")) {
        observedLock = true;
        emit("LOCK_ATTEMPT");
      }
    }
    const handle = await originalOpen(...arguments_);
    if (settings.mode === "pause-spec-read" && String(path).endsWith("/spec.md")) {
      const originalRead = handle.read.bind(handle);
      handle.read = async function (...readArguments) {
        const result = await originalRead(...readArguments);
        if (!pausedRead && result.bytesRead) {
          pausedRead = true;
          await waitForRelease();
        }
        return result;
      };
    }
    return handle;
  };
  fs.rename = async function (from, to) {
    if (settings.mode === "fail-commit" && String(to).endsWith("/decisions.yaml")) {
      throw Object.assign(new Error("Fixture commit failure."), { code: "EIO" });
    }
    return originalRename(from, to);
  };
  syncBuiltinESMExports();
  const { Server } = await import(settings.serverModule);
  if (settings.mode === "after-save") {
    const projectResult = Server.prototype.projectCallToolResult;
    Server.prototype.projectCallToolResult = function (value, ...arguments_) {
      const projected = projectResult.call(this, value, ...arguments_);
      if (projected.structuredContent?.result?.saved === true
        && projected.structuredContent.replayed !== true) {
        emit("SAVED_AFTER_CLEANUP");
        return new Promise(() => {});
      }
      return projected;
    };
  }
  if (settings.mode === "observe-cancel") {
    const setHandler = Server.prototype.setRequestHandler;
    Server.prototype.setRequestHandler = function (method, handler, ...arguments_) {
      if (method !== "tools/call" || typeof handler !== "function") {
        return setHandler.call(this, method, handler, ...arguments_);
      }
      return setHandler.call(this, method, async (request, context) => {
        if (request.params.name !== "specification_review_submit_batch") {
          return handler(request, context);
        }
        const signal = context.mcpReq.signal;
        const cancelled = () => emit("CANCELLED");
        signal.addEventListener("abort", cancelled, { once: true });
        try {
          return await handler(request, context);
        } finally {
          signal.removeEventListener("abort", cancelled);
          emit("SUBMISSION_SETTLED");
        }
      }, ...arguments_);
    };
  }
}

export async function reviewWorkflowFixture(t, options = {}) {
  const mcpEntrypoint = options.entrypoint ?? entrypoint;
  const project = await mkdtemp(join(tmpdir(), "eaw-review-workflow-"));
  const specification = "fixture";
  const directory = join(project, "docs/specs", specification);
  const actors = [];
  t.after(async () => {
    await Promise.all(actors.map((actor) => actor.harness.close()));
    await rm(project, { recursive: true, force: true });
  });
  async function actor(name, mode) {
    const pending = new Set();
    let context;
    let captured = "";
    let transport;
    let loader;
    let release;
    if (mode) {
      const faultDirectory = await mkdtemp(join(project, "fault-"));
      loader = join(faultDirectory, "loader.mjs");
      release = join(faultDirectory, "release");
      const settings = { mode, directory: faultDirectory, release,
        serverModule: import.meta.resolve("@modelcontextprotocol/server") };
      const installSource = installFault.toString();
      const settingsSource = JSON.stringify(settings);
      await writeFile(loader, "await (" + installSource + ")(" + settingsSource + ");\n");
    }
    const harness = createSharedStdioHarness({
      entrypoint,
      name,
      createClient: async () => {
        const client = new Client({ name, version: "1" });
            const args = loader ? ["--import", pathToFileURL(loader).href, mcpEntrypoint] : [mcpEntrypoint];
        transport = new StdioClientTransport({ command: process.execPath, args, stderr: "pipe" });
        transport.stderr.on("data", (chunk) => {
          captured = (captured + chunk.toString()).slice(-8192);
          for (const waiter of pending) {
            if (captured.includes(waiter.marker)) waiter.resolve();
          }
        });
        await client.connect(transport);
        return client;
      },
    });
    const value = {
      harness,
      context: () => context,
      trace: [],
      async call(name, arguments_ = {}, expectedError) {
        const projectBased = name === "specification_open" || name === "specification_review_prepare_workflow";
        const response = await harness.callTool({
          name,
          arguments: { ...(!projectBased && context ? { context } : {}), ...arguments_ },
        });
        const payload = response.structuredContent;
        value.trace.push({ name, error: response.isError === true,
          item_index: arguments_.item_index, review_ref: arguments_.review_ref });
        assert.ok(Buffer.byteLength(JSON.stringify(payload)) <= 24 * 1024);
        assert.ok(Buffer.byteLength(JSON.stringify(response)) <= 64 * 1024);
        if (expectedError) {
          assert.equal(response.isError, true);
          const codes = Array.isArray(expectedError) ? expectedError : [expectedError];
          assert.ok(codes.includes(payload.error.code), JSON.stringify(payload));
          return payload;
        }
        assert.notEqual(response.isError, true, JSON.stringify(payload));
        context = payload.context ?? context;
        return payload.result;
      },
      async raw(name, arguments_, requestOptions) {
        const client = await harness.start();
        return client.callTool({ name, arguments: arguments_ }, requestOptions);
      },
      async waitFor(marker, timeout = 5000) {
        const target = "P00_FIXTURE:" + marker;
        if (captured.includes(target)) return;
        await new Promise((resolve, reject) => {
          const waiter = { marker: target, resolve: () => {
            clearTimeout(timer);
            pending.delete(waiter);
            resolve();
          } };
          const timer = setTimeout(() => {
            pending.delete(waiter);
            reject(new Error("Missing fixture boundary: " + marker + "\n" + captured));
          }, timeout);
          pending.add(waiter);
        });
      },
      async release() {
        await writeFile(release, "");
      },
    };
    actors.push(value);
    await harness.start();
    return value;
  }
  const author = await actor("review-author-simulation");
  await author.call("specification_open", { project, specification });
  const proposed = await author.call("scope_propose", {
    depth: "standard",
    rationale: ["Isolated native-review protocol simulation."],
    profiles: [{ id: "core", reason: "Fixture CLI behavior." }],
  });
  const answered = await author.call("question_record_answer", {
    question_ref: proposed.question_ref, selected_ids: ["confirm"],
    text: "Simulation-only confirmed scope.", source: "fixture-customer:scope",
  });
  await author.call("scope_confirm", { proposal_ref: proposed.question_ref, answer_ref: answered.decision_ref });
  const count = options.requirements ?? 1;
  const idPrefix = options.idPrefix ?? "CLI";
  const ids = Array.from({ length: count }, (_, index) => idPrefix + "-" + String(index + 1).padStart(3, "0"));
  const details = options.requirementText ?? "Return the requested fixture value.";
  function requirementSection(id, index) {
    const text = typeof details === "function" ? details(id, index) : details;
    return "### " + id + ": Fixture behavior\n" + text + "\n";
  }
  const sections = ids.map(requirementSection);
  const spec = "# Native review fixture\n\nStatus: Draft\n\n" + sections.join("\n");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "spec.md"), spec);
  const sourceGroupSize = options.independentSources ? 1 : 50;
  for (let offset = 0; offset < ids.length; offset += sourceGroupSize) {
    const requirementIds = ids.slice(offset, offset + sourceGroupSize);
    const instruction = typeof options.sourceText === "function"
      ? options.sourceText(requirementIds, offset) : "Preserve every linked fixture behavior.";
    await author.call("decision_record_instruction", {
      category: "fixture", kind: "initial_request",
      text: instruction,
      source: "fixture-customer:instruction",
      requirement_ids: requirementIds,
    });
  }
  let review = await author.call("specification_review_start", { require_consistency: true });
  let target = { project, specification, review_ref: review.review_ref,
    source_version: review.source_version, host_concurrency: options.concurrency ?? 4 };
  async function prepare(reader, extra = {}) {
    return reader.call("specification_review_prepare_workflow", { ...target, ...extra });
  }
  async function openActor(name, mode) {
    const reader = await actor(name, mode);
    await reader.call("specification_open", { project, specification });
    return reader;
  }
  async function readItem(reader, index) {
    const parts = [];
    let cursor;
    let last;
    do {
      last = await reader.call("specification_review_get", {
        review_ref: review.review_ref, item_index: index, ...(cursor ? { cursor } : {}),
      });
      parts.push(last.text);
      cursor = last.next_cursor;
    } while (cursor);
    const body = parts.join("");
    return { last, body, payload: JSON.parse(body) };
  }
  function verdict(index, read) {
    return { item_index: index, read_receipt: read.last.read_receipt, verdict: "covered",
      explanation: "Simulation-only protocol verdict.",
      evidence_requirement_ids: read.payload.kind === "source" ? read.payload.source.requirement_ids ?? [] : [],
      evidence_source_refs: read.payload.kind === "requirement" ? read.payload.source_refs : [] };
  }
  async function batch(reader, group) {
    const metadata = [...group.items];
    let cursor = group.items_cursor;
    while (cursor) {
      const continuation = await prepare(reader, { cursor });
      const next = continuation.args.lanes[0];
      metadata.push(...next.items);
      cursor = next.items_cursor;
    }
    const items = [];
    for (const item of metadata) {
      const read = await readItem(reader, item.item_index);
      items.push(verdict(item.item_index, read));
    }
    return { context: reader.context(), review_ref: review.review_ref,
      source_version: review.source_version, group_ref: group.group_ref, items };
  }
  async function finish(verdictKind = "consistent") {
    await author.call("specification_open", { project, specification });
    for (let index = 0; index < review.total_items - 1; index++) {
      const read = await readItem(author, index);
      if (!read.last.recorded_result) {
        await author.call("specification_review_record", { review_ref: review.review_ref, ...verdict(index, read) });
      }
    }
    const final = await readItem(author, review.total_items - 1);
    await author.call("specification_review_consistency_record", {
      review_ref: review.review_ref, read_receipt: final.last.consistency_read_receipt,
      verdict: verdictKind, explanation: "Simulation-only final assessment.",
      ...(verdictKind === "consistent" ? {} : { counterexample: "Simulation-only cross-section omission." }),
    });
  }
  return { project, specification, directory, author, spec, ids, mcpEntrypoint,
    get review() { return review; },
    get target() { return target; },
    selectReview(selected) {
      review = selected;
      target = { ...target, review_ref: selected.review_ref, source_version: selected.source_version };
    },
    actor, openActor, prepare, readItem, verdict, batch, finish,
    async digest() {
      const bytes = await readFile(join(directory, "decisions.yaml"));
      return createHash("sha256").update(bytes).digest("hex");
    } };
}
