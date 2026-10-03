import { PrismaClient } from '@prisma/client';
import { Difficulty, UserRole } from '../src/common/types/database.enums';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
const topicData = [
  ['Matematika', 'Sonlar, arifmetika va algebra asoslari'], ['Informatika', 'Kompyuter va algoritmlar asoslari'], ['Dasturlash', 'Dasturlash tillari va mantiq'], ['Ma’lumotlar bazasi', 'SQL va ma’lumotlarni boshqarish']
] as const;
const difficulties = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];
const labels = { EASY: 'Oson', MEDIUM: 'O‘rta', HARD: 'Qiyin' };
const questionsFor = (topic: string, difficulty: Difficulty) => Array.from({ length: 10 }, (_, index) => {
  const n = index + 1;
  const correct = `${topic} bo‘yicha ${labels[difficulty]} darajadagi ${n}-javob`;
  return { text: `${topic}: ${n}-savol (${labels[difficulty]} daraja). To‘g‘ri variantni tanlang.`, order: n, points: difficulty === Difficulty.HARD ? 2 : 1, options: { create: [
    { text: `${topic} variant A${n}`, order: 1, isCorrect: false }, { text: correct, order: 2, isCorrect: true }, { text: `${topic} variant C${n}`, order: 3, isCorrect: false }, { text: `${topic} variant D${n}`, order: 4, isCorrect: false }
  ] } };
});
async function main() {
  await prisma.attemptAnswer.deleteMany(); await prisma.testAttempt.deleteMany(); await prisma.userTopicProgress.deleteMany(); await prisma.answerOption.deleteMany(); await prisma.question.deleteMany(); await prisma.test.deleteMany(); await prisma.topic.deleteMany(); await prisma.user.deleteMany();
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.create({ data: { firstName: 'Administrator', lastName: 'Demo', email: 'admin@example.com', passwordHash, role: UserRole.ADMIN } });
  await prisma.user.create({ data: { firstName: 'Talaba', lastName: 'Demo', email: 'student@example.com', passwordHash: await bcrypt.hash('Student123!', 12) } });
  for (const [name, description] of topicData) {
    const topic = await prisma.topic.create({ data: { name, description } });
    for (const difficulty of difficulties) await prisma.test.create({ data: { title: `${name} — ${labels[difficulty]}`, description: `${name} fanidan ${labels[difficulty].toLowerCase()} darajadagi demo test.`, topicId: topic.id, difficulty, durationMinutes: 20, questions: { create: questionsFor(name, difficulty) } } });
  }
}
main().then(() => prisma.$disconnect()).catch(async error => { console.error(error); await prisma.$disconnect(); process.exit(1); });
