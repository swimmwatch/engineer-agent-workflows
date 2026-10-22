import { createHash } from "node:crypto";

// Controlled qualification transport only; the upstream tool and source stay real.
export function boundedRetrieval(result) {
  if (result?.isError || result?.content?.length !== 1 || result.content[0].type !== "text") return result;
  let value;
  try { value = JSON.parse(result.content[0].text); } catch { return result; }
  if (typeof value.original_content !== "string") return result;
  const original = value.original_content, parts = [];
  let part = "", bytes = 0;
  for (const point of original) {
    const size = Buffer.byteLength(point);
    if (bytes + size > 512) { parts.push(part); part = ""; bytes = 0; }
    part += point; bytes += size;
  }
  if (part) parts.push(part);
  return { ...result, content: [
    { type: "text", text: JSON.stringify({ kind: "controlled-exact-retrieval", sourceHash: value.hash,
      sha256: createHash("sha256").update(original).digest("hex"), sourceBytes: Buffer.byteLength(original), portions: parts.length }) },
    ...parts.map(text => ({ type: "text", text })),
  ] };
}
