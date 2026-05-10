ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "experienceLevel" TEXT;

CREATE TABLE IF NOT EXISTS "FxRate" (
  "id" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "rateToUsd" DOUBLE PRECISION NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validTo" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FxRate_currencyCode_idx" ON "FxRate"("currencyCode");
CREATE INDEX IF NOT EXISTS "FxRate_validFrom_idx" ON "FxRate"("validFrom");

CREATE TABLE IF NOT EXISTS "MasterDataItem" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterDataItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MasterDataItem_category_code_key" ON "MasterDataItem"("category", "code");
CREATE INDEX IF NOT EXISTS "MasterDataItem_category_idx" ON "MasterDataItem"("category");
