"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDrawer } from "@/components/admin-drawer";
import { BentoCard } from "@/components/bento-card";
import { LoginDialog } from "@/components/login-dialog";
import { SiteHeader } from "@/components/site-header";
import { ViewerModal } from "@/components/viewer-modal";
import type { EnvironmentName } from "@/lib/lighting";
import type { ModelRecord } from "@/lib/types";

export function GalleryApp({ initialModels }: { initialModels: ModelRecord[] }) {
  const router = useRouter();
  const [models, setModels] = useState(initialModels);
  const [category, setCategory] = useState("All");
  const [active, setActive] = useState<ModelRecord | null>(null);
  const [env, setEnv] = useState<EnvironmentName>("studio");
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [finePointer, setFinePointer] = useState(false);
  const armTimer = useRef<number | null>(null);

  useEffect(() => {
    setModels(initialModels);
  }, [initialModels]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => {
      setAutoRotate(!motion.matches);
      setFinePointer(pointer.matches);
    };
    sync();
    motion.addEventListener("change", sync);
    pointer.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      pointer.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((body: { authenticated?: boolean }) => setAuthed(Boolean(body.authenticated)))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    const locked = Boolean(active || adminOpen || loginOpen);
    const previous = document.body.style.overflow;
    if (locked) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active, adminOpen, loginOpen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (active) {
        setActive(null);
        return;
      }
      if (adminOpen) setAdminOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, adminOpen]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const model of models) {
      if (!seen.has(model.category)) {
        seen.add(model.category);
        list.push(model.category);
      }
    }
    return list;
  }, [models]);

  const visible = category === "All" ? models : models.filter((model) => model.category === category);

  function commit(next: ModelRecord[]) {
    setModels(next);
    router.refresh();
  }

  function arm(id: string) {
    if (!finePointer || active) return;
    const model = models.find((item) => item.id === id);
    if (model) {
      void import("@/components/model-stage").then((mod) => mod.preloadModel(model.src));
    }
    if (armTimer.current) window.clearTimeout(armTimer.current);
    armTimer.current = window.setTimeout(() => setLiveId(id), 220);
  }

  function disarm(id: string) {
    if (armTimer.current) window.clearTimeout(armTimer.current);
    setLiveId((current) => (current === id ? null : current));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    setAdminOpen(false);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader
        categories={categories}
        active={category}
        count={models.length}
        authed={authed}
        onCategory={setCategory}
        onAdmin={() => {
          if (authed) setAdminOpen(true);
          else setLoginOpen(true);
        }}
      />

      <main className="mx-auto max-w-[1440px] px-4 py-5 md:px-6 md:py-7">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#171717] px-6 py-16 text-center">
            <p className="font-display text-3xl text-[#f4f0e8]">Nothing in {category}.</p>
            <p className="mt-2 text-sm text-white/50">Try another filter, or add a study from the admin shelf.</p>
          </div>
        ) : (
          <div className="grid auto-rows-[168px] grid-cols-2 gap-3 sm:auto-rows-[200px] md:grid-cols-4 lg:auto-rows-[232px]">
            {visible.map((model) => (
              <BentoCard
                key={model.id}
                model={model}
                live={finePointer && liveId === model.id && !active}
                autoRotate={autoRotate}
                onOpen={(next) => {
                  setLiveId(null);
                  setActive(next);
                }}
                onArm={arm}
                onDisarm={disarm}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[1440px] px-4 pt-4 pb-10 text-xs leading-relaxed text-white/35 md:px-6">
        Forma is a shelf for textured models. The studies on first load are CC0 and CC BY — the author sits in each credit line.
        Studio, outdoor, and dark light use Poly Haven HDRIs, also CC0.
      </footer>

      {active ? (
        <ViewerModal
          model={active}
          env={env}
          wireframe={wireframe}
          autoRotate={autoRotate}
          resetSignal={resetSignal}
          onEnv={setEnv}
          onWireframe={setWireframe}
          onAutoRotate={setAutoRotate}
          onReset={() => setResetSignal((value) => value + 1)}
          onClose={() => setActive(null)}
        />
      ) : null}

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onSuccess={() => {
          setAuthed(true);
          setLoginOpen(false);
          setAdminOpen(true);
        }}
      />

      <AdminDrawer
        open={adminOpen}
        models={models}
        onClose={() => setAdminOpen(false)}
        onModels={commit}
        onCreated={(model) => commit([...models, model])}
        onLogout={() => void logout()}
      />
    </div>
  );
}
