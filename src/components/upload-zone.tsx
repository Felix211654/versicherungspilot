"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, FileUp, Loader2 } from "lucide-react";
import { PROCESSING_LABEL } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type Item = { key: string; name: string; state: "uploading" | "error" | "processing" | "done"; message?: string; documentId?: string; status?: string; duplicateOf?: string };
const FINAL = new Set(["completed", "needs_review", "failed"]);

export function UploadZone({ policyId, claimId, compact, onDone }: { policyId?: string; claimId?: string; compact?: boolean; onDone?: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).slice(0, 10);
      if (!list.length) return;
      const batch: Item[] = list.map((f) => ({ key: `${f.name}-${f.size}-${Math.random()}`, name: f.name, state: "uploading" }));
      setItems((prev) => [...batch, ...prev]);
      const fd = new FormData();
      list.forEach((f) => fd.append("files", f));
      if (policyId) fd.append("policyId", policyId);
      if (claimId) fd.append("claimId", claimId);
      try {
        const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload fehlgeschlagen");
        setItems((prev) =>
          prev.map((it) => {
            const i = batch.findIndex((b) => b.key === it.key);
            if (i === -1) return it;
            const r = json.results[i];
            return r.ok
              ? { ...it, state: "processing", documentId: r.documentId, status: "uploaded", message: r.warnings?.join(" ") }
              : { ...it, state: "error", message: r.error, duplicateOf: r.duplicateOf };
          }),
        );
        router.refresh();
      } catch (e) {
        setItems((prev) => prev.map((it) => (batch.some((b) => b.key === it.key) ? { ...it, state: "error", message: (e as Error).message } : it)));
      }
    },
    [policyId, claimId, router],
  );

  // Status-Polling für laufende Verarbeitungen
  useEffect(() => {
    const pending = items.filter((i) => i.state === "processing" && i.documentId && !FINAL.has(i.status ?? ""));
    if (!pending.length) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/documents/status?ids=${pending.map((p) => p.documentId).join(",")}`, { cache: "no-store" });
        const json = (await res.json()) as { items: { documentId: string; status: string; statusMessage: string | null; error: string | null }[] };
        let finished = false;
        setItems((prev) =>
          prev.map((it) => {
            const s = json.items.find((x) => x.documentId === it.documentId);
            if (!s) return it;
            if (FINAL.has(s.status)) finished = true;
            return { ...it, status: s.status, state: FINAL.has(s.status) ? "done" : "processing", message: s.error ?? s.statusMessage ?? it.message };
          }),
        );
        if (finished) {
          router.refresh();
          onDone?.();
        }
      } catch {
        /* nächster Versuch */
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [items, router, onDone]);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 text-center", compact ? "py-5" : "py-10", drag ? "border-primary bg-primary-soft" : "border-border bg-surface")}
      >
        <FileUp className="h-7 w-7 text-muted" aria-hidden />
        <div>
          <p className="font-medium">Dateien hierher ziehen</p>
          <p className="text-sm text-muted">PDF, gescannte PDF, JPG, PNG oder DOCX · bis zu 10 Dateien</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => input.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-contrast hover:bg-primary-hover">
            <FileUp className="h-4 w-4" aria-hidden /> Dateien auswählen
          </button>
          <button type="button" onClick={() => camera.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-muted sm:hidden">
            <Camera className="h-4 w-4" aria-hidden /> Foto aufnehmen
          </button>
        </div>
        <input ref={input} type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => e.target.files && upload(e.target.files)} aria-label="Dateien auswählen" data-testid="file-input" />
        <input ref={camera} type="file" hidden accept="image/*" capture="environment" onChange={(e) => e.target.files && upload(e.target.files)} aria-label="Foto aufnehmen" />
      </div>
      {items.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface" aria-live="polite">
          {items.map((it) => (
            <li key={it.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{it.name}</p>
                {it.message && <p className={cn("text-xs", it.state === "error" || it.status === "failed" ? "text-danger" : "text-muted")}>{it.message}</p>}
              </div>
              <div className="flex items-center gap-2">
                {it.state === "uploading" && (
                  <Badge tone="info">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Wird hochgeladen
                  </Badge>
                )}
                {it.state === "error" && <Badge tone="danger">Nicht hochgeladen</Badge>}
                {it.duplicateOf && (
                  <Link className="text-xs text-primary underline" href={`/dokumente/${it.duplicateOf}`}>
                    Vorhandenes Dokument öffnen
                  </Link>
                )}
                {(it.state === "processing" || it.state === "done") && it.status && (
                  <Badge tone={it.status === "completed" ? "success" : it.status === "failed" ? "danger" : it.status === "needs_review" ? "warning" : "info"}>
                    {!FINAL.has(it.status) && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                    {PROCESSING_LABEL[it.status] ?? it.status}
                  </Badge>
                )}
                {it.documentId && (
                  <Link className="text-xs text-primary underline" href={`/dokumente/${it.documentId}`}>
                    Öffnen
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
