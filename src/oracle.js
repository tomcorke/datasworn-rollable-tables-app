function walk(value, path = [], labels = []) {
  if (!value || typeof value !== 'object') return [];
  const found = [];
  if (Array.isArray(value.rows)) found.push({ id: path.join('/'), tableId: path.at(-1), label: [...labels, value.name].filter(Boolean).filter((name, index, names) => index === 0 || name !== names[index - 1]).join(' / '), ...value });
  for (const [key, child] of Object.entries(value)) if (key !== 'rows' && key !== '_source') found.push(...walk(child, [...path, key], child?.name ? [...labels, child.name] : labels));
  return found;
}
export function getTables(data) {
  return walk(data?.oracles).filter(t => t.rows).map(table => ({ ...table, collectionId: table.id.split('/')[0] }));
}
export function resultText(row) { return [row?.text, row?.text2, row?.text3].filter(Boolean).join(' - ') || row?.result || row?.description || 'No result for this roll.'; }
export function rollTable(table, random = Math.random) { const roll = Math.floor(random() * 100) + 1; const row = (table?.rows ?? []).find(r => roll >= Number(r.min) && roll <= Number(r.max)); return { roll, result: resultText(row) }; }
export function favouriteKey(table) { return table.id; }
