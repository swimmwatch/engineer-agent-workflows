import { constants } from "node:fs";
import { lstat, open, opendir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, join } from "node:path";

import { LedgerError } from "./ledger.js";

export const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const MAX_CATALOG_ENTRIES = 100_000;
const SPECIFICATION_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export interface SourceDocument {
  readonly project: string;
  readonly specification: string;
  readonly bytes: Uint8Array;
}

export interface SourceCatalog {
  readonly project: string;
  readonly items: readonly string[];
  readonly version: string;
}

function errorFromFilesystem(error: unknown, fallback: string): LedgerError {
  if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
    return new LedgerError("NOT_FOUND", fallback);
  }
  return new LedgerError("UNSAFE_PATH", fallback);
}

function validateSpecification(specification: string): void {
  if (!isValidSpecification(specification)) {
    throw new LedgerError("INVALID_INPUT", "Specification must be a lowercase kebab-case name.");
  }
}

function isValidSpecification(specification: string): boolean {
  return specification.length <= 128 && SPECIFICATION_PATTERN.test(specification);
}

async function canonicalProject(project: string): Promise<string> {
  if (!isAbsolute(project)) {
    throw new LedgerError("UNSAFE_PATH", "Project must be an absolute path.");
  }
  try {
    const canonical = await realpath(project);
    const information = await lstat(canonical);
    if (!information.isDirectory()) {
      throw new LedgerError("UNSAFE_PATH", "Project must be a directory.");
    }
    return canonical;
  } catch (error) {
    if (error instanceof LedgerError) {
      throw error;
    }
    throw errorFromFilesystem(error, "Project path is not available.");
  }
}

async function checkedChild(parent: string, name: string, directory: boolean): Promise<string> {
  const child = join(parent, name);
  let information;
  try {
    information = await lstat(child);
  } catch (error) {
    throw errorFromFilesystem(error, "Decision source is not available.");
  }
  if (information.isSymbolicLink() || (directory ? !information.isDirectory() : !information.isFile())) {
    throw new LedgerError("UNSAFE_PATH", "Decision source path is not a permitted regular path.");
  }
  return child;
}

async function sourcePath(project: string, specification: string): Promise<{ project: string; path: string }> {
  validateSpecification(specification);
  const canonical = await canonicalProject(project);
  const docs = await checkedChild(canonical, "docs", true);
  const specs = await checkedChild(docs, "specs", true);
  const selected = await checkedChild(specs, specification, true);
  return { project: canonical, path: await checkedChild(selected, "decisions.yaml", false) };
}

function changed(before: { dev: number; ino: number; size: number; mtimeMs: number }, after: { dev: number; ino: number; size: number; mtimeMs: number }): boolean {
  return before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs;
}

export async function readSource(project: string, specification: string): Promise<SourceDocument> {
  const location = await sourcePath(project, specification);
  const before = await lstat(location.path);
  if (before.size > MAX_SOURCE_BYTES) {
    throw new LedgerError("SOURCE_LIMIT", "Decision source exceeds the 16 MiB limit.");
  }

  let handle;
  try {
    handle = await open(location.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = await handle.stat();
    if (!opened.isFile() || changed(before, opened)) {
      throw new LedgerError("SOURCE_CHANGED", "Decision source changed while it was opened.");
    }
    if (opened.size > MAX_SOURCE_BYTES) {
      throw new LedgerError("SOURCE_LIMIT", "Decision source exceeds the 16 MiB limit.");
    }
    const bytes = new Uint8Array(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (result.bytesRead === 0) {
        throw new LedgerError("SOURCE_CHANGED", "Decision source changed while it was read.");
      }
      offset += result.bytesRead;
    }
    const after = await handle.stat();
    if (changed(opened, after)) {
      throw new LedgerError("SOURCE_CHANGED", "Decision source changed while it was read.");
    }
    return { project: location.project, specification, bytes };
  } catch (error) {
    if (error instanceof LedgerError) {
      throw error;
    }
    throw errorFromFilesystem(error, "Decision source cannot be read.");
  } finally {
    await handle?.close();
  }
}

export async function catalogSources(project: string): Promise<SourceCatalog> {
  const canonical = await canonicalProject(project);
  const docsPath = join(canonical, "docs");
  const specsPath = join(docsPath, "specs");
  let directory;
  try {
    const docs = await lstat(docsPath);
    const specs = await lstat(specsPath);
    if (docs.isSymbolicLink() || specs.isSymbolicLink() || !docs.isDirectory() || !specs.isDirectory()) {
      throw new LedgerError("UNSAFE_PATH", "Specification directory is not a permitted regular path.");
    }
    directory = await opendir(specsPath);
  } catch (error) {
    if (error instanceof LedgerError) {
      throw error;
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return { project: canonical, items: [], version: createHash("sha256").update("[]").digest("hex") };
    }
    throw errorFromFilesystem(error, "Specification directory is not available.");
  }

  const items: string[] = [];
  let inspected = 0;
  try {
    for await (const entry of directory) {
      inspected += 1;
      if (inspected > MAX_CATALOG_ENTRIES) {
        throw new LedgerError("SOURCE_LIMIT", "Specification catalog exceeds the direct entry limit.");
      }
      if (!entry.isDirectory() || entry.isSymbolicLink() || !isValidSpecification(entry.name)) {
        continue;
      }
      try {
        const journal = await lstat(join(specsPath, entry.name, "decisions.yaml"));
        if (journal.isFile() && !journal.isSymbolicLink()) {
          items.push(entry.name);
        }
      } catch {
        // A missing or inaccessible direct journal is not a catalog item.
      }
    }
  } catch (error) {
    if (error instanceof LedgerError) {
      throw error;
    }
    throw errorFromFilesystem(error, "Specification directory cannot be read.");
  }
  items.sort();
  return {
    project: canonical,
    items,
    version: createHash("sha256").update(JSON.stringify(items)).digest("hex"),
  };
}
