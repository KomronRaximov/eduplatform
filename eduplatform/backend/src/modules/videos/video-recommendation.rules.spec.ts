import { mergeWeakness, reasonFor, selectByRules, WeakTopic } from './video-recommendation.rules';
import { VideoDto } from './videos.service';

const video = (id: string, topicId: string, difficulty: string | null = null): VideoDto => ({ id, topicId, topic: { id: topicId, name: topicId }, title: id, description: null, difficulty, type: 'YOUTUBE', youtubeId: 'dQw4w9WgXcQ', fileUrl: null, isActive: true });
const weak = (topicId: string, weakness: number, percentage: number | null = weakness): WeakTopic => ({ topicId, name: topicId, weakness, percentage });

describe('mergeWeakness', () => {
  it('keeps the smallest weakness per topic and sorts weakest first', () => {
    const merged = mergeWeakness([weak('a', 49, null), weak('b', 30), weak('a', 40)]);
    expect(merged.map(t => [t.topicId, t.weakness])).toEqual([['b', 30], ['a', 40]]);
    expect(merged[1].percentage).toBe(40);
  });
});

describe('reasonFor', () => {
  it('mentions the percentage when known', () => {
    expect(reasonFor({ topicId: 'm', name: 'Matematika', weakness: 40, percentage: 40 })).toBe('«Matematika» mavzusida natijangiz 40% — bu video shu mavzuni mustahkamlashga yordam beradi.');
  });
  it('falls back to the wrong-questions text', () => {
    expect(reasonFor({ topicId: 'm', name: 'Matematika', weakness: 49, percentage: null })).toBe('«Matematika» mavzusida xato qilgan savollaringiz bor — bu video yordam beradi.');
  });
});

describe('selectByRules', () => {
  it('returns nothing without weak topics or candidates', () => {
    expect(selectByRules([], [video('v1', 'a')], [])).toEqual([]);
    expect(selectByRules([weak('a', 10)], [], [])).toEqual([]);
  });
  it('ignores videos of topics that are not weak', () => {
    expect(selectByRules([weak('a', 10)], [video('v1', 'b')], [])).toEqual([]);
  });
  it('puts preferred difficulties first and null difficulty last inside a topic', () => {
    const picks = selectByRules([weak('a', 10)], [video('none', 'a', null), video('hard', 'a', 'HARD'), video('easy', 'a', 'EASY')], ['EASY']);
    expect(picks.map(p => p.video.id)).toEqual(['easy', 'hard']);
  });
  it('takes at most two per topic and interleaves the weakest topic first', () => {
    const candidates = ['a1', 'a2', 'a3'].map(id => video(id, 'a')).concat(['b1', 'b2'].map(id => video(id, 'b')));
    const picks = selectByRules([weak('a', 10), weak('b', 20)], candidates, []);
    expect(picks.map(p => p.video.id)).toEqual(['a1', 'b1', 'a2', 'b2']);
  });
  it('caps the total at six', () => {
    const topics = ['a', 'b', 'c', 'd'].map((id, i) => weak(id, i + 1));
    const candidates = topics.flatMap(t => [video(`${t.topicId}1`, t.topicId), video(`${t.topicId}2`, t.topicId)]);
    expect(selectByRules(topics, candidates, [])).toHaveLength(6);
  });
  it('attaches the template reason of the topic', () => {
    const [pick] = selectByRules([weak('a', 33)], [video('v1', 'a')], []);
    expect(pick.reason).toBe(reasonFor(weak('a', 33)));
  });
});
