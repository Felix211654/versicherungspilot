"use client";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CATEGORY_LABEL, CONFIDENCE_LABEL, INTERVAL_LABEL } from "@/lib/labels";
import type { ActionState } from "@/server/actions/util";

export type PolicyFormValues = {
  name?: string;
  category?: string;
  insurerName?: string | null;
  policyNumber?: string | null;
  broker?: string | null;
  policyholderName?: string | null;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  autoRenews?: boolean | null;
  renewalPeriodMonths?: number | null;
  noticePeriodMonths?: number | null;
  noticePeriodText?: string | null;
  premiumCents?: number | null;
  paymentInterval?: string | null;
  notes?: string | null;
};

type Sources = Record<string, { page: number | null; snippet: string | null; confidence: string }>;

function SourceHint({ s }: { s?: Sources[string] }) {
  if (!s) return null;
  return (
    <span className={s.confidence === "low" ? "text-warning" : undefined}>
      Erkannt auf S. {s.page ?? "?"} ({CONFIDENCE_LABEL[s.confidence] ?? s.confidence}): „{s.snippet?.slice(0, 120)}“
    </span>
  );
}

export function PolicyForm({ action, values = {}, sources = {}, submitLabel }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; values?: PolicyFormValues; sources?: Sources; submitLabel: string }) {
  return (
    <ActionForm action={action} className="space-y-6">
      {(state) => {
        const fe = state?.fieldErrors ?? {};
        const inv = (k: string) => ({ "aria-invalid": Boolean(fe[k]), "aria-describedby": fe[k] ? `${k}-error` : sources[k] ? `${k}-hint` : undefined });
        return (
          <>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold">Grunddaten</legend>
              <Field id="name" label="Bezeichnung *" error={fe.name}>
                <Input id="name" name="name" defaultValue={values.name ?? ""} required {...inv("name")} />
              </Field>
              <Field id="category" label="Versicherungsart *" error={fe.category} hint={<SourceHint s={sources.category} />}>
                <Select id="category" name="category" defaultValue={values.category ?? "sonstige"} {...inv("category")}>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field id="insurerName" label="Versicherer" hint={<SourceHint s={sources.insurerName} />}>
                <Input id="insurerName" name="insurerName" defaultValue={values.insurerName ?? ""} {...inv("insurerName")} />
              </Field>
              <Field id="policyNumber" label="Vertrags-/Versicherungsscheinnummer" hint={<SourceHint s={sources.policyNumber} />}>
                <Input id="policyNumber" name="policyNumber" defaultValue={values.policyNumber ?? ""} {...inv("policyNumber")} />
              </Field>
              <Field id="policyholderName" label="Versicherungsnehmer" hint={<SourceHint s={sources.policyholderName} />}>
                <Input id="policyholderName" name="policyholderName" defaultValue={values.policyholderName ?? ""} />
              </Field>
              <Field id="broker" label="Vermittler (optional)">
                <Input id="broker" name="broker" defaultValue={values.broker ?? ""} />
              </Field>
              <Field id="status" label="Status">
                <Select id="status" name="status" defaultValue={values.status ?? "active"}>
                  <option value="active">aktiv</option>
                  <option value="needs_review">Prüfung erforderlich</option>
                  <option value="cancelled">gekündigt</option>
                  <option value="expired">abgelaufen</option>
                </Select>
              </Field>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold">Laufzeit und Kündigung</legend>
              <Field id="startDate" label="Versicherungsbeginn" error={fe.startDate} hint={<SourceHint s={sources.startDate} />}>
                <Input id="startDate" name="startDate" type="date" defaultValue={values.startDate ?? ""} {...inv("startDate")} />
              </Field>
              <Field id="endDate" label="Ablauf / Hauptfälligkeit" error={fe.endDate} hint={<SourceHint s={sources.endDate} />}>
                <Input id="endDate" name="endDate" type="date" defaultValue={values.endDate ?? ""} {...inv("endDate")} />
              </Field>
              <Field id="autoRenews" label="Stillschweigende Verlängerung" hint={<SourceHint s={sources.autoRenews} />}>
                <Select id="autoRenews" name="autoRenews" defaultValue={values.autoRenews == null ? "" : values.autoRenews ? "yes" : "no"}>
                  <option value="">unbekannt</option>
                  <option value="yes">ja</option>
                  <option value="no">nein</option>
                </Select>
              </Field>
              <Field id="renewalPeriodMonths" label="Verlängerung um (Monate)" error={fe.renewalPeriodMonths}>
                <Input id="renewalPeriodMonths" name="renewalPeriodMonths" type="number" min={1} max={120} defaultValue={values.renewalPeriodMonths ?? ""} {...inv("renewalPeriodMonths")} />
              </Field>
              <Field id="noticePeriodMonths" label="Kündigungsfrist (Monate vor Ablauf)" error={fe.noticePeriodMonths} hint={<SourceHint s={sources.noticePeriodMonths} />}>
                <Input id="noticePeriodMonths" name="noticePeriodMonths" type="number" min={0} max={24} defaultValue={values.noticePeriodMonths ?? ""} {...inv("noticePeriodMonths")} />
              </Field>
              <Field id="noticePeriodText" label="Kündigungsregelung (Wortlaut/Notiz)">
                <Input id="noticePeriodText" name="noticePeriodText" defaultValue={values.noticePeriodText ?? ""} />
              </Field>
            </fieldset>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold">Beitrag</legend>
              <Field id="premium" label="Beitrag in € (je Zahlung)" error={fe.premiumCents} hint={<SourceHint s={sources.premiumCents} />}>
                <Input id="premium" name="premium" inputMode="decimal" placeholder="z. B. 89,90" defaultValue={values.premiumCents != null ? (values.premiumCents / 100).toFixed(2).replace(".", ",") : ""} {...inv("premiumCents")} />
              </Field>
              <Field id="paymentInterval" label="Zahlungsweise" hint={<SourceHint s={sources.paymentInterval} />}>
                <Select id="paymentInterval" name="paymentInterval" defaultValue={values.paymentInterval ?? ""}>
                  <option value="">unbekannt</option>
                  {Object.entries(INTERVAL_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </fieldset>
            <Field id="notes" label="Notizen">
              <Textarea id="notes" name="notes" defaultValue={values.notes ?? ""} />
            </Field>
            <SubmitButton pendingText="Wird gespeichert …">{submitLabel}</SubmitButton>
          </>
        );
      }}
    </ActionForm>
  );
}
