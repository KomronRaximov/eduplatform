# Masofaviy o‘qitishda adaptiv ta’lim texnologiyalari yordamida o‘quv natijalarini boshqarish

## 1. Loyiha haqida

Ushbu tizim masofaviy ta’lim jarayonida o‘quvchilarning test natijalarini kuzatish, ularning bilim darajasini avtomatik baholash va natijaga qarab keyingi test qiyinligini adaptiv ravishda belgilash uchun mo‘ljallangan.

Tizimning asosiy maqsadi:

- o‘quvchini ro‘yxatdan o‘tkazish va tizimga kiritish;
- turli mavzu va qiyinlik darajasidagi testlarni topshirish;
- natijani avtomatik hisoblash;
- natijaga qarab keyingi qiyinlik darajasini aniqlash;
- o‘quvchining progressini vaqt bo‘yicha kuzatish;
- kuchli va zaif mavzularni aniqlash;
- administrator orqali testlar, savollar, mavzular va foydalanuvchilarni boshqarish;
- demo ma’lumotlar bilan tizimni namoyish qilish.

---

# 2. Texnologiyalar

## Backend

- **NestJS**
- **TypeScript**
- **SQLite**
- **Prisma ORM**
- **JWT Authentication**
- **Passport**
- **bcrypt**
- **class-validator**
- **class-transformer**
- **Swagger / OpenAPI**

## Frontend

- **Next.js**
- **TypeScript**
- **App Router**
- **React**
- **Tailwind CSS**
- **TanStack Query**
- **React Hook Form**
- **Zod**
- **Recharts** yoki boshqa chart kutubxonasi

## Database

- **SQLite**

## ORM

- **Prisma**

---

# 3. Loyihaning umumiy strukturasi

Backend va frontend bir-biridan alohida papkalarda joylashadi.

```text
adaptive-learning-platform/
│
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── test/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── .env.local
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── architecture.md
└── README.md
```

Backend va frontend **mustaqil project** sifatida ishlaydi.

Frontend backend bilan REST API orqali bog‘lanadi.

---

# 4. Foydalanuvchi rollari

Tizimda birinchi bosqich uchun ikkita asosiy rol bo‘ladi:

```text
STUDENT
ADMIN
```

## STUDENT

O‘quvchi quyidagi imkoniyatlarga ega:

- ro‘yxatdan o‘tish;
- tizimga kirish;
- mavjud testlarni ko‘rish;
- test topshirish;
- natijani ko‘rish;
- tavsiya etilgan keyingi qiyinlikni ko‘rish;
- oldingi natijalar tarixini ko‘rish;
- progress va statistikasini ko‘rish;
- kuchli va zaif mavzularini ko‘rish.

## ADMIN

Administrator quyidagilarni boshqaradi:

- foydalanuvchilar;
- mavzular;
- testlar;
- test savollari;
- javob variantlari;
- qiyinlik darajalari;
- testlarni faollashtirish/o‘chirish;
- demo ma’lumotlar.

---

# 5. Qiyinlik darajalari

Birinchi bosqichda uchta daraja yetarli:

```text
EASY
MEDIUM
HARD
```

Frontendda foydalanuvchiga quyidagicha ko‘rsatilishi mumkin:

```text
Easy   → Oson
Medium → O‘rta
Hard   → Qiyin
```

Database va backendda enum nomlarini ingliz tilida saqlash tavsiya qilinadi.

---

# 6. Asosiy adaptiv logika

Adaptiv algoritm test natijasiga qarab foydalanuvchining keyingi qiyinlik darajasini avtomatik aniqlaydi.

Birinchi versiyada quyidagi oddiy algoritm ishlatiladi.

```text
Natija >= 80%
    → darajani oshirish

Natija >= 50% va < 80%
    → hozirgi darajani saqlash

Natija < 50%
    → darajani pasaytirish
```

Misollar:

```text
EASY + 90%   → MEDIUM
MEDIUM + 85% → HARD
HARD + 90%   → HARD

MEDIUM + 65% → MEDIUM

HARD + 40%   → MEDIUM
MEDIUM + 35% → EASY
EASY + 30%   → EASY
```

Darajalar chegarasi:

```text
EASY < MEDIUM < HARD
```

`EASY` dan past daraja yo‘q.

`HARD` dan yuqori daraja yo‘q.

---

# 7. Adaptiv algoritmni alohida service qilish

Backendda adaptiv algoritm controller ichida yozilmasligi kerak.

Alohida service yaratiladi:

```text
src/modules/adaptive/adaptive.service.ts
```

Masalan:

```ts
getNextDifficulty(
  currentDifficulty: Difficulty,
  percentage: number
): Difficulty
```

Pseudo-logika:

```ts
if (percentage >= 80) {
  return increaseDifficulty(currentDifficulty);
}

if (percentage < 50) {
  return decreaseDifficulty(currentDifficulty);
}

return currentDifficulty;
```

Bu yondashuv keyinchalik adaptiv algoritmni murakkablashtirishni osonlashtiradi.

Masalan kelajakda:

- oxirgi 3 ta test natijasi;
- savolga javob berish vaqti;
- mavzular bo‘yicha bilim darajasi;
- ketma-ket xatolar;
- savol murakkabligi;
- individual learning profile

ham hisobga olinishi mumkin.

---

# 8. Database arxitekturasi

Asosiy jadvallar:

```text
User
Topic
Test
Question
AnswerOption
TestAttempt
AttemptAnswer
UserTopicProgress
```

---

# 9. User modeli

Foydalanuvchi ma’lumotlari.

```text
User
-------------------------
id
firstName
lastName
email
passwordHash
role
currentDifficulty
createdAt
updatedAt
```

Maydonlar:

| Maydon | Tip | Izoh |
|---|---|---|
| id | UUID | Primary key |
| firstName | String | Ism |
| lastName | String | Familiya |
| email | String | Login uchun |
| passwordHash | String | Hash qilingan parol |
| role | UserRole | STUDENT / ADMIN |
| currentDifficulty | Difficulty | O‘quvchining joriy umumiy darajasi |
| createdAt | DateTime | Yaratilgan vaqt |
| updatedAt | DateTime | Yangilangan vaqt |

Email unique bo‘lishi kerak.

---

# 10. Topic modeli

Test va savollarni mavzular bo‘yicha ajratish uchun.

Misollar:

```text
Matematika
Algebra
Geometriya
Informatika
Dasturlash asoslari
Ma’lumotlar bazasi
```

Model:

```text
Topic
-------------------------
id
name
description
isActive
createdAt
updatedAt
```

---

# 11. Test modeli

```text
Test
-------------------------
id
title
description
topicId
difficulty
durationMinutes
isActive
createdAt
updatedAt
```

Masalan:

```text
Title: Algebra asoslari
Topic: Algebra
Difficulty: EASY
Duration: 20 minut
```

Bitta mavzuda turli qiyinlikdagi testlar bo‘lishi mumkin:

```text
Algebra - EASY
Algebra - MEDIUM
Algebra - HARD
```

---

# 12. Question modeli

```text
Question
-------------------------
id
testId
text
order
points
createdAt
updatedAt
```

Har bir savol ma’lum testga tegishli.

Birinchi bosqichda faqat:

```text
SINGLE_CHOICE
```

ya’ni bitta to‘g‘ri javobli testlardan foydalanish kifoya.

Keyinchalik:

```text
MULTIPLE_CHOICE
TRUE_FALSE
TEXT
```

qo‘shilishi mumkin.

---

# 13. AnswerOption modeli

```text
AnswerOption
-------------------------
id
questionId
text
isCorrect
order
createdAt
updatedAt
```

Misol:

```text
Savol:
2 + 2 = ?

Variantlar:
A) 3
B) 4  ← isCorrect=true
C) 5
D) 6
```

Muhim:

**Student uchun test API javobida `isCorrect` hech qachon qaytarilmasligi kerak.**

Aks holda foydalanuvchi browser DevTools orqali to‘g‘ri javobni ko‘rib olishi mumkin.

---

# 14. TestAttempt modeli

Har bir test topshirish holatini saqlaydi.

```text
TestAttempt
-------------------------
id
userId
testId
difficulty
totalQuestions
correctAnswers
wrongAnswers
score
percentage
recommendedDifficulty
startedAt
finishedAt
createdAt
```

Masalan:

```text
Test: Algebra Medium
Savollar: 10
To‘g‘ri: 8
Xato: 2
Ball: 8
Foiz: 80%
Current Difficulty: MEDIUM
Recommended Difficulty: HARD
```

---

# 15. AttemptAnswer modeli

O‘quvchining har bir savolga bergan javobini saqlaydi.

```text
AttemptAnswer
-------------------------
id
attemptId
questionId
selectedOptionId
isCorrect
points
createdAt
```

Bu jadval keyinchalik:

- qaysi savollarda ko‘p xato qilgani;
- qaysi mavzular zaifligi;
- savollar statistikasi;
- individual tavsiyalar

uchun juda muhim.

---

# 16. UserTopicProgress modeli

Har bir o‘quvchining mavzu bo‘yicha umumiy holati.

```text
UserTopicProgress
-------------------------
id
userId
topicId
difficulty
averagePercentage
totalAttempts
bestPercentage
lastPercentage
updatedAt
```

Masalan:

```text
User: Ali
Topic: Algebra

Current difficulty: MEDIUM
Average: 72%
Best: 90%
Last: 85%
Attempts: 6
```

Bu jadval Dashboard va Statistika sahifasida ishlatiladi.

---

# 17. Tavsiya etilgan Prisma schema

```prisma
enum UserRole {
  STUDENT
  ADMIN
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

model User {
  id                String              @id @default(uuid())
  firstName         String
  lastName          String
  email             String              @unique
  passwordHash      String
  role              UserRole            @default(STUDENT)
  currentDifficulty Difficulty          @default(EASY)

  attempts          TestAttempt[]
  topicProgress     UserTopicProgress[]

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}

model Topic {
  id          String              @id @default(uuid())
  name        String
  description String?
  isActive    Boolean             @default(true)

  tests       Test[]
  progress    UserTopicProgress[]

  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
}

model Test {
  id              String       @id @default(uuid())
  title           String
  description     String?
  topicId         String
  difficulty      Difficulty
  durationMinutes Int?
  isActive        Boolean      @default(true)

  topic           Topic        @relation(fields: [topicId], references: [id], onDelete: Cascade)
  questions       Question[]
  attempts        TestAttempt[]

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@index([topicId])
  @@index([difficulty])
}

model Question {
  id          String          @id @default(uuid())
  testId      String
  text        String
  order       Int
  points      Int             @default(1)

  test        Test            @relation(fields: [testId], references: [id], onDelete: Cascade)
  options     AnswerOption[]
  answers     AttemptAnswer[]

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([testId])
}

model AnswerOption {
  id          String          @id @default(uuid())
  questionId  String
  text        String
  isCorrect   Boolean         @default(false)
  order       Int

  question    Question        @relation(fields: [questionId], references: [id], onDelete: Cascade)
  selectedIn  AttemptAnswer[]

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([questionId])
}

model TestAttempt {
  id                    String          @id @default(uuid())
  userId                String
  testId                String
  difficulty            Difficulty
  totalQuestions        Int
  correctAnswers        Int             @default(0)
  wrongAnswers          Int             @default(0)
  score                 Float           @default(0)
  percentage            Float           @default(0)
  recommendedDifficulty Difficulty
  startedAt             DateTime        @default(now())
  finishedAt            DateTime?

  user                  User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  test                  Test            @relation(fields: [testId], references: [id], onDelete: Restrict)
  answers               AttemptAnswer[]

  createdAt             DateTime        @default(now())

  @@index([userId])
  @@index([testId])
  @@index([createdAt])
}

model AttemptAnswer {
  id               String       @id @default(uuid())
  attemptId        String
  questionId       String
  selectedOptionId String?
  isCorrect        Boolean      @default(false)
  points           Float        @default(0)

  attempt          TestAttempt  @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question         Question     @relation(fields: [questionId], references: [id], onDelete: Restrict)
  selectedOption   AnswerOption? @relation(fields: [selectedOptionId], references: [id], onDelete: SetNull)

  createdAt        DateTime     @default(now())

  @@unique([attemptId, questionId])
  @@index([attemptId])
}

model UserTopicProgress {
  id                String      @id @default(uuid())
  userId            String
  topicId           String
  difficulty        Difficulty  @default(EASY)
  averagePercentage Float       @default(0)
  totalAttempts     Int         @default(0)
  bestPercentage    Float       @default(0)
  lastPercentage    Float       @default(0)

  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic             Topic       @relation(fields: [topicId], references: [id], onDelete: Cascade)

  updatedAt         DateTime    @updatedAt

  @@unique([userId, topicId])
}
```

---

# 18. Backend arxitekturasi

Backend papka:

```text
backend/
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── constants/
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── auth.config.ts
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   └── modules/
│       │
│       ├── auth/
│       │   ├── dto/
│       │   ├── guards/
│       │   ├── strategies/
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   └── auth.module.ts
│       │
│       ├── users/
│       │   ├── dto/
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   └── users.module.ts
│       │
│       ├── topics/
│       │   ├── dto/
│       │   ├── topics.controller.ts
│       │   ├── topics.service.ts
│       │   └── topics.module.ts
│       │
│       ├── tests/
│       │   ├── dto/
│       │   ├── tests.controller.ts
│       │   ├── tests.service.ts
│       │   └── tests.module.ts
│       │
│       ├── questions/
│       │   ├── dto/
│       │   ├── questions.controller.ts
│       │   ├── questions.service.ts
│       │   └── questions.module.ts
│       │
│       ├── attempts/
│       │   ├── dto/
│       │   ├── attempts.controller.ts
│       │   ├── attempts.service.ts
│       │   └── attempts.module.ts
│       │
│       ├── adaptive/
│       │   ├── adaptive.service.ts
│       │   └── adaptive.module.ts
│       │
│       ├── progress/
│       │   ├── progress.controller.ts
│       │   ├── progress.service.ts
│       │   └── progress.module.ts
│       │
│       ├── dashboard/
│       │   ├── dashboard.controller.ts
│       │   ├── dashboard.service.ts
│       │   └── dashboard.module.ts
│       │
│       └── admin/
│           ├── admin.controller.ts
│           ├── admin.service.ts
│           └── admin.module.ts
│
├── test/
│
├── .env
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

---

# 19. Backend modullarining vazifalari

## AuthModule

Vazifalar:

- registration;
- login;
- JWT token yaratish;
- foydalanuvchini aniqlash;
- role guard.

Endpointlar:

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

---

# 20. UsersModule

Foydalanuvchilar bilan ishlaydi.

Student:

```http
GET /api/users/me
```

Admin:

```http
GET    /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
```

---

# 21. TopicsModule

Mavzular.

Student:

```http
GET /api/topics
GET /api/topics/:id
```

Admin:

```http
POST   /api/admin/topics
PATCH  /api/admin/topics/:id
DELETE /api/admin/topics/:id
```

---

# 22. TestsModule

Testlar bilan ishlaydi.

Student:

```http
GET /api/tests
GET /api/tests/recommended
GET /api/tests/:id
```

Filterlar:

```text
topicId
difficulty
isActive
```

Misol:

```http
GET /api/tests?topicId=123&difficulty=MEDIUM
```

### Muhim

Student uchun:

```http
GET /api/tests/:id
```

javobida `AnswerOption.isCorrect` qaytarilmaydi.

---

# 23. QuestionsModule

Asosan admin foydalanadi.

```http
POST   /api/admin/tests/:testId/questions
PATCH  /api/admin/questions/:questionId
DELETE /api/admin/questions/:questionId
```

Javob variantlari ham savol yaratishda birga yuborilishi mumkin.

Misol:

```json
{
  "text": "2 + 2 nechiga teng?",
  "order": 1,
  "points": 1,
  "options": [
    {
      "text": "3",
      "order": 1,
      "isCorrect": false
    },
    {
      "text": "4",
      "order": 2,
      "isCorrect": true
    }
  ]
}
```

---

# 24. Testni boshlash

Endpoint:

```http
POST /api/tests/:testId/start
```

Backend:

1. userni JWT orqali aniqlaydi;
2. testni tekshiradi;
3. test active ekanini tekshiradi;
4. `TestAttempt` yaratadi;
5. test savollarini qaytaradi;
6. to‘g‘ri javoblarni clientga yubormaydi.

Response:

```json
{
  "attemptId": "uuid",
  "test": {
    "id": "uuid",
    "title": "Algebra",
    "difficulty": "MEDIUM",
    "durationMinutes": 20
  },
  "questions": [
    {
      "id": "question-id",
      "text": "2 + 2 = ?",
      "order": 1,
      "options": [
        {
          "id": "option-id",
          "text": "3"
        },
        {
          "id": "option-id",
          "text": "4"
        }
      ]
    }
  ]
}
```

---

# 25. Testni yakunlash

Endpoint:

```http
POST /api/attempts/:attemptId/submit
```

Frontend quyidagicha yuboradi:

```json
{
  "answers": [
    {
      "questionId": "question-1",
      "selectedOptionId": "option-2"
    },
    {
      "questionId": "question-2",
      "selectedOptionId": "option-7"
    }
  ]
}
```

Backend quyidagi ishlarni bajaradi:

```text
1. Attempt foydalanuvchiga tegishlimi?
2. Attempt oldin submit qilinganmi?
3. Savollar testga tegishlimi?
4. Variant savolga tegishlimi?
5. To‘g‘ri javoblar DB dan olinadi.
6. Har bir javob tekshiriladi.
7. To‘g‘ri javoblar soni hisoblanadi.
8. Ball hisoblanadi.
9. Percentage hisoblanadi.
10. AdaptiveService chaqiriladi.
11. Recommended difficulty aniqlanadi.
12. AttemptAnswer lar saqlanadi.
13. TestAttempt yakunlanadi.
14. UserTopicProgress yangilanadi.
15. Natija clientga qaytariladi.
```

Natija:

```json
{
  "attemptId": "uuid",
  "totalQuestions": 10,
  "correctAnswers": 8,
  "wrongAnswers": 2,
  "score": 8,
  "percentage": 80,
  "currentDifficulty": "MEDIUM",
  "recommendedDifficulty": "HARD",
  "recommendation": "Siz HARD darajasiga o'tishga tayyorsiz."
}
```

---

# 26. Natijani hisoblash

Oddiy variant:

```text
percentage =
(correctAnswers / totalQuestions) * 100
```

Agar savollarning ballari turlicha bo‘lsa:

```text
percentage =
earnedPoints / totalAvailablePoints * 100
```

Ikkinchi usul tavsiya qilinadi.

---

# 27. UserTopicProgress yangilanishi

Test yakunlangach:

```text
totalAttempts = oldTotalAttempts + 1
lastPercentage = currentPercentage

averagePercentage =
(oldAverage * oldTotalAttempts + currentPercentage)
/
newTotalAttempts

bestPercentage =
max(oldBestPercentage, currentPercentage)

difficulty =
recommendedDifficulty
```

Update `transaction` ichida bajarilishi kerak.

---

# 28. Database transaction

Test submit qilish juda muhim operatsiya.

Quyidagi ma’lumotlar bitta transaction ichida saqlanishi tavsiya qilinadi:

```text
AttemptAnswer
TestAttempt
UserTopicProgress
User.currentDifficulty
```

Prisma:

```ts
await prisma.$transaction(async (tx) => {
  // barcha submit operatsiyalari
});
```

Bu ma’lumotlar yarim saqlanib qolishining oldini oladi.

---

# 29. Dashboard API

Endpoint:

```http
GET /api/dashboard
```

Response taxminan:

```json
{
  "user": {
    "firstName": "Ali",
    "currentDifficulty": "MEDIUM"
  },
  "summary": {
    "totalTests": 12,
    "averagePercentage": 73,
    "bestPercentage": 95
  },
  "recentAttempts": [],
  "recommendedTests": [],
  "topicProgress": []
}
```

Dashboardda:

- joriy daraja;
- jami topshirilgan testlar;
- o‘rtacha natija;
- eng yaxshi natija;
- oxirgi testlar;
- tavsiya etilgan testlar;
- mavzular bo‘yicha progress

ko‘rsatiladi.

---

# 30. Progress va statistika API

```http
GET /api/progress
GET /api/progress/history
GET /api/progress/topics
GET /api/progress/summary
```

## History

Oxirgi test natijalari:

```json
[
  {
    "date": "2026-08-01",
    "test": "Algebra Easy",
    "percentage": 55
  },
  {
    "date": "2026-08-05",
    "test": "Algebra Medium",
    "percentage": 70
  },
  {
    "date": "2026-08-10",
    "test": "Algebra Medium",
    "percentage": 85
  }
]
```

Frontend buni line chart ko‘rinishida chiqaradi.

---

# 31. Kuchli va zaif mavzular

Oddiy algoritm:

```text
averagePercentage >= 80
    → STRONG

averagePercentage >= 50 va < 80
    → NORMAL

averagePercentage < 50
    → WEAK
```

Masalan:

```text
Algebra      85% → Kuchli
Geometriya   68% → O‘rtacha
Database     42% → Zaif
```

Backend bu klassifikatsiyani qaytarishi mumkin.

---

# 32. Test tavsiya qilish algoritmi

Recommended tests endpoint:

```http
GET /api/tests/recommended
```

Backend quyidagilarni hisobga oladi:

```text
UserTopicProgress.difficulty
Topic
Test.difficulty
Test.isActive
```

Masalan:

```text
User Algebra uchun MEDIUM darajada.
```

Backend Algebra mavzusidan:

```text
difficulty = MEDIUM
```

bo‘lgan testlarni tavsiya qiladi.

Agar oxirgi natija 85% bo‘lsa:

```text
recommendedDifficulty = HARD
```

va keyingi safar HARD testlar tavsiya qilinadi.

---

# 33. Authentication

JWT ishlatiladi.

Login:

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "student@example.com",
  "password": "Password123"
}
```

Response:

```json
{
  "accessToken": "...",
  "user": {
    "id": "uuid",
    "firstName": "Ali",
    "role": "STUDENT"
  }
}
```

Parol databasega oddiy matn ko‘rinishida saqlanmaydi.

```text
password
↓
bcrypt
↓
passwordHash
```

---

# 34. Role Guard

Admin endpointlar:

```text
/api/admin/*
```

faqat:

```text
role = ADMIN
```

bo‘lgan foydalanuvchi uchun ochiq.

NestJS:

```text
JwtAuthGuard
RolesGuard
```

ishlatiladi.

---

# 35. Validation

Har bir POST/PATCH request DTO orqali tekshiriladi.

Global:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
);
```

Misol:

```ts
export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}
```

---

# 36. Swagger

Backend uchun Swagger yoqiladi.

URL:

```text
http://localhost:3001/api/docs
```

Bu orqali:

- barcha endpointlar;
- request body;
- response;
- auth token;
- DTO lar

ko‘rinadi.

Diplom/magistrlik loyihasini himoya qilishda ham foydali.

---

# 37. Frontend arxitekturasi

Frontend Next.js App Router asosida.

```text
frontend/
│
├── public/
│
├── src/
│   │
│   ├── app/
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (student)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── tests/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── attempts/
│   │   │   │   └── [id]/
│   │   │   │       └── result/
│   │   │   │           └── page.tsx
│   │   │   ├── history/
│   │   │   │   └── page.tsx
│   │   │   ├── progress/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── users/
│   │   │   │   └── page.tsx
│   │   │   ├── topics/
│   │   │   │   └── page.tsx
│   │   │   ├── tests/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── create/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── tests/
│   │   ├── progress/
│   │   └── admin/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── tests/
│   │   ├── attempts/
│   │   ├── dashboard/
│   │   ├── progress/
│   │   └── admin/
│   │
│   ├── hooks/
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   ├── query-client.ts
│   │   └── utils.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── tests.service.ts
│   │   ├── attempts.service.ts
│   │   ├── dashboard.service.ts
│   │   ├── progress.service.ts
│   │   └── admin.service.ts
│   │
│   ├── types/
│   │   ├── auth.ts
│   │   ├── test.ts
│   │   ├── attempt.ts
│   │   ├── progress.ts
│   │   └── user.ts
│   │
│   └── middleware.ts
│
├── .env.local
├── .env.example
├── package.json
└── README.md
```

---

# 38. Frontend sahifalari

## `/login`

Elementlar:

```text
Email
Parol
Kirish
Ro‘yxatdan o‘tish havolasi
```

---

# 39. `/register`

Elementlar:

```text
Ism
Familiya
Email
Parol
Parolni tasdiqlash
Ro‘yxatdan o‘tish
```

Registrationdan keyin:

```text
Login
```

yoki avtomatik login qilish mumkin.

---

# 40. `/dashboard`

Dashboard o‘quvchining asosiy sahifasi.

Bloklar:

### Joriy daraja

```text
Sizning joriy darajangiz:
MEDIUM
```

### Umumiy statistika

```text
Topshirilgan testlar: 12
O‘rtacha natija: 73%
Eng yaxshi natija: 95%
```

### Tavsiya etilgan testlar

Card:

```text
Algebra
Difficulty: MEDIUM
10 savol
20 daqiqa

[Testni boshlash]
```

### Oxirgi natijalar

```text
Algebra      85%
Database     72%
Geometry     45%
```

### Mavzular progressi

Progress bar:

```text
Algebra       85%
Geometry      58%
Database      42%
```

---

# 41. `/tests`

Barcha mavjud testlar.

Filter:

```text
Mavzu
Qiyinlik
```

Cardlar:

```text
Test nomi
Mavzu
Qiyinlik
Savollar soni
Davomiyligi
Boshlash
```

---

# 42. `/tests/[id]`

Test topshirish sahifasi.

Header:

```text
Test nomi
Savol 3 / 10
Timer
```

Asosiy qism:

```text
Savol matni

○ A
○ B
○ C
○ D
```

Pastki navigatsiya:

```text
[Oldingi]
[Keyingi]

[Yakunlash]
```

---

# 43. Test holatini frontendda saqlash

Test davomida foydalanuvchining javoblari local state’da saqlanadi.

Masalan:

```ts
type SelectedAnswers = Record<string, string>;
```

Natija faqat test yakunlanganda backendga yuboriladi.

Backend doimo javoblarni qayta tekshiradi.

Frontenddagi hisob-kitobga ishonilmaydi.

---

# 44. `/attempts/[id]/result`

Natija sahifasi.

Masalan:

```text
Test yakunlandi

Natija: 80%

To‘g‘ri javoblar: 8
Noto‘g‘ri javoblar: 2

Joriy daraja:
MEDIUM

Tavsiya etilgan keyingi daraja:
HARD
```

Tavsiya:

```text
Ajoyib natija.
Siz keyingi HARD darajadagi testlarga o'tishga tayyorsiz.
```

Button:

```text
[Keyingi testni boshlash]

[Dashboardga qaytish]
```

---

# 45. `/history`

O‘quvchining barcha test natijalari.

Table:

| Test | Mavzu | Daraja | Natija | Sana |
|---|---|---:|---:|---|
| Algebra | Algebra | EASY | 85% | 10.08.2026 |
| Database | DB | MEDIUM | 65% | 12.08.2026 |

Filter:

```text
Topic
Difficulty
Date
```

---

# 46. `/progress`

Progress va statistika sahifasi.

Asosiy bloklar:

### Natijaning vaqt bo‘yicha o‘zgarishi

Line Chart:

```text
55% → 62% → 70% → 82% → 88%
```

### Mavzular bo‘yicha natijalar

Bar Chart:

```text
Algebra      85%
Geometry     65%
Database     45%
```

### Kuchli mavzular

```text
Algebra — 85%
Programming — 82%
```

### Zaif mavzular

```text
Database — 45%
Geometry — 48%
```

### Joriy tavsiya

```text
Database mavzusini qayta mustahkamlash tavsiya etiladi.
```

---

# 47. Admin panel

Admin panel route:

```text
/admin
```

Dashboard:

```text
Foydalanuvchilar soni
Testlar soni
Savollar soni
Topshirilgan testlar soni
```

---

# 48. Admin — foydalanuvchilar

Route:

```text
/admin/users
```

Table:

```text
Ism
Email
Role
Joriy daraja
Ro‘yxatdan o‘tgan sana
```

Amallar:

```text
Ko‘rish
Tahrirlash
O‘chirish
```

---

# 49. Admin — mavzular

Route:

```text
/admin/topics
```

Amallar:

```text
Yangi mavzu
Tahrirlash
Faollashtirish
O‘chirish
```

---

# 50. Admin — testlar

Route:

```text
/admin/tests
```

Table:

```text
Test nomi
Mavzu
Daraja
Savollar soni
Status
```

Amallar:

```text
Yaratish
Tahrirlash
Savollarni boshqarish
Faollashtirish
O‘chirish
```

---

# 51. Test yaratish formasi

```text
Test nomi
Tavsif
Mavzu
Qiyinlik
Davomiylik
Status
```

Keyin savollar qo‘shiladi.

---

# 52. Savol yaratish UI

```text
Savol matni

Javob variantlari:

1. __________________
2. __________________
3. __________________
4. __________________

To‘g‘ri javob:
○ 1
○ 2
○ 3
○ 4

Ball:
1
```

Admin kamida bitta to‘g‘ri javob tanlamasa backend requestni reject qilishi kerak.

---

# 53. Frontend API layer

Frontend komponentlardan bevosita `fetch()` ni har joyda chaqirish tavsiya etilmaydi.

Alohida service layer:

```text
src/services/
```

Misol:

```ts
export const testsService = {
  getTests: async () => {},
  getTest: async (id: string) => {},
  startTest: async (id: string) => {},
  submitAttempt: async () => {},
};
```

---

# 54. TanStack Query

Server ma’lumotlarini boshqarish uchun ishlatiladi.

Query key misollari:

```ts
['dashboard']
['tests']
['tests', filters]
['test', testId]
['progress']
['history']
['admin', 'users']
['admin', 'tests']
```

Mutation:

```text
login
register
startTest
submitTest
createTest
updateTest
deleteTest
```

---

# 55. Backend va frontend o‘rtasidagi data flow

```text
User
  ↓
Next.js Frontend
  ↓
REST API
  ↓
NestJS Controller
  ↓
NestJS Service
  ↓
Prisma ORM
  ↓
SQLite
```

Response:

```text
SQLite
  ↓
Prisma
  ↓
Service
  ↓
Controller
  ↓
JSON
  ↓
Next.js
  ↓
UI
```

---

# 56. Test topshirish to‘liq flow

```text
1. Student login qiladi.

2. Dashboard ochiladi.

3. Frontend:
   GET /api/dashboard

4. Backend recommended testlarni beradi.

5. Student testni tanlaydi.

6. Frontend:
   POST /api/tests/:id/start

7. Backend TestAttempt yaratadi.

8. Savollar frontendga qaytariladi.

9. Student javoblarni tanlaydi.

10. Frontend javoblarni state ichida saqlaydi.

11. Student "Yakunlash" tugmasini bosadi.

12. Frontend:
    POST /api/attempts/:attemptId/submit

13. Backend javoblarni DB bilan tekshiradi.

14. Natijani hisoblaydi.

15. AdaptiveService keyingi darajani aniqlaydi.

16. TestAttempt yangilanadi.

17. AttemptAnswer lar saqlanadi.

18. UserTopicProgress yangilanadi.

19. User.currentDifficulty yangilanadi.

20. Backend natijani frontendga beradi.

21. Frontend Results sahifasini ochadi.

22. Student natija va tavsiyani ko‘radi.
```

---

# 57. Demo database

`prisma/seed.ts` orqali demo ma’lumotlar yaratiladi.

Demo admin:

```text
Email:
admin@example.com

Password:
Admin123!
```

Demo student:

```text
Email:
student@example.com

Password:
Student123!
```

Faqat development/demo muhitida ishlatish kerak.

---

# 58. Demo mavzular

Masalan:

```text
Matematika
Informatika
Dasturlash
Ma’lumotlar bazasi
```

---

# 59. Demo testlar

Har bir mavzu uchun:

```text
1 ta EASY
1 ta MEDIUM
1 ta HARD
```

Masalan:

```text
Matematika asoslari — EASY
Matematika — MEDIUM
Matematika murakkab masalalar — HARD
```

Har testda 10 tadan savol bo‘lishi mumkin.

Demo uchun jami:

```text
4 topic
12 test
120 question
480 answer option
```

yetarli.

---

# 60. Prisma seed

`package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Buyruqlar:

```bash
npx prisma migrate dev
npx prisma db seed
```

---

# 61. Environment variables

Backend `.env.example`:

```env
DATABASE_URL="file:./dev.db"

PORT=3001

JWT_SECRET="change-me"

JWT_EXPIRES_IN="1d"

FRONTEND_URL="http://localhost:3000"
```

Frontend `.env.example`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

---

# 62. CORS

NestJS:

```ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
});
```

Productionda `*` ishlatmaslik tavsiya qilinadi.

---

# 63. API prefix

Backend barcha API route lar uchun:

```text
/api
```

prefix ishlatadi.

NestJS:

```ts
app.setGlobalPrefix('api');
```

---

# 64. Error response formati

Backendda bir xil error format ishlatiladi.

Masalan:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "email": [
      "Email must be valid"
    ]
  }
}
```

Yoki:

```json
{
  "statusCode": 404,
  "message": "Test not found"
}
```

---

# 65. HTTP status kodlar

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

---

# 66. Pagination

Admin va history listlar uchun pagination ishlatiladi.

Request:

```http
GET /api/admin/users?page=1&limit=20
```

Response:

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

# 67. Search va filter

Admin testlar:

```http
GET /api/admin/tests?search=algebra&difficulty=MEDIUM&topicId=123
```

Users:

```http
GET /api/admin/users?search=ali&role=STUDENT
```

History:

```http
GET /api/attempts/history?topicId=123&difficulty=MEDIUM
```

---

# 68. Security

Minimal xavfsizlik talablari:

- password bcrypt bilan hash qilinadi;
- JWT secret `.env` da turadi;
- DTO validation;
- admin endpointlarga RoleGuard;
- user boshqa user attemptini ko‘ra olmaydi;
- to‘g‘ri javob student API da yuborilmaydi;
- submit paytida frontenddan kelgan `isCorrect` ga ishonilmaydi;
- SQL querylar Prisma orqali bajariladi;
- CORS cheklanadi;
- productionda HTTPS ishlatiladi;
- rate limiting qo‘shish tavsiya qilinadi.

---

# 69. Test topshirishdagi muhim security

Frontend hech qachon:

```json
{
  "isCorrect": true
}
```

yuborib natijani belgilamasligi kerak.

Frontend faqat:

```json
{
  "questionId": "...",
  "selectedOptionId": "..."
}
```

yuboradi.

Backend:

```text
selectedOptionId
↓
database
↓
AnswerOption.isCorrect
↓
natija
```

asosida tekshiradi.

---

# 70. Takroriy submitdan himoya

Agar:

```text
finishedAt != null
```

bo‘lsa attempt qayta submit qilinmasligi kerak.

Backend:

```text
409 Conflict
```

qaytarishi mumkin.

---

# 71. Test davomiyligi

Birinchi bosqich uchun timer frontendda ko‘rsatiladi.

Ammo ishonchli qilish uchun backend:

```text
startedAt
durationMinutes
```

asosida ham vaqtni tekshirishi mumkin.

Masalan:

```text
startedAt + durationMinutes < currentTime
```

bo‘lsa test muddati tugagan hisoblanadi.

---

# 72. Minimal MVP

Birinchi ishlaydigan versiyada quyidagilar bo‘lishi shart.

## Authentication

- Register
- Login
- Logout
- Me

## Student

- Dashboard
- Testlar ro‘yxati
- Test topshirish
- Natijani hisoblash
- Adaptive difficulty
- Natija sahifasi
- History
- Progress/statistika

## Admin

- Users list
- Topics CRUD
- Tests CRUD
- Questions CRUD
- Answer options CRUD

## Database

- SQLite
- Prisma migrations
- Demo seed

---

# 73. Ikkinchi bosqich uchun imkoniyatlar

MVP tayyor bo‘lgandan keyin:

- savol banki;
- random savollar;
- random variant tartibi;
- vaqt bo‘yicha adaptiv algoritm;
- mavzu bo‘yicha alohida difficulty;
- individual recommendation;
- AI yordamida tavsiya;
- testlarni import/export;
- Excel import;
- teacher roli;
- kurslar;
- lesson/module;
- certificate;
- notifications;
- leaderboard;
- audit log;
- refresh token;
- email verification;
- password reset

qo‘shilishi mumkin.

---

# 74. Tavsiya etilgan rivojlangan adaptiv model

Magistrlik ishini kuchaytirish uchun keyinchalik faqat bitta test natijasiga qarab emas, bir nechta parametr asosida adaptivlik qilish mumkin.

Masalan:

```text
Adaptive Score =
0.50 × currentTestScore
+
0.30 × lastThreeTestsAverage
+
0.20 × topicAverage
```

Keyin:

```text
Adaptive Score >= 80
    → increase

Adaptive Score >= 50
    → keep

Adaptive Score < 50
    → decrease
```

Bu oddiy `80/50` algoritmdan ilmiy jihatdan kuchliroq kengaytma bo‘la oladi.

Ammo MVP uchun oddiy algoritm yetarli.

---

# 75. API endpointlarning umumiy ro‘yxati

## Auth

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Dashboard

```http
GET /api/dashboard
```

## Topics

```http
GET /api/topics
GET /api/topics/:id
```

## Tests

```http
GET  /api/tests
GET  /api/tests/recommended
GET  /api/tests/:id
POST /api/tests/:id/start
```

## Attempts

```http
POST /api/attempts/:attemptId/submit
GET  /api/attempts/history
GET  /api/attempts/:attemptId
```

## Progress

```http
GET /api/progress
GET /api/progress/history
GET /api/progress/topics
GET /api/progress/summary
```

## Admin Users

```http
GET    /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
```

## Admin Topics

```http
GET    /api/admin/topics
POST   /api/admin/topics
GET    /api/admin/topics/:id
PATCH  /api/admin/topics/:id
DELETE /api/admin/topics/:id
```

## Admin Tests

```http
GET    /api/admin/tests
POST   /api/admin/tests
GET    /api/admin/tests/:id
PATCH  /api/admin/tests/:id
DELETE /api/admin/tests/:id
```

## Admin Questions

```http
POST   /api/admin/tests/:testId/questions
PATCH  /api/admin/questions/:id
DELETE /api/admin/questions/:id
```

---

# 76. Backend service responsibility

Controller faqat:

```text
request qabul qilish
DTO validation
service chaqirish
response qaytarish
```

uchun ishlatiladi.

Business logic:

```text
service
```

ichida bo‘lishi kerak.

Masalan noto‘g‘ri:

```text
AttemptsController
  → hisoblash
  → DB query
  → adaptive logic
```

To‘g‘ri:

```text
AttemptsController
        ↓
AttemptsService
        ↓
AdaptiveService
        ↓
PrismaService
```

---

# 77. Frontend component responsibility

Page component ichida hamma kodni yozmaslik kerak.

Masalan:

```text
ProgressPage
  ↓
ProgressSummaryCards
ProgressChart
TopicPerformanceList
WeakTopicsCard
StrongTopicsCard
```

Test:

```text
TestPage
  ↓
TestHeader
QuestionCard
AnswerOptions
TestNavigation
SubmitTestDialog
```

---

# 78. State turlari

## Server state

TanStack Query:

```text
tests
dashboard
history
progress
users
topics
```

## Local UI state

React state:

```text
currentQuestion
selectedAnswers
dialogOpen
filter
```

---

# 79. Tavsiya etilgan UI navigatsiya

Student sidebar:

```text
Dashboard
Testlar
Natijalar tarixi
Progress
Profil
```

Admin sidebar:

```text
Dashboard
Foydalanuvchilar
Mavzular
Testlar
```

---

# 80. Rang bilan difficulty ko‘rsatish

UI uchun:

```text
EASY   → yashil
MEDIUM → sariq
HARD   → qizil
```

Bu faqat UI darajasida.

Backend:

```text
EASY
MEDIUM
HARD
```

qaytaradi.

---

# 81. Database indexlar

Performance uchun quyidagi indexlar muhim:

```text
User.email
Test.topicId
Test.difficulty
Question.testId
AnswerOption.questionId
TestAttempt.userId
TestAttempt.testId
TestAttempt.createdAt
AttemptAnswer.attemptId
UserTopicProgress(userId, topicId)
```

Prisma schema’da kerakli indexlar qo‘shilishi kerak.

---

# 82. Development portlar

Tavsiya:

```text
Frontend:
http://localhost:3000

Backend:
http://localhost:3001

Swagger:
http://localhost:3001/api/docs

SQLite:
backend/prisma/dev.db
```

---

# 84. Backendni ishga tushirish

```bash
cd backend

npm install

npx prisma generate

npx prisma migrate dev

npx prisma db seed

npm run start:dev
```

---

# 85. Frontendni ishga tushirish

```bash
cd frontend

npm install

npm run dev
```

---

# 86. Development tartibi

Loyihani quyidagi ketma-ketlikda qilish tavsiya etiladi.

## 1-bosqich

```text
Repository structure
SQLite
Prisma
NestJS
Next.js
```

## 2-bosqich

```text
User schema
Auth
JWT
Register
Login
```

## 3-bosqich

```text
Topic
Test
Question
AnswerOption
Admin CRUD
```

## 4-bosqich

```text
Student tests list
Test start
Test UI
```

## 5-bosqich

```text
Submit
Automatic scoring
Attempt history
```

## 6-bosqich

```text
AdaptiveService
Recommended difficulty
Recommended tests
```

## 7-bosqich

```text
Dashboard
Progress
Strong/weak topics
Charts
```

## 8-bosqich

```text
Demo seed
Validation
Security
Error handling
Swagger
Testing
```

---

# 87. Testlash

Backend uchun:

```text
Unit tests
Integration tests
E2E tests
```

Eng muhim testlar:

```text
Register works
Duplicate email blocked
Login works
Wrong password rejected
Student cannot use admin API
Test correct answers are hidden
Test score calculated correctly
80% increases difficulty
50-79% keeps difficulty
<50% decreases difficulty
EASY cannot decrease
HARD cannot increase
Attempt cannot be submitted twice
User cannot submit another user's attempt
Progress is updated correctly
```

---

# 88. Adaptiv algoritm unit testlari

Masalan:

```text
EASY + 80 → MEDIUM
EASY + 79 → EASY
EASY + 49 → EASY

MEDIUM + 80 → HARD
MEDIUM + 60 → MEDIUM
MEDIUM + 49 → EASY

HARD + 95 → HARD
HARD + 70 → HARD
HARD + 49 → MEDIUM
```

Bu testlar `AdaptiveService` uchun alohida yoziladi.

---

# 89. Magistrlik loyihasi uchun asosiy modullar

Tizimni ilmiy ishda quyidagi bloklarga ajratib tushuntirish mumkin:

```text
1. Foydalanuvchini boshqarish moduli

2. Ta’lim/test kontentini boshqarish moduli

3. Bilimni baholash moduli

4. Adaptiv qaror qabul qilish moduli

5. Progress monitoring moduli

6. Analitika va tavsiya moduli

7. Administrator boshqaruv moduli
```

---

# 90. Tizimning konseptual arxitekturasi

```text
┌──────────────────────────────┐
│          STUDENT             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Next.js Frontend       │
│                              │
│ Dashboard                    │
│ Tests                        │
│ Results                      │
│ Progress                     │
└──────────────┬───────────────┘
               │ REST API
               ▼
┌──────────────────────────────┐
│         NestJS API           │
│                              │
│ Auth                         │
│ Tests                        │
│ Attempts                     │
│ Adaptive Engine              │
│ Progress                     │
│ Admin                        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│          Prisma ORM          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│            SQLite            │
└──────────────────────────────┘
```

---

# 91. Adaptiv jarayon

```text
O‘quvchi test topshiradi
        ↓
Javoblar tekshiriladi
        ↓
Natija hisoblanadi
        ↓
Foiz aniqlanadi
        ↓
AdaptiveService
        ↓
┌───────────────────────────┐
│ >= 80% → daraja oshadi    │
│ 50-79% → daraja saqlanadi │
│ < 50% → daraja pasayadi   │
└───────────────────────────┘
        ↓
UserTopicProgress yangilanadi
        ↓
Keyingi test tavsiya qilinadi
```

---

# 92. Muhim arxitektura qarori

Adaptivlikni faqat:

```text
User.currentDifficulty
```

maydonida saqlab qolish yetarli emas.

Chunki foydalanuvchi:

```text
Algebra → HARD
Database → EASY
Programming → MEDIUM
```

bo‘lishi mumkin.

Shuning uchun asosiy adaptiv darajani:

```text
UserTopicProgress.difficulty
```

orqali **har bir mavzu uchun alohida** yuritish to‘g‘riroq.

`User.currentDifficulty` umumiy dashboard indikator sifatida qoldirilishi mumkin, lekin test tavsiyalarida `UserTopicProgress.difficulty` asosiy manba bo‘lishi kerak.

Bu adaptiv ta’lim konsepsiyasiga ancha mos keladi.

---

# 93. Birinchi test uchun difficulty

Agar foydalanuvchida mavzu bo‘yicha hali:

```text
UserTopicProgress
```

yo‘q bo‘lsa:

```text
EASY
```

darajadan boshlaydi.

Birinchi test tugagach progress record yaratiladi.

---

# 94. Recommended test tanlash

Pseudo algoritm:

```text
topicProgress mavjudmi?

YO‘Q:
    difficulty = EASY

HA:
    difficulty = topicProgress.difficulty

↓

shu topic va difficulty dagi active testlarni ol

↓

oldin bajarilmagan testlarni prioritet qil

↓

agar barchasi bajarilgan bo‘lsa:
    eng kam topshirilgan yoki eski testni tavsiya qil
```

---

# 95. MVP uchun yakuniy talablar

Loyiha tayyor deb hisoblanishi uchun quyidagi flow boshidan oxirigacha ishlashi kerak:

```text
Student register
↓
Login
↓
Dashboard
↓
Recommended test
↓
Testni boshlash
↓
Savollarga javob berish
↓
Submit
↓
Automatic scoring
↓
Adaptive difficulty
↓
Result page
↓
History
↓
Progress/statistics
```

Admin uchun:

```text
Login
↓
Admin Dashboard
↓
Topic yaratish
↓
Test yaratish
↓
Savollar va variantlar yaratish
↓
Testni active qilish
↓
Student testni ko‘rishi
```

---

# 96. Yakuniy tavsiya etilgan stack

```text
Frontend
├── Next.js
├── TypeScript
├── Tailwind CSS
├── TanStack Query
├── React Hook Form
├── Zod
└── Recharts

Backend
├── NestJS
├── TypeScript
├── Prisma
├── SQLite
├── Passport JWT
├── bcrypt
├── class-validator
└── Swagger

Infrastructure
└── SQLite
```

---

# 97. Yakun

Ushbu arxitekturada loyiha uchta asosiy qatlamga ajratiladi:

```text
Next.js
Frontend/UI

NestJS
Business Logic/API

SQLite + Prisma
Data Layer
```

Frontend va backend butunlay alohida papkalarda joylashadi:

```text
frontend/
backend/
```

Adaptiv ta’limning asosiy logikasi NestJS backenddagi alohida:

```text
AdaptiveModule
AdaptiveService
```

ichida bo‘ladi.

Har bir o‘quvchining bilim darajasini faqat umumiy daraja emas, balki:

```text
User + Topic
```

kesimida saqlash tavsiya etiladi.

Shunda tizim haqiqiy adaptiv ta’limga yaqin ishlaydi:

```text
O‘quvchi
+
Mavzu
+
Oldingi natijalar
+
Joriy natija
↓
Keyingi qiyinlik darajasi
↓
Keyingi tavsiya etilgan test
```

Bu strukturadan MVP yaratishda ham, keyinchalik magistrlik ishining ilmiy qismini rivojlantirishda ham foydalanish mumkin.
