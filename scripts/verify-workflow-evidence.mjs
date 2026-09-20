#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { verifyCapturedArtifacts } from "./lib/captured-evidence.mjs";

import {
  loadWorkflowEvidenceRegistry,
  verifyWorkflowEvidence,
} from "../tests/lib/workflow-evidence.mjs";

async function main(args = process.argv.slice(2), io = process) {
  if (args.length < 1 || args.length > 2) {
    io.stderr.write(
      "Evidence consistency check only; this does not certify model behavior.\n" +
        "Usage: node scripts/verify-workflow-evidence.mjs <evidence.json> [registry.json]\n",
    );
    return 2;
  }

  try {
    const evidence = JSON.parse(await fs.readFile(args[0], "utf8"));
    const registry = await loadWorkflowEvidenceRegistry(args[1]);
    const report = verifyWorkflowEvidence(evidence, registry);
    report.findings.push(...await verifyCapturedArtifacts(evidence.artifacts, path.dirname(path.resolve(args[0]))));
    report.ok = report.findings.length === 0;
    io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.ok ? 0 : 1;
  } catch {
    io.stderr.write("Unable to read or validate evidence. Check JSON inputs and file accessibility.\n");
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}

export { main };
