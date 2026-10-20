import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { listPolicies } from "@/server/services/policies";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CATEGORY_LABEL, INTERVAL_LABEL } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Meine Versicherungen" };

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "neutral" }> = {
  active: { label: "aktiv", tone: "success" },
  needs_review: { label: "Prüfung erforderlich", tone: "warning" },
  cancelled: { label: "gekündigt", tone: "neutral" },
  expired: { label: "abgelaufen", tone: "neutral" },
};

export default async function PoliciesPage() {
  const viewer = await requireViewer();
  const policies = await listPolicies(viewer.householdId);
  return (
    <>
      <PageHeader
        title="Meine Versicherungen"
        description="Alle Verträge mit den wichtigsten Eckdaten. Kosten werden nachvollziehbar auf Jahreswerte umgerechnet."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/dokumente?upload=1">Aus Dokument anlegen</Link>
            </Button>
            <Button asChild>
              <Link href="/versicherungen/neu">
                <Plus className="h-4 w-4" aria-hidden /> Vertrag anlegen
              </Link>
            </Button>
          </>
        }
      />
      {policies.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="Noch keine Verträge" action={<Button asChild><Link href="/dokumente?upload=1">Unterlagen hochladen</Link></Button>}>
          Lade eine Police hoch – die erkannten Daten kannst du anschließend prüfen und als Vertrag übernehmen. Oder lege einen Vertrag manuell an.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Vertrag</th>
                  <th className="px-4 py-3 font-medium">Art</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Versicherer</th>
                  <th className="px-4 py-3 text-right font-medium">Beitrag</th>
                  <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">pro Jahr*</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Ablauf</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {policies.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <Link href={`/versicherungen/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{CATEGORY_LABEL[p.category]}</td>
                    <td className="hidden px-4 py-3 md:table-cell">{p.insurerName ?? "–"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.premiumCents != null ? `${formatCents(p.premiumCents)} ${p.paymentInterval ? INTERVAL_LABEL[p.paymentInterval] : ""}` : "–"}
                    </td>
                    <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{p.cost ? formatCents(p.cost.yearlyCents) : "–"}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">{formatDate(p.endDate)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-4 py-2 text-xs text-muted">* Rechnerischer Jahreswert (Beitrag × Zahlungen pro Jahr), nicht zwingend identisch mit tatsächlich gezahlten Beträgen.</p>
        </Card>
      )}
    </>
  );
}
