"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Neue Version eines bestehenden Dokuments hochladen (ältere Versionen bleiben erhalten). */
export function UploadZoneNewVersion({ documentId }: { documentId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="space-y-1">
      <input
        ref={ref}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.docx"
        aria-label="Neue Version auswählen"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          const fd = new FormData();
          fd.append("files", f);
          fd.append("replaceDocumentId", documentId);
          const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
          const json = await res.json().catch(() => ({}));
          const r = json.results?.[0];
          setBusy(false);
          setMsg(r?.ok ? { ok: true, text: "Neue Version hochgeladen – wird verarbeitet." } : { ok: false, text: r?.error ?? json.error ?? "Upload fehlgeschlagen" });
          router.refresh();
        }}
      />
      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? "Wird hochgeladen …" : "Neue Version hochladen"}
      </Button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-xs text-success" : "text-xs text-danger"}>{msg.text}</p>}
    </div>
  );
}
