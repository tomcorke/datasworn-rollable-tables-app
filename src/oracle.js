export function getTables(data) {
  return Object.entries(data?.oracles ?? {}).flatMap(([collectionId, collection]) =>
    Object.entries(collection?.contents ?? {})
      .filter(([, table]) => Array.isArray(table?.rows))
      .map(([id, table]) => ({ id: `${collectionId}/${id}`, collectionId, tableId: id, ...table }))
  );
}
export function resultText(row) {
  return [row?.text, row?.text2, row?.text3].filter(Boolean).join(' - ') || row?.result || row?.description || 'No result for this roll.';
}
export function rollTable(table, random = Math.random) {
  const roll = Math.floor(random() * 100) + 1;
  const row = (table?.rows ?? []).find(r => roll >= Number(r.min) && roll <= Number(r.max));
  return { roll, result: resultText(row) };
}
export function favouriteKey(table) { return table.id; }
