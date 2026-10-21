export function parseRecords(bytes) {
  // ignoreBOM preserves the BOM as a character for the row grammar to reject.
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (text === '') return [];

  const rows = text.split('\n');
  if (rows.at(-1) === '') rows.pop();
  const records = [];
  const ids = new Set();
  for (const row of rows) {
    const fields = row.split(',');
    if (fields.length !== 2) throw new Error('INVALID_INPUT');
    const [id, digits] = fields;
    if (!/^[A-Za-z0-9_-]+$/.test(id) || !/^[0-9]+$/.test(digits) || ids.has(id)) {
      throw new Error('INVALID_INPUT');
    }
    const amount = Number(digits);
    if (!Number.isSafeInteger(amount)) throw new Error('INVALID_INPUT');
    ids.add(id);
    records.push({ id, amount });
  }
  return records;
}
