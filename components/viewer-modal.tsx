"use client";

import dynamic from "next/dynamic";
import { Box, CloudSun, Moon, RotateCcw, RotateCw, Sun, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "cn";
import { ENVIRONMENT_NAMES, type EnvironmentName } from "@/lib/lighting";
import { formatCount, type ModelRecord } from "@/lib/types";

const ModelStage = dynamic(
  () => import("@/components/model-stage").then((mod) => mod.ModelStage),
  { ssr: false },
);

type ViewerModalProps = {
  model: ModelRecord;
  env: EnvironmentName;
  wireframe: boolean;
  autoRotate: boolean;
  resetSignal: number;
  onEnv: (env: EnvironmentName) => void;
  onWireframe: (value: boolean) => void;
  onAutoRotate: (value: boolean) => void;
  onReset: () => void;
  onClose: () => void;
};

const envIcon = {
  studio: Sun,
  outdoor: CloudSun,
  dark: Moon,
} as const;

export function ViewerModal({
  model,
  env,
  wireframe,
  autoRotate,
  resetSignal,
  onEnv,
  onWireframe,
  onAutoRotate,
  onReset,
  onClose,
}: ViewerModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [model.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4 md:p-6" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        aria-label="Close viewer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-title"
        className="viewer-rise relative flex h-[min(920px,100%)] w-full max-w-[1180px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-[0_30px_80px_rgba(0,0,0,0.55)] md:flex-row"
      >
        <div className="relative min-h-[48vh] flex-1 md:min-h-0">
          <ModelStage
            src={model.src}
            env={env}
            wireframe={wireframe}
            autoRotate={autoRotate}
            animate
            resetSignal={resetSignal}
          />
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/55 p-1 backdrop-blur">
              <IconButton label="Reset camera" pressed={false} onClick={onReset}>
                <RotateCcw />
              </IconButton>
              <IconButton label="Auto rotate" pressed={autoRotate} onClick={() => onAutoRotate(!autoRotate)}>
                <RotateCw />
              </IconButton>
              <IconButton label="Wireframe" pressed={wireframe} onClick={() => onWireframe(!wireframe)}>
                <Box />
              </IconButton>
            </div>
            <div className="pointer-events-auto flex rounded-full border border-white/10 bg-black/55 p-0.5 backdrop-blur">
              {ENVIRONMENT_NAMES.map((name) => {
                const Icon = envIcon[name];
                const label = name === "studio" ? "Studio" : name === "outdoor" ? "Outdoor" : "Dark";
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={env === name}
                    onClick={() => onEnv(name)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs",
                      env === name ? "bg-[#f4f0e8] text-[#161410]" : "text-white/75 hover:text-white",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="pointer-events-none hidden text-[11px] text-white/45 lg:block">
              Drag to orbit · Scroll to zoom · Right-drag to pan
            </p>
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col border-t border-white/10 md:w-[320px] md:border-t-0 md:border-l">
          <div className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-white/50 uppercase">{model.category}</p>
              <h2 id="viewer-title" className="font-display mt-2 text-4xl leading-none text-[#f4f0e8]">
                {model.title}
              </h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 p-2 text-white/70 hover:border-white/30 hover:text-white"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="px-5 text-sm leading-relaxed text-white/70">{model.description}</p>
          <dl className="mt-auto space-y-3 border-t border-white/10 px-5 py-4 text-xs text-white/55">
            <div className="flex items-baseline justify-between gap-4">
              <dt>Triangles</dt>
              <dd className="font-mono text-white/80">{formatCount(model.polycount)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt>Grid</dt>
              <dd className="font-mono text-white/80">{model.span}</dd>
            </div>
            {model.notes ? (
              <div>
                <dt className="text-white/40">Credit</dt>
                <dd className="mt-1 leading-relaxed text-white/70">{model.notes}</dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function IconButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className={cn(
        "rounded-full p-2 [&_svg]:size-3.5",
        pressed ? "bg-[#f4f0e8] text-[#161410]" : "text-white/80 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}
