export function parseRecords(text) {
  if (text === '') return [];
  const rows = (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
  const seen = new Set();
  return rows.map(row => {
    const match = /^([A-Za-z0-9_-]+),([0-9]+)$/.exec(row);
    if (!match || match[0] !== row) throw new Error('INVALID_INPUT');
    const [, id, digits] = match;
    const amount = Number(digits);
    if (!Number.isSafeInteger(amount) || seen.has(id)) throw new Error('INVALID_INPUT');
    seen.add(id);
    return { id, amount };
  });
}

export function summarizeRecords(records) {
  let total = 0n;
  for (const record of records) total += BigInt(record.amount);
  return { count: records.length, total };
}
