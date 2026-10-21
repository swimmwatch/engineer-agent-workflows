import { readFileSync } from 'node:fs';

export function parseRecords(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (bytes.length === 0) return [];
  const rows = (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
  const records = [];
  const ids = new Set();
  for (const row of rows) {
    const match = /^([A-Za-z0-9_-]+),([0-9]+)$/.exec(row);
    if (!match) throw new Error('Invalid record');
    const [, id, digits] = match;
    const amount = Number(digits);
    if (!Number.isSafeInteger(amount) || ids.has(id)) throw new Error('Invalid record');
    ids.add(id);
    records.push({ id, amount });
  }
  return records;
}

export function readRecords(file) {
  return parseRecords(readFileSync(file));
}
