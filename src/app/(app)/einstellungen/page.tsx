import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Download } from "lucide-react";
import { requireViewer } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { integrationStatus } from "@/server/env";
import { deleteAccountAction, saveNotificationSettingsAction, setAiConsentAction } from "@/server/actions/settings";
import { PageHeader, DefinitionList } from "@/components/ui/misc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/form";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import { TwoFactorSettings } from "./two-factor";
import { formatDateTime } from "@/lib/dates";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const [[settings], [u]] = await Promise.all([
    db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, viewer.userId)),
    db.select({ createdAt: schema.user.createdAt }).from(schema.user).where(eq(schema.user.id, viewer.userId)),
  ]);
  const integ = integrationStatus();
  const services = [
    { name: "KI-Textgenerierung", s: integ.ai, data: "Relevante Textauszüge aus deinen Dokumenten, deine Frage bzw. Fallbeschreibung, Vertragsübersicht ohne Vertragsnummern und Personennamen – nur nach Einwilligung." },
    { name: "Embeddings (semantische Suche)", s: integ.embeddings, data: "Textabschnitte deiner Dokumente zur Indexierung – nur wenn konfiguriert." },
    { name: "Virenscan", s: integ.malware, data: "Hochgeladene Dateien (selbst betriebener ClamAV-Dienst)." },
    { name: "Dateiablage", s: integ.storage, data: "Dateien ausschließlich verschlüsselt (AES-256-GCM, Schlüssel bleibt in der App)." },
    { name: "E-Mail", s: integ.email, data: "–" },
  ];

  return (
    <>
      <PageHeader title="Einstellungen & Datenschutz" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Konto</CardTitle>
          </CardHeader>
          <CardContent>
            <DefinitionList items={[{ label: "Name", value: viewer.name }, { label: "E-Mail", value: viewer.email }, { label: "Registriert", value: formatDateTime(u?.createdAt) }]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sicherheit</CardTitle>
            <Badge tone={viewer.twoFactorEnabled ? "success" : "warning"}>{viewer.twoFactorEnabled ? "2FA aktiv" : "2FA aus"}</Badge>
          </CardHeader>
          <CardContent>
            <TwoFactorSettings enabled={viewer.twoFactorEnabled} />
          </CardContent>
        </Card>

        <Card id="datenschutz" className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>KI und externe Dienste</CardTitle>
              <CardDescription>Transparenz darüber, welche Dienste Daten erhalten. Nicht konfigurierte Dienste erhalten nichts.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Dienst</th>
                    <th className="py-2 pr-3 font-medium">Status</th>
                    <th className="py-2 font-medium">Welche Daten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {services.map((x) => (
                    <tr key={x.name}>
                      <td className="py-2 pr-3 align-top font-medium">{x.name}</td>
                      <td className="py-2 pr-3 align-top">
                        <Badge tone={x.s.configured ? "success" : "neutral"}>{x.s.configured ? "aktiv" : "nicht konfiguriert"}</Badge>
                        <p className="mt-1 text-xs text-muted">{x.s.detail}</p>
                      </td>
                      <td className="py-2 align-top text-text/85">{x.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium">Einwilligung zur KI-Verarbeitung</p>
              <p className="mt-1 text-sm text-muted">
                Für KI-Antworten, Fallprüfungen und Dokumentzusammenfassungen werden jeweils nur die für die konkrete Aufgabe nötigen Textauszüge an den konfigurierten KI-Anbieter übertragen. Die Daten werden nicht zum Training verwendet (gemäß Anbieterbedingungen für API-Kunden; vor Produktivbetrieb vertraglich prüfen). Widerruf jederzeit möglich.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {settings?.aiProcessingConsentAt ? (
                  <>
                    <Badge tone="success">erteilt am {formatDateTime(settings.aiProcessingConsentAt)}</Badge>
                    <ActionButton action={setAiConsentAction.bind(null, false)} variant="secondary" size="sm">
                      Einwilligung widerrufen
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <Badge>nicht erteilt</Badge>
                    <ActionButton action={setAiConsentAction.bind(null, true)} size="sm">
                      Einwilligung erteilen
                    </ActionButton>
                  </>
                )}
              </div>
              {!integ.ai.configured && <p className="mt-2 text-xs text-muted">Hinweis: Derzeit ist kein KI-Anbieter konfiguriert – auch mit Einwilligung werden keine Daten übertragen.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Erinnerungen</CardTitle>
              <CardDescription>Für bestätigte Fristen, als Benachrichtigung in der App.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveNotificationSettingsAction} className="space-y-3">
              <Field id="offsets" label="Tage vor einer Frist" hint="Kommagetrennt, z. B. 30, 14, 7">
                <Input id="offsets" name="offsets" defaultValue={(settings?.reminderOffsetsDays ?? [30, 14, 7]).join(", ")} />
              </Field>
              <Field id="timezone" label="Zeitzone">
                <Input id="timezone" name="timezone" defaultValue={settings?.timezone ?? "Europe/Berlin"} />
              </Field>
              <p className="text-xs text-muted">E-Mail-Benachrichtigungen: {integ.email.detail}.</p>
              <SubmitButton variant="secondary">Speichern</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Deine Daten</CardTitle>
              <CardDescription>Export und Löschung nach DSGVO.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm">ZIP mit allen Originaldateien, strukturierten Daten (JSON), Quellenreferenzen, Fristen, Schadenfällen, Entwürfen und CSV-Übersichten.</p>
              <Button asChild variant="secondary" className="mt-2">
                <a href="/api/export">
                  <Download className="h-4 w-4" aria-hidden /> Datenexport herunterladen
                </a>
              </Button>
            </div>
            <details className="rounded-lg border border-danger/30 p-3">
              <summary className="cursor-pointer text-sm font-medium text-danger">Konto endgültig löschen</summary>
              <Alert tone="danger" className="my-3">
                Gelöscht werden: alle Dokumente und Versionen (inkl. verschlüsselter Dateien), erkannte Texte, Suchindex und Embeddings, Vertragsdaten, Fristen, Schadenfälle, Entwürfe, KI-Analysen, Chats, Protokolle und dein Zugang. Datensicherungen werden gemäß Betriebsdokumentation nach Ablauf der Aufbewahrungsfrist überschrieben. Exportiere vorher ggf. deine Daten.
              </Alert>
              <ActionForm action={deleteAccountAction} className="space-y-3">
                <Field id="del-pw" label="Passwort">
                  <Input id="del-pw" name="password" type="password" autoComplete="current-password" required />
                </Field>
                <Field id="del-confirm" label="Zur Bestätigung LÖSCHEN eingeben">
                  <Input id="del-confirm" name="confirm" autoComplete="off" required />
                </Field>
                <SubmitButton variant="danger" pendingText="Wird gelöscht …">
                  Konto und alle Daten löschen
                </SubmitButton>
              </ActionForm>
            </details>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
