"use client";

import { Lock, ShieldCheck } from "lucide-react";
import { cn } from "cn";

type SiteHeaderProps = {
  categories: string[];
  active: string;
  count: number;
  authed: boolean;
  onCategory: (category: string) => void;
  onAdmin: () => void;
};

export function SiteHeader({
  categories,
  active,
  count,
  authed,
  onCategory,
  onAdmin,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-4 py-3 md:gap-8 md:px-6">
        <div className="shrink-0">
          <div className="flex items-baseline gap-2">
            <p className="font-display text-[1.7rem] leading-none tracking-tight text-[#f4f0e8]">Forma</p>
            <p className="font-mono text-[11px] tracking-[0.18em] text-white/40">
              {String(count).padStart(2, "0")}
            </p>
          </div>
          <p className="mt-1 text-[10px] tracking-[0.22em] text-white/45 uppercase">Textured studies</p>
        </div>

        <nav className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label="Categories">
          {["All", ...categories].map((category) => {
            const selected = category === active;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selected}
                onClick={() => onCategory(category)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs tracking-wide transition-colors",
                  selected
                    ? "border-[#f4f0e8] bg-[#f4f0e8] text-[#161410]"
                    : "border-white/10 bg-transparent text-white/70 hover:border-white/25 hover:text-white",
                )}
              >
                {category}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onAdmin}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs text-white/75 transition-colors hover:border-white/30 hover:text-white",
            authed ? "border-[#f4f0e8]/40" : "border-white/10",
          )}
          aria-label={authed ? "Open admin shelf" : "Admin sign in"}
        >
          {authed ? <ShieldCheck className="size-3.5" /> : <Lock className="size-3.5" />}
          <span className="hidden sm:inline">{authed ? "Admin" : "Admin"}</span>
        </button>
      </div>
    </header>
  );
}
