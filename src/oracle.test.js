import { describe, expect, it } from 'vitest';
import { getTables, rollTable, resultText } from './oracle.js';

describe('Datasworn oracle helpers', () => {
  const data = { oracles: { overland: { contents: {
    regions: { name: 'Regions', rows: [{ min: 1, max: 20, text: 'Forest', text2: 'Trees' }] },
    ignored: { name: 'No rows' }
  } } } };
  it('extracts only rollable tables', () => expect(getTables(data)).toHaveLength(1));
  it('rolls within inclusive ranges', () => {
    const result = rollTable(getTables(data)[0], () => 0);
    expect(result.roll).toBe(1); expect(result.result).toBe('Forest - Trees');
  });
  it('returns a useful fallback when no range matches', () => {
    expect(rollTable({ rows: [] }, () => 0).result).toBe('No result for this roll.');
  });
  it('formats nested/repeated roll instructions', () => {
    expect(resultText({ text: 'Roll twice', rolls: 2 })).toBe('Roll twice');
  });
});
