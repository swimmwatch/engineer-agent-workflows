import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Artifact { readonly path: string; readonly sha256: string }
const distRoot = dirname(fileURLToPath(import.meta.url));
const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const embeddedStamp: unknown = null; // Runtime identity payload.

// Accept only a canonical JSON mapping/null initializer, never JavaScript expressions.
// Replace its data span alone so every surrounding executable byte stays hashed.
export function replaceEmbeddedRuntimeStamp(source: string, stamp: Record<string, unknown> | null): string {
  const matches = [...source.matchAll(/^const embeddedStamp = (.*); \/\/ Runtime identity payload\.\r?$/gmu)];
  const match = matches[0];
  if (matches.length !== 1 || match === undefined || match[1] === undefined) throw new Error("Invalid embedded identity declaration.");
  const payload: unknown = JSON.parse(match[1]);
  if ((payload !== null && (typeof payload !== "object" || Array.isArray(payload)))
    || JSON.stringify(payload) !== match[1]) throw new Error("Embedded identity must be canonical JSON data.");
  const start = match.index + "const embeddedStamp = ".length;
  return source.slice(0, start) + JSON.stringify(stamp) + source.slice(start + match[1].length);
}

// Identity payloads alone are excluded. Declarations are not executable payloads.
export function runtimeArtifacts(root: string = distRoot): Artifact[] {
  const artifacts: Artifact[] = [];
  function walk(relative: string): void {
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error("Non-regular runtime artifact.");
      if (entry.isDirectory()) walk(name);
      else if (name !== "runtime-stamp.json" && /\.(?:js|json)$/u.test(name)) {
        if (!entry.isFile()) throw new Error("Non-regular runtime artifact.");
        let contents: string | Buffer = readFileSync(join(root, name));
        if (name === "runtime-info.js") contents = replaceEmbeddedRuntimeStamp(contents.toString("utf8"), null);
        artifacts.push({ path: name, sha256: sha256(contents) });
      }
    }
  }
  walk("");
  const packagePath = join(root, "../package.json");
  if (!lstatSync(packagePath).isFile() || lstatSync(packagePath).isSymbolicLink()) throw new Error("Invalid package metadata.");
  artifacts.push({ path: "../package.json", sha256: sha256(readFileSync(packagePath)) });
  return artifacts.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

export function runtimeDigests(artifacts: readonly Artifact[]): { build_id: string; contract_digest: string } {
  return {
    build_id: sha256(JSON.stringify(artifacts)),
    contract_digest: sha256(JSON.stringify(artifacts.filter((artifact) => artifact.path.endsWith(".json")))),
  };
}

interface RuntimeIdentity {
  readonly package_version: string | null;
  readonly build_id: string | null;
  readonly contract_id: "workflow-2/product-1";
  readonly contract_digest: string | null;
  readonly identity_status: "verified" | "unavailable";
  readonly reason: string | null;
  readonly refresh_requirement: string | null;
}

function loadIdentity(): Readonly<RuntimeIdentity> {
  let packageVersion: string | null = null;
  try {
    const metadata = JSON.parse(readFileSync(join(distRoot, "../package.json"), "utf8")) as { version?: unknown };
    if (typeof metadata.version === "string" && /^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/u.test(metadata.version)
      && metadata.version.length <= 128) packageVersion = metadata.version;
    if (packageVersion === null) throw new Error("Invalid package metadata.");
    const filename = join(distRoot, "runtime-stamp.json");
    const status = lstatSync(filename);
    if (!status.isFile() || status.isSymbolicLink() || status.size > 1024 * 1024) throw new Error("Invalid build metadata.");
    const stamp = JSON.parse(readFileSync(filename, "utf8")) as Record<string, unknown>;
    const artifacts = runtimeArtifacts();
    const digests = runtimeDigests(artifacts);
    if (JSON.stringify(embeddedStamp) !== JSON.stringify(stamp)
      || stamp.stamp_version !== 1 || stamp.package_version !== packageVersion
      || stamp.build_id !== digests.build_id || stamp.contract_digest !== digests.contract_digest
      || JSON.stringify(stamp.artifacts) !== JSON.stringify(artifacts)) throw new Error("Mixed runtime artifacts.");
    return Object.freeze({ package_version: packageVersion, ...digests, contract_id: "workflow-2/product-1",
      identity_status: "verified", reason: null, refresh_requirement: null });
  } catch {
    return Object.freeze({ package_version: packageVersion, build_id: null, contract_digest: null,
      contract_id: "workflow-2/product-1", identity_status: "unavailable",
      reason: "Build metadata is missing, invalid, or inconsistent with runtime artifacts at startup.",
      refresh_requirement: "Build or refresh a coherent MCP package and explicitly restart the serving process before relying on its identity." });
  }
}

// Capture once, before serving. Later disk replacements cannot relabel loaded code.
export const runtimeIdentity = loadIdentity();
