export function normalise(value) { return String(value ?? '').toLowerCase().replace(/[_-]/g, '').replace(/s$/, ''); }
export function resolveTableLink(id, tables) {
  const parts = id.split('/').filter(Boolean);
  const slugs = parts.slice(-2).map(normalise);
  return tables.find(t => t.id === id) || tables.find(t => slugs.some(slug => { const source = normalise(t.sourceKey); return source === slug || source.includes(slug) || slug.includes(source); })) || tables.find(t => slugs.includes(normalise(t.tableId))) || tables.find(t => slugs.some(slug => t.id.split('/').some(part => normalise(part) === slug)));
}
