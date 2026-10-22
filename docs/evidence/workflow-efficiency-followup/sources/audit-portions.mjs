export function auditPortions(items, version) {
  let offset = 0, cursor, valid = items.length > 0;
  for (const item of items) {
    const value = item.result?.result;
    valid &&= item.completedAtMs !== null && value?.source_version === version &&
      value.offset === offset && item.arguments?.cursor === cursor && typeof value.text === "string";
    offset += value?.text?.length ?? 0;
    cursor = value?.next_cursor ?? undefined;
  }
  const last = items.at(-1)?.result?.result;
  return { complete: Boolean(valid && last?.complete === true && !cursor && offset === last.total_characters),
    portions: items.length, characters: offset };
}
