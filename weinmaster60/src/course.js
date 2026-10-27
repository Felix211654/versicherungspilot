/* WEINMASTER 60 – Kursinhalte. Jedes Modul: Einstieg → Wissen → Beispiel → Übung → Quiz → Fazit.
   Markup in Texten: **fett**, Absätze als Array-Einträge. */

const MODULES = [
  {
    id: 1, minutes: 5, title: "Die Weinwelt verstehen", short: "Grundlagen",
    teaser: "Wie Wein entsteht, woher die Farbe kommt und warum fruchtig nicht süß heißt.",
    steps: [
      {
        type: "hook",
        q: "Ein Freund sagt: „Ich mag keinen süßen Wein, aber der hier ist so fruchtig, der ist bestimmt süß.“ Hat er recht?",
        options: ["Ja, fruchtig heißt süß", "Nein, ein Wein kann sehr fruchtig und trotzdem trocken sein", "Das hängt nur von der Farbe ab"],
        answer: 1,
        reveal: "Frucht ist ein **Dufteindruck**, den du über die Nase wahrnimmst. Süße ist **Restzucker**, den die Zunge schmeckt. Ein trockener Sauvignon Blanc kann nach Maracuja duften und enthält trotzdem kaum Zucker. Unser Gehirn verknüpft Fruchtduft gern mit Süße, daher die Verwechslung."
      },
      {
        type: "learn", title: "Vom Traubensaft zum Wein",
        sections: [
          { h: "Was Wein ist", p: ["Wein ist **vergorener Traubensaft**. Bei der **Gärung** verwandeln Hefen den Zucker der Trauben in Alkohol und Kohlendioxid. Was die Hefen übrig lassen, heißt **Restzucker**.", "Alles andere, also Farbe, Duft und Struktur, kommt aus Traube, Weinberg und Keller."] },
          { h: "Woher die Farbe kommt", p: ["Der Saft fast aller Trauben ist hell. Farbe und **Tannin** (Gerbstoff, der den Mund trocknend zusammenzieht) sitzen in der Schale.", "**Rotwein:** rote Trauben gären mit ihren Schalen. **Weißwein:** der Saft wird früh von den Schalen getrennt, meist bei weißen Trauben. **Rosé:** rote Trauben, nur Stunden bis wenige Tage Schalenkontakt. **Schaumwein:** eine zweite Gärung erzeugt Kohlensäure, entweder in der Flasche (Champagner, Crémant, Cava, viele Sekte) oder im Tank (Prosecco)."] },
          { h: "Trocken bis süß", p: ["Für Stillwein gilt in der EU vereinfacht: **trocken** bis 4 g Restzucker pro Liter (bis 9 g/l, wenn genug Säure dagegensteht), **halbtrocken** bis 12 g/l (bzw. 18 g/l), **lieblich** bis 45 g/l, **süß** darüber.", "Säure lässt Süße weniger süß wirken. Ein Mosel-Riesling mit 30 g/l Zucker schmeckt deshalb oft frischer als erwartet."] },
          { h: "Die sechs Stellschrauben", p: ["**Rebsorte:** der Grundcharakter. **Klima:** kühl heißt meist mehr Säure und schlankere Weine, warm mehr Reife, Körper und Alkohol. **Boden:** beeinflusst Wasser und Wärme, ist aber kaum direkt schmeckbar. **Weinbereitung:** Holzfass, Gärtemperatur, Restsüße. **Herkunft:** Tradition und Regeln einer Region. **Jahrgang:** das Wetter eines Jahres, besonders wichtig in kühlen, wechselhaften Regionen."] }
        ]
      },
      {
        type: "example", title: "Gleiche Traube, zwei Welten",
        text: "Ein Mosel-Weingut füllt zwei Rieslinge ab: einen **Kabinett** mit 8,5 % Alkohol und spürbarer Süße und daneben einen trockenen Spitzenwein mit 13 %. Gleiche Rebsorte, gleiche Region, völlig andere Weine. Hier entscheiden Lage, Lesezeitpunkt und vor allem, wann die Gärung endet.",
        aha: "Wird die Gärung früh gestoppt, bleiben Zucker und wenig Alkohol übrig. Läuft sie durch, entsteht ein trockener Wein mit mehr Alkohol."
      },
      { type: "widget", widget: "styles", title: "Weinstile im Vergleich", intro: "Tippe auf einen Stil und schieb dann den Zucker-Regler. Achte darauf, wie sich die Bezeichnung ändert." },
      { type: "quiz" },
      { type: "summary" }
    ],
    quiz: [
      { id: "m1q1", q: "Woher bekommt Rotwein seine Farbe?", options: ["Aus dem Fruchtfleisch roter Trauben", "Aus den Traubenschalen während der Gärung", "Aus dem Holzfass", "Durch zugesetzte Farbstoffe"], answer: 1, explain: "Farbe und Tannin stecken in der Schale. Darum gärt Rotwein mit den Schalen, und darum kann man aus roten Trauben auch Weißwein machen (Blanc de Noirs).", why: ["Das Fruchtfleisch fast aller Trauben ist hell. Ausnahmen (Färbertrauben) spielen kaum eine Rolle.", null, "Holz gibt Aromen und etwas Tannin, aber keine rote Farbe.", "Bei Qualitätswein ist das nicht üblich und hier nicht der Grund."] },
      { id: "m1q2", q: "Ein Wein duftet intensiv nach Pfirsich und Maracuja. Was weißt du damit sicher über seine Süße?", options: ["Er ist süß", "Er ist mindestens halbtrocken", "Nichts. Süße muss man schmecken"], answer: 2, explain: "Duft verrät Frucht, nicht Zucker. Ob Restzucker da ist, merkst du nur am Gaumen oder auf dem Etikett.", why: ["Frucht ist ein Dufteindruck. Auch knochentrockene Weine können sehr fruchtig riechen.", "Auch das lässt sich am Duft nicht ablesen.", null] },
      { id: "m1q3", q: "Welcher Zusammenhang gilt typischerweise beim Klima?", options: ["Kühles Klima: eher mehr Säure und weniger Alkohol", "Kühles Klima: immer süßere Weine", "Das Klima beeinflusst nur Rotwein"], answer: 0, explain: "In kühlen Regionen reifen Trauben langsamer. Die Säure bleibt erhalten, der Zucker und damit der mögliche Alkohol fallen niedriger aus. Das ist eine Tendenz, keine ausnahmslose Regel.", why: [null, "Die Süße hängt vor allem davon ab, ob die Gärung durchläuft, nicht direkt vom Klima.", "Das Klima prägt jede Traube, ob rot oder weiß."] }
    ],
    summary: {
      got: "Du weißt, wie Wein entsteht, woher Farbe und Stil kommen und warum trocken und fruchtig zwei verschiedene Dinge sind.",
      keys: ["Farbe und Tannin stammen aus der Traubenschale.", "Süße schmeckt man (Restzucker), Frucht riecht man.", "Rebsorte, Klima und Keller prägen den Wein am stärksten. Boden und Jahrgang justieren nach."],
      apply: "Bietet dir jemand einen „süßen“ Wein an, frag: „Süß im Sinne von Restzucker oder einfach sehr fruchtig?“ Damit zeigst du sofort, dass du den Unterschied kennst."
    }
  },

  {
    id: 2, minutes: 10, title: "Die wichtigsten Rebsorten", short: "Rebsorten",
    teaser: "13 Sorten, die du auf jeder Weinkarte triffst, mit Profil und Eselsbrücke.",
    steps: [
      {
        type: "hook",
        q: "Zwei Gläser Chardonnay: Eines schmeckt nach grünem Apfel und Zitrone, das andere nach Ananas, Butter und Vanille. Wie geht das?",
        options: ["Eines davon ist gefälscht", "Klima und Ausbau verändern dieselbe Rebsorte stark", "Chardonnay schmeckt einfach zufällig"],
        answer: 1,
        reveal: "Der erste kommt vielleicht aus dem kühlen **Chablis**, der zweite aus dem warmen **Kalifornien**, ausgebaut im neuen Holzfass und mit **malolaktischer Gärung**. Dabei wird die herbe Apfelsäure in mildere Milchsäure umgewandelt, das bringt buttrige Noten. Die Rebsorte gibt den Grundcharakter vor, Klima und Keller formen den Stil."
      },
      {
        type: "learn", title: "Rebsorte ist Charakter, nicht Schicksal",
        sections: [
          { h: "Drei Begriffe vorab", p: ["**Säure:** Frische. Der Mund läuft zusammen. **Körper:** wie leicht oder vollmundig der Wein wirkt. **Tannin:** der trocknende, zusammenziehende Gerbstoff, vor allem in Rotwein. In Modul 4 vertiefen wir das."] },
          { h: "Aromatisch oder neutral", p: ["**Aromatische Sorten** wie Riesling oder Sauvignon Blanc erkennt man oft am Duft. **Neutralere Sorten** wie Chardonnay oder Pinot Grigio zeigen stärker, was Klima und Keller aus ihnen machen."] },
          { h: "Klima verschiebt den Stil", p: ["Aus kühlem Klima kommen meist mehr Säure, schlankerer Körper und frischere Frucht (Zitrus, rote Beeren). Aus warmem Klima kommen reifere Frucht (tropisch, dunkle Beeren), mehr Körper und mehr Alkohol. Das ist eine Tendenz: Lage, Höhe und Winzer können sie verschieben."] },
          { h: "Ein Name, mehrere Namen", p: ["Viele Sorten haben regionale Namen: **Spätburgunder** = Pinot Noir, **Grauburgunder** = Pinot Grigio = Pinot Gris, **Shiraz** = Syrah, **Garnacha** = Grenache. Oft verrät der gewählte Name schon die Stilrichtung."] }
        ]
      },
      {
        type: "example", title: "Syrah oder Shiraz?",
        text: "Gleiche Rebsorte. Als **Syrah** von der nördlichen Rhône oft straff, mit schwarzem Pfeffer und Oliven. Als **Shiraz** aus dem warmen Barossa Valley in Australien üppig, mit Brombeerkonfitüre und Schokolade. Viele Winzer außerhalb Frankreichs wählen den Namen bewusst, um den Stil zu signalisieren.",
        aha: "Der Name auf dem Etikett ist manchmal schon eine kleine Stilangabe."
      },
      { type: "widget", widget: "grapes", title: "Lernkarten: 13 Rebsorten", intro: "Überleg erst, was du erwartest, dann deck die Karte auf. Aktives Erinnern bleibt viel besser hängen als Lesen." },
      { type: "widget", widget: "climate", title: "Gleiche Traube, anderes Klima", intro: "Wähle eine Sorte und schieb den Regler von kühl nach warm." },
      { type: "quiz" },
      { type: "summary" }
    ],
    quiz: [
      { id: "m2q1", q: "Welche Rebsorte verbindet man mit weißem Pfeffer, grünem Apfel und Österreich?", options: ["Chardonnay", "Grüner Veltliner", "Chenin Blanc", "Merlot"], answer: 1, explain: "Das „Pfefferl“ ist das Markenzeichen des Grünen Veltliners, Österreichs wichtigster Weißweinsorte.", why: ["Chardonnay ist eher neutral und hat kein typisches Pfefferaroma.", null, "Chenin zeigt eher Apfel, Quitte und Honig und kommt vor allem von der Loire.", "Merlot ist eine rote Sorte."] },
      { id: "m2q2", q: "Ein Rotwein ist hell, hat viel Säure, wenig Tannin und duftet nach Kirsche und Erdbeere. Welche Sorte passt am besten?", options: ["Cabernet Sauvignon", "Pinot Noir", "Syrah"], answer: 1, explain: "Hell, säurebetont, zart im Tannin, rote Beeren: das klassische Profil von Pinot Noir bzw. Spätburgunder.", why: ["Cabernet ist dunkel, tanninreich und duftet nach Cassis.", null, "Syrah ist dunkel und würzig, mit kräftigerem Tannin."] },
      { id: "m2q3", q: "Cabernet Sauvignon ist typischerweise …", options: ["leicht, hell und tanninarm", "kräftig, tanninreich, mit Noten von Cassis", "leicht perlend und süß"], answer: 1, explain: "Cabernet Sauvignon ist der Bodybuilder: viel Tannin, viel Körper, schwarze Johannisbeere.", why: ["Das beschreibt eher Pinot Noir.", null, "Das beschreibt eher Moscato d'Asti."] },
      { id: "m2q4", q: "Was haben Rioja und Ribera del Duero gemeinsam?", options: ["Beide setzen vor allem auf Tempranillo", "Beide setzen vor allem auf Sangiovese", "Beide sind reine Weißweinregionen"], answer: 0, explain: "Tempranillo ist Spaniens wichtigste rote Sorte. In Ribera del Duero heißt sie Tinto Fino.", why: [null, "Sangiovese ist die Sorte der Toskana.", "Beide sind vor allem für Rotwein berühmt."] }
    ],
    summary: {
      got: "Du kennst 13 Schlüsselsorten mit ihrem Profil und weißt, dass Klima und Ausbau dieselbe Sorte stark verändern.",
      keys: ["Die Rebsorte gibt den Grundcharakter, Klima und Keller formen den Stil.", "Pinot Noir ist leicht und elegant, Cabernet kräftig und tanninreich, Merlot liegt weicher dazwischen.", "Riesling und Sauvignon Blanc sind aromatisch und säurebetont, Chardonnay ist ein Chamäleon."],
      apply: "Auf der Weinkarte: Sorte erkennen, grob den Stil ableiten und im Zweifel fragen, ob der Wein aus kühlem oder warmem Klima stammt."
    }
  },

  {
    id: 3, minutes: 10, title: "Die wichtigsten Weinregionen", short: "Regionen",
    teaser: "Region, Rebsorte, Stil: die Zusammenhänge, die Weinkarten lesbar machen.",
    steps: [
      {
        type: "hook",
        q: "Auf der Weinkarte steht nur „Chablis 2021“, ohne Rebsorte. Was ist im Glas?",
        options: ["Ein Rotwein aus Pinot Noir", "Ein Weißwein aus Chardonnay", "Ein Schaumwein"],
        answer: 1,
        reveal: "In Europa nennt das Etikett oft nur die **Herkunft**. Chablis liegt im Norden Burgunds, und Chablis ist per Herkunftsregel immer Chardonnay. Wer ein paar Regionen kennt, liest Weinkarten fast im Klartext."
      },
      {
        type: "learn", title: "Region, Rebsorte, Stil",
        sections: [
          { h: "Alte Welt, Neue Welt", p: ["In Europa (der **Alten Welt**) steht meist die Herkunft im Vordergrund: Bordeaux, Rioja, Chianti. In der **Neuen Welt** (Amerika, Australien, Neuseeland, Südafrika) steht meist die Rebsorte vorn.", "Die Stil-Faustregel „Alte Welt zurückhaltender, Neue Welt fruchtiger“ ist eine Tendenz, keine Regel. Die Grenzen verwischen längst."] },
          { h: "Der Weinbaugürtel", p: ["Die meisten Weinregionen liegen ungefähr zwischen dem 30. und 50. Breitengrad, nördlich wie südlich des Äquators. Nahe der kühlen Grenze (Mosel, Champagne) reifen Trauben langsam. Die Weine sind dort frisch und säurebetont.", "Auch **Höhe** kühlt: Viele Weinberge in Mendoza liegen auf rund 1.000 Metern. Flüsse und Meer mildern Extreme."] },
          { h: "Sechs Paare zum Merken", p: ["**Mosel**: Riesling. **Bordeaux**: Cuvées aus Cabernet Sauvignon und Merlot. **Burgund**: Pinot Noir und Chardonnay. **Rioja**: Tempranillo. **Toskana**: Sangiovese. **Marlborough**: Sauvignon Blanc.", "Mit diesen sechs Paaren deckst du einen großen Teil jeder Restaurantkarte ab."] }
        ]
      },
      {
        type: "example", title: "Bordeaux: linkes und rechtes Ufer",
        text: "Am **linken Ufer** der Gironde (Médoc, z. B. Pauillac, Margaux) dominiert oft Cabernet Sauvignon. Die Weine wirken straffer und tanninreicher. Am **rechten Ufer** (Saint-Émilion, Pomerol) dominiert häufig Merlot. Die Weine sind runder und samtiger.",
        aha: "Ein einziges Wort auf dem Etikett, etwa „Pauillac“ oder „Pomerol“, verrät dir schon die Richtung, obwohl keine Rebsorte draufsteht."
      },
      { type: "widget", widget: "worldmap", title: "Die Weinwelt auf einen Blick", intro: "Schematische Karte nach Breiten- und Längengrad. Tippe auf einen Punkt oder wähle unten ein Land." },
      { type: "widget", widget: "regionMatch", title: "Übung: Welche Sorte gehört hierher?", intro: "Acht Regionen, je eine Hauptsorte. Erst tippen, dann lernen." },
      { type: "quiz" },
      { type: "summary" }
    ],
    quiz: [
      { id: "m3q1", q: "Welche Region ist weltweit für intensiv aromatischen Sauvignon Blanc bekannt?", options: ["Marlborough", "Mendoza", "Douro", "Piemont"], answer: 0, explain: "Marlborough auf der Südinsel Neuseelands: kühle Nächte, viel Sonne, Maracuja und Stachelbeere.", why: [null, "Mendoza ist berühmt für Malbec.", "Das Douro-Tal steht für Portwein und kräftige Rotweine.", "Das Piemont ist berühmt für Nebbiolo (Barolo)."] },
      { id: "m3q2", q: "Ein Wein vom rechten Ufer Bordeaux (z. B. Saint-Émilion) besteht häufig vor allem aus …", options: ["Merlot", "Pinot Noir", "Tempranillo"], answer: 0, explain: "Rechtes Ufer heißt oft Merlot-betont. Am linken Ufer dominiert eher Cabernet Sauvignon.", why: [null, "Pinot Noir ist die rote Sorte Burgunds.", "Tempranillo ist die Hauptsorte Spaniens."] },
      { id: "m3q3", q: "Barolo kommt aus dem Piemont. Welche Rebsorte steckt drin?", options: ["Sangiovese", "Nebbiolo", "Merlot"], answer: 1, explain: "Nebbiolo: hell in der Farbe, aber mit viel Tannin und Säure und Noten von Rosen und Teer.", why: ["Sangiovese ist die Sorte der Toskana (Chianti, Brunello).", null, "Merlot spielt im Piemont kaum eine Rolle."] },
      { id: "m3q4", q: "Warum liefern Regionen nahe der kühlen Anbaugrenze wie die Mosel oft säurebetonte Weine?", options: ["Die Trauben reifen langsamer, die Säure bleibt erhalten", "Die Böden enthalten Zitronensäure", "Dort wird grundsätzlich Säure zugesetzt"], answer: 0, explain: "Langsame Reife bewahrt die natürliche Säure. Warme Regionen bauen beim Reifen mehr Säure ab.", why: [null, "Säure im Wein stammt aus der Traube selbst, nicht direkt aus dem Boden.", "Säurezusatz ist eher ein Thema in warmen Regionen, und auch dort streng geregelt."] }
    ],
    summary: {
      got: "Du kannst die wichtigsten Regionen einer Rebsorte und einem Stil zuordnen und Herkunftsangaben auf Weinkarten deuten.",
      keys: ["Europa nennt meist die Herkunft, die Neue Welt meist die Rebsorte.", "Kühle Regionen bringen eher Frische und Säure, warme eher Reife, Körper und Alkohol.", "Die sechs Paare: Mosel–Riesling, Bordeaux–Cabernet/Merlot, Burgund–Pinot/Chardonnay, Rioja–Tempranillo, Toskana–Sangiovese, Marlborough–Sauvignon Blanc."],
      apply: "Steht auf der Karte nur ein Ortsname, übersetze ihn im Kopf in Rebsorte und Klima. So weißt du ungefähr, was dich erwartet, bevor du bestellst."
    }
  },

  {
    id: 4, minutes: 10, title: "Wein richtig verkosten", short: "Verkosten",
    teaser: "Vier Schritte, die du mit jedem Glas anwenden kannst, auch ohne Glas.",
    steps: [
      {
        type: "hook",
        q: "Warum riecht man vor dem Trinken am Wein, und warum schmeckt Essen bei Schnupfen nach fast nichts?",
        options: ["Das ist reine Show", "Weil ein Großteil des „Geschmacks“ über die Nase läuft", "Damit der Wein Luft bekommt"],
        answer: 1,
        reveal: "Die Zunge erkennt im Wesentlichen **süß, sauer, salzig, bitter und umami**. Kirsche, Vanille oder Pfeffer nimmst du über die Nase wahr, auch „von hinten“ beim Schlucken (**retronasal**). Riechen ist der halbe Wein."
      },
      {
        type: "learn", title: "Die vier Schritte",
        sections: [
          { h: "1 · Sehen", p: ["Glas schräg vor einen hellen Hintergrund halten. Wie ist die Farbe: Zitronengelb, Gold, Bernstein? Purpur, Rubin, Granat? Wie intensiv ist sie?", "Weißweine werden mit dem Alter dunkler, Rotweine heller und am Rand bräunlicher. Die Schlieren am Glas („Kirchenfenster“) zeigen Alkohol und Zucker, nicht Qualität."] },
          { h: "2 · Riechen", p: ["Erst ruhig riechen, dann schwenken und noch einmal. Ordne grob ein: **Frucht** (Zitrus, Apfel, Steinobst, tropisch, rote oder dunkle Beeren), **Blüten**, **Kräuter**, **Gewürze**, **Holz** (Vanille, Toast, Rauch), **Reife** (Honig, Leder, Pilze, Nüsse).", "Erst die Kategorie, dann das Detail. „Rote Früchte“ ist eine vollwertige Aussage."] },
          { h: "3 · Schmecken", p: ["**Süße:** Zucker auf der Zungenspitze. **Säure:** Frische, der Mund läuft zusammen. **Tannin:** ein trocknendes, zusammenziehendes Gefühl an Zahnfleisch und Zunge, vor allem bei vielen Rotweinen. **Alkohol:** Wärme im Rachen. Er trägt den Körper und beeinflusst die Balance. **Körper:** wie leicht oder vollmundig der Wein wirkt, etwa wie Magermilch gegenüber Sahne."] },
          { h: "4 · Bewerten", p: ["**Balance:** Sticht nichts unangenehm hervor? **Komplexität:** Hat der Wein mehrere Schichten? **Länge:** Wie lange hält der Geschmack nach dem Schlucken oder Ausspucken an (der **Abgang**)? Wenige Sekunden sind kurz, deutlich über zehn Sekunden lang.", "Dann dein **persönlicher Eindruck**. Gefallen und Qualität sind zwei verschiedene Dinge."] },
          { h: "Ehrlich bleiben", p: ["Aromen nimmt jeder anders wahr. Erfahrung, Genetik und Erinnerungen spielen mit. Verkostungsnotizen sind Beschreibungen, keine Messwerte. Riechst du Kirsche und dein Nachbar Pflaume, liegt keiner falsch.", "**Ohne Wein üben:** Zitronensaft gegen Apfelsaft zeigt Säure. Lange gezogener Schwarztee zeigt Tannin. **Ausspucken** ist bei Verkostungen völlig normal, Profis machen das ständig."] }
        ]
      },
      {
        type: "example", title: "Drei Sätze, die souverän klingen",
        text: "„Ein mittleres Rubinrot. In der Nase Kirsche, etwas Himbeere und ein Hauch Waldboden. Am Gaumen trocken, mit frischer Säure, feinem Tannin und eher leichtem Körper. Ausgewogen, mit mittellangem Abgang. Den würde ich gern zu Ente trinken.“",
        aha: "Zum Vergleich, wie es nicht klingen sollte: „Ein Feuerwerk aus Waldbeeren tanzt auf einem Bett aus Trüffeln, die Tannine seidig wie ein Abendkleid.“ Struktur, eine Aromagruppe und ein Urteil wirken souveräner als jede Poesie."
      },
      { type: "widget", widget: "tastingTrainer", title: "Verkostungstrainer", intro: "Wähle eine Eigenschaft und eine Stufe. Du bekommst eine Erklärung, ein Beispiel und eine Übung ohne Wein." },
      { type: "widget", widget: "aromaSort", title: "Übung: Aromen einordnen", intro: "Ordne jedes Aroma seiner Familie zu. Genau so gehst du später am Glas vor: erst die Kategorie, dann das Detail." },
      { type: "quiz" },
      { type: "summary" }
    ],
    quiz: [
      { id: "m4q1", q: "Welches Gefühl beschreibt Tannin?", options: ["Ein Prickeln auf der Zunge", "Trocknend und zusammenziehend, wie bei starkem Schwarztee", "Wärme im Rachen", "Süße auf der Zungenspitze"], answer: 1, explain: "Tannin bindet Eiweiße im Speichel. Darum fühlen sich Zahnfleisch und Zunge trocken und rau an.", why: ["Prickeln kommt von Kohlensäure.", null, "Wärme im Rachen kommt vom Alkohol.", "Süße kommt vom Restzucker."] },
      { id: "m4q2", q: "Woran erkennst du hohe Säure?", options: ["Der Mund läuft zusammen, das Wasser sammelt sich", "Der Wein wärmt im Rachen", "Der Wein schmeckt bitter"], answer: 0, explain: "Säure regt den Speichelfluss an. Je mehr Speichel, desto mehr Säure. Ein körperlicher Test, der erstaunlich gut funktioniert.", why: [null, "Wärme ist ein Zeichen von Alkohol.", "Bitterkeit ist ein eigener Eindruck und kann etwa von Tannin oder Schalen kommen."] },
      { id: "m4q3", q: "Was zeigen ausgeprägte „Kirchenfenster“ (Schlieren) am Glas?", options: ["Hohe Qualität", "Vor allem etwas über Alkohol und Zucker", "Dass der Wein alt ist"], answer: 1, explain: "Die Schlieren entstehen durch Verdunstungseffekte des Alkohols. Mehr Alkohol oder Zucker bedeutet ausgeprägtere Schlieren, aber nicht mehr Qualität.", why: ["Ein verbreiteter Mythos. Qualität kann man am Glasrand nicht ablesen.", null, "Das Alter zeigt sich eher in der Farbe."] },
      { id: "m4q4", q: "Was ist der „Abgang“?", options: ["Wie lange der Geschmack nach dem Schlucken oder Ausspucken anhält", "Der Moment, in dem man das Glas abstellt", "Die Farbe am Glasrand"], answer: 0, explain: "Ein langer Abgang gilt als Qualitätshinweis, ein kurzer ist bei einfachen Alltagsweinen völlig normal.", why: [null, "Schöner Gedanke, aber nein.", "Der Rand gehört zum Schritt „Sehen“."] }
    ],
    summary: {
      got: "Du kannst einen Wein in vier Schritten beschreiben und die wichtigsten Strukturbegriffe sicher einsetzen.",
      keys: ["Sehen, Riechen, Schmecken, Bewerten, immer in dieser Reihenfolge.", "Die Struktur (Süße, Säure, Tannin, Körper, Alkohol) ist objektiver als Aromen. Damit kannst du am meisten zeigen.", "Kategorie vor Detail: „dunkle Früchte und etwas Holz“ ist eine vollwertige Notiz."],
      apply: "Beim nächsten Glas: erst eine Aussage zur Struktur („frische Säure, leichter Körper“), dann eine Aromagruppe. Zwei Sätze genügen. Im Menü findest du den Modus „Ich probiere gerade Wein“."
    }
  },

  {
    id: 5, minutes: 7, title: "Etiketten, Qualität und Preise", short: "Etiketten",
    teaser: "Was auf der Flasche steht, was es bedeutet und was es nicht verrät.",
    steps: [
      {
        type: "hook",
        q: "Zwei Flaschen Riesling: 9 € und 39 €. Ist die teurere automatisch besser?",
        options: ["Ja, der Preis sagt alles", "Nein, der Preis spiegelt auch Lage, Aufwand, Menge, Name und Nachfrage", "Nur wenn sie älter ist"],
        answer: 1,
        reveal: "Die teurere Flasche kommt vielleicht aus einer berühmten Steillage mit Handlese und kleinem Ertrag. Das kann man oft schmecken. Ob sie dir **besser gefällt**, ist eine andere Frage. Preis, Prestige, Seltenheit, Aufwand und Qualität hängen zusammen, sind aber nicht dasselbe."
      },
      {
        type: "learn", title: "Was das Etikett verrät",
        sections: [
          { h: "Rebsortenwein oder Cuvée", p: ["Steht nur eine Rebsorte auf dem Etikett, muss der Wein in der EU mindestens **85 %** davon enthalten. Eine **Cuvée** (ein Verschnitt) mischt Sorten, Lagen oder Fässer. Das ist kein Mangel: Bordeaux und die meisten Champagner sind Cuvées."] },
          { h: "Jahrgang und Alkohol", p: ["Der **Jahrgang** ist das Erntejahr. Er sagt etwas über Alter und Wetter, ist aber kein Gütesiegel. Gute Erzeuger machen auch in schwierigen Jahren gute Weine, und die meisten Weine sind für einen jungen Genuss gemacht.", "Der **Alkoholgehalt** ist ein Stilhinweis: um 8 % oft ein restsüßer Mosel-Kabinett, 12–13 % klassisch, ab 14,5 % meist warmes Klima und vollmundig. Seit Ende 2023 müssen neue Weine in der EU zudem Zutaten und Nährwerte angeben, oft über einen QR-Code."] },
          { h: "Herkunftssysteme", p: ["Das EU-Prinzip: **g. U.** (geschützte Ursprungsbezeichnung) mit strengen Regeln, **g. g. A.** mit lockereren Regeln, darunter Wein ohne Herkunftsangabe.", "**Deutschland:** Deutscher Wein, Landwein, Qualitätswein, Prädikatswein. Die Prädikate **Kabinett, Spätlese, Auslese, Beerenauslese, Trockenbeerenauslese, Eiswein** beschreiben die Reife der Trauben bei der Lese, **nicht die Süße im Glas**. Wer sicher trocken will, achtet auf das Wort „trocken“.", "**Frankreich:** AOP/AOC, darunter IGP und Vin de France. **Italien:** DOCG, DOC, IGT. **Spanien:** DOP mit DO und DOCa (nur Rioja und Priorat), dazu Reifestufen wie Crianza, Reserva und Gran Reserva.", "Höhere Stufe heißt **strengere Regeln**, nicht automatisch besserer Wein. Ein IGT-Supertuscan kann teurer und gefeierter sein als mancher DOCG-Chianti."] },
          { h: "Holz: Barrique und Co.", p: ["Ein **Barrique** ist ein 225-Liter-Eichenfass. Neues Holz gibt Vanille, Toast, Rauch und Nelke, amerikanische Eiche oft auch Kokos. Der langsame Sauerstoffkontakt macht Tannine runder. Große, alte Fässer prägen den Geschmack kaum, sie lassen den Wein nur ruhig reifen. Zu viel Holz kann die Frucht überdecken. Ob man das mag, ist Geschmackssache."] }
        ]
      },
      {
        type: "example", title: "„Spätlese trocken“, ein Widerspruch?",
        text: "Nein. Die Trauben waren bei der Lese reif genug für das Prädikat **Spätlese**, wurden dann aber durchgegoren. Ergebnis: ein trockener, oft etwas kräftigerer Riesling. Umgekehrt kann ein Kabinett deutlich süß sein.",
        aha: "Das Prädikat sagt, wie reif die Trauben waren. Das Wort „trocken“ sagt, was im Glas ist."
      },
      { type: "widget", widget: "labels", title: "Etiketten-Decoder", intro: "Drei illustrative Beispiel-Etiketten mit erfundenen Erzeugern. Tippe auf die markierten Angaben." },
      { type: "widget", widget: "priceTiers", title: "Was bekomme ich für mein Geld?", intro: "Schieb den Regler durch die Preisklassen (Ladenpreis pro Flasche in Deutschland)." },
      { type: "quiz" },
      { type: "summary" }
    ],
    quiz: [
      { id: "m5q1", q: "„Spätlese“ auf einem deutschen Etikett sagt vor allem etwas über …", options: ["die Süße im Glas", "die Reife der Trauben bei der Lese", "das Alter des Weins"], answer: 1, explain: "Prädikate messen das Mostgewicht bei der Lese. Eine Spätlese kann trocken oder süß sein, entscheidend ist der Zusatz „trocken“.", why: ["Genau das ist der häufigste Irrtum. Eine Spätlese kann trocken sein.", null, "Mit dem Alter hat das Prädikat nichts zu tun."] },
      { id: "m5q2", q: "Was bedeutet DOCG auf einem italienischen Etikett?", options: ["Die höchste italienische Herkunftsstufe mit strengen Regeln", "Ein Bio-Siegel", "Eine Bezeichnung für Schaumwein"], answer: 0, explain: "Denominazione di Origine Controllata e Garantita, z. B. Barolo oder Chianti Classico. Erkennbar auch an der Banderole am Flaschenhals.", why: [null, "Bio-Siegel sind davon unabhängig.", "Es gibt DOCG-Schaumweine, aber DOCG bedeutet nicht Schaumwein."] },
      { id: "m5q3", q: "Ein Wein reifte in neuen Barriques. Welche Noten sind typisch?", options: ["Vanille, Toast, Rauch", "Stachelbeere und Gras", "Rosenblätter und Litschi"], answer: 0, explain: "Neues Eichenholz bringt Vanille, Röstaromen und Gewürze. Mit jeder Nutzung wird der Effekt schwächer.", why: [null, "Das sind typische Rebsortenaromen des Sauvignon Blanc.", "Das klingt eher nach Gewürztraminer."] },
      { id: "m5q4", q: "Welche Aussage stimmt?", options: ["Cuvées sind Resteverwertung", "Teurer ist immer besser", "Der Preis spiegelt auch Seltenheit, Prestige und Aufwand"], answer: 2, explain: "Zwischen 8 € und 20 € liegt oft ein deutlicher Qualitätssprung. Darüber zahlt man zunehmend für Name, Seltenheit und Nachfrage.", why: ["Viele der berühmtesten Weine der Welt sind Cuvées.", "Preis und Qualität hängen zusammen, aber nicht linear und nicht immer.", null] }
    ],
    summary: {
      got: "Du kannst Etiketten lesen, Herkunftsstufen einordnen und Preise realistisch bewerten.",
      keys: ["Herkunftsstufen (AOP, DOCG, Prädikat) regeln Herkunft und Methoden. Ob dir der Wein schmeckt, garantieren sie nicht.", "Deutsche Prädikate messen die Traubenreife, nicht die Süße. Achte auf das Wort „trocken“.", "Zwischen 8 € und 20 € liegt oft der größte Qualitätssprung."],
      apply: "Im Laden: Herkunft, Rebsorte, Alkohol und „trocken“ lesen, daraus den Stil ableiten. Das Etikett gibt Hinweise. Eine sichere Aussage über die Qualität macht es nicht."
    }
  },

  {
    id: 6, minutes: 7, title: "Wein und Essen kombinieren", short: "Speisen",
    teaser: "Sechs belastbare Regeln statt endloser Tabellen.",
    steps: [
      {
        type: "hook",
        q: "Lachs mit Rotwein: ein Stilbruch?",
        options: ["Ja, Fisch geht nur mit Weißwein", "Nein, ein leichter Pinot Noir mit wenig Tannin kann wunderbar passen", "Nur bei Lachs aus Norwegen"],
        answer: 1,
        reveal: "Es kommt auf die Struktur an, nicht auf die Farbe. Viel Tannin zu öligem Fisch kann metallisch schmecken. Ein leichter, säurebetonter Rotwein mit wenig Tannin hat dieses Problem kaum, und seine rote Frucht passt gut zu Lachs."
      },
      {
        type: "learn", title: "Sechs Regeln, die fast immer tragen",
        rules: true,
        sections: []
      },
      {
        type: "example", title: "Was zusammen wächst …",
        text: "Ein Klassiker von der Loire: **Crottin de Chavignol**, ein kleiner Ziegenkäse, und **Sancerre** aus Sauvignon Blanc. Beide kommen aus derselben Gegend. Die Säure des Weins hält mit dem säuerlichen Käse mit und schneidet durch die Cremigkeit.",
        aha: "Regionale Paare (Chianti zu toskanischer Tomatensauce, Albariño zu galicischen Meeresfrüchten) sind ein guter Startpunkt, auch wenn sie keine Garantie sind."
      },
      { type: "widget", widget: "pairing", title: "Speisenbegleiter", intro: "Wähle ein Gericht. Du bekommst passende Weinstile, eine Begründung und einen Hinweis, was du besser meidest." },
      { type: "quiz" },
      { type: "summary" }
    ],
    quiz: [
      { id: "m6q1", q: "Scharfes Thai-Curry. Welcher Wein ist meist die sicherste Wahl?", options: ["Ein kräftiger Shiraz mit 15 % Alkohol", "Ein Riesling mit etwas Restsüße und wenig Alkohol", "Ein tanninreicher Cabernet Sauvignon"], answer: 1, explain: "Etwas Süße mildert die Schärfe, wenig Alkohol verhindert das Brennen. Riesling Kabinett oder feinherb ist ein Klassiker.", why: ["Schärfe lässt hohen Alkohol brennen.", null, "Schärfe lässt Tannin bitter und hart wirken."] },
      { id: "m6q2", q: "Zur Schokoladentarte wird ein trockener Rotwein serviert. Was passiert häufig?", options: ["Der Wein wirkt sauer, bitter und dünn", "Der Wein wirkt plötzlich süßer", "Gar nichts"], answer: 0, explain: "Süßes Essen lässt trockene Weine sauer und bitter wirken. Der Wein sollte mindestens so süß sein wie das Dessert, etwa ein Ruby Port zur Schokolade.", why: [null, "Es ist umgekehrt: Neben Süßem wirkt Wein trockener und saurer.", "Der Effekt ist deutlich spürbar, probier es bei Gelegenheit aus."] },
      { id: "m6q3", q: "Warum harmoniert ein tanninreicher Rotwein gut mit Steak?", options: ["Eiweiß und Fett lassen Tannin weicher wirken", "Weil das Steak rot ist", "Weil Tannin das Fleisch zart macht"], answer: 0, explain: "Tannin verbindet sich mit Eiweiß. Am Gaumen wirkt der Wein dadurch runder, das Fleisch saftiger.", why: [null, "Die Farbe ist für die Kombination nicht entscheidend, die Struktur schon.", "Tannin wirkt am Gaumen, nicht auf die Fleischfaser."] }
    ],
    summary: {
      got: "Du kannst Wein und Essen über Säure, Süße, Tannin, Schärfe und Gewicht kombinieren, ohne Listen auswendig zu lernen.",
      keys: ["Säure liebt Fett, Salz und Säure.", "Der Wein sollte mindestens so süß sein wie das Essen. Bei Schärfe weniger Alkohol und Tannin.", "Struktur schlägt Farbe: Gewicht und Sauce zählen mehr als die Fleischsorte."],
      apply: "Bestellt der Tisch querbeet, ist ein frischer Weißwein mit guter Säure, ein leichter Rotwein wie Pinot Noir oder ein Schaumwein die sicherste gemeinsame Wahl."
    }
  },

  {
    id: 7, minutes: 5, title: "Servieren, Lagern, Fehler", short: "Servieren",
    teaser: "Temperatur, Luft, Gläser und was tun bei Korkton.",
    steps: [
      {
        type: "hook",
        q: "„Rotwein bei Zimmertemperatur“: Welche Temperatur ist heute sinnvollerweise gemeint?",
        options: ["21–23 °C, wie im Wohnzimmer", "Eher 14–18 °C, je nach Stil", "4–6 °C, wie im Kühlschrank"],
        answer: 1,
        reveal: "Die Regel stammt aus Zeiten ungeheizter Räume. Bei 22 °C wirkt Alkohol brandig und die Frucht marmeladig. Faustregel: **Rotwein 15–20 Minuten vor dem Servieren in den Kühlschrank, Weißwein 15–20 Minuten vorher heraus.**"
      },
      {
        type: "learn", title: "Servieren und Aufbewahren",
        sections: [
          { h: "Dekantieren und Belüften", p: ["**Sinnvoll** bei jungen, kräftigen, tanninreichen Rotweinen (Luft macht sie zugänglicher) und bei älteren Rotweinen mit **Depot** (Bodensatz): vorsichtig umgießen, damit der Satz in der Flasche bleibt. Sehr alte Weine können an der Luft schnell verblassen, also erst kurz vor dem Trinken.", "**Meist unnötig** bei leichten Weißweinen, Rosé, Schaumwein und den meisten Alltagsweinen. Riecht ein frisch geöffneter Wein leicht nach Streichholz oder faulem Ei (**Reduktion**), hilft Luft oft. Nur entkorken bringt kaum etwas, Schwenken im Glas schon."] },
          { h: "Gläser", p: ["Ein gutes **Universalglas** genügt für fast alles, auch für Schaumwein: tulpenförmig, dünnwandig, ausreichend groß. Nur bis zur breitesten Stelle füllen, eher ein Drittel, damit Platz zum Schwenken bleibt. Am Stiel halten. Wer mag, ergänzt ein größeres Glas für kräftige Rotweine."] },
          { h: "Geöffnete Flaschen", p: ["Wieder verschließen und **in den Kühlschrank**, auch Rotwein (vor dem Servieren etwas temperieren). Die meisten Weine halten so 2–5 Tage, kräftige Rot- und Süßweine oft länger, Schaumwein mit Verschluss 1–3 Tage, Portwein deutlich länger."] },
          { h: "Lagerung und Reifung", p: ["Dunkel, kühl (etwa 10–15 °C), möglichst gleichmäßig, ohne starke Erschütterungen. Flaschen mit Naturkork bei langer Lagerung liegend aufbewahren.", "Mit der Reife wird frische Frucht zu getrockneter Frucht, dazu kommen Leder, Pilze, Honig und Nüsse. Tannine werden weicher, Rotwein heller, Weißwein dunkler. Davon profitieren nur Weine mit genug Struktur. Die meisten sind für einen Genuss innerhalb weniger Jahre gemacht."] },
          { h: "Fehler erkennen", p: ["**Korkfehler** (ausgelöst meist durch den Stoff TCA): muffig, nasser Karton, feuchter Keller, die Frucht wirkt stumpf. Mit Korkkrümeln im Glas hat das nichts zu tun, die sind harmlos.", "**Oxidation:** bräunliche Farbe, Noten von altem Apfel oder Sherry, die Frische ist weg. Bei Sherry und manchen Stilen ist das gewollt. Fehlerhafte Flaschen kannst du im Restaurant ansprechen, und viele Händler nehmen sie zurück."] }
        ]
      },
      {
        type: "example", title: "Barolo jung und alt",
        text: "Ein junger **Barolo** (Nebbiolo, viel Tannin) wirkt frisch geöffnet oft verschlossen und hart. Ein bis zwei Stunden in der Karaffe können ihn deutlich zugänglicher machen. Ein 30 Jahre alter Barolo wird dagegen nur vorsichtig vom Depot getrennt und bald getrunken.",
        aha: "Dekantieren hat zwei Zwecke: Luft für junge Weine, Klarheit für alte. Das sind zwei verschiedene Gründe."
      },
      { type: "widget", widget: "thermometer", title: "Serviertemperatur-Finder", intro: "Wähle einen Weinstil und lies die Empfehlung am Thermometer ab." },
      { type: "widget", widget: "mythFact", title: "Mythos oder Fakt?", intro: "Sechs Behauptungen. Entscheide schnell und lies dann die Auflösung." },
      { type: "quiz" },
      { type: "summary" }
    ],
    quiz: [
      { id: "m7q1", q: "Welcher Wein profitiert am ehesten vom Dekantieren?", options: ["Ein junger, tanninreicher Cabernet Sauvignon", "Ein leichter Pinot Grigio", "Ein Prosecco"], answer: 0, explain: "Junge, kräftige Rotweine öffnen sich an der Luft, ihr Tannin wirkt runder.", why: [null, "Leichte, frische Weißweine verlieren eher, als dass sie gewinnen.", "Beim Schaumwein würde die Kohlensäure entweichen."] },
      { id: "m7q2", q: "Ein Wein riecht muffig nach nassem Karton. Was steckt wahrscheinlich dahinter?", options: ["Ein Korkfehler (TCA)", "Ausbau im Barrique", "Viel Alkohol"], answer: 0, explain: "Muffig, nasser Karton, feuchter Keller: das typische Bild eines Korkfehlers. Im Restaurant freundlich ansprechen.", why: [null, "Barrique riecht nach Vanille und Toast, nicht muffig.", "Alkohol zeigt sich als Wärme, nicht als Muff."] },
      { id: "m7q3", q: "Wie lagert man Wein im Keller am besten?", options: ["Dunkel, kühl und bei möglichst gleichmäßiger Temperatur", "Hell und warm in der Küche", "Im Gefrierfach"], answer: 0, explain: "Licht, Wärme und Temperaturschwankungen lassen Wein schneller altern.", why: [null, "Die Küche ist meist zu warm und schwankt zu stark.", "Gefrierender Wein dehnt sich aus und kann den Korken herausdrücken."] }
    ],
    summary: {
      got: "Du servierst Wein in der richtigen Temperatur, weißt, wann Luft hilft, und erkennst die häufigsten Fehler.",
      keys: ["Rotwein kühler als gedacht (14–18 °C), Weißwein nicht eiskalt (7–13 °C).", "Dekantieren lohnt bei jungen, kräftigen Rotweinen und bei alten Weinen mit Depot, sonst selten.", "Korkton riecht muffig nach nassem Karton. Oxidation ist bräunlich, sherryartig und flach."],
      apply: "Zu Hause: Rotwein kurz in den Kühlschrank, Weißwein kurz vorher heraus. Ein Universalglas statt eines Schranks voller Spezialgläser."
    }
  },

  {
    id: 8, minutes: 6, title: "Souverän auftreten", short: "Auftreten",
    teaser: "Restaurant, Weinhandel, Gespräche, und am Ende die Abschlussprüfung.",
    steps: [
      {
        type: "hook",
        q: "Der Sommelier gießt dir einen Schluck zum Probieren ein. Wofür ist dieser Schluck da?",
        options: ["Damit du entscheidest, ob dir der Wein gefällt", "Damit du prüfst, ob der Wein fehlerfrei ist", "Reine Höflichkeit ohne Bedeutung"],
        answer: 1,
        reveal: "Der Probeschluck dient vor allem der **Kontrolle auf Fehler** (etwa Korkton) und der Temperatur. Oft reicht schon Riechen. Ein knappes „Wunderbar, danke“ genügt. Trifft der Wein nur nicht deinen Geschmack, ist das kein Fehler. Viele Restaurants sind trotzdem entgegenkommend, besonders wenn sie den Wein empfohlen haben."
      },
      {
        type: "learn", title: "Sechs Situationen, sechs Satzbausteine",
        situations: true,
        sections: [
          { h: "Im Restaurant einen Wein auswählen", p: ["Beschreibe den Stil, nicht das Etikett. Nenne Essen und Rahmen. Das Budget kannst du diskret zeigen."], say: ["„Ich mag eher frische, elegante Weine mit guter Säure und nicht zu viel Holz. Haben Sie etwas aus der Richtung?“", "„Wir essen Fisch und Ente. Gibt es einen Wein, der zu beidem passt? Gern etwas Leichteres.“", "„Wir hatten an etwas in dieser Gegend gedacht.“ (dabei auf einen Preis auf der Karte zeigen)"] },
          { h: "Eine Empfehlung verstehen", p: ["Kurze Rückfragen sind ein Zeichen von Interesse, nicht von Unwissen. Typische Sommelier-Begriffe übersetzt: **mineralisch** heißt oft frisch, salzig oder steinig wirkend, mit wenig Frucht. **Gut eingebundenes Holz** heißt, das Holz ist da, dominiert aber nicht. **Braucht noch Zeit** heißt jung, Tannin oder Säure sind noch kantig. **Zugänglich** heißt, der Wein ist jetzt schon weich und trinkbar."], say: ["„Ist der eher fruchtig oder eher herb?“", "„Wie viel Holz spürt man?“", "„Ist der trocken ausgebaut?“"] },
          { h: "Eine Flasche im Geschäft einschätzen", p: ["Lies in dieser Reihenfolge: Herkunft, Rebsorte, Stilhinweise (Alkohol, „trocken“, Holz), Jahrgang (frische Weißweine eher jung). Flaschen, die lange im sonnigen Schaufenster standen, besser meiden. Und fragen kostet nichts."], say: ["„Ich suche einen trockenen Weißwein zu Spargel, etwa 15 Euro. Was würden Sie nehmen?“"] },
          { h: "Eine Verkostung beschreiben", p: ["Die Formel: Farbe, eine oder zwei Aromagruppen, Struktur, Urteil. Keine Poesie nötig."], say: ["„Ziemlich frisch, viel Zitrus und grüner Apfel, schlanker Körper. Mir gefällt die Säure.“"] },
          { h: "Über Herkunft und Rebsorte sprechen", p: ["Verbinde, was du schmeckst, mit dem, was du weißt. Formuliere es als Beobachtung oder Frage, nicht als Vortrag."], say: ["„Das ist ein Riesling von der Mosel. Die kühle Lage merkt man an der Säure.“", "„Spannend, wie pfeffrig der Syrah ist. Kommt der von einem kühleren Standort?“"] },
          { h: "Einen fehlerhaften Wein zurückgeben", p: ["Freundlich, konkret, ohne Vorwurf. Der Sommelier probiert gegen. Ist der Wein fehlerhaft, wird er ersetzt. Gefällt er dir nur nicht, sag es ehrlich und bitte um Rat. Einen Anspruch auf Umtausch gibt es dann aber nicht."], say: ["„Entschuldigung, ich glaube, der Wein hat einen Korkton. Würden Sie bitte einmal probieren?“"] }
        ]
      },
      {
        type: "example", title: "Souverän heißt nicht belehrend",
        text: "Am Tisch fragt jemand, warum der Rioja nach Vanille riecht. Statt eines Vortrags über Eichenarten: „Das kommt vom Holzfass. In Rioja wird traditionell gern amerikanische Eiche verwendet, die bringt Vanille und Kokos.“ Ein Satz, eine Erklärung, und das Gespräch bleibt offen.",
        aha: "Souverän wirkt, wer Fragen stellt, ehrlich sagt, was ihm schmeckt, und anderen ihren Geschmack lässt."
      },
      { type: "widget", widget: "souveraen", title: "Training: Was klingt souverän?", intro: "Fünf Situationen, je drei Antworten. Wähle die, die kompetent und trotzdem entspannt klingt." },
      { type: "quiz" },
      { type: "summary" }
    ],
    quiz: [
      { id: "m8q1", q: "Dein Budget liegt bei etwa 45 € für die Flasche. Wie zeigst du das elegant?", options: ["Diskret auf einen Preis auf der Karte zeigen", "Laut fragen: „Was ist der billigste?“", "Gar nichts sagen und hoffen"], answer: 0, explain: "Ein Klassiker: Auf einen Wein in der gewünschten Preisregion zeigen und sagen „etwas in dieser Gegend“. Der Sommelier versteht das sofort.", why: [null, "Das ist ehrlich, aber unnötig unangenehm für den Tisch.", "Dann bekommst du womöglich eine Empfehlung weit über deinem Budget."] },
      { id: "m8q2", q: "Der Wein riecht einwandfrei, schmeckt dir aber nicht. Was ist fair?", options: ["Einen Korkfehler behaupten", "Ehrlich sagen, dass er nicht deinen Erwartungen entspricht, und um Rat fragen, ohne Anspruch auf Umtausch", "Wortlos stehen lassen"], answer: 1, explain: "Ehrlichkeit ist hier souverän. Viele Restaurants helfen gern, besonders nach einer eigenen Empfehlung, sind aber nicht dazu verpflichtet.", why: ["Unfair gegenüber dem Restaurant, und ein Profi merkt es.", null, "Damit lernst du nichts, und das Restaurant auch nicht."] }
    ],
    summary: {
      got: "Du kannst im Restaurant, im Geschäft und im Gespräch natürlich und kompetent über Wein sprechen und weißt, wie man einen fehlerhaften Wein zurückgibt.",
      keys: ["Beschreibe Stil und Anlass, nicht Etiketten. Das Budget zeigst du diskret.", "Der Probeschluck dient der Kontrolle auf Fehler, nicht der Geschmacksentscheidung.", "Fragen und Beobachtungen wirken souveräner als Vorträge."],
      apply: "Nimm dir für den nächsten Restaurantbesuch einen Satzbaustein vor und probier ihn aus. Den Rest findest du jederzeit im Spickzettel."
    }
  }
];

/* Abschlussprüfung: Fragen aus allen Modulen */
const EXAM = [
  { id: "e1", module: 1, q: "Welcher Wein entsteht typischerweise aus roten Trauben mit nur kurzem Schalenkontakt?", options: ["Rosé", "Weißwein aus weißen Trauben", "Portwein", "Prosecco"], answer: 0, explain: "Rosé: rote Trauben, Stunden bis wenige Tage Schalenkontakt. Mischen ist bei stillem Rosé in der EU grundsätzlich nicht erlaubt." },
  { id: "e2", module: 1, q: "Was bedeutet „trocken“ bei Stillwein, vereinfacht gesagt?", options: ["Sehr wenig Restzucker", "Viel Tannin", "Kein Fruchtaroma"], answer: 0, explain: "Trocken bezieht sich auf den Zucker: bis 4 g/l, bei genug Säure bis 9 g/l. Mit Tannin oder Frucht hat das nichts zu tun." },
  { id: "e3", module: 2, q: "Welche Paarung aus Rebsorte und typischem Merkmal stimmt?", options: ["Sauvignon Blanc: Stachelbeere, Gras, hohe Säure", "Merlot: sehr hohe Säure, kaum Körper", "Grenache: tiefdunkle Farbe und viel Tannin"], answer: 0, explain: "Sauvignon Blanc ist grün-aromatisch und säurebetont. Merlot ist weich und rund, Grenache eher hell und tanninarm." },
  { id: "e4", module: 2, q: "„Shiraz“ auf einem australischen Etikett bedeutet …", options: ["dieselbe Rebsorte wie Syrah, oft im üppigen, fruchtigen Stil", "eine Weißweinsorte", "eine Mischung aus Syrah und Merlot"], answer: 0, explain: "Syrah und Shiraz sind dieselbe Sorte. Der Name deutet oft schon die Stilrichtung an." },
  { id: "e5", module: 3, q: "Auf der Karte steht „Rioja Reserva“. Welche Rebsorte steht im Mittelpunkt?", options: ["Tempranillo", "Sangiovese", "Pinot Noir"], answer: 0, explain: "Rioja heißt Tempranillo, oft ergänzt durch Garnacha. Reserva bedeutet in Rioja mindestens drei Jahre Reife, davon eines im Fass." },
  { id: "e6", module: 3, q: "Welche Region ist vor allem für Pinot Noir und Chardonnay bekannt?", options: ["Burgund", "Douro", "Mendoza", "Rías Baixas"], answer: 0, explain: "Burgund: rot fast immer Pinot Noir, weiß fast immer Chardonnay." },
  { id: "e7", module: 4, q: "In welcher Reihenfolge verkostet man?", options: ["Sehen, Riechen, Schmecken, Bewerten", "Schmecken, Sehen, Riechen, Bewerten", "Riechen, Bewerten, Sehen, Schmecken"], answer: 0, explain: "Vom Auge über die Nase zum Gaumen, dann das Urteil. So beeinflusst kein späterer Eindruck einen früheren." },
  { id: "e8", module: 4, q: "Ein Weinkenner nennt einen Wein „mineralisch“. Was ist die sachlich richtige Einordnung?", options: ["Ein subjektiver Eindruck. Dass man den Boden schmeckt, ist nicht belegt", "Ein Beweis für Schieferboden", "Der Wein enthält viel Mineralwasser"], answer: 0, explain: "„Mineralisch“ ist ein verbreiteter, aber unscharfer Begriff, oft für frische, salzig oder steinig wirkende Weine. Ein direkter Bodengeschmack ist wissenschaftlich nicht belegt." },
  { id: "e9", module: 5, q: "Ein italienischer Wein trägt „IGT“ statt „DOCG“. Was folgt daraus?", options: ["Lockerere Regeln. Er kann trotzdem hervorragend sein, wie viele Supertuscans", "Er ist zwingend minderwertig", "Er stammt nicht aus Italien"], answer: 0, explain: "Die Stufe beschreibt Regeln, nicht Qualität im Glas. Manche Spitzenweine wählen IGT bewusst, um freier zu sein." },
  { id: "e10", module: 5, q: "Du willst sicher einen trockenen deutschen Riesling. Worauf achtest du?", options: ["Auf das Wort „trocken“ auf dem Etikett", "Auf das Prädikat „Spätlese“", "Auf den Jahrgang"], answer: 0, explain: "Prädikate beschreiben die Traubenreife, nicht die Süße. Eindeutig ist nur die Geschmacksangabe." },
  { id: "e11", module: 6, q: "Sushi mit Sojasauce: Welche Wahl ist am riskantesten?", options: ["Ein tanninreicher, kräftiger Rotwein", "Ein trockener Riesling", "Ein Champagner Brut"], answer: 0, explain: "Tannin und Fischöle können metallisch schmecken. Frische Weiß- und Schaumweine sind die sichere Bank." },
  { id: "e12", module: 6, q: "Was ist der Klassiker zu frischem Ziegenkäse?", options: ["Sauvignon Blanc von der Loire", "Süßer Portwein", "Barolo"], answer: 0, explain: "Sancerre und Crottin de Chavignol kommen aus derselben Gegend: Säure trifft Säure." },
  { id: "e13", module: 7, q: "Bei welcher Temperatur serviert man einen kräftigen Rotwein wie Cabernet Sauvignon idealerweise?", options: ["Etwa 16–18 °C", "Etwa 22–24 °C", "Etwa 6–8 °C"], answer: 0, explain: "Etwas kühler als das Wohnzimmer. So bleibt der Alkohol eingebunden und die Frucht frisch." },
  { id: "e14", module: 7, q: "Wann ist Dekantieren eher unnötig?", options: ["Bei einem leichten, jungen Weißwein", "Bei einem jungen Barolo", "Bei einem alten Rotwein mit Depot"], answer: 0, explain: "Leichte, frische Weine brauchen keine Karaffe. Junge, tanninreiche Rotweine profitieren von Luft, alte von der Trennung vom Depot." },
  { id: "e15", module: 8, q: "Wofür dient der Probeschluck im Restaurant vor allem?", options: ["Zur Prüfung, ob der Wein fehlerfrei ist", "Zur Entscheidung, ob er dir gefällt", "Zur Kontrolle des Alkoholgehalts"], answer: 0, explain: "Es geht um Fehler wie Korkton und um die Temperatur. Ein kurzer Blick, Riechen und „Danke, sehr gut“ genügen." }
];

/* 5-Minuten-Schnellmodus: die zehn Kernsätze */
const QUICK = [
  { t: "Wein ist vergorener Traubensaft", d: "Hefen machen aus Zucker Alkohol. Farbe und Tannin kommen aus der Schale, deshalb gärt Rotwein mit den Schalen." },
  { t: "Fruchtig ist nicht süß", d: "Frucht riecht man, Süße (Restzucker) schmeckt man. Trockene Weine können sehr fruchtig duften." },
  { t: "Kühl gegen warm", d: "Kühles Klima: mehr Säure, schlanker, frische Frucht. Warmes Klima: reifer, voller, mehr Alkohol. Das ist eine Tendenz, keine Regel." },
  { t: "Sechs Paare", d: "Mosel–Riesling · Bordeaux–Cabernet/Merlot · Burgund–Pinot Noir/Chardonnay · Rioja–Tempranillo · Toskana–Sangiovese · Marlborough–Sauvignon Blanc." },
  { t: "Vier Schritte", d: "Sehen, Riechen, Schmecken, Bewerten. Erst die Kategorie (rote Früchte), dann das Detail (Kirsche)." },
  { t: "Struktur in drei Wörtern", d: "Säure: der Mund läuft zusammen. Tannin: trocknend wie Schwarztee. Körper: Magermilch oder Sahne." },
  { t: "Etikett lesen", d: "Prädikate wie Spätlese sagen etwas über die Traubenreife, nicht über die Süße. Willst du trocken, achte auf das Wort „trocken“. Teurer heißt nicht automatisch besser." },
  { t: "Essen kombinieren", d: "Säure liebt Fett. Süßes braucht süßen Wein. Tannin passt zu Eiweiß. Bei Schärfe weniger Alkohol und Tannin." },
  { t: "Temperatur", d: "Rotwein 14–18 °C, also kühler als das Wohnzimmer. Weißwein 7–13 °C, nicht eiskalt. Schaumwein 6–9 °C." },
  { t: "Im Restaurant", d: "Stil beschreiben, das Budget diskret zeigen. Der Probeschluck prüft auf Fehler, nicht auf Gefallen." }
];

/* Weinkarten-Modus: Stilempfehlungen */
const WINE_STYLES = {
  frischWeiss: { name: "Frisch & knackig", color: "weiss", desc: "trockener Weißwein mit lebendiger Säure, ohne Holz", look: ["Riesling trocken (Mosel, Rheingau, Pfalz)", "Grüner Veltliner (Wachau, Kamptal)", "Sauvignon Blanc (Sancerre, Marlborough)", "Albariño (Rías Baixas)", "Chablis"], low: "Grüner Veltliner, Albariño oder ein Riesling-Gutswein bieten viel Frische fürs Geld.", mid: "Riesling Orts- oder Lagenwein, Sancerre, Smaragd aus der Wachau.", high: "Riesling Großes Gewächs oder Chablis Premier Cru.", say: "„Ich hätte gern einen trockenen, frischen Weißwein mit guter Säure, gern ohne Holz. Was können Sie empfehlen?“" },
  cremigWeiss: { name: "Rund & cremig", color: "weiss", desc: "vollerer Weißwein, gern mit etwas Holz", look: ["Chardonnay (Burgund, z. B. Mâcon oder Meursault)", "Grauburgunder aus Baden oder der Pfalz", "Weißburgunder", "Chenin Blanc (Loire, Südafrika)"], low: "Grauburgunder aus Baden oder Chenin Blanc aus Südafrika.", mid: "Bourgogne Blanc, Mâcon oder ein Grauburgunder vom Spitzenweingut.", high: "Meursault oder Puligny-Montrachet.", say: "„Ich mag Weißweine mit etwas mehr Körper, gern cremig, ein wenig Holz darf sein. Haben Sie da etwas?“" },
  aromatischSuess: { name: "Aromatisch mit einem Hauch Süße", color: "weiss", desc: "Weißwein mit etwas Restsüße und moderatem Alkohol", look: ["Riesling Kabinett oder feinherb (Mosel)", "Gewürztraminer (Elsass)", "Chenin Blanc demi-sec (Vouvray)"], low: "Ein Mosel-Kabinett ist oft erstaunlich preiswert für seine Qualität.", mid: "Kabinett oder Spätlese von einem renommierten Mosel-Weingut.", high: "Eine Auslese, eher zum Dessert oder zu Käse.", say: "„Zum scharfen Essen hätte ich gern einen Weißwein mit etwas Restsüße und nicht zu viel Alkohol.“" },
  rose: { name: "Trockener Rosé", color: "rose", desc: "trockener, frischer Rosé", look: ["Rosé aus der Provence (oft Grenache)", "Rosé aus Spätburgunder", "Rosado aus Rioja oder Navarra"], low: "Rosé aus Spätburgunder oder ein Rosado aus Spanien.", mid: "Provence-Rosé von einem bekannten Gut.", high: "Ein gereifter Rosé, etwa aus Bandol, oder Rosé-Champagner.", say: "„Haben Sie einen trockenen, eher hellen Rosé?“" },
  leichtRot: { name: "Leicht & elegant", color: "rot", desc: "heller Rotwein mit wenig Tannin und frischer Säure", look: ["Spätburgunder / Pinot Noir (Baden, Ahr, Pfalz, Burgund)", "Zweigelt (Österreich)", "Grenache-betonte Weine aus kühleren Lagen"], low: "Spätburgunder-Gutswein oder Zweigelt.", mid: "Bourgogne Rouge oder ein Spätburgunder-Ortswein.", high: "Burgund Premier Cru oder ein Spätburgunder Großes Gewächs.", say: "„Wir hätten gern einen eher leichten, eleganten Rotwein mit wenig Tannin, etwa einen Pinot Noir.“" },
  mittelRot: { name: "Saftig & mittelkräftig", color: "rot", desc: "Rotwein mit Frucht, Säure und moderatem Tannin", look: ["Chianti Classico (Sangiovese)", "Rioja Crianza (Tempranillo)", "Côtes du Rhône (Grenache)", "Merlot", "Barbera"], low: "Côtes du Rhône oder Rioja Crianza.", mid: "Chianti Classico Riserva oder Rioja Reserva.", high: "Brunello di Montalcino oder Châteauneuf-du-Pape.", say: "„Wir suchen einen saftigen, mittelkräftigen Rotwein, der gut zum Essen passt, nicht zu schwer.“" },
  kraeftigRot: { name: "Kräftig & würzig", color: "rot", desc: "dunkler, vollmundiger Rotwein mit kräftigem Tannin", look: ["Cabernet Sauvignon / Bordeaux (Médoc)", "Syrah (nördliche Rhône)", "Ribera del Duero", "Malbec (Mendoza)", "Douro-Rotwein", "Napa Cabernet"], low: "Malbec aus Mendoza oder ein Douro-Rotwein.", mid: "Ribera del Duero oder Crozes-Hermitage.", high: "Barolo, ein klassifizierter Bordeaux oder Napa Cabernet.", say: "„Zum Steak hätte ich gern einen kräftigen, dunklen Rotwein mit ordentlich Tannin.“" },
  schaum: { name: "Schaumwein", color: "schaum", desc: "trockener Schaumwein, Brut", look: ["Champagner Brut", "Crémant (Frankreich)", "Winzersekt (traditionelle Flaschengärung)", "Cava", "Franciacorta"], low: "Crémant, Cava oder Winzersekt mit Flaschengärung.", mid: "Champagner Brut, gern von einem Winzer-Champagnerhaus.", high: "Jahrgangschampagner.", say: "„Zum Start hätten wir gern etwas Prickelndes, trocken. Gibt es einen Crémant oder Champagner, den Sie mögen?“" }
};

const CARD_QUESTIONS = [
  {
    id: "food", q: "Was gibt es zu essen?",
    options: [
      { label: "Fisch oder Meeresfrüchte", score: { frischWeiss: 3, schaum: 2, cremigWeiss: 1, rose: 1, leichtRot: 1 } },
      { label: "Geflügel oder helles Fleisch", score: { cremigWeiss: 3, leichtRot: 2, frischWeiss: 1, mittelRot: 1 } },
      { label: "Rotes Fleisch, Steak, Lamm", score: { kraeftigRot: 3, mittelRot: 2 } },
      { label: "Pasta, Pilze, vegetarisch", score: { mittelRot: 2, leichtRot: 2, cremigWeiss: 2, frischWeiss: 1 } },
      { label: "Scharf oder asiatisch", score: { aromatischSuess: 3, frischWeiss: 1, rose: 1, leichtRot: 1 } },
      { label: "Nur zum Aperitif", score: { schaum: 3, frischWeiss: 2, rose: 2 } },
      { label: "Jeder etwas anderes", score: { leichtRot: 2, frischWeiss: 2, schaum: 1, cremigWeiss: 1, rose: 1 } }
    ]
  },
  {
    id: "taste", q: "Was trinkst du lieber?",
    options: [
      { label: "Frisch und leicht", score: { frischWeiss: 2, schaum: 2, leichtRot: 2, rose: 1 } },
      { label: "Fruchtig und weich", score: { cremigWeiss: 2, mittelRot: 2, rose: 1, aromatischSuess: 1 } },
      { label: "Kräftig und würzig", score: { kraeftigRot: 3, mittelRot: 1, cremigWeiss: 1 } },
      { label: "Weiß ich nicht", score: {} }
    ]
  },
  {
    id: "color", q: "Gibt es eine Farbe, die es sein soll?",
    options: [
      { label: "Weiß", only: ["frischWeiss", "cremigWeiss", "aromatischSuess"] },
      { label: "Rot", only: ["leichtRot", "mittelRot", "kraeftigRot"] },
      { label: "Rosé", only: ["rose"] },
      { label: "Prickelnd", only: ["schaum"] },
      { label: "Egal", only: null }
    ]
  },
  {
    id: "budget", q: "Welcher Preisrahmen?",
    options: [
      { label: "Eher günstig", tier: "low" },
      { label: "Mittel", tier: "mid" },
      { label: "Darf besonders sein", tier: "high" }
    ]
  }
];

/* Modul 8: Souverän-Training */
const SOUVERAEN = [
  { s: "Der Sommelier fragt, was du gern trinkst. Du weißt keinen Namen.", o: [
    { t: "„Irgendwas, ich kenn mich nicht aus.“", ok: false, fb: "Ehrlich, aber du verschenkst die Chance auf eine gute Empfehlung." },
    { t: "„Ich mag eher frische Weine mit guter Säure, nicht zu schwer. Was würden Sie empfehlen?“", ok: true, fb: "Genau so: Du beschreibst einen Stil, der Sommelier übernimmt den Rest." },
    { t: "„Bringen Sie mir einfach Ihren besten Bordeaux.“", ok: false, fb: "Klingt großspurig und wird vermutlich teuer, ohne dass es zu deinem Geschmack passt." }
  ] },
  { s: "Der Wein riecht muffig nach nassem Karton.", o: [
    { t: "„Der ist kaputt, nehmen Sie den zurück.“", ok: false, fb: "Inhaltlich vielleicht richtig, im Ton unnötig scharf." },
    { t: "Nichts sagen und austrinken.", ok: false, fb: "Ein Korkfehler wird ersetzt. Du darfst ihn ansprechen." },
    { t: "„Ich glaube, der hat einen Korkton. Würden Sie bitte einmal probieren?“", ok: true, fb: "Freundlich, konkret, ohne Vorwurf. Der Sommelier prüft und ersetzt die Flasche bei einem Fehler." }
  ] },
  { s: "Ein Freund fragt, warum dieser Rotwein so „trocken im Mund“ ist.", o: [
    { t: "„Das ist Tannin, ein Gerbstoff aus den Traubenschalen. Er wirkt wie starker Schwarztee.“", ok: true, fb: "Klar, kurz, mit einem Vergleich, den jeder kennt." },
    { t: "„Das sind die phenolischen Verbindungen, die mit den Speichelproteinen präzipitieren.“", ok: false, fb: "Fachlich nicht falsch, aber so beendest du das Gespräch." },
    { t: "„Der hat halt keinen Zucker.“", ok: false, fb: "Das verwechselt Tannin mit Süße. Trocken im Sinne von Zucker ist etwas anderes als das trocknende Gefühl." }
  ] },
  { s: "Im Weinhandel suchst du einen Wein zum Grillabend.", o: [
    { t: "„Ich nehme den teuersten, dann kann nichts schiefgehen.“", ok: false, fb: "Teuer ist keine Garantie, und zum Grillen oft sogar verschenkt." },
    { t: "„Wir grillen Rind und Gemüse, etwa 15 Euro. Gern etwas Kräftiges, aber nicht zu holzig.“", ok: true, fb: "Anlass, Budget, Stil: Damit kann jede Fachkraft arbeiten." },
    { t: "„Welcher hat die meisten Punkte?“", ok: false, fb: "Punkte sagen etwas über den Geschmack eines Kritikers, nicht über deinen Abend." }
  ] },
  { s: "Am Tisch schwärmt jemand von einem Wein, der dir zu holzig ist.", o: [
    { t: "„Für mich ist da etwas viel Holz, aber ich verstehe, was dir daran gefällt.“", ok: true, fb: "Du trennst deine Vorliebe von der Qualität und lässt dem anderen seinen Geschmack." },
    { t: "„Der ist objektiv überholzt, das mag eigentlich niemand mehr.“", ok: false, fb: "Belehrend, und „objektiv“ stimmt hier nicht. Holz ist auch Geschmackssache." },
    { t: "„Ja, ganz toll!“ (obwohl du es anders siehst)", ok: false, fb: "Höflich, aber du darfst ruhig ehrlich und freundlich sein." }
  ] }
];
