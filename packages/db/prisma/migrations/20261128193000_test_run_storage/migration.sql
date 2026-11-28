CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'PASSED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

CREATE TABLE "TestRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runNumber" INTEGER NOT NULL,
    "externalRunId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "branch" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "ciProvider" TEXT NOT NULL,
    "ciJobUrl" TEXT,
    "environment" TEXT,
    "runner" TEXT NOT NULL,
    "runnerVersion" TEXT,
    "reporterVersion" TEXT NOT NULL,
    "shardTotal" INTEGER NOT NULL,
    "shardsCompleted" INTEGER NOT NULL DEFAULT 0,
    "expectedTestCount" INTEGER,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "flakyCount" INTEGER NOT NULL DEFAULT 0,
    "quarantinedFailedCount" INTEGER NOT NULL DEFAULT 0,
    "quarantineUnblocked" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TestRun_projectId_runNumber_key" ON "TestRun"("projectId", "runNumber");
CREATE UNIQUE INDEX "TestRun_projectId_externalRunId_key" ON "TestRun"("projectId", "externalRunId");
CREATE INDEX "TestRun_projectId_createdAt_idx" ON "TestRun"("projectId", "createdAt");
CREATE INDEX "TestRun_projectId_branch_createdAt_idx" ON "TestRun"("projectId", "branch", "createdAt");
CREATE INDEX "TestRun_status_lastActivityAt_idx" ON "TestRun"("status", "lastActivityAt");
