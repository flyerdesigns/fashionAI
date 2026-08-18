/** Standard structured log event names for observability. */
export const LOG_EVENTS = {
  AUTH_SIGNUP: "auth.signup",
  AUTH_LOGIN: "auth.login",
  AUTH_LOGOUT: "auth.logout",

  GENERATION_CREATED: "generation.created",
  GENERATION_STARTED: "generation.started",
  GENERATION_IMAGE_COMPLETED: "generation.image.completed",
  GENERATION_COMPLETED: "generation.completed",
  GENERATION_FAILED: "generation.failed",
  GENERATION_CANCELLED: "generation.cancelled",
  GENERATION_RETRY: "generation.retry",

  VIDEO_CREATED: "video.created",
  VIDEO_STARTED: "video.started",
  VIDEO_COMPLETED: "video.completed",
  VIDEO_FAILED: "video.failed",
  VIDEO_CANCELLED: "video.cancelled",
  VIDEO_RETRY: "video.retry",

  CREDIT_RESERVED: "credit.reserved",
  CREDIT_CONSUMED: "credit.consumed",
  CREDIT_RELEASED: "credit.released",
  CREDIT_RECOVERED: "credit.recovered",

  WORKER_STARTED: "worker.started",
  WORKER_HEARTBEAT: "worker.heartbeat",
  WORKER_JOB_CLAIMED: "worker.job.claimed",
  WORKER_JOB_COMPLETED: "worker.job.completed",
  WORKER_JOB_FAILED: "worker.job.failed",
  WORKER_STOPPED: "worker.stopped",

  STORAGE_UPLOAD: "storage.upload",
  STORAGE_FAILURE: "storage.failure",

  STRIPE_WEBHOOK: "stripe.webhook",
  STRIPE_WEBHOOK_RECEIVED: "stripe.webhook.received",
  STRIPE_WEBHOOK_COMPLETED: "stripe.webhook.completed",
  STRIPE_WEBHOOK_FAILED: "stripe.webhook.failed",

  ADMIN_ACTION: "admin.action",
} as const;

export type LogEventName = (typeof LOG_EVENTS)[keyof typeof LOG_EVENTS];
