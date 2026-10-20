"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Etwas ist schiefgelaufen</h1>
        <p className="mt-2 text-sm text-muted">Bitte versuche es erneut. {error.digest ? `Fehlerkennung: ${error.digest}` : ""}</p>
        <button type="button" onClick={reset} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-contrast">
          Erneut versuchen
        </button>
      </div>
    </main>
  );
}
