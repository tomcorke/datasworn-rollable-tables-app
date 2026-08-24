import { describe, expect, it } from 'vitest';
import bundledData from './data/index.json';
import { getTables, resultParts } from './oracle.js';
import { resolveTableLink } from './linkResolver.js';

const tables = Object.entries(bundledData).flatMap(([key, data]) => {
  const ruleset = Object.keys({ classic: 1, delve: 1, starforged: 1, sundered_isles: 1 }).find(name => key.startsWith(`${name}-`));
  return getTables(data).map(t => ({ ...t, sourceKey: key.slice(`${ruleset}-`.length) }));
});
const references = tables.flatMap(table => table.rows.flatMap(row => resultParts(row).filter(part => part.type === 'link').map(part => ({ from: table.id, ...part }))));
const nonTableTargets = /\/(atlas|assets|site_themes)\//;
const tableReferences = references.filter(reference => !nonTableTargets.test(reference.id));
const unsupportedReferences = references.filter(reference => nonTableTargets.test(reference.id));

describe('bundled Datasworn links', () => {
  it('finds references in every table', () => expect(references.length).toBeGreaterThan(0));
  it('resolves every reference targeting an oracle table', () => {
    const missing = tableReferences.filter(reference => !resolveTableLink(reference.id, tables));
    expect(missing, missing.map(({ value, id, from }) => `${value}: ${id} (from ${from})`).join('\n')).toEqual([]);
  });
  it('reports non-table references explicitly', () => {
    expect(unsupportedReferences.length).toBeGreaterThan(0);
    expect(unsupportedReferences.every(reference => nonTableTargets.test(reference.id))).toBe(true);
  });
});
