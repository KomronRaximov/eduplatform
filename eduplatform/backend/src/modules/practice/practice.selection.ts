export const SESSION_SIZE = 12;
export const MAX_DUE = 6;

export function pickQuestions<T>(pools: { due: T[]; fresh: T[]; filler: T[] }, size = SESSION_SIZE, maxDue = MAX_DUE): T[] {
  const picked = pools.due.slice(0, maxDue);
  for (const group of [pools.fresh, pools.due.slice(maxDue), pools.filler]) picked.push(...group.slice(0, size - picked.length));
  return picked;
}
