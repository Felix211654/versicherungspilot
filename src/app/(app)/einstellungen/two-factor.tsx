"use client";
import { useState } from "react";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

/** Einrichtung/Deaktivierung der Zwei-Faktor-Authentifizierung (TOTP) über Better Auth. */
export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const [step, setStep] = useState<"idle" | "verify" | "done">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function start(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const password = String(new FormData(e.currentTarget).get("password"));
    const { data, error } = await authClient.twoFactor.enable({ password });
    setBusy(false);
    if (error || !data || !("totpURI" in data)) return setError("Passwort falsch oder Aktion nicht möglich.");
    setUri(data.totpURI);
    setCodes(data.backupCodes);
    setQr(await QRCode.toDataURL(data.totpURI, { margin: 1, width: 200 }));
    setStep("verify");
  }

  async function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (error) return setError("Code ungültig. Bitte erneut versuchen.");
    setStep("done");
  }

  async function disable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const password = String(new FormData(e.currentTarget).get("password"));
    const { error } = await authClient.twoFactor.disable({ password });
    setBusy(false);
    if (error) return setError("Passwort falsch oder Aktion nicht möglich.");
    window.location.reload();
  }

  if (step === "done")
    return <p role="status" className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Zwei-Faktor-Authentifizierung ist aktiv. Bewahre deine Backup-Codes sicher auf.</p>;

  if (enabled)
    return (
      <form onSubmit={disable} className="space-y-3">
        <p className="text-sm text-success">Zwei-Faktor-Authentifizierung ist aktiv.</p>
        <Field id="tf-pw-off" label="Passwort zum Deaktivieren">
          <Input id="tf-pw-off" name="password" type="password" autoComplete="current-password" required />
        </Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="secondary" disabled={busy}>Deaktivieren</Button>
      </form>
    );

  if (step === "verify")
    return (
      <div className="space-y-4">
        <p className="text-sm">1. Scanne den QR-Code mit einer Authenticator-App (z. B. Aegis, 2FAS, Google Authenticator).</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- lokal erzeugte data:-URL, keine Optimierung nötig */}
        {qr && <img src={qr} alt="QR-Code für die Authenticator-App" width={200} height={200} className="rounded-lg border border-border bg-white p-2" />}
        <details className="text-xs">
          <summary className="cursor-pointer">Manuelle Eingabe</summary>
          <code className="break-all">{uri}</code>
        </details>
        <div>
          <p className="text-sm">2. Backup-Codes sicher aufbewahren:</p>
          <ul className="mt-1 grid grid-cols-2 gap-1 font-mono text-xs">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <form onSubmit={verify} className="space-y-2">
          <Field id="tf-code" label="3. Code aus der App eingeben">
            <Input id="tf-code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
          </Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={busy}>Aktivieren</Button>
        </form>
      </div>
    );

  return (
    <form onSubmit={start} className="space-y-3">
      <p className="text-sm text-muted">Schütze dein Konto zusätzlich mit einem Einmalcode aus einer Authenticator-App. Dringend empfohlen.</p>
      <Field id="tf-pw" label="Passwort bestätigen">
        <Input id="tf-pw" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy}>Zwei-Faktor einrichten</Button>
    </form>
  );
}
