import type { QuickCreateOption } from "@/types";

export const mockQuickCreateOptions: QuickCreateOption[] = [
  {
    id: "product-photoshoot",
    title: "Product Photoshoot",
    description: "Studio-quality shots for your catalog",
    href: "/create",
    icon: "product",
  },
  {
    id: "ai-model-photoshoot",
    title: "AI Model Photoshoot",
    description: "Dress AI models in your garments",
    href: "/create",
    icon: "model",
  },
  {
    id: "fashion-campaign",
    title: "Fashion Campaign",
    description: "Editorial-style campaign visuals",
    href: "/create",
    icon: "campaign",
  },
  {
    id: "fashion-video",
    title: "Fashion Video",
    description: "Short-form runway and lookbook clips",
    href: "/videos/create",
    icon: "video",
  },
];
