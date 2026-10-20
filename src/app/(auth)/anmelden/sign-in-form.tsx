"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

export function SignInForm() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get("weiter");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const { data, error } = await authClient.signIn.email({ email: String(fd.get("email")), password: String(fd.get("password")) });
    if (error) {
      setError(error.status === 429 ? "Zu viele Versuche. Bitte kurz warten." : "E-Mail oder Passwort ist nicht korrekt.");
      setBusy(false);
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return; // Weiterleitung durch Plugin
     
    window.location.href = safeNext;
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-6">
        <div>
          <h1 className="text-xl font-semibold">Anmelden</h1>
          <p className="text-sm text-muted">Willkommen zurück.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
          <Field id="email" label="E-Mail">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field id="password" label="Passwort">
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Anmelden …" : "Anmelden"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted">
          Noch kein Konto?{" "}
          <Link href="/registrieren" className="text-primary underline-offset-4 hover:underline">
            Registrieren
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
