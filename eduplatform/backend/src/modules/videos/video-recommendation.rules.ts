import { VideoDto } from './videos.service';

export type WeakTopic = { topicId: string; name: string; weakness: number; percentage: number | null };
export type Recommendation = { video: VideoDto; reason: string };

export function mergeWeakness(items: WeakTopic[]): WeakTopic[] {
  const best = new Map<string, WeakTopic>();
  for (const item of items) { const old = best.get(item.topicId); if (!old || item.weakness < old.weakness) best.set(item.topicId, item); }
  return [...best.values()].sort((a, b) => a.weakness - b.weakness);
}

export function reasonFor(topic: WeakTopic): string {
  return topic.percentage === null
    ? `«${topic.name}» mavzusida xato qilgan savollaringiz bor — bu video yordam beradi.`
    : `«${topic.name}» mavzusida natijangiz ${Math.round(topic.percentage)}% — bu video shu mavzuni mustahkamlashga yordam beradi.`;
}

export function selectByRules(weak: WeakTopic[], candidates: VideoDto[], preferredDifficulties: string[], limit = 6, perTopic = 2): Recommendation[] {
  const rank = (video: VideoDto) => (video.difficulty && preferredDifficulties.includes(video.difficulty) ? 0 : video.difficulty ? 1 : 2);
  const lists = weak.map(topic => ({ topic, videos: candidates.filter(video => video.topicId === topic.topicId).map((video, index) => ({ video, index })).sort((a, b) => rank(a.video) - rank(b.video) || a.index - b.index).slice(0, perTopic).map(entry => entry.video) }));
  const picks: Recommendation[] = [];
  for (let round = 0; round < perTopic; round++) for (const { topic, videos } of lists) if (videos[round] && picks.length < limit) picks.push({ video: videos[round], reason: reasonFor(topic) });
  return picks;
}
