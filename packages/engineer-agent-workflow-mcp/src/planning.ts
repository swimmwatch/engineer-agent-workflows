import { randomUUID } from "node:crypto";
import { fromMarkdown } from "mdast-util-from-markdown";
import { z } from "zod";
import { tool } from "./api.js";
import { specificationState } from "./checks.js";
import { portion, requirementSource } from "./requirements.js";
import { reference, ref } from "./scope.js";
import { contextInput, fail, hash, id, load, mutate, obj, page, readConsistent, readDependency, rows, strings, text, WorkflowError } from "./state.js";
import type { Context, Data } from "./state.js";

export const MAX_PROPOSAL_BYTES = 128 * 1024;
export const MAX_PROPOSAL_INPUT_BYTES = 1024 * 1024;
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const sourceInput = z.object({ path: id, heading: text }).strict();
const proposalInput = z.object({ id, packet_id: id, requirement_ids: z.array(id).min(1).max(100), sources: z.array(sourceInput).min(1).max(20) }).strict();
type ProposalInput = z.output<typeof proposalInput>;
const option = z.object({ id, label: text, description: text.optional() }).strict();
const binding = z.object({ option_id: id, proposal_ids: z.array(id).max(20) }).strict();
const kind = z.enum(["single_choice", "multiple_choice", "free_text"]);
const outcomes = z.enum(["dismissed", "cancelled", "timed_out", "unavailable", "invalid_response", "failed"]);

function distinct(values: unknown[], message: string): void {
  if (new Set(values).size !== values.length) fail("INVALID_INPUT", message);
}
function headingText(node: { value?: string; children?: readonly unknown[] }): string {
  return node.value ?? (node.children ?? []).map(child => headingText(child as Parameters<typeof headingText>[0])).join("");
}
export async function readProposalSources(context: Context, proposals: ProposalInput[]): Promise<Data[]> {
  let bytes = 0, inputBytes = 0;
  const loaded = new Map<string, { content: string; nodes: ReturnType<typeof fromMarkdown>["children"] }>();
  const snapshots: Data[] = [];
  for (const proposal of proposals) {
    distinct(proposal.requirement_ids, "Requirement IDs must be unique.");
    distinct(proposal.sources.map(source => JSON.stringify(source)), "Proposal sources must be unique.");
    const sources: Data[] = [];
    for (const source of proposal.sources) {
      if (!source.path.startsWith(`docs/specs/${context.specification}/tasks/`) || !source.path.endsWith(".md")) fail("UNSAFE_PATH", "Proposal sources must be Markdown files under this specification's tasks directory.");
      let parsed = loaded.get(source.path);
      if (!parsed) {
        const input = await readDependency(context, source.path, MAX_PROPOSAL_INPUT_BYTES - inputBytes);
        if (!input) fail("NOT_FOUND", "The proposal source is missing.");
        inputBytes += input.length;
        let content: string;
        try { content = new TextDecoder("utf-8", { fatal: true }).decode(input); }
        catch { return fail("INVALID_INPUT", "Proposal Markdown must be valid UTF-8."); }
        parsed = { content, nodes: fromMarkdown(content).children };
        loaded.set(source.path, parsed);
      }
      const matches = parsed.nodes.filter(node => node.type === "heading" && headingText(node) === source.heading);
      if (matches.length !== 1) fail("BROKEN_REFERENCE", "Proposal heading must identify exactly one top-level Markdown section.");
      const heading = matches[0]!;
      if (heading.type !== "heading") fail("BROKEN_REFERENCE", "Expected a heading.");
      const index = parsed.nodes.indexOf(heading);
      const next = parsed.nodes.slice(index + 1).find(node => node.type === "heading" && node.depth <= heading.depth);
      const body = parsed.content.slice(heading.position!.start.offset, next?.position?.start.offset ?? parsed.content.length);
      bytes += Buffer.byteLength(body);
      if (bytes > MAX_PROPOSAL_BYTES) fail("SOURCE_LIMIT", "Cumulative proposal source snapshots exceed 128 KiB.");
      sources.push({ ...source, text: body, digest: hash(body) });
    }
    const snapshot = { ...proposal, sources };
    snapshots.push({ ...snapshot, digest: hash(JSON.stringify(snapshot)) });
  }
  return snapshots;
}

function records(ledger: Data): Data[] {
  return rows(obj(ledger.planning_decisions ?? { version: 1, records: [] }).records);
}
export function currentPlanningDecisions(ledger: Data): Data[] {
  const current = new Map<unknown, Data>();
  for (const record of records(ledger)) {
    const prior = current.get(record.id);
    if (record.revision !== Number(prior?.revision ?? 0) + 1 || record.supersedes_revision !== (prior?.revision ?? null)) fail("INVALID_STATE", "Planning history revisions are not contiguous.");
    current.delete(record.id); current.set(record.id, record);
  }
  return [...current.values()];
}
function latestPreparedQuestion(ledger: Data, packet: string): Data | undefined {
  return records(ledger).findLast(record => record.status === "prepared" && rows(record.proposals).some(proposal => proposal.packet_id === packet));
}
function exactRecord(ledger: Data, target: z.output<typeof reference>): Data {
  const found = records(ledger).find(record => record.id === target.id && record.revision === target.revision);
  if (!found) fail("BROKEN_REFERENCE", "Planning reference does not belong to this specification history.");
  for (const proposal of rows(found.proposals)) {
    const sources = rows(proposal.sources).map(source => ({ path: source.path, heading: source.heading, text: source.text, digest: source.digest }));
    if (sources.some(source => source.digest !== hash(String(source.text))) || proposal.digest !== hash(JSON.stringify({ id: proposal.id, packet_id: proposal.packet_id, requirement_ids: proposal.requirement_ids, sources }))) fail("INVALID_STATE", "Saved proposal snapshot text or digest is inconsistent.");
  }
  return found;
}
function selectedRecord(ledger: Data, target: z.output<typeof reference>): Data {
  exactRecord(ledger, target);
  const found = currentPlanningDecisions(ledger).find(record => record.id === target.id)!;
  if (found.revision !== target.revision) fail("CONFLICT", "Planning question changed; read its latest revision before answering.");
  return found;
}
export function appendPlanningRevision(ledger: Data, fields: Data, prior?: Data): Data {
  const record = { ...fields, id: prior?.id ?? randomUUID(), revision: Number(prior?.revision ?? 0) + 1, supersedes_revision: prior?.revision ?? null };
  ledger.planning_decisions = { version: 1, records: [...records(ledger), record] };
  return record;
}
async function eligible(context: Context, expected?: string): Promise<Data> {
  const state = await specificationState(context, expected, false);
  if (expected && state.source_version !== expected) fail("SOURCE_CHANGED", "The reviewed specification changed; return to its owning workflow.");
  if (state.status !== "pass" || state.document_status !== "approved" || !["reviewed", "legacy_unverified"].includes(String(state.coverage_status))) fail("PREREQUISITE_REQUIRED", "Planning requires an Approved specification and current scope/review checks.", { specification_state: state });
  return state;
}
async function freshProposals(context: Context, question: Data): Promise<void> {
  const saved = rows(question.proposals);
  const current = await readProposalSources(context, saved.map(proposal => ({ id: String(proposal.id), packet_id: String(proposal.packet_id), requirement_ids: strings(proposal.requirement_ids), sources: rows(proposal.sources).map(source => ({ path: String(source.path), heading: String(source.heading) })) })));
  if (current.some((proposal, index) => proposal.digest !== saved[index]!.digest)) fail("SOURCE_CHANGED", "Technical proposal sources changed; revise and ask the affected proposals again.");
}
function packetIds(proposals: Data[]): string[] { return [...new Set(proposals.map(proposal => String(proposal.packet_id)))]; }
function answerResult(record: Data): Data {
  const proposals = rows(record.proposals), agreements = rows(record.agreements);
  return { decision_ref: ref(record), question_ref: ref(record), agreements,
    unresolved_packet_ids: packetIds(proposals).filter(packet => !agreements.some(agreement => agreement.packet_id === packet)) };
}
function stale(reason: string): Data { return { status: "stale", issues: [{ code: "STALE_AGREEMENT", message: reason }] }; }
function rejectsProposal(record: Data, proposal: Data): boolean {
  if (record.answer === null || !rows(record.proposals).some(item => item.id === proposal.id && item.packet_id === proposal.packet_id)) return false;
  const answer = obj(record.answer);
  return strings(answer.rejected_proposal_ids ?? []).includes(String(proposal.id))
    || rows(obj(record.question).option_bindings).some(binding => strings(answer.selected_ids).includes(String(binding.option_id)) && !strings(binding.proposal_ids).length);
}

export async function checkPlanningPacket(context: Context, packet: string, agreementRef?: z.output<typeof reference>, expectedDigest?: string): Promise<Data> {
  const ledger = (await load(context, "decisions")).value;
  const accepted = agreementRef ? exactRecord(ledger, agreementRef) : undefined;
  let state: Data;
  try { state = await eligible(context); }
  catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    return { status: "blocked", issues: [{ code: error.code, message: error.message }] };
  }
  if (!accepted) return { status: "needs_agreement", issues: [{ code: "ANSWER_REQUIRED", message: "This packet needs an exact technical agreement reference and proposal digest." }] };
  const questions = currentPlanningDecisions(ledger);
  const prepared = latestPreparedQuestion(ledger, packet);
  const current = prepared && questions.find(record => record.id === prepared.id);
  if (current) exactRecord(ledger, { id: String(current.id), revision: Number(current.revision) });
  const agreement = current && rows(current.agreements).find(item => item.packet_id === packet && JSON.stringify(item.agreement_ref) === JSON.stringify(agreementRef));
  if (!agreement || agreement.proposal_digest !== expectedDigest || accepted.answer === null) return stale("The answer, packet membership or selected proposal digest is no longer current.");
  const proposal = rows(current.proposals).find(item => item.id === agreement.proposal_id);
  const answer = obj(accepted.answer);
  const original = rows(accepted.proposals).find(item => item.id === agreement.proposal_id && item.packet_id === packet);
  if (!proposal || proposal.digest !== expectedDigest || original?.digest !== expectedDigest || !strings(answer.accepted_proposal_ids).includes(String(proposal.id)) || current.source_version !== state.source_version || current.specification_version !== state.specification_version || current.review_ref !== state.review_ref) return stale("The reviewed specification or accepted technical proposal changed.");
  if (records(ledger).some(record => record.id === accepted.id && Number(record.revision) > Number(accepted.revision) && Number(record.revision) <= Number(current.revision) && rejectsProposal(record, proposal))) return stale("This acceptance was withdrawn; use a new explicit agreement reference.");
  try { await freshProposals(context, { proposals: [proposal] }); }
  catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    return stale(error.message);
  }
  return { status: "ready", issues: [], agreement_ref: agreementRef, proposal_id: proposal.id, proposal_digest: proposal.digest, source_version: state.source_version, specification_version: state.specification_version, review_ref: state.review_ref };
}

export const planningTools = [
  tool("planning_question_prepare", "Freeze exact task proposal sections and technical question before asking through the native host tool; never answers or authorizes implementation.", z.object({
    ...contextInput, expected_source_version: digest, text, kind,
    options: z.array(option).max(20).default([]), proposals: z.array(proposalInput).min(1).max(20),
    option_bindings: z.array(binding).max(20).default([]), revises: reference.optional(),
  }).strict(), true, async a => mutate(a.context, "decisions", "planning_question_prepare", a, async (ledger, context) => {
    const state = await eligible(context, a.expected_source_version);
    distinct(a.proposals.map(proposal => proposal.id), "Proposal IDs must be unique.");
    distinct(a.options.map(option => option.id), "Question options must be unique.");
    distinct(a.option_bindings.map(binding => binding.option_id), "Each option has one proposal binding.");
    if (a.kind === "free_text" ? a.options.length || a.option_bindings.length : !a.options.length || a.option_bindings.length !== a.options.length) fail("INVALID_INPUT", "Question kind, options and bindings must agree.");
    const source = await requirementSource(context);
    for (const proposal of a.proposals) for (const requirement of proposal.requirement_ids) if (!source.requirements.some(item => item.id === requirement)) fail("BROKEN_REFERENCE", "Proposal requirements must exist in the current specification.");
    for (const binding of a.option_bindings) {
      distinct(binding.proposal_ids, "Option proposal IDs must be unique.");
      if (!a.options.some(option => option.id === binding.option_id) || binding.proposal_ids.some(id => !a.proposals.some(proposal => proposal.id === id))) fail("INVALID_INPUT", "Option bindings must name saved options and proposals.");
      distinct(binding.proposal_ids.map(id => a.proposals.find(proposal => proposal.id === id)!.packet_id), "An option cannot accept two alternatives for the same packet.");
    }
    const proposals = await readProposalSources(context, a.proposals);
    const prior = a.revises ? selectedRecord(ledger, a.revises) : undefined;
    const unchangedPackets = prior ? packetIds(proposals).filter(packet => {
      const signature = (items: Data[]) => JSON.stringify(items.filter(proposal => proposal.packet_id === packet).map(proposal => [proposal.id, proposal.digest]));
      return latestPreparedQuestion(ledger, packet)?.id === prior.id && signature(rows(prior.proposals)) === signature(proposals);
    }) : [];
    const agreements = prior ? rows(prior.agreements).filter(agreement => unchangedPackets.includes(String(agreement.packet_id))) : [];
    const question = { text: a.text, kind: a.kind, options: a.options, option_bindings: a.option_bindings };
    const record = appendPlanningRevision(ledger, { question, proposals, answer: null, agreements, status: "prepared", source_version: state.source_version, specification_version: state.specification_version, review_ref: state.review_ref }, prior);
    return { question_ref: ref(record), question, proposals: proposals.map(proposal => ({ id: proposal.id, packet_id: proposal.packet_id, digest: proposal.digest })), next: "Ask this saved question through the native host question tool and record its actual answer." };
  }, ["manifest"])),
  tool("planning_question_record_answer", "Preserve an actual technical answer and exact accepted proposal bindings; partial or rejected answers never approve uncovered packets or product changes.", z.object({
    ...contextInput, question_ref: reference, text: z.string().max(4096), source: text,
    selected_ids: z.array(id).max(20).default([]), accepted_proposal_ids: z.array(id).max(20).optional(),
    rejected_proposal_ids: z.array(id).max(20).optional(),
  }).strict(), true, async a => mutate(a.context, "decisions", "planning_question_record_answer", a, async (ledger, context) => {
    const prior = selectedRecord(ledger, a.question_ref), question = obj(prior.question), proposals = rows(prior.proposals);
    await eligible(context, String(prior.source_version)); await freshProposals(context, prior);
    distinct(a.selected_ids, "Selected option IDs must be unique.");
    if ((!a.text.trim() && !a.selected_ids.length) || (question.kind === "single_choice" && a.selected_ids.length > 1) || a.selected_ids.some(id => !rows(question.options).some(option => option.id === id))) fail("INVALID_INPUT", "Record actual answer text or selections and only saved question options.");
    const fromOptions = [...new Set(rows(question.option_bindings).filter(binding => a.selected_ids.includes(String(binding.option_id))).flatMap(binding => strings(binding.proposal_ids)))];
    const accepted = a.accepted_proposal_ids ?? fromOptions;
    distinct(accepted, "Accepted proposal IDs must be unique.");
    if (accepted.some(id => !proposals.some(proposal => proposal.id === id)) || (a.selected_ids.length && JSON.stringify([...accepted].sort()) !== JSON.stringify([...fromOptions].sort()))) fail("INVALID_INPUT", "Accepted proposals must match the saved choice bindings or an explicit custom answer.");
    distinct(accepted.map(id => proposals.find(proposal => proposal.id === id)!.packet_id), "An answer cannot accept two alternatives for the same packet.");
    const rejectsQuestion = rows(question.option_bindings).some(binding => a.selected_ids.includes(String(binding.option_id)) && !strings(binding.proposal_ids).length);
    const rejected = a.rejected_proposal_ids ?? (rejectsQuestion ? proposals.map(proposal => String(proposal.id)) : []);
    distinct(rejected, "Rejected proposal IDs must be unique.");
    if (rejected.some(id => !proposals.some(proposal => proposal.id === id)) || rejected.some(id => accepted.includes(id)) || (rejectsQuestion && (accepted.length || JSON.stringify([...rejected].sort()) !== JSON.stringify(proposals.map(proposal => String(proposal.id)).sort())))) fail("INVALID_INPUT", "Rejections must name saved proposals, cannot also accept them, and must preserve the saved rejection option's scope.");
    const previousAgreements = rows(prior.agreements);
    const agreements = previousAgreements.filter(agreement => !rejected.includes(String(agreement.proposal_id)));
    for (const id of accepted) {
      const proposal = proposals.find(proposal => proposal.id === id)!;
      if (previousAgreements.some(agreement => agreement.packet_id === proposal.packet_id && agreement.proposal_id !== id)) fail("INVALID_INPUT", "A changed technical choice requires a revised proposal question.");
    }
    const record = appendPlanningRevision(ledger, { ...prior, answer: { text: a.text, source: a.source, selected_ids: a.selected_ids, accepted_proposal_ids: accepted, rejected_proposal_ids: rejected, question_ref: a.question_ref }, status: "answered", agreements: [...agreements] }, prior);
    for (const id of accepted) {
      const proposal = proposals.find(proposal => proposal.id === id)!;
      if (!agreements.some(agreement => agreement.proposal_id === id)) (record.agreements as Data[]).push({ packet_id: proposal.packet_id, proposal_id: id, agreement_ref: ref(record), proposal_digest: proposal.digest });
    }
    return answerResult(record);
  }, ["manifest"])),
  tool("planning_question_record_no_answer", "Retain a genuine non-answer outcome without fabricating agreement or erasing an already answered revision.", z.object({ ...contextInput, question_ref: reference, outcome: outcomes }).strict(), true, async a => mutate(a.context, "decisions", "planning_question_record_no_answer", a, async (ledger, context) => {
    const prior = selectedRecord(ledger, a.question_ref);
    await eligible(context, String(prior.source_version));
    if (prior.answer !== null) fail("INVALID_STATE", "An answered revision cannot be replaced with a non-answer.");
    const record = appendPlanningRevision(ledger, { ...prior, status: a.outcome }, prior);
    return { question_ref: ref(record), status: record.status, next: "Wait for the actual answer; uncovered packets remain unresolved." };
  }, ["manifest"])),
  tool("planning_decision_find", "Find bounded technical question history or current records, kept separate from behavioral specification decisions.", z.object({ ...contextInput, packet_id: id.optional(), history: z.boolean().default(false), limit: z.number().int().min(1).max(20).default(20), cursor: text.optional() }).strict(), false, async a => readConsistent(a.context, async context => {
    const ledger = (await load(context, "decisions")).value;
    const selected = (a.history ? records(ledger) : currentPlanningDecisions(ledger)).filter(record => !a.packet_id || rows(record.proposals).some(proposal => proposal.packet_id === a.packet_id));
    return page(selected.map(record => ({ decision_ref: ref(record), status: record.status, packet_count: packetIds(rows(record.proposals)).length, preview: String(obj(record.question).text).slice(0, 200) })), a.cursor, a.limit, hash(JSON.stringify([context.project, context.specification, selected, a.packet_id, a.history, a.limit])));
  })),
  tool("planning_decision_get", "Read one exact immutable technical revision, including proposal snapshots and actual answer; follow every continuation.", z.object({ ...contextInput, decision_ref: reference, cursor: text.optional() }).strict(), false, async a => readConsistent(a.context, async context => {
    const record = exactRecord((await load(context, "decisions")).value, a.decision_ref), content = JSON.stringify(record, null, 2);
    return { decision_ref: a.decision_ref, ...portion(content, hash(JSON.stringify([context.project, context.specification, record])), a.cursor) };
  })),
  tool("planning_packet_check", "Check a packet's exact accepted technical proposal against current sources and reviewed specification; no answer or stale evidence never grants readiness.", z.object({ ...contextInput, packet_id: id, agreement_ref: reference.optional(), expected_proposal_digest: digest.optional() }).strict().refine(a => Boolean(a.agreement_ref) === Boolean(a.expected_proposal_digest), { message: "Provide both agreement_ref and expected_proposal_digest, or neither for a legacy packet." }), false, async a => readConsistent(a.context, context => checkPlanningPacket(context, a.packet_id, a.agreement_ref, a.expected_proposal_digest))),
];
