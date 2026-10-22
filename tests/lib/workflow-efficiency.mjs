import { verifyCapturedArtifacts } from "../../scripts/lib/captured-evidence.mjs";

const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string" && value.length > 0;
const strings = value => Array.isArray(value) && value.every(text);
const identifiedRecords = value => Array.isArray(value) &&
  value.every(item => record(item) && text(item.id)) && new Set(value.map(item => item.id)).size === value.length;
const validationIdentity = value => record(value) && ["purpose", "owner", "input"].every(key => text(value[key]));
const retrievalIdentity = value => record(value) && text(value.source) &&
  ["retrieval", "continuation"].includes(value.operation) && ["pass", "unavailable"].includes(value.result);

// Observations and independently captured expected outcomes have separate digests.
// This evaluator neither authenticates their producer nor runs workflow operations.
export async function evaluateWorkflowEfficiency({ root, trace, outcomes }) {
  const documents = new Map();
  const findings = await verifyCapturedArtifacts([trace, outcomes], root, { jsonDocuments: documents });
  if (findings.length) return findings;
  const observed = documents.get(trace.ref), expected = documents.get(outcomes.ref);
  const add = (code, event) => findings.push({ code, event: event?.id ?? null });
  if (!Array.isArray(observed?.events) || !Array.isArray(expected?.sources) ||
      !identifiedRecords(expected?.actions) || !identifiedRecords(expected?.changes) ||
      !strings(expected?.triggers) || (expected.prerequisites !== undefined && !strings(expected.prerequisites)) ||
      expected.actions.some(action => !text(action.actor) || !text(action.context) ||
        !strings(action.sources) || !Array.isArray(action.checks) || !action.checks.every(validationIdentity) ||
        (action.blocked !== undefined && typeof action.blocked !== "boolean") ||
        (action.retrievals !== undefined && (!Array.isArray(action.retrievals) || !action.retrievals.every(retrievalIdentity)))) ||
      expected.changes.some(change => !["directory-metadata", "native", "external"].includes(change.kind) ||
        typeof change.overlap !== "boolean" || typeof change.protectedLoss !== "boolean")) {
    add("invalid-capture"); return findings;
  }
  if (!identifiedRecords(expected.sources) || expected.sources.some(source =>
    !text(source.owner) || !text(source.version) || !text(source.selection) ||
    !(text(source.revision) || (Number.isSafeInteger(source.revision) && source.revision >= 0)) ||
    !Number.isSafeInteger(source.portions) || source.portions < 1)) {
    add("invalid-source-identity"); return findings;
  }
  const sources = new Map(expected.sources.map(source => [source.id, source]));
  const identities = new Set(expected.sources.map(source => JSON.stringify([source.owner, source.version, source.revision, source.selection])));
  if (identities.size !== sources.size) {
    add("invalid-source-identity"); return findings;
  }
  const actors = new Map(), ids = new Set(), actions = new Set(), preserved = new Set(), preservationBlocks = new Set();
  const allowed = new Set(["prerequisite", "delivery", "reuse", "forget", "validation", "reuse-check",
    "disruption", "sync", "action", "preservation", "blocked", "approval", "review", "phase", "retrieval"]);
  for (const event of observed.events) {
    if (!record(event) || !text(event.id) || ids.has(event.id) || !text(event.actor) || !text(event.context) || !allowed.has(event.kind)) {
      add("invalid-event", event); continue;
    }
    ids.add(event.id);
    const key = JSON.stringify([event.actor, event.context]);
    if (!actors.has(key)) actors.set(key, { epoch: 0, sync: true, sources: new Map(), checks: new Map(), prerequisites: new Map(), retrievals: [] });
    const actor = actors.get(key);
    const ready = source => {
      const delivery = actor.sources.get(source), definition = sources.get(source);
      return definition && delivery?.complete && delivery.portions.size === definition.portions &&
        Array.from({ length: definition.portions }, (_, index) => index).every(index => delivery.portions.has(index));
    };
    const prerequisitesReady = () => (expected.prerequisites ?? []).every(name => actor.prerequisites.get(name) === "pass");
    if (event.kind === "prerequisite") actor.prerequisites.set(event.name, event.result);
    if (event.kind === "retrieval") {
      if (!sources.has(event.source) || !retrievalIdentity(event)) add("invalid-retrieval", event);
      else actor.retrievals.push({ ...event, epoch: actor.epoch });
    }
    if (event.kind === "disruption") {
      actor.epoch++; actor.sync = false; actor.sources.clear();
    }
    if (event.kind === "sync") {
      if (typeof event.operation !== "string" || !event.operation || event.result !== "pass") add("invalid-recovery-sync", event);
      else actor.sync = true;
    }
    if (event.kind === "forget") actor.sources.delete(event.source);
    if (event.kind === "delivery") {
      const source = sources.get(event.source);
      if (!source || event.total !== source.portions || !Number.isSafeInteger(event.portion) ||
          event.portion < 0 || event.portion >= source.portions || !Number.isSafeInteger(event.bytes) || event.bytes < 1 ||
          event.complete !== (event.portion === source.portions - 1)) {
        add("invalid-delivery", event); continue;
      }
      if (source.trigger && source.trigger !== "always" && !expected.triggers.includes(source.trigger)) add("inapplicable-instruction", event);
      if (source.requiresReceipt && event.complete && (typeof event.receipt !== "string" || !event.receipt)) add("missing-complete-receipt", event);
      if (event.bulk && !prerequisitesReady()) add("late-prerequisite", event);
      const delivery = actor.sources.get(event.source) ?? { portions: new Set(), complete: false, ids: new Set() };
      if (delivery.portions.has(event.portion)) add("redundant-delivery", event);
      delivery.portions.add(event.portion); delivery.ids.add(event.id); delivery.complete ||= event.complete;
      actor.sources.set(event.source, delivery);
    }
    if (event.kind === "reuse" && (!ready(event.source) || !actor.sources.get(event.source).ids.has(event.delivery))) add("invalid-source-reuse", event);
    if (event.kind === "validation") {
      if (!validationIdentity(event) || !["pass", "fail", "unavailable"].includes(event.result)) {
        add("invalid-validation", event); continue;
      }
      if ([...actor.checks.values()].some(check => check.result === "pass" && check.epoch === actor.epoch &&
        check.purpose === event.purpose && check.owner === event.owner && check.input === event.input)) add("redundant-check", event);
      actor.checks.set(event.id, { ...event, epoch: actor.epoch });
    }
    if (event.kind === "reuse-check") {
      const check = actor.checks.get(event.check);
      if (!check || check.result !== "pass" || check.epoch !== actor.epoch ||
          ["purpose", "owner", "input"].some(field => event[field] !== check[field])) add("invalid-check-reuse", event);
    }
    if (["approval", "review"].includes(event.kind) && !expected.triggers.includes(event.reason)) add("reopened-readiness", event);
    if (event.kind === "preservation") {
      const change = expected.changes.find(change => change.id === event.change);
      const safe = change && change.overlap === false && change.protectedLoss === false && (
        (change.kind === "directory-metadata" && change.contentChanged === false) ||
        (change.kind === "native" && typeof change.before === "string" && typeof change.after === "string" &&
          change.before === change.expectedBefore && change.after === change.expectedAfter) ||
        (change.kind === "external" && event.inspected === true));
      if (!change || (event.disposition === "accept" && !safe)) add("unsafe-preservation", event);
      if (change && ["accept", "block"].includes(event.disposition)) preserved.add(change.id);
      if (change && event.disposition === "block") preservationBlocks.add(change.id);
    }
    if (["action", "blocked"].includes(event.kind)) {
      const action = expected.actions.find(action => action.id === event.action && action.actor === event.actor && action.context === event.context);
      if (!action || actions.has(event.action)) { add("unexpected-action", event); continue; }
      actions.add(event.action);
      if (event.kind === "blocked") {
        if (!action.blocked) add("unexpected-block", event);
        for (const required of action.retrievals ?? []) {
          if (!actor.retrievals.some(attempt => attempt.epoch === actor.epoch &&
            ["source", "operation", "result"].every(field => attempt[field] === required[field]))) {
            add("missing-supported-retrieval", event);
          }
        }
        continue;
      }
      if (action.blocked) add("dependent-action-not-blocked", event);
      if (preservationBlocks.size) add("unresolved-preservation-block", event);
      if (!actor.sync) add("missing-recovery-sync", event);
      if (!prerequisitesReady()) add("missing-prerequisite", event);
      for (const source of action.sources ?? []) if (!ready(source)) add("missing-source-portion", event);
      for (const required of action.checks ?? []) {
        if (![...actor.checks.values()].some(check => check.result === "pass" && check.epoch === actor.epoch &&
          ["purpose", "owner", "input"].every(field => check[field] === required[field]))) add("missing-owning-validation", event);
      }
    }
  }
  for (const action of expected.actions) if (!actions.has(action.id)) add("missing-action", { id: action.id });
  for (const change of expected.changes) if (!preserved.has(change.id)) add("uninspected-change", { id: change.id });
  return findings;
}
