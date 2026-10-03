-- CreateTable
CREATE TABLE "UserQuestionStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "box" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" DATETIME NOT NULL,
    "nextReviewAt" DATETIME NOT NULL,
    CONSTRAINT "UserQuestionStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserQuestionStat_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeAttemptQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "PracticeAttemptQuestion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TestAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeAttemptQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TestAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "testId" TEXT,
    "isPractice" BOOLEAN NOT NULL DEFAULT false,
    "difficulty" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "score" REAL NOT NULL DEFAULT 0,
    "percentage" REAL NOT NULL DEFAULT 0,
    "recommendedDifficulty" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TestAttempt" ("correctAnswers", "createdAt", "difficulty", "finishedAt", "id", "percentage", "recommendedDifficulty", "score", "startedAt", "testId", "totalQuestions", "userId", "wrongAnswers") SELECT "correctAnswers", "createdAt", "difficulty", "finishedAt", "id", "percentage", "recommendedDifficulty", "score", "startedAt", "testId", "totalQuestions", "userId", "wrongAnswers" FROM "TestAttempt";
DROP TABLE "TestAttempt";
ALTER TABLE "new_TestAttempt" RENAME TO "TestAttempt";
CREATE INDEX "TestAttempt_userId_idx" ON "TestAttempt"("userId");
CREATE INDEX "TestAttempt_testId_idx" ON "TestAttempt"("testId");
CREATE INDEX "TestAttempt_createdAt_idx" ON "TestAttempt"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserQuestionStat_userId_nextReviewAt_idx" ON "UserQuestionStat"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionStat_userId_questionId_key" ON "UserQuestionStat"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeAttemptQuestion_attemptId_questionId_key" ON "PracticeAttemptQuestion"("attemptId", "questionId");
