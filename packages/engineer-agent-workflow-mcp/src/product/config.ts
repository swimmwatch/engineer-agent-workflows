import { lstat, readdir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, posix, win32 } from "node:path";
import { fail } from "../state.js";

const PRODUCT_DIRECTORY = "engineer-agent-workflows";

export interface ProductRootOptions {
  env?: Readonly<Record<string, string | undefined>>;
  home?: string;
  platform?: NodeJS.Platform;
  workspaceRoots?: readonly string[];
}

export interface ProductPathOptions {
  home?: string;
  platform?: NodeJS.Platform;
  workspaceRoots?: readonly string[];
}

function platformPaths(platform: NodeJS.Platform): typeof posix {
  if (platform === "win32") return win32;
  if (platform === "linux" || platform === "darwin") return posix;
  return fail("INVALID_CONFIG", "Product storage is not supported on this operating system.");
}

function comparisonKey(value: string, platform: NodeJS.Platform): string {
  const normalized = value.normalize("NFC");
  return platform === "win32" ? normalized.toLocaleLowerCase("en-US") : normalized;
}

function hasInvalidUnicodeScalar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xD800 && unit <= 0xDBFF) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xDC00 || next > 0xDFFF) return true;
      index += 1;
    } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
      return true;
    }
  }
  return false;
}

function hasWindowsForbiddenCharacter(value: string): boolean {
  const forbidden = '<>"|?*';
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 0x20 || forbidden.includes(character));
  });
}

function overlaps(left: string, right: string, platform: NodeJS.Platform): boolean {
  const paths = platformPaths(platform);
  const leftKey = comparisonKey(paths.normalize(left), platform);
  const rightKey = comparisonKey(paths.normalize(right), platform);
  const relative = paths.relative(leftKey, rightKey);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${paths.sep}`) && !paths.isAbsolute(relative));
}

function assertSafeRoot(root: string, home: string, platform: NodeJS.Platform, workspaceRoots: readonly string[]): string {
  const paths = platformPaths(platform);
  if (!paths.isAbsolute(root) || root.includes(String.fromCharCode(0)) || hasInvalidUnicodeScalar(root)) {
    return fail("INVALID_CONFIG", "Product data root must be an absolute path.");
  }
  const normalized = paths.normalize(root);
  const parsed = paths.parse(normalized);
  if (comparisonKey(normalized, platform) === comparisonKey(parsed.root, platform)) {
    return fail("INVALID_CONFIG", "Product data root cannot be a filesystem root.");
  }
  if (!paths.isAbsolute(home) || hasInvalidUnicodeScalar(home)) {
    return fail("INVALID_CONFIG", "The operating-system home directory is unavailable.");
  }
  if (comparisonKey(normalized, platform) === comparisonKey(paths.normalize(home), platform)) {
    return fail("INVALID_CONFIG", "Product data root cannot be the user home directory.");
  }
  for (const workspace of workspaceRoots) {
    if (!paths.isAbsolute(workspace) || hasInvalidUnicodeScalar(workspace)) {
      return fail("INVALID_CONFIG", "Workspace roots must be absolute paths.");
    }
    if (overlaps(normalized, workspace, platform) || overlaps(workspace, normalized, platform)) {
      return fail("INVALID_CONFIG", "Product data root must be separate from workspace trees.");
    }
  }
  return normalized;
}

function configured(environment: Readonly<Record<string, string | undefined>>, name: string): string | undefined {
  const value = environment[name];
  return value === undefined || value === "" ? undefined : value;
}

export function resolveProductRoot(options: ProductRootOptions = {}): string {
  const environment = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const home = options.home ?? homedir();
  const paths = platformPaths(platform);
  const override = configured(environment, "EAW_PRODUCT_DATA_DIR");
  if (override !== undefined) return assertSafeRoot(override, home, platform, options.workspaceRoots ?? []);

  let root: string;
  if (platform === "win32") {
    const localAppData = configured(environment, "LOCALAPPDATA");
    if (localAppData === undefined || !paths.isAbsolute(localAppData)) {
      return fail("INVALID_CONFIG", "LOCALAPPDATA must provide an absolute path or EAW_PRODUCT_DATA_DIR must be set.");
    }
    root = paths.join(localAppData, PRODUCT_DIRECTORY);
  } else if (platform === "darwin") {
    root = paths.join(home, "Library", "Application Support", PRODUCT_DIRECTORY);
  } else {
    const xdgDataHome = configured(environment, "XDG_DATA_HOME");
    const dataHome = xdgDataHome !== undefined && paths.isAbsolute(xdgDataHome)
      ? xdgDataHome
      : paths.join(home, ".local", "share");
    root = paths.join(dataHome, PRODUCT_DIRECTORY);
  }
  return assertSafeRoot(root, home, platform, options.workspaceRoots ?? []);
}

function relativeParts(relative: string): string[] {
  if (
    relative.length === 0
    || relative.includes(String.fromCharCode(0))
    || hasInvalidUnicodeScalar(relative)
    || relative.includes("\\")
    || relative.includes(":")
    || posix.isAbsolute(relative)
    || win32.isAbsolute(relative)
  ) {
    return fail("UNSAFE_PATH", "Product path must be a safe relative path.");
  }
  const parts = relative.split("/");
  const windowsDeviceName = /^(?:con|prn|aux|nul|com[1-9\u00B9\u00B2\u00B3]|lpt[1-9\u00B9\u00B2\u00B3])(?:\..*)?$/iu;
  if (parts.some((part) => (
    part.length === 0
    || part === "."
    || part === ".."
    || part !== part.normalize("NFC")
    || hasWindowsForbiddenCharacter(part)
    || /[ .]$/u.test(part)
    || windowsDeviceName.test(part)
  ))) {
    return fail("UNSAFE_PATH", "Product path must use normalized non-traversing segments.");
  }
  return parts;
}

function missing(error: unknown): boolean {
  return error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

function portableNameKey(name: string): string {
  return name.normalize("NFC").toLowerCase();
}

async function inspectRoot(root: string): Promise<string> {
  const missingParts: string[] = [];
  let current = root;
  while (true) {
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      if (!missing(error)) return fail("UNSAFE_PATH", "Product data root cannot be inspected.");
      const parent = dirname(current);
      if (parent === current) return fail("UNSAFE_PATH", "Product data root has no inspectable ancestor.");
      missingParts.unshift(basename(current));
      current = parent;
      continue;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      return fail("UNSAFE_PATH", "Product data root must contain only regular directories.");
    }
    let canonical;
    try {
      canonical = await realpath(current);
    } catch {
      return fail("UNSAFE_PATH", "Product data root cannot be resolved safely.");
    }
    if (portableNameKey(canonical) !== portableNameKey(current)) {
      return fail("UNSAFE_PATH", "Product data root cannot pass through symbolic links.");
    }
    for (const [index, part] of missingParts.entries()) {
      let entries;
      try {
        entries = await readdir(canonical, { withFileTypes: true });
      } catch {
        return fail("UNSAFE_PATH", "Product data root cannot be inspected.");
      }
      if (entries.some((entry) => portableNameKey(entry.name) === portableNameKey(part))) {
        return fail("UNSAFE_PATH", "Product data root has a case or Unicode collision.");
      }
      return join(canonical, ...missingParts.slice(index));
    }
    return canonical;
  }
}

async function canonicalDirectory(directory: string, message: string): Promise<string> {
  try {
    const canonical = await realpath(directory);
    const stat = await lstat(canonical);
    if (!stat.isDirectory()) return fail("INVALID_CONFIG", message);
    return canonical;
  } catch {
    return fail("INVALID_CONFIG", message);
  }
}

export async function validateProductPath(root: string, relative: string, options: ProductPathOptions = {}): Promise<string> {
  const platform = options.platform ?? process.platform;
  if (platform !== process.platform) {
    return fail("UNAVAILABLE_EVIDENCE", "Filesystem path safety must be checked on the active operating system.");
  }
  const paths = platformPaths(platform);
  const home = options.home ?? homedir();
  const workspaceRoots = options.workspaceRoots ?? [];
  const safeRoot = assertSafeRoot(root, home, platform, workspaceRoots);
  const parts = relativeParts(relative);
  const canonicalRoot = await inspectRoot(safeRoot);
  const canonicalHome = await canonicalDirectory(home, "The operating-system home directory cannot be inspected.");
  const canonicalWorkspaces = await Promise.all(workspaceRoots.map((workspace) => (
    canonicalDirectory(workspace, "A workspace root cannot be inspected.")
  )));
  let current = assertSafeRoot(canonicalRoot, canonicalHome, platform, canonicalWorkspaces);

  for (const [index, part] of parts.entries()) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (missing(error)) return paths.join(current, ...parts.slice(index));
      return fail("UNSAFE_PATH", "Product path cannot be inspected.");
    }
    const collisions = entries.filter((entry) => portableNameKey(entry.name) === portableNameKey(part));
    if (collisions.length > 1 || (collisions.length === 1 && collisions[0]?.name !== part)) {
      return fail("UNSAFE_PATH", "Product path has a case or Unicode collision.");
    }
    if (collisions.length === 0) return paths.join(current, ...parts.slice(index));

    current = paths.join(current, part);
    let stat;
    try {
      stat = await lstat(current);
    } catch {
      return fail("UNSAFE_PATH", "Product path changed while being inspected.");
    }
    if (stat.isSymbolicLink()) return fail("UNSAFE_PATH", "Product path cannot contain symbolic links.");
    const leaf = index === parts.length - 1;
    if (!leaf && !stat.isDirectory()) return fail("UNSAFE_PATH", "Product path ancestors must be directories.");
    if (leaf && !stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1)) {
      return fail("UNSAFE_PATH", "Product files must be regular single-link files.");
    }
  }
  return current;
}
