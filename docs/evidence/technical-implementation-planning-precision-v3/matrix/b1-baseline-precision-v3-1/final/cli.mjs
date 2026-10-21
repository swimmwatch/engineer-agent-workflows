#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseRecords } from './records.mjs';
import { summarizeRecords, serializeSummary } from './summary.mjs';

const [command, file] = process.argv.slice(2);
if (command === 'help') process.stdout.write('record-report: validate <file> | summarize <file>\n');
else if (command === 'validate' || command === 'summarize') {
  try {
    const records = parseRecords(readFileSync(file));
    const output = (command === 'validate'
      ? JSON.stringify(records)
      : serializeSummary(summarizeRecords(records))) + '\n';
    process.stdout.write(output);
  } catch {
    process.stderr.write('INVALID_INPUT\n');
    process.exitCode = 2;
  }
}
else { process.stderr.write('UNKNOWN_COMMAND\n'); process.exitCode = 2; }
