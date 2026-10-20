import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { downloadUrl, getDocument } from "@/server/services/documents";
import { listPolicies } from "@/server/services/policies";
import { assignDocumentAction, completeReviewAction, deleteDocumentAction, reprocessDocumentAction, reviewFactAction, updateDocumentAction } from "@/server/actions/documents";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/form";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { UploadZoneNewVersion } from "./new-version";
import { AutoRefresh } from "@/components/auto-refresh";
import { ConfidenceBadge, ProcessingBadge, ReviewBadge } from "@/components/status";
import { CATEGORY_LABEL, DOC_TYPE_LABEL, FACT_FIELD_LABEL, INTERVAL_LABEL, TERM_KIND_LABEL } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { findQuote } from "@/lib/highlight";

export const metadata: Metadata = { title: "Dokument" };

function factDisplay(field: string, value: string, json: unknown) {
  if (field === "category") return CATEGORY_LABEL[value] ?? value;
  if (field === "payment_interval") return INTERVAL_LABEL[value] ?? value;
  if (["start_date", "end_date", "letter_deadline", "document_date"].includes(field)) return formatDate(value);
  const j = json as { cents?: number; interval?: string } | null;
  if (j?.cents != null) return `${formatCents(j.cents)}${j.interval ? ` (${INTERVAL_LABEL[j.interval]})` : ""}`;
  return value;
}

type SummaryJson = { text: string; changesNote: string | null; terms: { kind: string; title: string; explanation: string; page: number; quote: string }[]; rejectedTerms: number; model: string };

export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ seite?: string; zitat?: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const sp = await searchParams;
  const data = await getDocument(viewer.householdId, id);
  if (!data) notFound();
  const { doc, current, facts, pages, versions, policy } = data;
  const policies = await listPolicies(viewer.householdId);
  const status = current?.status ?? "failed";
  const running = !["completed", "needs_review", "failed"].includes(status);
  const preview = current ? downloadUrl(viewer.householdId, current.id, "inline") : null;
  const download = current ? downloadUrl(viewer.householdId, current.id, "attachment") : null;
  const summary = doc.summary as SummaryJson | null;
  const focusPage = Number(sp.seite) || null;
  const quote = sp.zitat ?? "";

  return (
    <>
      <PageHeader
        title={doc.title}
        description={`${DOC_TYPE_LABEL[doc.docType]}${policy ? ` · ${policy.name}` : " · keinem Vertrag zugeordnet"}`}
        actions={
          <>
            {preview && (
              <Button asChild variant="secondary">
                <a href={preview} target="_blank" rel="noopener">
                  <ExternalLink className="h-4 w-4" aria-hidden /> Original ansehen
                </a>
              </Button>
            )}
            {download && (
              <Button asChild variant="secondary">
                <a href={download}>
                  <Download className="h-4 w-4" aria-hidden /> Herunterladen
                </a>
              </Button>
            )}
            <ActionButton action={deleteDocumentAction.bind(null, id)} variant="ghost" confirm="Dokument mit allen Versionen, Texten, Suchindex und abgeleiteten Angaben endgültig löschen?">
              Löschen
            </ActionButton>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ProcessingBadge status={status} />
        {current?.statusMessage && <span className="text-sm text-muted">{current.statusMessage}</span>}
        <AutoRefresh active={running} />
      </div>
      {status === "failed" && (
        <Alert tone="danger" className="mb-6" title="Verarbeitung fehlgeschlagen">
          <p>{current?.error ?? "Unbekannter Fehler."}</p>
          <p className="mt-1 text-xs">Versuche: {current?.attempts ?? 0}</p>
          <div className="mt-2">
            <ActionButton action={reprocessDocumentAction.bind(null, id)} size="sm" variant="secondary">
              Erneut verarbeiten
            </ActionButton>
          </div>
        </Alert>
      )}
      {current?.malwareScan === "not_scanned" && status !== "failed" && <p className="mb-4 text-xs text-muted">Hinweis: Kein Virenscanner konfiguriert – Datei wurde nicht auf Schadsoftware geprüft.</p>}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          {status === "needs_review" && (
            <Card className="border-warning/40">
              <CardHeader>
                <div>
                  <CardTitle>Bitte Angaben prüfen</CardTitle>
                  <CardDescription>Prüfe Dokumenttyp, Zuordnung und die erkannten Angaben. Unsichere Werte sind markiert.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!doc.policyId && (
                  <Button asChild className="w-full">
                    <Link href={`/versicherungen/neu?dokument=${id}`}>Neuen Vertrag aus erkannten Angaben anlegen</Link>
                  </Button>
                )}
                <ActionButton action={completeReviewAction.bind(null, id)} variant="secondary" className="w-full">
                  Prüfung abschließen
                </ActionButton>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Zuordnung</CardTitle>
              {doc.assignment === "suggested" && <Badge tone="warning">automatisch zugeordnet (Vertragsnummer)</Badge>}
            </CardHeader>
            <CardContent>
              <ActionForm action={assignDocumentAction.bind(null, id)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field id="policyId" label="Vertrag" className="flex-1">
                  <Select id="policyId" name="policyId" defaultValue={doc.policyId ?? ""}>
                    <option value="">– keinem Vertrag zugeordnet –</option>
                    {policies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <SubmitButton variant="secondary">Speichern</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dokumentangaben</CardTitle>
              <ReviewBadge review={doc.docTypeReview} />
            </CardHeader>
            <CardContent>
              <ActionForm action={updateDocumentAction.bind(null, id)} className="space-y-3">
                <Field id="title" label="Titel">
                  <Input id="title" name="title" defaultValue={doc.title} />
                </Field>
                <Field id="docType" label="Dokumenttyp">
                  <Select id="docType" name="docType" defaultValue={doc.docType}>
                    {Object.entries(DOC_TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="documentDate" label="Dokumentdatum">
                  <Input id="documentDate" name="documentDate" type="date" defaultValue={doc.documentDate ?? ""} />
                </Field>
                <Field id="tags" label="Tags (kommagetrennt)">
                  <Input id="tags" name="tags" defaultValue={doc.tags.join(", ")} />
                </Field>
                <SubmitButton variant="secondary">Speichern</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Erkannte Angaben</CardTitle>
                <CardDescription>Regelbasiert erkannt, jeweils mit Fundstelle. Qualitätsangaben sind Einschätzungen, keine Wahrscheinlichkeiten.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {facts.length === 0 ? (
                <p className="text-sm text-muted">{running ? "Wird noch analysiert …" : "Keine strukturierten Angaben erkannt."}</p>
              ) : (
                <ul className="space-y-3">
                  {facts.map((f) => (
                    <li key={f.id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs uppercase tracking-wide text-muted">{FACT_FIELD_LABEL[f.field] ?? f.field}</span>
                        <div className="flex gap-1">
                          <ConfidenceBadge confidence={f.confidence} />
                          <ReviewBadge review={f.review} />
                        </div>
                      </div>
                      <p className={f.review === "rejected" ? "mt-1 font-medium line-through" : "mt-1 font-medium"}>
                        {f.correctedValue ? (
                          <>
                            {f.correctedValue} <span className="text-xs font-normal text-muted">(erkannt: {factDisplay(f.field, f.valueText, f.valueJson)})</span>
                          </>
                        ) : (
                          factDisplay(f.field, f.valueText, f.valueJson)
                        )}
                      </p>
                      {f.snippet && (
                        <Link href={`?seite=${f.pageNo}&zitat=${encodeURIComponent(f.snippet.slice(0, 100))}#seite-${f.pageNo}`} className="mt-1 block text-xs text-muted hover:underline">
                          S. {f.pageNo}: „{f.snippet}“
                        </Link>
                      )}
                      <p className="mt-1 text-xs text-muted">
                        Methode: {f.method === "rule" ? "Regel" : f.method === "llm" ? "KI (Zitat geprüft)" : "manuell"} · {formatDateTime(f.extractedAt)}
                      </p>
                      {f.review !== "rejected" && (
                        <div className="mt-2 flex flex-wrap items-end gap-2">
                          {f.review !== "confirmed" && (
                            <ActionForm action={reviewFactAction.bind(null, f.id, "confirm")} showMessage={false}>
                              <SubmitButton size="sm" variant="secondary">
                                Bestätigen
                              </SubmitButton>
                            </ActionForm>
                          )}
                          <ActionForm action={reviewFactAction.bind(null, f.id, "reject")} showMessage={false}>
                            <SubmitButton size="sm" variant="ghost">
                              Verwerfen
                            </SubmitButton>
                          </ActionForm>
                          <ActionForm action={reviewFactAction.bind(null, f.id, "correct")} className="flex gap-1">
                            <Input name="value" placeholder="Korrektur" aria-label={`Korrektur für ${FACT_FIELD_LABEL[f.field] ?? f.field}`} className="h-8 w-32" />
                            <SubmitButton size="sm" variant="ghost">
                              Korrigieren
                            </SubmitButton>
                          </ActionForm>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Versionen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1 text-sm">
                {versions.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Version {v.versionNo} · {v.fileName} · {(v.sizeBytes / 1024).toFixed(0)} KB · {formatDateTime(v.createdAt)}
                    </span>
                    <a href={downloadUrl(viewer.householdId, v.id, "attachment")} className="text-xs text-primary underline">
                      Download
                    </a>
                  </li>
                ))}
              </ul>
              <UploadZoneNewVersion documentId={id} />
              {status !== "failed" && !running && (
                <ActionButton action={reprocessDocumentAction.bind(null, id)} size="sm" variant="ghost">
                  Analyse erneut ausführen
                </ActionButton>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-3">
          {summary && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Zusammenfassung (KI)</CardTitle>
                  <CardDescription>Alltagssprachliche Zusammenfassung. Klauseln nur mit wörtlich geprüftem Zitat{summary.rejectedTerms ? ` – ${summary.rejectedTerms} unbelegte Klausel(n) verworfen` : ""}.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{summary.text}</p>
                {summary.changesNote && <Alert tone="info" title="Änderungen durch dieses Dokument">{summary.changesNote}</Alert>}
                <ul className="space-y-2">
                  {summary.terms.map((t, i) => (
                    <li key={i}>
                      <Badge tone="primary">{TERM_KIND_LABEL[t.kind]}</Badge> <span className="font-medium">{t.title}</span> – {t.explanation}{" "}
                      <Link href={`?seite=${t.page}&zitat=${encodeURIComponent(t.quote.slice(0, 100))}#seite-${t.page}`} className="text-xs text-primary underline">
                        S. {t.page}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Erkannter Text</CardTitle>
                <CardDescription>
                  {current?.textMethod === "ocr" ? "Per Texterkennung (OCR) aus einem Scan gewonnen – Fehler möglich." : current?.textMethod === "mixed" ? "Teilweise per OCR erkannt." : "Aus dem digitalen Dokument extrahiert."} Das Original bleibt maßgeblich.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {pages.length === 0 && <p className="text-sm text-muted">{running ? "Text wird erkannt …" : "Kein Text verfügbar."}</p>}
              {pages.map((p) => {
                const hit = quote && focusPage === p.pageNo ? findQuote(p.text, quote) : null;
                return (
                  <section key={p.pageNo} id={`seite-${p.pageNo}`} className={focusPage === p.pageNo ? "scroll-mt-24 rounded-lg ring-2 ring-primary/30" : "scroll-mt-24"}>
                    <h3 className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
                      Seite {p.pageNo}
                      {p.method === "ocr" && <Badge tone={p.ocrConfidence != null && p.ocrConfidence < 60 ? "warning" : "neutral"}>OCR{p.ocrConfidence != null ? ` · Ø ${p.ocrConfidence}` : ""}</Badge>}
                    </h3>
                    <div className="prose-doc max-h-[32rem] overflow-y-auto rounded-lg bg-surface-muted p-3 text-sm">
                      {hit ? (
                        <>
                          {p.text.slice(0, hit.start)}
                          <mark>{p.text.slice(hit.start, hit.end)}</mark>
                          {p.text.slice(hit.end)}
                        </>
                      ) : (
                        p.text
                      )}
                    </div>
                    {quote && focusPage === p.pageNo && !hit && <p className="mt-1 text-xs text-warning">Die zitierte Stelle konnte auf dieser Seite nicht exakt markiert werden.</p>}
                  </section>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
