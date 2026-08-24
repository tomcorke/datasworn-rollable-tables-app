export function normalise(value) { return String(value ?? '').toLowerCase().replace(/[\s_-]/g, '').replace(/s$/, ''); }
export function resolveTableLink(id, tables) {
  const parts = id.split('/').filter(Boolean);
  const targetRuleset = normalise(parts[0]);
  const candidates = tables.filter(t => !t.ruleset || normalise(t.ruleset) === targetRuleset || normalise(t.ruleset).startsWith(targetRuleset));
  const slugs = parts.slice(-2).map(normalise);
  return candidates.find(t => t.id === id) || candidates.find(t => slugs.some(slug => { const source = normalise(t.sourceKey); return source === slug || source.includes(slug) || slug.includes(source); })) || candidates.find(t => slugs.includes(normalise(t.tableId))) || candidates.find(t => slugs.some(slug => t.id.split('/').some(part => normalise(part) === slug)));
}
