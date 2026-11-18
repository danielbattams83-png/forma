"use client";

import dynamic from "next/dynamic";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImagePlus,
  LogOut,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ModelStageHandle } from "@/components/model-stage";
import { SPANS, formatCount, type ModelRecord, type Span } from "@/lib/types";
import { cn } from "cn";

const ModelStage = dynamic(
  () => import("@/components/model-stage").then((mod) => mod.ModelStage),
  { ssr: false },
);

type AdminDrawerProps = {
  open: boolean;
  models: ModelRecord[];
  onClose: () => void;
  onModels: (models: ModelRecord[]) => void;
  onCreated: (model: ModelRecord) => void;
  onLogout: () => void;
};

export function AdminDrawer({ open, models, onClose, onModels, onCreated, onLogout }: AdminDrawerProps) {
  const [tab, setTab] = useState<"add" | "library">("add");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-label="Close admin" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
        className="admin-rise relative flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-[#101010]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-white/45 uppercase">Studio</p>
            <h2 id="admin-title" className="font-display mt-1 text-3xl leading-none text-[#f4f0e8]">
              Admin
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/70 hover:text-white"
            aria-label="Close admin"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-4">
          {(["add", "library"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={tab === item}
              onClick={() => setTab(item)}
              className={cn(
                "rounded-full px-3 py-1 text-xs",
                tab === item ? "bg-[#f4f0e8] text-[#161410]" : "text-white/65 hover:text-white",
              )}
            >
              {item === "add" ? "Add model" : "Library"}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {tab === "add" ? (
            <AddModelForm
              onCreated={(model) => {
                onCreated(model);
                setTab("library");
              }}
            />
          ) : (
            <Library models={models} onModels={onModels} />
          )}
        </div>

        <div className="border-t border-white/10 p-4">
          <Button type="button" variant="outline" className="w-full" onClick={onLogout}>
            <LogOut />
            Log out
          </Button>
        </div>
      </aside>
    </div>
  );
}

function AddModelForm({ onCreated }: { onCreated: (model: ModelRecord) => void }) {
  const stageRef = useRef<ModelStageHandle>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [span, setSpan] = useState<Span>("1x1");
  const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [customThumb, setCustomThumb] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const capturedFor = useRef("");
  const titleRef = useRef(title);
  titleRef.current = title;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setThumbBlob(null);
    setThumbUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setCustomThumb(false);
    capturedFor.current = "";
    if (!titleRef.current) {
      setTitle(file.name.replace(/\.(glb|gltf)$/i, "").replace(/[-_]+/g, " "));
    }
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function capture() {
    const blob = await stageRef.current?.capture();
    if (!blob) return;
    setThumbBlob(blob);
    setThumbUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(blob);
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || !thumbBlob) {
      setError("Add a model and keep a thumbnail frame.");
      return;
    }
    setPending(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("thumbnail", new File([thumbBlob], "thumbnail.jpg", { type: thumbBlob.type || "image/jpeg" }));
    body.set("title", title);
    body.set("category", category);
    body.set("description", description);
    body.set("notes", notes);
    body.set("span", span);
    try {
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as ModelRecord & { error?: string };
      if (!response.ok) {
        setError(payload.error || "Could not add the model.");
        return;
      }
      setFile(null);
      setTitle("");
      setCategory("");
      setDescription("");
      setNotes("");
      setSpan("1x1");
      setThumbBlob(null);
      onCreated(payload);
    } catch {
      setError("Could not upload the model.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid cursor-pointer gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-3 text-sm text-white/70 hover:border-white/30">
        <span className="text-[10px] tracking-[0.16em] text-white/45 uppercase">Model</span>
        <span className="truncate">{file ? file.name : "Choose a .glb or .gltf"}</span>
        <input
          type="file"
          accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <div className="relative h-52 overflow-hidden rounded-xl border border-white/10 bg-black">
        {previewUrl ? (
          <ModelStage
            ref={stageRef}
            src={previewUrl}
            enableCapture
            autoRotate
            onReady={() => {
              const key = file ? `${file.name}:${file.size}` : "";
              if (!key || customThumb || capturedFor.current === key) return;
              capturedFor.current = key;
              window.setTimeout(() => {
                void capture();
              }, 500);
            }}
          />
        ) : (
          <div className="grid h-full place-items-center text-xs text-white/40">Preview appears here</div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="size-14 overflow-hidden rounded-lg border border-white/10 bg-[#171717]">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void capture()} disabled={!previewUrl}>
            Recapture
          </Button>
          <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-input px-2.5 text-[0.8rem] text-white/80 hover:bg-white/5">
            <ImagePlus className="size-3.5" />
            Replace
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const image = event.target.files?.[0];
                if (!image) return;
                setCustomThumb(true);
                setThumbBlob(image);
                setThumbUrl((current) => {
                  if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                  return URL.createObjectURL(image);
                });
              }}
            />
          </label>
        </div>
      </div>

      <Field label="Title">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={80} />
      </Field>
      <Field label="Category">
        <Input value={category} onChange={(event) => setCategory(event.target.value)} required maxLength={40} placeholder="Textile" />
      </Field>
      <div className="grid gap-2">
        <Label>Bento size</Label>
        <div className="grid grid-cols-3 gap-1">
          {SPANS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={span === option}
              onClick={() => setSpan(option)}
              className={cn(
                "rounded-lg border px-2 py-2 font-mono text-xs",
                span === option ? "border-[#f4f0e8] bg-[#f4f0e8] text-[#161410]" : "border-white/10 text-white/70",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <Field label="Description">
        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={600} />
      </Field>
      <Field label="Notes">
        <Input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={240} placeholder="Polycount, credit, material" />
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Add to the shelf"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Library({
  models,
  onModels,
}: {
  models: ModelRecord[];
  onModels: (models: ModelRecord[]) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function persistOrder(next: ModelRecord[]) {
    const previous = models;
    onModels(next);
    const response = await fetch("/api/models/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((model) => model.id) }),
    });
    if (!response.ok) {
      onModels(previous);
      setError("Could not save the new order.");
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= models.length) return;
    const next = models.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    void persistOrder(next);
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const next = models.slice();
    const from = next.findIndex((model) => model.id === dragId);
    const to = next.findIndex((model) => model.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setDragId(null);
    void persistOrder(next);
  }

  async function remove(id: string) {
    setError("");
    const response = await fetch(`/api/models/${id}`, { method: "DELETE" });
    const payload = (await response.json()) as ModelRecord[] | { error?: string };
    if (!response.ok || !Array.isArray(payload)) {
      setError(!Array.isArray(payload) ? payload.error || "Could not delete." : "Could not delete.");
      return;
    }
    setConfirmId(null);
    onModels(payload);
  }

  return (
    <div className="grid gap-2">
      {models.length === 0 ? <p className="text-sm text-white/50">The shelf is empty.</p> : null}
      {models.map((model, index) => (
        <article
          key={model.id}
          draggable
          onDragStart={() => setDragId(model.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => dropOn(model.id)}
          className="rounded-xl border border-white/10 bg-[#171717] p-2"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="size-4 shrink-0 text-white/30" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={model.thumbnail} alt="" className="size-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{model.title}</p>
              <p className="text-[11px] text-white/45">
                {model.category} · {model.span} · {formatCount(model.polycount)} tris
              </p>
            </div>
            <button type="button" className="rounded-md p-1 text-white/60 hover:text-white" aria-label="Move up" onClick={() => move(index, -1)}>
              <ChevronUp className="size-4" />
            </button>
            <button type="button" className="rounded-md p-1 text-white/60 hover:text-white" aria-label="Move down" onClick={() => move(index, 1)}>
              <ChevronDown className="size-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button type="button" size="xs" variant="ghost" onClick={() => setEditing(editing === model.id ? null : model.id)}>
              {editing === model.id ? "Close" : "Edit"}
            </Button>
            {confirmId === model.id ? (
              <>
                <Button type="button" size="xs" variant="destructive" onClick={() => void remove(model.id)}>
                  Delete
                </Button>
                <Button type="button" size="xs" variant="ghost" onClick={() => setConfirmId(null)}>
                  Keep
                </Button>
              </>
            ) : (
              <Button type="button" size="icon-xs" variant="ghost" aria-label={`Delete ${model.title}`} onClick={() => setConfirmId(model.id)}>
                <Trash2 />
              </Button>
            )}
          </div>
          {editing === model.id ? (
            <EditForm
              model={model}
              onSaved={(next) => onModels(models.map((item) => (item.id === next.id ? next : item)))}
            />
          ) : null}
        </article>
      ))}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function EditForm({ model, onSaved }: { model: ModelRecord; onSaved: (model: ModelRecord) => void }) {
  const [title, setTitle] = useState(model.title);
  const [category, setCategory] = useState(model.category);
  const [description, setDescription] = useState(model.description);
  const [notes, setNotes] = useState(model.notes);
  const [span, setSpan] = useState<Span>(model.span);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/models/${model.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, description, notes, span }),
      });
      const payload = (await response.json()) as ModelRecord & { error?: string };
      if (!response.ok) {
        setError(payload.error || "Could not save.");
        return;
      }
      onSaved(payload);
    } catch {
      setError("Could not save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 grid gap-2 border-t border-white/10 pt-3">
      <Input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Title" required />
      <Input value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category" required />
      <div className="grid grid-cols-3 gap-1">
        {SPANS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={span === option}
            onClick={() => setSpan(option)}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[11px]",
              span === option ? "border-[#f4f0e8] bg-[#f4f0e8] text-[#161410]" : "border-white/10 text-white/70",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      <Textarea value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Description" />
      <Input value={notes} onChange={(event) => setNotes(event.target.value)} aria-label="Notes" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
