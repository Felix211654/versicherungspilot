import { expect, test, type Page } from "@playwright/test";

const password = "e2e-passwort-sehr-sicher";

async function register(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  await page.goto("/registrieren");
  await page.fill("#name", "Eva Endtoend");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#password2", password);
  await page.check("input[name=privacy]");
  await page.click("button[type=submit]");
  await page.waitForURL("**/onboarding");
  return email;
}

/** Kein horizontales Scrollen (Smartphone-Tauglichkeit). */
async function expectNoOverflow(page: Page) {
  const [sw, vw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw).toBeLessThanOrEqual(vw);
}

async function upload(page: Page, files: string[]) {
  await page.waitForLoadState("networkidle"); // erst nach Hydration hängen die Event-Handler
  await page.locator("[data-testid=file-input]").first().setInputFiles(files.map((f) => `tests/fixtures/${f}`));
}

test("Kernworkflow: Upload → Prüfung → Vertrag → Frage → Schadenfall → Entwurf → Fristen → Export → Löschung", async ({ page, isMobile }) => {
  test.slow();
  await register(page);

  // Test 1: Upload + Verarbeitung mit Statusanzeige
  await page.goto("/onboarding?schritt=3");
  await upload(page, ["hausrat-police.pdf", "hausrat-avb.pdf"]);
  await expect(page.getByText("Bitte Angaben prüfen").nth(1)).toBeVisible({ timeout: 60_000 });

  // Test 2: Vertragsdaten erkennen und übernehmen/korrigieren
  await page.goto("/dokumente?q=Versicherungsschein");
  await page.getByRole("link", { name: "hausrat police" }).click();
  await expect(page.getByText("HR-4711-2024").first()).toBeVisible();
  await page.getByRole("link", { name: "Neuen Vertrag aus erkannten Angaben anlegen" }).click();
  await expect(page.locator("#insurerName")).toHaveValue("Allianz");
  await expect(page.locator("#premium")).toHaveValue("142,80");
  await page.fill("#name", "Meine Hausrat");
  await page.getByRole("button", { name: "Vertrag speichern" }).click();
  await page.waitForURL(/\/versicherungen\/[^/]+\?gespeichert=1/);
  await expect(page.getByRole("heading", { name: "Meine Hausrat" })).toBeVisible();
  await expect(page.getByText("Kündigungsfrist").first()).toBeVisible();
  await expectNoOverflow(page);

  // AVB dem Vertrag zuordnen
  await page.goto("/dokumente");
  await page.getByRole("link", { name: "hausrat avb" }).click();
  await page.selectOption("#policyId", { label: "Meine Hausrat" });
  await page.getByRole("button", { name: "Speichern" }).first().click();
  await expect(page.getByText("Zuordnung gespeichert.")).toBeVisible();

  // Test 3/4: Frage → Fundstellen (KI hier nicht konfiguriert → keine Deckungsaussage)
  await page.goto(`/assistent?q=${encodeURIComponent("Mein Fahrrad wurde aus dem Keller gestohlen. Welche Versicherung könnte greifen?")}`);
  await page.waitForURL(/\/assistent\?c=/, { timeout: 60_000 });
  await expect(page.getByText(/Fundstellen|Textstellen/).first()).toBeVisible();
  await page.getByText(/Durchsuchte Fundstellen/).click();
  const srcLink = page.getByRole("link", { name: /Fahrraddiebstahl/ }).first();
  await expect(srcLink).toBeVisible();
  await srcLink.click();
  await expect(page).toHaveURL(/seite=2/);
  await expect(page.locator("#seite-2")).toBeVisible();
  await expectNoOverflow(page);

  // Test 5/6: Schadenfall, Prüfung, Entwurf
  await page.goto("/schadenfaelle/neu");
  await page.fill("#title", "Fahrrad aus Keller gestohlen");
  await page.fill("#description", "Mein abgeschlossenes Fahrrad wurde aus dem Gemeinschaftskeller gestohlen.");
  await page.fill("#location", "Gemeinschaftskeller");
  await page.getByRole("button", { name: "Fall anlegen" }).click();
  await page.waitForURL(/\/schadenfaelle\/[0-9a-f-]+$/);
  await expect(page.getByText("Wann ist der Schaden passiert?")).toBeVisible();
  await page.getByRole("button", { name: "Prüfung starten" }).click();
  await expect(page.getByText("Fundstellensuche abgeschlossen (ohne KI-Bewertung).")).toBeVisible();
  await expect(page.getByRole("link", { name: "Meine Hausrat" }).first()).toBeVisible();
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Entwurf erstellen" }).click();
  await page.waitForURL(/\/entwurf\//);
  await expect(page.locator("#content")).toContainText("Mein abgeschlossenes Fahrrad");
  await expect(page.locator("#content")).toContainText("[OFFEN: Datum");
  const dl = page.waitForEvent("download");
  await page.getByRole("link", { name: "Als Textdatei" }).click();
  expect((await dl).suggestedFilename()).toMatch(/\.txt$/);

  // Test 7: Fristen bestätigen
  await page.goto("/fristen");
  await page.getByRole("link", { name: /Letzter Tag für Kündigung/ }).first().click();
  await expect(page.getByText("Berechnungsgrundlage")).toBeVisible();
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "Frist bestätigen" }).click();
  await expect(page.getByRole("button", { name: "Frist bestätigen" })).toHaveCount(0);
  await expect(page.getByText("geplant").first()).toBeVisible();

  // Mobile Navigation
  if (isMobile) {
    await page.getByRole("button", { name: "Menü öffnen" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Analyse & Optimierung" }).click();
    await expect(page.getByRole("heading", { name: "Analyse & Optimierung" })).toBeVisible();
  }

  // Test 9: Export
  await page.goto("/einstellungen");
  await expectNoOverflow(page);
  const exp = page.waitForEvent("download");
  await page.getByRole("link", { name: "Datenexport herunterladen" }).click();
  expect((await exp).suggestedFilename()).toMatch(/versicherungspilot-export-.*\.zip/);

  // Test 10: Kontolöschung
  await page.getByText("Konto endgültig löschen").click();
  await page.fill("#del-pw", password);
  await page.fill("#del-confirm", "LÖSCHEN");
  await page.getByRole("button", { name: "Konto und alle Daten löschen" }).click();
  await page.waitForURL(/\/anmelden/);
});

test("Test 8: Zugriff auf fremde Dokumente wird verweigert", async ({ page, browser }) => {
  await register(page);
  await page.goto("/dokumente?upload=1");
  await upload(page, ["haftpflicht.pdf"]);
  await expect(page.getByRole("link", { name: "Öffnen" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Öffnen" }).click();
  await page.waitForURL(/\/dokumente\/[0-9a-f-]+/);
  const docUrl = page.url();
  const fileHref = await page.getByRole("link", { name: "Herunterladen" }).getAttribute("href");
  const other = await browser.newPage();
  await register(other);
  await other.goto(docUrl);
  // notFound() innerhalb des gestreamten Layouts: „Nicht gefunden“-Seite ohne jegliche Dokumentdaten
  await expect(other.getByRole("heading", { name: "Nicht gefunden" })).toBeVisible();
  await expect(other.getByText("haftpflicht")).toHaveCount(0);
  const f = await other.request.get(fileHref!);
  expect(f.status()).toBe(403);
  await other.close();
});

test("Test 13: Formularvalidierung erklärt Fehler", async ({ page }) => {
  await page.goto("/registrieren");
  await page.click("button[type=submit]");
  await expect(page.getByText("Bitte gib deinen Namen an.")).toBeVisible();
  await expect(page.getByText("Das Passwort muss mindestens 12 Zeichen lang sein.")).toBeVisible();
});
