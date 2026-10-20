import type { Metadata } from "next";
import { requireViewer } from "@/server/auth/session";
import { savePolicyAction } from "@/server/actions/policies";
import { suggestPolicyFromDocument } from "@/server/services/policies";
import { getDocument } from "@/server/services/documents";
import { PolicyForm } from "@/components/policy-form";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Vertrag anlegen" };

export default async function NewPolicy({ searchParams }: { searchParams: Promise<{ dokument?: string }> }) {
  const viewer = await requireViewer();
  const { dokument } = await searchParams;
  const doc = dokument ? await getDocument(viewer.householdId, dokument) : null;
  const suggestion = doc ? await suggestPolicyFromDocument(viewer.householdId, doc.doc.id) : null;
  const { sources, ...values } = suggestion ?? { sources: {} };
  return (
    <>
      <PageHeader title="Vertrag anlegen" description={doc ? `Vorschlag aus „${doc.doc.title}“ – bitte jede Angabe prüfen.` : "Erfasse die Eckdaten deines Vertrags. Nur der Name und die Art sind Pflicht."} />
      {doc && (
        <Alert tone="info" className="mb-4" title="Automatisch erkannte Angaben">
          Die Felder wurden aus dem Dokument vorbefüllt. Unter jedem Feld siehst du die Fundstelle. Was du übernimmst, wird als „vom Nutzer bestätigt“ gespeichert; Änderungen als „korrigiert“.
        </Alert>
      )}
      <Card>
        <CardContent>
          <PolicyForm action={savePolicyAction.bind(null, null, doc?.doc.id ?? null)} values={values} sources={sources} submitLabel="Vertrag speichern" />
        </CardContent>
      </Card>
    </>
  );
}
