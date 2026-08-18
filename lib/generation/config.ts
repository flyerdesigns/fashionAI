export function getGenerationConfig() {
  return {
    imageTimeoutMs: Number(process.env.GENERATION_IMAGE_TIMEOUT_MS ?? 120_000),
    workerPollIntervalMs: Number(process.env.GENERATION_WORKER_POLL_MS ?? 2_000),
    maxConcurrency: Number(process.env.GENERATION_MAX_CONCURRENCY ?? 1),
  };
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}
