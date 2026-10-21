export function parseRecords(text) {
  if (text === '') return [];
  const rows = text.split('\n');
  if (rows.at(-1) === '') rows.pop();
  const ids = new Set();
  const records = [];
  for (const row of rows) {
    const match = /^([A-Za-z0-9_-]+),([0-9]+)$/.exec(row);
    if (!match) throw new Error('INVALID_INPUT');
    const [, id, digits] = match;
    const amount = Number(digits);
    if (!Number.isSafeInteger(amount) || ids.has(id)) throw new Error('INVALID_INPUT');
    ids.add(id);
    records.push({ id, amount });
  }
  return records;
}
