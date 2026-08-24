-- CreateTable
CREATE TABLE "Tranche" (
    "id" TEXT NOT NULL,
    "isin" TEXT NOT NULL,
    "seriesName" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "earlyExitFrom" TIMESTAMP(3) NOT NULL,
    "issuePriceInr" DOUBLE PRECISION NOT NULL,
    "couponRatePct" DOUBLE PRECISION NOT NULL,
    "issueSizeUnits" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tranche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "trancheId" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "lastTradedPrice" DOUBLE PRECISION,
    "bidPrice" DOUBLE PRECISION,
    "askPrice" DOUBLE PRECISION,
    "volumeUnits" DOUBLE PRECISION,
    "numTrades" INTEGER,
    "exchange" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "staleDays" INTEGER NOT NULL DEFAULT 0,
    "dataQuality" TEXT NOT NULL DEFAULT 'OK',
    "ingestionRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldPriceSnapshot" (
    "id" TEXT NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL,
    "pricePerGram" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoldPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "tranchesUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "notes" TEXT,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "trancheId" TEXT,
    "thresholdValue" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "alertRuleId" TEXT NOT NULL,
    "trancheId" TEXT,
    "message" TEXT NOT NULL,
    "valueAtTrigger" DOUBLE PRECISION,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "Tranche"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "Tranche"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_alertRuleId_fkey" FOREIGN KEY ("alertRuleId") REFERENCES "AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_trancheId_fkey" FOREIGN KEY ("trancheId") REFERENCES "Tranche"("id") ON DELETE CASCADE ON UPDATE CASCADE;

