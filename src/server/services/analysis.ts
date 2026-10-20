import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db, schema } from "../db";
import { listPolicies } from "./policies";
import { CATEGORY_LABEL } from "@/lib/labels";
import { formatCents } from "@/lib/money";
import { addDays, todayIn } from "@/lib/dates";

/**
 * Regelbasierte Portfolio-Analyse. Jeder Hinweis nennt die angewandte Regel
 * (Nachvollziehbarkeit) – keine Scores, keine automatischen Kündigungsempfehlungen.
 */
export type Finding = {
  id: string;
  priority: "urgent" | "soon" | "info";
  type: "overlap" | "gap" | "missing_document" | "exclusion" | "low_sum" | "high_deductible" | "premium_increase" | "outdated_data" | "review";
  title: string;
  explanation: string;
  rule: string;
  basis: "contract_data" | "general_info";
  links: { label: string; href: string }[];
};

const OVERLAP_PAIRS: [string, string, string][] = [
  ["elektronik", "hausrat", "Elektronikgeräte können teilweise auch über die Hausratversicherung abgedeckt sein (z. B. bei Einbruchdiebstahl). Der Leistungsumfang unterscheidet sich jedoch häufig (z. B. Bruch-/Bedienfehler)."],
  ["reise", "kranken", "Auslandsreise-Krankenschutz kann sowohl in einer Reise- als auch in einer Krankenzusatzversicherung enthalten sein."],
  ["tierhalterhaftpflicht", "privathaftpflicht", "Für manche Tiere (z. B. Katzen, Kleintiere) ist die Haftung oft schon über die Privathaftpflicht abgedeckt; Hunde und Pferde in der Regel nicht."],
];

export async function analyzePortfolio(householdId: string): Promise<Finding[]> {
  const policies = await listPolicies(householdId);
  const active = policies.filter((p) => p.status === "active" || p.status === "needs_review");
  const findings: Finding[] = [];
  const link = (p: { id: string; name: string }) => ({ label: p.name, href: `/versicherungen/${p.id}` });
  const today = todayIn();

  // Mögliche Doppelversicherungen
  const byCat = new Map<string, typeof active>();
  for (const p of active) byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]);
  for (const [cat, list] of byCat) {
    if (cat === "sonstige" || list.length < 2) continue;
    findings.push({
      id: `overlap:${cat}`,
      priority: "soon",
      type: "overlap",
      title: `Mehrere aktive Verträge der Art „${CATEGORY_LABEL[cat]}“`,
      explanation: "Das kann eine Doppelversicherung sein – muss es aber nicht (z. B. unterschiedliche versicherte Personen, Objekte oder Leistungen). Eine Doppelversicherung ist nicht automatisch nutzlos oder unzulässig. Bitte Leistungsumfang vergleichen, bevor du etwas änderst.",
      rule: "Mindestens zwei aktive Verträge derselben Versicherungsart.",
      basis: "contract_data",
      links: list.map(link),
    });
  }
  for (const [a, b, text] of OVERLAP_PAIRS) {
    const la = byCat.get(a);
    const lb = byCat.get(b);
    if (la?.length && lb?.length)
      findings.push({ id: `overlap:${a}:${b}`, priority: "info", type: "overlap", title: `Mögliche Überschneidung: ${CATEGORY_LABEL[a]} und ${CATEGORY_LABEL[b]}`, explanation: text, rule: `Aktive Verträge beider Arten (${CATEGORY_LABEL[a]}, ${CATEGORY_LABEL[b]}).`, basis: "general_info", links: [...la, ...lb].map(link) });
  }

  // Mögliche Lücken (nur sehr verbreitete Basisabsicherung; allgemeine Information)
  if (!byCat.has("privathaftpflicht"))
    findings.push({
      id: "gap:privathaftpflicht",
      priority: "soon",
      type: "gap",
      title: "Keine Privathaftpflichtversicherung hinterlegt",
      explanation: "Eine Privathaftpflicht wird in Verbraucherinformationen allgemein als wichtige Basisabsicherung genannt. Möglicherweise besteht Schutz über einen anderen Vertrag (z. B. Familienvertrag) – dann bitte die Unterlagen hochladen.",
      rule: "Kein aktiver Vertrag der Art Privathaftpflicht vorhanden.",
      basis: "general_info",
      links: [{ label: "Dokument hochladen", href: "/dokumente?upload=1" }],
    });

  // Fehlende Dokumente & veraltete Daten
  const docs = await db
    .select({ policyId: schema.policyDocument.policyId, docType: schema.policyDocument.docType })
    .from(schema.policyDocument)
    .where(eq(schema.policyDocument.householdId, householdId));
  for (const p of active) {
    const types = new Set(docs.filter((d) => d.policyId === p.id).map((d) => d.docType));
    const missing: string[] = [];
    if (!types.has("versicherungsschein") && !types.has("nachtrag")) missing.push("Versicherungsschein");
    if (!types.has("avb")) missing.push("Allgemeine Versicherungsbedingungen");
    if (missing.length)
      findings.push({
        id: `missing:${p.id}`,
        priority: missing.includes("Allgemeine Versicherungsbedingungen") ? "soon" : "info",
        type: "missing_document",
        title: `Unterlagen fehlen: ${p.name}`,
        explanation: `Nicht hinterlegt: ${missing.join(", ")}. Ohne Bedingungen können Fragen zu Deckung und Ausschlüssen nicht belegt beantwortet werden.`,
        rule: "Je aktivem Vertrag sollten Versicherungsschein und Bedingungen hinterlegt sein.",
        basis: "contract_data",
        links: [link(p)],
      });
    const gaps: string[] = [];
    if (p.premiumCents == null || !p.paymentInterval) gaps.push("Beitrag/Zahlungsweise");
    if (!p.endDate) gaps.push("Ablauf/Hauptfälligkeit");
    if (p.noticePeriodMonths == null) gaps.push("Kündigungsfrist");
    if (gaps.length)
      findings.push({ id: `data:${p.id}`, priority: "info", type: "outdated_data", title: `Unvollständige Vertragsdaten: ${p.name}`, explanation: `Es fehlen: ${gaps.join(", ")}. Kosten- und Fristenübersicht sind dadurch unvollständig.`, rule: "Pflichtangaben für Kosten- und Fristenberechnung fehlen.", basis: "contract_data", links: [link(p)] });
    if (p.endDate && p.endDate < today)
      findings.push({ id: `stale:${p.id}`, priority: "soon", type: "outdated_data", title: `Ablaufdatum liegt in der Vergangenheit: ${p.name}`, explanation: "Bitte prüfen, ob sich der Vertrag verlängert hat oder beendet wurde, und die Daten aktualisieren.", rule: "Hinterlegtes Ablaufdatum < heute.", basis: "contract_data", links: [link(p)] });
    if (p.status === "needs_review")
      findings.push({ id: `review:${p.id}`, priority: "soon", type: "review", title: `Vertragsdaten prüfen: ${p.name}`, explanation: "Der Vertrag wurde aus automatisch erkannten Angaben angelegt und ist noch nicht bestätigt.", rule: "Vertragsstatus „Prüfung erforderlich“.", basis: "contract_data", links: [link(p)] });
  }

  // Selbstbeteiligungen, Deckungssummen
  const terms = await db
    .select()
    .from(schema.policyTerm)
    .where(and(eq(schema.policyTerm.householdId, householdId), ne(schema.policyTerm.review, "rejected"), inArray(schema.policyTerm.kind, ["deductible", "coverage", "exclusion"])));
  for (const t of terms) {
    const p = active.find((x) => x.id === t.policyId);
    if (!p) continue;
    if (t.kind === "deductible" && (t.amountCents ?? 0) >= 50_000)
      findings.push({ id: `sb:${t.id}`, priority: "info", type: "high_deductible", title: `Hohe Selbstbeteiligung: ${formatCents(t.amountCents)} (${p.name})`, explanation: "Eine hohe Selbstbeteiligung senkt meist den Beitrag, bedeutet aber höhere Eigenkosten im Schadenfall. Ob das passt, hängt von deiner Situation ab.", rule: "App-Regel: Hinweis ab 500 € Selbstbeteiligung.", basis: "contract_data", links: [link(p)] });
    if (t.kind === "coverage" && p.category === "privathaftpflicht" && t.amountCents != null && t.amountCents < 1_000_000_000)
      findings.push({ id: `sum:${t.id}`, priority: "soon", type: "low_sum", title: `Deckungssumme ${formatCents(t.amountCents)} (${p.name})`, explanation: "Bei Personenschäden können sehr hohe Forderungen entstehen. Prüfe, ob die Deckungssumme für dich ausreicht.", rule: "App-Regel: Hinweis, wenn die Privathaftpflicht-Deckungssumme unter 10 Mio. € liegt.", basis: "contract_data", links: [link(p)] });
  }

  // Beitragssteigerungen aus Dokumenten (gleicher Vertrag, verschiedene Beiträge über die Zeit)
  const premiumFacts = await db
    .select({ policyId: schema.policyDocument.policyId, valueJson: schema.extractedFact.valueJson, documentDate: schema.policyDocument.documentDate, createdAt: schema.policyDocument.createdAt })
    .from(schema.extractedFact)
    .innerJoin(schema.policyDocument, eq(schema.policyDocument.id, schema.extractedFact.documentId))
    .where(and(eq(schema.extractedFact.householdId, householdId), eq(schema.extractedFact.field, "premium"), ne(schema.extractedFact.review, "rejected")))
    .orderBy(asc(schema.policyDocument.documentDate), asc(schema.policyDocument.createdAt));
  for (const p of active) {
    const series = premiumFacts
      .filter((f) => f.policyId === p.id)
      .map((f) => f.valueJson as { cents?: number; interval?: string | null })
      .filter((v) => v.cents && v.interval);
    if (series.length >= 2) {
      const first = series[0];
      const last = series[series.length - 1];
      if (first.interval === last.interval && last.cents! > first.cents! * 1.1)
        findings.push({ id: `inc:${p.id}`, priority: "info", type: "premium_increase", title: `Beitrag gestiegen: ${p.name}`, explanation: `Laut Unterlagen von ${formatCents(first.cents)} auf ${formatCents(last.cents)} (${Math.round((last.cents! / first.cents! - 1) * 100)} %). Bei Beitragserhöhungen besteht oft ein Sonderkündigungsrecht – bitte im Schreiben prüfen.`, rule: "Beitrag in späterem Dokument > 10 % höher als im früheren Dokument (gleiches Zahlungsintervall).", basis: "contract_data", links: [link(p)] });
    }
  }
  const order = { urgent: 0, soon: 1, info: 2 };
  return findings.sort((a, b) => order[a.priority] - order[b.priority]);
}

export async function dashboardData(householdId: string) {
  const today = todayIn();
  const [policies, deadlines, claims, tasks, recentDocs, notifications] = await Promise.all([
    listPolicies(householdId),
    db
      .select({ d: schema.contractDeadline, policyName: schema.insurancePolicy.name })
      .from(schema.contractDeadline)
      .leftJoin(schema.insurancePolicy, eq(schema.insurancePolicy.id, schema.contractDeadline.policyId))
      .where(and(eq(schema.contractDeadline.householdId, householdId), inArray(schema.contractDeadline.status, ["open", "needs_confirmation"])))
      .orderBy(asc(schema.contractDeadline.dueDate))
      .limit(50),
    db
      .select()
      .from(schema.claim)
      .where(and(eq(schema.claim.householdId, householdId), ne(schema.claim.status, "closed")))
      .orderBy(desc(schema.claim.updatedAt)),
    db
      .select()
      .from(schema.task)
      .where(and(eq(schema.task.householdId, householdId), eq(schema.task.status, "open")))
      .orderBy(asc(schema.task.priority), asc(schema.task.dueDate), asc(schema.task.createdAt))
      .limit(8),
    db
      .select({ id: schema.policyDocument.id, title: schema.policyDocument.title, docType: schema.policyDocument.docType, status: schema.documentVersion.status, createdAt: schema.documentVersion.createdAt })
      .from(schema.documentVersion)
      .innerJoin(schema.policyDocument, eq(schema.policyDocument.id, schema.documentVersion.documentId))
      .where(eq(schema.documentVersion.householdId, householdId))
      .orderBy(desc(schema.documentVersion.createdAt))
      .limit(5),
    db
      .select()
      .from(schema.notification)
      .where(and(eq(schema.notification.householdId, householdId), isNull(schema.notification.readAt)))
      .orderBy(desc(schema.notification.createdAt))
      .limit(5),
  ]);
  const active = policies.filter((p) => p.status === "active" || p.status === "needs_review");
  const withCost = active.filter((p) => p.cost);
  const yearlyCents = withCost.reduce((a, p) => a + p.cost!.yearlyCents, 0);
  const horizon = addDays(today, 60);
  return {
    policies: active,
    policyCount: active.length,
    yearlyCents,
    monthlyCents: Math.round(yearlyCents / 12),
    policiesWithoutPremium: active.length - withCost.length,
    upcomingDeadlines: deadlines.filter((x) => x.d.dueDate <= horizon),
    overdueDeadlines: deadlines.filter((x) => x.d.dueDate < today && x.d.status === "open"),
    unconfirmedDeadlines: deadlines.filter((x) => x.d.status === "needs_confirmation").length,
    claims,
    tasks,
    recentDocs,
    notifications,
    today,
  };
}
