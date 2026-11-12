export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'; export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export interface User { id: string; firstName: string; lastName: string; email: string; role: Role; currentDifficulty: Difficulty; createdAt?: string; }
export interface Topic { id: string; name: string; description?: string; isActive: boolean; _count?: { tests: number }; }
export interface Test { id: string; title: string; description?: string; difficulty: Difficulty; durationMinutes?: number; isActive: boolean; topic: Topic; _count?: { questions: number }; questions?: Question[]; }
export interface Question { id: string; text: string; order: number; points: number; options: { id: string; text: string; order: number }[]; }
export interface Attempt { id: string; percentage: number; score: number; correctAnswers: number; wrongAnswers: number; totalQuestions: number; difficulty: Difficulty; recommendedDifficulty: Difficulty; finishedAt?: string; isPractice?: boolean; test: Test | null; }
export interface PracticeOverview { dueCount: number; newCount: number; weakTopics: { topicId: string; name: string; averagePercentage: number }[]; failedTests: { testId: string; title: string; percentage: number }[]; }
export interface Video { id: string; topicId: string; topic: { id: string; name: string }; title: string; description: string | null; difficulty: Difficulty | null; type: 'YOUTUBE' | 'UPLOAD'; youtubeId: string | null; fileUrl: string | null; isActive: boolean; }
export interface VideoRecommendation { source: 'ai' | 'rules'; items: { video: Video; reason: string }[]; }
export interface ChatContact { id: string; firstName: string; lastName: string; role: 'STUDENT' | 'TEACHER'; email?: string; }
export interface ChatMessage { id: string; conversationId: string; senderId: string; body: string; createdAt: string; readAt: string | null; }
export interface ChatConversation { id: string; other: ChatContact; lastMessage: { body: string; senderId: string; createdAt: string } | null; unreadCount: number; }
export interface ResultRow { id: string; isPractice: boolean; difficulty: Difficulty; totalQuestions: number; correctAnswers: number; wrongAnswers: number; score: number; percentage: number; finishedAt: string; user: { id: string; firstName: string; lastName: string; email: string }; test: { id: string; title: string; topic: { id: string; name: string } } | null; }
export interface ResultList { items: ResultRow[]; meta: { page: number; limit: number; total: number; totalPages: number }; summary: { total: number; passed: number; failed: number; averagePercentage: number; passPercentage: number }; }
export interface ResultAnswer { questionId: string; text: string; points: number; earned: number; isCorrect: boolean; selectedOptionId: string | null; options: { id: string; text: string; order: number; isCorrect: boolean }[]; }
export interface ResultDetail extends ResultRow { startedAt: string; recommendedDifficulty: Difficulty; passPercentage: number; answers: ResultAnswer[]; }
