import { pickQuestions } from './practice.selection';

const ids = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }));
const prefixes = (list: { id: string }[]) => list.map(q => q.id[0]).join('');

describe('pickQuestions', () => {
  it('caps due questions at 6 and fills with fresh', () => {
    expect(prefixes(pickQuestions({ due: ids('d', 10), fresh: ids('f', 10), filler: [] }))).toBe('dddddd' + 'ffffff');
  });
  it('lets fresh fill the space when few are due', () => {
    expect(prefixes(pickQuestions({ due: ids('d', 2), fresh: ids('f', 20), filler: [] }))).toBe('dd' + 'ffffffffff');
  });
  it('uses leftover due questions before filler', () => {
    expect(prefixes(pickQuestions({ due: ids('d', 10), fresh: ids('f', 3), filler: ids('x', 5) }))).toBe('dddddd' + 'fff' + 'ddd');
  });
  it('falls back to filler and caps at session size', () => {
    expect(pickQuestions({ due: [], fresh: [], filler: ids('x', 20) })).toHaveLength(12);
  });
  it('returns nothing when all pools are empty', () => {
    expect(pickQuestions({ due: [], fresh: [], filler: [] })).toEqual([]);
  });
});
