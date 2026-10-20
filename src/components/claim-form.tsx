"use client";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { ActionState } from "@/server/actions/util";

export type ClaimValues = {
  title?: string;
  description?: string;
  occurredOn?: string | null;
  occurredAtText?: string | null;
  location?: string | null;
  ownerOfDamagedItem?: string | null;
  causedBy?: string | null;
  estimatedDamageCents?: number | null;
  alreadyReported?: boolean | null;
  acuteDanger?: boolean;
};

export function ClaimForm({ action, values = {}, submitLabel }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; values?: ClaimValues; submitLabel: string }) {
  return (
    <ActionForm action={action} className="space-y-5">
      {(state) => {
        const fe = state?.fieldErrors ?? {};
        return (
          <>
            <label className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm">
              <input type="checkbox" name="acuteDanger" defaultChecked={values.acuteDanger} className="mt-1" />
              <span>
                <span className="font-medium">Besteht gerade eine akute Gefahr?</span> (z. B. Wasser läuft noch aus, Brandgefahr, Verletzte) – dann zuerst Schutzmaßnahmen ergreifen bzw. Notruf 112.
              </span>
            </label>
            <Field id="title" label="Kurzer Titel *" error={fe.title} hint="z. B. „Fahrrad aus Keller gestohlen“">
              <Input id="title" name="title" defaultValue={values.title} required aria-invalid={Boolean(fe.title)} />
            </Field>
            <Field id="description" label="Was ist passiert? *" error={fe.description} hint="Beschreibe den Hergang in eigenen Worten. Nur Tatsachen, die du kennst – Unbekanntes darfst du offen lassen.">
              <Textarea id="description" name="description" defaultValue={values.description} rows={6} required aria-invalid={Boolean(fe.description)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="occurredOn" label="Datum des Schadens" error={fe.occurredOn}>
                <Input id="occurredOn" name="occurredOn" type="date" defaultValue={values.occurredOn ?? ""} />
              </Field>
              <Field id="occurredAtText" label="…oder ungefährer Zeitpunkt" hint="z. B. „zwischen 3. und 5. März“">
                <Input id="occurredAtText" name="occurredAtText" defaultValue={values.occurredAtText ?? ""} />
              </Field>
              <Field id="location" label="Wo ist es passiert?">
                <Input id="location" name="location" defaultValue={values.location ?? ""} />
              </Field>
              <Field id="estimatedDamage" label="Geschätzte Schadenhöhe in €" error={fe.estimatedDamageCents}>
                <Input id="estimatedDamage" name="estimatedDamage" inputMode="decimal" defaultValue={values.estimatedDamageCents != null ? (values.estimatedDamageCents / 100).toFixed(2).replace(".", ",") : ""} />
              </Field>
              <Field id="ownerOfDamagedItem" label="Wem gehört die beschädigte Sache?" hint="Wichtig z. B. bei geliehenen Gegenständen">
                <Input id="ownerOfDamagedItem" name="ownerOfDamagedItem" defaultValue={values.ownerOfDamagedItem ?? ""} />
              </Field>
              <Field id="causedBy" label="Wer hat den Schaden verursacht?">
                <Input id="causedBy" name="causedBy" defaultValue={values.causedBy ?? ""} />
              </Field>
              <Field id="alreadyReported" label="Schon einem Versicherer gemeldet?">
                <Select id="alreadyReported" name="alreadyReported" defaultValue={values.alreadyReported == null ? "" : values.alreadyReported ? "yes" : "no"}>
                  <option value="">unbekannt</option>
                  <option value="yes">ja</option>
                  <option value="no">nein</option>
                </Select>
              </Field>
            </div>
            <SubmitButton pendingText="Wird gespeichert …">{submitLabel}</SubmitButton>
          </>
        );
      }}
    </ActionForm>
  );
}
