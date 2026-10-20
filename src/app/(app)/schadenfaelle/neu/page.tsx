import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/session";
import { saveClaimAction } from "@/server/actions/claims";
import { ClaimForm } from "@/components/claim-form";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Neuer Schadenfall" };

export default async function NewClaim({ searchParams }: { searchParams: Promise<{ beschreibung?: string }> }) {
  await requireViewer();
  const { beschreibung } = await searchParams;
  return (
    <>
      <PageHeader title="Neuer Schadenfall" description="Erfasse zunächst nur, was du weißt. Fehlende Angaben fragt der Assistent gezielt nach." />
      <Card>
        <CardContent>
          <ClaimForm action={saveClaimAction.bind(null, null)} values={{ description: beschreibung }} submitLabel="Fall anlegen" />
        </CardContent>
      </Card>
    </>
  );
}
