import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Datenschutzhinweise" };

/** VORLAGE – vor einer öffentlichen Bereitstellung rechtlich prüfen und mit Verantwortlichem/Anbietern vervollständigen. */
export default function Privacy() {
  return (
    <main id="main" className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm leading-relaxed">
      <p className="rounded-lg bg-warning-soft px-3 py-2 text-warning">Entwurf/Vorlage: Diese Hinweise müssen vor einem öffentlichen Betrieb vom Verantwortlichen ergänzt und rechtlich geprüft werden.</p>
      <h1 className="text-2xl font-semibold">Datenschutzhinweise</h1>
      <h2 className="text-lg font-semibold">Verantwortlicher</h2>
      <p>[Name, Anschrift, Kontakt des Betreibers – zu ergänzen]</p>
      <h2 className="text-lg font-semibold">Welche Daten wir verarbeiten</h2>
      <p>Kontodaten (Name, E-Mail, Passwort-Hash), von dir hochgeladene Versicherungsunterlagen, daraus erkannte Texte und Vertragsangaben, von dir erfasste Schadenfälle, Fristen und Aufgaben sowie technische Protokolle ohne Dokumentinhalte.</p>
      <h2 className="text-lg font-semibold">Zwecke und Rechtsgrundlagen</h2>
      <p>Bereitstellung der von dir genutzten Funktionen (Art. 6 Abs. 1 lit. b DSGVO). Übermittlung von Dokumentauszügen an einen KI-Anbieter nur nach deiner ausdrücklichen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO; soweit Gesundheitsdaten betroffen sind, Art. 9 Abs. 2 lit. a DSGVO), jederzeit widerrufbar.</p>
      <h2 className="text-lg font-semibold">Sicherheit</h2>
      <p>Übertragung per TLS; Dateien werden mit AES-256-GCM verschlüsselt gespeichert (Schlüssel getrennt vom Speicher). Zugriff nur nach Anmeldung, optional mit Zwei-Faktor-Authentifizierung.</p>
      <h2 className="text-lg font-semibold">Empfänger</h2>
      <p>Hosting-/Speicheranbieter (Auftragsverarbeitung) und – nur nach Einwilligung – der konfigurierte KI-Anbieter. Eine aktuelle Übersicht siehst du in der App unter Einstellungen → KI und externe Dienste. [Konkrete Anbieter, Sitz, Drittlandübermittlung und Garantien – zu ergänzen]</p>
      <h2 className="text-lg font-semibold">Speicherdauer und Löschung</h2>
      <p>Bis zur Löschung durch dich oder der Kontolöschung. Die Kontolöschung entfernt Dateien, Texte, Suchindex, Embeddings und alle abgeleiteten Daten. Sicherungskopien werden nach Ablauf der Aufbewahrungsfrist [z. B. 30 Tage] überschrieben.</p>
      <h2 className="text-lg font-semibold">Deine Rechte</h2>
      <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit (Export in der App), Widerspruch, Widerruf von Einwilligungen sowie Beschwerde bei einer Aufsichtsbehörde.</p>
      <Link href="/" className="text-primary underline">Zurück</Link>
    </main>
  );
}
