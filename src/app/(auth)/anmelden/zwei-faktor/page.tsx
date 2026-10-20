"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";

export default function TwoFactorPage() {
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const res = useBackup ? await authClient.twoFactor.verifyBackupCode({ code }) : await authClient.twoFactor.verifyTotp({ code });
    if (res.error) {
      setError("Der Code ist ungültig oder abgelaufen.");
      setBusy(false);
      return;
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- bewusst volle Navigation nach Wechsel des Anmeldestatus (kein Client-Zustand der alten Sitzung)
    window.location.href = "/";
  }
  return (
    <Card>
      <CardContent className="space-y-5 py-6">
        <div>
          <h1 className="text-xl font-semibold">Zwei-Faktor-Bestätigung</h1>
          <p className="text-sm text-muted">{useBackup ? "Gib einen deiner Backup-Codes ein." : "Gib den 6-stelligen Code aus deiner Authenticator-App ein."}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field id="code" label={useBackup ? "Backup-Code" : "Code"}>
            <Input id="code" name="code" inputMode={useBackup ? "text" : "numeric"} autoComplete="one-time-code" required autoFocus />
          </Field>
          {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>Bestätigen</Button>
        </form>
        <button type="button" className="text-sm text-primary underline-offset-4 hover:underline" onClick={() => setUseBackup(!useBackup)}>
          {useBackup ? "Authenticator-Code verwenden" : "Backup-Code verwenden"}
        </button>
      </CardContent>
    </Card>
  );
}
