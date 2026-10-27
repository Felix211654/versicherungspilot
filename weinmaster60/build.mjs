// Baut WEINMASTER 60 zu einer einzigen, eigenständigen HTML-Datei (dist/index.html)
// plus Offline-Dateien. Zusätzlich dist/artifact.html: dieselbe App als Seitenfragment für Vorschau-Hosts.
// Aufruf: node weinmaster60/build.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(root, "src", f), "utf8");
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });

const fonts =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..600&family=Hanken+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">';
const body =
  '<header class="topbar" id="topbar"></header>\n<main id="app" aria-live="off"></main>\n' +
  "<noscript><p style=\"padding:24px\">WEINMASTER 60 braucht JavaScript. Bitte aktiviere es in deinem Browser.</p></noscript>";
const style = `<style>\n${src("styles.css")}\n</style>`;
const scripts = ["data.js", "course.js", "app.js"].map((f) => `<script>\n${src(f)}\n</script>`).join("\n");

const standalone = `<!doctype html>
<html lang="de" data-sw="on">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>WEINMASTER 60</title>
<meta name="description" content="In einer Stunde mehr über Wein verstehen als bei zehn Restaurantbesuchen. Der interaktive 60-Minuten-Wein-Crashkurs.">
<meta name="theme-color" content="#1e0910">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Weinmaster 60">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icon-180.png">
${fonts}
${style}
</head>
<body>
${body}
${scripts}
</body>
</html>
`;

const fragment = `<title>WEINMASTER 60</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
${style}
${body}
${scripts}
`;

writeFileSync(join(dist, "index.html"), standalone);
writeFileSync(join(dist, "artifact.html"), fragment);
for (const f of readdirSync(join(root, "public"))) copyFileSync(join(root, "public", f), join(dist, f));
console.log(`dist/index.html ${(standalone.length / 1024).toFixed(0)} KB, dist/artifact.html ${(fragment.length / 1024).toFixed(0)} KB`);
