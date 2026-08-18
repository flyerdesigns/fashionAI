import type { StyleCategory, StyleId } from "@/types/photoshoot-config";

export interface StylePreset {
  id: StyleId;
  name: string;
  description: string;
  category: StyleCategory;
  previewUrl: string;
}

export const STYLE_CATEGORIES: { value: StyleCategory; label: string }[] = [
  { value: "studio", label: "Studio" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "luxury", label: "Luxury" },
  { value: "indian-ethnic", label: "Indian / Ethnic" },
];

export const STYLE_PRESETS: StylePreset[] = [
  { id: "clean-white-studio", name: "Clean White Studio", description: "Bright seamless white backdrop", category: "studio", previewUrl: "/mock/photoshoot/styles/clean-white.svg" },
  { id: "dark-luxury-studio", name: "Dark Luxury Studio", description: "Moody dark studio atmosphere", category: "studio", previewUrl: "/mock/photoshoot/styles/dark-luxury.svg" },
  { id: "minimal-studio", name: "Minimal Studio", description: "Clean minimal studio setup", category: "studio", previewUrl: "/mock/photoshoot/styles/minimal.svg" },
  { id: "fashion-editorial", name: "Fashion Editorial", description: "High-fashion editorial aesthetic", category: "studio", previewUrl: "/mock/photoshoot/styles/editorial.svg" },
  { id: "cafe", name: "Café", description: "Warm café lifestyle setting", category: "lifestyle", previewUrl: "/mock/photoshoot/styles/cafe.svg" },
  { id: "street", name: "Street", description: "Urban street fashion vibe", category: "lifestyle", previewUrl: "/mock/photoshoot/styles/street.svg" },
  { id: "home", name: "Home", description: "Cozy home interior setting", category: "lifestyle", previewUrl: "/mock/photoshoot/styles/home.svg" },
  { id: "office", name: "Office", description: "Modern professional workspace", category: "lifestyle", previewUrl: "/mock/photoshoot/styles/office.svg" },
  { id: "beach", name: "Beach", description: "Coastal beach lifestyle scene", category: "lifestyle", previewUrl: "/mock/photoshoot/styles/beach.svg" },
  { id: "hotel", name: "Hotel", description: "Upscale hotel interior", category: "lifestyle", previewUrl: "/mock/photoshoot/styles/hotel.svg" },
  { id: "luxury-hotel", name: "Luxury Hotel", description: "Opulent luxury hotel setting", category: "luxury", previewUrl: "/mock/photoshoot/styles/luxury-hotel.svg" },
  { id: "designer-campaign", name: "Designer Campaign", description: "Premium designer campaign look", category: "luxury", previewUrl: "/mock/photoshoot/styles/designer.svg" },
  { id: "high-fashion-editorial", name: "High Fashion Editorial", description: "Avant-garde editorial campaign", category: "luxury", previewUrl: "/mock/photoshoot/styles/high-fashion.svg" },
  { id: "runway-inspired", name: "Runway Inspired", description: "Runway show inspired aesthetic", category: "luxury", previewUrl: "/mock/photoshoot/styles/runway.svg" },
  { id: "royal-palace", name: "Royal Palace", description: "Grand royal palace backdrop", category: "indian-ethnic", previewUrl: "/mock/photoshoot/styles/palace.svg" },
  { id: "wedding", name: "Wedding", description: "Elegant wedding celebration setting", category: "indian-ethnic", previewUrl: "/mock/photoshoot/styles/wedding.svg" },
  { id: "festive", name: "Festive", description: "Vibrant festive celebration", category: "indian-ethnic", previewUrl: "/mock/photoshoot/styles/festive.svg" },
  { id: "diwali", name: "Diwali", description: "Warm Diwali festival ambiance", category: "indian-ethnic", previewUrl: "/mock/photoshoot/styles/diwali.svg" },
  { id: "traditional-indian", name: "Traditional Indian", description: "Classic traditional Indian setting", category: "indian-ethnic", previewUrl: "/mock/photoshoot/styles/traditional.svg" },
];

export function getStylePreset(id: StyleId): StylePreset | undefined {
  return STYLE_PRESETS.find((s) => s.id === id);
}

export function getStyleLabel(id: StyleId): string {
  return getStylePreset(id)?.name ?? id;
}

export function getStylesByCategory(category: StyleCategory): StylePreset[] {
  return STYLE_PRESETS.filter((s) => s.category === category);
}
