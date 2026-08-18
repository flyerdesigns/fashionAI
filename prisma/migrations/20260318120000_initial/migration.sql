-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "image" TEXT,
    "passwordHash" TEXT,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "customColor" TEXT,
    "description" TEXT,
    "brand" TEXT,
    "status" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "originalImageKey" TEXT NOT NULL,
    "originalImageMimeType" TEXT NOT NULL,
    "originalImageSize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photoshoot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "clothingThumbnailUrl" TEXT,
    "configuration" JSONB NOT NULL,
    "generationId" TEXT NOT NULL,
    "generationJobId" TEXT,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "completedImages" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photoshoot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoshootId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestId" TEXT,
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "completedImages" INTEGER NOT NULL DEFAULT 0,
    "failedImages" INTEGER NOT NULL DEFAULT 0,
    "currentImage" INTEGER,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "errorCategory" TEXT,
    "targetImageId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationImage" (
    "id" TEXT NOT NULL,
    "generationJobId" TEXT NOT NULL,
    "photoshootId" TEXT NOT NULL,
    "imageAssetId" TEXT,
    "poseId" TEXT NOT NULL,
    "poseName" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "error" TEXT,
    "errorCategory" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "Product"("userId");

-- CreateIndex
CREATE INDEX "Product_userId_createdAt_idx" ON "Product"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_originalImageKey_idx" ON "Product"("originalImageKey");

-- CreateIndex
CREATE INDEX "Photoshoot_userId_idx" ON "Photoshoot"("userId");

-- CreateIndex
CREATE INDEX "Photoshoot_userId_createdAt_idx" ON "Photoshoot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Photoshoot_productId_idx" ON "Photoshoot"("productId");

-- CreateIndex
CREATE INDEX "GenerationJob_userId_idx" ON "GenerationJob"("userId");

-- CreateIndex
CREATE INDEX "GenerationJob_photoshootId_idx" ON "GenerationJob"("photoshootId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");

-- CreateIndex
CREATE INDEX "GenerationJob_status_lockedAt_idx" ON "GenerationJob"("status", "lockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_requestId_key" ON "GenerationJob"("requestId");

-- CreateIndex
CREATE INDEX "GenerationImage_generationJobId_idx" ON "GenerationImage"("generationJobId");

-- CreateIndex
CREATE INDEX "GenerationImage_photoshootId_idx" ON "GenerationImage"("photoshootId");

-- CreateIndex
CREATE INDEX "GenerationImage_storageKey_idx" ON "GenerationImage"("storageKey");

-- CreateIndex
CREATE INDEX "GenerationImage_imageAssetId_idx" ON "GenerationImage"("imageAssetId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photoshoot" ADD CONSTRAINT "Photoshoot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photoshoot" ADD CONSTRAINT "Photoshoot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_photoshootId_fkey" FOREIGN KEY ("photoshootId") REFERENCES "Photoshoot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationImage" ADD CONSTRAINT "GenerationImage_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationImage" ADD CONSTRAINT "GenerationImage_photoshootId_fkey" FOREIGN KEY ("photoshootId") REFERENCES "Photoshoot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
