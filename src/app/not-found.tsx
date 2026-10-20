import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Nicht gefunden</h1>
        <p className="mt-2 text-sm text-muted">Diese Seite existiert nicht oder du hast keinen Zugriff darauf.</p>
        <Link href="/" className="mt-4 inline-block text-primary underline">
          Zur Übersicht
        </Link>
      </div>
    </main>
  );
}
