import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SAFE_INHERITED_KEYS = new Set([
  "COMSPEC",
  "ComSpec",
  "PATH",
  "Path",
  "PATHEXT",
  "SYSTEMROOT",
  "SystemRoot",
  "WINDIR",
  "windir",
]);

function isWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

function requireWithin(root, candidate, label) {
  if (!isWithin(root, candidate)) {
    throw new Error(`E_PROFILE_ESCAPE: ${label}`);
  }
}

export async function createIsolatedProfile(
  t,
  { platform = process.platform } = {},
) {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "engineer-agent-workflows-lifecycle-"),
  );
  t.after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const profile = {
    platform,
    root,
    home: path.join(root, "home"),
    appData: path.join(root, "home", "AppData", "Roaming"),
    localAppData: path.join(root, "home", "AppData", "Local"),
    xdgCache: path.join(root, "xdg", "cache"),
    xdgConfig: path.join(root, "xdg", "config"),
    xdgData: path.join(root, "xdg", "data"),
    xdgState: path.join(root, "xdg", "state"),
    npmCache: path.join(root, "npm", "cache"),
    npmConfig: path.join(root, "npm", "userconfig"),
    npmGlobalConfig: path.join(root, "npm", "globalconfig"),
    npmPrefix: path.join(root, "npm", "prefix"),
    gitConfig: path.join(root, "git", "config"),
    temporary: path.join(root, "temporary"),
    project: path.join(root, "consumer"),
    source: path.join(root, "source"),
    remote: path.join(root, "fixture", "source.git"),
  };

  for (const directory of [
    profile.home,
    profile.appData,
    profile.localAppData,
    profile.xdgCache,
    profile.xdgConfig,
    profile.xdgData,
    profile.xdgState,
    profile.npmCache,
    profile.npmPrefix,
    profile.temporary,
    profile.project,
    path.dirname(profile.npmConfig),
    path.dirname(profile.gitConfig),
  ]) {
    await fs.mkdir(directory, { recursive: true });
  }
  await fs.writeFile(profile.npmConfig, "", "utf8");
  await fs.writeFile(profile.npmGlobalConfig, "", "utf8");
  await fs.writeFile(profile.gitConfig, "", "utf8");

  return structuredClone(profile);
}

export function environmentFor(profile, inherited = process.env) {
  const environment = {};
  for (const key of SAFE_INHERITED_KEYS) {
    if (typeof inherited[key] === "string" && inherited[key].length > 0) {
      environment[key] = inherited[key];
    }
  }

  const inheritedPath = inherited.PATH ?? inherited.Path;
  if (typeof inheritedPath !== "string" || inheritedPath.length === 0) {
    throw new Error("E_PROFILE_ENV: PATH unavailable");
  }
  environment.PATH = inheritedPath;

  Object.assign(environment, {
    HOME: profile.home,
    USERPROFILE: profile.home,
    APPDATA: profile.appData,
    LOCALAPPDATA: profile.localAppData,
    XDG_CACHE_HOME: profile.xdgCache,
    XDG_CONFIG_HOME: profile.xdgConfig,
    XDG_DATA_HOME: profile.xdgData,
    XDG_STATE_HOME: profile.xdgState,
    TMPDIR: profile.temporary,
    TMP: profile.temporary,
    TEMP: profile.temporary,
    npm_config_cache: profile.npmCache,
    npm_config_userconfig: profile.npmConfig,
    npm_config_globalconfig: profile.npmGlobalConfig,
    npm_config_prefix: profile.npmPrefix,
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: profile.gitConfig,
    GIT_TERMINAL_PROMPT: "0",
    DISABLE_TELEMETRY: "1",
    CI: "1",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
  });

  return { ...environment };
}

export async function assertProfileContained(profile) {
  const root = path.resolve(profile.root);

  async function visit(directory) {
    requireWithin(root, directory, "directory");
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));

    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      requireWithin(root, absolutePath, "entry");
      const stat = await fs.lstat(absolutePath);
      if (stat.isSymbolicLink()) {
        let target;
        try {
          target = await fs.realpath(absolutePath);
        } catch {
          throw new Error("E_PROFILE_LINK: dangling symbolic link");
        }
        requireWithin(root, target, "symbolic link");
      } else if (stat.isDirectory()) {
        await visit(absolutePath);
      } else if (!stat.isFile()) {
        throw new Error("E_PROFILE_SPECIAL: unsupported filesystem entry");
      }
    }
  }

  await visit(root);
}

export function assertPathContained(profile, candidate) {
  requireWithin(profile.root, candidate, "path");
}
