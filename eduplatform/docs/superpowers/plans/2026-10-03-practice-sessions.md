# Shaxsiy mashq sessiyalari Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O'quvchi uchun yangi "Mashq sessiyasi" rejimi: yangi (ko'rilmagan) savollar va Leitner oraliqli takrorlash bo'yicha muddati kelgan xato savollar aralashmasi.

**Architecture:** Yangi `practice` NestJS moduli (sof `scheduler` va `selection` funksiyalari, `QuestionStatsService`, `PracticeService`, controller). Savol darajasidagi o'zlashtirish `UserQuestionStat` jadvalida saqlanadi; oddiy testlar ham shu jadvalni yangilaydi. Frontend'da dashboard kartochkasi va `/practice` sahifasi qo'shiladi.

**Tech Stack:** NestJS 10, Prisma 5 (SQLite), Jest + ts-jest, Next.js, React Query, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-03-practice-sessions-design.md`

## Global Constraints

- Sessiya hajmi 12; muddati kelgan savollar boshida ko'pi bilan 6 ta.
- Leitner qutilari 0–4; oraliqlar (kun): 0→1, 1→2, 2→4, 3→8, 4→16. To'g'ri javob `box+1` (4 dan oshmaydi), xato `box=0`, birinchi marta ko'rilgan to'g'ri savol `box=1`.
- Javob berilmagan savol xato hisoblanadi.
- Practice sessiya `UserTopicProgress` va `User.currentDifficulty` ni o'zgartirmaydi.
- Xato kodlari: boshqa o'quvchi 403, topilmadi 404, yakunlangan 409, noto'g'ri savol/variant 400.
- Barcha foydalanuvchiga ko'rinadigan matnlar o'zbek tilida; kod uslubi mavjud fayllarga mos (ixcham, bir qatorli DTO'lar).
- Endpoint'lar `JwtAuthGuard` ostida (mavjud `AttemptsController` kabi).

## Review Focus

1. Practice sessiyani ikki marta yuborish → 409 (Task 6).
2. Hech qanday javob yubormaslik (`answers: []`) → hamma savol xato, qutilar 0 ga tushadi, xatosiz tugaydi (Task 6).
3. Sessiya boshlangandan keyin admin testni nofaol qilsa yoki savollar tugab qolsa: submit sessiya ro'yxatiga qarab ishlaydi; savol yo'q bo'lsa `start` bo'sh ro'yxat qaytaradi, sessiya yaratilmaydi (Task 4, 6).
4. "Boshlash" tugmasini ketma-ket bosish: ochiq sessiya qayta qaytariladi, ikkinchisi yaratilmaydi (Task 6).
5. Practice attempt ID bilan oddiy `/attempts/:id/submit` chaqirilsa → 409, `testId=null` bo'lgan yozuvlarda 500 chiqmasligi (Task 5).

---

### Task 1: Prisma sxemasi va migratsiya

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_practice_sessions/migration.sql` (Prisma yaratadi)
- Modify: `backend/prisma/seed.ts` (tozalash tartibi)

**Interfaces:**
- Produces: modellar `UserQuestionStat`, `PracticeAttemptQuestion`; `TestAttempt.testId: String?`, `TestAttempt.test: Test?`, `TestAttempt.isPractice: Boolean`.

- [ ] **Step 1: Sxemani o'zgartirish.** `TestAttempt`: `testId String?`, `test Test? @relation(..., onDelete: Restrict)`, `isPractice Boolean @default(false)`, `practiceQuestions PracticeAttemptQuestion[]`. Yangi `UserQuestionStat` (spec'dagi maydonlar, `@@unique([userId, questionId])`, `@@index([userId, nextReviewAt])`, ikkala relation `onDelete: Cascade`). Yangi `PracticeAttemptQuestion` (`id`, `attemptId`, `questionId`, `order Int`, `@@unique([attemptId, questionId])`, ikkala relation Cascade). `User` va `Question` modellariga teskari relation maydonlari qo'shiladi.
- [ ] **Step 2: Migratsiya yaratish.** `cd backend && npx prisma migrate dev --name practice_sessions` (kerak bo'lsa avval `.env.example` dan `.env` nusxa oling). Kutilgan natija: yangi migratsiya papkasi va "Your database is now in sync".
- [ ] **Step 3: `seed.ts` boshidagi `deleteMany` zanjiriga `practiceAttemptQuestion` va `userQuestionStat` ni `testAttempt.deleteMany()` dan oldin qo'shish.**
- [ ] **Step 4: Tekshirish.** `npx prisma generate` va `npx tsc --noEmit -p .` — bu bosqichda `attempt.test` nullable bo'lgani uchun `attempts.service.ts`, `dashboard.service.ts`, `progress.service.ts` da xatolar chiqadi; ular Task 5 da tuzatiladi. Faqat shu uchta fayldagi xatolar bo'lishi kerak.
- [ ] **Step 5: Commit** `feat(db): add practice session models` (sxema, migratsiya, seed).

### Task 2: Leitner rejalashtiruvchi (sof funksiyalar)

**Files:**
- Create: `backend/src/modules/practice/practice.scheduler.ts`
- Test: `backend/src/modules/practice/practice.scheduler.spec.ts`

**Interfaces:**
- Produces:
  - `REVIEW_INTERVAL_DAYS: readonly [1, 2, 4, 8, 16]`, `MAX_BOX = 4`
  - `nextBox(box: number | null, isCorrect: boolean): number` (`null` — savol hali ko'rilmagan)
  - `nextReviewAt(box: number, now: Date): Date` (`now` + `REVIEW_INTERVAL_DAYS[box]` kun)

- [ ] **Step 1: Failing test.** `it.each` jadvali `nextBox` uchun: `(null,true)→1`, `(null,false)→0`, `(0,true)→1`, `(3,true)→4`, `(4,true)→4`, `(4,false)→0`, `(2,false)→0`. `nextReviewAt(0, d)` = `d` + 1 kun, `nextReviewAt(4, d)` = `d` + 16 kun (`getTime()` farqi `days * 86_400_000`).
- [ ] **Step 2:** `npx jest src/modules/practice/practice.scheduler.spec.ts` — FAIL (modul yo'q).
- [ ] **Step 3: Implement** yuqoridagi uchta eksport, `practice.scheduler.ts` ichida.
- [ ] **Step 4:** Test PASS.
- [ ] **Step 5: Commit** `feat(practice): add Leitner scheduler`.

### Task 3: Javoblarni baholash yordamchisi va `QuestionStatsService`

**Files:**
- Create: `backend/src/modules/attempts/evaluate-answers.ts`, `backend/src/modules/attempts/evaluate-answers.spec.ts`
- Create: `backend/src/modules/practice/question-stats.service.ts`, `backend/src/modules/practice/question-stats.service.spec.ts`
- Create: `backend/src/modules/practice/practice.module.ts` (hozircha faqat `QuestionStatsService` ni provide va export qiladi)

**Interfaces:**
- Consumes: `nextBox`, `nextReviewAt` (Task 2); `SubmittedAnswerDto` (`attempts/dto/submit-attempt.dto.ts`).
- Produces:
  - `type EvalQuestion = { id: string; points: number; options: { id: string; isCorrect: boolean }[] }`
  - `type EvaluatedRow = { questionId: string; selectedOptionId: string | null; isCorrect: boolean; points: number }`
  - `evaluateAnswers(questions: EvalQuestion[], submitted: SubmittedAnswerDto[]): { rows: EvaluatedRow[]; score: number; totalPoints: number; percentage: number; correctCount: number }` — `rows` `questions` tartibida; `percentage` 2 xonagacha yaxlitlanadi; noto'g'ri/takroriy `questionId` yoki savolga tegishli bo'lmagan variant uchun `BadRequestException` (mavjud `AttemptsService.submit` dagi xabarlar bilan bir xil).
  - `QuestionStatsService.record(tx: Prisma.TransactionClient, userId: string, results: { questionId: string; isCorrect: boolean }[], now?: Date): Promise<Map<string, Date>>` — har savol uchun mavjud stat'ni o'qiydi, `nextBox`/`nextReviewAt` bilan `upsert` qiladi, `correctCount`/`wrongCount`/`lastSeenAt` yangilaydi; `questionId → nextReviewAt` xaritasini qaytaradi.

- [ ] **Step 1: `evaluateAnswers` testlari:** (a) hamma to'g'ri → `percentage 100`; (b) `submitted: []` → `score 0`, har qator `isCorrect:false`, `selectedOptionId:null`; (c) ballar teng emas (points 1 va 2, faqat 2 ballik to'g'ri) → `percentage 66.67`; (d) begona `questionId` va takroriy `questionId` → `BadRequestException`; (e) boshqa savolning variant ID'si → `BadRequestException`.
- [ ] **Step 2:** FAIL ni tekshirish; **Step 3:** `evaluate-answers.ts` ni mavjud `AttemptsService.submit` mantig'idan ko'chirib (`attempts.service.ts:17-31`) yozish; **Step 4:** PASS.
- [ ] **Step 5: `QuestionStatsService` testi** (prisma tx'ning `userQuestionStat.findMany`/`upsert` ni `jest.fn` bilan almashtirib): yangi savol to'g'ri → `upsert` `create` da `box 1, correctCount 1, wrongCount 0`; mavjud `box 3` xato → `update` da `box 0, wrongCount +1`; qaytgan xarita `nextReviewAt` ni o'z ichiga oladi; `results: []` → hech narsa chaqirilmaydi.
- [ ] **Step 6:** FAIL → implement `question-stats.service.ts` + `practice.module.ts` → PASS.
- [ ] **Step 7: Commit** `feat(practice): answer evaluation helper and question stats service`.

### Task 4: Savol tanlash

**Files:**
- Create: `backend/src/modules/practice/practice.selection.ts`, `backend/src/modules/practice/practice.selection.spec.ts`

**Interfaces:**
- Produces:
  - `SESSION_SIZE = 12`, `MAX_DUE = 6`
  - `pickQuestions<T>(pools: { due: T[]; fresh: T[]; filler: T[] }, size = SESSION_SIZE, maxDue = MAX_DUE): T[]` — tartib: `due` (ko'pi bilan `maxDue`), `fresh` (`size` gacha), qolgan `due`, `filler`; hech qachon `size` dan oshmaydi.
  - (Spec'ga izoh: `fresh` yetmasa, `maxDue` dan oshgan muddati kelgan savollar `filler` dan oldin qo'shiladi — ular `box<=1` to'ldiruvchidan qimmatliroq.)

- [ ] **Step 1: Test:** (a) due 10, fresh 10 → 6 due + 6 fresh; (b) due 2, fresh 20 → 2 due + 10 fresh; (c) due 10, fresh 3, filler 5 → 6 due, 3 fresh, 3 qolgan due (jami 12, filler yo'q); (d) due 0, fresh 0, filler 20 → 12 filler; (e) hammasi bo'sh → `[]`.
- [ ] **Step 2–4:** FAIL → implement → PASS. **Step 5: Commit** `feat(practice): question selection`.

### Task 5: `AttemptsService` va `test` nullable bo'lgan joylarni moslashtirish

**Files:**
- Modify: `backend/src/modules/attempts/attempts.service.ts`, `attempts.module.ts`
- Modify: `backend/src/modules/dashboard/dashboard.service.ts`, `backend/src/modules/progress/progress.service.ts`
- Test: `backend/src/modules/attempts/attempts.service.spec.ts`

**Interfaces:**
- Consumes: `evaluateAnswers`, `QuestionStatsService.record` (Task 3).
- Produces: `AttemptsModule` `PracticeModule` ni import qiladi (Task 3 modulini; `PracticeModule` `QuestionStatsService` ni export qilishi kerak).

- [ ] **Step 1: Failing test** (prisma mock bilan): (a) `isPractice: true` attempt uchun `submit` → `ConflictException`; (b) oddiy attempt `submit` → `QuestionStatsService.record` har bir savol natijasi bilan chaqiriladi va natijada oldingi maydonlar (`percentage`, `recommendedDifficulty`, `recommendation`) o'zgarmagan.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: `submit` ni** `isPractice` yoki `!attempt.test` bo'lsa `ConflictException('Bu urinish mashq sessiyasi')` tashlaydigan, baholashni `evaluateAnswers` orqali bajaradigan va tranzaksiya ichida `record(tx, userId, rows)` chaqiradigan qilib o'zgartirish. TypeScript uchun `attempt.test` torayishi shu tekshiruvdan keyin ishlashi kerak.
- [ ] **Step 4:** `dashboard.service.ts` va `progress.service.ts` da `a.test.title` / `attempt.test.topic` ishlatiladigan joylarni `a.test?.title ?? 'Shaxsiy mashq'` ga o'zgartirish; dashboard'ning `recentAttempts` va `ProgressService.history` practice yozuvlarida yiqilmasin. `UserTopicProgress`/`topic` bo'yicha hisob-kitoblar `isPractice: false` bilan cheklanmasin, faqat `test` ga bog'liq joylar himoyalansin.
- [ ] **Step 5:** `npx jest` (barchasi) va `npx tsc --noEmit -p .` — Task 1 dagi xatolar yo'qolgan bo'lishi kerak. **Step 6: Commit** `refactor(attempts): shared evaluation, record question stats, handle practice attempts`.

### Task 6: `PracticeService` va controller

**Files:**
- Create: `backend/src/modules/practice/practice.service.ts`, `practice.controller.ts`, `practice.service.spec.ts`
- Modify: `backend/src/modules/practice/practice.module.ts` (controller + service), `backend/src/app.module.ts` (`PracticeModule` import)

**Interfaces:**
- Consumes: `pickQuestions` (Task 4), `evaluateAnswers`, `QuestionStatsService.record` (Task 3), `SubmitAttemptDto`.
- Produces:
  - `type PracticeQuestion = { id: string; text: string; order: number; points: number; options: { id: string; text: string; order: number }[] }` (to'g'ri javob belgisiz)
  - `PracticeService.start(userId: string, now?: Date): Promise<{ attemptId: string | null; questions: PracticeQuestion[] }>` — ochiq (`finishedAt: null`, `isPractice: true`) sessiya bo'lsa o'shaning savollarini `PracticeAttemptQuestion.order` bo'yicha qaytaradi; aks holda 3 ta pool'ni yig'ib (faqat faol test + faol mavzu savollari; `due`: `nextReviewAt <= now`, eng eskisi birinchi; `fresh`: statistikasiz, zaif mavzu (`UserTopicProgress.averagePercentage < 50`) ustuvor, so'ng test qiyinligi `User.currentDifficulty` ga yaqinligi bo'yicha; `filler`: `box <= 1` va muddati kelmagan), `pickQuestions` + aralashtirish, `TestAttempt` (`isPractice: true`, `testId: null`, `difficulty = currentDifficulty`, `totalQuestions`) va `PracticeAttemptQuestion` qatorlarini bitta tranzaksiyada yaratadi. Savol bo'lmasa `{ attemptId: null, questions: [] }`, hech narsa yaratilmaydi.
  - `PracticeService.submit(userId: string, attemptId: string, dto: SubmitAttemptDto, now?: Date): Promise<{ attemptId: string; totalQuestions: number; correctAnswers: number; wrongAnswers: number; score: number; percentage: number; results: { questionId: string; isCorrect: boolean; nextReviewAt: string }[] }>` — 404/403/409 tekshiruvlari (practice bo'lmagan attempt ham 404), savollar ro'yxati `PracticeAttemptQuestion` dan olinadi (faollik tekshirilmaydi), `evaluateAnswers`, bitta tranzaksiyada: `attemptAnswer.createMany`, attempt'ni yakunlash (`recommendedDifficulty = difficulty`), `QuestionStatsService.record`.
  - `PracticeService.overview(userId: string, now?: Date): Promise<{ dueCount: number; newCount: number; weakTopics: { topicId: string; name: string; averagePercentage: number }[] }>` — `weakTopics`: `averagePercentage < 50`, eng pastidan, ko'pi bilan 3 ta.
  - Controller `@Controller('practice')`: `POST start`, `POST ':attemptId/submit'`, `GET overview`; `@ApiTags('Practice')`, `@ApiBearerAuth()`, `@UseGuards(JwtAuthGuard)`, foydalanuvchi `@CurrentUser() user: JwtUser` → `user.sub`.

- [ ] **Step 1: Failing testlar** (prisma mock):
  - `start`: statistikasi yo'q 20 savol → 12 ta qaytadi va `testAttempt.create` bir marta; ochiq sessiya mavjud → `create` chaqirilmaydi, o'sha savollar qaytadi; hech qanday savol yo'q → `{ attemptId: null, questions: [] }` va `create` chaqirilmaydi; muddati kelgan savol natijada bor, muddati kelmagan `box 3` savol yo'q.
  - `submit`: hamma to'g'ri → `percentage 100` va `record` shu natijalar bilan chaqiriladi; `answers: []` → `correctAnswers 0`, hamma `isCorrect false`, xatosiz; ikkinchi marta yuborish → `ConflictException`; boshqa o'quvchi → `ForbiddenException`; sessiyada yo'q `questionId` → `BadRequestException`; `userTopicProgress.upsert` va `user.update` chaqirilmaydi.
  - `overview`: `dueCount`/`newCount`/`weakTopics` (3 tadan ko'p zaif mavzudan eng pastlari).
- [ ] **Step 2:** FAIL. **Step 3:** service va controller'ni yuqoridagi imzolar bilan implement qilish (prisma so'rovlari mavjud `tests.service.ts` uslubida; `now` default `new Date()`). **Step 4:** `npx jest` — hammasi PASS; `npx tsc --noEmit -p .` toza.
- [ ] **Step 5: Qo'lda tekshirish.** `npm run prisma:seed && npm run start:dev`, Swagger (`/api` docs) orqali `student@example.com` bilan `POST /practice/start` → 12 savol; takroriy chaqiruv xuddi shu `attemptId`; `POST /practice/:id/submit` → natija; `GET /practice/overview` da `dueCount` ni (xato javoblar uchun 1 kundan keyin) kuzatish.
- [ ] **Step 6: Commit** `feat(practice): practice session endpoints`.

### Task 7: Frontend — turlar, nullable test, dashboard kartochkasi

**Files:**
- Modify: `frontend/src/types/index.ts` (`Attempt.test: Test | null`; yangi `PracticeOverview`, `PracticeQuestion` turlari)
- Modify: `frontend/src/app/(student)/history/page.tsx`, `frontend/src/app/(student)/dashboard/page.tsx`
- Create: `frontend/src/lib/practice.ts`

**Interfaces:**
- Produces: `formatReview(nextReviewAt: string, now?: Date): string` — `≤1` kun: `"ertaga"`, aks holda `"N kundan keyin"` (kunlar soni yuqoriga yaxlitlanadi).

- [ ] **Step 1:** `Attempt.test` nullable bo'lgani uchun tarix va dashboard sahifalaridagi `attempt.test.title`, `attempt.test.topic.name` ishlatilgan joylarni `attempt.test?.title ?? 'Shaxsiy mashq'` va `attempt.test?.topic.name ?? 'Mashq'` ga o'zgartirish. Dashboard `recentAttempts` turida ham `test: Test | null`.
- [ ] **Step 2:** `lib/practice.ts` da `formatReview` ni yozish.
- [ ] **Step 3:** Dashboard'da `useQuery(['practice-overview'], () => api<PracticeOverview>('/practice/overview'))` va hero ostida kartochka: `dueCount > 0` → `"Bugungi takrorlash: {dueCount} ta savol"`, aks holda `"Bugun takrorlash yo'q, yangi savollarni yeching"`; `/practice` ga [Mashqni boshlash] havolasi (`btn-primary`). Overview yuklanmasa/xato bo'lsa kartochka ko'rsatilmaydi (dashboard ishlashda davom etadi).
- [ ] **Step 4:** `cd frontend && npx tsc --noEmit` — toza. **Step 5: Commit** `feat(frontend): practice overview card, nullable test handling`.

### Task 8: Frontend — `/practice` sahifasi

**Files:**
- Create: `frontend/src/app/(student)/practice/page.tsx`

**Interfaces:**
- Consumes: `POST /practice/start`, `POST /practice/:id/submit` (Task 6 javob shakllari), `formatReview` (Task 7), mavjud `tests/[id]/page.tsx` ning savol/variant ko'rinishi (`ErrorBox`, `Loading`, `ProgressBar`, `EmptyState`, `Icon`).

- [ ] **Step 1:** `tests/[id]/page.tsx` dagi runner ko'rinishini asos qilib sahifa yozish: mount'da bir marta (`useRef` himoyasi bilan) `start` chaqiriladi; `attemptId === null` → `EmptyState` ("Hozircha mashq uchun savol yo'q", `/tests` ga havola); taymersiz; "Yakunlash" `confirm` bilan submit.
- [ ] **Step 2:** Submit natijasi shu sahifaning o'zida ko'rsatiladi (alohida route yo'q): foiz, to'g'ri/noto'g'ri soni, har bir savol uchun matn, to'g'ri/xato belgisi va `Keyingi takrorlash: {formatReview(nextReviewAt)}`; ostida [Yana mashq qilish] (sahifani qayta yuklaydi) va `/dashboard` ga havola. Xato bo'lsa `ErrorBox`.
- [ ] **Step 3:** `npx tsc --noEmit` va `npm run build` — toza.
- [ ] **Step 4: Qo'lda tekshirish** (`run.bat` yoki ikkala dev server): `student@example.com` bilan dashboard'da kartochka → `/practice` → 12 savol → yakunlash → natija; ikkinchi marta kirganda xato qilingan savollar 1 kunlik muddat tufayli hali chiqmasligi, yangi savollar chiqishi; sahifani yangilash ochiq sessiyani qaytaradi (yakunlanmagan bo'lsa).
- [ ] **Step 5: Commit** `feat(frontend): practice session page`.

### Task 9: Hujjatlar

**Files:**
- Modify: `README.md` (yoki `backend/README.md`, qaysida endpoint ro'yxati bo'lsa)

- [ ] **Step 1:** Yangi endpoint'lar (`/practice/start`, `/practice/:attemptId/submit`, `/practice/overview`) va Leitner oraliqlarini 5–10 qatorda tavsiflash; mavjud bo'limlar uslubiga mos. **Step 2: Commit** `docs: describe practice sessions`.
