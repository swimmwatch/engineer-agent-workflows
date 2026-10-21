export function parseRecords(bytes) {
  // Keep a BOM as content so the row grammar rejects it.
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (text === '') return [];

  const rows = text.split('\n');
  if (rows.at(-1) === '') rows.pop();
  const ids = new Set();
  const records = [];
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
