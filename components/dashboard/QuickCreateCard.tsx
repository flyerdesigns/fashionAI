import Link from "next/link";
import { cn } from "@/lib/utils";
import type { QuickCreateOption } from "@/types";
import {
  IconCampaign,
  IconModel,
  IconShirt,
  IconVideo,
} from "@/components/ui/icons";

const iconMap = {
  product: IconShirt,
  model: IconModel,
  campaign: IconCampaign,
  video: IconVideo,
};

interface QuickCreateCardProps {
  option: QuickCreateOption;
}

export function QuickCreateCard({ option }: QuickCreateCardProps) {
  const Icon = iconMap[option.icon];

  return (
    <Link
      href={option.href}
      className={cn(
        "group flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm",
        "transition-all hover:border-stone-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700 transition-colors group-hover:bg-stone-900 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-medium text-stone-900">
        {option.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-500">
        {option.description}
      </p>
    </Link>
  );
}
