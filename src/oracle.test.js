import { describe, expect, it } from 'vitest';
import { getTables, rollTable, resultText } from './oracle.js';

describe('Datasworn oracle helpers', () => {
  const data = { oracles: { overland: { contents: {
    regions: { name: 'Regions', rows: [{ min: 1, max: 20, text: 'Forest', text2: 'Trees' }] },
    nested: { contents: { details: { rows: [{ min: 1, max: 100, text: 'Detail' }] } } },
    ignored: { name: 'No rows' }
  } } } };
  it('discovers tables across oracle collections', () => { expect(getTables(data)).toHaveLength(2); expect(getTables(data)[0].id).toBe('overland/contents/regions'); expect(getTables(data)[0].label).toBe('Regions'); });
  it('rolls within inclusive ranges', () => {
    const result = rollTable(getTables(data)[0], () => 0);
    expect(result.roll).toBe(1); expect(result.result).toBe('Forest - Trees');
  });
  it('returns a useful fallback when no range matches', () => {
    expect(rollTable({ rows: [] }, () => 0).result).toBe('No result for this roll.');
  });
  it('resolves YAML merge aliases in table rows', () => {
    expect(resultText({ '<<': { text: 'Known waters' } })).toBe('Known waters');
  });
  it('formats nested/repeated roll instructions', () => {
    expect(resultText({ text: 'Roll twice', rolls: 2 })).toBe('Roll twice');
  });
});
