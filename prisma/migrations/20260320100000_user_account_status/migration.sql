-- Account suspension support (Step 14)
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

CREATE INDEX "User_status_idx" ON "User"("status");
