export function formatReview(nextReviewAt: string, now = new Date()): string {
  const days = Math.max(1, Math.ceil((new Date(nextReviewAt).getTime() - now.getTime()) / 86_400_000));
  return days === 1 ? 'ertaga' : `${days} kundan keyin`;
}
