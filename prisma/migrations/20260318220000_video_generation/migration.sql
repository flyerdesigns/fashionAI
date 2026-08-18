-- AlterTable: CreditReservation supports video jobs
ALTER TABLE "CreditReservation" ALTER COLUMN "generationJobId" DROP NOT NULL;
ALTER TABLE "CreditReservation" ADD COLUMN "videoGenerationJobId" TEXT;

-- AlterTable: UsageRecord video fields
ALTER TABLE "UsageRecord" ADD COLUMN "videoId" TEXT;
ALTER TABLE "UsageRecord" ADD COLUMN "videoGenerationJobId" TEXT;

-- CreateTable: Video
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "photoshootId" TEXT,
    "sourceImageId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceStorageKey" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "videoType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerJobId" TEXT,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "duration" INTEGER NOT NULL,
    "aspectRatio" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "motionPreset" TEXT,
    "cameraMovement" TEXT NOT NULL,
    "videoStyle" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "storageKey" TEXT,
    "thumbnailStorageKey" TEXT,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VideoGenerationJob
CREATE TABLE "VideoGenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerJobId" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "requestId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VideoGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditReservation_videoGenerationJobId_key" ON "CreditReservation"("videoGenerationJobId");
CREATE INDEX "UsageRecord_videoId_idx" ON "UsageRecord"("videoId");
CREATE INDEX "Video_userId_idx" ON "Video"("userId");
CREATE INDEX "Video_userId_createdAt_idx" ON "Video"("userId", "createdAt");
CREATE INDEX "Video_userId_status_idx" ON "Video"("userId", "status");
CREATE INDEX "Video_photoshootId_idx" ON "Video"("photoshootId");
CREATE INDEX "Video_productId_idx" ON "Video"("productId");
CREATE INDEX "Video_storageKey_idx" ON "Video"("storageKey");
CREATE UNIQUE INDEX "VideoGenerationJob_requestId_key" ON "VideoGenerationJob"("requestId");
CREATE INDEX "VideoGenerationJob_userId_idx" ON "VideoGenerationJob"("userId");
CREATE INDEX "VideoGenerationJob_videoId_idx" ON "VideoGenerationJob"("videoId");
CREATE INDEX "VideoGenerationJob_status_idx" ON "VideoGenerationJob"("status");
CREATE INDEX "VideoGenerationJob_status_lockedAt_idx" ON "VideoGenerationJob"("status", "lockedAt");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_photoshootId_fkey" FOREIGN KEY ("photoshootId") REFERENCES "Photoshoot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoGenerationJob" ADD CONSTRAINT "VideoGenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoGenerationJob" ADD CONSTRAINT "VideoGenerationJob_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditReservation" ADD CONSTRAINT "CreditReservation_videoGenerationJobId_fkey" FOREIGN KEY ("videoGenerationJobId") REFERENCES "VideoGenerationJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
