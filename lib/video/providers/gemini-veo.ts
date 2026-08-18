import { GoogleGenAI, type GenerateVideosOperation } from "@google/genai";
import {
  getGeminiVideoModel,
  getVideoGenerationTimeoutMs,
  getVideoProviderApiKey,
  getVideoProviderPollMs,
} from "@/lib/video/config";
import type {
  VideoGenerationProvider,
  VideoProviderInput,
  VideoProviderStartResult,
  VideoProviderStatusResult,
} from "./types";

const VEO_ASPECT_MAP: Record<string, string> = {
  "9:16": "9:16",
  "16:9": "16:9",
  "1:1": "16:9",
  "4:5": "9:16",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GeminiVeoVideoProvider implements VideoGenerationProvider {
  readonly id = "gemini_veo";
  readonly model: string;
  private client: GoogleGenAI;
  private operations = new Map<string, GenerateVideosOperation>();

  constructor() {
    const apiKey = getVideoProviderApiKey();
    if (!apiKey) {
      throw new Error("Video generation provider is not configured.");
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = getGeminiVideoModel();
  }

  async generateVideo(input: VideoProviderInput): Promise<VideoProviderStartResult> {
    const operation = await this.client.models.generateVideos({
      model: this.model,
      source: {
        prompt: input.prompt,
        image: {
          imageBytes: input.sourceImageBuffer.toString("base64"),
          mimeType: input.sourceMimeType,
        },
      },
      config: {
        numberOfVideos: 1,
        durationSeconds: input.duration,
        aspectRatio: VEO_ASPECT_MAP[input.aspectRatio] ?? "9:16",
        resolution: input.resolution,
        negativePrompt: input.negativePrompt,
      },
    });

    const providerJobId = operation.name ?? crypto.randomUUID();
    this.operations.set(providerJobId, operation);

    if (operation.done) {
      const parsed = await this.parseCompletedOperation(operation);
      return { providerJobId, done: true, ...parsed };
    }

    return { providerJobId, done: false, progress: 10 };
  }

  async getGenerationStatus(providerJobId: string): Promise<VideoProviderStatusResult> {
    let operation = this.operations.get(providerJobId);
    if (!operation) {
      operation = { name: providerJobId, done: false } as GenerateVideosOperation;
    }

    if (!operation.done) {
      operation = await this.client.operations.getVideosOperation({ operation });
      this.operations.set(providerJobId, operation);
    }

    if (!operation.done) {
      return { done: false, progress: 50 };
    }

    if (operation.error) {
      return {
        done: true,
        error: "Video provider returned an error.",
      };
    }

    const parsed = await this.parseCompletedOperation(operation);
    return { done: true, progress: 100, ...parsed };
  }

  async cancelGeneration(providerJobId: string): Promise<void> {
    void providerJobId;
    // Veo long-running operations cannot be cancelled via SDK in this version.
  }

  async generateAndWait(input: VideoProviderInput): Promise<VideoProviderStatusResult> {
    const started = await this.generateVideo(input);
    if (started.done) {
      if (started.error) return { done: true, error: started.error };
      return {
        done: true,
        progress: 100,
        videoBuffer: started.videoBuffer,
        videoMimeType: started.videoMimeType,
      };
    }

    const deadline = Date.now() + getVideoGenerationTimeoutMs();
    while (Date.now() < deadline) {
      const status = await this.getGenerationStatus(started.providerJobId);
      if (status.done) return status;
      await sleep(getVideoProviderPollMs());
    }

    return { done: true, error: "Video generation timed out." };
  }

  private async parseCompletedOperation(
    operation: GenerateVideosOperation,
  ): Promise<Pick<VideoProviderStatusResult, "videoBuffer" | "videoMimeType" | "error">> {
    const generated = operation.response?.generatedVideos?.[0]?.video;
    if (!generated) {
      return { error: "Video provider did not return a video." };
    }

    if (generated.videoBytes) {
      return {
        videoBuffer: Buffer.from(generated.videoBytes, "base64"),
        videoMimeType: generated.mimeType ?? "video/mp4",
      };
    }

    if (generated.uri) {
      const buffer = await this.downloadUri(generated.uri);
      return {
        videoBuffer: buffer,
        videoMimeType: generated.mimeType ?? "video/mp4",
      };
    }

    return { error: "Video provider returned an empty result." };
  }

  private async downloadUri(uri: string): Promise<Buffer> {
    const apiKey = getVideoProviderApiKey();
    const url = uri.includes("?")
      ? `${uri}&key=${apiKey}`
      : `${uri}?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to download generated video (${response.status}).`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}

export function mapGeminiVideoError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("not configured")) {
    return "Video generation provider is not configured.";
  }
  return message;
}
