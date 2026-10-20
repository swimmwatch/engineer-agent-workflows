import { fail } from "../state.js";

export interface ReviewAtom {
  readonly item_key: string;
  readonly text: string;
  readonly text_sha256: string;
  readonly refs: readonly { readonly product_id: string; readonly artifact: string; readonly element_id: string }[];
}

export interface SemanticBlock {
  readonly item_key: string;
  readonly primary_atoms: readonly string[];
  readonly related_atoms: readonly string[];
}

function referenceKey(ref: ReviewAtom["refs"][number]): string {
  return `${ref.product_id}:${ref.artifact}:${ref.element_id}`;
}

/** Group the existing in-scope ledger; never select additional product scope. */
export function buildSemanticBlocks(atoms: readonly ReviewAtom[]): readonly SemanticBlock[] {
  const ordered = [...atoms].sort((a, b) => a.item_key.localeCompare(b.item_key));
  if (new Set(ordered.map((atom) => atom.item_key)).size !== ordered.length) {
    return fail("INVALID_STATE", "Semantic inventory contains duplicate source atoms.");
  }
  const elements = new Map<string, string>();
  for (const atom of ordered) {
    if (!atom.item_key.startsWith("element:")) continue;
    for (const ref of atom.refs) elements.set(referenceKey(ref), atom.item_key);
  }
  const blocks = new Map<string, { item_key: string; primary_atoms: string[]; related_atoms: string[] }>();
  const get = (key: string) => {
    let block = blocks.get(key);
    if (block === undefined) {
      block = { item_key: key, primary_atoms: [], related_atoms: [] };
      blocks.set(key, block);
    }
    return block;
  };
  for (const atom of ordered) {
    const participants = [...new Set(atom.refs.flatMap((ref) => {
      const key = elements.get(referenceKey(ref));
      return key === undefined ? [] : [key];
    }))].sort();
    const attach = atom.item_key.startsWith("decision:") || atom.item_key.startsWith("relation:")
      || atom.item_key.startsWith("upstream:");
    const owner = attach ? participants[0] ?? atom.item_key : atom.item_key;
    get(owner).primary_atoms.push(atom.item_key);
    if (attach) for (const participant of participants) {
      if (participant !== owner) get(participant).related_atoms.push(atom.item_key);
    }
  }
  return [...blocks.values()].sort((a, b) => a.item_key.localeCompare(b.item_key))
    .map((block) => ({ ...block, primary_atoms: block.primary_atoms.sort(), related_atoms: block.related_atoms.sort() }));
}

export function validateSemanticBlocks(atoms: readonly ReviewAtom[], blocks: readonly SemanticBlock[]): void {
  if (JSON.stringify(blocks) !== JSON.stringify(buildSemanticBlocks(atoms))) {
    fail("INVALID_STATE", "Semantic coverage ownership or related evidence is incomplete.");
  }
}

export function semanticBlockText(atoms: readonly ReviewAtom[], block: SemanticBlock,
  byKey: ReadonlyMap<string, ReviewAtom> = new Map(atoms.map((atom) => [atom.item_key, atom])),
): string {
  return [
    `# Semantic block ${block.item_key}`,
    ...block.primary_atoms.map((key) => `## Primary: ${key}\n${byKey.get(key)?.text ?? fail("INVALID_STATE", "Semantic source atom is missing.")}`),
    ...block.related_atoms.map((key) => `## Related context: ${key}\n${byKey.get(key)?.text ?? fail("INVALID_STATE", "Semantic context atom is missing.")}`),
  ].join("\n\n");
}
