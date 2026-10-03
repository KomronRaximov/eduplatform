import { buildPrompt, RECOMMENDATION_SCHEMA, signatureOf } from './video-recommendation.prompt';
import { VideoDto } from './videos.service';

const video = (id: string, description: string | null = null): VideoDto => ({ id, topicId: 't1', topic: { id: 't1', name: 'Matematika' }, title: `Video ${id}`, description, difficulty: 'EASY', type: 'YOUTUBE', youtubeId: 'dQw4w9WgXcQ', fileUrl: null, isActive: true });
const ctx = (over: any = {}) => ({ weak: [{ topicId: 't1', name: 'Matematika', weakness: 40, percentage: 40 }], wrongQuestions: ['2+2 nechaga teng?'], candidates: [video('v1'), video('v2')], ...over });

describe('buildPrompt', () => {
  it('includes weak topics, wrong questions and candidate ids', () => {
    const prompt = buildPrompt(ctx());
    expect(prompt).toContain('Matematika');
    expect(prompt).toContain('40%');
    expect(prompt).toContain('2+2 nechaga teng?');
    expect(prompt).toContain('"id":"v1"');
    expect(prompt).toContain('"id":"v2"');
  });
  it('tells the model to treat the data as data, not instructions', () => {
    expect(buildPrompt(ctx())).toMatch(/ko‘rsatma/i);
  });
  it('contains no user identifiers', () => {
    const prompt = buildPrompt(ctx());
    expect(prompt).not.toMatch(/@|userId|email/i);
  });
  it('describes questions-only weakness without a percentage', () => {
    expect(buildPrompt(ctx({ weak: [{ topicId: 't1', name: 'Fizika', weakness: 49, percentage: null }] }))).toContain('Fizika');
  });
});

describe('signatureOf', () => {
  it('is stable for equal contexts and changes when weaknesses, questions or candidates change', () => {
    const base = signatureOf(ctx());
    expect(signatureOf(ctx())).toBe(base);
    expect(signatureOf(ctx({ wrongQuestions: ['boshqa'] }))).not.toBe(base);
    expect(signatureOf(ctx({ candidates: [video('v1')] }))).not.toBe(base);
    expect(signatureOf(ctx({ weak: [{ topicId: 't1', name: 'Matematika', weakness: 20, percentage: 20 }] }))).not.toBe(base);
  });
});

describe('RECOMMENDATION_SCHEMA', () => {
  it('requires items with videoId and reason', () => {
    expect(JSON.stringify(RECOMMENDATION_SCHEMA)).toContain('videoId');
    expect(JSON.stringify(RECOMMENDATION_SCHEMA)).toContain('reason');
  });
});
