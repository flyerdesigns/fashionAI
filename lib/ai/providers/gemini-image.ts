import { GoogleGenAI } from "@google/genai";
import { getImageProviderConfig, assertGeminiConfigured } from "@/lib/ai/config";
import type { ImageGenerationProvider, ProviderImageInput, ProviderImageResult } from "./types";
import { GEMINI_ASPECT_MAP } from "./types";

export class GeminiImageProvider implements ImageGenerationProvider {
  readonly id = "gemini";
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    assertGeminiConfigured();
    const config = getImageProviderConfig();
    this.client = new GoogleGenAI({ apiKey: config.geminiApiKey });
    this.model = config.geminiModel;
  }

  async generateImage(input: ProviderImageInput): Promise<ProviderImageResult> {
    const aspectRatio = GEMINI_ASPECT_MAP[input.aspectRatio] ?? "4:5";

    const interaction = await this.client.interactions.create({
      model: this.model,
      input: [
        { type: "text", text: input.prompt },
        {
          type: "image",
          mime_type: input.clothingMimeType,
          data: input.clothingImageBase64,
        },
      ],
      response_format: {
        type: "image",
        aspect_ratio: aspectRatio,
        image_size: "2K",
      },
    });

    const imageData = interaction.output_image?.data;
    if (!imageData) {
      throw new GeminiProviderError(
        "Gemini did not return an image. The model may have rejected the request.",
      );
    }

    return {
      imageBuffer: Buffer.from(imageData, "base64"),
      mimeType: "image/png",
      provider: this.id,
      model: this.model,
    };
  }
}

export class GeminiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiProviderError";
  }
}

export function mapGeminiError(error: unknown): string {
  if (error instanceof GeminiProviderError) return error.message;

  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("api key") || lower.includes("api_key") || lower.includes("unauthorized")) {
    return "AI generation is not configured. Please set GEMINI_API_KEY.";
  }
  if (lower.includes("rate") || lower.includes("quota") || lower.includes("429")) {
    return "AI generation rate limit reached. Please try again shortly.";
  }
  if (lower.includes("timeout") || lower.includes("deadline")) {
    return "AI generation timed out. Please try again.";
  }

  return "Something went wrong while generating your photoshoot. Please try again.";
}
