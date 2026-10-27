# WEINMASTER 60

Ein interaktiver 60-Minuten-Wein-Crashkurs als Web-App, mobil zuerst, auf Deutsch.
Keine Anmeldung, kein Backend, keine Abhängigkeiten. Der Lernfortschritt bleibt lokal im Browser (`localStorage`).

## Inhalt

- **8 Module (60 Min):** Grundlagen, Rebsorten, Regionen, Verkosten, Etiketten & Preise, Wein & Essen, Servieren & Fehler, souverän auftreten.
  Jedes Modul folgt dem Muster: Einstiegsfrage → Wissen → Beispiel → interaktive Übung → Quiz → Fazit.
- **Übungen:** Stilvergleich mit Zucker-Regler, 13 Rebsorten-Lernkarten, Klima-Regler, schematische Weinkarte (Europa/Welt),
  Regionen-Zuordnung, Verkostungstrainer, Aromen-Sortierung, Etiketten-Decoder, Preisklassen, Speisenbegleiter,
  Temperatur-Thermometer, Mythos oder Fakt, Souverän-Training.
- **Abschlussprüfung** (15 Fragen) mit Auswertung pro Modul und gezielten Wiederholungsempfehlungen.
- **Wiederholung** falsch beantworteter Fragen, **Lernstand** auf der Startseite.
- **Modi:** „Ich habe nur 5 Minuten“, „Ich stehe vor einer Weinkarte“, „Ich probiere gerade Wein“ (mit Notiz-Generator).
- **Spickzettel** mit Suche und Kategorien.

## Aufbau

```
src/data.js      Wissensbasis (Rebsorten, Regionen, Speisen, Temperaturen, Glossar, Mythen)
src/course.js    Module, Quizfragen, Prüfung, Modi-Inhalte
src/app.js       Routing (#start, #modul-1 …), Rendering, Übungen
src/styles.css   Gestaltung
public/          Manifest, Icons, Service Worker (Offline)
build.mjs        baut dist/index.html (eine Datei, alles inline)
```

Bauen: `node weinmaster60/build.mjs` (Node 18+). Lokal ansehen: `cd weinmaster60/dist && python3 -m http.server`.

## Dauerhaft aufs Handy

`weinmaster60/dist` ist eine statische Website. Drei Wege:

1. **GitHub Pages:** Settings → Pages → Source „GitHub Actions“, dann den Workflow „WEINMASTER 60 Pages“ manuell starten.
   (Bei privaten Repositories setzt GitHub Pages einen kostenpflichtigen Plan voraus.)
2. **Netlify Drop:** den Ordner `dist` auf https://app.netlify.com/drop ziehen, fertig ist eine HTTPS-Adresse.
3. Jeder andere statische Hoster (Cloudflare Pages, Vercel, eigener Webspace).

Auf dem iPhone die Adresse in Safari öffnen → Teilen → „Zum Home-Bildschirm“. Die App startet dann im Vollbild
und funktioniert nach dem ersten Laden auch offline.
