/**
 * Vorlagenbasierte Dokumententwürfe. Bewusst ohne freie KI-Generierung: Es werden
 * ausschließlich bekannte Tatsachen übernommen; fehlende Angaben erscheinen als
 * Platzhalter „[OFFEN: …]“ und werden als offene Punkte gelistet. Nichts wird erfunden.
 */
import { formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { GENERATED_KIND_LABEL } from "@/lib/labels";

export type DraftKind =
  | "claim_report"
  | "damage_description"
  | "evidence_list"
  | "cover_letter"
  | "status_inquiry"
  | "evidence_response"
  | "rejection_explanation_request"
  | "objection"
  | "case_summary";

export type DraftContext = {
  senderName: string;
  claim: {
    title: string;
    description: string;
    occurredOn: string | null;
    occurredAtText: string | null;
    location: string | null;
    ownerOfDamagedItem: string | null;
    causedBy: string | null;
    estimatedDamageCents: number | null;
    insurerClaimNumber: string | null;
    acuteDanger: boolean;
  };
  policy: { name: string; insurerName: string | null; policyNumber: string | null } | null;
  evidence: { description: string; status: string }[];
  communications: { occurredOn: string; direction: string; subject: string; summary: string | null }[];
  assessments: { policyName: string; assessment: string; reason: string | null }[];
  openTasks: string[];
  today: string;
};

const OPEN = (what: string) => `[OFFEN: ${what}]`;

function header(c: DraftContext, subject: string) {
  const to = c.policy?.insurerName ?? OPEN("Name und Anschrift des Versicherers");
  return [
    c.senderName || OPEN("Dein Name und deine Anschrift"),
    OPEN("Deine Anschrift"),
    "",
    to,
    c.policy?.insurerName ? OPEN("Anschrift des Versicherers bzw. Schadenabteilung") : "",
    "",
    `${OPEN("Ort")}, ${formatDate(c.today)}`,
    "",
    `Betreff: ${subject}`,
    `Versicherungsvertrag: ${c.policy?.policyNumber ?? OPEN("Vertrags-/Versicherungsscheinnummer")}${c.policy ? ` (${c.policy.name})` : ""}`,
    c.claim.insurerClaimNumber ? `Schadennummer: ${c.claim.insurerClaimNumber}` : "",
    "",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
}

function facts(c: DraftContext) {
  const when = c.claim.occurredOn ? formatDate(c.claim.occurredOn) : c.claim.occurredAtText || OPEN("Datum (und ggf. Uhrzeit) des Schadens");
  return [
    `Schadentag: ${when}`,
    `Schadenort: ${c.claim.location || OPEN("Ort des Schadens")}`,
    `Eigentümer der beschädigten Sache: ${c.claim.ownerOfDamagedItem || OPEN("Eigentümer, falls relevant")}`,
    `Verursacher: ${c.claim.causedBy || OPEN("Verursacher, falls bekannt")}`,
    `Geschätzte Schadenhöhe: ${c.claim.estimatedDamageCents != null ? `${formatCents(c.claim.estimatedDamageCents)} (vorläufige Schätzung)` : OPEN("geschätzte Schadenhöhe")}`,
  ].join("\n");
}

function evidenceList(c: DraftContext) {
  const available = c.evidence.filter((e) => e.status !== "needed");
  if (!available.length) return `- ${OPEN("Beigefügte Nachweise (z. B. Fotos, Rechnungen)")}`;
  return available.map((e) => `- ${e.description}`).join("\n");
}

const SIGN = (c: DraftContext) => `\nMit freundlichen Grüßen\n\n${c.senderName || OPEN("Name")}`;

export function buildDraft(kind: DraftKind, c: DraftContext): { title: string; content: string; openPoints: string[] } {
  let body: string;
  switch (kind) {
    case "claim_report":
      body = [
        header(c, `Schadenmeldung – ${c.claim.title}`),
        "Sehr geehrte Damen und Herren,",
        "",
        "hiermit melde ich folgenden Schaden:",
        "",
        facts(c),
        "",
        "Schilderung des Hergangs (eigene Angaben):",
        c.claim.description,
        "",
        "Folgende Unterlagen füge ich bei bzw. kann ich nachreichen:",
        evidenceList(c),
        "",
        "Bitte bestätigen Sie mir den Eingang dieser Meldung, teilen Sie mir die Schadennummer mit und informieren Sie mich, welche weiteren Unterlagen Sie benötigen.",
        "",
        "Diese Meldung stellt keine abschließende Bezifferung des Schadens dar.",
        SIGN(c),
      ].join("\n");
      break;
    case "damage_description":
      body = [`Strukturierte Schadenbeschreibung: ${c.claim.title}`, "", facts(c), "", "Hergang (eigene Angaben):", c.claim.description, "", "Akute Gefahr bei Meldung: " + (c.claim.acuteDanger ? "ja" : "nein")].join("\n");
      break;
    case "evidence_list":
      body = [
        `Nachweisliste: ${c.claim.title}`,
        "",
        ...(c.evidence.length ? c.evidence.map((e) => `- [${e.status === "needed" ? "fehlt" : e.status === "submitted" ? "eingereicht" : "vorhanden"}] ${e.description}`) : [`- ${OPEN("Nachweise erfassen")}`]),
      ].join("\n");
      break;
    case "cover_letter":
      body = [header(c, `Unterlagen zum Schadenfall – ${c.claim.title}`), "Sehr geehrte Damen und Herren,", "", "anbei übersende ich Ihnen folgende Unterlagen zu dem oben genannten Schadenfall:", "", evidenceList(c), "", "Bitte bestätigen Sie mir den Eingang.", SIGN(c)].join("\n");
      break;
    case "status_inquiry":
      body = [
        header(c, `Nachfrage zum Bearbeitungsstand – ${c.claim.title}`),
        "Sehr geehrte Damen und Herren,",
        "",
        `am ${OPEN("Datum deiner Schadenmeldung")} habe ich Ihnen den oben genannten Schaden gemeldet. Bislang habe ich ${OPEN("keine Rückmeldung / letzte Rückmeldung vom …")} erhalten.`,
        "",
        "Bitte teilen Sie mir den aktuellen Bearbeitungsstand mit und ob Sie noch Unterlagen benötigen.",
        SIGN(c),
      ].join("\n");
      break;
    case "evidence_response":
      body = [
        header(c, `Ihre Anforderung von Unterlagen – ${c.claim.title}`),
        "Sehr geehrte Damen und Herren,",
        "",
        `mit Schreiben vom ${OPEN("Datum der Anforderung")} baten Sie um weitere Unterlagen. Anbei erhalten Sie:`,
        "",
        evidenceList(c),
        "",
        `${OPEN("Falls einzelne Unterlagen nicht vorliegen: kurze Begründung")}`,
        SIGN(c),
      ].join("\n");
      break;
    case "rejection_explanation_request":
      body = [
        header(c, `Bitte um Erläuterung Ihrer Leistungsentscheidung – ${c.claim.title}`),
        "Sehr geehrte Damen und Herren,",
        "",
        `mit Schreiben vom ${OPEN("Datum der Ablehnung")} haben Sie die Leistung ${OPEN("ganz / teilweise")} abgelehnt.`,
        "",
        "Damit ich Ihre Entscheidung nachvollziehen kann, bitte ich Sie,",
        "- die konkreten Vertragsbestimmungen (Bedingungswerk, Fassung, Klausel) zu benennen, auf die Sie die Ablehnung stützen,",
        "- die Tatsachen zu nennen, von denen Sie dabei ausgehen,",
        "- und mir die maßgeblichen Bedingungen in der für meinen Vertrag geltenden Fassung zu übersenden.",
        "",
        "Meine Rechte behalte ich mir ausdrücklich vor.",
        SIGN(c),
      ].join("\n");
      break;
    case "objection":
      body = [
        header(c, `Einwand gegen Ihre Leistungsentscheidung – ${c.claim.title}`),
        "Sehr geehrte Damen und Herren,",
        "",
        `gegen Ihre Entscheidung vom ${OPEN("Datum der Entscheidung")} erhebe ich Einwände.`,
        "",
        "Begründung:",
        OPEN("Deine Begründung – nur belegbare Tatsachen und konkrete Vertragsklauseln mit Fundstelle. Die App fügt hier bewusst keine rechtlichen Argumente ein."),
        "",
        "Ich bitte um erneute Prüfung und schriftliche Rückmeldung bis zum " + OPEN("angemessene Frist, z. B. 14 Tage") + ".",
        SIGN(c),
      ].join("\n");
      break;
    case "case_summary":
      body = [
        `Fallzusammenfassung (für Rechtsanwalt / Versicherungsberater) – Stand ${formatDate(c.today)}`,
        "",
        "1. Sachverhalt (Angaben des Nutzers)",
        facts(c),
        c.claim.description,
        "",
        "2. Betroffene Verträge und vorläufige Einordnung (keine Rechtsberatung)",
        ...(c.assessments.length ? c.assessments.map((a) => `- ${a.policyName}: ${a.assessment}${a.reason ? ` – ${a.reason}` : ""}`) : ["- Noch keine Vertragsprüfung durchgeführt."]),
        "",
        "3. Kommunikation",
        ...(c.communications.length ? c.communications.map((m) => `- ${formatDate(m.occurredOn)} (${m.direction === "incoming" ? "eingehend" : "ausgehend"}): ${m.subject}${m.summary ? ` – ${m.summary}` : ""}`) : ["- Keine Kommunikation erfasst."]),
        "",
        "4. Nachweise",
        evidenceList(c),
        "",
        "5. Offene Aufgaben",
        ...(c.openTasks.length ? c.openTasks.map((t) => `- ${t}`) : ["- keine"]),
      ].join("\n");
      break;
  }
  const openPoints = [...new Set([...body.matchAll(/\[OFFEN: ([^\]]+)\]/g)].map((m) => m[1]))];
  return { title: `${GENERATED_KIND_LABEL[kind]}: ${c.claim.title}`, content: body, openPoints };
}
