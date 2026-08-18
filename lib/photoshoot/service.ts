import { productService } from "@/lib/products";
import { photoshootRepository } from "@/lib/photoshoot/repository";
import { creditService } from "@/lib/credits";
import { isPostgresEnabled } from "@/lib/db/config";
import { videoService } from "@/lib/video/service";

export interface DashboardStatsData {
  totalPhotos: number;
  totalVideos: number;
  products: number;
  photoshoots: number;
  creditsRemaining: number;
  isLive: true;
}

export class PhotoshootService {
  async listPhotoshoots(userId: string) {
    return photoshootRepository.findAllByUserId(userId);
  }

  async getPhotoshootForUser(id: string, userId: string) {
    return photoshootRepository.findByIdForUser(id, userId);
  }

  async getDashboardStats(userId: string): Promise<DashboardStatsData> {
    const [products, photoshoots] = await Promise.all([
      productService.listProducts(userId),
      photoshootRepository.findAllByUserId(userId),
    ]);

    const totalPhotos = photoshoots.reduce((sum, ps) => sum + ps.images.length, 0);
    const totalVideos = isPostgresEnabled()
      ? await videoService.countVideosForUser(userId)
      : 0;
    const creditsRemaining = isPostgresEnabled()
      ? (await creditService.getBalance(userId)).available
      : 0;

    return {
      totalPhotos,
      totalVideos,
      products: products.length,
      photoshoots: photoshoots.length,
      creditsRemaining,
      isLive: true,
    };
  }

  toPhotoshootSummary(record: Awaited<ReturnType<typeof photoshootRepository.findByIdForUser>>) {
    if (!record) return null;
    return {
      id: record.id,
      name: record.productName,
      thumbnailUrl: record.images[0]?.imageUrl ?? record.clothingThumbnailUrl,
      createdAt: record.createdAt,
      imageCount: record.images.length,
      status: record.status,
    };
  }
}

export const photoshootService = new PhotoshootService();

export { ProductServiceError } from "@/lib/products";
