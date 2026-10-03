export const REVIEW_INTERVAL_DAYS = [1, 2, 4, 8, 16] as const;
export const MAX_BOX = REVIEW_INTERVAL_DAYS.length - 1;

export function nextBox(box: number | null, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  return Math.min((box ?? 0) + 1, MAX_BOX);
}

export function nextReviewAt(box: number, now: Date): Date {
  return new Date(now.getTime() + REVIEW_INTERVAL_DAYS[box] * 86_400_000);
}
