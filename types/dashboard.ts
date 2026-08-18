export interface DashboardStats {
  totalPhotos: number;
  totalVideos: number;
  products: number;
  creditsRemaining: number;
  /** Indicates data is placeholder until DB is connected */
  isMock: true;
}

export interface QuickCreateOption {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: "product" | "model" | "campaign" | "video";
}
