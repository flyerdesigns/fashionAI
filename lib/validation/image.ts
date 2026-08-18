import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_SIZE_BYTES,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
} from "@/lib/mock/constants";

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
}

export interface ImageValidationOptions {
  minWidth?: number;
  minHeight?: number;
  maxSizeBytes?: number;
}

const DEFAULT_OPTIONS: Required<ImageValidationOptions> = {
  minWidth: MIN_IMAGE_WIDTH,
  minHeight: MIN_IMAGE_HEIGHT,
  maxSizeBytes: MAX_UPLOAD_SIZE_BYTES,
};

export function validateMimeType(mimeType: string): ImageValidationResult {
  if (!ACCEPTED_IMAGE_TYPES.includes(mimeType as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload a JPG, PNG, or WEBP image.",
    };
  }
  return { valid: true };
}

export function validateFileSize(
  size: number,
  maxSizeBytes = MAX_UPLOAD_SIZE_BYTES,
): ImageValidationResult {
  if (size <= 0) {
    return { valid: false, error: "The selected file appears to be empty." };
  }
  if (size > maxSizeBytes) {
    return {
      valid: false,
      error: `File is too large. Maximum allowed size is ${Math.round(maxSizeBytes / (1024 * 1024))} MB.`,
    };
  }
  return { valid: true };
}

export function validateDimensions(
  width: number,
  height: number,
  minWidth = MIN_IMAGE_WIDTH,
  minHeight = MIN_IMAGE_HEIGHT,
): ImageValidationResult {
  if (width < minWidth || height < minHeight) {
    return {
      valid: false,
      error: `Image resolution is too low. Please upload an image with at least ${minWidth} × ${minHeight} pixels.`,
      width,
      height,
    };
  }
  return { valid: true, width, height };
}

export function validateImageMetadata(
  mimeType: string,
  size: number,
  width: number,
  height: number,
  options: ImageValidationOptions = {},
): ImageValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const mimeResult = validateMimeType(mimeType);
  if (!mimeResult.valid) return mimeResult;

  const sizeResult = validateFileSize(size, opts.maxSizeBytes);
  if (!sizeResult.valid) return sizeResult;

  const dimResult = validateDimensions(width, height, opts.minWidth, opts.minHeight);
  if (!dimResult.valid) return dimResult;

  return { valid: true, width, height };
}

/** Client-side: load image dimensions from a File */
export function getImageDimensionsFromFile(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image. The file may be corrupted."));
    };

    img.src = url;
  });
}

/** Client-side full validation for uploaded files */
export async function validateUploadedFile(
  file: File,
  options: ImageValidationOptions = {},
): Promise<ImageValidationResult> {
  const mimeResult = validateMimeType(file.type);
  if (!mimeResult.valid) return mimeResult;

  const sizeResult = validateFileSize(file.size, options.maxSizeBytes ?? MAX_UPLOAD_SIZE_BYTES);
  if (!sizeResult.valid) return sizeResult;

  try {
    const { width, height } = await getImageDimensionsFromFile(file);
    return validateImageMetadata(file.type, file.size, width, height, options);
  } catch {
    return {
      valid: false,
      error: "Unable to read image. Please try a different file.",
    };
  }
}
