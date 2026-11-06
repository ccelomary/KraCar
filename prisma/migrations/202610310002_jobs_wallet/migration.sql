CREATE TABLE "WalletRequest" (
"id" TEXT NOT NULL,"agencyId" TEXT NOT NULL,"kind" TEXT NOT NULL,"amount" INTEGER NOT NULL CHECK(amount>0),"status" TEXT NOT NULL DEFAULT 'requested',"requestedBy" TEXT NOT NULL,"approvedBy" TEXT,"reference" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "WalletRequest_pkey" PRIMARY KEY ("id"));
CREATE INDEX "WalletRequest_agencyId_status_idx" ON "WalletRequest"("agencyId","status");
CREATE TABLE "BackgroundJob" (
"id" TEXT NOT NULL,"kind" TEXT NOT NULL,"payload" JSONB NOT NULL,"attempts" INTEGER NOT NULL DEFAULT 0,"status" TEXT NOT NULL DEFAULT 'pending',"nextAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"lastError" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id"));
CREATE INDEX "BackgroundJob_status_nextAt_idx" ON "BackgroundJob"("status","nextAt");
