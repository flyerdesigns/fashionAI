import { describeIntegration } from "./setup";
import { createTestUser, createTestProduct, createTestPhotoshoot, setUserCredits } from "./helpers/factories";
import { creditService } from "@/lib/credits/service";
import { getTestPrisma } from "@/lib/test/prisma-client";
import { randomUUID } from "crypto";
import { PostgresGenerationJobRepository } from "@/lib/generation/postgres-repository";
import { testPhotoshootConfiguration } from "./helpers/config";
import { generationService } from "@/lib/generation/service";

describeIntegration("concurrency integration", () => {
  it("allows only successful credit reservations under concurrent load", async () => {
    const user = await createTestUser();
    await setUserCredits(user.id, 50);
    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);

    const jobs = await Promise.all(
      Array.from({ length: 10 }).map(async () => {
        const prisma = getTestPrisma();
        return prisma.generationJob.create({
          data: {
            userId: user.id,
            photoshootId: photoshoot.id,
            productId: product.id,
            provider: "gemini",
            type: "photoshoot",
            status: "queued",
            totalImages: 4,
            completedImages: 0,
            failedImages: 0,
            progress: 0,
          },
        });
      }),
    );

    const results = await Promise.allSettled(
      jobs.map((job) => creditService.reserve(user.id, job.id, 20)),
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    expect(successCount).toBe(2);

    const account = await getTestPrisma().creditAccount.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(account.balance).toBeGreaterThanOrEqual(0);
    expect(account.reserved).toBe(40);
  });

  it("creates one generation job for duplicate requestId under concurrency", async () => {
    const user = await createTestUser();
    await setUserCredits(user.id, 200);
    const product = await createTestProduct(user.id);
    const requestId = randomUUID();
    const config = testPhotoshootConfiguration(["standing"]);

    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }).map(() =>
        generationService.createPhotoshootJob(user.id, {
          productId: product.id,
          configuration: config,
          numberOfImages: 1,
          requestId,
        }),
      ),
    );

    const fulfilled = attempts.filter((a) => a.status === "fulfilled") as PromiseFulfilledResult<{
      jobId: string;
    }>[];
    expect(fulfilled.length).toBeGreaterThan(0);
    const jobIds = new Set(fulfilled.map((a) => a.value.jobId));
    expect(jobIds.size).toBe(1);
  });

  it("allows only one of two simultaneous 100-credit reservations", async () => {
    const user = await createTestUser();
    await setUserCredits(user.id, 100);
    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);
    const prisma = getTestPrisma();

    const [jobA, jobB] = await Promise.all([
      prisma.generationJob.create({
        data: {
          userId: user.id,
          photoshootId: photoshoot.id,
          productId: product.id,
          provider: "gemini",
          type: "photoshoot",
          status: "queued",
          totalImages: 1,
          completedImages: 0,
          failedImages: 0,
          progress: 0,
        },
      }),
      prisma.generationJob.create({
        data: {
          userId: user.id,
          photoshootId: photoshoot.id,
          productId: product.id,
          provider: "gemini",
          type: "photoshoot",
          status: "queued",
          totalImages: 1,
          completedImages: 0,
          failedImages: 0,
          progress: 0,
        },
      }),
    ]);

    const results = await Promise.allSettled([
      creditService.reserve(user.id, jobA.id, 100),
      creditService.reserve(user.id, jobB.id, 100),
    ]);

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    expect(successCount).toBe(1);

    const account = await prisma.creditAccount.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(account.balance).toBeGreaterThanOrEqual(0);
    expect(account.reserved).toBe(100);
  });

  it("allows only one worker to claim a queued job", async () => {
    const user = await createTestUser();
    const product = await createTestProduct(user.id);
    const photoshoot = await createTestPhotoshoot(user.id, product.id);
    const prisma = getTestPrisma();
    await prisma.generationJob.create({
      data: {
        userId: user.id,
        photoshootId: photoshoot.id,
        productId: product.id,
        provider: "gemini",
        type: "photoshoot",
        status: "queued",
        totalImages: 1,
        completedImages: 0,
        failedImages: 0,
        progress: 0,
      },
    });

    const repo = new PostgresGenerationJobRepository();
    const claims = await Promise.all([
      repo.claimNextJob("worker-1"),
      repo.claimNextJob("worker-2"),
      repo.claimNextJob("worker-3"),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);
  });
});
