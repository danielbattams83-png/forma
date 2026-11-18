"use client";

import dynamic from "next/dynamic";

const ModelStage = dynamic(
  () => import("@/components/model-stage").then((mod) => mod.ModelStage),
  { ssr: false },
);

export function FrameStage({ src }: { src: string }) {
  return (
    <div className="h-screen w-screen bg-[#121212]">
      <ModelStage
        src={src}
        interactive={false}
        onReady={() => {
          document.documentElement.dataset.ready = "1";
        }}
      />
    </div>
  );
}
