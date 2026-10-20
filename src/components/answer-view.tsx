import Link from "next/link";
import { BookOpen, Info, ShieldAlert } from "lucide-react";
import type { AnswerStatement, StructuredAnswer, VerifiedCitation } from "@/lib/answer-types";
import { AssessmentBadge } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { DOC_TYPE_LABEL } from "@/lib/labels";

const BASIS_LABEL: Record<AnswerStatement["basis"], string> = {
  contract: "Vertrag",
  law: "Gesetz (allgemein)",
  general: "allgemeine Information",
  assumption: "Annahme",
};

function sourceHref(a: StructuredAnswer, c: VerifiedCitation) {
  const s = a.sources.find((x) => x.id === c.sourceId);
  if (!s) return "#";
  return `/dokumente/${s.documentId}?seite=${s.pageStart}&zitat=${encodeURIComponent(c.quote.slice(0, 120))}#seite-${s.pageStart}`;
}

function Citations({ a, cits }: { a: StructuredAnswer; cits: VerifiedCitation[] }) {
  if (!cits.length) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {cits.map((c, i) => {
        const s = a.sources.find((x) => x.id === c.sourceId);
        return (
          <li key={i} className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs">
            <Link href={sourceHref(a, c)} className="font-medium text-primary underline-offset-4 hover:underline">
              <BookOpen className="mr-1 inline h-3 w-3" aria-hidden />
              {s ? `${s.documentTitle}, S. ${s.pageStart}${s.pageEnd !== s.pageStart ? `–${s.pageEnd}` : ""}${s.heading ? ` · ${s.heading}` : ""}` : c.sourceId}
            </Link>
            <blockquote className="mt-1 border-l-2 border-border pl-2 italic text-muted">„{c.quote}“</blockquote>
          </li>
        );
      })}
    </ul>
  );
}

function StatementList({ a, items }: { a: StructuredAnswer; items: AnswerStatement[] }) {
  return (
    <ul className="space-y-3">
      {items.map((s, i) => (
        <li key={i} className="text-sm">
          <div className="flex flex-wrap items-start gap-2">
            <span className="flex-1">{s.text}</span>
            <Badge tone={s.basis === "contract" ? (s.unverified ? "warning" : "primary") : "neutral"}>{BASIS_LABEL[s.basis]}</Badge>
          </div>
          {s.unverified && <p className="mt-1 text-xs text-warning">Für diese Aussage wurde kein überprüfbarer Beleg in deinen Unterlagen gefunden – nicht als Vertragsinhalt behandeln.</p>}
          <Citations a={a} cits={s.citations} />
        </li>
      ))}
    </ul>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">
        <span className="mr-1 text-muted">{n}.</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function AnswerView({ answer: a }: { answer: StructuredAnswer }) {
  const bySection = (s: AnswerStatement["section"]) => a.statements.filter((x) => x.section === s);
  const contract = [...bySection("contract_basis"), ...bySection("assessment")].filter((x) => x.basis === "contract" || x.basis === "assumption");
  const general = a.statements.filter((x) => x.basis === "general" || x.basis === "law");
  const req = bySection("requirements").filter((x) => x.basis === "contract" || x.basis === "assumption");
  const excl = bySection("exclusions").filter((x) => x.basis === "contract" || x.basis === "assumption");
  let n = 0;
  return (
    <div className="space-y-5">
      {a.notice && <Alert tone="warning">{a.notice}</Alert>}
      <Section n={++n} title="Kurzantwort">
        <p className="text-sm">{a.shortAnswer}</p>
      </Section>

      {a.policies.length > 0 && (
        <Section n={++n} title="Vorläufige Einschätzung je Versicherung">
          <ul className="space-y-3">
            {a.policies.map((p) => (
              <li key={p.policyId} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/versicherungen/${p.policyId}`} className="font-medium hover:underline">
                    {p.policyName}
                  </Link>
                  <AssessmentBadge assessment={p.assessment} />
                </div>
                <p className="mt-1 text-sm text-text/85">{p.reason}</p>
                {p.downgraded && <p className="mt-1 text-xs text-warning">Auf „ungeklärt“ gesetzt, weil kein überprüfbarer Beleg vorlag.</p>}
                <Citations a={a} cits={p.citations} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">Keine Leistungszusage. Verbindlich entscheidet nur der Versicherer.</p>
        </Section>
      )}

      {contract.length > 0 && (
        <Section n={++n} title="Vertragsgrundlage">
          <StatementList a={a} items={contract} />
        </Section>
      )}
      {req.length > 0 && (
        <Section n={++n} title="Voraussetzungen">
          <StatementList a={a} items={req} />
        </Section>
      )}
      {excl.length > 0 && (
        <Section n={++n} title="Ausschlüsse und Einschränkungen">
          <StatementList a={a} items={excl} />
        </Section>
      )}
      {a.missingInformation.length > 0 && (
        <Section n={++n} title="Fehlende Informationen">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {a.missingInformation.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Section>
      )}
      {a.nextSteps.length > 0 && (
        <Section n={++n} title="Empfohlene nächste Schritte">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {a.nextSteps.map((s, i) => (
              <li key={i}>
                {s.urgent && (
                  <Badge tone="danger" className="mr-1">
                    sofort
                  </Badge>
                )}
                {s.step}
              </li>
            ))}
          </ol>
        </Section>
      )}
      {a.deadlines.length > 0 && (
        <Section n={++n} title="Fristen">
          <ul className="space-y-2 text-sm">
            {a.deadlines.map((d, i) => (
              <li key={i}>
                <Badge tone={d.status === "documented" ? "primary" : "warning"} className="mr-1">
                  {d.status === "documented" ? "belegt" : "noch zu prüfen"}
                </Badge>
                {d.text}
                <Citations a={a} cits={d.citations} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      {a.evidence.length > 0 && (
        <Section n={++n} title="Mögliche Nachweise">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {a.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Section>
      )}
      {a.draftSuggestions.length > 0 && (
        <Section n={++n} title="Vorbereitung">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {a.draftSuggestions.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Section>
      )}
      {general.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-muted p-3">
          <p className="mb-2 flex items-center gap-1 text-sm font-semibold">
            <Info className="h-4 w-4" aria-hidden /> Allgemeine Informationen – kein nachgewiesener Vertragsinhalt
          </p>
          <StatementList a={a} items={general} />
          <p className="mt-2 text-xs text-muted">Gesetzliche Angaben ohne Gewähr auf Aktualität; im Zweifel unter gesetze-im-internet.de prüfen.</p>
        </div>
      )}
      {a.uncertainties.length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">
          <p className="mb-1 flex items-center gap-1 font-semibold">
            <ShieldAlert className="h-4 w-4" aria-hidden /> Unsicherheiten
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {a.uncertainties.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </div>
      )}
      {(a.verification.removedCitations > 0 || a.verification.unverifiedStatements > 0 || a.verification.downgradedAssessments > 0) && (
        <p className="text-xs text-muted">
          Belegprüfung: {a.verification.removedCitations} KI-Beleg(e) verworfen (Zitat nicht im Dokument gefunden oder falscher Vertrag), {a.verification.unverifiedStatements} Aussage(n) ohne Beleg markiert, {a.verification.downgradedAssessments} Einschätzung(en) herabgestuft.
        </p>
      )}
      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          Durchsuchte Fundstellen ({a.sources.length}) · {a.searchMode === "hybrid" ? "Volltext + semantische Suche" : "Volltextsuche"}
        </summary>
        <ul className="divide-y divide-border">
          {a.sources.map((s) => (
            <li key={s.id} className="px-3 py-2 text-xs">
              <Link href={`/dokumente/${s.documentId}?seite=${s.pageStart}#seite-${s.pageStart}`} className="font-medium text-primary hover:underline">
                [{s.id}] {s.documentTitle} · S. {s.pageStart}
                {s.heading ? ` · ${s.heading}` : ""}
              </Link>
              <span className="ml-2 text-muted">
                {DOC_TYPE_LABEL[s.docType]}
                {s.policyName ? ` · ${s.policyName}` : " · keinem Vertrag zugeordnet"}
              </span>
              <p className="mt-1 line-clamp-3 text-muted">{s.excerpt}</p>
            </li>
          ))}
          {!a.sources.length && <li className="px-3 py-2 text-xs text-muted">Keine Fundstellen.</li>}
        </ul>
      </details>
    </div>
  );
}
