export function summarizeRecords(records) {
  // Each amount is safe, but their sum may exceed Number.MAX_SAFE_INTEGER.
  let total = 0n;
  for (const { amount } of records) total += BigInt(amount);
  return { count: records.length, total };
}

export function serializeSummary({ count, total }) {
  return `{"count":${count},"total":${total.toString()}}`;
}
