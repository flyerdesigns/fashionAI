-- Add requestId and composite index for admin audit logs

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "requestId" TEXT;

CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_requestId_idx" ON "AuditLog"("requestId");
