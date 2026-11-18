"use client";

import { Button } from "@/components/ui/button";

export default function GalleryError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0a0a0a] px-6 text-center text-[#f4f0e8]">
      <div>
        <p className="font-display text-4xl">The shelf stumbled.</p>
        <p className="mt-2 text-sm text-white/55">The gallery could not be read. Try it once more.</p>
        <Button type="button" className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
