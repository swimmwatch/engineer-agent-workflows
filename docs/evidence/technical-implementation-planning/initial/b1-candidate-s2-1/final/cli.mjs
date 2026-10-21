#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseRecords } from './records.mjs';

const [command, file] = process.argv.slice(2);
if (command === 'help') process.stdout.write('record-report: validate <file> | summarize <file>\n');
else if (command === 'validate' || command === 'summarize') {
  try {
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(file));
    const records = parseRecords(text);
    const result = command === 'summarize'
      ? { count: records.length, total: records.reduce((total, record) => total + record.amount, 0) }
      : records;
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch {
    process.stderr.write('INVALID_INPUT\n');
    process.exitCode = 2;
  }
} else { process.stderr.write('UNKNOWN_COMMAND\n'); process.exitCode = 2; }
