"use client";

import { cn } from "@/lib/utils";
import type { PoseId } from "@/types";
import { MAX_POSES } from "@/types";
import { POSE_PRESETS } from "@/lib/mock/pose-presets";
import { Button } from "@/components/ui/Button";
import { SelectionCard } from "@/components/photoshoot/SelectionCard";

interface PoseSelectorProps {
  value: PoseId[];
  onChange: (poses: PoseId[]) => void;
}

export function PoseSelector({ value, onChange }: PoseSelectorProps) {
  const togglePose = (poseId: PoseId) => {
    if (value.includes(poseId)) {
      onChange(value.filter((p) => p !== poseId));
    } else if (value.length < MAX_POSES) {
      onChange([...value, poseId]);
    }
  };

  const clearAll = () => onChange([]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-900">
            Select up to {MAX_POSES} poses
          </p>
          <p className="text-sm text-stone-500">
            {value.length} / {MAX_POSES} selected
          </p>
        </div>
        {value.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {POSE_PRESETS.map((pose) => {
          const isSelected = value.includes(pose.id);
          const isDisabled = !isSelected && value.length >= MAX_POSES;

          return (
            <div
              key={pose.id}
              className={cn(isDisabled && "opacity-50 pointer-events-none")}
            >
              <SelectionCard
                name={pose.name}
                description={pose.description}
                previewUrl={pose.previewUrl}
                selected={isSelected}
                badge="Reference"
                aspect="square"
                onClick={() => togglePose(pose.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { SelectionCard as PoseCard } from "@/components/photoshoot/SelectionCard";
