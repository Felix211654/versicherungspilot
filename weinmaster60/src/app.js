/* WEINMASTER 60 – App-Logik. Reines JavaScript, keine Abhängigkeiten.
   Routing über den URL-Hash (#start, #modul-3, #spickzettel …), Fortschritt in localStorage. */
(function () {
  "use strict";

  var KEY = "weinmaster60.v1";
  var app = document.getElementById("app");
  var topbar = document.getElementById("topbar");

  /* ---------- Zustand ---------- */
  function fresh() {
    return { done: {}, step: {}, stats: {}, wrong: [], exam: null, quick: false, notes: [] };
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { /* Speicher nicht verfügbar: Kurs läuft trotzdem */ }
    return fresh();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignorieren */ }
  }
  var S = load();

  function freshUi() {
    return {
      hook: {}, quiz: {},
      styles: { sel: "rot", sugar: 3 },
      grapes: { filter: "alle", open: {} },
      climate: { g: "chardonnay", s: 0 },
      map: { view: "europa", sel: "mosel", country: "Deutschland" },
      rm: { i: 0, picked: null, score: 0 },
      tt: { dim: "saeure", lvl: 2 },
      as: { i: 0, picked: null, score: 0 },
      lb: { l: 0, hot: null },
      pt: 1, pair: "steak", th: "leichtrot",
      mf: { i: 0, picked: null, score: 0 },
      sv: { i: 0, picked: null, score: 0 },
      cheat: { q: "", cat: "alle" },
      quick: { i: 0, phase: "cards" },
      wk: { i: 0, ans: [] },
      vk: null,
      confirmReset: false
    };
  }
  var ui = freshUi();

  /* ---------- Hilfsfunktionen ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
  function plain(s) { return String(s).replace(/\*\*/g, ""); }
  function norm(s) { return plain(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function meter(n, max) {
    max = max || 5;
    var out = '<span class="meter" role="img" aria-label="' + n + " von " + max + '">';
    for (var i = 1; i <= max; i++) out += '<i class="' + (i <= n ? "on" : "") + '"></i>';
    return out + "</span>";
  }
  function pressed(b) { return ' aria-pressed="' + (b ? "true" : "false") + '"'; }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function letters(i) { return "ABCDE".charAt(i); }

  var ICONS = {
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/><path d="M9 7h6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1V16h5v-.1c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    menu: '<rect x="5.5" y="3" width="13" height="18" rx="1.5"/><path d="M9 7.5h6M9 11h6M9 14.5h4"/>',
    glass: '<path d="M7.5 3h9c.3 5-1.4 8.5-4.5 8.5S7.2 8 7.5 3z"/><path d="M12 11.5V20M8.5 20.5h7"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 2M10 2.5h4"/>',
    repeat: '<path d="M4.5 11a7.5 7.5 0 0 1 13-4.5L19.5 8.5"/><path d="M19.5 4v4.5H15"/><path d="M19.5 13a7.5 7.5 0 0 1-13 4.5L4.5 15.5"/><path d="M4.5 20v-4.5H9"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 3 3.5M16 6h2.5a2.5 2.5 0 0 1-3 3.5M12 13v3.5M8.5 20.5h7M10 16.5h4v4h-4z"/>',
    plate: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
    drop: '<path d="M12 3.5s5.5 6.4 5.5 10.2a5.5 5.5 0 0 1-11 0C6.5 9.9 12 3.5 12 3.5z"/>',
    cube: '<path d="M4.5 8L12 4l7.5 4v8L12 20l-7.5-4z"/><path d="M4.5 8L12 12l7.5-4M12 12v8"/>',
    leaf: '<path d="M5 19C5 10.5 10.5 5 20 4c-1 9.5-6.5 15-15 15z"/><path d="M5 19l8-8"/>',
    flame: '<path d="M12 3c.8 3.6 5 5.6 5 10.5a5 5 0 0 1-10 0c0-2.6 1.6-3.8 2-6.3 1.6.9 2.6 2.1 2.8 3.8C13 9 12.6 5.6 12 3z"/>',
    spark: '<path d="M12 3.5l1.7 5L19 10l-5.3 1.6L12 16.5l-1.7-4.9L5 10l5.3-1.5z"/><path d="M18.5 16l.6 1.8 1.9.7-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.7z"/>',
    scale: '<path d="M12 4v16M8 20h8M5 7.5h14"/><path d="M5 7.5l-2.5 5.5a2.5 2.5 0 0 0 5 0zM19 7.5l-2.5 5.5a2.5 2.5 0 0 0 5 0z"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="1.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>'
  };
  function ic(name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
  }

  var gid = 0;
  /* Weinglas-Illustration. level: Füllhöhe 0–1, opacity: Farbintensität */
  function glass(color, o) {
    o = o || {};
    var id = "gl" + (++gid);
    var level = o.level == null ? 0.55 : o.level;
    var top = 84 - level * 72;
    var stroke = o.stroke || "rgba(42,20,26,.55)";
    var bubbles = "";
    if (o.bubbles) {
      var bs = [[42, 74, 1.4], [55, 66, 1.1], [47, 58, 1.3], [58, 78, 1.2], [38, 64, 1], [52, 50, 1]];
      bs.forEach(function (b) { if (b[1] > top + 3) bubbles += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + b[2] + '" fill="rgba(255,255,255,.75)"/>'; });
    }
    return '<svg viewBox="0 0 100 142" aria-hidden="true"><defs><clipPath id="' + id + '"><path d="M24 10 C22 48 30 80 50 84 C70 80 78 48 76 10 Z"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><rect x="0" y="0" width="100" height="100" fill="' + color + '" fill-opacity="' + (o.opacity == null ? 1 : o.opacity) + '" style="transform:translateY(' + top.toFixed(1) + 'px);transition:transform .9s cubic-bezier(.2,.8,.2,1)"/>' + bubbles + "</g>" +
      '<path d="M24 10 C22 48 30 80 50 84 C70 80 78 48 76 10 Z" fill="none" stroke="' + stroke + '" stroke-width="1.6"/>' +
      '<path d="M31 17 C30 38 33 56 39 67" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M50 84 L50 128" stroke="' + stroke + '" stroke-width="1.8"/>' +
      '<ellipse cx="50" cy="131" rx="21" ry="4.5" fill="none" stroke="' + stroke + '" stroke-width="1.6"/></svg>';
  }
  function grapeIcon(color) {
    var f = color === "rot" ? "#5b1733" : "#b3b04f";
    var pts = [[9.5, 12], [16, 12], [22.5, 12], [12.7, 17.6], [19.3, 17.6], [16, 23.2], [9.5, 18], [22.5, 18]];
    var c = "";
    pts.slice(0, 6).forEach(function (p) { c += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.6" fill="' + f + '" stroke="rgba(0,0,0,.18)" stroke-width=".6"/>'; });
    return '<svg class="grape" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 8.4 L17 3.5" stroke="#6b5532" stroke-width="1.3" stroke-linecap="round"/><path d="M17 5.2 C20.5 2.2 24.5 2.8 26 5.6 C22.5 7.8 19.4 7.4 17 5.2Z" fill="#6f7f3a"/>' + c + "</svg>";
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1900);
  }

  /* ---------- Fragenbank ---------- */
  var ALLQ = {};
  MODULES.forEach(function (m) { m.quiz.forEach(function (q) { q.module = m.id; ALLQ[q.id] = q; }); });
  EXAM.forEach(function (q) { ALLQ[q.id] = q; });

  function record(q, correct) {
    S.stats[q.id] = correct;
    var at = S.wrong.indexOf(q.id);
    if (!correct && at < 0) S.wrong.push(q.id);
    if (correct && at >= 0) S.wrong.splice(at, 1);
    save();
  }

  function doneMinutes() {
    return MODULES.reduce(function (sum, m) { return sum + (S.done[m.id] ? m.minutes : 0); }, 0);
  }
  function moduleStart(id) {
    var t = 0;
    for (var i = 0; i < MODULES.length && MODULES[i].id !== id; i++) t += MODULES[i].minutes;
    return t;
  }

  /* ---------- Routing ---------- */
  function parseRoute() {
    var h = decodeURIComponent(location.hash.replace(/^#/, "")) || "start";
    var m = /^modul-(\d)$/.exec(h);
    if (m) return { view: "modul", id: +m[1] };
    return { view: h };
  }

  function render() {
    var r = parseRoute();
    topbar.innerHTML = vTop(r);
    var html;
    switch (r.view) {
      case "modul": html = byId(MODULES, r.id) ? vModule(r.id) : vHome(); break;
      case "spickzettel": html = vCheat(); break;
      case "pruefung": html = vExam(); break;
      case "wiederholen": html = vReview(); break;
      case "schnell": html = vQuick(); break;
      case "weinkarte": html = vCard(); break;
      case "verkostung": html = vTaste(); break;
      default: html = vHome();
    }
    app.innerHTML = html;
    app.querySelectorAll("[data-w]").forEach(paintEl);
  }
  function go() { render(); window.scrollTo(0, 0); }
  window.addEventListener("hashchange", go);

  function paintEl(el) {
    var fn = W[el.getAttribute("data-w")];
    if (fn) el.innerHTML = fn(el);
  }

  /* ---------- Kopfzeile ---------- */
  function vTop(r) {
    var right = r.view === "spickzettel"
      ? '<a class="chipbtn" href="#start">' + ic("arrowL") + "Zum Kurs</a>"
      : '<a class="chipbtn" href="#spickzettel">' + ic("book") + "Spickzettel</a>";
    return '<div class="topbar-in"><a class="brand" href="#start" aria-label="WEINMASTER 60, zur Übersicht">WEINMASTER <b>60</b></a><span class="spacer"></span>' + right + "</div>";
  }

  /* ---------- Startseite ---------- */
  var SKILLS = [
    "Rot, Weiß, Rosé und Schaumwein erklären und trocken von fruchtig unterscheiden",
    "13 wichtige Rebsorten an ihrem Profil erkennen und beschreiben",
    "Die bekanntesten Regionen einer Rebsorte und einem Stil zuordnen",
    "Einen Wein in vier Schritten verkosten und in drei Sätzen beschreiben",
    "Etiketten, Herkunftsstufen und Preise realistisch einordnen",
    "Wein und Essen mit sechs Regeln sicher kombinieren",
    "Wein richtig temperieren, belüften und Fehler wie Korkton erkennen",
    "Im Restaurant souverän bestellen und mit dem Sommelier sprechen"
  ];

  function vHome() {
    var doneCount = MODULES.filter(function (m) { return S.done[m.id]; }).length;
    var mins = doneMinutes();
    var next = MODULES.filter(function (m) { return !S.done[m.id]; })[0];
    var any = doneCount > 0 || Object.keys(S.step).some(function (k) { return S.step[k] > 0; });
    var startLabel = !any ? "60-Minuten-Kurs starten" : next ? "Weiter mit Modul " + next.id + ": " + next.title : "Zur Abschlussprüfung";
    var startHref = next ? "#modul-" + next.id : "#pruefung";

    var h = '<section class="hero enter">' +
      '<div class="hero-head"><h1 class="wordmark"><span class="w1">WEINMASTER</span><span class="w2">60</span></h1>' +
      '<div class="hero-glass" title="Dein Glas füllt sich mit jedem Modul">' + glass("#7a1830", { level: 0.06 + (mins / 60) * 0.9, stroke: "rgba(216,195,160,.75)" }) + "</div></div>" +
      '<p class="claim">„In einer Stunde mehr über Wein verstehen als bei zehn Restaurantbesuchen.“</p>' +
      '<p class="lede">Acht kurze Module, ein Ziel: Nach 60 Minuten kannst du eine Weinkarte lesen, ein Glas sachkundig beschreiben, Wein zum Essen wählen und mit jedem Sommelier entspannt auf Augenhöhe sprechen. Du lernst die wichtigsten 20 Prozent, die in rund 80 Prozent der Situationen weiterhelfen. Ohne Anmeldung, und auch ohne Weinflasche.</p>' +
      '<div class="progress-line"><div class="progress-meta"><span>' + doneCount + " von 8 Modulen</span><span>" + mins + " von 60 Minuten</span></div>" +
      '<div class="bar"><i style="width:' + Math.round((mins / 60) * 100) + '%"></i></div></div>' +
      '<a class="btn btn-gold" href="' + startHref + '">' + esc(startLabel) + ic("arrowR", "") .replace("<svg", '<svg width="18" height="18"') + "</a>" +
      (any ? '<button class="restart-link" data-act="restartCourse">Kurs von vorn beginnen (Fortschritt bleibt erhalten)</button>' : "") +
      "</section>";

    h += '<section class="quick-grid enter" aria-label="Schnellzugriff">' +
      '<a class="quick feature" href="#spickzettel">' + ic("book", "qi") + '<div><b>Wein-Spickzettel</b><span>Rebsorten, Regionen, Temperaturen, Etikettbegriffe und mehr, mit Suche. Für später, am Tisch oder im Laden.</span></div></a>' +
      '<a class="quick" href="#schnell">' + ic("timer", "qi") + "<b>Ich habe nur 5 Minuten</b><span>Die zehn wichtigsten Sätze und drei Fragen</span></a>" +
      '<a class="quick" href="#weinkarte">' + ic("menu", "qi") + "<b>Ich stehe vor einer Weinkarte</b><span>Vier Fragen, eine Stilempfehlung</span></a>" +
      '<a class="quick" href="#verkostung">' + ic("glass", "qi") + "<b>Ich probiere gerade Wein</b><span>Schritt für Schritt zur eigenen Notiz</span></a>" +
      '<a class="quick" href="#wiederholen">' + ic("repeat", "qi") + "<b>Fehler wiederholen</b><span>" + (S.wrong.length ? S.wrong.length + (S.wrong.length === 1 ? " Frage wartet" : " Fragen warten") : "Aktuell nichts offen") + "</span></a>" +
      '<a class="quick wide" href="#pruefung">' + ic("trophy", "qi") + "<b>Abschlussprüfung</b><span>" + (S.exam ? "Bestes Ergebnis: " + S.exam.best + " %" : "15 Fragen aus allen Modulen") + "</span></a>" +
      "</section>";

    h += '<section class="enter" aria-labelledby="pfad"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:14px"><h2 class="sec-title" id="pfad">Der Lernpfad</h2><span class="eyebrow">8 Module · 60 Min</span></div><div class="path">';
    MODULES.forEach(function (m) {
      var st = S.done[m.id] ? "done" : (S.step[m.id] > 0 ? "started" : "");
      var start = moduleStart(m.id);
      var label = st === "done" ? "Abgeschlossen" : st === "started" ? "Begonnen" : "ca. " + m.minutes + " Min";
      h += '<a class="path-item ' + st + '" href="#modul-' + m.id + '"><span class="path-num">' + (st === "done" ? ic("check").replace("<svg", '<svg width="22" height="22"') : m.id) + "</span>" +
        '<span class="path-body"><span class="path-top"><b>' + esc(m.title) + '</b><span class="path-time">' + start + "–" + (start + m.minutes) + "′</span></span>" +
        "<span>" + esc(m.teaser) + '</span><span class="path-status">' + label + "</span></span></a>";
    });
    h += "</div></section>";

    h += '<section class="paper enter"><span class="eyebrow">Nach dem Kurs kannst du</span><ul class="skills">';
    SKILLS.forEach(function (s) { h += "<li>" + ic("check") + "<span>" + esc(s) + "</span></li>"; });
    h += "</ul></section>";

    var answered = Object.keys(S.stats);
    var right = answered.filter(function (k) { return S.stats[k]; }).length;
    h += '<section class="paper enter" aria-labelledby="stand"><span class="eyebrow">Persönlicher Lernstand</span><h2 id="stand" style="font-size:1.6rem">Wo du gerade stehst</h2>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + doneCount + '/8</b><span>Module abgeschlossen</span></div>' +
      '<div class="stat"><b>' + mins + '′</b><span>von 60 Lernminuten</span></div>' +
      '<div class="stat"><b>' + (answered.length ? Math.round((right / answered.length) * 100) + " %" : "–") + "</b><span>Trefferquote (" + answered.length + " Fragen beantwortet)</span></div>" +
      '<div class="stat"><b>' + (S.exam ? S.exam.best + " %" : "–") + "</b><span>Abschlussprüfung, bestes Ergebnis</span></div></div>";
    if (S.wrong.length) h += '<a class="btn btn-wine" href="#wiederholen">' + ic("repeat").replace("<svg", '<svg width="18" height="18"') + S.wrong.length + (S.wrong.length === 1 ? " falsche Antwort wiederholen" : " falsche Antworten wiederholen") + "</a>";
    if (S.exam && S.exam.gaps && S.exam.gaps.length) {
      h += '<p class="note-sm">Laut deiner letzten Prüfung lohnt sich die Wiederholung von: ' + S.exam.gaps.map(function (id) { return '<a href="#modul-' + id + '">Modul ' + id + "</a>"; }).join(", ") + ".</p>";
    }
    h += ui.confirmReset
      ? '<div class="confirm"><span>Wirklich den gesamten Fortschritt, alle Quizergebnisse und gespeicherten Notizen löschen?</span><div class="btnrow"><button class="btn btn-wine btn-small" data-act="resetYes">Ja, alles löschen</button><button class="btn btn-ghost btn-small" data-act="resetNo">Abbrechen</button></div></div>'
      : '<button class="linkbtn" style="align-self:flex-start" data-act="reset">Fortschritt zurücksetzen</button>';
    h += '<p class="note-sm">Dein Lernstand wird nur auf diesem Gerät gespeichert. Es gibt kein Konto, und keine Daten verlassen dein Gerät.</p></section>';

    h += '<footer class="foot"><p>Alle Übungen funktionieren ohne Wein. Verkosten heißt nicht trinken: Profis spucken aus. Wer trinkt, tut es bewusst und mit Wasser dazu, und wer fährt, bleibt nüchtern.</p><p>Geschmack ist teilweise subjektiv. Die App beschreibt typische Eigenschaften, keine ausnahmslosen Regeln.</p></footer>';
    return h;
  }

  /* ---------- Modulansicht ---------- */
  var STEP_LABEL = { hook: "Einstieg", learn: "Wissen", example: "Beispiel", widget: "Übung", quiz: "Quiz", summary: "Fazit" };

  function vModule(id) {
    var m = byId(MODULES, id);
    var i = Math.min(Math.max(S.step[id] || 0, 0), m.steps.length - 1);
    var step = m.steps[i];
    if (step.type === "summary" && !S.done[id]) { S.done[id] = true; save(); }
    var start = moduleStart(id);

    var h = '<header class="mod-head enter"><span class="eyebrow">Modul ' + id + " von 8</span><h1>" + esc(m.title) + "</h1>" +
      '<div class="mod-meta"><span>' + ic("clock") + "ca. " + m.minutes + " Min</span><span>Kursminute " + start + "–" + (start + m.minutes) + " von 60</span><span>" + doneMinutes() + " Min geschafft</span></div>" +
      '<nav class="steps" aria-label="Schritte in diesem Modul">';
    m.steps.forEach(function (s, k) {
      h += '<button data-act="step" data-arg="' + k + '" class="' + (k === i ? "now" : k < i ? "seen" : "") + '"' + (k === i ? ' aria-current="step"' : "") + "><i></i><span>" + STEP_LABEL[s.type] + "</span></button>";
    });
    h += "</nav></header>";

    h += '<div class="enter" style="display:flex;flex-direction:column;gap:16px">' + renderStep(m, step, i) + "</div>";

    var isLast = i === m.steps.length - 1;
    var next = byId(MODULES, id + 1);
    var nextBtn;
    if (!isLast) nextBtn = '<button class="btn btn-gold" data-act="step" data-arg="' + (i + 1) + '">Weiter: ' + STEP_LABEL[m.steps[i + 1].type] + "</button>";
    else if (next) nextBtn = '<a class="btn btn-gold" href="#modul-' + next.id + '" data-act="openModule" data-arg="' + next.id + '">Modul ' + next.id + " starten</a>";
    else nextBtn = '<a class="btn btn-gold" href="#pruefung">Zur Abschlussprüfung</a>';
    var backBtn = i > 0
      ? '<button class="btn btn-ghost" data-act="step" data-arg="' + (i - 1) + '" aria-label="Zurück">' + ic("arrowL").replace("<svg", '<svg width="18" height="18"') + "</button>"
      : '<a class="btn btn-ghost" href="#start" aria-label="Zur Übersicht">' + ic("arrowL").replace("<svg", '<svg width="18" height="18"') + "</a>";
    h += '<div class="stepnav"><div class="stepnav-in">' + backBtn + nextBtn + "</div></div>";
    return h;
  }

  function renderStep(m, step, i) {
    switch (step.type) {
      case "hook": return '<section class="paper"><span class="eyebrow">Einstieg · Was meinst du?</span><div data-w="hook" data-k="' + m.id + '"></div></section>';
      case "learn": return renderLearn(step);
      case "example":
        return '<section class="paper example"><span class="eyebrow">Aus der Weinwelt</span><h2>' + esc(step.title) + "</h2><p>" + md(step.text) + '</p><div class="aha">' + ic("bulb") + "<p>" + md(step.aha) + "</p></div></section>";
      case "widget":
        return '<section class="paper"><span class="eyebrow">Übung</span><h2>' + esc(step.title) + '</h2><p class="muted">' + esc(step.intro) + '</p><div data-w="' + step.widget + '"></div></section>';
      case "quiz":
        initQuiz("m" + m.id, m.quiz.map(function (q) { return q.id; }), "module");
        return '<section class="paper"><span class="eyebrow">Quiz · Aktives Erinnern</span><h2>Teste dich</h2><div data-w="quiz" data-k="m' + m.id + '"></div></section>';
      case "summary": return renderSummary(m);
    }
    return "";
  }

  var RULE_ICONS = ["drop", "cube", "leaf", "flame", "spark", "scale"];
  function renderLearn(step) {
    var h = '<section class="paper"><span class="eyebrow">Wissen</span><h2>' + esc(step.title) + "</h2>";
    if (step.rules) {
      h += '<div class="rules">';
      PAIRING_RULES.forEach(function (r, k) {
        h += '<div class="rule"><span class="rule-ic">' + ic(RULE_ICONS[k]) + "</span><div><b>" + esc(r.t) + "</b><p>" + md(r.d) + "</p></div></div>";
      });
      h += "</div>";
    }
    step.sections.forEach(function (s) {
      h += '<div class="learn-sec"><h3>' + esc(s.h) + "</h3>";
      s.p.forEach(function (p) { h += "<p>" + md(p) + "</p>"; });
      if (s.say) { h += '<div class="say">'; s.say.forEach(function (q) { h += "<q>" + esc(q) + "</q>"; }); h += "</div>"; }
      h += "</div>";
    });
    return h + "</section>";
  }

  function renderSummary(m) {
    var s = m.summary;
    var qs = m.quiz.filter(function (q) { return q.id in S.stats; });
    var right = qs.filter(function (q) { return S.stats[q.id]; }).length;
    var next = byId(MODULES, m.id + 1);
    var h = '<section class="paper"><span class="done-badge">' + ic("check") + "Modul " + m.id + " abgeschlossen · " + m.minutes + " Min</span>" +
      "<h2>Fazit: " + esc(m.title) + '</h2><div class="learn-sec"><h3>Das hast du jetzt verstanden</h3><p>' + md(s.got) + "</p></div>" +
      '<div class="learn-sec"><h3>Die drei wichtigsten Erkenntnisse</h3><ol class="sum-list">';
    s.keys.forEach(function (k) { h += "<li><span>" + md(k) + "</span></li>"; });
    h += '</ol></div><div class="apply"><span class="eyebrow">So wendest du es im echten Leben an</span><p>' + md(s.apply) + "</p></div>";
    if (qs.length) h += '<p class="note-sm">Quiz in diesem Modul: ' + right + " von " + m.quiz.length + " richtig." + (right < qs.length ? " Falsche Antworten findest du unter „Fehler wiederholen“." : "") + "</p>";
    h += '<div class="btnrow">' + (next
      ? '<a class="btn btn-wine" href="#modul-' + next.id + '" data-act="openModule" data-arg="' + next.id + '">Weiter mit Modul ' + next.id + ": " + esc(next.title) + "</a>"
      : '<a class="btn btn-wine" href="#pruefung">Zur Abschlussprüfung</a>') +
      '<button class="btn btn-ghost" data-act="step" data-arg="0">Modul wiederholen</button></div></section>';
    return h;
  }

  /* ---------- Quiz ---------- */
  function initQuiz(key, ids, kind, force) {
    if (!ui.quiz[key] || force) ui.quiz[key] = { ids: ids, i: 0, picked: {}, kind: kind };
    return ui.quiz[key];
  }

  function quizQuestion(Q) {
    var q = ALLQ[Q.ids[Q.i]];
    var p = Q.picked[q.id];
    var answered = p != null;
    var h = '<div class="quiz"><div class="quiz-top"><span>Frage ' + (Q.i + 1) + " von " + Q.ids.length + "</span>" +
      (Q.kind !== "module" && q.module ? "<span>Modul " + q.module + "</span>" : "") + "</div>" +
      '<p class="quiz-q">' + esc(q.q) + '</p><div class="opts" role="group">';
    q.options.forEach(function (o, k) {
      var cls = "opt";
      if (answered) {
        if (k === q.answer) cls += " right";
        else if (k === p) cls += " wrong";
      }
      h += '<button class="' + cls + '" data-act="qpick" data-arg="' + k + '"' + (answered ? " disabled" : "") + '><span class="k">' + letters(k) + "</span><span>" + esc(o) + "</span></button>";
    });
    h += "</div>";
    if (answered) {
      var ok = p === q.answer;
      h += '<div class="fb ' + (ok ? "good" : "bad") + '" role="status"><b>' + (ok ? ic("check") + "Richtig." : ic("x") + "Nicht ganz.") + "</b>";
      if (!ok && q.why && q.why[p]) h += "<p>" + md(q.why[p]) + "</p>";
      if (!ok) h += "<p>Richtig ist: <strong>" + esc(q.options[q.answer]) + "</strong>.</p>";
      h += "<p>" + md(q.explain) + "</p></div>";
      h += '<div class="btnrow"><button class="btn btn-wine" data-act="qnext">' + (Q.i + 1 < Q.ids.length ? "Nächste Frage" : "Auswertung") + "</button></div>";
    }
    return h + "</div>";
  }

  function countRight(Q) {
    return Q.ids.filter(function (id) { return Q.picked[id] === ALLQ[id].answer; }).length;
  }

  function quizEnd(Q) {
    var right = countRight(Q), n = Q.ids.length;
    if (Q.kind === "exam") return examResult(Q);
    var h = '<div class="quiz"><p class="score-big">' + right + "<small> / " + n + "</small></p>";
    if (Q.kind === "module") {
      h += "<p>" + (right === n ? "Alles richtig. Sehr gut, weiter zum Fazit." : right >= n / 2 ? "Gut gemacht. Die falschen Antworten landen automatisch in deiner Wiederholung." : "Noch nicht ganz sicher. Lies die Erklärungen oben noch einmal durch und versuche es erneut.") + "</p>" +
        '<div class="btnrow"><button class="btn btn-ghost btn-small" data-act="qrestart">Quiz wiederholen</button></div>';
    } else if (Q.kind === "review") {
      h += "<p>" + (S.wrong.length ? "Noch " + S.wrong.length + (S.wrong.length === 1 ? " Frage ist" : " Fragen sind") + " offen. Wiederholen festigt das Wissen am besten mit etwas Abstand." : "Alle Fehler sind ausgebügelt. Stark.") + "</p>" +
        '<div class="btnrow">' + (S.wrong.length ? '<button class="btn btn-wine" data-act="reviewAgain">Offene Fragen üben</button>' : "") + '<a class="btn btn-ghost" href="#start">Zur Übersicht</a></div>';
    } else if (Q.kind === "quick") {
      if (!S.quick) { S.quick = true; save(); }
      h += "<p>Fünf Minuten, zehn Kernsätze, drei Fragen. Für mehr Tiefe startest du einfach den Kurs, jedes Modul dauert nur 5 bis 10 Minuten.</p>" +
        '<div class="btnrow"><a class="btn btn-wine" href="#modul-1">Kurs starten</a><a class="btn btn-ghost" href="#spickzettel">Zum Spickzettel</a><button class="btn btn-ghost" data-act="quickRestart">Noch einmal</button></div>';
    }
    return h + "</div>";
  }

  function examResult(Q) {
    var right = countRight(Q), n = Q.ids.length;
    var pct = Math.round((right / n) * 100);
    var per = {};
    Q.ids.forEach(function (id) {
      var q = ALLQ[id];
      per[q.module] = per[q.module] || [0, 0];
      per[q.module][1]++;
      if (Q.picked[id] === q.answer) per[q.module][0]++;
    });
    var gaps = Object.keys(per).filter(function (k) { return per[k][0] < per[k][1]; }).map(Number);
    var strong = Object.keys(per).filter(function (k) { return per[k][0] === per[k][1]; }).map(Number);
    if (!Q.saved) {
      Q.saved = true;
      S.exam = { last: pct, best: Math.max(pct, S.exam ? S.exam.best : 0), gaps: gaps, date: new Date().toISOString().slice(0, 10) };
      save();
    }
    var verdict = pct >= 87 ? ["Souverän", "Du beherrschst die Grundlagen sicher. Am Tisch, im Laden und im Gespräch bist du gut gerüstet. Weiter bringt dich jetzt vor allem bewusstes Probieren: zwei Weine nebeneinander, Notizen, Vergleiche."]
      : pct >= 67 ? ["Solide Basis", "Das meiste sitzt. Die Lücken unten schließt du schnell, am besten direkt mit dem passenden Modul."]
      : pct >= 40 ? ["Guter Anfang", "Ein Teil sitzt schon, anderes ist noch wackelig. Wiederhole die markierten Module, jedes dauert nur wenige Minuten."]
      : ["Noch am Anfang", "Ehrlich gesagt fehlt hier noch einiges, und das ist völlig in Ordnung. Geh die markierten Module noch einmal durch und versuch es dann erneut."];

    var h = '<div class="quiz"><span class="eyebrow">Ergebnis</span><p class="score-big">' + pct + '<small> %</small></p><h3 style="font-family:var(--display);font-size:1.5rem">' + verdict[0] + "</h3><p>" + verdict[1] + "</p>" +
      '<p class="note-sm">' + right + " von " + n + " Fragen richtig" + (S.exam && S.exam.best > pct ? " · dein bestes Ergebnis: " + S.exam.best + " %" : "") + "</p>" +
      '<div class="learn-sec"><h3>Nach Modulen</h3><div class="modbars">';
    MODULES.forEach(function (m) {
      var p = per[m.id];
      if (!p) return;
      h += '<div class="modbar"><span>' + m.id + " · " + esc(m.title) + "</span><em>" + p[0] + "/" + p[1] + '</em><div class="bar"><i style="width:' + Math.round((p[0] / p[1]) * 100) + '%"></i></div></div>';
    });
    h += "</div></div>";
    if (strong.length) h += '<div class="learn-sec"><h3>Deine Stärken</h3><p>' + strong.map(function (id) { return esc(byId(MODULES, id).title); }).join(" · ") + "</p></div>";
    if (gaps.length) {
      h += '<div class="learn-sec"><h3>Hier lohnt sich eine Wiederholung</h3><div class="gap-list">';
      gaps.forEach(function (id) {
        var m = byId(MODULES, id);
        h += '<div class="gap-item"><span>Modul ' + id + ": " + esc(m.title) + '</span><a class="btn btn-wine btn-small" href="#modul-' + id + '" data-act="openModule" data-arg="' + id + '" data-from="0">Wiederholen</a></div>';
      });
      h += "</div></div>";
    }
    h += '<p class="note-sm">Ein Test misst Wissen, keine Erfahrung. Die kommt mit jedem Glas, das du bewusst beschreibst, gern auch mit dem Modus „Ich probiere gerade Wein“.</p>' +
      '<div class="btnrow"><button class="btn btn-ghost btn-small" data-act="examStart">Prüfung wiederholen</button>' + (S.wrong.length ? '<a class="btn btn-ghost btn-small" href="#wiederholen">Falsche Antworten üben</a>' : "") + "</div></div>";
    return h;
  }

  /* ---------- Widgets ---------- */
  var W = {};

  W.quiz = function (el) {
    var Q = ui.quiz[el.getAttribute("data-k")];
    if (!Q) return "";
    if (Q.i >= Q.ids.length) return quizEnd(Q);
    return quizQuestion(Q);
  };

  W.hook = function (el) {
    var id = +el.getAttribute("data-k");
    var step = byId(MODULES, id).steps[0];
    var p = ui.hook[id];
    var answered = p != null;
    var h = '<div class="quiz"><p class="hook-q">' + esc(step.q) + '</p><div class="opts">';
    step.options.forEach(function (o, k) {
      var cls = "opt";
      if (answered && k === step.answer) cls += " right";
      else if (answered && k === p) cls += " picked";
      h += '<button class="' + cls + '" data-act="hook" data-arg="' + k + '"' + (answered ? " disabled" : "") + '><span class="k">' + letters(k) + "</span><span>" + esc(o) + "</span></button>";
    });
    h += "</div>";
    if (answered) {
      var lead = p === step.answer ? "Gut getippt." : p === -1 ? "Die Auflösung:" : "Spannender Tipp, aber so ist es:";
      h += '<div class="reveal"><span class="tag">' + lead + "</span><p>" + md(step.reveal) + "</p></div>";
    } else {
      h += '<p class="note-sm">Erst tippen, dann auflösen. Wer vorher rät, merkt sich die Antwort besser. <button class="linkbtn" data-act="hook" data-arg="-1">Direkt auflösen</button></p>';
    }
    return h + "</div>";
  };

  /* Modul 1: Weinstile & Süße */
  var STYLE_INFO = {
    weiss: { name: "Weißwein", color: "#e3cf63", how: "Meist aus weißen Trauben. Der Saft wird vor der Gärung von den Schalen getrennt.", typ: "Frische, Säure, Frucht von Zitrus bis tropisch, kaum Tannin.", ex: "Riesling, Sauvignon Blanc, Chardonnay" },
    rose: { name: "Rosé", color: "#ec9b88", how: "Rote Trauben, aber nur kurzer Schalenkontakt von einigen Stunden bis wenigen Tagen.", typ: "Rote Beeren, frisch, meist trocken, wenig Tannin.", ex: "Provence-Rosé (oft Grenache), Spätburgunder-Rosé" },
    rot: { name: "Rotwein", color: "#8d1330", how: "Rote Trauben gären mit den Schalen. Daher kommen Farbe und Tannin.", typ: "Von leicht und kirschig bis kräftig und dunkel. Tannin als trocknendes Gefühl.", ex: "Pinot Noir, Merlot, Cabernet Sauvignon" },
    schaum: { name: "Schaumwein", color: "#e8d88e", how: "Ein Grundwein gärt ein zweites Mal, und die Kohlensäure bleibt im Wein: in der Flasche (traditionelle Methode) oder im Tank.", typ: "Prickelnd und frisch. Flaschengärung bringt oft Noten von Brioche und Toast.", ex: "Champagner, Crémant, Cava, Winzersekt, Prosecco" }
  };
  function sugarTerm(g) {
    if (g <= 4) return ["trocken", "Kaum oder keine wahrnehmbare Süße. Die meisten Rotweine und viele Weißweine."];
    if (g <= 9) return ["trocken oder halbtrocken", "Noch „trocken“, wenn die Säure hoch genug ist (höchstens 2 g/l unter dem Zuckerwert), sonst halbtrocken. Viele deutsche Rieslinge liegen hier."];
    if (g <= 12) return ["halbtrocken", "Leichte Süße, die von Säure gut ausbalanciert werden kann."];
    if (g <= 18) return ["halbtrocken oder lieblich", "Halbtrocken nur bei ausreichend hoher Säure (höchstens 10 g/l unter dem Zuckerwert), sonst lieblich."];
    if (g <= 45) return ["lieblich", "Deutlich süß. Typisch zum Beispiel für manchen Mosel-Kabinett."];
    return ["süß", "Der Bereich der Dessertweine, etwa Auslese oder Sauternes."];
  }
  function sugarOut() {
    var t = sugarTerm(ui.styles.sugar);
    return '<div class="sugar-out"><b>' + t[0] + "</b><span>" + ui.styles.sugar + " g/l Restzucker</span></div><p class=\"note-sm\">" + t[1] + "</p>";
  }
  W.styles = function () {
    var st = ui.styles, info = STYLE_INFO[st.sel];
    var h = '<div class="seg full" role="group" aria-label="Weinstil">';
    ["weiss", "rose", "rot", "schaum"].forEach(function (k) {
      h += '<button data-act="style" data-arg="' + k + '"' + pressed(st.sel === k) + ">" + STYLE_INFO[k].name.replace("wein", "") + "</button>";
    });
    h += '</div><div class="subpanel"><div class="style-view">' + glass(info.color, { level: 0.6, bubbles: st.sel === "schaum" }) +
      '<div class="kv"><h3>' + info.name + '</h3><div><span class="k2">Entsteht</span><span>' + info.how + '</span></div><div><span class="k2">Typisch</span><span>' + info.typ + '</span></div><div><span class="k2">Beispiele</span><span>' + info.ex + "</span></div></div></div></div>";
    if (st.sel === "schaum") {
      h += '<div class="subpanel"><h3>Süße bei Schaumwein</h3><p class="note-sm">Hier gelten eigene Stufen, von herb nach süß: Brut Nature, Extra Brut, <strong>Brut</strong>, Extra Dry, Sec, Demi-Sec, Doux.</p><p class="note-sm"><strong>Aha:</strong> „Extra Dry“ ist süßer als „Brut“. Die Namen stammen aus Zeiten, in denen Schaumwein generell viel süßer getrunken wurde.</p></div>';
    } else {
      h += '<div class="subpanel"><label for="sugar" class="lbl" style="font-weight:600">Restzucker bei Stillwein: Schieb den Regler</label>' +
        '<input id="sugar" type="range" min="0" max="80" step="1" value="' + st.sugar + '" data-input="sugar" aria-describedby="sugar-out">' +
        '<div class="scale-ticks"><span>0</span><span>4</span><span>12</span><span>45</span><span>80 g/l</span></div><div id="sugar-out" aria-live="polite">' + sugarOut() + "</div></div>";
    }
    return h;
  };

  /* Modul 2: Lernkarten */
  W.grapes = function () {
    var g = ui.grapes;
    var list = GRAPES.filter(function (x) { return g.filter === "alle" || x.color === g.filter; });
    var openCount = GRAPES.filter(function (x) { return g.open[x.id]; }).length;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div class="seg" role="group" aria-label="Filter">' +
      ["alle", "weiss", "rot"].map(function (k) { return '<button data-act="gfilter" data-arg="' + k + '"' + pressed(g.filter === k) + ">" + { alle: "Alle 13", weiss: "Weiß (6)", rot: "Rot (7)" }[k] + "</button>"; }).join("") +
      '</div><span class="counter">' + openCount + " von 13 aufgedeckt</span></div>";
    h += '<div class="grape-grid">';
    list.forEach(function (x) {
      var open = !!g.open[x.id];
      h += '<article class="gcard"><button data-act="gopen" data-arg="' + x.id + '" aria-expanded="' + open + '">' + grapeIcon(x.color) +
        '<span class="gname">' + esc(x.name) + (x.alias ? '<span class="galias">' + esc(x.alias) + "</span>" : "") + '</span><span class="gtoggle">' + (open ? "Zuklappen" : "Aufdecken") + "</span></button>";
      if (!open) {
        h += '<p class="recall">Was erwartest du? Säure, Körper' + (x.color === "rot" ? ", Tannin" : "") + " und ein typisches Aroma, erst überlegen, dann aufdecken.</p>";
      } else {
        h += '<div class="gbody"><div class="profile"><div><span>Säure</span>' + meter(x.acid) + "<em></em></div><div><span>Körper</span>" + meter(x.body) + "<em></em></div>" +
          (x.tannin ? "<div><span>Tannin</span>" + meter(x.tannin) + "<em></em></div>" : '<div><span>Tannin</span><em>kaum (Weißwein)</em><em></em></div>') + "</div>" +
          '<div class="kv"><div><span class="k2">Aromen</span><span>' + esc(x.aromas) + '</span></div><div><span class="k2">Stil</span><span>' + esc(x.style) + '</span></div><div><span class="k2">Varianten</span><span>' + esc(x.variation) + '</span></div><div><span class="k2">Regionen</span><span>' + esc(x.regions) + '</span></div><div><span class="k2">Zum Essen</span><span>' + esc(x.food) + "</span></div></div>" +
          '<div class="mnemo">' + ic("bulb") + "<span>" + esc(x.mnemonic) + "</span></div></div>";
      }
      h += "</article>";
    });
    h += '</div><button class="linkbtn" style="align-self:flex-start" data-act="gall">' + (openCount === GRAPES.length ? "Alle zuklappen" : "Alle aufdecken") + "</button>";
    return h;
  };

  /* Modul 2: Klima */
  W.climate = function () {
    var c = ui.climate, d = CLIMATE[c.g], s = d.steps[c.s];
    var h = '<div class="seg" role="group" aria-label="Rebsorte">';
    Object.keys(CLIMATE).forEach(function (k) { h += '<button data-act="clgrape" data-arg="' + k + '"' + pressed(c.g === k) + ">" + CLIMATE[k].name + "</button>"; });
    h += '</div><div class="climate-track" role="group" aria-label="Klima">';
    d.steps.forEach(function (x, k) { h += '<button data-act="clstep" data-arg="' + k + '"' + pressed(c.s === k) + ">" + x.label + "</button>"; });
    h += '</div><div class="subpanel"><span class="eyebrow">' + esc(s.label) + "</span><h3>" + esc(s.place) + '</h3><p><strong>Aromen:</strong> ' + esc(s.aromas) + "</p><p>" + esc(s.text) + "</p>" +
      '<div class="profile"><div><span>Säure</span>' + meter(s.acid) + "<em></em></div><div><span>Körper</span>" + meter(s.body) + "<em></em></div><div><span>Alkohol</span>" + meter(s.alc) + "<em></em></div></div></div>" +
      '<p class="note-sm">Tendenz, keine Regel: Höhe, Lage, Lesezeitpunkt und Keller können das Bild verschieben.</p>';
    return h;
  };

  /* Modul 3: Karte */
  function proj(view, lat, lon) {
    if (view === "welt") return [lon + 180, 62 - lat];
    return [((lon + 10) / 28) * 320, ((52 - lat) / 16) * 258];
  }
  W.worldmap = function () {
    var mp = ui.map, sel = byId(REGIONS, mp.sel);
    var svg;
    if (mp.view === "welt") {
      svg = '<svg viewBox="0 0 360 112" role="img" aria-label="Schematische Weltkarte der Weinregionen">';
      for (var lo = -165; lo <= 180; lo += 15) for (var la = 60; la >= -45; la -= 15) { var p = proj("welt", la, lo); svg += '<circle class="m-grid" cx="' + p[0] + '" cy="' + p[1] + '" r=".7"/>'; }
      svg += '<rect class="m-band" x="0" y="12" width="360" height="20"/><rect class="m-band" x="0" y="92" width="360" height="20"/>';
      [[50, "50° N"], [30, "30° N"], [0, "Äquator"], [-30, "30° S"], [-50, "50° S"]].forEach(function (l) { var y = 62 - l[0]; svg += '<line class="m-line" x1="0" x2="360" y1="' + y + '" y2="' + y + '"/><text class="m-axis" x="3" y="' + (y - 1.5) + '">' + l[1] + "</text>"; });
      [["Nordamerika", -105, 50], ["Südamerika", -60, -12], ["Europa", 12, 58], ["Afrika", 20, 8], ["Asien", 95, 48], ["Australien", 134, -24]].forEach(function (c) { var p = proj("welt", c[2], c[1]); svg += '<text class="m-country" x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle">' + c[0] + "</text>"; });
      var eu1 = proj("welt", 52, -10), eu2 = proj("welt", 36, 18);
      svg += '<rect class="m-eu" data-act="mapview" data-arg="europa" x="' + eu1[0] + '" y="' + eu1[1] + '" width="' + (eu2[0] - eu1[0]) + '" height="' + (eu2[1] - eu1[1]) + '" rx="2"/>';
      REGIONS.forEach(function (r) {
        var p = proj("welt", r.lat, r.lon), eu = r.country !== "Neue Welt", on = r.id === mp.sel;
        svg += '<g data-act="region" data-arg="' + r.id + '" class="dot" role="button" aria-label="' + esc(r.name) + '"><circle class="m-hit" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (eu ? 2.5 : 8) + '"/><circle class="m-dot' + (on ? " sel" : "") + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (eu ? 1.3 : 2.8) + '"/>' +
          (!eu ? '<text class="m-lab" x="' + (p[0] + (r.lab === "l" ? -5 : 5)) + '" y="' + (p[1] + 3) + '" text-anchor="' + (r.lab === "l" ? "end" : "start") + '">' + esc(r.name) + "</text>" : "") + "</g>";
      });
      svg += "</svg>";
    } else {
      svg = '<svg viewBox="0 0 320 258" role="img" aria-label="Schematische Karte der europäischen Weinregionen">';
      for (var lo2 = -10; lo2 <= 18; lo2 += 2) for (var la2 = 52; la2 >= 36; la2 -= 2) { var q = proj("eu", la2, lo2); svg += '<circle class="m-grid" cx="' + q[0] + '" cy="' + q[1] + '" r=".9"/>'; }
      [50, 45, 40].forEach(function (l) { var y = proj("eu", l, 0)[1]; svg += '<line class="m-line" x1="0" x2="320" y1="' + y + '" y2="' + y + '"/><text class="m-axis" x="3" y="' + (y - 2) + '">' + l + "° N</text>"; });
      [["Frankreich", 2.4, 46.2], ["Deutschland", 10.6, 51.2], ["Spanien", -4.2, 39.6], ["Portugal", -8.2, 39.2], ["Italien", 14.2, 41.9]].forEach(function (c) { var p = proj("eu", c[2], c[1]); svg += '<text class="m-country" x="' + p[0] + '" y="' + p[1] + '" text-anchor="middle">' + c[0] + "</text>"; });
      REGIONS.filter(function (r) { return r.country !== "Neue Welt"; }).forEach(function (r) {
        var p = proj("eu", r.lat, r.lon), on = r.id === mp.sel;
        var lx = p[0], ly = p[1] + 3, anchor = "start";
        if (r.lab === "r") lx += 7;
        if (r.lab === "l") { lx -= 7; anchor = "end"; }
        if (r.lab === "t") { ly = p[1] - 8; anchor = "middle"; }
        if (r.lab === "b") { ly = p[1] + 14; anchor = "middle"; }
        if (r.lab === "bl") { lx -= 4; ly = p[1] + 14; anchor = "end"; }
        ly += r.dy || 0;
        svg += '<g data-act="region" data-arg="' + r.id + '" class="dot" role="button" aria-label="' + esc(r.name) + '"><circle class="m-hit" cx="' + p[0] + '" cy="' + p[1] + '" r="9"/>' + (on ? '<circle class="m-ring" cx="' + p[0] + '" cy="' + p[1] + '" r="7.5"/>' : "") +
          '<circle class="m-dot' + (on ? " sel" : "") + '" cx="' + p[0] + '" cy="' + p[1] + '" r="4"/><text class="m-lab' + (on ? " sel" : "") + '" x="' + lx + '" y="' + ly + '" text-anchor="' + anchor + '">' + esc(r.name) + "</text></g>";
      });
      svg += "</svg>";
    }
    var h = '<div class="map-legend"><div class="seg" role="group" aria-label="Kartenausschnitt"><button data-act="mapview" data-arg="europa"' + pressed(mp.view === "europa") + '>Europa</button><button data-act="mapview" data-arg="welt"' + pressed(mp.view === "welt") + '>Welt</button></div><span class="counter">Schematisch · nicht maßstabsgetreu</span></div>' +
      '<div class="mapbox">' + svg + "</div>";
    if (mp.view === "welt") h += '<p class="note-sm">Die goldenen Bänder markieren grob den Weinbaugürtel zwischen dem 30. und 50. Breitengrad. Tippe auf den gestrichelten Rahmen, um Europa zu vergrößern.</p>';
    h += '<div class="subpanel"><span class="eyebrow">' + esc(sel.country) + "</span><h3>" + esc(sel.name) + '</h3><div class="tag-row">' + sel.grapes.map(function (g) { return '<span class="tag">' + esc(g) + "</span>"; }).join("") + "</div><p>" + esc(sel.style) + '</p><p class="note-sm">' + esc(sel.note) + "</p></div>";
    h += '<div class="chips" role="group" aria-label="Land wählen" style="margin:0">';
    COUNTRIES.forEach(function (c) { h += '<button class="pill" data-act="mapcountry" data-arg="' + esc(c) + '"' + pressed(mp.country === c) + ">" + c + "</button>"; });
    h += '</div><div class="region-list">';
    REGIONS.filter(function (r) { return r.country === mp.country; }).forEach(function (r) {
      h += '<button class="region-btn" data-act="region" data-arg="' + r.id + '"' + pressed(r.id === mp.sel) + "><span>" + esc(r.name) + "</span><small>" + esc(r.grapes.slice(0, 2).join(", ")) + "</small></button>";
    });
    return h + "</div>";
  };

  /* Modul 3: Zuordnung */
  var ROUNDS = [
    { r: "Mosel", a: 0, o: ["Riesling", "Merlot", "Tempranillo"], e: "Die Mosel ist Riesling-Land: schlank, säurebetont, von trocken bis edelsüß." },
    { r: "Rioja", a: 1, o: ["Sangiovese", "Tempranillo", "Pinot Noir"], e: "Rioja heißt Tempranillo, oft ergänzt durch Garnacha." },
    { r: "Burgund (Rotwein)", a: 2, o: ["Cabernet Sauvignon", "Syrah", "Pinot Noir"], e: "Roter Burgunder ist fast immer Pinot Noir, weißer fast immer Chardonnay." },
    { r: "Toskana", a: 0, o: ["Sangiovese", "Grenache", "Merlot"], e: "Sangiovese ist das Rückgrat von Chianti Classico und Brunello." },
    { r: "Marlborough", a: 1, o: ["Chardonnay", "Sauvignon Blanc", "Riesling"], e: "Marlboroughs Sauvignon Blanc ist weltweit ein Stilbegriff: Maracuja, Stachelbeere, Limette." },
    { r: "Mendoza", a: 0, o: ["Malbec", "Pinot Noir", "Grüner Veltliner"], e: "Malbec in Höhenlagen am Fuß der Anden: dunkelfruchtig und samtig." },
    { r: "Wachau", a: 1, o: ["Chenin Blanc", "Grüner Veltliner", "Sangiovese"], e: "Grüner Veltliner (und Riesling) von den Donau-Terrassen." },
    { r: "Nördliche Rhône", a: 0, o: ["Syrah", "Tempranillo", "Chardonnay"], e: "Syrah in Hermitage und Côte-Rôtie: pfeffrig, straff, dunkel." }
  ];
  function exercise(state, rounds, renderRound, endText, resetAct) {
    if (state.i >= rounds.length) {
      return '<div class="exercise-end"><p class="score-big">' + state.score + "<small> / " + rounds.length + "</small></p><p>" + endText(state.score, rounds.length) + '</p><button class="btn btn-ghost btn-small" data-act="' + resetAct + '">Noch einmal</button></div>';
    }
    return renderRound(rounds[state.i], state);
  }
  function scoreMsg(s, n) {
    return s === n ? "Perfekt. Diese Zusammenhänge sitzen." : s >= n - 2 ? "Sehr ordentlich. Die Patzer merkst du dir jetzt umso besser." : "Lies dir die Erklärungen noch einmal durch und versuch es erneut.";
  }
  W.regionMatch = function () {
    return exercise(ui.rm, ROUNDS, function (r, st) {
      var h = '<div class="quiz"><div class="quiz-top"><span>Region ' + (st.i + 1) + " von " + ROUNDS.length + "</span><span>" + st.score + ' richtig</span></div><p class="quiz-q">' + esc(r.r) + '</p><div class="opts">';
      r.o.forEach(function (o, k) {
        var cls = "opt";
        if (st.picked != null) { if (k === r.a) cls += " right"; else if (k === st.picked) cls += " wrong"; }
        h += '<button class="' + cls + '" data-act="rmpick" data-arg="' + k + '"' + (st.picked != null ? " disabled" : "") + '><span class="k">' + letters(k) + "</span><span>" + esc(o) + "</span></button>";
      });
      h += "</div>";
      if (st.picked != null) h += '<div class="fb ' + (st.picked === r.a ? "good" : "bad") + '"><b>' + (st.picked === r.a ? ic("check") + "Richtig." : ic("x") + "Nicht ganz.") + "</b><p>" + esc(r.e) + '</p></div><div class="btnrow"><button class="btn btn-wine btn-small" data-act="rmnext">Weiter</button></div>';
      return h + "</div>";
    }, scoreMsg, "rmreset");
  };

  /* Modul 4: Verkostungstrainer */
  var DIMS = {
    saeure: { name: "Säure", lv: ["wenig", "mittel", "viel"], levels: [
      { t: "Der Wein wirkt weich und rund, manchmal etwas flach. Kaum Speichelfluss.", ex: "Warmer Chardonnay, Grenache, Merlot aus warmen Regionen", tr: "Stilles Wasser mit einem Hauch Apfelsaft: kaum Spannung." },
      { t: "Frisch, aber nicht spitz. Der Mund wird leicht feucht.", ex: "Merlot aus Bordeaux, Grauburgunder, Tempranillo", tr: "Ein Schluck Apfelsaft: angenehm frisch." },
      { t: "Lebendig und spritzig. Der Mund läuft regelrecht zusammen, auch nach dem Schlucken noch.", ex: "Riesling, Sauvignon Blanc, Sangiovese, Champagner", tr: "Wasser mit etwas Zitronensaft: Achte darauf, wie der Speichel fließt." }] },
    suesse: { name: "Süße", lv: ["trocken", "spürbar", "süß"], levels: [
      { t: "Kein oder kaum Zucker spürbar. Fruchtig kann der Wein trotzdem sein.", ex: "Die meisten Rotweine, Sancerre, Chablis", tr: "Ungesüßter Tee: Frische und Herbe, keine Süße." },
      { t: "Halbtrocken bis lieblich: eine spürbare Süße, die von Säure getragen wird.", ex: "Riesling Kabinett, Vouvray demi-sec", tr: "Apfelschorle: Süße und Säure im Gleichgewicht." },
      { t: "Zucker dominiert, die Textur wird fast ölig. Gute Süßweine bleiben dank Säure trotzdem frisch.", ex: "Riesling Auslese, Sauternes, Portwein", tr: "Traubensaft pur: viel Süße, wenig Säure. So wirkt ein Süßwein ohne Säure, nämlich plump." }] },
    tannin: { name: "Tannin", lv: ["wenig", "mittel", "viel"], levels: [
      { t: "Seidig, kaum Trocknen am Zahnfleisch.", ex: "Pinot Noir, Grenache, fast alle Weißweine", tr: "Kurz gezogener Früchtetee: kaum Gerbstoff." },
      { t: "Spürbar griffig, aber angenehm. Gibt dem Wein Struktur.", ex: "Merlot, Tempranillo, Sangiovese", tr: "Schwarzer Tee, drei Minuten gezogen." },
      { t: "Deutlich trocknend und rau. Zunge und Zahnfleisch fühlen sich pelzig an. In jungen Weinen oft noch kantig.", ex: "Junger Cabernet Sauvignon, Nebbiolo (Barolo), Syrah", tr: "Schwarzer Tee, zehn Minuten gezogen: Spür das Zusammenziehen an Zahnfleisch und Wangen." }] },
    koerper: { name: "Körper", lv: ["leicht", "mittel", "voll"], levels: [
      { t: "Leichtfüßig, fast wie Wasser mit Geschmack.", ex: "Mosel-Riesling Kabinett, Pinot Grigio, leichter Spätburgunder", tr: "Magermilch: dünn und leicht." },
      { t: "Spürbares Gewicht, aber nicht schwer.", ex: "Chianti Classico, Grauburgunder aus Baden, Merlot", tr: "Vollmilch: etwas mehr Substanz." },
      { t: "Dicht und mundfüllend, oft mit mehr Alkohol oder Extrakt.", ex: "Barossa Shiraz, kalifornischer Chardonnay, Amarone", tr: "Sahne: Sie füllt den Mund aus." }] },
    alkohol: { name: "Alkohol", lv: ["wenig", "mittel", "viel"], levels: [
      { t: "Kaum Wärme, leicht und frisch. Etwa 7–11 %.", ex: "Mosel-Kabinett, Moscato d'Asti", tr: "Achte bei Getränken auf die Wärme im Rachen. Hier ist kaum welche." },
      { t: "Leichte Wärme, gut eingebunden. Etwa 12–13,5 %.", ex: "Die meisten Weine aus gemäßigtem Klima", tr: "Die Wärme ist da, fällt aber nicht auf." },
      { t: "Deutliche Wärme im Rachen, trägt viel Körper. Zu viel wirkt brandig. Etwa ab 14,5 %.", ex: "Amarone, Châteauneuf-du-Pape, Barossa Shiraz", tr: "Zu warm serviert fällt Alkohol noch mehr auf, ein Grund, Rotwein kühler zu servieren." }] },
    abgang: { name: "Abgang", lv: ["kurz", "mittel", "lang"], levels: [
      { t: "Der Geschmack verschwindet nach wenigen Sekunden.", ex: "Einfache Alltagsweine, völlig normal", tr: "Zähl nach dem Schlucken still mit, bis der Geschmack weg ist." },
      { t: "Der Geschmack bleibt einige Sekunden.", ex: "Gute Qualitätsweine", tr: "Zähl bei jedem Getränk mit, auch bei Kaffee. Der Trick funktioniert überall." },
      { t: "Frucht und Würze hallen deutlich über zehn Sekunden nach. Ein klassischer Qualitätshinweis.", ex: "Große Rieslinge, Burgunder, Barolo", tr: "Ein Stück sehr dunkle Schokolade: Wie lange bleibt der Geschmack?" }] }
  };
  W.tastingTrainer = function () {
    var t = ui.tt, d = DIMS[t.dim], L = d.levels[t.lvl];
    var h = '<div class="seg" role="group" aria-label="Eigenschaft">';
    Object.keys(DIMS).forEach(function (k) { h += '<button data-act="ttdim" data-arg="' + k + '"' + pressed(t.dim === k) + ">" + DIMS[k].name + "</button>"; });
    h += '</div><div class="trainer-scale" role="group" aria-label="Stufe">';
    d.lv.forEach(function (l, k) { h += '<button data-act="ttlvl" data-arg="' + k + '"' + pressed(t.lvl === k) + ">" + meter([1, 3, 5][k]) + "<span>" + l + "</span></button>"; });
    h += '</div><div class="subpanel" aria-live="polite"><span class="eyebrow">' + d.name + ": " + d.lv[t.lvl] + "</span><p>" + esc(L.t) + '</p><div class="kv"><div><span class="k2">Beispiel</span><span>' + esc(L.ex) + '</span></div><div><span class="k2">Ohne Wein</span><span>' + esc(L.tr) + "</span></div></div></div>";
    return h;
  };

  /* Modul 4: Aromen einordnen */
  var AROMA_CATS = ["Frucht", "Blüten", "Kräuter & Grünes", "Gewürze", "Holz", "Reife"];
  var AROMA_ROUNDS = [
    { a: "Zitrone", c: 0, e: "Zitrus gehört zur Frucht, typisch für Riesling oder Sauvignon Blanc." },
    { a: "Vanille", c: 4, e: "Vanille stammt meist aus neuem Eichenholz, etwa in Rioja oder bei Chardonnay aus dem Barrique." },
    { a: "Veilchen", c: 1, e: "Eine Blütennote, oft bei Syrah von der nördlichen Rhône oder bei Nebbiolo." },
    { a: "Schwarzer Pfeffer", c: 3, e: "Ein Gewürz, klassisch bei Syrah aus kühlem Klima. Weißer Pfeffer ist das „Pfefferl“ des Grünen Veltliners." },
    { a: "Leder", c: 5, e: "Ein Reifearoma gereifter Rotweine, etwa bei Rioja Gran Reserva." },
    { a: "Frisch gemähtes Gras", c: 2, e: "Eine grüne Note, typisch für Sauvignon Blanc." },
    { a: "Cassis", c: 0, e: "Schwarze Johannisbeere, das Erkennungsaroma von Cabernet Sauvignon." },
    { a: "Toast", c: 4, e: "Röstaromen aus dem getoasteten Fass. Bei Champagner kann Toast auch von der langen Lagerung auf der Hefe kommen." }
  ];
  W.aromaSort = function () {
    return exercise(ui.as, AROMA_ROUNDS, function (r, st) {
      var h = '<div class="quiz"><div class="quiz-top"><span>Aroma ' + (st.i + 1) + " von " + AROMA_ROUNDS.length + "</span><span>" + st.score + ' richtig</span></div><p class="quiz-q">„' + esc(r.a) + '“</p><div class="dish-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">';
      AROMA_CATS.forEach(function (c, k) {
        var stl = "grid-template-columns:1fr";
        if (st.picked != null) { if (k === r.c) stl += ";background:var(--ok-bg);border-color:var(--ok)"; else if (k === st.picked) stl += ";background:var(--bad-bg);border-color:var(--bad)"; }
        h += '<button data-act="aspick" data-arg="' + k + '"' + (st.picked != null ? " disabled" : "") + ' style="' + stl + '"><span>' + c + "</span></button>";
      });
      h += "</div>";
      if (st.picked != null) h += '<div class="fb ' + (st.picked === r.c ? "good" : "bad") + '"><b>' + (st.picked === r.c ? ic("check") + "Richtig: " : ic("x") + "Gehört zu: ") + AROMA_CATS[r.c] + "</b><p>" + esc(r.e) + '</p></div><div class="btnrow"><button class="btn btn-wine btn-small" data-act="asnext">Weiter</button></div>';
      return h + "</div>";
    }, scoreMsg, "asreset");
  };

  /* Modul 5: Etiketten */
  var LABELS = [
    {
      tab: "Deutschland", hots: {
        prod: "Erzeuger. „Weingut Lindenhof“ ist frei erfunden.",
        vint: "Jahrgang 2022: das Erntejahr. Bei einem frischen Riesling Kabinett ist ein junger Jahrgang typisch.",
        region: "Anbaugebiet Mosel: eines der 13 deutschen Anbaugebiete. Ein erster Stilhinweis: kühl, säurebetont.",
        grape: "Rebsorte Riesling. Wird eine Sorte genannt, muss der Wein mindestens 85 % davon enthalten.",
        praed: "Prädikat Kabinett: beschreibt die Reife der Trauben bei der Lese und ist die unterste Prädikatsstufe. Über die Süße sagt es allein nichts.",
        taste: "„feinherb“: gesetzlich nicht definiert, meist leichte Restsüße. Steht gar nichts da, kann ein Kabinett auch deutlich süß sein.",
        alc: "9,5 % vol: niedrig. Hier ist Restzucker übrig geblieben, das passt zu „feinherb“.",
        quali: "Prädikatswein: die höchste Qualitätsstufe im deutschen Weinrecht, amtlich geprüft.",
        ap: "Amtliche Prüfnummer: Der Wein hat die amtliche Qualitätsprüfung bestanden. Diese Nummer ist erfunden.",
        abf: "Gutsabfüllung: Das Weingut hat selbst abgefüllt, die Trauben stammen aus eigenen Weinbergen.",
        sulf: "„Enthält Sulfite“: eine Pflichtangabe. Schwefel schützt fast jeden Wein vor Oxidation und Mikroben."
      },
      html: function (b) {
        return '<div class="wlabel lab-de"><span class="prod">' + b("prod", "Weingut Lindenhof") + '</span><span class="grape">' + b("grape", "Riesling") + '</span><span class="row">' + b("praed", "Kabinett") + b("taste", "feinherb") + b("vint", "2022") + '</span><span class="row">' + b("region", "Mosel") + b("quali", "Prädikatswein") + '</span><span class="fine">' + b("abf", "Gutsabfüllung") + b("alc", "9,5 % vol") + "<span>750 ml</span>" + b("ap", "A. P. Nr. 0 000 000 000 23") + b("sulf", "Enthält Sulfite") + "</span></div>";
      }
    },
    {
      tab: "Frankreich", hots: {
        grand: "„Grand Vin de Bordeaux“: ein verbreiteter Zusatz ohne rechtlich festgelegte Qualitätsstufe. Nicht verwechseln mit „Grand Cru Classé“.",
        chateau: "„Château Les Trois Chênes“ ist erfunden. „Château“ bedeutet hier schlicht Weingut.",
        app: "Appellation Haut-Médoc Protégée: geschützte Herkunft (AOP) am linken Ufer von Bordeaux. Keine Rebsorte genannt, doch die Herkunft deutet auf eine Cabernet-betonte Cuvée.",
        vint: "2019: der Jahrgang. Kräftige Bordeaux-Rotweine sind oft für einige Jahre Reife gemacht.",
        mis: "„Mis en bouteille au château“: auf dem Weingut abgefüllt.",
        alc: "13,5 % vol: typisch für einen reifen Bordeaux-Jahrgang."
      },
      html: function (b) {
        return '<div class="wlabel lab-fr"><span class="app">' + b("grand", "Grand Vin de Bordeaux") + '</span><svg viewBox="0 0 120 44" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><path d="M8 40h104M20 40V22h80v18M14 22l46-14 46 14M54 40v-9h12v9M28 28h8v6h-8zM84 28h8v6h-8zM56 14h8v5h-8zM20 22v-6h6v6M94 22v-6h6v6"/></svg><span class="chateau">' + b("chateau", "Château Les Trois Chênes") + '</span><span class="app">' + b("app", "Appellation Haut-Médoc Protégée") + '</span><span class="vint">' + b("vint", "2019") + '</span><span class="fine">' + b("mis", "Mis en bouteille au château") + b("alc", "13,5 % vol") + "<span>750 ml</span></span></div>";
      }
    },
    {
      tab: "Italien", hots: {
        fatt: "„Fattoria Poggio Sereno“ ist erfunden. Fattoria bedeutet Landgut.",
        name: "Chianti Classico: das historische Kerngebiet des Chianti zwischen Florenz und Siena, mit mindestens 80 % Sangiovese.",
        docg: "DOCG: die höchste italienische Herkunftsstufe. Echte DOCG-Flaschen tragen am Hals eine staatliche Banderole.",
        ris: "Riserva: eine längere vorgeschriebene Reifezeit als beim normalen Chianti Classico.",
        vint: "2020: der Jahrgang.",
        alc: "14 % vol: eher kräftig für Chianti, typisch für einen warmen Jahrgang.",
        seal: "Hier sitzt auf echten Flaschen oft der schwarze Hahn (Gallo Nero), das Symbol des Chianti-Classico-Konsortiums."
      },
      html: function (b) {
        return '<div class="wlabel lab-it"><span class="seal">' + b("seal", "Siegel") + '</span><span class="fatt">' + b("fatt", "Fattoria Poggio Sereno") + '</span><span class="name">' + b("name", "Chianti Classico") + '</span><span style="letter-spacing:.2em;font-size:.85rem">' + b("docg", "D.O.C.G.") + '</span><span style="font-size:1.1rem">' + b("ris", "Riserva") + " · " + b("vint", "2020") + '</span><span class="fine">' + b("alc", "14 % vol") + "<span>750 ml</span><span>Imbottigliato all'origine</span></span></div>";
      }
    }
  ];
  W.labels = function () {
    var lb = ui.lb, L = LABELS[lb.l];
    var b = function (id, text) { return '<button class="hot" data-act="hot" data-arg="' + id + '"' + pressed(lb.hot === id) + ">" + esc(text) + "</button>"; };
    var h = '<div class="seg full" role="group" aria-label="Etikett wählen">';
    LABELS.forEach(function (x, k) { h += '<button data-act="label" data-arg="' + k + '"' + pressed(lb.l === k) + ">" + x.tab + "</button>"; });
    h += '</div><div class="label-stage"><div style="width:100%;display:grid;place-items:center">' + L.html(b) + '</div><p class="disclaimer">Illustratives Beispiel · Erzeuger frei erfunden</p></div>';
    h += '<div class="subpanel" aria-live="polite">' + (lb.hot ? "<p>" + esc(L.hots[lb.hot]) + "</p>" : '<p class="note-sm">Tippe auf eine gestrichelt unterstrichene Angabe auf dem Etikett.</p>') + '<span class="counter">' + Object.keys(L.hots).length + " Angaben auf diesem Etikett</span></div>";
    return h;
  };

  /* Modul 5: Preise */
  var TIERS = [
    { p: "um 8 €", h: "Solider Alltagswein", x: 0.08, expect: "Sauber gemacht, fruchtig, unkompliziert. Oft aus größeren Betrieben oder Genossenschaften, aus ertragreichen Lagen und maschinell gelesen.", pay: "Ein großer Teil des Preises geht an Steuer, Flasche, Verschluss, Transport und Handel. Für den Wein selbst bleibt vergleichsweise wenig.", tip: "Weniger bekannte Regionen und Sorten bieten hier oft mehr Charakter: Grüner Veltliner, Côtes du Rhône, Douro, Chenin Blanc aus Südafrika." },
    { p: "um 20 €", h: "Der Sprung zur Handschrift", x: 0.36, expect: "Hier liegt oft der deutlichste Qualitätssprung: kleinere Erträge, bessere Lagen, Handarbeit, mehr Tiefe und erkennbare Herkunft.", pay: "Mehr Arbeit im Weinberg, sorgfältigere Auslese, eventuell Holzfässer und längere Reife.", tip: "Orts- und Lagenweine guter Erzeuger, Chianti Classico, Rioja Reserva. Häufig das beste Verhältnis von Preis und Genuss." },
    { p: "um 50 €", h: "Renommee und Reifepotenzial", x: 0.64, expect: "Bekannte Erzeuger, Spitzenlagen, kleine Mengen, oft auf lange Lagerung ausgelegt. Jung getrunken manchmal noch verschlossen.", pay: "Zunehmend auch Name, Nachfrage und Knappheit, nicht nur Mehraufwand.", tip: "Lohnt sich vor allem, wenn du den Stil schon magst, und oft erst nach einigen Jahren Reife." },
    { p: "100 € und mehr", h: "Seltenheit, Prestige, Sammlerwert", x: 0.92, expect: "Kann großartig sein. Der Geschmack wird aber nicht im gleichen Maß besser, wie der Preis steigt.", pay: "Vor allem Knappheit, Markenwert, Kritikerbewertungen und Sammlernachfrage.", tip: "Teuer heißt nicht automatisch besser, und schon gar nicht automatisch besser für dich. Handwerkliche Qualität und persönliche Vorliebe sind zwei verschiedene Dinge." }
  ];
  function curveY(x) { return 78 - 62 * (1 - Math.pow(1 - x, 2.6)); }
  W.priceTiers = function () {
    var t = TIERS[ui.pt];
    var h = '<div class="seg full" role="group" aria-label="Preisklasse">';
    TIERS.forEach(function (x, k) { h += '<button data-act="price" data-arg="' + k + '"' + pressed(ui.pt === k) + ">" + ["8 €", "20 €", "50 €", "100 €+"][k] + "</button>"; });
    var path = "";
    for (var i = 0; i <= 40; i++) { var x = i / 40; path += (i ? "L" : "M") + (20 + x * 270).toFixed(1) + " " + curveY(x).toFixed(1); }
    var mx = 20 + t.x * 270, my = curveY(t.x);
    h += '</div><svg viewBox="0 0 300 100" role="img" aria-label="Schematische Kurve: Mit steigendem Preis wächst der spürbare Qualitätsgewinn immer langsamer" style="width:100%;height:auto">' +
      '<path d="M20 80H292M20 80V10" stroke="var(--ink-2)" stroke-width=".8" fill="none"/><path d="' + path + '" fill="none" stroke="var(--wine)" stroke-width="2"/>' +
      '<line x1="' + mx + '" x2="' + mx + '" y1="' + my + '" y2="80" stroke="var(--gold)" stroke-dasharray="3 3"/><circle cx="' + mx + '" cy="' + my + '" r="5" fill="var(--gold)" stroke="var(--wine)" stroke-width="1.5"/>' +
      '<text x="292" y="93" text-anchor="end" font-size="8.5" fill="var(--ink-2)" font-family="var(--mono)">Preis →</text><text x="24" y="9" font-size="8.5" fill="var(--ink-2)" font-family="var(--mono)">spürbarer Qualitätsgewinn (schematisch)</text></svg>' +
      '<div class="subpanel price-out" aria-live="polite"><span class="price-big">' + t.p + "</span><h3>" + t.h + '</h3><div class="kv"><div><span class="k2">Erwarte</span><span>' + t.expect + '</span></div><div><span class="k2">Du zahlst</span><span>' + t.pay + '</span></div><div><span class="k2">Tipp</span><span>' + t.tip + "</span></div></div></div>" +
      '<p class="note-sm">Im Restaurant kostet eine Flasche oft das Zwei- bis Dreifache des Ladenpreises, manchmal mehr. Darin stecken Service, Gläser, Lagerung und Personal. Die Kurve ist eine Veranschaulichung, keine Messung.</p>';
    return h;
  };

  /* Modul 6: Speisenbegleiter */
  W.pairing = function () {
    var d = byId(DISHES, ui.pair);
    var h = '<div class="dish-grid" role="group" aria-label="Gericht wählen">';
    DISHES.forEach(function (x) { h += '<button data-act="dish" data-arg="' + x.id + '"' + pressed(ui.pair === x.id) + ">" + ic("plate") + "<span>" + esc(x.name) + "</span></button>"; });
    h += '</div><div class="subpanel" aria-live="polite"><span class="eyebrow">Regel: ' + esc(d.rule) + "</span><h3>" + esc(d.name) + "</h3>";
    d.picks.forEach(function (p) { h += '<div class="pick"><b>' + esc(p.style) + '</b><span class="ex">' + esc(p.ex) + "</span><p>" + esc(p.why) + "</p></div>"; });
    h += '<div class="avoid"><strong>Lieber nicht:</strong> ' + esc(d.avoid.what) + ". " + esc(d.avoid.why) + "</div></div>";
    return h;
  };

  /* Modul 7: Thermometer */
  W.thermometer = function () {
    var t = byId(TEMPS, ui.th);
    var y = function (c) { return 210 - ((c - 4) / 20) * 196; };
    var svg = '<svg viewBox="0 0 92 250" role="img" aria-label="Thermometer: ' + t.min + " bis " + t.max + ' Grad">' +
      '<rect x="20" y="8" width="16" height="212" rx="8" fill="var(--paper-2)" stroke="var(--line)"/><circle cx="28" cy="230" r="15" fill="var(--wine)"/>' +
      '<rect x="24" y="' + y(t.max) + '" width="8" height="' + (226 - y(t.max)) + '" rx="4" fill="var(--wine)" style="transition:all .6s ease"/>' +
      '<rect x="16" y="' + y(22) + '" width="24" height="' + (y(20) - y(22)) + '" fill="rgba(154,43,34,.18)"/>' +
      '<rect x="14" y="' + y(t.max) + '" width="28" height="' + (y(t.min) - y(t.max)) + '" rx="3" fill="rgba(201,163,91,.45)" stroke="var(--gold)" stroke-width="1.5"/>';
    for (var c = 4; c <= 24; c += 2) svg += '<line x1="40" x2="' + (c % 4 === 0 ? 48 : 44) + '" y1="' + y(c) + '" y2="' + y(c) + '" stroke="var(--ink-2)" stroke-width=".8"/>' + (c % 4 === 0 ? '<text x="52" y="' + (y(c) + 3.5) + '" font-size="10" fill="var(--ink-2)" font-family="var(--mono)">' + c + "°</text>" : "");
    svg += '<text x="70" y="' + (y(21) + 3) + '" font-size="7.5" fill="var(--bad)" font-family="var(--mono)">Raum</text></svg>';
    var h = '<div class="thermo">' + svg + '<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><span class="temp-big">' + t.min + "–" + t.max + ' °C</span><h3>' + esc(t.name) + '</h3><p class="note-sm">' + esc(t.ex) + '</p><p class="note-sm">Das rote Feld markiert typische Wohnzimmertemperatur (20–22 °C), für fast jeden Wein zu warm.</p></div></div>';
    h += '<div class="seg" role="group" aria-label="Weinstil">';
    TEMPS.forEach(function (x) { h += '<button data-act="temp" data-arg="' + x.id + '"' + pressed(ui.th === x.id) + ">" + esc(x.name) + "</button>"; });
    return h + "</div>";
  };

  /* Modul 7: Mythos oder Fakt */
  var MF = [
    { c: "Nicht jeder Wein wird mit dem Alter besser.", fact: true, e: "Stimmt. Die meisten Weine sind für einen Genuss innerhalb weniger Jahre gemacht. Nur Weine mit viel Struktur gewinnen durch Reife." },
    { c: "Ein Silberlöffel im Flaschenhals hält Sekt frisch.", fact: false, e: "Mythos. Ein Effekt ist nicht belegt. Was hilft: ein Sektverschluss und der Kühlschrank." },
    { c: "Auch geöffneter Rotwein gehört in den Kühlschrank.", fact: true, e: "Stimmt. Kälte bremst die Oxidation. Vor dem Servieren einfach etwas temperieren." },
    { c: "Schraubverschluss bedeutet billigen Wein.", fact: false, e: "Mythos. Viele hochwertige Weine nutzen ihn, und Korkfehler sind damit ausgeschlossen." },
    { c: "Einen Korkfehler erkennt man an Korkstückchen im Glas.", fact: false, e: "Mythos. Krümel sind harmlos. Ein Korkfehler riecht muffig nach nassem Karton." },
    { c: "Eine Flasche nur zu entkorken, belüftet den Wein kaum.", fact: true, e: "Stimmt. Durch den schmalen Hals kommt kaum Luft an den Wein. Karaffe oder Schwenken im Glas wirken deutlich mehr." }
  ];
  W.mythFact = function () {
    return exercise(ui.mf, MF, function (r, st) {
      var h = '<div class="quiz"><div class="quiz-top"><span>Behauptung ' + (st.i + 1) + " von " + MF.length + "</span><span>" + st.score + ' richtig</span></div><p class="claimcard">„' + esc(r.c) + '“</p>';
      if (st.picked == null) {
        h += '<div class="duo"><button class="btn btn-ghost" data-act="mfpick" data-arg="0">Mythos</button><button class="btn btn-wine" data-act="mfpick" data-arg="1">Fakt</button></div>';
      } else {
        var ok = (st.picked === 1) === r.fact;
        h += '<div class="fb ' + (ok ? "good" : "bad") + '"><b>' + (ok ? ic("check") + "Richtig." : ic("x") + "Daneben.") + "</b><p>" + esc(r.e) + '</p></div><div class="btnrow"><button class="btn btn-wine btn-small" data-act="mfnext">Weiter</button></div>';
      }
      return h + "</div>";
    }, scoreMsg, "mfreset");
  };

  /* Modul 8: Souverän-Training */
  W.souveraen = function () {
    return exercise(ui.sv, SOUVERAEN, function (r, st) {
      var h = '<div class="quiz"><div class="quiz-top"><span>Situation ' + (st.i + 1) + " von " + SOUVERAEN.length + "</span><span>" + st.score + ' souverän</span></div><p class="quiz-q">' + esc(r.s) + '</p><div class="opts">';
      r.o.forEach(function (o, k) {
        var cls = "opt";
        if (st.picked != null) { if (o.ok) cls += " right"; else if (k === st.picked) cls += " wrong"; }
        h += '<button class="' + cls + '" data-act="svpick" data-arg="' + k + '"' + (st.picked != null ? " disabled" : "") + '><span class="k">' + letters(k) + "</span><span>" + esc(o.t) + "</span></button>";
      });
      h += "</div>";
      if (st.picked != null) {
        var o = r.o[st.picked];
        h += '<div class="fb ' + (o.ok ? "good" : "bad") + '"><b>' + (o.ok ? ic("check") + "Souverän." : ic("x") + "Geht besser.") + "</b><p>" + esc(o.fb) + "</p>" + (!o.ok ? "<p>" + esc(r.o.filter(function (x) { return x.ok; })[0].fb) + "</p>" : "") + '</div><div class="btnrow"><button class="btn btn-wine btn-small" data-act="svnext">Weiter</button></div>';
      }
      return h + "</div>";
    }, function (s, n) { return s === n ? "Du triffst den Ton: kompetent, freundlich, unaufgeregt." : "Merke: Stil beschreiben, Fragen stellen, freundlich bleiben, und anderen ihren Geschmack lassen."; }, "svreset");
  };

  /* ---------- Spickzettel ---------- */
  var CHEAT_CATS = [["alle", "Alles"], ["rebsorten", "Rebsorten"], ["regionen", "Regionen"], ["verkostung", "Verkosten"], ["schema", "Struktur"], ["speisen", "Essen"], ["temperatur", "Temperatur"], ["etikett", "Etikett"], ["saetze", "Sätze"], ["mythen", "Mythen"]];
  var CHEAT = null;
  function buildCheat() {
    var E = [];
    function add(cat, title, sub, html, extra) { E.push({ cat: cat, title: title, sub: sub || "", html: html, text: norm(title + " " + (sub || "") + " " + html.replace(/<[^>]+>/g, " ") + " " + (extra || "")) }); }
    GRAPES.forEach(function (g) {
      add("rebsorten", g.name, (g.alias ? g.alias + " · " : "") + (g.color === "rot" ? "rot" : "weiß"),
        '<div class="profile"><div><span>Säure</span>' + meter(g.acid) + "<em></em></div><div><span>Körper</span>" + meter(g.body) + "<em></em></div>" + (g.tannin ? "<div><span>Tannin</span>" + meter(g.tannin) + "<em></em></div>" : "") + "</div><p>" + esc(g.aromas) + '</p><p class="note-sm"><strong>Regionen:</strong> ' + esc(g.regions) + '</p><p class="note-sm"><strong>Essen:</strong> ' + esc(g.food) + '</p><p class="note-sm"><em>' + esc(g.mnemonic) + "</em></p>");
    });
    REGIONS.forEach(function (r) {
      add("regionen", r.name, r.country, '<div class="tag-row">' + r.grapes.map(function (g) { return '<span class="tag">' + esc(g) + "</span>"; }).join("") + "</div><p>" + esc(r.style) + "</p>");
    });
    add("verkostung", "Die vier Schritte", "Sehen · Riechen · Schmecken · Bewerten", "<ol style=\"margin:0;padding-left:20px;display:grid;gap:6px\">" + TASTING_STEPS.map(function (s) { return "<li><strong>" + s.t + ":</strong> " + esc(s.d) + "</li>"; }).join("") + "</ol>");
    add("verkostung", "Notiz in drei Sätzen", "Formel", "<p>Farbe → eine oder zwei Aromagruppen → Struktur (Süße, Säure, Tannin, Körper) → Urteil.</p><p class=\"note-sm\"><em>„Mittleres Rubinrot, Kirsche und etwas Waldboden. Trocken, frische Säure, feines Tannin, leichter Körper. Ausgewogen, mittellang, schön zu Ente.“</em></p><p class=\"note-sm\">Aromen sind subjektiv. Struktur ist das, worüber man sich am ehesten einig wird.</p>");
    var rows = GRAPES.slice().sort(function (a, b) { return (a.color === b.color ? 0 : a.color === "weiss" ? -1 : 1) || a.body - b.body; });
    add("schema", "Säure · Tannin · Körper", "alle 13 Sorten", '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sorte</th><th>Säure</th><th>Tannin</th><th>Körper</th></tr></thead><tbody>' +
      rows.map(function (g) { return "<tr><td>" + esc(g.name) + '</td><td class="n">' + meter(g.acid) + '</td><td class="n">' + (g.tannin ? meter(g.tannin) : '<span class="note-sm">–</span>') + '</td><td class="n">' + meter(g.body) + "</td></tr>"; }).join("") + "</tbody></table></div><p class=\"note-sm\">Typische Werte. Klima, Lage und Ausbau verschieben sie.</p>");
    STRUCTURE.forEach(function (s) { add("schema", s.t, "Begriff", "<p>" + esc(s.d) + "</p>"); });
    PAIRING_RULES.forEach(function (r) { add("speisen", r.t, "Regel", "<p>" + esc(r.d) + "</p>"); });
    add("speisen", "Schnellwahl", "Gericht → Wein", '<div class="tbl-wrap"><table class="tbl"><tbody>' + DISHES.map(function (d) { return "<tr><td><strong>" + esc(d.name) + "</strong></td><td>" + esc(d.picks[0].ex) + "</td></tr>"; }).join("") + "</tbody></table></div>");
    add("temperatur", "Serviertemperaturen", "in °C", '<div class="tbl-wrap"><table class="tbl"><tbody>' + TEMPS.map(function (t) { return "<tr><td><strong>" + esc(t.name) + '</strong><br><span class="note-sm">' + esc(t.ex) + '</span></td><td class="n">' + t.min + "–" + t.max + " °C</td></tr>"; }).join("") + '</tbody></table></div><p class="note-sm">Faustregel: Rotwein 15–20 Minuten in den Kühlschrank, Weißwein 15–20 Minuten vorher heraus.</p>');
    GLOSSARY.forEach(function (g) { add("etikett", g.t, "", "<p>" + esc(g.d) + "</p>"); });
    PHRASES.forEach(function (p, k) { add("saetze", "Satz " + (k + 1), "", '<p style="font-family:var(--display);font-style:italic;font-size:1.05rem">„' + esc(p) + "“</p>"); });
    MYTHS.forEach(function (m, k) { add("mythen", "Mythos " + (k + 1), "", '<p class="myth">' + esc(m.m) + "</p><p>" + esc(m.f) + "</p>"); });
    return E;
  }
  function vCheat() {
    if (!CHEAT) CHEAT = buildCheat();
    var c = ui.cheat;
    var h = '<header class="mode-head enter"><span class="eyebrow">Nachschlagen in Sekunden</span><h1>Wein-Spickzettel</h1><p class="muted">Alles Wichtige aus dem Kurs, kompakt. Suche nach einer Sorte, einer Region oder einem Begriff.</p></header>' +
      '<div class="search">' + ic("search") + '<input id="cheat-q" type="search" placeholder="z. B. Rioja, Tannin, Spätlese, Steak" value="' + esc(c.q) + '" data-input="cheat" autocomplete="off" aria-label="Spickzettel durchsuchen"></div>' +
      '<div class="chips" role="group" aria-label="Kategorie">';
    CHEAT_CATS.forEach(function (k) { h += '<button data-act="cheatcat" data-arg="' + k[0] + '"' + pressed(c.cat === k[0]) + ">" + k[1] + "</button>"; });
    h += '</div><div data-w="cheat" aria-live="polite"></div>';
    return h;
  }
  W.cheat = function () {
    var c = ui.cheat, q = norm(c.q.trim());
    var terms = q ? q.split(/\s+/) : [];
    var list = CHEAT.filter(function (e) {
      if (c.cat !== "alle" && e.cat !== c.cat) return false;
      return terms.every(function (t) { return e.text.indexOf(t) >= 0; });
    });
    if (!list.length) return '<p class="empty">Keine Treffer für „' + esc(c.q) + '“. Versuch es mit einem anderen Begriff oder wähle „Alles“.</p>';
    var h = '<div class="cheat-list">', last = null;
    list.forEach(function (e) {
      if (e.cat !== last && c.cat === "alle") { var lab = CHEAT_CATS.filter(function (k) { return k[0] === e.cat; })[0][1]; h += '<h2 class="cheat-group">' + lab + "</h2>"; last = e.cat; }
      h += '<article class="ccard"><h3><span>' + esc(e.title) + "</span>" + (e.sub ? "<small>" + esc(e.sub) + "</small>" : "") + "</h3>" + e.html + "</article>";
    });
    return h + "</div>";
  };

  /* ---------- Abschlussprüfung ---------- */
  function vExam() {
    var Q = ui.quiz.exam;
    var h = '<header class="mode-head enter"><span class="eyebrow">Modul 8 · Abschluss</span><h1>Abschlussprüfung</h1></header>';
    if (Q) return h + '<section class="paper enter"><div data-w="quiz" data-k="exam"></div></section>';
    h += '<section class="paper enter"><p>15 Fragen aus allen acht Modulen, etwa vier Minuten. Du bekommst sofort Feedback und am Ende eine ehrliche Einschätzung, wo du sicher bist und welches Modul sich noch einmal lohnt.</p>';
    if (S.exam) h += '<div class="apply"><span class="eyebrow">Letzter Versuch</span><p>' + S.exam.last + " % (bestes Ergebnis: " + S.exam.best + " %)" + (S.exam.gaps && S.exam.gaps.length ? ". Wiederholen lohnt bei: " + S.exam.gaps.map(function (id) { return "Modul " + id; }).join(", ") : "") + ".</p></div>";
    var open = MODULES.filter(function (m) { return !S.done[m.id]; }).length;
    if (open) h += '<p class="note-sm">Du hast noch ' + open + (open === 1 ? " Modul" : " Module") + " offen. Die Prüfung geht trotzdem jederzeit.</p>";
    return h + '<button class="btn btn-gold" data-act="examStart">Prüfung starten</button></section>';
  }

  /* ---------- Wiederholung ---------- */
  function vReview() {
    var h = '<header class="mode-head enter"><span class="eyebrow">Persönlicher Lernstand</span><h1>Fehler wiederholen</h1><p class="muted">Hier landen alle Fragen, die du zuletzt falsch beantwortet hast. Eine richtige Antwort nimmt sie aus der Liste.</p></header>';
    if (!ui.quiz.review && !S.wrong.length) {
      return h + '<section class="paper enter"><p>Aktuell gibt es nichts zu wiederholen. Entweder hast du alles richtig, oder du hast noch keine Quizfragen beantwortet.</p><div class="btnrow"><a class="btn btn-wine" href="#start">Zur Übersicht</a><a class="btn btn-ghost" href="#pruefung">Zur Prüfung</a></div></section>';
    }
    if (!ui.quiz.review) initQuiz("review", S.wrong.slice(), "review");
    return h + '<section class="paper enter"><div data-w="quiz" data-k="review"></div></section>';
  }

  /* ---------- 5-Minuten-Modus ---------- */
  function vQuick() {
    var qk = ui.quick;
    var h = '<header class="mode-head enter"><span class="eyebrow">Schnellmodus</span><h1>Ich habe nur 5 Minuten</h1><p class="muted">Zehn Kernsätze, je etwa 20 Sekunden, danach drei Fragen. Das ersetzt den Kurs nicht, hilft aber heute Abend schon.</p></header>';
    if (qk.phase === "quiz") return h + '<section class="paper enter"><div data-w="quiz" data-k="quick"></div></section>';
    var c = QUICK[qk.i];
    h += '<section class="paper qcard enter"><div style="display:flex;flex-direction:column;gap:12px"><span class="eyebrow">' + (qk.i + 1) + " / " + QUICK.length + "</span><h2>" + esc(c.t) + "</h2><p>" + esc(c.d) + '</p></div><div class="dots" aria-hidden="true">';
    for (var i = 0; i < QUICK.length; i++) h += '<i class="' + (i <= qk.i ? "on" : "") + '"></i>';
    h += '</div><div class="btnrow" style="justify-content:space-between">' + (qk.i > 0 ? '<button class="btn btn-ghost btn-small" data-act="quickPrev">Zurück</button>' : "<span></span>") +
      '<button class="btn btn-wine" data-act="quickNext">' + (qk.i + 1 < QUICK.length ? "Nächster Satz" : "Zu den drei Fragen") + "</button></div></section>";
    return h;
  }

  /* ---------- Weinkarten-Modus ---------- */
  function vCard() {
    var wk = ui.wk;
    var h = '<header class="mode-head enter"><span class="eyebrow">Praxismodus</span><h1>Ich stehe vor einer Weinkarte</h1><p class="muted">Vier schnelle Fragen, dann weißt du, wonach du auf der Karte suchst und was du dem Service sagen kannst.</p></header>';
    if (wk.i < CARD_QUESTIONS.length) {
      var q = CARD_QUESTIONS[wk.i];
      h += '<section class="paper enter"><div class="vk-top"><span class="eyebrow">Frage ' + (wk.i + 1) + " von " + CARD_QUESTIONS.length + "</span>" + (wk.i > 0 ? '<button class="linkbtn" data-act="wkBack">Zurück</button>' : "") + '</div><div class="bar"><i style="width:' + (wk.i / CARD_QUESTIONS.length) * 100 + '%"></i></div><h2 style="font-size:1.7rem">' + q.q + '</h2><div class="opt-list">';
      q.options.forEach(function (o, k) { h += '<button data-act="wk" data-arg="' + k + '"><span>' + esc(o.label) + "</span>" + ic("arrowR") + "</button>"; });
      return h + "</div></section>";
    }
    var res = wkResult(wk.ans);
    var s = WINE_STYLES[res.top], alt = res.alt ? WINE_STYLES[res.alt] : null;
    var colorHex = { weiss: "#e3cf63", rose: "#ec9b88", rot: "#8d1330", schaum: "#e8d88e" };
    h += '<section class="paper enter"><span class="eyebrow">Deine Stilrichtung</span><div class="rec">' + glass(colorHex[s.color], { level: 0.55, bubbles: s.color === "schaum" }) + '<div><h2 style="font-size:1.9rem">' + esc(s.name) + '</h2><p class="muted">' + esc(s.desc) + "</p></div></div>" +
      '<div class="learn-sec"><h3>Darauf achtest du auf der Karte</h3><ul class="look">' + s.look.map(function (l) { return "<li><span>" + esc(l) + "</span></li>"; }).join("") + "</ul></div>" +
      '<div class="apply"><span class="eyebrow">Im gewählten Preisrahmen</span><p>' + esc(s[res.tier]) + "</p></div>" +
      '<div class="learn-sec"><h3>Das kannst du sagen</h3><div class="say"><q>' + esc(s.say) + "</q></div></div>";
    if (res.note) h += '<p class="note-sm">' + esc(res.note) + "</p>";
    if (alt) h += '<div class="learn-sec"><h3>Alternative: ' + esc(alt.name) + '</h3><p class="note-sm">' + esc(alt.look.slice(0, 3).join(" · ")) + "</p></div>";
    h += '<p class="note-sm">Glasweise bestellen ist ein guter Weg, Neues zu probieren, ohne gleich eine ganze Flasche zu nehmen. Und ein guter Sommelier freut sich über eine Beschreibung des gewünschten Stils.</p>' +
      '<div class="btnrow"><button class="btn btn-wine" data-act="wkReset">Neu starten</button><a class="btn btn-ghost" href="#spickzettel">Spickzettel</a></div></section>';
    return h;
  }
  function wkResult(ans) {
    var score = {};
    Object.keys(WINE_STYLES).forEach(function (k) { score[k] = 0; });
    [0, 1].forEach(function (qi) { var o = CARD_QUESTIONS[qi].options[ans[qi]]; Object.keys(o.score).forEach(function (k) { score[k] += o.score[k]; }); });
    var only = CARD_QUESTIONS[2].options[ans[2]].only;
    var pool = (only || Object.keys(WINE_STYLES)).slice().sort(function (a, b) { return score[b] - score[a]; });
    var note = "";
    if (ans[0] === 4 && only && only[0] === "leichtRot") note = "Bei Schärfe gilt: lieber fruchtig, wenig Tannin und nicht zu viel Alkohol.";
    if (ans[0] === 2 && only && only[0] === "frischWeiss") note = "Zum Steak geht auch Weißwein, dann am besten ein kräftiger mit etwas Holz, etwa Chardonnay.";
    if (ans[0] === 0 && only && only[0] === "leichtRot") note = "Zu Fisch ist ein leichter, tanninarmer Rotwein wie Pinot Noir die beste rote Wahl.";
    return { top: pool[0], alt: pool[1] && score[pool[1]] > 0 ? pool[1] : null, tier: CARD_QUESTIONS[3].options[ans[3]].tier, note: note };
  }

  /* ---------- Verkostungs-Modus ---------- */
  var SHADES = {
    weiss: [["hellgelb", "Hellgelb", "#eee6a6"], ["zitronengelb", "Zitronengelb", "#e3cf63"], ["goldgelb", "Goldgelb", "#d4a43a"], ["bernsteingelb", "Bernsteingelb", "#b9762b"]],
    rose: [["zwiebel", "Zwiebelschalenrosa", "#e3a585"], ["lachs", "Lachsrosa", "#ec9b88"], ["himbeer", "Himbeerrosa", "#d65a73"]],
    rot: [["purpur", "Purpurrot", "#4f0f30"], ["rubin", "Rubinrot", "#8d1330"], ["granat", "Granatrot", "#76212f"], ["ziegel", "Ziegelrot", "#9b4a2e"]]
  };
  var AROMA_GROUPS = [
    ["Frucht", ["Zitrone", "Grapefruit", "Grüner Apfel", "Birne", "Pfirsich", "Aprikose", "Ananas", "Maracuja", "Erdbeere", "Himbeere", "Kirsche", "Sauerkirsche", "Pflaume", "Brombeere", "Cassis"]],
    ["Blüten", ["Holunderblüte", "Rose", "Veilchen"]],
    ["Kräuter & Grünes", ["Gras", "Paprika", "Kräuter", "Minze"]],
    ["Gewürze", ["Schwarzer Pfeffer", "Weißer Pfeffer", "Zimt", "Nelke"]],
    ["Holz", ["Vanille", "Toast", "Rauch", "Kokos"]],
    ["Reife", ["Honig", "Nüsse", "Leder", "Pilze", "Waldboden", "Tabak"]]
  ];
  var VK_PRESETS = [
    { n: "Mosel-Riesling Kabinett", v: { color: "weiss", shade: "hellgelb", inten: "blass", aromas: ["Zitrone", "Grüner Apfel", "Pfirsich"], nose: "mittel", sweet: "lieblich", acid: "hoch", alc: "niedrig", body: "leicht", balance: "ausgewogen", finish: "mittel", complex: "mittel", like: "gut" } },
    { n: "Chianti Classico", v: { color: "rot", shade: "rubin", inten: "mittel", aromas: ["Sauerkirsche", "Kräuter", "Leder"], nose: "mittel", sweet: "trocken", acid: "hoch", tannin: "mittel", alc: "mittel", body: "mittel", balance: "ausgewogen", finish: "mittel", complex: "mittel", like: "gut" } },
    { n: "Barossa Shiraz", v: { color: "rot", shade: "purpur", inten: "tief", aromas: ["Brombeere", "Pflaume", "Schwarzer Pfeffer", "Vanille"], nose: "ausgepraegt", sweet: "trocken", acid: "niedrig", tannin: "hoch", alc: "hoch", body: "voll", balance: "kantig", finish: "lang", complex: "mittel", like: "okay" } }
  ];
  function vkFresh() {
    return { step: 0, preset: null, color: null, shade: null, inten: "mittel", aromas: [], nose: "mittel", sweet: "trocken", acid: "mittel", tannin: "mittel", alc: "mittel", body: "mittel", balance: "ausgewogen", finish: "mittel", complex: "mittel", like: "gut" };
  }
  var VK_STEPS = ["Sehen", "Riechen", "Schmecken", "Bewerten"];
  function segField(key, label, opts, hint) {
    var v = ui.vk[key];
    var h = '<div class="field"><span class="lbl">' + label + (hint ? "<small>" + hint + "</small>" : "") + '</span><div class="seg full" role="group" aria-label="' + label + '">';
    opts.forEach(function (o) { h += '<button data-act="vkset" data-arg="' + key + ":" + o[0] + '"' + pressed(v === o[0]) + ">" + o[1] + "</button>"; });
    return h + "</div></div>";
  }
  function vkColorHex() {
    var vk = ui.vk;
    if (!vk.color) return "#e3cf63";
    var s = SHADES[vk.color].filter(function (x) { return x[0] === vk.shade; })[0];
    return s ? s[2] : SHADES[vk.color][1][2];
  }
  function vTaste() {
    if (!ui.vk) ui.vk = vkFresh();
    var vk = ui.vk;
    var h = '<header class="mode-head enter"><span class="eyebrow">Praxismodus</span><h1>Ich probiere gerade Wein</h1><p class="muted">Schritt für Schritt durch die Verkostung, am Ende steht deine eigene Notiz. Ein Glas ist nicht nötig: Du kannst auch aus der Erinnerung oder mit einem Beispielwein üben.</p></header>';
    if (vk.step === 0) {
      h += '<section class="paper enter"><h2 style="font-size:1.6rem">Wie möchtest du starten?</h2><div class="opt-list"><button data-act="vkStart" data-arg="-1"><span><strong>Ich habe ein Glas vor mir</strong><br><span class="note-sm">oder erinnere mich an einen Wein</span></span>' + ic("arrowR") + "</button></div>" +
        '<div class="learn-sec"><h3>Ohne Wein üben: Beispiel laden</h3><p class="note-sm">Die Felder werden typisch vorausgefüllt. Ändere sie nach Belieben und sieh, wie sich die Notiz verändert.</p><div class="opt-list">';
      VK_PRESETS.forEach(function (p, k) { h += '<button data-act="vkStart" data-arg="' + k + '"><span>' + esc(p.n) + "</span>" + ic("arrowR") + "</button>"; });
      h += '</div></div><p class="note-sm">Verkosten heißt nicht trinken. Profis spucken aus, und ein Schluck reicht für alle Schritte.</p></section>';
      return h + savedNotes();
    }
    var st = vk.step;
    h += '<section class="paper enter"><div class="vk-top"><span class="eyebrow">' + (st <= 4 ? "Schritt " + st + " von 4 · " + VK_STEPS[st - 1] : "Deine Notiz") + "</span>" + (vk.preset != null ? '<span class="counter">Beispiel: ' + esc(VK_PRESETS[vk.preset].n) + "</span>" : "") + '</div><div class="bar"><i style="width:' + Math.min(st, 4) * 25 + '%"></i></div>';
    if (st === 1) {
      h += '<div class="vk-glass">' + glass(vkColorHex(), { level: 0.55, opacity: { blass: 0.55, mittel: 0.8, tief: 1 }[vk.inten] }) + '<p class="note-sm">Glas schräg vor ein weißes Blatt oder eine helle Wand halten. Schau in die Mitte (Intensität) und an den Rand (Farbton).</p></div>';
      h += segField("color", "Welche Grundfarbe?", [["weiss", "Weiß"], ["rose", "Rosé"], ["rot", "Rot"]]);
      if (vk.color) {
        h += '<div class="field"><span class="lbl">Welcher Farbton?<small>Gold, Bernstein, Granat oder Ziegel deuten oft auf Reife</small></span><div class="seg" role="group" aria-label="Farbton">';
        SHADES[vk.color].forEach(function (s) { h += '<button data-act="vkset" data-arg="shade:' + s[0] + '"' + pressed(vk.shade === s[0]) + '><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + s[2] + ';margin-right:6px;vertical-align:-1px"></span>' + s[1] + "</button>"; });
        h += "</div></div>" + segField("inten", "Wie intensiv?", [["blass", "Blass"], ["mittel", "Mittel"], ["tief", "Tief"]]);
      }
    } else if (st === 2) {
      h += '<p class="note-sm">Erst ruhig riechen, dann schwenken und erneut. Wähle bis zu fünf Eindrücke. Lieber eine Familie als gar nichts: „etwas Rotes, Beeriges“ ist ein guter Anfang.</p>' + segField("nose", "Wie intensiv duftet er?", [["zurueckhaltend", "Zurückhaltend"], ["mittel", "Mittel"], ["ausgepraegt", "Ausgeprägt"]]);
      AROMA_GROUPS.forEach(function (g) {
        h += '<div class="aroma-group"><h4>' + g[0] + '</h4><div class="seg">';
        g[1].forEach(function (a) { h += '<button data-act="vkaroma" data-arg="' + esc(a) + '"' + pressed(vk.aromas.indexOf(a) >= 0) + ">" + esc(a) + "</button>"; });
        h += "</div></div>";
      });
      h += '<span class="counter">' + vk.aromas.length + " von 5 gewählt</span>";
    } else if (st === 3) {
      h += '<p class="note-sm">Einen kleinen Schluck im Mund verteilen. Achte auf Gefühle, nicht nur auf Geschmack.</p>' +
        segField("sweet", "Süße", [["trocken", "Trocken"], ["halbtrocken", "Halbtr."], ["lieblich", "Lieblich"], ["suess", "Süß"]], "Zungenspitze") +
        segField("acid", "Säure", [["niedrig", "Niedrig"], ["mittel", "Mittel"], ["hoch", "Hoch"]], "Läuft der Mund zusammen?") +
        (vk.color !== "weiss" ? segField("tannin", "Tannin", [["niedrig", "Niedrig"], ["mittel", "Mittel"], ["hoch", "Hoch"]], "Trocknet das Zahnfleisch?") : "") +
        segField("alc", "Alkohol", [["niedrig", "Niedrig"], ["mittel", "Mittel"], ["hoch", "Hoch"]], "Wärme im Rachen") +
        segField("body", "Körper", [["leicht", "Leicht"], ["mittel", "Mittel"], ["voll", "Voll"]], "Magermilch oder Sahne?");
    } else if (st === 4) {
      h += segField("balance", "Balance", [["ausgewogen", "Ausgewogen"], ["kantig", "Etwas kantig"], ["unausgewogen", "Unausgewogen"]], "Sticht etwas hervor?") +
        segField("finish", "Abgang", [["kurz", "Kurz"], ["mittel", "Mittel"], ["lang", "Lang"]], "Still mitzählen") +
        segField("complex", "Komplexität", [["einfach", "Einfach"], ["mittel", "Einige Schichten"], ["viel", "Vielschichtig"]]) +
        segField("like", "Wie gefällt er dir?", [["nicht", "Nicht meins"], ["okay", "Okay"], ["gut", "Gut"], ["sehr", "Begeistert"]], "Unabhängig von der Qualität");
    } else {
      h += '<p class="note-out" id="vk-note">' + esc(tastingNote()) + "</p>" +
        '<div class="btnrow"><button class="btn btn-wine btn-small" data-act="vkCopy">' + ic("copy").replace("<svg", '<svg width="16" height="16"') + 'Kopieren</button><button class="btn btn-ghost btn-small" data-act="vkSave">Notiz speichern</button><button class="btn btn-ghost btn-small" data-act="vkNew">Neue Verkostung</button></div>' +
        '<p class="note-sm">So klingt eine sachkundige Beschreibung: Farbe, Aromen, Struktur, Urteil. Ob jemand anderes dieselben Aromen findet, ist offen, denn Wahrnehmung ist subjektiv.</p>';
    }
    if (st <= 4) {
      var canNext = st !== 1 || (vk.color && vk.shade);
      h += '<div class="btnrow" style="justify-content:space-between"><button class="btn btn-ghost btn-small" data-act="vkStep" data-arg="' + (st - 1) + '">Zurück</button><button class="btn btn-wine" data-act="vkStep" data-arg="' + (st + 1) + '"' + (canNext ? "" : " disabled") + ">" + (st < 4 ? "Weiter: " + VK_STEPS[st] : "Notiz erstellen") + "</button></div>";
    }
    h += "</section>";
    return h + savedNotes();
  }
  function tastingNote() {
    var vk = ui.vk;
    var shade = SHADES[vk.color].filter(function (s) { return s[0] === vk.shade; })[0][1];
    var inten = { blass: "Ein helles", mittel: "Ein mittleres", tief: "Ein tiefes" }[vk.inten];
    var s1 = inten + " " + shade + ".";
    var nose = { zurueckhaltend: "zurückhaltend", mittel: "", ausgepraegt: "ausgeprägt" }[vk.nose];
    var s2;
    if (vk.aromas.length) {
      var a = vk.aromas.map(function (x) { return x.replace(/^(Schwarzer|Weißer|Grüner) /, function (w) { return w.toLowerCase(); }); });
      var list = a.length > 1 ? a.slice(0, -1).join(", ") + " und " + a[a.length - 1] : a[0];
      s2 = "In der Nase" + (nose ? " " + nose : "") + ": " + list + ".";
    } else {
      s2 = "In der Nase eher zurückhaltend, ohne klar greifbare Aromen.";
    }
    var sweet = { trocken: "trocken", halbtrocken: "halbtrocken", lieblich: "lieblich", suess: "süß" }[vk.sweet];
    var acid = { niedrig: "milder Säure", mittel: "frischer Säure", hoch: "lebendiger, hoher Säure" }[vk.acid];
    var parts = [acid];
    if (vk.color !== "weiss") parts.push({ niedrig: "zartem Tannin", mittel: "spürbarem Tannin", hoch: "kräftigem Tannin" }[vk.tannin]);
    parts.push({ leicht: "leichtem Körper", mittel: "mittlerem Körper", voll: "vollem Körper" }[vk.body]);
    var s3 = "Am Gaumen " + sweet + ", mit " + parts.slice(0, -1).join(", ") + " und " + parts[parts.length - 1] + ".";
    if (vk.alc === "hoch") s3 += " Der Alkohol wärmt spürbar.";
    if (vk.alc === "niedrig") s3 += " Eher wenig Alkohol.";
    var bal = { ausgewogen: "Ausgewogen", kantig: "Noch etwas kantig", unausgewogen: "Nicht ganz im Gleichgewicht" }[vk.balance];
    var fin = { kurz: "kurzem", mittel: "mittellangem", lang: "langem" }[vk.finish];
    var cx = { einfach: ", unkompliziert", mittel: "", viel: ", vielschichtig" }[vk.complex];
    var s4 = bal + cx + ", mit " + fin + " Abgang.";
    var like = { nicht: "Mir persönlich ist er nicht ganz mein Stil", okay: "Für mich ist er okay", gut: "Mir gefällt er gut", sehr: "Mir gefällt er richtig gut" }[vk.like];
    if ((vk.like === "nicht" || vk.like === "okay") && vk.balance === "ausgewogen") like += ", handwerklich aber sauber gemacht";
    return [s1, s2, s3, s4, like + "."].join(" ");
  }
  function savedNotes() {
    if (!S.notes.length) return "";
    var h = '<section class="paper enter"><span class="eyebrow">Gespeicherte Notizen (' + S.notes.length + ')</span><div class="saved">';
    S.notes.slice().reverse().forEach(function (n, k) {
      var idx = S.notes.length - 1 - k;
      h += '<div class="saved-item"><div><strong>' + esc(n.date) + '</strong><button class="linkbtn" data-act="vkDel" data-arg="' + idx + '">Löschen</button></div><span>' + esc(n.text) + "</span></div>";
    });
    return h + "</div></section>";
  }

  /* ---------- Aktionen ---------- */
  function hostOf(el) { return el.closest("[data-w]"); }
  function repaint(el) { var host = hostOf(el); if (host) paintEl(host); }
  function quizOf(el) { var host = hostOf(el); return host ? ui.quiz[host.getAttribute("data-k")] : null; }

  var ACT = {
    step: function (a) { var r = parseRoute(); S.step[r.id] = +a; save(); go(); },
    openModule: function (a, el) {
      var id = +a;
      if (el.getAttribute("data-from") === "0" || S.done[id]) S.step[id] = 0;
      if (S.done[id]) delete ui.quiz["m" + id];
      save();
      if (location.hash === "#modul-" + id) go(); else location.hash = "modul-" + id;
    },
    restartCourse: function () { MODULES.forEach(function (m) { S.step[m.id] = 0; }); save(); location.hash = "modul-1"; },
    hook: function (a, el) { ui.hook[+hostOf(el).getAttribute("data-k")] = +a; repaint(el); },
    qpick: function (a, el) {
      var Q = quizOf(el); if (!Q) return;
      var q = ALLQ[Q.ids[Q.i]];
      if (Q.picked[q.id] != null) return;
      Q.picked[q.id] = +a;
      record(q, +a === q.answer);
      repaint(el);
    },
    qnext: function (a, el) {
      var host = hostOf(el), Q = quizOf(el);
      Q.i++;
      paintEl(host);
      var sec = host.closest("section");
      if (sec && sec.getBoundingClientRect().top < 0) sec.scrollIntoView({ block: "start", behavior: "smooth" });
    },
    qrestart: function (a, el) { var Q = quizOf(el); Q.i = 0; Q.picked = {}; repaint(el); },
    reviewAgain: function () { initQuiz("review", S.wrong.slice(), "review", true); go(); },
    examStart: function () { initQuiz("exam", EXAM.map(function (q) { return q.id; }), "exam", true); if (location.hash !== "#pruefung") location.hash = "pruefung"; else go(); },
    reset: function () { ui.confirmReset = true; render(); },
    resetNo: function () { ui.confirmReset = false; render(); },
    resetYes: function () { S = fresh(); save(); ui = freshUi(); render(); toast("Fortschritt zurückgesetzt"); },

    style: function (a, el) { ui.styles.sel = a; repaint(el); },
    gfilter: function (a, el) { ui.grapes.filter = a; repaint(el); },
    gopen: function (a, el) { ui.grapes.open[a] = !ui.grapes.open[a]; repaint(el); },
    gall: function (a, el) {
      var all = GRAPES.every(function (g) { return ui.grapes.open[g.id]; });
      GRAPES.forEach(function (g) { ui.grapes.open[g.id] = !all; });
      repaint(el);
    },
    clgrape: function (a, el) { ui.climate.g = a; ui.climate.s = 0; repaint(el); },
    clstep: function (a, el) { ui.climate.s = +a; repaint(el); },
    mapview: function (a, el) { ui.map.view = a; repaint(el); },
    mapcountry: function (a, el) {
      ui.map.country = a;
      ui.map.sel = REGIONS.filter(function (r) { return r.country === a; })[0].id;
      if (a === "Neue Welt") ui.map.view = "welt";
      else if (ui.map.view === "welt") ui.map.view = "europa";
      repaint(el);
    },
    region: function (a, el) {
      var r = byId(REGIONS, a);
      ui.map.sel = a; ui.map.country = r.country;
      if (r.country === "Neue Welt") ui.map.view = "welt";
      repaint(el);
    },
    rmpick: function (a, el) { var st = ui.rm; if (st.picked != null) return; st.picked = +a; if (+a === ROUNDS[st.i].a) st.score++; repaint(el); },
    rmnext: function (a, el) { ui.rm.i++; ui.rm.picked = null; repaint(el); },
    rmreset: function (a, el) { ui.rm = { i: 0, picked: null, score: 0 }; repaint(el); },
    ttdim: function (a, el) { ui.tt.dim = a; repaint(el); },
    ttlvl: function (a, el) { ui.tt.lvl = +a; repaint(el); },
    aspick: function (a, el) { var st = ui.as; if (st.picked != null) return; st.picked = +a; if (+a === AROMA_ROUNDS[st.i].c) st.score++; repaint(el); },
    asnext: function (a, el) { ui.as.i++; ui.as.picked = null; repaint(el); },
    asreset: function (a, el) { ui.as = { i: 0, picked: null, score: 0 }; repaint(el); },
    label: function (a, el) { ui.lb = { l: +a, hot: null }; repaint(el); },
    hot: function (a, el) { ui.lb.hot = ui.lb.hot === a ? null : a; repaint(el); },
    price: function (a, el) { ui.pt = +a; repaint(el); },
    dish: function (a, el) { ui.pair = a; repaint(el); },
    temp: function (a, el) { ui.th = a; repaint(el); },
    mfpick: function (a, el) { var st = ui.mf; if (st.picked != null) return; st.picked = +a; if ((+a === 1) === MF[st.i].fact) st.score++; repaint(el); },
    mfnext: function (a, el) { ui.mf.i++; ui.mf.picked = null; repaint(el); },
    mfreset: function (a, el) { ui.mf = { i: 0, picked: null, score: 0 }; repaint(el); },
    svpick: function (a, el) { var st = ui.sv; if (st.picked != null) return; st.picked = +a; if (SOUVERAEN[st.i].o[+a].ok) st.score++; repaint(el); },
    svnext: function (a, el) { ui.sv.i++; ui.sv.picked = null; repaint(el); },
    svreset: function (a, el) { ui.sv = { i: 0, picked: null, score: 0 }; repaint(el); },

    cheatcat: function (a) {
      ui.cheat.cat = a;
      document.querySelectorAll('[data-act="cheatcat"]').forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-arg") === a ? "true" : "false"); });
      paint("cheat");
    },

    quickNext: function () {
      if (ui.quick.i + 1 < QUICK.length) ui.quick.i++;
      else {
        var pool = EXAM.map(function (q) { return q.id; });
        for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
        initQuiz("quick", pool.slice(0, 3), "quick", true);
        ui.quick.phase = "quiz";
      }
      go();
    },
    quickPrev: function () { ui.quick.i = Math.max(0, ui.quick.i - 1); go(); },
    quickRestart: function () { ui.quick = { i: 0, phase: "cards" }; go(); },

    wk: function (a) { ui.wk.ans[ui.wk.i] = +a; ui.wk.i++; go(); },
    wkBack: function () { ui.wk.i = Math.max(0, ui.wk.i - 1); go(); },
    wkReset: function () { ui.wk = { i: 0, ans: [] }; go(); },

    vkStart: function (a) {
      var k = +a;
      ui.vk = vkFresh();
      if (k >= 0) { Object.assign(ui.vk, JSON.parse(JSON.stringify(VK_PRESETS[k].v))); ui.vk.preset = k; }
      ui.vk.step = 1;
      go();
    },
    vkset: function (a) {
      var i = a.indexOf(":"), key = a.slice(0, i), val = a.slice(i + 1);
      ui.vk[key] = val;
      if (key === "color") ui.vk.shade = SHADES[val][1][0];
      render();
    },
    vkaroma: function (a) {
      var arr = ui.vk.aromas, at = arr.indexOf(a);
      if (at >= 0) arr.splice(at, 1);
      else if (arr.length < 5) arr.push(a);
      else { toast("Maximal fünf Aromen"); return; }
      render();
    },
    vkStep: function (a) { ui.vk.step = Math.max(0, +a); go(); },
    vkNew: function () { ui.vk = vkFresh(); go(); },
    vkCopy: function () {
      var text = tastingNote();
      var fallback = function () {
        var n = document.getElementById("vk-note");
        if (!n) return;
        var r = document.createRange(); r.selectNodeContents(n);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        toast("Text markiert, jetzt kopieren");
      };
      try {
        navigator.clipboard.writeText(text).then(function () { toast("Notiz kopiert"); }, fallback);
      } catch (e) { fallback(); }
    },
    vkSave: function () {
      var d = new Date();
      S.notes.push({ date: d.toLocaleDateString("de-DE") + (ui.vk.preset != null ? " · " + VK_PRESETS[ui.vk.preset].n : ""), text: tastingNote() });
      if (S.notes.length > 30) S.notes.shift();
      save(); render(); toast("Notiz gespeichert");
    },
    vkDel: function (a) { S.notes.splice(+a, 1); save(); render(); }
  };

  function paint(name) { document.querySelectorAll('[data-w="' + name + '"]').forEach(paintEl); }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t || t.disabled) return;
    var fn = ACT[t.getAttribute("data-act")];
    if (!fn) return;
    e.preventDefault();
    fn(t.getAttribute("data-arg"), t);
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target.closest && e.target.closest('svg [data-act], g[data-act]');
    if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ACT[t.getAttribute("data-act")](t.getAttribute("data-arg"), t); }
  });
  document.addEventListener("input", function (e) {
    var t = e.target;
    var kind = t.getAttribute && t.getAttribute("data-input");
    if (kind === "sugar") {
      ui.styles.sugar = +t.value;
      var out = document.getElementById("sugar-out");
      if (out) out.innerHTML = sugarOut();
    } else if (kind === "cheat") {
      ui.cheat.q = t.value;
      paint("cheat");
    }
  });

  render();

  /* Offline-Nutzung, wenn die App unter eigener Adresse gehostet wird (nicht in eingebetteten Vorschauen) */
  try {
    if ("serviceWorker" in navigator && location.protocol === "https:" && window.top === window.self && document.documentElement.getAttribute("data-sw") === "on") {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  } catch (e) { /* ignorieren */ }
})();
