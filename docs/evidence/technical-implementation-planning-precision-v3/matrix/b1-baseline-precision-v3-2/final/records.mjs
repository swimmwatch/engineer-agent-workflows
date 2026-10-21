export function parseRecords(bytes) {
  // Preserve a BOM so it fails the ID grammar instead of disappearing.
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (text === '') return [];
  const rows = text.split('\n');
  if (rows.at(-1) === '') rows.pop();
  const ids = new Set();
  return rows.map(row => {
    const match = /^([A-Za-z0-9_-]+),([0-9]+)$/.exec(row);
    // `$` can match before a terminal CR; require a whole-row match.
    if (!match || match[0] !== row) throw new Error('INVALID_INPUT');
    const [, id, digits] = match;
    const amount = Number(digits);
    if (ids.has(id) || !Number.isSafeInteger(amount)) throw new Error('INVALID_INPUT');
    ids.add(id);
    return { id, amount };
  });
}
