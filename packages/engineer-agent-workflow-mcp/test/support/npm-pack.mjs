import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const executeFile = promisify(execFile);

export function packArtifact(packageRoot, destination) {
  const args = ["pack", "--json", "--ignore-scripts", "--pack-destination", destination];
  const command = process.platform === "win32" ? process.execPath : "npm";
  if (process.platform === "win32") {
    args.unshift(join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"));
  }
  return executeFile(command, args, {
    cwd: packageRoot,
    maxBuffer: 1024 * 1024,
  });
}
