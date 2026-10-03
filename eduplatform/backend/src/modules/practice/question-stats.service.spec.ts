import { QuestionStatsService } from './question-stats.service';

const now = new Date('2026-10-03T10:00:00Z');
const day = 86_400_000;
const makeTx = (existing: { questionId: string; box: number; correctCount: number; wrongCount: number }[] = []) => ({ userQuestionStat: { findMany: jest.fn().mockResolvedValue(existing), upsert: jest.fn().mockResolvedValue({}) } });

describe('QuestionStatsService', () => {
  const service = new QuestionStatsService();
  it('creates a stat for a first-seen correct answer in box 1', async () => {
    const tx = makeTx();
    const map = await service.record(tx as any, 'u1', [{ questionId: 'q1', isCorrect: true }], now);
    const call = tx.userQuestionStat.upsert.mock.calls[0][0];
    expect(call.create).toMatchObject({ userId: 'u1', questionId: 'q1', box: 1, correctCount: 1, wrongCount: 0 });
    expect(map.get('q1')!.getTime()).toBe(now.getTime() + 2 * day);
  });
  it('resets an existing stat to box 0 on a wrong answer', async () => {
    const tx = makeTx([{ questionId: 'q1', box: 3, correctCount: 5, wrongCount: 1 }]);
    const map = await service.record(tx as any, 'u1', [{ questionId: 'q1', isCorrect: false }], now);
    const call = tx.userQuestionStat.upsert.mock.calls[0][0];
    expect(call.update).toMatchObject({ box: 0, correctCount: 5, wrongCount: 2 });
    expect(map.get('q1')!.getTime()).toBe(now.getTime() + day);
  });
  it('does nothing for empty results', async () => {
    const tx = makeTx();
    await service.record(tx as any, 'u1', [], now);
    expect(tx.userQuestionStat.findMany).not.toHaveBeenCalled();
    expect(tx.userQuestionStat.upsert).not.toHaveBeenCalled();
  });
});
