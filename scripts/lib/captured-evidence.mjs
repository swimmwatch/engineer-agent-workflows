import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

async function readRegularFile(target) {
  const handle = await fs.open(target, constants.O_RDONLY |
    (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  try {
    if (!(await handle.stat()).isFile()) throw new Error("Expected a regular file");
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

async function digestPath(target, kind) {
  const info = await fs.lstat(target);
  if (kind === "file" && info.isFile()) {
    const bytes = await readRegularFile(target);
    return { digest: createHash("sha256").update(bytes).digest("hex"), bytes };
  }
  if (kind !== "bundle" || !info.isDirectory()) throw new Error("Invalid artifact type");
  const files = [];
  async function visit(relativePath) {
    for (const entry of await fs.readdir(path.join(target, relativePath), { withFileTypes: true })) {
      const relative = path.posix.join(relativePath, entry.name);
      if (entry.isDirectory()) await visit(relative);
      else if (entry.isFile()) files.push(relative);
      else throw new Error("Only regular files and directories are supported");
    }
  }
  await visit("");
  if (!files.length) throw new Error("Empty source bundle");
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    hash.update(file).update("\0").update(await readRegularFile(path.join(target, file))).update("\0");
  }
  return { digest: hash.digest("hex") };
}

// The operator selects the report root; captured trees must be quiescent.
// This offline checker is not a sandbox against concurrent directory replacement.
export async function verifyCapturedArtifacts(artifacts, evidenceRoot, { jsonDocuments } = {}) {
  const findings = [];
  const root = await fs.realpath(evidenceRoot);
  if (!Array.isArray(artifacts)) {
    return [{ code: "captured-artifact-invalid", message: "An artifact list is required." }];
  }
  const seen = new Set();
  for (const artifact of artifacts ?? []) {
    try {
      const ref = artifact.ref;
      if (typeof ref !== "string" || !ref || /[\\:\0]/.test(ref) ||
          ref.split("/").some((part) => !part || part === "." || part === "..") || seen.has(ref)) {
        throw new Error("Invalid or duplicate artifact reference");
      }
      seen.add(ref);
      let target = root;
      for (const part of ref.split("/")) {
        target = path.join(target, part);
        if ((await fs.lstat(target)).isSymbolicLink()) throw new Error("Symbolic artifact reference");
      }
      const captured = await digestPath(target, artifact.kind ?? "file");
      if (captured.digest !== artifact.digest) {
        throw new Error("Captured bytes do not match the declared digest");
      }
      if (jsonDocuments && captured.bytes && ref.endsWith(".json")) {
        jsonDocuments.set(ref, JSON.parse(captured.bytes.toString("utf8")));
      }
    } catch {
      findings.push({
        code: "captured-artifact-invalid",
        message: "An artifact is missing, unsafe, or does not match its declared bytes.",
        ref: typeof artifact?.ref === "string" && seen.has(artifact.ref) ? artifact.ref : null,
      });
    }
  }
  return findings;
}
