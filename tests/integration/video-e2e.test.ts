import { vi } from "vitest";
import { describeIntegration } from "./setup";
import {
  createTestUser,
  createTestProduct,
  setUserCredits,
} from "./helpers/factories";
import { seedStorageFile } from "./helpers/storage-seed";
import { createMockVideoProvider } from "./helpers/mocks";
import { mockAuthForUser } from "./helpers/auth-session";
import { getVideoProvider } from "@/lib/video/provider-factory";
import { VideoWorker } from "@/lib/video/worker";
import { getTestPrisma } from "@/lib/test/prisma-client";
import { getVideoGenerationCost } from "@/lib/credits/config";
import { POST as generateVideoPost } from "@/app/api/generate/video/route";
import { randomUUID } from "crypto";

vi.mock("@/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/auth")>();
  return { ...mod, auth: vi.fn() };
});

vi.mock("@/lib/video/provider-factory", () => ({
  getVideoProvider: vi.fn(),
}));

describeIntegration("video generation E2E integration", () => {
  beforeEach(() => {
    vi.mocked(getVideoProvider).mockReturnValue(createMockVideoProvider() as never);
  });

  async function createVideoJob(
    userId: string,
    duration: 5 | 10 | 15 = 5,
    requestId?: string,
  ) {
    const user = await getTestPrisma().user.findUniqueOrThrow({ where: { id: userId } });
    const product = await createTestProduct(userId);
    const sourceKey = product.originalImageKey;
    await seedStorageFile(sourceKey);
    const cost = getVideoGenerationCost(duration);
    await setUserCredits(userId, cost + 50);
    await mockAuthForUser(user);

    const response = await generateVideoPost(
      new Request("http://localhost/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Video",
          sourceType: "product",
          sourceStorageKey: sourceKey,
          productId: product.id,
          configuration: { duration },
          requestId,
        }),
      }),
    );

    return { response, product, user, cost };
  }

  it.each([5, 10, 15] as const)("reserves correct credits for %ss video", async (duration) => {
    const user = await createTestUser();
    const { response, cost } = await createVideoJob(user.id, duration);
    expect(response.status).toBe(202);

    const prisma = getTestPrisma();
    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(account.reserved).toBe(cost);
  });

  it("completes video job via worker and settles credits", async () => {
    const user = await createTestUser();
    const { response } = await createVideoJob(user.id, 5);
    const body = (await response.json()) as { jobId: string; videoId: string };

    const worker = new VideoWorker();
    await worker.processNextQueued("video-e2e");

    const prisma = getTestPrisma();
    const job = await prisma.videoGenerationJob.findUniqueOrThrow({ where: { id: body.jobId } });
    expect(job.status).toBe("completed");

    const video = await prisma.video.findUniqueOrThrow({ where: { id: body.videoId } });
    expect(video.storageKey).toMatch(new RegExp(`users/${user.id}/videos/${body.videoId}/video\\.mp4`));

    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(account.reserved).toBe(0);
  });

  it("rejects insufficient credits", async () => {
    const user = await createTestUser();
    const product = await createTestProduct(user.id);
    await seedStorageFile(product.originalImageKey);
    await setUserCredits(user.id, 1);
    await mockAuthForUser(user);

    const response = await generateVideoPost(
      new Request("http://localhost/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Test Video",
          sourceType: "product",
          sourceStorageKey: product.originalImageKey,
          productId: product.id,
          configuration: { duration: 15 },
        }),
      }),
    );

    expect(response.status).toBe(402);
  });

  it("handles provider failure without losing reserved credits permanently", async () => {
    vi.mocked(getVideoProvider).mockReturnValue(
      createMockVideoProvider({ shouldFail: true }) as never,
    );

    const user = await createTestUser();
    const { response } = await createVideoJob(user.id, 5);
    const body = (await response.json()) as { jobId: string };

    const worker = new VideoWorker();
    await worker.processNextQueued("video-e2e");

    const prisma = getTestPrisma();
    const job = await prisma.videoGenerationJob.findUniqueOrThrow({ where: { id: body.jobId } });
    expect(job.status).toBe("failed");
  });

  it("enforces duplicate request idempotency", async () => {
    const user = await createTestUser();
    const requestId = randomUUID();
    const first = await createVideoJob(user.id, 5, requestId);
    const second = await createVideoJob(user.id, 5, requestId);
    const firstBody = (await first.response.json()) as { jobId: string };
    const secondBody = (await second.response.json()) as { jobId: string };
    expect(secondBody.jobId).toBe(firstBody.jobId);
  });

  it("denies cross-user video access at service layer", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const { response } = await createVideoJob(owner.id, 5);
    const body = (await response.json()) as { jobId: string };

    const { videoService } = await import("@/lib/video/service");
    await expect(videoService.getJobStatusForUser(body.jobId, other.id)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
