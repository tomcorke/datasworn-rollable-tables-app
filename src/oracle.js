function resolve(value) {
  if (Array.isArray(value)) return value.map(resolve);
  if (!value || typeof value !== 'object') return value;
  const merged = value['<<'];
  const bases = Array.isArray(merged) ? merged : merged ? [merged] : [];
  return { ...Object.assign({}, ...bases.map(resolve)), ...Object.fromEntries(Object.entries(value).filter(([key]) => key !== '<<').map(([key, child]) => [key, resolve(child)])) };
}
function walk(value, path = [], labels = []) {
  if (!value || typeof value !== 'object') return [];
  const found = [];
  if (Array.isArray(value.rows)) found.push({ id: path.join('/'), tableId: path.at(-1), label: [...labels, value.name].filter(Boolean).filter((name, index, names) => index === 0 || name !== names[index - 1]).join(' / '), ...value });
  for (const [key, child] of Object.entries(value)) if (key !== 'rows' && key !== '_source') found.push(...walk(child, [...path, key], child?.name ? [...labels, child.name] : labels));
  return found;
}
export function getTables(data) {
  return walk(resolve(data?.oracles)).filter(t => t.rows).map(table => ({ ...table, collectionId: table.id.split('/')[0] }));
}
export function resultText(row) {
  const resolved = resolve(row);
  const text = [resolved?.text, resolved?.text2, resolved?.text3].filter(Boolean).join(' - ') || resolved?.result || resolved?.description;
  if (!text) return 'No result for this roll.';
  return String(text).replace(/\[([^\]]+)\]\(id:[^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1');
}
export function rollTable(table, random = Math.random) { const roll = Math.floor(random() * 100) + 1; const row = (table?.rows ?? []).find(r => roll >= Number(r.min) && roll <= Number(r.max)); return { roll, result: resultText(row) }; }
export function favouriteKey(table) { return table.id; }
