#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseRecords } from './records.mjs';

function summarizeRecords(records) {
  let total = 0n;
  for (const record of records) total += BigInt(record.amount);
  return { count: records.length, total };
}

const [command, file] = process.argv.slice(2);
if (command === 'help') process.stdout.write('record-report: validate <file> | summarize <file>\n');
else if (command === 'validate' || command === 'summarize') {
  try {
    const records = parseRecords(readFileSync(file));
    if (command === 'validate') process.stdout.write(JSON.stringify(records) + '\n');
    else {
      const { count, total } = summarizeRecords(records);
      process.stdout.write(`{"count":${count},"total":${total.toString()}}\n`);
    }
  } catch {
    process.stderr.write('INVALID_INPUT\n');
    process.exitCode = 2;
  }
}
else { process.stderr.write('UNKNOWN_COMMAND\n'); process.exitCode = 2; }
