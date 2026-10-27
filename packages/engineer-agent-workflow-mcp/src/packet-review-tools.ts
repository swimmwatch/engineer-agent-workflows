import { z } from "zod";
import { tool } from "./api.js";
import { contextInput } from "./state.js";
import { listPacketReviewUnits, packetReviewSelection, preparePacketReviewInputs, readPacketReviewSource } from "./packet-review-inputs.js";

const ref = z.string().min(1).max(8192);
export const packetReviewTools = [
  tool("task_packet_review_prepare", "Prepare exact selected Git/packet inputs and a draft source-bound review inventory; no dispatch, checks or verdict.",
    z.object({ ...contextInput, selection: packetReviewSelection }).strict(), true,
    (input, signal) => preparePacketReviewInputs(input.context, input.selection, signal), false),
  tool("task_packet_review_units", "Read ordered draft review units with exact original references; consume every continuation before assessing coverage.",
    z.object({ ...contextInput, run_ref: ref, cursor: ref.optional() }).strict(), false,
    input => listPacketReviewUnits(input.context, input.run_ref, input.cursor)),
  tool("task_packet_review_source_get", "Read exact selected original portions with source-bound continuation and terminal delivery receipt; no semantic pass.",
    z.object({ ...contextInput, run_ref: ref, source_ref: ref, assignment_ref: ref.optional(), cursor: ref.optional() }).strict(), false,
    input => readPacketReviewSource(input.context, input.source_ref, input.cursor, input)),
];
