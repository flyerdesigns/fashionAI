import type { Photoshoot } from "@/types";

/** Demo photoshoot projects — replace with database queries later */
export const mockRecentPhotoshoots: Photoshoot[] = [
  {
    id: "ps_001",
    name: "Summer Linen Collection",
    thumbnailUrl: "/mock/thumbnails/linen-shirt.svg",
    createdAt: "2026-08-15T10:30:00Z",
    imageCount: 24,
    status: "completed",
  },
  {
    id: "ps_002",
    name: "Evening Silk Dress",
    thumbnailUrl: "/mock/thumbnails/silk-dress.svg",
    createdAt: "2026-08-14T16:45:00Z",
    imageCount: 18,
    status: "completed",
  },
  {
    id: "ps_003",
    name: "Urban Streetwear Drop",
    thumbnailUrl: "/mock/thumbnails/streetwear.svg",
    createdAt: "2026-08-13T09:15:00Z",
    imageCount: 32,
    status: "processing",
  },
  {
    id: "ps_004",
    name: "Bridal Lehenga Preview",
    thumbnailUrl: "/mock/thumbnails/lehenga.svg",
    createdAt: "2026-08-12T14:20:00Z",
    imageCount: 12,
    status: "draft",
  },
  {
    id: "ps_005",
    name: "Classic Tailored Suit",
    thumbnailUrl: "/mock/thumbnails/suit.svg",
    createdAt: "2026-08-10T11:00:00Z",
    imageCount: 20,
    status: "completed",
  },
];
