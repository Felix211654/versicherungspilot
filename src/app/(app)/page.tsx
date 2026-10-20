import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRight, MessageSquareText, Sparkles } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { dashboardData, analyzePortfolio } from "@/server/services/analysis";
import { db, schema } from "@/server/db";
import { markNotificationsReadAction } from "@/server/actions/settings";
import { taskStatusAction } from "@/server/actions/deadlines";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stat, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/action-form";
import { CertaintyBadge, ClaimStatusBadge, PriorityBadge, ProcessingBadge } from "@/components/status";
import { CATEGORY_LABEL, DEADLINE_KIND_LABEL, DOC_TYPE_LABEL } from "@/lib/labels";
import { daysBetween, formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Übersicht" };

export default async function Dashboard() {
  const viewer = await requireViewer();
  const [d, findings, [settings]] = await Promise.all([
    dashboardData(viewer.householdId),
    analyzePortfolio(viewer.householdId),
    db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, viewer.userId)),
  ]);
  const categories = [...new Set(d.policies.map((p) => p.category))];
  const firstName = viewer.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Hallo {firstName}</h1>
        <form action="/assistent" className="flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Frage an den Assistenten
          </label>
          <input
            id="q"
            name="q"
            placeholder="Frag z. B.: „Mein Fahrrad wurde aus dem Keller gestohlen – welche Versicherung greift?“"
            className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
          <Button type="submit" size="lg" aria-label="Fragen">
            <MessageSquareText className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Fragen</span>
          </Button>
        </form>
      </div>

      {!settings?.onboardingCompletedAt && (
        <Card className="border-primary/30 bg-primary-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
              <div>
                <p className="font-medium">Einrichtung abschließen</p>
                <p className="text-sm text-muted">In wenigen Schritten: Sicherheit, erste Unterlagen, Prüfung der erkannten Daten.</p>
              </div>
            </div>
            <Button asChild variant="secondary">
              <Link href="/onboarding">Weiter einrichten</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Verträge" value={d.policyCount} hint={`${categories.length} Versicherungsarten`} href="/versicherungen" />
        <Stat
          label="Kosten pro Jahr"
          value={d.yearlyCents ? formatCents(d.yearlyCents) : "–"}
          hint={d.policiesWithoutPremium ? `ohne ${d.policiesWithoutPremium} Vertrag/Verträge ohne Beitragsangabe` : d.yearlyCents ? `≈ ${formatCents(d.monthlyCents)} / Monat (rechnerisch)` : "Beiträge noch nicht erfasst"}
          href="/analyse"
        />
        <Stat label="Offene Schadenfälle" value={d.claims.length} href="/schadenfaelle" />
        <Stat label="Fristen (60 Tage)" value={d.upcomingDeadlines.length} hint={d.unconfirmedDeadlines ? `${d.unconfirmedDeadlines} unbestätigt` : undefined} href="/fristen" />
        <Stat label="Offene Aufgaben" value={d.tasks.length} href="/fristen#aufgaben" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Nächste Aufgaben</CardTitle>
              <Link href="/fristen#aufgaben" className="text-sm text-primary hover:underline">
                Alle
              </Link>
            </CardHeader>
            <CardContent>
              {d.tasks.length === 0 ? (
                <p className="text-sm text-muted">Keine offenen Aufgaben.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {d.tasks.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityBadge priority={t.priority} />
                          <Link href={t.claimId ? `/schadenfaelle/${t.claimId}` : t.documentId ? `/dokumente/${t.documentId}` : "/fristen#aufgaben"} className="text-sm font-medium hover:underline">
                            {t.title}
                          </Link>
                        </div>
                        {t.dueDate && <p className="text-xs text-muted">fällig {formatDate(t.dueDate)}</p>}
                      </div>
                      <ActionButton action={taskStatusAction.bind(null, t.id, "done")} variant="secondary" size="sm" pendingText="…">
                        Erledigt
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anstehende Fristen</CardTitle>
              <Link href="/fristen" className="text-sm text-primary hover:underline">
                Alle Fristen
              </Link>
            </CardHeader>
            <CardContent>
              {d.upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted">Keine Fristen in den nächsten 60 Tagen.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {d.upcomingDeadlines.slice(0, 6).map(({ d: x, policyName }) => {
                    const days = daysBetween(d.today, x.dueDate);
                    return (
                      <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0">
                          <Link href={`/fristen/${x.id}`} className="text-sm font-medium hover:underline">
                            {x.title}
                          </Link>
                          <p className="text-xs text-muted">
                            {DEADLINE_KIND_LABEL[x.kind]}
                            {policyName ? ` · ${policyName}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CertaintyBadge certainty={x.certainty} />
                          <Badge tone={days < 0 ? "danger" : days <= 14 ? "warning" : "neutral"}>{days < 0 ? `überfällig (${formatDate(x.dueDate)})` : days === 0 ? "heute" : `${formatDate(x.dueDate)} · in ${days} T.`}</Badge>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aktuelle Schadenfälle</CardTitle>
              <Link href="/schadenfaelle/neu" className="text-sm text-primary hover:underline">
                Neuer Fall
              </Link>
            </CardHeader>
            <CardContent>
              {d.claims.length === 0 ? (
                <p className="text-sm text-muted">Keine laufenden Schadenfälle.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {d.claims.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
                      <Link href={`/schadenfaelle/${c.id}`} className="text-sm font-medium hover:underline">
                        {c.title}
                      </Link>
                      <ClaimStatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card id="hinweise">
            <CardHeader>
              <CardTitle>Wichtige Hinweise</CardTitle>
              <Link href="/analyse" className="text-sm text-primary hover:underline">
                Analyse
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {d.notifications.length > 0 && (
                <div className="space-y-2">
                  {d.notifications.map((n) => (
                    <Link key={n.id} href={n.href ?? "/fristen"} className="block rounded-lg bg-warning-soft px-3 py-2 text-sm hover:underline">
                      <span className="font-medium">{n.title}</span>
                      {n.body && <span className="block text-xs text-muted">{n.body}</span>}
                    </Link>
                  ))}
                  <ActionButton action={markNotificationsReadAction} variant="link" size="sm">
                    Als gelesen markieren
                  </ActionButton>
                </div>
              )}
              {d.overdueDeadlines.length > 0 && (
                <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                  {d.overdueDeadlines.length} bestätigte Frist(en) überfällig. <Link href="/fristen" className="underline">Ansehen</Link>
                </p>
              )}
              {findings.length === 0 && !d.notifications.length ? (
                <p className="text-sm text-muted">Keine Hinweise.</p>
              ) : (
                <ul className="space-y-2">
                  {findings.slice(0, 5).map((f) => (
                    <li key={f.id} className="text-sm">
                      <PriorityBadge priority={f.priority} /> <span className="font-medium">{f.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Abgedeckte Bereiche</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <EmptyState title="Noch keine Verträge" action={<Button asChild size="sm"><Link href="/dokumente?upload=1">Unterlagen hochladen</Link></Button>}>
                  Lade deine Versicherungsunterlagen hoch oder lege einen Vertrag manuell an.
                </EmptyState>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <li key={c}>
                      <Badge tone="primary">{CATEGORY_LABEL[c]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zuletzt verarbeitete Dokumente</CardTitle>
            </CardHeader>
            <CardContent>
              {d.recentDocs.length === 0 ? (
                <p className="text-sm text-muted">Noch keine Dokumente.</p>
              ) : (
                <ul className="space-y-2">
                  {d.recentDocs.map((doc) => (
                    <li key={`${doc.id}-${doc.createdAt.toISOString()}`} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/dokumente/${doc.id}`} className="min-w-0 truncate hover:underline" title={DOC_TYPE_LABEL[doc.docType]}>
                        {doc.title}
                      </Link>
                      <ProcessingBadge status={doc.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Link href="/assistent" className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium hover:border-primary/40">
            KI-Assistent öffnen <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
