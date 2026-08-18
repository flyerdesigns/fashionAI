/** @deprecated Use @/lib/generation/client instead */
export {
  startPhotoshootGeneration as generatePhotoshootStream,
  startRegenerateJob as regenerateImage,
  fetchJobStatus,
  pollJobStatus,
  cancelGenerationJob,
  retryFailedImages,
  createRequestId,
  getProgressMessage,
} from "@/lib/generation/client";

export type { StartGenerationPayload as GeneratePhotoshootPayload } from "@/lib/generation/client";
