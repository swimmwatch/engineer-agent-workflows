import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";

import { ValidationError } from "./errors.mjs";

export function validateRelativePath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\0") ||
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value)
  ) {
    throw new ValidationError("E_UNSAFE_PATH", "repository path is unsafe");
  }
  const segments = value.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    throw new ValidationError("E_UNSAFE_PATH", "repository path is unsafe");
  }
  const normalized = path.posix.normalize(value);
  if (normalized !== value) {
    throw new ValidationError("E_UNSAFE_PATH", "repository path is not normalized");
  }
  return normalized;
}

async function safeLstat(absolutePath, relativePath) {
  try {
    return await fsPromises.lstat(absolutePath);
  } catch (error) {
    throw new ValidationError("E_IO", "filesystem entry is unavailable", {
      relativePath,
      cause: error,
    });
  }
}

export async function walkFiles(root) {
  const absoluteRoot = path.resolve(root);
  const rootStat = await safeLstat(absoluteRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new ValidationError("E_UNSAFE_PATH", "walk root must be a real directory");
  }
  const files = [];
  const seenCaseFolded = new Map();

  async function visit(absoluteDirectory, relativeDirectory) {
    let entries;
    try {
      entries = await fsPromises.readdir(absoluteDirectory, { withFileTypes: true });
    } catch (error) {
      throw new ValidationError("E_IO", "directory cannot be read", {
        relativePath: relativeDirectory || undefined,
        cause: error,
      });
    }
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const relativePath =
        relativeDirectory.length === 0
          ? entry.name
          : `${relativeDirectory}/${entry.name}`;
      validateRelativePath(relativePath);
      const collisionKey = relativePath.normalize("NFC").toLocaleLowerCase("en");
      const previous = seenCaseFolded.get(collisionKey);
      if (previous !== undefined && previous !== relativePath) {
        throw new ValidationError(
          "E_UNSAFE_PATH",
          "repository paths collide by case or normalization",
        );
      }
      seenCaseFolded.set(collisionKey, relativePath);
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const stat = await safeLstat(absolutePath, relativePath);
      if (stat.isSymbolicLink()) {
        throw new ValidationError("E_UNSAFE_PATH", "symbolic links are not allowed", {
          relativePath,
        });
      }
      if (stat.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (stat.isFile()) {
        files.push(relativePath);
      } else {
        throw new ValidationError("E_UNSAFE_PATH", "special files are not allowed", {
          relativePath,
        });
      }
    }
  }

  await visit(absoluteRoot, "");
  return files;
}

export async function sha256File(filePath) {
  const stat = await safeLstat(filePath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new ValidationError("E_UNSAFE_PATH", "hash target must be a regular file");
  }
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", (error) =>
      reject(
        new ValidationError("E_IO", "file cannot be hashed", {
          cause: error,
        }),
      ),
    );
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function snapshotTree(root) {
  const absoluteRoot = path.resolve(root);
  const files = await walkFiles(absoluteRoot);
  const snapshot = {};
  for (const relativePath of files) {
    const absolutePath = path.join(
      absoluteRoot,
      ...relativePath.split("/"),
    );
    const stat = await safeLstat(absolutePath, relativePath);
    snapshot[relativePath] = {
      sha256: await sha256File(absolutePath),
      size: stat.size,
    };
  }
  return structuredClone(snapshot);
}
