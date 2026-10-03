import { BadRequestException } from '@nestjs/common';
import { SubmittedAnswerDto } from './dto/submit-attempt.dto';

export type EvalQuestion = { id: string; points: number; options: { id: string; isCorrect: boolean }[] };
export type EvaluatedRow = { questionId: string; selectedOptionId: string | null; isCorrect: boolean; points: number };

export function evaluateAnswers(questions: EvalQuestion[], submitted: SubmittedAnswerDto[]) {
  const questionMap = new Map(questions.map(q => [q.id, q]));
  const received = new Map<string, string | undefined>();
  for (const answer of submitted) {
    const question = questionMap.get(answer.questionId);
    if (!question || received.has(answer.questionId)) throw new BadRequestException('Yuborilgan savol ma’lumotlari noto‘g‘ri');
    if (answer.selectedOptionId && !question.options.some(o => o.id === answer.selectedOptionId)) throw new BadRequestException('Javob varianti savolga tegishli emas');
    received.set(answer.questionId, answer.selectedOptionId);
  }
  const rows: EvaluatedRow[] = questions.map(question => {
    const selectedOptionId = received.get(question.id);
    const isCorrect = question.options.find(o => o.id === selectedOptionId)?.isCorrect === true;
    return { questionId: question.id, selectedOptionId: selectedOptionId ?? null, isCorrect, points: isCorrect ? question.points : 0 };
  });
  const score = rows.reduce((sum, row) => sum + row.points, 0);
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
  const percentage = totalPoints ? Number(((score / totalPoints) * 100).toFixed(2)) : 0;
  return { rows, score, totalPoints, percentage, correctCount: rows.filter(row => row.isCorrect).length };
}
