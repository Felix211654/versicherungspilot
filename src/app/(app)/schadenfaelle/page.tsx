import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Plus } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { listClaims } from "@/server/services/claims";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClaimStatusBadge } from "@/components/status";
import { formatDate, formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Schadenfälle" };

export default async function ClaimsPage() {
  const viewer = await requireViewer();
  const claims = await listClaims(viewer.householdId);
  return (
    <>
      <PageHeader
        title="Schadenfälle"
        description="Prüfen, vorbereiten und nachverfolgen. Die App versendet nichts – Meldungen reichst du selbst ein."
        actions={
          <Button asChild>
            <Link href="/schadenfaelle/neu">
              <Plus className="h-4 w-4" aria-hidden /> Neuer Schadenfall
            </Link>
          </Button>
        }
      />
      {claims.length === 0 ? (
        <EmptyState icon={<AlertCircle className="h-8 w-8" />} title="Keine Schadenfälle" action={<Button asChild><Link href="/schadenfaelle/neu">Fall anlegen</Link></Button>}>
          Beschreibe, was passiert ist – der Assistent prüft, welche deiner Versicherungen infrage kommen und was zu tun ist.
        </EmptyState>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {claims.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link href={`/schadenfaelle/${c.id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {c.occurredOn ? `Schadentag ${formatDate(c.occurredOn)} · ` : ""}zuletzt geändert {formatDateTime(c.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {c.acuteDanger && <Badge tone="danger">akut</Badge>}
                    <ClaimStatusBadge status={c.status} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
