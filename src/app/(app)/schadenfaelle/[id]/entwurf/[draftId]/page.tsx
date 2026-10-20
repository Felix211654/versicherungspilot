import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { getDraft } from "@/server/services/claims";
import { saveDraftAction } from "@/server/actions/claims";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Entwurf" };

export default async function DraftPage({ params }: { params: Promise<{ id: string; draftId: string }> }) {
  const viewer = await requireViewer();
  const { id, draftId } = await params;
  const d = await getDraft(viewer.householdId, draftId);
  if (!d || d.claimId !== id) notFound();
  return (
    <>
      <PageHeader
        title={d.title}
        description={`Entwurf · zuletzt geändert ${formatDateTime(d.updatedAt)} · nicht versendet`}
        actions={
          <>
            <Button asChild variant="secondary">
              <a href={`/api/drafts/${d.id}`}>
                <Download className="h-4 w-4" aria-hidden /> Als Textdatei
              </a>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/schadenfaelle/${id}/entwurf/${d.id}/druck`} target="_blank">
                <Printer className="h-4 w-4" aria-hidden /> Druckansicht / PDF
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/schadenfaelle/${id}`}>Zurück zum Fall</Link>
            </Button>
          </>
        }
      />
      {d.openPoints.length > 0 ? (
        <Alert tone="warning" className="mb-4" title={`${d.openPoints.length} offene Punkte`}>
          <ul className="list-disc pl-5">
            {d.openPoints.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-1">Ersetze die Markierungen [OFFEN: …] durch deine Angaben, bevor du das Schreiben verwendest.</p>
        </Alert>
      ) : (
        <Alert tone="success" className="mb-4">Keine offenen Platzhalter. Bitte vor dem Versand dennoch sorgfältig lesen.</Alert>
      )}
      <Card>
        <CardContent>
          <ActionForm action={saveDraftAction.bind(null, d.id)} className="space-y-3">
            <label htmlFor="content" className="sr-only">
              Inhalt
            </label>
            <Textarea id="content" name="content" defaultValue={d.content} rows={28} className="font-mono text-[13px] leading-relaxed" />
            <SubmitButton>Entwurf speichern</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
