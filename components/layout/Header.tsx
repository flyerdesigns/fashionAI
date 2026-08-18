"use client";

import { IconMenu } from "@/components/ui/icons";

interface HeaderProps {
  title?: string;
  onMenuClick: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, onMenuClick, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-stone-100 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-stone-600 transition-colors hover:bg-stone-100 lg:hidden"
        aria-label="Open navigation menu"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      {title && (
        <h1 className="font-display text-lg font-medium text-stone-900 lg:hidden">
          {title}
        </h1>
      )}

      <div className="ml-auto flex items-center gap-3">{actions}</div>
    </header>
  );
}
