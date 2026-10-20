# Qualität, Tests und Akzeptanzkriterien

## Testpyramide

| Ebene | Befehl | Inhalt |
|---|---|---|
| Unit (23) | `npm run test:unit` | Extraktion (inkl. Regressionen), Klassifikation, Chunking, Fristableitung, Datum/Geld, Verschlüsselung, Download-Token |
| Integration (25) | `npm run test:integration` | echte PostgreSQL-Test-DB, Poppler/Tesseract, Pipeline, Mandantentrennung, KI-Schutzregeln (deterministischer Test-Provider), Fälle, Entwürfe, Download-Route, Export, Kontolöschung |
| E2E (3 × 2 Geräte) | `npm run test:e2e` | Playwright Desktop + Pixel 7: kompletter Workflow über die UI, Fremdzugriff, Formularvalidierung, kein horizontales Scrollen |
| KI-Evaluierung | `npm run eval:ai` | 7 synthetische Fälle gegen den echten Anbieter (benötigt API-Key) |

Synthetische Testunterlagen (fiktiv): `scripts/make-fixtures.ts` → `tests/fixtures/` (Police, AVB mit Fahrradklausel, Haftpflicht mit Leihsachen/Kfz-Ausschluss, Nachtrag Elementar, Versichererschreiben mit Frist, Scan als PNG, Dokument mit Prompt-Injection).

## Abnahme der Akzeptanzkriterien (Stand dieser Lieferung)

| # | Kriterium | Ergebnis | Nachweis |
|---|---|---|---|
| 1 | PDF hochladen, verarbeiten, anzeigen, durchsuchen | ✅ | Integration „Test 1/2“, E2E Kernworkflow |
| 2 | Versicherer/Art/Daten erkannt und korrigierbar | ✅ | Integration „Vertragsdaten“, E2E (Vorbefüllung + Speichern) |
| 3 | Klauselfrage mit echter Quelle und korrekter Seite | ✅ Retrieval + Belegprüfung; ⚠️ KI-Formulierung nur mit Test-Provider geprüft | Integration „Test 3“, `ai-guards` |
| 4 | Keine gesicherte Deckung ohne Grundlage | ✅ | `ai-guards` (ohne KI/Einwilligung, Herabstufung) |
| 5 | Schaden gegen mehrere Verträge, getrennte Darstellung | ✅ (ohne KI: Vorauswahl ohne Bewertung); KI-Pfad mit Test-Provider | `claims-privacy`, E2E |
| 6 | Bearbeitbarer Entwurf, Fehlendes markiert | ✅ | `claims-privacy`, E2E |
| 7 | Frist mit Quelle/Status; unklare Fristen bestätigen | ✅ | Integration „Test 7“, E2E |
| 8 | Kein Zugriff auf fremde Daten | ✅ | Integration „Mandantentrennung“, Download-Route, E2E |
| 9 | Export | ✅ | `claims-privacy`, E2E |
| 10 | Kontolöschung inkl. abgeleiteter Daten | ✅ | `claims-privacy`, E2E |
| 11 | Fehlgeschlagene Verarbeitung sichtbar und neu startbar | ✅ | Integration „Test 11“ |
| 12 | Smartphone und Desktop | ✅ | E2E beide Projekte, Overflow-Prüfung |
| 13 | Keine Scheinaktionen | ✅ für getestete Kernaktionen; alle Buttons sind an Server Actions/Routen gebunden | E2E, Code-Review |

**Nicht abgenommen** (fehlende Zugangsdaten in der Entwicklungsumgebung): Antwortqualität des echten KI-Modells, semantische Suche mit Embeddings, Virenscan, S3, Backup/Restore.

## KI-Akzeptanzkriterien (für `npm run eval:ai`)
- 100 % der Fälle bestanden (erwartete Verträge benannt, Pflichtfundstellen zitiert, keine „möglich“-Einstufung ohne Grundlage, keine Wirkung der Injection, Nachtrag als Unsicherheit benannt).
- ≥ 95 % der von der KI gelieferten Belege bestehen die Belegprüfung (unbestandene werden in der App ohnehin verworfen und gezählt).
- Laufend: Anteil herabgestufter Einschätzungen und verworfener Belege aus `ai_analysis.verification` überwachen.

## Bekannte Grenzen der regelbasierten Extraktion
- Layouts mit Wert in einer anderen Spalte als das Label werden nicht immer erkannt (dann: manuelle Eingabe).
- Qualitätsindikatoren (eindeutig/plausibel/unsicher) sind regelbasiert, **nicht kalibriert**.
- Die Fristableitung unterstellt keine gesetzlichen Standardfristen; ohne Ablaufdatum/Kündigungsfrist entsteht keine Frist.
