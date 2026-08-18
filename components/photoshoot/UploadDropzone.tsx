"use client";

import { useCallback, useRef, useState } from "react";
import { cn, formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { validateUploadedFile } from "@/lib/validation";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_UPLOAD_SIZE_LABEL,
} from "@/lib/mock/constants";
import type { UploadedFile } from "@/types";
import { IconReplace, IconTrash, IconUpload } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/LoadingState";

interface UploadDropzoneProps {
  file: UploadedFile | null;
  onFileSelect: (file: UploadedFile | null) => void;
  className?: string;
}

export function UploadDropzone({ file, onFileSelect, className }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const processFile = useCallback(
    async (selected: File) => {
      setValidating(true);
      setError(null);

      try {
        const result = await validateUploadedFile(selected);
        if (!result.valid) {
          setError(result.error ?? "Invalid image.");
          return;
        }

        const previewUrl = URL.createObjectURL(selected);
        onFileSelect({
          file: selected,
          previewUrl,
          name: selected.name,
          size: selected.size,
          type: selected.type,
          width: result.width,
          height: result.height,
        });
      } catch {
        setError("Unable to validate image. Please try a different file.");
      } finally {
        setValidating(false);
      }
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const dropped = event.dataTransfer.files[0];
      if (dropped) void processFile(dropped);
    },
    [processFile],
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) void processFile(selected);
    event.target.value = "";
  };

  const handleRemove = () => {
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
    onFileSelect(null);
    setError(null);
  };

  if (validating) {
    return (
      <div className={cn("rounded-2xl border border-stone-200 bg-white p-6", className)}>
        <LoadingState message="Validating image…" className="py-12" />
      </div>
    );
  }

  if (file) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-stone-200 bg-white p-6 shadow-sm",
          className,
        )}
      >
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-xl bg-stone-100 sm:w-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.previewUrl}
              alt="Uploaded clothing preview"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-1 flex-col justify-between gap-4">
            <div>
              <h3 className="font-medium text-stone-900">{file.name}</h3>
              <p className="mt-1 text-sm text-stone-500">
                {formatFileSize(file.size)} · {file.type.split("/")[1]?.toUpperCase()}
                {file.width && file.height && (
                  <> · {file.width} × {file.height}px</>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <IconReplace className="h-4 w-4" />
                Replace
              </Button>
              <Button variant="ghost" size="sm" onClick={handleRemove}>
                <IconTrash className="h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={handleInputChange}
          className="sr-only"
          aria-label="Replace uploaded image"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
          isDragging
            ? "border-stone-900 bg-stone-100"
            : "border-stone-200 bg-stone-50/50 hover:border-stone-300 hover:bg-stone-50",
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-stone-500 shadow-sm ring-1 ring-stone-200">
          <IconUpload className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-medium text-stone-900">
          Upload your clothing
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-500">
          Upload a clear photo of your garment to start your AI photoshoot.
        </p>
        <p className="mt-4 text-xs text-stone-400">
          JPG, PNG, WEBP · Max {MAX_UPLOAD_SIZE_LABEL} · Min 512 × 512px
        </p>
        <Button variant="secondary" size="sm" className="mt-6 pointer-events-none">
          Choose file
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleInputChange}
        className="sr-only"
        aria-label="Upload clothing image"
      />
    </div>
  );
}
