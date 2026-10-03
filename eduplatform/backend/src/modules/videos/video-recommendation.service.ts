import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiClient } from './gemini.client';
import { buildPrompt, RECOMMENDATION_SCHEMA, RecommendationContext, signatureOf } from './video-recommendation.prompt';
import { mergeWeakness, Recommendation, reasonFor, selectByRules, WeakTopic } from './video-recommendation.rules';
import { toVideoDto, VideoDto } from './videos.service';

const WEAK_BELOW = 50;
const QUESTIONS_ONLY_WEAKNESS = 49;
const MAX_CANDIDATES = 30;
const MAX_ITEMS = 6;
const MAX_REASON = 300;
const CACHE_MS = 24 * 60 * 60_000;
const COOLDOWN_MS = 10 * 60_000;

type Result = { source: 'ai' | 'rules'; items: Recommendation[] };

@Injectable()
export class VideoRecommendationService {
  private logger = new Logger(VideoRecommendationService.name);
  private cooldownUntil = new Map<string, number>();

  constructor(private prisma: PrismaService, private gemini: GeminiClient) {}

  async recommend(userId: string, now = new Date()): Promise<Result> {
    const { ctx, preferred } = await this.gather(userId);
    if (!ctx.weak.length || !ctx.candidates.length) return { source: 'rules', items: [] };
    const rules = (): Result => ({ source: 'rules', items: selectByRules(ctx.weak, ctx.candidates, preferred) });
    if (!this.gemini.isConfigured() || now.getTime() < (this.cooldownUntil.get(userId) ?? 0)) return rules();

    const signature = signatureOf(ctx);
    const cached = await this.prisma.userVideoRecommendation.findUnique({ where: { userId } });
    if (cached && cached.signature === signature && now.getTime() - cached.createdAt.getTime() < CACHE_MS) {
      const items = this.validate(this.parse(cached.itemsJson), ctx);
      if (items.length) return { source: 'ai', items };
    }
    try {
      const items = this.validate(await this.gemini.generateJson(buildPrompt(ctx), RECOMMENDATION_SCHEMA), ctx);
      if (!items.length) throw new Error('Gemini yaroqli video tanlamadi');
      const itemsJson = JSON.stringify(items.map(item => ({ videoId: item.video.id, reason: item.reason })));
      await this.prisma.userVideoRecommendation.upsert({ where: { userId }, create: { userId, signature, itemsJson, createdAt: now }, update: { signature, itemsJson, createdAt: now } });
      return { source: 'ai', items };
    } catch (error) {
      this.logger.warn(`AI tavsiyasi ishlamadi, qoida bo‘yicha beriladi: ${(error as Error).message}`);
      this.cooldownUntil.set(userId, now.getTime() + COOLDOWN_MS);
      return rules();
    }
  }

  private async gather(userId: string): Promise<{ ctx: RecommendationContext; preferred: string[] }> {
    const [user, progress, attempts, stats] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { currentDifficulty: true } }),
      this.prisma.userTopicProgress.findMany({ where: { userId, averagePercentage: { lt: WEAK_BELOW } }, include: { topic: { select: { id: true, name: true } } } }),
      this.prisma.testAttempt.findMany({ where: { userId, isPractice: false, finishedAt: { not: null } }, orderBy: { finishedAt: 'desc' }, select: { testId: true, percentage: true, difficulty: true, test: { select: { topicId: true, topic: { select: { name: true } } } } } }),
      this.prisma.userQuestionStat.findMany({ where: { userId, box: { lte: 1 } }, orderBy: { wrongCount: 'desc' }, take: 50, include: { question: { select: { text: true, test: { select: { topicId: true, topic: { select: { name: true } } } } } } } }),
    ]);
    const items: WeakTopic[] = progress.map(p => ({ topicId: p.topicId, name: p.topic.name, weakness: p.averagePercentage, percentage: p.averagePercentage }));
    const preferred = new Set<string>([user.currentDifficulty]);
    const seenTests = new Set<string>();
    for (const attempt of attempts) {
      if (!attempt.testId || !attempt.test || seenTests.has(attempt.testId)) continue;
      seenTests.add(attempt.testId);
      if (attempt.percentage < WEAK_BELOW) { items.push({ topicId: attempt.test.topicId, name: attempt.test.topic.name, weakness: attempt.percentage, percentage: attempt.percentage }); preferred.add(attempt.difficulty); }
    }
    for (const stat of stats) items.push({ topicId: stat.question.test.topicId, name: stat.question.test.topic.name, weakness: QUESTIONS_ONLY_WEAKNESS, percentage: null });
    const weak = mergeWeakness(items);
    const wrongQuestions = stats.filter(stat => stat.wrongCount > 0).slice(0, 5).map(stat => stat.question.text);
    const rows = weak.length ? await this.prisma.video.findMany({ where: { isActive: true, topic: { isActive: true }, topicId: { in: weak.map(t => t.topicId) } }, include: { topic: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } }) : [];
    const order = new Map(weak.map((topic, index) => [topic.topicId, index]));
    const candidates = rows.map(toVideoDto).sort((a, b) => order.get(a.topicId)! - order.get(b.topicId)!).slice(0, MAX_CANDIDATES);
    return { ctx: { weak, wrongQuestions, candidates }, preferred: [...preferred] };
  }

  private parse(json: string): unknown {
    try { return JSON.parse(json); } catch { return null; }
  }

  private validate(raw: unknown, ctx: RecommendationContext): Recommendation[] {
    const list = Array.isArray(raw) ? raw : (raw as { items?: unknown } | null)?.items;
    if (!Array.isArray(list)) return [];
    const byId = new Map<string, VideoDto>(ctx.candidates.map(video => [video.id, video]));
    const topicOf = new Map(ctx.weak.map(topic => [topic.topicId, topic]));
    const used = new Set<string>();
    const items: Recommendation[] = [];
    for (const entry of list) {
      const videoId = (entry as { videoId?: unknown })?.videoId;
      const video = typeof videoId === 'string' ? byId.get(videoId) : undefined;
      if (!video || used.has(video.id) || items.length >= MAX_ITEMS) continue;
      used.add(video.id);
      const reason = typeof (entry as { reason?: unknown }).reason === 'string' ? (entry as { reason: string }).reason.trim().slice(0, MAX_REASON) : '';
      items.push({ video, reason: reason || reasonFor(topicOf.get(video.topicId)!) });
    }
    return items;
  }
}
