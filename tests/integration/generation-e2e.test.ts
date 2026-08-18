import { vi } from "vitest";
import { describeIntegration } from "./setup";
import {
  createTestUser,
  createTestProduct,
  setUserCredits,
} from "./helpers/factories";
import { testPhotoshootConfiguration } from "./helpers/config";
import { createMockImageProvider } from "./helpers/mocks";
import { mockAuthForUser } from "./helpers/auth-session";
import { getImageProvider } from "@/lib/ai/provider-factory";
import { GenerationWorker } from "@/lib/generation/worker";
import { getTestPrisma } from "@/lib/test/prisma-client";
import { POST as generatePost } from "@/app/api/generate/photoshoot/route";
import { GET as jobGet } from "@/app/api/generation/[jobId]/route";
import { POST as cancelPost } from "@/app/api/generation/[jobId]/cancel/route";
import { randomUUID } from "crypto";

vi.mock("@/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/auth")>();
  return { ...mod, auth: vi.fn() };
});

vi.mock("@/lib/ai/provider-factory", () => ({
  getImageProvider: vi.fn(),
}));

describeIntegration("image generation E2E integration", () => {
  beforeEach(() => {
    vi.mocked(getImageProvider).mockReturnValue(createMockImageProvider() as never);
  });

  async function createJob(userId: string, poses = ["standing", "full-body", "half-body", "close-up"] as const, requestId?: string) {
    const user = await getTestPrisma().user.findUniqueOrThrow({ where: { id: userId } });
    const product = await createTestProduct(userId);
    await setUserCredits(userId, 200);
    await mockAuthForUser(user);

    const response = await generatePost(
      new Request("http://localhost/api/generate/photoshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          configuration: testPhotoshootConfiguration([...poses]),
          requestId,
        }),
      }),
    );

    expect(response.status).toBe(202);
    const body = (await response.json()) as { jobId: string };
    return { jobId: body.jobId, product, user };
  }

  it("completes successful generation with credit settlement", async () => {
    const user = await createTestUser();
    const { jobId } = await createJob(user.id, ["standing", "full-body"]);

    const worker = new GenerationWorker();
    await worker.processNextQueued("e2e-worker");

    await mockAuthForUser(user);
    const statusResponse = await jobGet(new Request("http://localhost"), {
      params: Promise.resolve({ jobId }),
    });
    expect(statusResponse.status).toBe(200);
    const status = (await statusResponse.json()) as { status: string; completedImages: number };
    expect(status.status).toBe("completed");
    expect(status.completedImages).toBe(2);

    const prisma = getTestPrisma();
    const images = await prisma.generationImage.count({ where: { generationJobId: jobId, status: "completed" } });
    expect(images).toBe(2);
  });

  it("handles partial failure and releases failed image credits", async () => {
    vi.mocked(getImageProvider).mockReturnValue(
      createMockImageProvider({ failOnCalls: [2] }) as never,
    );

    const user = await createTestUser();
    const { jobId } = await createJob(user.id);

    const worker = new GenerationWorker();
    await worker.processNextQueued("e2e-worker");

    const prisma = getTestPrisma();
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    expect(job.status).toBe("partially_failed");
    expect(job.completedImages).toBe(3);
    expect(job.failedImages).toBe(1);

    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(account.reserved).toBe(0);
  });

  it("releases all credits when every image fails", async () => {
    vi.mocked(getImageProvider).mockReturnValue(
      createMockImageProvider({ failOnCalls: [1, 2, 3, 4] }) as never,
    );

    const user = await createTestUser();
    await setUserCredits(user.id, 100);
    const { jobId } = await createJob(user.id);

    const worker = new GenerationWorker();
    await worker.processNextQueued("e2e-worker");

    const prisma = getTestPrisma();
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    expect(job.status).toBe("failed");

    const completedImages = await prisma.generationImage.count({
      where: { generationJobId: jobId, status: "completed" },
    });
    expect(completedImages).toBe(0);
  });

  it("cancels queued job and releases reservation", async () => {
    const user = await createTestUser();
    const { jobId } = await createJob(user.id, ["standing"]);

    await mockAuthForUser(user);
    const cancelResponse = await cancelPost(new Request("http://localhost"), {
      params: Promise.resolve({ jobId }),
    });
    expect(cancelResponse.status).toBe(200);

    const prisma = getTestPrisma();
    const job = await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } });
    expect(job.status).toBe("cancelled");

    const account = await prisma.creditAccount.findUniqueOrThrow({ where: { userId: user.id } });
    expect(account.reserved).toBe(0);
  });

  it("enforces idempotency for duplicate requestId", async () => {
    const user = await createTestUser();
    const requestId = randomUUID();
    const first = await createJob(user.id, ["standing"], requestId);
    const second = await createJob(user.id, ["standing"], requestId);
    expect(second.jobId).toBe(first.jobId);

    const prisma = getTestPrisma();
    const reservations = await prisma.creditReservation.count({
      where: { generationJobId: first.jobId },
    });
    expect(reservations).toBe(1);
  });
});
