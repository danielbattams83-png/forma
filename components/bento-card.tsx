"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { cn } from "cn";
import type { ModelRecord } from "@/lib/types";

const ModelStage = dynamic(
  () => import("@/components/model-stage").then((mod) => mod.ModelStage),
  { ssr: false },
);

const spanClass = {
  "1x1": "col-span-1 row-span-1",
  "2x1": "col-span-2 row-span-1",
  "2x2": "col-span-2 row-span-2",
} as const;

type BentoCardProps = {
  model: ModelRecord;
  live: boolean;
  autoRotate: boolean;
  onOpen: (model: ModelRecord) => void;
  onArm: (id: string) => void;
  onDisarm: (id: string) => void;
};

export function BentoCard({ model, live, autoRotate, onOpen, onArm, onDisarm }: BentoCardProps) {
  const [previewReady, setPreviewReady] = useState(false);
  const featured = model.span !== "1x1";

  return (
    <button
      type="button"
      onClick={() => onOpen(model)}
      onMouseEnter={() => onArm(model.id)}
      onMouseLeave={() => {
        setPreviewReady(false);
        onDisarm(model.id);
      }}
      onFocus={() => onArm(model.id)}
      onBlur={() => {
        setPreviewReady(false);
        onDisarm(model.id);
      }}
      className={cn(
        "bento-card group relative overflow-hidden rounded-2xl text-left",
        spanClass[model.span],
      )}
      aria-label={`${model.title}, open 3D viewer`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={model.thumbnail}
        alt=""
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
          live && previewReady ? "opacity-0" : "opacity-100",
        )}
      />
      {live ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            previewReady ? "opacity-100" : "opacity-0",
          )}
        >
          <ModelStage
            src={model.src}
            autoRotate={autoRotate}
            interactive={false}
            onReady={() => setPreviewReady(true)}
          />
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 md:p-4">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.18em] text-white/60 uppercase">{model.category}</p>
          <h2
            className={cn(
              "mt-1 truncate text-white",
              featured ? "font-display text-2xl leading-none md:text-[1.75rem]" : "text-sm font-medium",
            )}
          >
            {model.title}
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-white/25 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.16em] text-white/80">
          3D
        </span>
      </div>
    </button>
  );
}
