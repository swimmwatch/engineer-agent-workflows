export function parseRecords(text) {
  const records = [];
  const ids = new Set();
  if (text === '') return records;
  const rows = text.split('\n');
  if (rows.at(-1) === '') rows.pop();
  for (const row of rows) {
    const match = /^([A-Za-z0-9_-]+),([0-9]+)$/.exec(row);
    if (!match || match[0] !== row) throw new Error('Invalid record');
    const [, id, digits] = match;
    const amount = Number(digits);
    if (!Number.isSafeInteger(amount) || amount < 0 || ids.has(id)) {
      throw new Error('Invalid record');
    }
    ids.add(id);
    records.push({ id, amount });
  }
  return records;
}
