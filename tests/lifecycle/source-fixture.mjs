import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const FIXTURE_NAME = "Lifecycle Fixture";
const FIXTURE_EMAIL = "fixture@example.invalid";

function gitEnvironment(profile, date) {
  const environment = {
    PATH: process.env.PATH,
    HOME: profile.home,
    USERPROFILE: profile.home,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: profile.gitConfig,
    GIT_TERMINAL_PROMPT: "0",
  };
  for (const key of [
    "COMSPEC",
    "ComSpec",
    "PATHEXT",
    "SYSTEMROOT",
    "SystemRoot",
    "WINDIR",
    "windir",
  ]) {
    if (typeof process.env[key] === "string") {
      environment[key] = process.env[key];
    }
  }
  if (date) {
    Object.assign(environment, {
      GIT_AUTHOR_NAME: FIXTURE_NAME,
      GIT_AUTHOR_EMAIL: FIXTURE_EMAIL,
      GIT_COMMITTER_NAME: FIXTURE_NAME,
      GIT_COMMITTER_EMAIL: FIXTURE_EMAIL,
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
    });
  }
  return environment;
}

async function runGit(profile, cwd, args, date) {
  try {
    await execFileAsync("git", args, {
      cwd,
      env: gitEnvironment(profile, date),
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      windowsHide: true,
    });
  } catch {
    throw new Error("E_FIXTURE_GIT: isolated source operation failed");
  }
}

function parseCgiResponse(output) {
  let separator = output.indexOf(Buffer.from("\r\n\r\n"));
  let separatorLength = 4;
  if (separator === -1) {
    separator = output.indexOf(Buffer.from("\n\n"));
    separatorLength = 2;
  }
  if (separator === -1) {
    throw new Error("E_FIXTURE_SERVER: invalid Git response");
  }
  const headers = {};
  let status = 200;
  const headerText = output.subarray(0, separator).toString("utf8");
  for (const line of headerText.split(/\r?\n/)) {
    const delimiter = line.indexOf(":");
    if (delimiter === -1) {
      continue;
    }
    const name = line.slice(0, delimiter).trim();
    const value = line.slice(delimiter + 1).trim();
    if (name.toLowerCase() === "status") {
      status = Number.parseInt(value, 10);
    } else {
      headers[name] = value;
    }
  }
  return {
    status,
    headers,
    body: output.subarray(separator + separatorLength),
  };
}

async function startGitServer(t, profile) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (
      !/^\/fixture\/(?:codex|claude-code)\.git\//.test(url.pathname) ||
      url.pathname.includes("\0") ||
      url.pathname.split("/").includes("..")
    ) {
      response.writeHead(404).end();
      return;
    }
    const child = spawn("git", ["http-backend"], {
      env: {
        ...gitEnvironment(profile),
        GIT_HTTP_EXPORT_ALL: "1",
        GIT_PROJECT_ROOT: profile.root,
        REQUEST_METHOD: request.method,
        PATH_INFO: url.pathname,
        QUERY_STRING: url.search.slice(1),
        CONTENT_TYPE: request.headers["content-type"] ?? "",
        CONTENT_LENGTH: request.headers["content-length"] ?? "",
        REMOTE_ADDR: "127.0.0.1",
      },
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "ignore"],
    });
    const chunks = [];
    let bytes = 0;
    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes <= 16 * 1024 * 1024) {
        chunks.push(chunk);
      } else {
        child.kill();
      }
    });
    child.once("error", () => {
      if (!response.headersSent) {
        response.writeHead(500).end();
      }
    });
    child.once("close", (code) => {
      if (response.headersSent) {
        return;
      }
      if (code !== 0 || bytes > 16 * 1024 * 1024) {
        response.writeHead(500).end();
        return;
      }
      try {
        const parsed = parseCgiResponse(Buffer.concat(chunks));
        response.writeHead(parsed.status, parsed.headers);
        response.end(parsed.body);
      } catch {
        response.writeHead(500).end();
      }
    });
    request.once("aborted", () => child.kill());
    request.pipe(child.stdin);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("E_FIXTURE_SERVER: loopback endpoint unavailable");
  }
  return `http://127.0.0.1:${address.port}`;
}

export async function createSourceFixture(t, profile, projectRoot) {
  const definitions = [
    { key: "codex", directory: "codex", agent: "codex" },
    {
      key: "claudeCode",
      directory: "claude-code",
      agent: "claude-code",
    },
  ];
  const sources = {};
  for (const definition of definitions) {
    const sourceRoot = path.join(profile.source, definition.directory);
    const remoteRoot = path.join(
      profile.root,
      "fixture",
      `${definition.directory}.git`,
    );
    const pluginRoot = path.join(
      projectRoot,
      "plugins",
      definition.directory,
      "engineer-agent-workflows",
    );
    await fs.cp(pluginRoot, sourceRoot, {
      recursive: true,
      errorOnExist: true,
    });
    await runGit(
      profile,
      sourceRoot,
      ["init", "--initial-branch=main"],
      "2000-01-01T00:00:00Z",
    );
    await runGit(
      profile,
      sourceRoot,
      ["add", "--all"],
      "2000-01-01T00:00:00Z",
    );
    await runGit(
      profile,
      sourceRoot,
      ["commit", "--no-gpg-sign", "-m", "fixture: initial release"],
      "2000-01-01T00:00:00Z",
    );
    await runGit(
      profile,
      profile.root,
      ["init", "--bare", "--initial-branch=main", remoteRoot],
      "2000-01-01T00:00:00Z",
    );
    await runGit(
      profile,
      sourceRoot,
      ["remote", "add", "fixture", remoteRoot],
      "2000-01-01T00:00:00Z",
    );
    await runGit(
      profile,
      sourceRoot,
      ["push", "fixture", "main"],
      "2000-01-01T00:00:00Z",
    );
    sources[definition.key] = {
      agent: definition.agent,
      root: sourceRoot,
      fileUrl: pathToFileURL(sourceRoot).href,
      remoteRoot,
    };
  }
  const server = await startGitServer(t, profile);
  for (const source of Object.values(sources)) {
    source.url = `${server}/fixture/${path.basename(source.remoteRoot)}`;
  }
  return sources;
}

export async function commitFixtureUpdate(profile, source, skillName) {
  const relativeMarker = path.join(
    "skills",
    skillName,
    "references",
    "lifecycle-update.txt",
  );
  const markerPath = path.join(source.root, relativeMarker);
  const marker = `isolated ${source.agent} lifecycle update\n`;
  await fs.mkdir(path.dirname(markerPath), { recursive: true });
  await fs.writeFile(markerPath, marker, "utf8");
  await runGit(
    profile,
    source.root,
    ["add", relativeMarker],
    "2000-01-02T00:00:00Z",
  );
  await runGit(
    profile,
    source.root,
    ["commit", "--no-gpg-sign", "-m", "fixture: compatible update"],
    "2000-01-02T00:00:00Z",
  );
  await runGit(
    profile,
    source.root,
    ["push", "fixture", "main"],
    "2000-01-02T00:00:00Z",
  );
  return {
    marker,
    relativeMarker: path.join("references", "lifecycle-update.txt"),
  };
}
