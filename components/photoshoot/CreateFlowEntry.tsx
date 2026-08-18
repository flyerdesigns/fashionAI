"use client";

import { IconShirt, IconUpload } from "@/components/ui/icons";

interface CreateFlowEntryProps {
  onUploadNew: () => void;
  onChooseExisting: () => void;
}

export function CreateFlowEntry({ onUploadNew, onChooseExisting }: CreateFlowEntryProps) {
  return (
    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={onUploadNew}
        className="group flex flex-col items-start rounded-2xl border border-stone-200 bg-white p-8 text-left shadow-sm transition-all hover:border-stone-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-700 transition-colors group-hover:bg-stone-900 group-hover:text-white">
          <IconUpload className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-medium text-stone-900">
          Upload a new clothing item
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Add a new garment to your library and prepare it for an AI photoshoot.
        </p>
        <span className="mt-6 inline-flex h-9 items-center justify-center rounded-xl bg-stone-100 px-3.5 text-sm font-medium text-stone-900 transition-colors group-hover:bg-stone-200">
          Start upload
        </span>
      </button>

      <button
        type="button"
        onClick={onChooseExisting}
        className="group flex flex-col items-start rounded-2xl border border-stone-200 bg-white p-8 text-left shadow-sm transition-all hover:border-stone-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-700 transition-colors group-hover:bg-stone-900 group-hover:text-white">
          <IconShirt className="h-6 w-6" />
        </div>
        <h3 className="font-display text-xl font-medium text-stone-900">
          Choose from My Products
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Select an existing clothing asset and jump straight into photoshoot setup.
        </p>
        <span className="mt-6 inline-flex h-9 items-center justify-center rounded-xl bg-stone-100 px-3.5 text-sm font-medium text-stone-900 transition-colors group-hover:bg-stone-200">
          Browse products
        </span>
      </button>
    </div>
  );
}
