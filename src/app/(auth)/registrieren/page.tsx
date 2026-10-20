"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

export default function RegisterPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name")).trim();
    const email = String(fd.get("email")).trim();
    const password = String(fd.get("password"));
    const errs: Record<string, string> = {};
    if (name.length < 2) errs.name = "Bitte gib deinen Namen an.";
    if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = "Bitte gib eine gültige E-Mail-Adresse an.";
    if (password.length < 12) errs.password = "Das Passwort muss mindestens 12 Zeichen lang sein.";
    if (password !== fd.get("password2")) errs.password2 = "Die Passwörter stimmen nicht überein.";
    if (!fd.get("privacy")) errs.privacy = "Bitte bestätige die Datenschutzhinweise.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      setErrors({ form: error.status === 422 || /exist/i.test(error.message ?? "") ? "Mit dieser E-Mail-Adresse besteht bereits ein Konto." : error.status === 429 ? "Zu viele Versuche. Bitte später erneut versuchen." : "Registrierung fehlgeschlagen. Bitte erneut versuchen." });
      setBusy(false);
      return;
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- bewusst volle Navigation nach Wechsel des Anmeldestatus (kein Client-Zustand der alten Sitzung)
    window.location.href = "/onboarding";
  }
  return (
    <Card>
      <CardContent className="space-y-5 py-6">
        <div>
          <h1 className="text-xl font-semibold">Konto erstellen</h1>
          <p className="text-sm text-muted">Dein privater Versicherungsordner – verschlüsselt und nur für dich.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field id="name" label="Name" error={errors.name}>
            <Input id="name" name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />
          </Field>
          <Field id="email" label="E-Mail" error={errors.email}>
            <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
          </Field>
          <Field id="password" label="Passwort" hint="Mindestens 12 Zeichen. Ein Passwortmanager hilft." error={errors.password}>
            <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : "password-hint"} />
          </Field>
          <Field id="password2" label="Passwort wiederholen" error={errors.password2}>
            <Input id="password2" name="password2" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password2)} />
          </Field>
          <div className="space-y-1">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="privacy" className="mt-1" aria-invalid={Boolean(errors.privacy)} />
              <span>
                Ich habe die <a href="/datenschutz" target="_blank" className="underline">Datenschutzhinweise</a> gelesen. Mir ist bewusst, dass die App keine Rechts- oder Versicherungsberatung ersetzt.
              </span>
            </label>
            {errors.privacy && <p role="alert" className="text-xs text-danger">{errors.privacy}</p>}
          </div>
          {errors.form && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{errors.form}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Konto wird erstellt …" : "Konto erstellen"}</Button>
        </form>
        <p className="text-center text-sm text-muted">
          Bereits registriert? <Link href="/anmelden" className="text-primary underline-offset-4 hover:underline">Anmelden</Link>
        </p>
      </CardContent>
    </Card>
  );
}
