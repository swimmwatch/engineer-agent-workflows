#!/usr/bin/env node

import crypto from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { readCatalog, readReleaseMetadata } from "./lib/catalog.mjs";
import {
  buildGeneratedFiles,
  CODEX_PLUGIN_ROOT,
  collectReleaseSource,
} from "./lib/distribution.mjs";
import { ValidationError, formatDiagnostic, isValidationError } from "./lib/errors.mjs";
import { validateRelativePath } from "./lib/files.mjs";

const executeFile = promisify(execFileCallback);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MCP_PACKAGE_NAME = "@engineer-agent-workflows/engineer-agent-workflow-mcp";
const MCP_PACKAGE_DIRECTORY = "packages/engineer-agent-workflow-mcp";
const SNAPSHOT_SCHEMA_VERSION = 1;
const SOURCE_EXCLUSIONS = new Set(["artifacts"]);

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function safeSnapshotName(value) {
  return typeof value === "string" && /^[-a-zA-Z0-9._]+\.tgz$/.test(value);
}

function framedDigest(entries) {
  const hash = crypto.createHash("sha256");
  for (const entry of entries) {
    hash.update(entry.relativePath, "utf8");
    hash.update("\0", "utf8");
    hash.update(entry.kind ?? "file", "utf8");
    hash.update("\0", "utf8");
    hash.update(entry.bytes);
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

async function exists(candidate) {
  try {
    await fs.lstat(candidate);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function requireDirectory(candidate, label) {
  let stat;
  try {
    stat = await fs.lstat(candidate);
  } catch (error) {
    throw new ValidationError("E_IO", `${label} unavailable`, { cause: error });
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new ValidationError("E_UNSAFE_PATH", `${label} must be a real directory`);
  }
}

async function defaultRunCommand(command, args, options) {
  return await executeFile(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
}

async function trackedSourceEntries(root) {
  let stdout;
  let trackedStdout;
  try {
    ({ stdout } = await executeFile(
      "git",
      ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
      { cwd: root, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 },
    ));
    ({ stdout: trackedStdout } = await executeFile(
      "git",
      ["ls-files", "-z", "--cached"],
      { cwd: root, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 },
    ));
  } catch (error) {
    throw new ValidationError("E_IO", "development source inventory unavailable", { cause: error });
  }
  const paths = stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "en"));
  const tracked = new Set(
    trackedStdout
      .toString("utf8")
      .split("\0")
      .filter(Boolean),
  );
  const entries = [];
  for (const relativePath of paths) {
    validateRelativePath(relativePath);
    if (SOURCE_EXCLUSIONS.has(relativePath.split("/", 1)[0])) {
      continue;
    }
    const absolutePath = path.join(root, ...relativePath.split("/"));
    let stat;
    try {
      stat = await fs.lstat(absolutePath);
    } catch (error) {
      if (error?.code === "ENOENT" && tracked.has(relativePath)) {
        entries.push({
          relativePath,
          kind: "deleted",
          bytes: Buffer.alloc(0),
        });
        continue;
      }
      throw error;
    }
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new ValidationError("E_UNSAFE_PATH", "development source contains a non-regular file", {
        relativePath,
      });
    }
    entries.push({ relativePath, kind: "file", bytes: await fs.readFile(absolutePath) });
  }
  if (entries.length === 0) {
    throw new ValidationError("E_IO", "development source inventory is empty");
  }
  return entries;
}

export async function fingerprintDevelopmentSource(root) {
  const absoluteRoot = path.resolve(root);
  await requireDirectory(absoluteRoot, "development source root");
  const entries = await trackedSourceEntries(absoluteRoot);
  return {
    digest: framedDigest(entries),
    fileCount: entries.length,
    deletedFileCount: entries.filter((entry) => entry.kind === "deleted").length,
  };
}

async function sha256File(candidate) {
  return crypto.createHash("sha256").update(await fs.readFile(candidate)).digest("hex");
}

async function writeGeneratedCodexPlugin(generated, destination) {
  const prefix = `${CODEX_PLUGIN_ROOT}/`;
  const entries = [...generated.entries()]
    .filter(([relativePath]) => relativePath.startsWith(prefix))
    .map(([relativePath, bytes]) => ({ relativePath: relativePath.slice(prefix.length), bytes }))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath, "en"));
  if (!entries.some((entry) => entry.relativePath === ".codex-plugin/plugin.json")) {
    throw new ValidationError("E_INVALID_MANIFEST", "generated Codex plugin manifest missing");
  }
  for (const entry of entries) {
    validateRelativePath(entry.relativePath);
    const target = path.join(destination, ...entry.relativePath.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, entry.bytes, { flag: "wx" });
  }
  return framedDigest(entries);
}

function parsePackedArchive(result) {
  let output;
  try {
    output = JSON.parse(result.stdout);
  } catch (error) {
    throw new ValidationError("E_IO", "MCP package output is invalid", { cause: error });
  }
  if (!Array.isArray(output) || output.length !== 1 || !safeSnapshotName(output[0]?.filename)) {
    throw new ValidationError("E_IO", "MCP package output is incomplete");
  }
  return output[0].filename;
}

async function readReusableSnapshot(directory, buildId, sourceDigest) {
  const manifestPath = path.join(directory, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    throw new ValidationError("E_IO", "existing development snapshot is invalid", { cause: error });
  }
  if (
    manifest?.schema_version !== SNAPSHOT_SCHEMA_VERSION ||
    manifest.build_id !== buildId ||
    manifest.source_digest !== sourceDigest ||
    typeof manifest?.mcp?.archive !== "string" ||
    !(await exists(path.join(directory, manifest.mcp.archive))) ||
    !(await exists(path.join(directory, "plugin", ".codex-plugin", "plugin.json")))
  ) {
    throw new ValidationError("E_IO", "existing development snapshot is incomplete");
  }
  return { buildId, directory, manifest, reused: true };
}

function usageError() {
  return new ValidationError("E_USAGE", "usage: build-dev.mjs");
}

export async function buildDevSnapshot(options = {}) {
  const root = path.resolve(options.root ?? repositoryRoot);
  const outputRoot = path.resolve(options.outputRoot ?? path.join(root, "artifacts", "dev"));
  const runCommand = options.runCommand ?? defaultRunCommand;
  await requireDirectory(root, "development source root");
  const initialSource = await fingerprintDevelopmentSource(root);
  const buildId = `dev-${initialSource.digest.slice(0, 20)}`;
  const destination = path.join(outputRoot, buildId);
  if (await exists(destination)) {
    return await readReusableSnapshot(destination, buildId, initialSource.digest);
  }

  await fs.mkdir(outputRoot, { recursive: true });
  const staging = path.join(outputRoot, `.${buildId}-${process.pid}-${crypto.randomUUID()}.staging`);
  await fs.mkdir(staging, { recursive: false });
  try {
    await runCommand(npmCommand(), ["run", "build"], { cwd: root });
    await runCommand(npmCommand(), ["run", "generate:check"], { cwd: root });
    await runCommand(npmCommand(), ["run", "validate"], { cwd: root });

    const catalog = await readCatalog(root);
    const release = await readReleaseMetadata(root);
    const source = await collectReleaseSource(root, catalog, release);
    const generated = buildGeneratedFiles(source);
    const pluginDirectory = path.join(staging, "plugin");
    const pluginDigest = await writeGeneratedCodexPlugin(generated, pluginDirectory);

    const packageDirectory = path.join(root, MCP_PACKAGE_DIRECTORY);
    await requireDirectory(packageDirectory, "MCP package directory");
    const archiveDirectory = path.join(staging, "mcp");
    await fs.mkdir(archiveDirectory, { recursive: true });
    const packed = await runCommand(
      npmCommand(),
      ["pack", "--json", "--ignore-scripts", "--pack-destination", archiveDirectory],
      { cwd: packageDirectory },
    );
    const archiveName = parsePackedArchive(packed);
    const archivePath = path.join(archiveDirectory, archiveName);
    const archiveStat = await fs.lstat(archivePath);
    if (archiveStat.isSymbolicLink() || !archiveStat.isFile()) {
      throw new ValidationError("E_IO", "MCP package archive missing");
    }

    const versions = {
      node: process.version,
      npm: (await runCommand(npmCommand(), ["--version"], { cwd: root })).stdout.trim(),
    };
    const finalSource = await fingerprintDevelopmentSource(root);
    if (finalSource.digest !== initialSource.digest) {
      throw new ValidationError("E_IO", "development source changed while building snapshot");
    }
    const manifest = {
      schema_version: SNAPSHOT_SCHEMA_VERSION,
      build_id: buildId,
      source_digest: initialSource.digest,
      source_file_count: initialSource.fileCount,
      deleted_source_file_count: initialSource.deletedFileCount,
      generated_at: new Date().toISOString(),
      skill_names: catalog.skills.map((entry) => entry.name),
      tools: versions,
      plugin: {
        directory: "plugin",
        sha256: pluginDigest,
      },
      mcp: {
        package: MCP_PACKAGE_NAME,
        archive: `mcp/${archiveName}`,
        sha256: await sha256File(archivePath),
      },
    };
    await fs.writeFile(path.join(staging, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, {
      flag: "wx",
    });
    try {
      await fs.rename(staging, destination);
    } catch (error) {
      if (![
        "EEXIST",
        "ENOTEMPTY",
        "EPERM",
      ].includes(error?.code) || !(await exists(destination))) {
        throw error;
      }
      const existing = await readReusableSnapshot(destination, buildId, initialSource.digest);
      await fs.rm(staging, { recursive: true, force: true });
      return existing;
    }
    return { buildId, directory: destination, manifest, reused: false };
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export async function main(argv, io = {}) {
  if (argv.length !== 0) {
    throw usageError();
  }
  const result = await buildDevSnapshot();
  (io.stdout ?? process.stdout).write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    const output = isValidationError(error) ? formatDiagnostic(error) : "E_IO: development build failed";
    process.stderr.write(`${output}\n`);
    process.exitCode = 1;
  });
}
