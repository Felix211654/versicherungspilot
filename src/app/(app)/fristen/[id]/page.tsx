import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/session";
import { getDeadline } from "@/server/services/deadlines";
import { confirmDeadlineAction, deadlineStatusAction } from "@/server/actions/deadlines";
import { PageHeader, DefinitionList } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/form";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { CertaintyBadge } from "@/components/status";
import { DEADLINE_KIND_LABEL } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Frist" };

const STATUS = { needs_confirmation: "Bestätigung erforderlich", open: "offen", done: "erledigt", dismissed: "verworfen" } as const;

export default async function DeadlinePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const data = await getDeadline(viewer.householdId, id);
  if (!data) notFound();
  const d = data.deadline;
  return (
    <>
      <PageHeader title={d.title} description={DEADLINE_KIND_LABEL[d.kind]} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CertaintyBadge certainty={d.certainty} />
            </CardHeader>
            <CardContent className="space-y-4">
              <DefinitionList
                items={[
                  { label: "Datum", value: formatDate(d.dueDate) },
                  { label: "Status", value: STATUS[d.status] },
                  { label: "Vertrag", value: d.policyId ? <Link href={`/versicherungen/${d.policyId}`} className="text-primary hover:underline">{data.policyName}</Link> : "–" },
                  { label: "Schadenfall", value: d.claimId ? <Link href={`/schadenfaelle/${d.claimId}`} className="text-primary hover:underline">öffnen</Link> : "–" },
                ]}
              />
              {d.description && <p className="text-sm">{d.description}</p>}
              {d.basis && (
                <div className="rounded-lg bg-surface-muted p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted">Berechnungsgrundlage</p>
                  <p className="mt-1">{d.basis}</p>
                </div>
              )}
              {d.sourceDocumentId && (
                <div className="rounded-lg border border-border p-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-muted">Quelle</p>
                  <Link href={`/dokumente/${d.sourceDocumentId}?seite=${d.sourcePage ?? 1}&zitat=${encodeURIComponent((d.sourceSnippet ?? "").slice(0, 100))}#seite-${d.sourcePage ?? 1}`} className="font-medium text-primary hover:underline">
                    {data.documentTitle}, S. {d.sourcePage}
                  </Link>
                  {d.sourceSnippet && <blockquote className="mt-1 border-l-2 border-border pl-2 italic text-muted">„{d.sourceSnippet}“</blockquote>}
                </div>
              )}
              {d.certainty !== "confirmed" && (
                <Alert tone="warning">Diese Frist ist nicht gesichert. Prüfe Quelle bzw. Berechnung und bestätige oder korrigiere das Datum.</Alert>
              )}
            </CardContent>
          </Card>
          {data.tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Zugehörige Aufgaben</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {data.tasks.map((t) => (
                    <li key={t.id}>{t.title}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          {d.status === "needs_confirmation" && (
            <Card>
              <CardHeader>
                <CardTitle>Bestätigen</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionForm action={confirmDeadlineAction.bind(null, id)} className="space-y-3">
                  <Field id="dueDate" label="Datum (ggf. korrigieren)">
                    <Input id="dueDate" name="dueDate" type="date" defaultValue={d.dueDate} />
                  </Field>
                  <SubmitButton className="w-full">Frist bestätigen</SubmitButton>
                </ActionForm>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Aktionen</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {d.status !== "done" && (
                <ActionButton action={deadlineStatusAction.bind(null, id, "done")} variant="secondary">
                  Erledigt
                </ActionButton>
              )}
              {d.status !== "dismissed" && (
                <ActionButton action={deadlineStatusAction.bind(null, id, "dismissed")} variant="ghost">
                  Verwerfen
                </ActionButton>
              )}
              {(d.status === "done" || d.status === "dismissed") && (
                <ActionButton action={deadlineStatusAction.bind(null, id, "open")} variant="ghost">
                  Wieder öffnen
                </ActionButton>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Erinnerungen</CardTitle>
            </CardHeader>
            <CardContent>
              {data.reminders.length === 0 ? (
                <p className="text-sm text-muted">{d.status === "open" ? "Keine (mehr) geplant." : "Werden nach Bestätigung geplant."}</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {data.reminders.map((r) => (
                    <li key={r.id} className="flex items-center justify-between">
                      {formatDate(r.remindOn)} ({r.offsetDays} Tage vorher)
                      {r.sentAt ? <Badge tone="success">gesendet {formatDateTime(r.sentAt)}</Badge> : <Badge>geplant</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
