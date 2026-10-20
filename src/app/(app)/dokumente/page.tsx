import type { Metadata } from "next";
import Link from "next/link";
import { FolderOpen, Search } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { listDocuments } from "@/server/services/documents";
import { listPolicies } from "@/server/services/policies";
import { searchDocuments } from "@/server/services/search";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { UploadZone } from "@/components/upload-zone";
import { ProcessingBadge } from "@/components/status";
import { DOC_TYPE_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Dokumente" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ q?: string; typ?: string; vertrag?: string; upload?: string; geloescht?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 200) ?? "";
  const ids = q ? await searchDocuments(viewer.householdId, q) : undefined;
  const [docs, policies] = await Promise.all([
    listDocuments(viewer.householdId, { ids, docType: sp.typ || undefined, policyId: sp.vertrag === "ohne" ? undefined : sp.vertrag || undefined }),
    listPolicies(viewer.householdId),
  ]);
  const shown = sp.vertrag === "ohne" ? docs.filter((d) => !d.policyId) : docs;
  const ordered = ids ? [...shown].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)) : shown;
  const unassigned = docs.filter((d) => !d.policyId && d.status !== "failed").length;

  return (
    <>
      <PageHeader title="Dokumente" description="Dein zentraler, verschlüsselter Versicherungsordner. Dateien werden automatisch erkannt, durchsuchbar gemacht und Verträgen zugeordnet." />
      {sp.geloescht && <Alert tone="success" className="mb-4">Das Dokument und alle daraus abgeleiteten Daten wurden gelöscht.</Alert>}
      <details open={Boolean(sp.upload) || docs.length === 0} className="mb-6 rounded-xl border border-border bg-surface">
        <summary className="cursor-pointer px-5 py-4 font-medium">Dokumente hochladen</summary>
        <div className="px-5 pb-5">
          <UploadZone />
          <p className="mt-3 text-xs text-muted">
            Ablauf: Upload → Prüfung → Texterkennung (bei Scans OCR) → Analyse → „Bitte Angaben prüfen“. Automatisch erkannte Angaben sind immer als solche gekennzeichnet.
          </p>
        </div>
      </details>

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_200px_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Suche in Titeln und Dokumentinhalten …" className="pl-9" aria-label="Suchbegriff" />
        </div>
        <Select name="typ" defaultValue={sp.typ ?? ""} aria-label="Dokumenttyp">
          <option value="">Alle Dokumenttypen</option>
          {Object.entries(DOC_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select name="vertrag" defaultValue={sp.vertrag ?? ""} aria-label="Vertrag">
          <option value="">Alle Verträge</option>
          <option value="ohne">Ohne Zuordnung</option>
          {policies.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filtern
        </Button>
      </form>

      {unassigned > 0 && !sp.vertrag && (
        <p className="mb-3 text-sm text-warning">
          {unassigned} Dokument(e) noch keinem Vertrag zugeordnet. <Link href="/dokumente?vertrag=ohne" className="underline">Anzeigen</Link>
        </p>
      )}

      {ordered.length === 0 ? (
        <EmptyState icon={<FolderOpen className="h-8 w-8" />} title={q || sp.typ || sp.vertrag ? "Keine passenden Dokumente" : "Noch keine Dokumente"}>
          {q ? "Versuche einen anderen Suchbegriff." : "Lade Policen, Bedingungen, Rechnungen oder Schreiben deines Versicherers hoch."}
        </EmptyState>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {ordered.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/dokumente/${d.id}`} className="font-medium hover:underline">
                      {d.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {DOC_TYPE_LABEL[d.docType]} · {d.policyName ?? "ohne Vertrag"} · {d.documentDate ? formatDate(d.documentDate) : `hochgeladen ${formatDate(d.createdAt.toISOString())}`}
                      {d.pageCount ? ` · ${d.pageCount} S.` : ""}
                      {d.versionNo > 1 ? ` · Version ${d.versionNo}` : ""}
                    </p>
                    {d.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.tags.map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <ProcessingBadge status={d.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
