import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Siren } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { getClaim } from "@/server/services/claims";
import { listDocuments } from "@/server/services/documents";
import { addCommunicationAction, addEvidenceAction, deleteClaimAction, generateDraftAction, markSubmittedAction, runCheckAction, setClaimStatusAction, setEvidenceStatusAction } from "@/server/actions/claims";
import { createDeadlineAction, createTaskAction, taskStatusAction } from "@/server/actions/deadlines";
import { PageHeader, DefinitionList } from "@/components/ui/misc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { AnswerView } from "@/components/answer-view";
import { UploadZone } from "@/components/upload-zone";
import { AssessmentBadge, CertaintyBadge, ClaimStatusBadge, PriorityBadge, ProcessingBadge } from "@/components/status";
import { CATEGORY_LABEL, CLAIM_STATUS_LABEL, GENERATED_KIND_LABEL } from "@/lib/labels";
import { formatDate, formatDateTime, todayIn } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { StructuredAnswer } from "@/lib/answer-types";

export const metadata: Metadata = { title: "Schadenfall" };

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const data = await getClaim(viewer.householdId, id);
  if (!data) notFound();
  const { claim: c } = data;
  const docs = await listDocuments(viewer.householdId, { claimId: id });
  const openTasks = data.tasks.filter((t) => t.status === "open");
  const doneTasks = data.tasks.filter((t) => t.status !== "open");
  const check = data.lastCheck?.output as StructuredAnswer | null;
  const today = todayIn();

  return (
    <>
      <PageHeader
        title={c.title}
        description={<ClaimStatusBadge status={c.status} />}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={`/schadenfaelle/${id}/bearbeiten`}>
                <Pencil className="h-4 w-4" aria-hidden /> Sachverhalt ergänzen
              </Link>
            </Button>
            <ActionButton action={deleteClaimAction.bind(null, id)} variant="ghost" confirm="Schadenfall mit Aufgaben, Entwürfen und Verlauf löschen? Hochgeladene Dokumente bleiben im Archiv.">
              Löschen
            </ActionButton>
          </>
        }
      />
      {c.acuteDanger && (
        <Alert tone="danger" className="mb-4" title="Akute Gefahr – zuerst Schutzmaßnahmen">
          <Siren className="mr-1 inline h-4 w-4" aria-hidden /> Gefahr abwenden und Schaden begrenzen (z. B. Wasser abstellen, Notdienst, bei Gefahr für Personen 112). Dokumentation und Meldung folgen danach.
        </Alert>
      )}
      {data.missing.length > 0 && (
        <Alert tone="warning" className="mb-4" title="Für eine erste Prüfung fehlen noch Angaben">
          <ul className="list-disc pl-5">
            {data.missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <Link href={`/schadenfaelle/${id}/bearbeiten`} className="mt-1 inline-block underline">
            Jetzt ergänzen
          </Link>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sachverhalt</CardTitle>
              <Badge>Angaben des Nutzers</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm">{c.description}</p>
              <DefinitionList
                items={[
                  { label: "Schadentag", value: c.occurredOn ? formatDate(c.occurredOn) : c.occurredAtText ?? "unbekannt" },
                  { label: "Ort", value: c.location ?? "unbekannt" },
                  { label: "Eigentümer", value: c.ownerOfDamagedItem ?? "–" },
                  { label: "Verursacher", value: c.causedBy ?? "–" },
                  { label: "Geschätzte Höhe", value: c.estimatedDamageCents != null ? formatCents(c.estimatedDamageCents) : "unbekannt" },
                  { label: "Schadennummer Versicherer", value: c.insurerClaimNumber ?? "–" },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Vertragsprüfung</CardTitle>
                <CardDescription>Alle infrage kommenden Verträge werden gegen deine Unterlagen geprüft. Ergebnis ist eine vorläufige Einschätzung, keine Leistungszusage.</CardDescription>
              </div>
              <ActionButton action={runCheckAction.bind(null, id)} pendingText="Prüfung läuft …">
                {data.lastCheck ? "Prüfung aktualisieren" : "Prüfung starten"}
              </ActionButton>
            </CardHeader>
            <CardContent className="space-y-5">
              {data.policies.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Versicherung</th>
                        <th className="py-2 pr-3 font-medium">Prüfstatus</th>
                        <th className="py-2 font-medium">Begründung</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.policies.map((p) => (
                        <tr key={p.cp.policyId}>
                          <td className="py-2 pr-3 align-top">
                            <Link href={`/versicherungen/${p.cp.policyId}`} className="font-medium hover:underline">
                              {p.policyName}
                            </Link>
                            <div className="text-xs text-muted">
                              {CATEGORY_LABEL[p.category]}
                              {p.insurerName ? ` · ${p.insurerName}` : ""}
                            </div>
                          </td>
                          <td className="py-2 pr-3 align-top">
                            <AssessmentBadge assessment={p.cp.assessment} />
                          </td>
                          <td className="py-2 align-top text-text/85">{p.cp.rationale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {check ? (
                <details open className="rounded-lg border border-border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Ausführliches Ergebnis vom {formatDateTime(data.lastCheck!.createdAt)}</summary>
                  <div className="mt-3">
                    <AnswerView answer={check} />
                  </div>
                </details>
              ) : (
                <p className="text-sm text-muted">Noch keine Prüfung durchgeführt.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aufgaben</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {openTasks.length === 0 && <p className="text-sm text-muted">Keine offenen Aufgaben.</p>}
              <ol className="space-y-2">
                {openTasks.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={t.priority} />
                        <span className="font-medium">{t.title}</span>
                      </div>
                      {t.description && <p className="mt-1 text-xs text-muted">{t.description}</p>}
                      <p className="mt-1 text-xs text-muted">{t.source === "ai" ? "Vorschlag aus Vertragsprüfung" : t.source === "user" ? "eigene Aufgabe" : "allgemeiner Hinweis"}</p>
                    </div>
                    <ActionButton action={taskStatusAction.bind(null, t.id, "done")} size="sm" variant="secondary">
                      Erledigt
                    </ActionButton>
                  </li>
                ))}
              </ol>
              {doneTasks.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted">Erledigt ({doneTasks.length})</summary>
                  <ul className="mt-2 space-y-1">
                    {doneTasks.map((t) => (
                      <li key={t.id} className="text-muted line-through">
                        {t.title}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <details className="rounded-lg border border-dashed border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">Aufgabe hinzufügen</summary>
                <ActionForm action={createTaskAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_140px_160px_auto]">
                  <input type="hidden" name="claimId" value={id} />
                  <Input name="title" placeholder="Aufgabe" aria-label="Aufgabe" required />
                  <Select name="priority" aria-label="Priorität" defaultValue="soon">
                    <option value="urgent">dringend</option>
                    <option value="soon">bald</option>
                    <option value="info">Info</option>
                  </Select>
                  <Input name="dueDate" type="date" aria-label="Fällig am" />
                  <SubmitButton size="md" variant="secondary">
                    Hinzufügen
                  </SubmitButton>
                </ActionForm>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Nachweise und Unterlagen</CardTitle>
                <CardDescription>Fotos, Rechnungen, Gutachten, Schreiben des Versicherers.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {data.evidence.map(({ ev, documentTitle }) => (
                  <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      {ev.description}
                      {documentTitle && (
                        <Link href={`/dokumente/${ev.documentId}`} className="ml-1 text-xs text-primary underline">
                          ({documentTitle})
                        </Link>
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge tone={ev.status === "needed" ? "warning" : ev.status === "submitted" ? "success" : "info"}>{ev.status === "needed" ? "fehlt" : ev.status === "submitted" ? "eingereicht" : "vorhanden"}</Badge>
                      {ev.status === "needed" && (
                        <ActionButton action={setEvidenceStatusAction.bind(null, ev.id, "available")} size="sm" variant="ghost">
                          vorhanden
                        </ActionButton>
                      )}
                      {ev.status === "available" && (
                        <ActionButton action={setEvidenceStatusAction.bind(null, ev.id, "submitted")} size="sm" variant="ghost">
                          eingereicht
                        </ActionButton>
                      )}
                    </div>
                  </li>
                ))}
                {!data.evidence.length && <li className="text-sm text-muted">Noch keine Nachweise erfasst.</li>}
              </ul>
              <ActionForm action={addEvidenceAction.bind(null, id)} className="grid gap-2 sm:grid-cols-[1fr_220px_auto]">
                <Input name="description" placeholder="Nachweis, z. B. Kaufbeleg Fahrrad" aria-label="Nachweis" required />
                <Select name="documentId" aria-label="Verknüpftes Dokument" defaultValue="">
                  <option value="">ohne Dokument (fehlt noch)</option>
                  {docs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </Select>
                <SubmitButton variant="secondary">Hinzufügen</SubmitButton>
              </ActionForm>
              {docs.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2">
                      <Link href={`/dokumente/${d.id}`} className="hover:underline">
                        {d.title}
                      </Link>
                      <ProcessingBadge status={d.status} />
                    </li>
                  ))}
                </ul>
              )}
              <UploadZone claimId={id} compact />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kommunikation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                {data.comms.map((m) => (
                  <li key={m.id}>
                    <span className="text-xs text-muted">{formatDate(m.occurredOn)} · {m.direction === "incoming" ? "Eingang" : "Ausgang"} · {m.channel}</span>
                    <p className="font-medium">{m.subject}</p>
                    {m.summary && <p className="text-text/85">{m.summary}</p>}
                  </li>
                ))}
                {!data.comms.length && <li className="text-muted">Noch keine Kommunikation erfasst.</li>}
              </ul>
              <details className="rounded-lg border border-dashed border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">Kommunikation erfassen</summary>
                <ActionForm action={addCommunicationAction.bind(null, id)} className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Select name="direction" aria-label="Richtung">
                    <option value="incoming">Eingang (vom Versicherer)</option>
                    <option value="outgoing">Ausgang (von mir)</option>
                  </Select>
                  <Select name="channel" aria-label="Kanal">
                    <option value="letter">Brief</option>
                    <option value="email">E-Mail</option>
                    <option value="phone">Telefon</option>
                    <option value="portal">Online-Portal</option>
                  </Select>
                  <Input name="subject" placeholder="Betreff" aria-label="Betreff" required />
                  <Input name="occurredOn" type="date" defaultValue={today} aria-label="Datum" required />
                  <Textarea name="summary" placeholder="Kurz zusammengefasst" aria-label="Zusammenfassung" className="sm:col-span-2" />
                  <div>
                    <SubmitButton variant="secondary">Speichern</SubmitButton>
                  </div>
                </ActionForm>
              </details>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Dokumente erstellen</CardTitle>
                <CardDescription>Entwürfe aus deinen Angaben. Fehlendes bleibt als [OFFEN: …] markiert – nichts wird erfunden.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ActionForm action={generateDraftAction.bind(null, id)} className="space-y-2">
                <Select name="kind" aria-label="Art des Dokuments">
                  {Object.entries(GENERATED_KIND_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
                {data.policies.length > 0 && (
                  <Select name="policyId" aria-label="Für Vertrag" defaultValue="">
                    <option value="">Vertrag automatisch wählen</option>
                    {data.policies.map((p) => (
                      <option key={p.cp.policyId} value={p.cp.policyId}>
                        {p.policyName}
                      </option>
                    ))}
                  </Select>
                )}
                <SubmitButton className="w-full" pendingText="Wird erstellt …">
                  Entwurf erstellen
                </SubmitButton>
              </ActionForm>
              <ul className="space-y-2 text-sm">
                {data.drafts.map((d) => (
                  <li key={d.id}>
                    <Link href={`/schadenfaelle/${id}/entwurf/${d.id}`} className="font-medium hover:underline">
                      {GENERATED_KIND_LABEL[d.kind]}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatDateTime(d.updatedAt)} · {d.openPoints.length ? `${d.openPoints.length} offene Punkte` : "keine offenen Punkte"} · Entwurf
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Einreichung</CardTitle>
                <CardDescription>Die App versendet keine Meldungen. Vermerke hier, wenn du sie selbst eingereicht hast.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ActionForm action={markSubmittedAction.bind(null, id)} className="space-y-2">
                <Field id="sub-date" label="Eingereicht am">
                  <Input id="sub-date" name="occurredOn" type="date" defaultValue={today} />
                </Field>
                <Field id="sub-channel" label="Weg">
                  <Select id="sub-channel" name="channel">
                    <option value="letter">Brief</option>
                    <option value="email">E-Mail</option>
                    <option value="portal">Online-Portal</option>
                    <option value="phone">Telefon</option>
                  </Select>
                </Field>
                <Field id="sub-no" label="Schadennummer (falls bekannt)">
                  <Input id="sub-no" name="insurerClaimNumber" />
                </Field>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="confirm" className="mt-1" />
                  Ich habe die Meldung selbst an den Versicherer übermittelt.
                </label>
                <SubmitButton variant="secondary">Als eingereicht vermerken</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ActionForm action={setClaimStatusAction.bind(null, id)} className="space-y-2">
                <Select name="status" defaultValue={c.status} aria-label="Status">
                  {Object.entries(CLAIM_STATUS_LABEL)
                    .filter(([k]) => k !== "submitted_by_user" || c.status === "submitted_by_user")
                    .map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                </Select>
                <Input name="note" placeholder="Notiz (optional)" aria-label="Notiz" />
                <SubmitButton variant="secondary">Status setzen</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fristen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                {data.deadlines.map((d) => (
                  <li key={d.id}>
                    <Link href={`/fristen/${d.id}`} className="font-medium hover:underline">
                      {formatDate(d.dueDate)} · {d.title}
                    </Link>
                    <div>
                      <CertaintyBadge certainty={d.certainty} />
                    </div>
                  </li>
                ))}
                {!data.deadlines.length && <li className="text-muted">Keine Fristen erfasst. Melde- und Nachreichungsfristen stehen in deinen Bedingungen bzw. Schreiben des Versicherers.</li>}
              </ul>
              <details>
                <summary className="cursor-pointer text-sm font-medium">Frist / Wiedervorlage hinzufügen</summary>
                <ActionForm action={createDeadlineAction} className="mt-2 space-y-2">
                  <input type="hidden" name="claimId" value={id} />
                  <Input name="title" placeholder="z. B. Unterlagen nachreichen" aria-label="Titel" required />
                  <Input name="dueDate" type="date" aria-label="Datum" required />
                  <Select name="kind" aria-label="Art" defaultValue="follow_up">
                    <option value="submission">Nachreichungsfrist</option>
                    <option value="claim_report">Schadenmeldefrist</option>
                    <option value="insurer_letter">Frist aus Schreiben</option>
                    <option value="follow_up">Wiedervorlage</option>
                  </Select>
                  <SubmitButton size="sm" variant="secondary">
                    Speichern
                  </SubmitButton>
                </ActionForm>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Verlauf</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {data.events.map((e) => (
                  <li key={e.id}>
                    <span className="text-xs text-muted">{formatDateTime(e.createdAt)}</span>
                    <p>{e.message}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
