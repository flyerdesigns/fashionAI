export const VIDEO_TYPE_OPTIONS = [
  {
    id: "fashion_reel" as const,
    title: "Fashion Reel",
    description: "Vertical motion content for Reels and TikTok with editorial energy.",
  },
  {
    id: "product_showcase" as const,
    title: "Product Showcase",
    description: "Highlight garment details with premium product-focused motion.",
  },
  {
    id: "model_walk" as const,
    title: "Model Walk",
    description: "Runway-inspired movement with confident stride and fabric flow.",
  },
  {
    id: "model_pose" as const,
    title: "Model Pose",
    description: "Subtle pose transitions with natural fashion model presence.",
  },
  {
    id: "product_closeup" as const,
    title: "Product Close-up",
    description: "Macro-style focus on texture, stitching, and material quality.",
  },
  {
    id: "cinematic_campaign" as const,
    title: "Cinematic Campaign",
    description: "High-end campaign film with dramatic lighting and camera motion.",
  },
  {
    id: "social_media_ad" as const,
    title: "Social Media Ad",
    description: "Punchy, conversion-ready motion for paid social placements.",
  },
];

export const CAMERA_MOVEMENT_OPTIONS = [
  { id: "static" as const, label: "Static" },
  { id: "slow_zoom_in" as const, label: "Slow Zoom In" },
  { id: "slow_zoom_out" as const, label: "Slow Zoom Out" },
  { id: "push_in" as const, label: "Push In" },
  { id: "pull_out" as const, label: "Pull Out" },
  { id: "pan_left" as const, label: "Pan Left" },
  { id: "pan_right" as const, label: "Pan Right" },
  { id: "orbit" as const, label: "Orbit" },
  { id: "cinematic_handheld" as const, label: "Cinematic Handheld" },
];

export const MOTION_INTENSITY_OPTIONS = [
  { id: "subtle" as const, label: "Subtle" },
  { id: "medium" as const, label: "Medium" },
  { id: "dynamic" as const, label: "Dynamic" },
];

export const VIDEO_STYLE_OPTIONS = [
  { id: "luxury_fashion" as const, label: "Luxury" },
  { id: "editorial" as const, label: "Editorial" },
  { id: "cinematic" as const, label: "Cinematic" },
  { id: "commercial" as const, label: "Commercial" },
  { id: "studio" as const, label: "Studio" },
  { id: "streetwear" as const, label: "Streetwear" },
  { id: "minimal" as const, label: "Minimal" },
  { id: "dramatic" as const, label: "Dramatic" },
];

export const LIGHTING_OPTIONS = [
  { id: "softbox" as const, label: "Softbox" },
  { id: "natural" as const, label: "Natural" },
  { id: "golden_hour" as const, label: "Golden Hour" },
  { id: "studio" as const, label: "Studio" },
  { id: "dramatic" as const, label: "Dramatic" },
  { id: "high_key" as const, label: "High Key" },
  { id: "low_key" as const, label: "Low Key" },
];

export const LENS_OPTIONS = [
  { id: "24mm" as const, label: "24mm" },
  { id: "35mm" as const, label: "35mm" },
  { id: "50mm" as const, label: "50mm" },
  { id: "85mm" as const, label: "85mm" },
  { id: "100mm_macro" as const, label: "100mm Macro" },
];

export const FRAMING_OPTIONS = [
  { id: "full_body" as const, label: "Full Body" },
  { id: "medium" as const, label: "Medium" },
  { id: "close_up" as const, label: "Close Up" },
  { id: "product_detail" as const, label: "Product Detail" },
];

export const ASPECT_RATIO_OPTIONS = [
  { id: "9:16" as const, label: "9:16", hint: "Reels / TikTok / Shorts" },
  { id: "4:5" as const, label: "4:5", hint: "Instagram Feed" },
  { id: "1:1" as const, label: "1:1", hint: "Square" },
  { id: "16:9" as const, label: "16:9", hint: "YouTube / Website" },
];

export const RESOLUTION_OPTIONS = [
  { id: "720p" as const, label: "720p" },
  { id: "1080p" as const, label: "1080p" },
];

export const DURATION_OPTIONS = [
  { id: 5 as const, label: "5 seconds" },
  { id: 10 as const, label: "10 seconds" },
  { id: 15 as const, label: "15 seconds" },
];

export const DEFAULT_VIDEO_CONFIGURATION = {
  videoType: "fashion_reel" as const,
  motion: {
    cameraMovement: "push_in" as const,
    motionIntensity: "subtle" as const,
    modelMovement: true,
    fabricMovement: true,
    naturalBodyMovement: true,
    hairMovement: true,
    backgroundMovement: false,
  },
  style: "luxury_fashion" as const,
  lighting: "softbox" as const,
  camera: {
    lens: "50mm" as const,
    framing: "medium" as const,
  },
  aspectRatio: "9:16" as const,
  resolution: "1080p" as const,
  duration: 5 as const,
};
