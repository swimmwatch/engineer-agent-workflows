import { mkdirSync, mkdtempSync, openSync, closeSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const appRoot = dirname(fileURLToPath(import.meta.url));
export function runCli(args, options = {}) {
  const tempRoot = join(appRoot, '.tmp');
  mkdirSync(tempRoot, { recursive: true });
  const folder = mkdtempSync(join(tempRoot, 'child-'));
  const stdoutPath = join(folder, 'stdout'), stderrPath = join(folder, 'stderr');
  let stdoutFd, stderrFd;
  try {
    stdoutFd = openSync(stdoutPath, 'w');
    stderrFd = openSync(stderrPath, 'w');
    const result = spawnSync(process.execPath, ['cli.mjs', ...args], {
      cwd: appRoot, env: { ...process.env, ...options.env },
      stdio: ['ignore', stdoutFd, stderrFd], timeout: 5000,
    });
    if (result.error) throw result.error;
    return { status: result.status, signal: result.signal,
      stdout: readFileSync(stdoutPath, 'utf8'), stderr: readFileSync(stderrPath, 'utf8') };
  } finally {
    if (stdoutFd !== undefined) closeSync(stdoutFd);
    if (stderrFd !== undefined) closeSync(stderrFd);
    rmSync(folder, { recursive: true, force: true });
  }
}
