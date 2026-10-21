export function parseRecords(bytes) {
  // ignoreBOM preserves the BOM as text so the row grammar rejects it.
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (text === '') return [];
  const rows = text.split('\n');
  if (rows.at(-1) === '') rows.pop();
  const seen = new Set();
  const records = [];
  for (const row of rows) {
    const match = /^([A-Za-z0-9_-]+),([0-9]+)$/.exec(row);
    if (!match) throw new Error('INVALID_INPUT');
    const [, id, digits] = match;
    const amount = Number(digits);
    if (seen.has(id) || !Number.isSafeInteger(amount)) throw new Error('INVALID_INPUT');
    seen.add(id);
    records.push({ id, amount });
  }
  return records;
}
