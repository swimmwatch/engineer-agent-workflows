#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseRecords } from './records.mjs';
const [command, file] = process.argv.slice(2);
if (command === 'help') process.stdout.write('record-report: validate <file> | summarize <file>\n');
else if (command === 'validate' || command === 'summarize') {
  try {
    const records = parseRecords(readFileSync(file));
    if (command === 'validate') {
      process.stdout.write(JSON.stringify(records) + '\n');
    } else {
      const total = records.reduce((sum, record) => sum + BigInt(record.amount), 0n);
      process.stdout.write(`{"count":${records.length},"total":${total}}\n`);
    }
  } catch {
    process.stderr.write('INVALID_INPUT\n');
    process.exitCode = 2;
  }
}
else { process.stderr.write('UNKNOWN_COMMAND\n'); process.exitCode = 2; }
