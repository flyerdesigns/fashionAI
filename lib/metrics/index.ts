type MetricLabels = Record<string, string | number | boolean | undefined>;

interface Counter {
  inc(labels?: MetricLabels, value?: number): void;
}

interface Histogram {
  observe(labels: MetricLabels, valueMs: number): void;
}

class InMemoryCounter implements Counter {
  values = new Map<string, number>();

  inc(labels: MetricLabels = {}, value = 1): void {
    const key = JSON.stringify(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + value);
  }

  getTotal(labels: MetricLabels = {}): number {
    return this.values.get(JSON.stringify(labels)) ?? 0;
  }
}

class InMemoryHistogram implements Histogram {
  observations: Array<{ labels: MetricLabels; valueMs: number }> = [];

  observe(labels: MetricLabels, valueMs: number): void {
    this.observations.push({ labels, valueMs });
  }
}

export const metrics = {
  authSignupTotal: new InMemoryCounter(),
  authLoginSuccessTotal: new InMemoryCounter(),
  authLoginFailureTotal: new InMemoryCounter(),

  generationCreatedTotal: new InMemoryCounter(),
  generationSuccessTotal: new InMemoryCounter(),
  generationFailureTotal: new InMemoryCounter(),
  generationCancelledTotal: new InMemoryCounter(),
  generationRetryTotal: new InMemoryCounter(),
  generationDuration: new InMemoryHistogram(),

  videoCreatedTotal: new InMemoryCounter(),
  videoSuccessTotal: new InMemoryCounter(),
  videoFailureTotal: new InMemoryCounter(),
  videoCancelledTotal: new InMemoryCounter(),
  videoRetryTotal: new InMemoryCounter(),
  videoDuration: new InMemoryHistogram(),

  creditReservationTotal: new InMemoryCounter(),
  creditConsumptionTotal: new InMemoryCounter(),
  creditRefundTotal: new InMemoryCounter(),
  creditRecoveredTotal: new InMemoryCounter(),

  stripeWebhookTotal: new InMemoryCounter(),
  stripeWebhookSuccessTotal: new InMemoryCounter(),
  stripeWebhookFailureTotal: new InMemoryCounter(),
  stripeCreditGrantTotal: new InMemoryCounter(),

  workerJobsClaimedTotal: new InMemoryCounter(),
  workerJobsCompletedTotal: new InMemoryCounter(),
  workerJobsFailedTotal: new InMemoryCounter(),
  workerJobsRetriedTotal: new InMemoryCounter(),
  workerJobDuration: new InMemoryHistogram(),
  workerHeartbeatTotal: new InMemoryCounter(),
  workerJobsProcessed: new InMemoryCounter(),
  workerJobsFailed: new InMemoryCounter(),

  storageUploadTotal: new InMemoryCounter(),
  storageUploadFailureTotal: new InMemoryCounter(),
  storageReadTotal: new InMemoryCounter(),
  storageDeleteTotal: new InMemoryCounter(),
};

export function resetMetricsForTests(): void {
  for (const counter of Object.values(metrics)) {
    if (counter instanceof InMemoryCounter) counter.values.clear();
    if (counter instanceof InMemoryHistogram) counter.observations = [];
  }
}

export type { Counter, Histogram, MetricLabels };
