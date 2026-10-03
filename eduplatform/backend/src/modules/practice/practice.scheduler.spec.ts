import { nextBox, nextReviewAt } from './practice.scheduler';

describe('practice scheduler', () => {
  it.each([[null, true, 1], [null, false, 0], [0, true, 1], [3, true, 4], [4, true, 4], [4, false, 0], [2, false, 0]])('nextBox(%s, %s) = %i', (box, correct, expected) => expect(nextBox(box, correct)).toBe(expected));
  it.each([[0, 1], [1, 2], [2, 4], [3, 8], [4, 16]])('box %i reviews after %i days', (box, days) => {
    const now = new Date('2026-10-03T10:00:00Z');
    expect(nextReviewAt(box, now).getTime() - now.getTime()).toBe(days * 86_400_000);
  });
});
