import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-stone-400 shadow-sm ring-1 ring-stone-200">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-medium text-stone-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
