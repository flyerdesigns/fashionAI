"use client";

import { MAX_CUSTOM_PROMPT_LENGTH } from "@/types";
import { cn } from "@/lib/utils";

interface CustomPromptProps {
  value: string;
  onChange: (value: string) => void;
}

export function CustomPrompt({ value, onChange }: CustomPromptProps) {
  const remaining = MAX_CUSTOM_PROMPT_LENGTH - value.length;
  const isOverLimit = remaining < 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="customPrompt" className="text-sm font-medium text-stone-900">
          Additional Instructions{" "}
          <span className="font-normal text-stone-400">(optional, advanced)</span>
        </label>
        <span
          className={cn(
            "text-xs",
            isOverLimit ? "text-red-600" : "text-stone-400",
          )}
        >
          {value.length} / {MAX_CUSTOM_PROMPT_LENGTH}
        </span>
      </div>
      <textarea
        id="customPrompt"
        value={value}
        onChange={(e) =>
          onChange(e.target.value.slice(0, MAX_CUSTOM_PROMPT_LENGTH))
        }
        rows={4}
        placeholder="Elegant luxury fashion campaign, soft natural lighting, confident pose, premium editorial photography."
        className={cn(
          "w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2",
          isOverLimit
            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
            : "border-stone-200 focus:border-stone-400 focus:ring-stone-200",
        )}
      />
    </div>
  );
}
