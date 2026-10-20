import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireViewer } from "@/server/auth/session";
import { listDocuments } from "@/server/services/documents";
import { listPolicies } from "@/server/services/policies";
import { completeOnboardingAction } from "@/server/actions/settings";
import { integrationStatus } from "@/server/env";
import { db, schema } from "@/server/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ActionButton } from "@/components/action-form";
import { UploadZone } from "@/components/upload-zone";
import { ProcessingBadge } from "@/components/status";
import { TwoFactorSettings } from "../einstellungen/two-factor";
import { CATEGORY_LABEL } from "@/lib/labels";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Einrichtung" };

const STEPS = ["Willkommen", "Sicherheit", "Unterlagen", "So funktioniert die Analyse", "Angaben prüfen", "Deine Übersicht", "Erste Fragen"];

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ schritt?: string }> }) {
  const viewer = await requireViewer();
  const step = Math.min(Math.max(Number((await searchParams).schritt) || 1, 1), 7);
  const [docs, policies, [settings]] = await Promise.all([
    step >= 5 ? listDocuments(viewer.householdId) : Promise.resolve([]),
    step === 6 ? listPolicies(viewer.householdId) : Promise.resolve([]),
    db.select({ consent: schema.userSettings.aiProcessingConsentAt }).from(schema.userSettings).where(eq(schema.userSettings.userId, viewer.userId)),
  ]);
  const ai = integrationStatus().ai;
  const nav = (
    <div className="mt-6 flex justify-between gap-2">
      {step > 1 ? (
        <Button asChild variant="ghost">
          <Link href={`/onboarding?schritt=${step - 1}`}>Zurück</Link>
        </Button>
      ) : (
        <span />
      )}
      {step < 7 ? (
        <Button asChild>
          <Link href={`/onboarding?schritt=${step + 1}`}>Weiter</Link>
        </Button>
      ) : (
        <ActionButton action={completeOnboardingAction}>Einrichtung abschließen</ActionButton>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-6 flex flex-wrap gap-1" aria-label="Fortschritt">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i + 1 === step ? "step" : undefined} className={cn("h-1.5 flex-1 rounded-full", i + 1 <= step ? "bg-primary" : "bg-border")} title={s} />
        ))}
      </ol>
      <p className="text-xs uppercase tracking-wide text-muted">
        Schritt {step} von 7 · {STEPS[step - 1]}
      </p>
      <Card className="mt-2">
        <CardContent className="space-y-4 py-6">
          {step === 1 && (
            <>
              <h1 className="text-2xl font-semibold">Willkommen bei VersicherungsPilot</h1>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Alle Versicherungsunterlagen an einem Ort – verschlüsselt gespeichert.</li>
                <li>Verträge werden automatisch erkannt; du prüfst und bestätigst die Angaben.</li>
                <li>Fragen in Alltagssprache, beantwortet aus deinen eigenen Unterlagen – mit Fundstellen.</li>
                <li>Schadenfälle strukturiert vorbereiten, Fristen im Blick behalten.</li>
              </ul>
              <Alert tone="info">Die App ersetzt keine Rechts- oder Versicherungsberatung. Einschätzungen sind vorläufig; verbindlich entscheidet der Versicherer.</Alert>
              <p className="text-sm text-muted">Du kannst jederzeit überspringen und später fortfahren.</p>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="text-xl font-semibold">Konto absichern</h1>
              <p className="text-sm text-muted">Deine Unterlagen enthalten sensible Daten. Wir empfehlen die Zwei-Faktor-Authentifizierung.</p>
              <TwoFactorSettings enabled={viewer.twoFactorEnabled} />
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-xl font-semibold">Erste Unterlagen hochladen</h1>
              <p className="text-sm text-muted">Am besten: Versicherungsschein (Police) und Versicherungsbedingungen je Vertrag. Fotos und Scans funktionieren auch.</p>
              <UploadZone />
            </>
          )}
          {step === 4 && (
            <>
              <h1 className="text-xl font-semibold">So funktioniert die Analyse – und ihre Grenzen</h1>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                <li>Text wird aus digitalen PDFs gelesen; Scans und Fotos per Texterkennung (OCR). OCR kann Fehler enthalten.</li>
                <li>Versicherer, Vertragsnummer, Beitrag, Laufzeit, Kündigungsfrist u. a. werden per Regeln erkannt – immer mit Fundstelle und als „automatisch erkannt“ markiert, bis du sie bestätigst.</li>
                <li>Fristen, die nur berechnet oder unsicher erkannt wurden, musst du bestätigen.</li>
                <li>
                  KI-Funktionen: {ai.configured ? (settings?.consent ? `aktiv (${ai.detail}).` : `verfügbar (${ai.detail}) – erst nach deiner Einwilligung in den Einstellungen.`) : "derzeit nicht konfiguriert. Suche und Fundstellen funktionieren trotzdem."}
                </li>
                <li>Fehlen Unterlagen, bedeutet das nicht, dass kein Versicherungsschutz besteht.</li>
              </ul>
            </>
          )}
          {step === 5 && (
            <>
              <h1 className="text-xl font-semibold">Erkannte Angaben prüfen</h1>
              {docs.length === 0 ? (
                <p className="text-sm text-muted">Noch keine Dokumente hochgeladen.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <Link href={`/dokumente/${d.id}`} className="hover:underline">
                        {d.title}
                      </Link>
                      <ProcessingBadge status={d.status} />
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-muted">Öffne Dokumente mit „Bitte Angaben prüfen“, bestätige oder korrigiere die Werte und lege daraus einen Vertrag an.</p>
            </>
          )}
          {step === 6 && (
            <>
              <h1 className="text-xl font-semibold">Deine Versicherungsübersicht</h1>
              {policies.length === 0 ? (
                <p className="text-sm text-muted">Noch keine Verträge angelegt – das ist in Ordnung. Du kannst Verträge jederzeit aus Dokumenten oder manuell anlegen.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {policies.map((p) => (
                    <li key={p.id}>
                      <Link href={`/versicherungen/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>{" "}
                      <span className="text-muted">· {CATEGORY_LABEL[p.category]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {step === 7 && (
            <>
              <h1 className="text-xl font-semibold">Probier den Assistenten aus</h1>
              <ul className="space-y-2">
                {["Welche Versicherungen habe ich und was kosten sie im Jahr?", "Welche meiner Verträge haben eine Selbstbeteiligung?", "Wann kann ich meine Hausratversicherung kündigen?"].map((q) => (
                  <li key={q}>
                    <Link href={`/assistent?q=${encodeURIComponent(q)}`} className="block rounded-lg border border-border px-3 py-2 text-sm hover:border-primary/40">
                      {q}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {nav}
        </CardContent>
      </Card>
    </div>
  );
}
