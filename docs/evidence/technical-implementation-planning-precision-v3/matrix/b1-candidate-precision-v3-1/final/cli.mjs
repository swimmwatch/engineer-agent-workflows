#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseRecords, summarizeRecords } from './records.mjs';

const [command, file] = process.argv.slice(2);
if (command === 'help') process.stdout.write('record-report: validate <file> | summarize <file>\n');
else if (command === 'validate' || command === 'summarize') {
  try {
    const bytes = readFileSync(file);
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    const records = parseRecords(text);
    const result = command === 'validate'
      ? JSON.stringify(records)
      : (() => {
          const { count, total } = summarizeRecords(records);
          return `{"count":${count},"total":${total.toString()}}`;
        })();
    process.stdout.write(result + '\n');
  } catch {
    process.stderr.write('INVALID_INPUT\n');
    process.exitCode = 2;
  }
} else { process.stderr.write('UNKNOWN_COMMAND\n'); process.exitCode = 2; }
