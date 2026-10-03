import { BadRequestException } from '@nestjs/common';
import { evaluateAnswers, EvalQuestion } from './evaluate-answers';

const questions: EvalQuestion[] = [
  { id: 'q1', points: 1, options: [{ id: 'q1a', isCorrect: true }, { id: 'q1b', isCorrect: false }] },
  { id: 'q2', points: 2, options: [{ id: 'q2a', isCorrect: false }, { id: 'q2b', isCorrect: true }] },
];

describe('evaluateAnswers', () => {
  it('scores 100% when all answers are correct', () => {
    const result = evaluateAnswers(questions, [{ questionId: 'q1', selectedOptionId: 'q1a' }, { questionId: 'q2', selectedOptionId: 'q2b' }]);
    expect(result).toMatchObject({ score: 3, totalPoints: 3, percentage: 100, correctCount: 2 });
  });
  it('treats empty submission as all wrong', () => {
    const result = evaluateAnswers(questions, []);
    expect(result.score).toBe(0);
    expect(result.rows).toEqual([
      { questionId: 'q1', selectedOptionId: null, isCorrect: false, points: 0 },
      { questionId: 'q2', selectedOptionId: null, isCorrect: false, points: 0 },
    ]);
  });
  it('weights by points', () => {
    expect(evaluateAnswers(questions, [{ questionId: 'q2', selectedOptionId: 'q2b' }]).percentage).toBe(66.67);
  });
  it('rejects unknown and duplicate questions', () => {
    expect(() => evaluateAnswers(questions, [{ questionId: 'zzz' }])).toThrow(BadRequestException);
    expect(() => evaluateAnswers(questions, [{ questionId: 'q1' }, { questionId: 'q1' }])).toThrow(BadRequestException);
  });
  it('rejects an option from another question', () => {
    expect(() => evaluateAnswers(questions, [{ questionId: 'q1', selectedOptionId: 'q2b' }])).toThrow(BadRequestException);
  });
});
