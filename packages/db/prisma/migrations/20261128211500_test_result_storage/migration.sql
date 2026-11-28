CREATE TYPE "ResultStatus" AS ENUM ('PASSED', 'FAILED', 'SKIPPED', 'FLAKY');
CREATE TYPE "FlakyState" AS ENUM ('STABLE', 'SUSPECTED', 'FLAKY');

CREATE UNIQUE INDEX "TestRun_projectId_id_key" ON "TestRun"("projectId", "id");

CREATE TABLE "TestSuite" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TestSuite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TestSuite_projectId_id_key" ON "TestSuite"("projectId", "id");
CREATE UNIQUE INDEX "TestSuite_projectId_filePath_key" ON "TestSuite"("projectId", "filePath");

CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "suiteId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titlePath" TEXT[],
    "runnerProject" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastStatus" "ResultStatus" NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "flakyState" "FlakyState" NOT NULL DEFAULT 'STABLE',
    "flakyScore" INTEGER NOT NULL DEFAULT 0,
    "lastFlakyAt" TIMESTAMP(3),
    "isQuarantined" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TestCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestCase_projectId_suiteId_fkey" FOREIGN KEY ("projectId", "suiteId") REFERENCES "TestSuite"("projectId", "id") ON DELETE CASCADE ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX "TestCase_projectId_id_key" ON "TestCase"("projectId", "id");
CREATE UNIQUE INDEX "TestCase_projectId_identifier_key" ON "TestCase"("projectId", "identifier");
CREATE INDEX "TestCase_projectId_flakyState_idx" ON "TestCase"("projectId", "flakyState");
CREATE INDEX "TestCase_projectId_isQuarantined_idx" ON "TestCase"("projectId", "isQuarantined");
CREATE INDEX "TestCase_suiteId_idx" ON "TestCase"("suiteId");

CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "status" "ResultStatus" NOT NULL,
    "retryCount" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "stackTrace" TEXT,
    "shardIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TestResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TestResult_projectId_runId_fkey" FOREIGN KEY ("projectId", "runId") REFERENCES "TestRun"("projectId", "id") ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT "TestResult_projectId_testCaseId_fkey" FOREIGN KEY ("projectId", "testCaseId") REFERENCES "TestCase"("projectId", "id") ON DELETE CASCADE ON UPDATE RESTRICT
);

CREATE UNIQUE INDEX "TestResult_runId_testCaseId_key" ON "TestResult"("runId", "testCaseId");
CREATE INDEX "TestResult_runId_status_idx" ON "TestResult"("runId", "status");
CREATE INDEX "TestResult_testCaseId_createdAt_idx" ON "TestResult"("testCaseId", "createdAt");
CREATE INDEX "TestResult_projectId_createdAt_idx" ON "TestResult"("projectId", "createdAt");
