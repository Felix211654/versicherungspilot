import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/session";
import { getClaim } from "@/server/services/claims";
import { saveClaimAction } from "@/server/actions/claims";
import { ClaimForm } from "@/components/claim-form";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sachverhalt bearbeiten" };

export default async function EditClaim({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const data = await getClaim(viewer.householdId, id);
  if (!data) notFound();
  return (
    <>
      <PageHeader title="Sachverhalt ergänzen" />
      <Card>
        <CardContent>
          <ClaimForm action={saveClaimAction.bind(null, id)} values={data.claim} submitLabel="Speichern" />
        </CardContent>
      </Card>
    </>
  );
}
