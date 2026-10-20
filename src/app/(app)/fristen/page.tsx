import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/session";
import { listDeadlines, listTasks } from "@/server/services/deadlines";
import { listPolicies } from "@/server/services/policies";
import { createDeadlineAction, createTaskAction, deadlineStatusAction, taskStatusAction } from "@/server/actions/deadlines";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { CertaintyBadge, PriorityBadge } from "@/components/status";
import { DEADLINE_KIND_LABEL } from "@/lib/labels";
import { daysBetween, formatDate, todayIn } from "@/lib/dates";

export const metadata: Metadata = { title: "Fristen & Aufgaben" };

export default async function DeadlinesPage() {
  const viewer = await requireViewer();
  const [deadlines, tasks, policies] = await Promise.all([listDeadlines(viewer.householdId), listTasks(viewer.householdId), listPolicies(viewer.householdId)]);
  const today = todayIn();
  const unconfirmed = deadlines.filter((d) => d.deadline.status === "needs_confirmation");
  const open = deadlines.filter((d) => d.deadline.status === "open");

  const row = (x: (typeof deadlines)[number]) => {
    const d = x.deadline;
    const days = daysBetween(today, d.dueDate);
    return (
      <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0 flex-1">
          <Link href={`/fristen/${d.id}`} className="font-medium hover:underline">
            {d.title}
          </Link>
          <p className="text-xs text-muted">
            {DEADLINE_KIND_LABEL[d.kind]}
            {x.policyName ? ` · ${x.policyName}` : ""}
            {x.documentTitle ? ` · Quelle: ${x.documentTitle}` : d.basis ? " · abgeleitet aus Vertragsdaten" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CertaintyBadge certainty={d.certainty} />
          <Badge tone={days < 0 ? "danger" : days <= 14 ? "warning" : "neutral"}>
            {formatDate(d.dueDate)}
            {days < 0 ? " · überfällig" : days === 0 ? " · heute" : ` · in ${days} T.`}
          </Badge>
          {d.status === "open" && (
            <ActionButton action={deadlineStatusAction.bind(null, d.id, "done")} size="sm" variant="secondary">
              Erledigt
            </ActionButton>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHeader title="Fristen & Aufgaben" description="Erkannte und eigene Fristen. Unklare oder abgeleitete Fristen werden erst nach deiner Bestätigung als gesichert behandelt und erinnert." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {unconfirmed.length > 0 && (
            <Card className="border-warning/40">
              <CardHeader>
                <div>
                  <CardTitle>Bitte bestätigen ({unconfirmed.length})</CardTitle>
                  <CardDescription>Automatisch erkannt oder berechnet. Öffne die Frist, um Quelle und Berechnungsgrundlage zu prüfen.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">{unconfirmed.map(row)}</ul>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Bestätigte Fristen</CardTitle>
            </CardHeader>
            <CardContent>{open.length === 0 ? <p className="text-sm text-muted">Keine bestätigten offenen Fristen.</p> : <ul className="divide-y divide-border">{open.map(row)}</ul>}</CardContent>
          </Card>
          <Card id="aufgaben">
            <CardHeader>
              <CardTitle>Aufgaben</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted">Keine offenen Aufgaben.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {tasks.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityBadge priority={t.priority} />
                          <Link href={t.claimId ? `/schadenfaelle/${t.claimId}` : t.documentId ? `/dokumente/${t.documentId}` : t.policyId ? `/versicherungen/${t.policyId}` : "#aufgaben"} className="text-sm font-medium hover:underline">
                            {t.title}
                          </Link>
                        </div>
                        {t.dueDate && <p className="text-xs text-muted">fällig {formatDate(t.dueDate)}</p>}
                      </div>
                      <div className="flex gap-1">
                        <ActionButton action={taskStatusAction.bind(null, t.id, "done")} size="sm" variant="secondary">
                          Erledigt
                        </ActionButton>
                        <ActionButton action={taskStatusAction.bind(null, t.id, "dismissed")} size="sm" variant="ghost">
                          Verwerfen
                        </ActionButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <ActionForm action={createTaskAction} className="grid gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_130px_160px_auto]">
                <Input name="title" placeholder="Neue Aufgabe" aria-label="Neue Aufgabe" required />
                <Select name="priority" defaultValue="soon" aria-label="Priorität">
                  <option value="urgent">dringend</option>
                  <option value="soon">bald</option>
                  <option value="info">Info</option>
                </Select>
                <Input name="dueDate" type="date" aria-label="Fällig am" />
                <SubmitButton variant="secondary">Hinzufügen</SubmitButton>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Eigene Erinnerung</CardTitle>
              <CardDescription>Wird mit deinen Erinnerungsintervallen (Einstellungen) geplant.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ActionForm action={createDeadlineAction} className="space-y-3">
              <Input name="title" placeholder="Titel" aria-label="Titel" required />
              <Input name="dueDate" type="date" aria-label="Datum" required />
              <Select name="kind" defaultValue="custom" aria-label="Art">
                {Object.entries(DEADLINE_KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Select name="policyId" defaultValue="" aria-label="Vertrag">
                <option value="">ohne Vertrag</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Input name="description" placeholder="Beschreibung (optional)" aria-label="Beschreibung" />
              <SubmitButton className="w-full">Erinnerung anlegen</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
