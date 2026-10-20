import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/server/auth/session";
import { getPolicy } from "@/server/services/policies";
import { savePolicyAction } from "@/server/actions/policies";
import { PolicyForm } from "@/components/policy-form";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Vertrag bearbeiten" };

export default async function EditPolicy({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const data = await getPolicy(viewer.householdId, id);
  if (!data) notFound();
  const p = data.policy;
  return (
    <>
      <PageHeader title={`Bearbeiten: ${p.name}`} />
      <Card>
        <CardContent>
          <PolicyForm action={savePolicyAction.bind(null, id, null)} values={{ ...p, insurerName: data.insurerName }} submitLabel="Änderungen speichern" />
        </CardContent>
      </Card>
    </>
  );
}
