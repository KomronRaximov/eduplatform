export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'; export type Role = 'STUDENT' | 'ADMIN';
export interface User { id: string; firstName: string; lastName: string; email: string; role: Role; currentDifficulty: Difficulty; createdAt?: string; }
export interface Topic { id: string; name: string; description?: string; isActive: boolean; _count?: { tests: number }; }
export interface Test { id: string; title: string; description?: string; difficulty: Difficulty; durationMinutes?: number; isActive: boolean; topic: Topic; _count?: { questions: number }; questions?: Question[]; }
export interface Question { id: string; text: string; order: number; points: number; options: { id: string; text: string; order: number }[]; }
export interface Attempt { id: string; percentage: number; score: number; correctAnswers: number; wrongAnswers: number; totalQuestions: number; difficulty: Difficulty; recommendedDifficulty: Difficulty; finishedAt?: string; test: Test; }
