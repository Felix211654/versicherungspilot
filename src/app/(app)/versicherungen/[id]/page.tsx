import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquareText, Pencil } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { getPolicy, policyUncertainties } from "@/server/services/policies";
import { listDocuments } from "@/server/services/documents";
import { addObjectAction, addPersonAction, addTermAction, deletePolicyAction, reviewTermAction } from "@/server/actions/policies";
import { PageHeader, DefinitionList } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/form";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { UploadZone } from "@/components/upload-zone";
import { AssessmentBadge, CertaintyBadge, ClaimStatusBadge, ProcessingBadge, ReviewBadge } from "@/components/status";
import { CATEGORY_LABEL, DEADLINE_KIND_LABEL, DOC_TYPE_LABEL, FACT_FIELD_LABEL, INTERVAL_LABEL, TERM_KIND_LABEL } from "@/lib/labels";
import { annualize, formatCents, type Interval } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Vertrag" };

const TERM_ORDER = ["coverage", "sublimit", "deductible", "exclusion", "waiting_period", "obligation"] as const;

export default async function PolicyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ gespeichert?: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const { gespeichert } = await searchParams;
  const data = await getPolicy(viewer.householdId, id);
  if (!data) notFound();
  const [docs, unclear] = await Promise.all([listDocuments(viewer.householdId, { policyId: id }), policyUncertainties(viewer.householdId, id)]);
  const p = data.policy;
  const cost = annualize(p.premiumCents, p.paymentInterval as Interval | null);
  const chronology = [...docs].sort((a, b) => (a.documentDate ?? a.createdAt.toISOString()).localeCompare(b.documentDate ?? b.createdAt.toISOString()));
  const hasAmendment = docs.some((d) => d.docType === "nachtrag");

  return (
    <>
      <PageHeader
        title={p.name}
        description={`${CATEGORY_LABEL[p.category]}${data.insurerName ? ` · ${data.insurerName}` : ""}`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={`/assistent?q=${encodeURIComponent(`Was ist in meinem Vertrag „${p.name}“ versichert und was nicht?`)}`}>
                <MessageSquareText className="h-4 w-4" aria-hidden /> Frage stellen
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/versicherungen/${id}/bearbeiten`}>
                <Pencil className="h-4 w-4" aria-hidden /> Bearbeiten
              </Link>
            </Button>
            <ActionButton action={deletePolicyAction.bind(null, id)} variant="ghost" confirm="Vertrag wirklich löschen? Zugeordnete Dokumente bleiben im Archiv erhalten.">
              Löschen
            </ActionButton>
          </>
        }
      />
      {gespeichert && <Alert tone="success" className="mb-4">Gespeichert.</Alert>}
      {p.status === "needs_review" && <Alert tone="warning" className="mb-4" title="Prüfung erforderlich">Dieser Vertrag basiert auf automatisch erkannten Angaben. Bitte prüfe die Daten und setze den Status auf „aktiv“.</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Überblick</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionList
                items={[
                  { label: "Versicherungsart", value: CATEGORY_LABEL[p.category] },
                  { label: "Versicherer", value: data.insurerName ?? "–" },
                  { label: "Vertragsnummer", value: p.policyNumber ?? "–" },
                  { label: "Versicherungsnehmer", value: p.policyholderName ?? "–" },
                  { label: "Vermittler", value: p.broker ?? "–" },
                  { label: "Beitrag", value: p.premiumCents != null ? `${formatCents(p.premiumCents)} ${p.paymentInterval ? INTERVAL_LABEL[p.paymentInterval] : "(Zahlungsweise unbekannt)"}` : "–", hint: cost ? `rechnerisch ${formatCents(cost.yearlyCents)} / Jahr · ${formatCents(cost.monthlyCents)} / Monat` : undefined },
                  { label: "Versicherungsbeginn", value: formatDate(p.startDate) },
                  { label: "Ablauf / Hauptfälligkeit", value: formatDate(p.endDate) },
                  { label: "Verlängerung", value: p.autoRenews == null ? "unbekannt" : p.autoRenews ? `stillschweigend${p.renewalPeriodMonths ? ` um ${p.renewalPeriodMonths} Monate` : ""}` : "keine automatische Verlängerung" },
                  { label: "Kündigungsfrist", value: p.noticePeriodMonths != null ? `${p.noticePeriodMonths} Monat(e) vor Ablauf` : "unbekannt", hint: p.noticePeriodText ?? undefined },
                ]}
              />
              {p.notes && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-surface-muted p-3 text-sm">{p.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Leistungen, Grenzen und Pflichten</CardTitle>
                <CardDescription>In Alltagssprache – mit Fundstelle im Originaldokument. Automatisch erkannte Einträge bitte bestätigen.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {data.terms.length === 0 && <p className="text-sm text-muted">Noch keine Einträge. Sie entstehen aus hochgeladenen Bedingungen (mit Beleg) oder manuell.</p>}
              {TERM_ORDER.map((kind) => {
                const list = data.terms.filter((t) => t.term.kind === kind);
                if (!list.length) return null;
                return (
                  <div key={kind}>
                    <h3 className="mb-2 text-sm font-semibold">{TERM_KIND_LABEL[kind]}</h3>
                    <ul className="space-y-2">
                      {list.map(({ term: t, documentTitle }) => (
                        <li key={t.id} className="rounded-lg border border-border p-3 text-sm">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium">
                                {t.title}
                                {t.amountCents != null && <span className="ml-2 tabular-nums text-muted">{formatCents(t.amountCents)}</span>}
                              </p>
                              {t.description && <p className="text-text/85">{t.description}</p>}
                            </div>
                            <ReviewBadge review={t.review} />
                          </div>
                          {t.sourceSnippet && (
                            <details className="mt-2 text-xs">
                              <summary className="cursor-pointer text-primary">Originalklausel{t.sourcePage ? ` (S. ${t.sourcePage})` : ""}</summary>
                              <blockquote className="mt-1 border-l-2 border-border pl-2 italic text-muted">„{t.sourceSnippet}“</blockquote>
                              {t.sourceDocumentId && (
                                <Link className="mt-1 inline-block text-primary underline" href={`/dokumente/${t.sourceDocumentId}?seite=${t.sourcePage ?? 1}&zitat=${encodeURIComponent(t.sourceSnippet.slice(0, 100))}#seite-${t.sourcePage ?? 1}`}>
                                  In „{documentTitle}“ öffnen
                                </Link>
                              )}
                            </details>
                          )}
                          {(t.review === "auto" || t.review === "unclear") && (
                            <div className="mt-2 flex gap-2">
                              <ActionButton action={reviewTermAction.bind(null, t.id, "confirmed")} size="sm" variant="secondary">
                                Bestätigen
                              </ActionButton>
                              <ActionButton action={reviewTermAction.bind(null, t.id, "rejected")} size="sm" variant="ghost">
                                Verwerfen
                              </ActionButton>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              <details className="rounded-lg border border-dashed border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">Eintrag manuell hinzufügen</summary>
                <ActionForm action={addTermAction.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                                      <>
                      <Field id="kind" label="Art">
                        <Select id="kind" name="kind">
                          {TERM_ORDER.map((k) => (
                            <option key={k} value={k}>
                              {TERM_KIND_LABEL[k]}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field id="title" label="Bezeichnung">
                        <Input id="title" name="title" required />
                      </Field>
                      <Field id="amount" label="Betrag in € (optional)">
                        <Input id="amount" name="amount" inputMode="decimal" />
                      </Field>
                      <Field id="description" label="Erläuterung (optional)">
                        <Input id="description" name="description" />
                      </Field>
                      <div>
                        <SubmitButton size="sm">Hinzufügen</SubmitButton>
                      </div>
                    </>
                </ActionForm>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Dokumente und Chronologie</CardTitle>
                <CardDescription>Ein Vertrag besteht oft aus mehreren Dokumenten. Neuere Dokumente ersetzen ältere nicht automatisch.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasAmendment && (
                <Alert tone="info" title="Nachträge vorhanden">
                  Ein Nachtrag ändert meist nur einzelne Vertragsbestandteile. Welche Fassung im Einzelfall maßgeblich ist, lässt sich nicht automatisch sicher bestimmen – bitte Nachtrag und Bedingungen gemeinsam lesen.
                </Alert>
              )}
              {chronology.length === 0 ? (
                <p className="text-sm text-muted">Noch keine Dokumente zugeordnet.</p>
              ) : (
                <ol className="relative space-y-3 border-l border-border pl-4">
                  {chronology.map((d) => (
                    <li key={d.id} className="text-sm">
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-border bg-surface" aria-hidden />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted">{d.documentDate ? formatDate(d.documentDate) : `hochgeladen ${formatDate(d.createdAt.toISOString())}`}</span>
                        <Badge tone={d.docType === "nachtrag" ? "warning" : "neutral"}>{DOC_TYPE_LABEL[d.docType]}</Badge>
                        <ProcessingBadge status={d.status} />
                      </div>
                      <Link href={`/dokumente/${d.id}`} className="font-medium hover:underline">
                        {d.title}
                      </Link>
                      {d.versionNo > 1 && <span className="ml-2 text-xs text-muted">Version {d.versionNo}</span>}
                    </li>
                  ))}
                </ol>
              )}
              <UploadZone policyId={id} compact />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fristen</CardTitle>
            </CardHeader>
            <CardContent>
              {data.deadlines.length === 0 ? (
                <p className="text-sm text-muted">Keine offenen Fristen. Mit Ablaufdatum und Kündigungsfrist werden Fristen automatisch abgeleitet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.deadlines.map((d) => (
                    <li key={d.id} className="text-sm">
                      <Link href={`/fristen/${d.id}`} className="font-medium hover:underline">
                        {formatDate(d.dueDate)} · {DEADLINE_KIND_LABEL[d.kind]}
                      </Link>
                      <div className="mt-0.5">
                        <CertaintyBadge certainty={d.certainty} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Erkannte Unsicherheiten</CardTitle>
            </CardHeader>
            <CardContent>
              {unclear.length === 0 ? (
                <p className="text-sm text-muted">Keine offenen Unklarheiten.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {unclear.map(({ fact, documentTitle, documentId }) => (
                    <li key={fact.id}>
                      <span className="font-medium">{FACT_FIELD_LABEL[fact.field] ?? fact.field}:</span> {fact.valueText}{" "}
                      <Link href={`/dokumente/${documentId}`} className="text-xs text-primary underline">
                        ({documentTitle}, S. {fact.pageNo})
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Versicherte Personen & Objekte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <ul className="space-y-1">
                {data.persons.map((x) => (
                  <li key={x.id}>
                    {x.name}
                    {x.role && <span className="text-muted"> · {x.role}</span>}
                  </li>
                ))}
                {data.objects.map((x) => (
                  <li key={x.id}>
                    {x.kind}: {x.description}
                    {x.identifier && <span className="text-muted"> · {x.identifier}</span>}
                  </li>
                ))}
                {!data.persons.length && !data.objects.length && <li className="text-muted">Noch nichts erfasst.</li>}
              </ul>
              <details>
                <summary className="cursor-pointer font-medium">Person hinzufügen</summary>
                <ActionForm action={addPersonAction.bind(null, id)} className="mt-2 space-y-2">
                                      <>
                      <Input name="name" placeholder="Name" aria-label="Name" required />
                      <Input name="role" placeholder="Rolle (z. B. Ehepartner)" aria-label="Rolle" />
                      <SubmitButton size="sm">Hinzufügen</SubmitButton>
                    </>
                </ActionForm>
              </details>
              <details>
                <summary className="cursor-pointer font-medium">Objekt hinzufügen</summary>
                <ActionForm action={addObjectAction.bind(null, id)} className="mt-2 space-y-2">
                                      <>
                      <Select name="kind" aria-label="Art des Objekts">
                        {["Fahrzeug", "Wohnung", "Gebäude", "Gerät", "Tier", "Sonstiges"].map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </Select>
                      <Input name="description" placeholder="Beschreibung" aria-label="Beschreibung" required />
                      <Input name="identifier" placeholder="Kennzeichen / Adresse / Seriennr." aria-label="Kennung" />
                      <SubmitButton size="sm">Hinzufügen</SubmitButton>
                    </>
                </ActionForm>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schadenfälle</CardTitle>
            </CardHeader>
            <CardContent>
              {data.claims.length === 0 ? (
                <p className="text-sm text-muted">Keine Schadenfälle mit diesem Vertrag.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.claims.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-2">
                      <Link href={`/schadenfaelle/${c.id}`} className="font-medium hover:underline">
                        {c.title}
                      </Link>
                      <ClaimStatusBadge status={c.status} />
                      <AssessmentBadge assessment={c.assessment} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Änderungshistorie</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs text-muted">
                {data.history.map((h) => (
                  <li key={h.id}>
                    {formatDateTime(h.createdAt)} · {h.action === "policy.created" ? "angelegt" : h.action === "policy.updated" ? "geändert" : h.action}
                  </li>
                ))}
                {!data.history.length && <li>–</li>}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
