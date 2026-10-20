"use client";
export function PrintButton() {
  return (
    <div className="mb-6 flex gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className="rounded-lg bg-black px-4 py-2 text-sm text-white">
        Drucken / als PDF speichern
      </button>
      <p className="self-center text-xs text-gray-600">Entwurf – vor Verwendung prüfen. Platzhalter [OFFEN: …] ersetzen.</p>
    </div>
  );
}
