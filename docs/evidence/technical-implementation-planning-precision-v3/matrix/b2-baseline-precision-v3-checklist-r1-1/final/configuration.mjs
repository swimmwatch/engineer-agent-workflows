export function parseTimeout(raw) {
  if (raw === undefined) return 5000;
  if (!/^[0-9]+$/.test(raw) || Number(raw) < 1 || Number(raw) > 60) throw new Error('INVALID_TIMEOUT');
  return Number(raw) * 1000;
}
