export function packetChecklistComplete(todo, packet) {
  const lines = todo.split("\n");
  if (lines.some(line => /^\s*-\s*\[[xX]\]/.test(line) && line.includes(packet))) return true;
  const links = new Set([...todo.matchAll(/\]\((\d{2,}_[^)]+\.md)\)/g)].map(match => match[1]));
  const steps = lines.filter(line => /^\s*-\s*\[[ xX]\]/.test(line));
  return links.size === 1 && links.has(packet) && steps.length > 0 &&
    steps.every(line => /^\s*-\s*\[[xX]\]/.test(line));
}
