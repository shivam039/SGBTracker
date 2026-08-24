-- CreateTable
CREATE TABLE "Tranche" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isin" TEXT NOT NULL,
    "seriesName" TEXT NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "maturityDate" DATETIME NOT NULL,
    "earlyExitFrom" DATETIME NOT NULL,
    "issuePriceInr" REAL NOT NULL,
    "couponRatePct" REAL NOT NULL,
    "issueSizeUnits" REAL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trancheId" TEXT NOT NULL,
    "asOf" DATETIME NOT NULL,
    "lastTradedPrice" REAL,
    "bidPrice" REAL,
    "askPrice" REAL,
    "volumeUnits" REAL,
    "numTrades" INTEGER,
    "exchange" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "staleDays" INTEGER NOT NULL DEFAULT 0,
    "dataQuality" TEXT NOT NULL DEFAULT 'OK',
    "ingestionRunId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceSnapshot_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "Tranche" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriceSnapshot_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GoldPriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asOf" DATETIME NOT NULL,
    "pricePerGram" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "tranchesUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "trancheId" TEXT,
    "thresholdValue" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertRule_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "Tranche" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertRuleId" TEXT NOT NULL,
    "trancheId" TEXT,
    "message" TEXT NOT NULL,
    "valueAtTrigger" REAL,
    "triggeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "AlertEvent_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "AlertRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AlertEvent_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "Tranche" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tranche_isin_key" ON "Tranche"("isin");

-- CreateIndex
CREATE INDEX "Tranche_status_idx" ON "Tranche"("status");

-- CreateIndex
CREATE INDEX "Tranche_maturityDate_idx" ON "Tranche"("maturityDate");

-- CreateIndex
CREATE INDEX "PriceSnapshot_trancheId_asOf_idx" ON "PriceSnapshot"("trancheId", "asOf");

-- CreateIndex
CREATE INDEX "PriceSnapshot_asOf_idx" ON "PriceSnapshot"("asOf");

-- CreateIndex
CREATE UNIQUE INDEX "GoldPriceSnapshot_asOf_key" ON "GoldPriceSnapshot"("asOf");

-- CreateIndex
CREATE INDEX "AlertEvent_triggeredAt_idx" ON "AlertEvent"("triggeredAt");

-- CreateIndex
CREATE INDEX "AlertEvent_acknowledged_idx" ON "AlertEvent"("acknowledged");
