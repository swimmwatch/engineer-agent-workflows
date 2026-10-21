import { createHash } from "node:crypto";
const sha = value => createHash("sha256").update(value).digest("hex");
export function mutationTestExit(item, audited = []) {
  if (item.exitCode === 0 && typeof item.command === "string" && typeof item.aggregatedOutput === "string") {
    const source = audited.find(entry => entry.itemId === item.id &&
      entry.commandDigest === sha(item.command) && entry.outputDigest === sha(item.aggregatedOutput));
    if (source) {
      const markers = [...item.aggregatedOutput.matchAll(/^\s*MUTATION_EXIT (\d+)\s*$/gm)];
      if (markers.length !== 1 || Number(markers[0][1]) !== source.childExitCode ||
          source.childExitCode !== 1 || source.outerExitCode !== item.exitCode) {
        throw Error("Audited child exit no longer matches its captured output");
      }
      return { exitCode: Number(markers[0][1]), origin: "captured-child-test", outerExitCode: item.exitCode, marker: markers[0][0].trim() };
    }
  }
  return { exitCode: item.exitCode, origin: "outer-command", outerExitCode: item.exitCode };
}
