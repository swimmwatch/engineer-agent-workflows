import path from "node:path";

// Test-only fault injection shared by the real recovery worker and portable checks.
export function injectRecoveryCheckpointFailure(fs, root, sessionRef, phase, pathAPI = path) {
  const ref = JSON.parse(Buffer.from(sessionRef, "base64url"));
  const checkpointPath = pathAPI.join(root, "products", ref.product_id, "sessions", `${ref.id}.json`);
  const rename = fs.rename;
  let injected = false;
  fs.rename = async (from, to) => {
    if (!injected && to === checkpointPath) {
      const next = JSON.parse(await fs.readFile(from, "utf8"));
      if (next.pending?.recovery?.attempts === 1 &&
          ((phase === "before-attempt" && next.state === "unknown") ||
           (phase === "after-response" && next.pending.phase === "acknowledged"))) {
        injected = true;
        throw new Error("Synthetic recovery checkpoint failure");
      }
    }
    return rename(from, to);
  };
  return { path: checkpointPath, get injected() { return injected; }, restore() { fs.rename = rename; } };
}
