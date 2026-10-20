// Manueller Smoke-Test: meldet sich an, öffnet alle Hauptbereiche und speichert Screenshots.
// Aufruf: node scripts/smoke-browse.mjs <ausgabeordner> [email] [passwort]
import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";

const out = process.argv[2] ?? "./screenshots";
const email = process.argv[3] ?? "erika@example.com";
const password = process.argv[4] ?? "sehr-sicheres-passwort-123";
const base = process.env.BASE_URL ?? "http://localhost:3000";

const exe = process.env.CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const browser = await chromium.launch({ executablePath: exe });
const errors = [];
for (const [label, viewport] of [["desktop", { width: 1360, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${label} pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${label} console: ${m.text()}`);
  });
  await page.goto(`${base}/anmelden`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type=submit]");
  await page.waitForURL(`${base}/`);
  const pages = [
    ["dashboard", "/"],
    ["versicherungen", "/versicherungen"],
    ["dokumente", "/dokumente"],
    ["assistent", "/assistent"],
    ["schaden", "/schadenfaelle"],
    ["fristen", "/fristen"],
    ["analyse", "/analyse"],
    ["einstellungen", "/einstellungen"],
    ["onboarding", "/onboarding?schritt=4"],
  ];
  for (const [name, url] of pages) {
    const r = await page.goto(base + url, { waitUntil: "networkidle" });
    console.log(label, name, r?.status(), await page.title());
    await page.screenshot({ path: `${out}/${label}-${name}.png`, fullPage: label === "desktop" });
  }
  if (label === "desktop") {
    await page.goto(`${base}/dokumente`);
    await page.locator("main ul li a").first().click();
    await page.waitForLoadState("networkidle");
    console.log(label, "dokument", page.url());
    await page.screenshot({ path: `${out}/${label}-dokument.png`, fullPage: true });
  }
  await ctx.close();
}
console.log(errors.join("\n") || "keine Browserfehler");
await browser.close();
