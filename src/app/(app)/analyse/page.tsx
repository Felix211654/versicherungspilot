import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/server/auth/session";
import { analyzePortfolio } from "@/server/services/analysis";
import { getPolicy, listPolicies } from "@/server/services/policies";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { PriorityBadge } from "@/components/status";
import { CATEGORY_LABEL, INTERVAL_LABEL, TERM_KIND_LABEL } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Analyse & Optimierung" };

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const [findings, policies] = await Promise.all([analyzePortfolio(viewer.householdId), listPolicies(viewer.householdId)]);
  const active = policies.filter((p) => p.status === "active" || p.status === "needs_review");
  const total = active.reduce((a, p) => a + (p.cost?.yearlyCents ?? 0), 0);
  const missing = active.filter((p) => !p.cost).length;
  const [ca, cb] = await Promise.all([sp.a ? getPolicy(viewer.householdId, sp.a) : null, sp.b ? getPolicy(viewer.householdId, sp.b) : null]);
  const compare = [ca, cb].filter(Boolean) as NonNullable<typeof ca>[];

  return (
    <>
      <PageHeader title="Analyse & Optimierung" description="Hinweise zur Prüfung – keine automatischen Empfehlungen zur Kündigung. Jeder Hinweis nennt die zugrunde liegende Regel." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Hinweise ({findings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {findings.length === 0 ? (
                <p className="text-sm text-muted">Keine Hinweise. Mit mehr Unterlagen und vollständigen Vertragsdaten wird die Analyse genauer.</p>
              ) : (
                <ul className="space-y-3">
                  {findings.map((f) => (
                    <li key={f.id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={f.priority} />
                        <span className="font-medium">{f.title}</span>
                        {f.basis === "general_info" && <Badge>allgemeine Information</Badge>}
                      </div>
                      <p className="mt-1 text-text/85">{f.explanation}</p>
                      <p className="mt-1 text-xs text-muted">Regel: {f.rule}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {f.links.map((l) => (
                          <Link key={l.href + l.label} href={l.href} className="text-xs text-primary underline">
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Vertragsvergleich</CardTitle>
                <CardDescription>Zwei eigene Verträge nebeneinander. Fehlende Angaben sind gekennzeichnet; es werden keine Aussagen zur Marktüblichkeit getroffen.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Select name="a" defaultValue={sp.a ?? ""} aria-label="Vertrag A">
                  <option value="">Vertrag A wählen</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Select name="b" defaultValue={sp.b ?? ""} aria-label="Vertrag B">
                  <option value="">Vertrag B wählen</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Button type="submit" variant="secondary">
                  Vergleichen
                </Button>
              </form>
              {compare.length === 2 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="py-2 pr-3 font-medium text-muted">Kriterium</th>
                        {compare.map((c) => (
                          <th key={c.policy.id} className="py-2 pr-3 font-medium">
                            {c.policy.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        ["Art", (c: (typeof compare)[number]) => CATEGORY_LABEL[c.policy.category]],
                        ["Versicherer", (c: (typeof compare)[number]) => c.insurerName ?? null],
                        ["Beitrag", (c: (typeof compare)[number]) => (c.policy.premiumCents != null ? `${formatCents(c.policy.premiumCents)} ${c.policy.paymentInterval ? INTERVAL_LABEL[c.policy.paymentInterval] : ""}` : null)],
                        ...(["coverage", "deductible", "sublimit", "exclusion", "waiting_period"] as const).map(
                          (k) =>
                            [
                              TERM_KIND_LABEL[k],
                              (c: (typeof compare)[number]) => {
                                const t = c.terms.filter((x) => x.term.kind === k);
                                return t.length ? t.map((x) => `${x.term.title}${x.term.amountCents != null ? ` (${formatCents(x.term.amountCents)})` : ""}`).join("; ") : null;
                              },
                            ] as const,
                        ),
                        ["Ablauf", (c: (typeof compare)[number]) => (c.policy.endDate ? formatDate(c.policy.endDate) : null)],
                        ["Kündigungsfrist", (c: (typeof compare)[number]) => (c.policy.noticePeriodMonths != null ? `${c.policy.noticePeriodMonths} Monat(e)` : null)],
                      ].map(([label, fn]) => (
                        <tr key={label as string}>
                          <td className="py-2 pr-3 align-top text-muted">{label as string}</td>
                          {compare.map((c) => {
                            const v = (fn as (c: (typeof compare)[number]) => string | null)(c);
                            return (
                              <td key={c.policy.id} className="py-2 pr-3 align-top">
                                {v ?? <span className="text-warning">keine Angabe</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Kostenübersicht</CardTitle>
              <CardDescription>Rechnerische Werte aus Beitrag × Zahlungen pro Jahr.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="divide-y divide-border text-sm">
              {active.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/versicherungen/${p.id}`} className="min-w-0 truncate hover:underline">
                    {p.name}
                  </Link>
                  <span className="tabular-nums">{p.cost ? formatCents(p.cost.yearlyCents) : <span className="text-warning">fehlt</span>}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-border pt-3 font-medium">
              <span>Summe pro Jahr</span>
              <span className="tabular-nums">{formatCents(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted">
              <span>entspricht pro Monat</span>
              <span className="tabular-nums">{formatCents(Math.round(total / 12))}</span>
            </div>
            {missing > 0 && <p className="text-xs text-warning">{missing} Vertrag/Verträge ohne Beitragsangabe sind nicht enthalten.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
