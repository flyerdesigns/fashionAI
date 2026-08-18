import { cn } from "@/lib/utils";
import { IconSparkles } from "@/components/ui/icons";

interface SelectionCardProps {
  name: string;
  description?: string;
  previewUrl?: string;
  selected?: boolean;
  onClick: () => void;
  badge?: string;
  aspect?: "square" | "portrait";
}

export function SelectionCard({
  name,
  description,
  previewUrl,
  selected,
  onClick,
  badge,
  aspect = "portrait",
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
        selected
          ? "border-stone-900 ring-2 ring-stone-900 ring-offset-2"
          : "border-stone-200 hover:border-stone-300 hover:shadow-md",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-stone-100",
          aspect === "square" ? "aspect-square" : "aspect-[3/4]",
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300">
            <IconSparkles className="h-8 w-8" />
          </div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-stone-500">
            {badge}
          </span>
        )}
        {selected && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-white shadow-sm">
            ✓
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-medium text-stone-900">{name}</p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-stone-500 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </button>
  );
}
