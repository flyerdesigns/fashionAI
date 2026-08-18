/**
 * AI Image Generation Service — provider-independent interface.
 * Real generation is orchestrated server-side via GenerationOrchestrator.
 */

import type { AIClothingReference } from "@/types/clothing";
import type { PhotoshootConfiguration, AspectRatio } from "@/types/photoshoot-config";
import type { StructuredPrompt } from "./prompt-builder";

export type GenerationStatus =
  | "queued"
  | "generating"
  | "completed"
  | "failed"
  | "not-configured";

export interface ImageGenerationRequest {
  clothingReference: AIClothingReference;
  configuration: PhotoshootConfiguration;
  prompt: StructuredPrompt;
  aspectRatio: AspectRatio;
  numberOfImages: number;
}

export interface GenerationResult {
  id: string;
  photoshootId?: string;
  status: GenerationStatus;
  imageUrls: string[];
  provider: string | null;
  error?: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ImageGenerationService {
  generate(request: ImageGenerationRequest): Promise<GenerationResult>;
  getStatus(jobId: string): Promise<GenerationResult>;
}

/** @deprecated Client code should use /api/generate/photoshoot — server-only generation */
export class ImageGenerationServiceStub implements ImageGenerationService {
  async generate(_request: ImageGenerationRequest): Promise<GenerationResult> {
    return {
      id: `gen_stub_${Date.now()}`,
      status: "not-configured",
      imageUrls: [],
      provider: null,
      error: "Use POST /api/generate/photoshoot for image generation.",
      createdAt: new Date().toISOString(),
    };
  }

  async getStatus(jobId: string): Promise<GenerationResult> {
    return {
      id: jobId,
      status: "not-configured",
      imageUrls: [],
      provider: null,
      error: "Use GET /api/photoshoots for generation status.",
      createdAt: new Date().toISOString(),
    };
  }
}

export const imageGenerationService: ImageGenerationService =
  new ImageGenerationServiceStub();
