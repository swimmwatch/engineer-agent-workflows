import { constants } from "node:fs";
import { createHash } from "node:crypto";
import { lstat, mkdir, open, readdir, readlink, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const maximumFiles = 4096;
const maximumFileBytes = 16 * 1024 * 1024;
const maximumTotalBytes = 128 * 1024 * 1024;

function failure(code) { return Object.assign(new Error(code), { code }); }
function digest(value) { return createHash("sha256").update(value).digest("hex"); }

function contained(root, target) {
  const path = relative(root, target);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(".." + sep));
}

async function regularDirectory(path) {
  if (typeof path !== "string" || !isAbsolute(path)) throw failure("INVALID_MCP_SNAPSHOT_INPUT");
  try {
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink()) throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
    return await realpath(path);
  } catch (error) {
    if (error.code === "MCP_SNAPSHOT_SOURCE_UNSAFE") throw error;
    throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
  }
}

async function fileBytes(path) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > maximumFileBytes) throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size > maximumFileBytes) throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (bytes.length !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs) {
      throw failure("MCP_SNAPSHOT_SOURCE_CHANGED");
    }
    return bytes;
  } finally { await handle.close(); }
}

async function capture(packageRoot) {
  const rootInfo = await lstat(packageRoot);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
  const directories = ["dist"];
  const files = new Map();
  let totalBytes = 0;
  async function add(path) {
    if (files.size >= maximumFiles) throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
    const bytes = await fileBytes(join(packageRoot, path));
    totalBytes += bytes.length;
    if (totalBytes > maximumTotalBytes) throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
    files.set(path, bytes);
  }
  async function walk(path) {
    const info = await lstat(join(packageRoot, path));
    if (!info.isDirectory() || info.isSymbolicLink()) throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
    const entries = await readdir(join(packageRoot, path), { withFileTypes: true });
    entries.sort(compareNames);
    for (const entry of entries) {
      const next = path + "/" + entry.name;
      if (entry.isSymbolicLink()) throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
      if (entry.isDirectory()) { directories.push(next); await walk(next); }
      else if (entry.isFile()) await add(next);
      else throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
    }
  }
  await add("package.json");
  await walk("dist");
  for (const required of ["dist/main.js", "dist/runtime-info.js", "dist/runtime-stamp.json"]) {
    if (!files.has(required)) throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
  }
  const manifest = [];
  for (const [path, bytes] of files) manifest.push({ path, size: bytes.length, sha256: digest(bytes) });
  const fingerprint = digest(JSON.stringify({ directories, files: manifest }));
  return { directories, files, fingerprint };
}

function compareNames(first, second) { return first.name < second.name ? -1 : first.name > second.name ? 1 : 0; }

async function checkSnapshot(packageRoot, dependencyRoot, expected) {
  const names = (await readdir(packageRoot)).sort();
  if (JSON.stringify(names) !== JSON.stringify(["dist", "node_modules", "package.json"])) throw failure("MCP_SNAPSHOT_COPY_CHANGED");
  const dependencyLink = join(packageRoot, "node_modules");
  const info = await lstat(dependencyLink);
  if (!info.isSymbolicLink() || await readlink(dependencyLink) !== dependencyRoot || await realpath(dependencyLink) !== dependencyRoot) {
    throw failure("MCP_SNAPSHOT_COPY_CHANGED");
  }
  const copied = await capture(packageRoot);
  if (copied.fingerprint !== expected.fingerprint) throw failure("MCP_SNAPSHOT_COPY_CHANGED");
}

/** Freeze only an explicit MCP artifact; caller owns fresh-process verification and process cleanup. */
export async function createNativeMcpSnapshot({ sourcePackage, destination, dependencyRoot, verify }) {
  if (typeof verify !== "function") throw failure("MCP_SNAPSHOT_VERIFIER_REQUIRED");
  if (typeof destination !== "string" || !isAbsolute(destination) || typeof dependencyRoot !== "string"
    || !isAbsolute(dependencyRoot) || basename(resolve(dependencyRoot)) !== "node_modules") throw failure("INVALID_MCP_SNAPSHOT_INPUT");
  const source = await regularDirectory(sourcePackage);
  const parent = await regularDirectory(dirname(destination));
  if (((await stat(parent)).mode & 0o077) !== 0) throw failure("INVALID_MCP_SNAPSHOT_INPUT");
  const packageRoot = join(parent, basename(destination));
  let dependencies;
  try {
    dependencies = await realpath(dependencyRoot);
    if (!(await stat(dependencies)).isDirectory()) throw failure("INVALID_MCP_SNAPSHOT_INPUT");
  } catch { throw failure("INVALID_MCP_SNAPSHOT_INPUT"); }
  if (contained(source, packageRoot) || contained(packageRoot, source)
    || contained(packageRoot, dependencies)) throw failure("INVALID_MCP_SNAPSHOT_INPUT");
  let created = false;
  try {
    try { await mkdir(packageRoot, { mode: 0o700 }); created = true; }
    catch (error) { if (error.code === "EEXIST") throw failure("MCP_SNAPSHOT_DESTINATION_EXISTS"); throw error; }
    const captured = await capture(source);
    for (const directory of captured.directories) await mkdir(join(packageRoot, directory), { mode: 0o700 });
    for (const [path, bytes] of captured.files) await writeFile(join(packageRoot, path), bytes, { flag: "wx", mode: 0o600 });
    await symlink(dependencies, join(packageRoot, "node_modules"), "dir");
    const observed = await capture(source);
    if (observed.fingerprint !== captured.fingerprint) throw failure("MCP_SNAPSHOT_SOURCE_CHANGED");
    await checkSnapshot(packageRoot, dependencies, captured);
    const entrypoint = join(packageRoot, "dist/main.js");
    const runtimeInfoModule = join(packageRoot, "dist/runtime-info.js");
    let identity;
    try { identity = await verify({ packageRoot, entrypoint, runtimeInfoModule }); }
    catch (error) {
      if (["CANCELLED", "TIMEOUT", "OUTPUT_LIMIT", "CLEANUP_FAILED"].includes(error.code)) throw error;
      throw failure("MCP_SNAPSHOT_UNVERIFIED");
    }
    if (identity?.identity_status !== "verified" || !/^[a-f0-9]{64}$/u.test(identity.build_id ?? "")) throw failure("MCP_SNAPSHOT_UNVERIFIED");
    await checkSnapshot(packageRoot, dependencies, captured);
    const finalSource = await capture(source);
    if (finalSource.fingerprint !== captured.fingerprint) throw failure("MCP_SNAPSHOT_SOURCE_CHANGED");
    return { packageRoot, entrypoint, runtimeInfoModule, identity,
      source_fingerprint: captured.fingerprint, artifact_count: captured.files.size };
  } catch (error) {
    if (created) await rm(packageRoot, { recursive: true, force: true });
    if (typeof error.code === "string" && (/^(?:MCP_SNAPSHOT_|INVALID_MCP_SNAPSHOT_INPUT)/u.test(error.code)
      || ["CANCELLED", "TIMEOUT", "OUTPUT_LIMIT", "CLEANUP_FAILED"].includes(error.code))) throw error;
    throw failure("MCP_SNAPSHOT_SOURCE_UNSAFE");
  }
}
