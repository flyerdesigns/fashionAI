import { describeIntegration } from "./setup";
import { writeWorkerHeartbeat, getWorkerHealthReport } from "@/lib/workers/heartbeat";
import { getTestPrisma } from "@/lib/test/prisma-client";

describeIntegration("worker heartbeat integration", () => {
  it("records heartbeat updates", async () => {
    await writeWorkerHeartbeat({
      workerName: "generation-worker",
      workerId: "worker-test-1",
      status: "running",
    });

    const report = await getWorkerHealthReport();
    const entry = report.find((r) => r.workerName === "generation-worker");
    expect(entry).toBeDefined();
    expect(entry?.workerId).toBe("worker-test-1");
    expect(entry?.stale).toBe(false);
  });

  it("detects stale workers", async () => {
    const prisma = getTestPrisma();
    const staleTime = new Date(Date.now() - 120_000);
    await prisma.workerHeartbeat.upsert({
      where: { workerName: "video-worker" },
      create: {
        workerName: "video-worker",
        workerId: "stale-worker",
        status: "running",
        lastSeenAt: staleTime,
      },
      update: {
        workerId: "stale-worker",
        status: "running",
        lastSeenAt: staleTime,
      },
    });

    const report = await getWorkerHealthReport();
    const entry = report.find((r) => r.workerName === "video-worker");
    expect(entry?.stale).toBe(true);
  });

  it("tracks multiple workers independently", async () => {
    await writeWorkerHeartbeat({
      workerName: "generation-worker",
      workerId: "gen-1",
      status: "running",
    });
    await writeWorkerHeartbeat({
      workerName: "video-worker",
      workerId: "vid-1",
      status: "running",
    });

    const report = await getWorkerHealthReport();
    expect(report.filter((r) => r.workerName === "generation-worker" || r.workerName === "video-worker").length).toBeGreaterThanOrEqual(2);
  });
});
