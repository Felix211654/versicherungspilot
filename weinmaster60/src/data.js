/* WEINMASTER 60 – Wissensbasis: Rebsorten, Regionen, Speisen, Temperaturen, Glossar, Mythen.
   Skalen 1–5: 1 = sehr wenig, 3 = mittel, 5 = sehr viel. tannin: null = Weißwein (kaum Tannin). */

const GRAPES = [
  {
    id: "riesling", name: "Riesling", alias: "", color: "weiss",
    aromas: "Zitrone, Limette, grüner Apfel, Pfirsich, Aprikose; mit Reife Honig und eine typische „Petrolnote“",
    acid: 5, body: 2, tannin: null,
    style: "Von knochentrocken bis edelsüß, fast immer ohne spürbaren Holzgeschmack. Kann jahrzehntelang reifen.",
    variation: "Mosel: oft schlank, verspielt, teils mit Restsüße und wenig Alkohol. Pfalz und Elsass: häufig trocken und kräftiger. Australien (Clare Valley): trocken und limettig.",
    regions: "Mosel, Rheingau, Pfalz, Nahe, Elsass, Wachau, Clare Valley",
    food: "Trocken zu Fisch, Geflügel und Schweinebraten; mit etwas Restsüße zu scharfer asiatischer Küche.",
    mnemonic: "Riesling ist der Sprinter mit Zitronenspritzer: schlank, schnell, hellwach."
  },
  {
    id: "chardonnay", name: "Chardonnay", alias: "", color: "weiss",
    aromas: "Kühl: Zitrone, grüner Apfel. Warm: Ananas, Melone, Pfirsich. Mit Holz: Vanille, Toast, Haselnuss, Butter",
    acid: 3, body: 4, tannin: null,
    style: "Eine eher neutrale Rebsorte, die Klima und Keller deutlich spiegelt: von straff und mineralisch wirkend bis üppig und buttrig.",
    variation: "Chablis (Nordburgund): straff, meist ohne neues Holz. Côte de Beaune: cremig, oft mit Holz. Kalifornien und Australien: oft reif und vollmundig. Auch Basis vieler Champagner.",
    regions: "Burgund (Chablis, Meursault), Champagne, Kalifornien, Australien",
    food: "Straff zu Austern und Fisch; holzbetont zu Geflügel in Rahmsauce, Hummer, Pilzen.",
    mnemonic: "Chardonnay ist das Chamäleon: Er nimmt die Farbe seiner Umgebung an."
  },
  {
    id: "sauvignon", name: "Sauvignon Blanc", alias: "", color: "weiss",
    aromas: "Stachelbeere, frisch gemähtes Gras, grüne Paprika, Holunderblüte, Grapefruit, Maracuja",
    acid: 5, body: 2, tannin: null,
    style: "Meist trocken, frisch und ohne Holz. In Bordeaux auch mit Sémillon verschnitten und im Holz ausgebaut.",
    variation: "Loire (Sancerre, Pouilly-Fumé): straff, kräutrig, zurückhaltend. Marlborough: intensiv tropisch und grün. Steiermark: würzig, präzise.",
    regions: "Loire, Bordeaux, Marlborough, Steiermark, Südafrika",
    food: "Ziegenkäse, Salate mit Vinaigrette, Spargel, Gerichte mit frischen Kräutern.",
    mnemonic: "Sauvignon Blanc: frisch gemähter Rasen trifft Maracuja-Limo."
  },
  {
    id: "grauburgunder", name: "Grauburgunder", alias: "Pinot Grigio · Pinot Gris", color: "weiss",
    aromas: "Birne, Apfel, Mandel, Nuss; voller ausgebaut auch gelbe Früchte und Honig",
    acid: 3, body: 3, tannin: null,
    style: "Dieselbe Rebsorte, zwei Stilwelten: Pinot Grigio ist meist leicht und neutral, Grauburgunder und Pinot Gris oft voller und cremiger.",
    variation: "Italien (Venetien, Friaul): leicht, frisch, unkompliziert. Baden, Pfalz: kräftiger, teils im Holz. Elsass: üppig, manchmal mit Restsüße.",
    regions: "Venetien, Friaul, Trentino, Baden, Pfalz, Elsass",
    food: "Antipasti, helles Fleisch, Kürbis- und Pilzgerichte (voller Stil).",
    mnemonic: "Eine Traube, zwei Gewichtsklassen: Grigio im Leichtgewicht, Grauburgunder im Mittelgewicht."
  },
  {
    id: "veltliner", name: "Grüner Veltliner", alias: "", color: "weiss",
    aromas: "Grüner Apfel, Zitrus, weißer Pfeffer (das „Pfefferl“), Kräuter",
    acid: 4, body: 3, tannin: null,
    style: "Österreichs wichtigste Sorte: von leicht und spritzig bis kraftvoll und lagerfähig.",
    variation: "Weinviertel: frisch und pfeffrig. Wachau (Smaragd), Kamptal, Kremstal: dichter, kräftiger, reifefähig.",
    regions: "Wachau, Kamptal, Kremstal, Weinviertel",
    food: "Wiener Schnitzel, Spargel, Gemüsegerichte, asiatische Küche.",
    mnemonic: "Grün wie der Apfel, Veltliner wie Pfeffer: Der Grüne hat das „Pfefferl“."
  },
  {
    id: "chenin", name: "Chenin Blanc", alias: "", color: "weiss",
    aromas: "Apfel, Quitte, Birne, Kamille, Honig, Bienenwachs",
    acid: 5, body: 3, tannin: null,
    style: "Ein Allrounder: trocken, halbtrocken, edelsüß oder schäumend. Fast immer mit kräftiger Säure.",
    variation: "Loire (Vouvray, Savennières, Anjou): von knochentrocken bis süß. Südafrika: oft fruchtig-reif, manchmal mit Holz.",
    regions: "Loire, Südafrika",
    food: "Schweinefleisch mit Apfel, Geflügel, asiatische Gerichte; süß zu Obstdesserts.",
    mnemonic: "Chenin Blanc ist das Schweizer Taschenmesser: trocken bis süß, still bis prickelnd, immer scharf geschliffen."
  },
  {
    id: "pinotnoir", name: "Pinot Noir", alias: "Spätburgunder", color: "rot",
    aromas: "Kirsche, Erdbeere, Himbeere; mit Reife Waldboden, Pilze, Laub",
    acid: 4, body: 2, tannin: 2,
    style: "Hell in der Farbe, elegant und duftig. Reagiert empfindlich auf Klima und Lage, daher sehr unterschiedliche Ergebnisse.",
    variation: "Burgund: fein, erdig, vielschichtig. Baden, Ahr, Pfalz: von saftig bis kräftig. Kalifornien: reifer, dunkler, üppiger.",
    regions: "Burgund, Baden, Ahr, Pfalz, Oregon, Neuseeland, Champagne (für Schaumwein)",
    food: "Ente, Geflügel, Pilzgerichte, Lachs, Thunfisch.",
    mnemonic: "Pinot Noir ist die Primaballerina: leichtfüßig, sensibel, schwer zu bändigen."
  },
  {
    id: "cabernet", name: "Cabernet Sauvignon", alias: "", color: "rot",
    aromas: "Schwarze Johannisbeere (Cassis), Brombeere, Zeder, Minze, in kühlen Jahren grüne Paprika; mit Holz Vanille und Tabak",
    acid: 4, body: 5, tannin: 5,
    style: "Kräftig, tanninreich, oft im Holzfass ausgebaut und in Cuvées verschnitten. Sehr lagerfähig.",
    variation: "Bordeaux (linkes Ufer): straff, mit Merlot verschnitten. Napa Valley: reif, kraftvoll, oft mit neuem Holz. Chile: fruchtbetont, oft preiswert.",
    regions: "Bordeaux (Médoc), Napa Valley, Chile, Coonawarra, Toskana (Bolgheri)",
    food: "Steak, Lamm, gereifter Hartkäse.",
    mnemonic: "Cabernet = Cassis plus Kraft: der Bodybuilder unter den Rotweinen."
  },
  {
    id: "merlot", name: "Merlot", alias: "", color: "rot",
    aromas: "Pflaume, schwarze Kirsche, Schokolade, Kräuter",
    acid: 3, body: 4, tannin: 3,
    style: "Weicher und runder als Cabernet, mit samtigerem Tannin. Wichtigste Sorte am rechten Ufer von Bordeaux.",
    variation: "Saint-Émilion, Pomerol: samtig, vielschichtig. Warme Regionen: pflaumig, weich, unkompliziert.",
    regions: "Bordeaux (Saint-Émilion, Pomerol), Italien, Kalifornien, Chile",
    food: "Braten, Pasta mit Fleischsauce, Burger.",
    mnemonic: "Merlot ist der samtige Ohrensessel: weich, rund, bequem."
  },
  {
    id: "syrah", name: "Syrah", alias: "Shiraz", color: "rot",
    aromas: "Brombeere, Heidelbeere, schwarzer Pfeffer, Oliven, Rauch; im warmen Klima Schokolade, Lakritz, Konfitüre",
    acid: 3, body: 5, tannin: 4,
    style: "Dunkel und würzig. Der Name verrät oft den Stil: „Syrah“ eher straff und pfeffrig, „Shiraz“ eher üppig und fruchtig.",
    variation: "Nördliche Rhône (Hermitage, Côte-Rôtie): pfeffrig, straff. Barossa Valley: üppig, dunkel, alkoholreich. Südliche Rhône: Partner in Cuvées.",
    regions: "Rhône, Barossa Valley, Südafrika, Washington State",
    food: "Grillfleisch, Lamm, Wild, BBQ.",
    mnemonic: "Syrah ist die Pfeffermühle, Shiraz das Brombeerglas."
  },
  {
    id: "tempranillo", name: "Tempranillo", alias: "Tinto Fino · Tinta Roriz", color: "rot",
    aromas: "Kirsche, Erdbeere, getrocknete Feige, Leder, Tabak; mit amerikanischer Eiche Vanille, Kokos, Dill",
    acid: 3, body: 4, tannin: 3,
    style: "Mittelkräftig bis kräftig. Von jung und fruchtig (Joven) bis lange gereift (Gran Reserva).",
    variation: "Rioja: oft eleganter, mit Holzwürze. Ribera del Duero: dunkler und kräftiger. In Portugal als Tinta Roriz Teil von Douro-Weinen und Portwein.",
    regions: "Rioja, Ribera del Duero, Toro, Douro",
    food: "Lamm, Chorizo, Tapas, Manchego.",
    mnemonic: "„Temprano“ heißt früh: Die Traube reift früh, der Wein darf dafür lange reifen."
  },
  {
    id: "sangiovese", name: "Sangiovese", alias: "", color: "rot",
    aromas: "Sauerkirsche, Pflaume, Tomatenblatt, getrocknete Kräuter, Leder",
    acid: 5, body: 3, tannin: 4,
    style: "Säurebetont und herzhaft, mit spürbarem Tannin. Das Rückgrat der Toskana.",
    variation: "Chianti Classico: frisch, kirschig. Brunello di Montalcino: dichter, lange gereift. Einfacher Sangiovese: unkompliziert und saftig.",
    regions: "Toskana (Chianti Classico, Brunello di Montalcino, Vino Nobile di Montepulciano), Romagna",
    food: "Pasta mit Tomatensauce, Pizza, Bistecca alla Fiorentina.",
    mnemonic: "Der Legende nach „Blut des Jupiter“: rot, herzhaft und sauer wie eine reife Tomate."
  },
  {
    id: "grenache", name: "Grenache", alias: "Garnacha · Cannonau", color: "rot",
    aromas: "Erdbeere, Himbeere, Kirsche, Zimt, getrocknete Kräuter",
    acid: 2, body: 4, tannin: 2,
    style: "Fruchtig, warm, oft alkoholreich, mit eher heller Farbe. Häufig in Cuvées und Rosés.",
    variation: "Südliche Rhône (Châteauneuf-du-Pape): würzige Cuvées. Priorat: konzentriert, kraftvoll. Provence: Basis vieler trockener Rosés.",
    regions: "Südliche Rhône, Priorat, Rioja, Sardinien, Provence",
    food: "Geschmortes, Lamm mit Kräutern, mediterrane Küche, Grillgemüse.",
    mnemonic: "Grenache ist der Sonnenanbeter: viel Wärme, viel Frucht, viel Alkohol, wenig Farbe."
  }
];

/* Gleiche Rebsorte, anderes Klima */
const CLIMATE = {
  chardonnay: {
    name: "Chardonnay",
    steps: [
      { label: "kühl", place: "Chablis, Burgund", aromas: "Zitrone, grüner Apfel, Kreide-Eindruck", text: "Straff, schlank, hohe Säure. Meist kein neues Holz. Um 12,5 % Alkohol.", acid: 5, body: 2, alc: 2 },
      { label: "gemäßigt", place: "Meursault, Côte de Beaune", aromas: "Gelber Apfel, Haselnuss, Brioche", text: "Cremiger, mehr Körper, oft im Holzfass ausgebaut. Säure noch gut spürbar.", acid: 4, body: 3, alc: 3 },
      { label: "warm", place: "Kalifornien, Australien", aromas: "Ananas, Pfirsich, Vanille, Butter", text: "Reif und vollmundig, oft mit neuem Holz und buttrigen Noten. Gern 14 % Alkohol.", acid: 2, body: 5, alc: 4 }
    ]
  },
  sauvignon: {
    name: "Sauvignon Blanc",
    steps: [
      { label: "kühl", place: "Sancerre, Loire", aromas: "Zitrus, Gras, Kräuter, rauchige Noten", text: "Straff, zurückhaltend, sehr frisch.", acid: 5, body: 2, alc: 2 },
      { label: "kühl, sehr sonnig", place: "Marlborough, Neuseeland", aromas: "Maracuja, Stachelbeere, Limette", text: "Kühle Nächte halten die Säure, viel Sonne bringt intensive Aromen.", acid: 5, body: 2, alc: 3 },
      { label: "warm", place: "Napa Valley („Fumé Blanc“)", aromas: "Melone, Feige, Vanille", text: "Runder, reifer, öfter mit Holz. Weniger grüne Noten.", acid: 3, body: 4, alc: 4 }
    ]
  },
  pinotnoir: {
    name: "Pinot Noir",
    steps: [
      { label: "kühl", place: "Côte de Nuits, Burgund", aromas: "Himbeere, Kirsche, Waldboden", text: "Hell, zart, duftig, mit lebendiger Säure.", acid: 4, body: 2, alc: 2 },
      { label: "gemäßigt", place: "Baden, Oregon", aromas: "Reife Kirsche, etwas Gewürz", text: "Mehr Frucht und etwas mehr Körper, oft mit Holz.", acid: 3, body: 3, alc: 3 },
      { label: "warm", place: "Kalifornien (Central Coast)", aromas: "Dunkle Kirsche, Cola, Vanille", text: "Üppiger, dunkler, weicher. Mehr Alkohol.", acid: 3, body: 4, alc: 4 }
    ]
  },
  syrah: {
    name: "Syrah / Shiraz",
    steps: [
      { label: "kühl", place: "Nördliche Rhône", aromas: "Schwarzer Pfeffer, Veilchen, Oliven", text: "Straff, würzig, mit festem Tannin. Auf dem Etikett „Syrah“.", acid: 4, body: 4, alc: 3 },
      { label: "gemäßigt", place: "Swartland, Südafrika", aromas: "Brombeere, Pfeffer, Kräuter", text: "Frucht und Würze im Gleichgewicht.", acid: 3, body: 4, alc: 3 },
      { label: "warm", place: "Barossa Valley, Australien", aromas: "Brombeerkonfitüre, Schokolade, Lakritz", text: "Üppig, dicht, oft 14,5 % und mehr. Auf dem Etikett „Shiraz“.", acid: 2, body: 5, alc: 5 }
    ]
  }
};

/* Regionen. lab = Position des Kartenlabels (r, l, t, b) in der Europa-Ansicht */
const COUNTRIES = ["Deutschland", "Frankreich", "Italien", "Spanien", "Österreich", "Portugal", "Neue Welt"];
const REGIONS = [
  { id: "mosel", name: "Mosel", country: "Deutschland", lat: 49.95, lon: 6.95, lab: "l", grapes: ["Riesling"], style: "Schlanke, säurebetonte Rieslinge mit Zitrus- und Steinobstnoten, von trocken bis edelsüß. Restsüße Kabinette haben oft nur 7–9 % Alkohol.", note: "Steile Schieferhänge über dem Fluss. Ob man den Schiefer „schmeckt“, ist umstritten. „Mineralisch“ beschreibt einen Eindruck, keinen Messwert." },
  { id: "rheingau", name: "Rheingau", country: "Deutschland", lat: 50.05, lon: 8.0, lab: "t", grapes: ["Riesling", "Spätburgunder"], style: "Riesling dominiert, oft etwas kräftiger und würziger als an der Mosel. Dazu Spätburgunder, etwa aus Assmannshausen.", note: "Klassische Südhänge am Rhein, eine der traditionsreichsten Riesling-Regionen." },
  { id: "rheinhessen", name: "Rheinhessen", country: "Deutschland", lat: 49.75, lon: 8.2, lab: "r", dy: -2, grapes: ["Riesling", "Silvaner", "Burgundersorten"], style: "Größtes deutsches Anbaugebiet und sehr vielfältig: vom einfachen Literwein bis zu gefeierten trockenen Rieslingen.", note: "Eine junge Winzergeneration hat das Image hier stark verändert." },
  { id: "pfalz", name: "Pfalz", country: "Deutschland", lat: 49.3, lon: 8.15, lab: "r", dy: 4, grapes: ["Riesling", "Burgundersorten", "Spätburgunder"], style: "Warm und sonnig. Rieslinge oft trocken und kräftiger, dazu viel Weiß-, Grau- und Spätburgunder.", note: "Hier wachsen sogar Mandeln und Feigen." },
  { id: "baden", name: "Baden", country: "Deutschland", lat: 48.1, lon: 7.7, lab: "r", grapes: ["Spätburgunder", "Grauburgunder", "Weißburgunder"], style: "Das Burgunderland Deutschlands: Spätburgunder, Grau- und Weißburgunder, oft kräftig und trocken.", note: "Südlichstes deutsches Anbaugebiet, mit dem vulkanischen Kaiserstuhl." },
  { id: "bordeaux", name: "Bordeaux", country: "Frankreich", lat: 44.84, lon: -0.58, lab: "l", grapes: ["Cabernet Sauvignon", "Merlot", "Cabernet Franc", "Sauvignon Blanc", "Sémillon"], style: "Vor allem rote Cuvées. Linkes Ufer (Médoc): oft Cabernet-betont, straffer. Rechtes Ufer (Saint-Émilion, Pomerol): oft Merlot-betont, runder.", note: "Auch weiß (Sauvignon Blanc, Sémillon) und edelsüß (Sauternes). Die Rebsorte steht selten auf dem Etikett." },
  { id: "burgund", name: "Burgund", country: "Frankreich", lat: 47.05, lon: 4.85, lab: "r", grapes: ["Pinot Noir", "Chardonnay"], style: "Rot fast immer Pinot Noir, weiß fast immer Chardonnay. Herkunft bis hinunter zu einzelnen Lagen.", note: "Pyramide: Bourgogne (regional), Village, Premier Cru, Grand Cru. Chablis im Norden steht für straffen Chardonnay." },
  { id: "champagne", name: "Champagne", country: "Frankreich", lat: 49.05, lon: 4.03, lab: "l", grapes: ["Chardonnay", "Pinot Noir", "Meunier"], style: "Schaumwein mit zweiter Gärung in der Flasche (traditionelle Methode). Meist Cuvées aus mehreren Sorten und Jahren.", note: "„Champagner“ ist eine geschützte Herkunft. Gleiche Methode anderswo: Crémant, Cava, viele Winzersekte." },
  { id: "loire", name: "Loire", country: "Frankreich", lat: 47.35, lon: 1.0, lab: "l", grapes: ["Sauvignon Blanc", "Chenin Blanc", "Cabernet Franc"], style: "Frische, säurebetonte Weine: Sauvignon Blanc (Sancerre), Chenin Blanc (Vouvray), Cabernet Franc (Chinon).", note: "Ein langes Flusstal mit sehr unterschiedlichen Teilregionen." },
  { id: "rhone", name: "Rhône", country: "Frankreich", lat: 44.6, lon: 4.8, lab: "l", grapes: ["Syrah", "Grenache", "Viognier"], style: "Norden: Syrah, straff und pfeffrig (Hermitage, Côte-Rôtie). Süden: Grenache-betonte Cuvées, warm und würzig (Châteauneuf-du-Pape, Côtes du Rhône).", note: "Zwei Regionen in einer: Nord und Süd unterscheiden sich deutlich." },
  { id: "elsass", name: "Elsass", country: "Frankreich", lat: 48.1, lon: 7.3, lab: "l", grapes: ["Riesling", "Gewürztraminer", "Pinot Gris"], style: "Aromatische Weißweine. Untypisch für Frankreich: Die Rebsorte steht meist auf dem Etikett.", note: "Die Süße ist nicht immer am Etikett ablesbar. Nachfragen lohnt sich." },
  { id: "toskana", name: "Toskana", country: "Italien", lat: 43.45, lon: 11.25, lab: "r", grapes: ["Sangiovese", "Cabernet Sauvignon", "Merlot"], style: "Sangiovese: Chianti Classico, Brunello di Montalcino, Vino Nobile di Montepulciano.", note: "„Supertuscans“ verwenden auch Bordeaux-Sorten, etwa in Bolgheri." },
  { id: "piemont", name: "Piemont", country: "Italien", lat: 44.6, lon: 7.95, lab: "t", grapes: ["Nebbiolo", "Barbera", "Moscato"], style: "Nebbiolo für Barolo und Barbaresco: helle Farbe, aber viel Tannin und Säure, Duft nach Rosen und Teer. Dazu saftiger Barbera.", note: "Moscato d'Asti: leicht perlend, süß, wenig Alkohol." },
  { id: "venetien", name: "Venetien", country: "Italien", lat: 45.55, lon: 11.6, lab: "r", grapes: ["Glera", "Corvina", "Garganega", "Pinot Grigio"], style: "Prosecco (aus Glera), Valpolicella und Amarone (Corvina), Soave (Garganega), viel Pinot Grigio.", note: "Amarone entsteht aus angetrockneten Trauben: konzentriert, kräftig, alkoholreich." },
  { id: "rioja", name: "Rioja", country: "Spanien", lat: 42.45, lon: -2.45, lab: "r", grapes: ["Tempranillo", "Garnacha"], style: "Tempranillo, oft mit Garnacha. Reifestufen Crianza, Reserva, Gran Reserva.", note: "Traditionell amerikanische Eiche (Vanille, Kokos), heute auch französische." },
  { id: "ribera", name: "Ribera del Duero", country: "Spanien", lat: 41.65, lon: -3.7, lab: "r", grapes: ["Tempranillo"], style: "Tempranillo (hier Tinto Fino): meist dunkler und kräftiger als viele Riojas.", note: "Hochebene mit heißen Tagen und kalten Nächten." },
  { id: "riasbaixas", name: "Rías Baixas", country: "Spanien", lat: 42.4, lon: -8.7, lab: "r", grapes: ["Albariño"], style: "Frische, aromatische Weißweine aus Albariño: Pfirsich, Zitrus, oft mit salzig wirkendem Eindruck.", note: "Atlantisch, kühl und feucht. Der Klassiker zu Meeresfrüchten." },
  { id: "wachau", name: "Wachau", country: "Österreich", lat: 48.37, lon: 15.42, lab: "t", grapes: ["Grüner Veltliner", "Riesling"], style: "Trockene Weine von Terrassen an der Donau. Stufen: Steinfeder (leicht), Federspiel (mittel), Smaragd (kräftig).", note: "Grüner Veltliner und Riesling auf Weltniveau." },
  { id: "burgenland", name: "Burgenland", country: "Österreich", lat: 47.8, lon: 16.7, lab: "bl", grapes: ["Blaufränkisch", "Zweigelt"], style: "Österreichs Rotweinland: Blaufränkisch (würzig, frisch) und Zweigelt (kirschig, saftig).", note: "Am Neusiedlersee entstehen berühmte edelsüße Weine." },
  { id: "douro", name: "Douro", country: "Portugal", lat: 41.15, lon: -7.6, lab: "b", grapes: ["Touriga Nacional", "Touriga Franca", "Tinta Roriz"], style: "Heimat des Portweins und zunehmend kraftvoller trockener Rotweine aus Sortenmischungen.", note: "Portwein ist aufgespritet: Zugesetzter Weinbrand stoppt die Gärung. Ergebnis: süß, meist 19–22 % Alkohol." },
  { id: "napa", name: "Napa Valley", country: "Neue Welt", lat: 38.5, lon: -122.35, lab: "r", grapes: ["Cabernet Sauvignon", "Chardonnay", "Merlot"], style: "Sonnig: reife, kraftvolle Cabernets, oft mit neuem Holz.", note: "Kaliforniens bekanntestes Tal, mit teils sehr hohen Preisen für Prestigeweine." },
  { id: "marlborough", name: "Marlborough", country: "Neue Welt", lat: -41.5, lon: 173.9, lab: "l", grapes: ["Sauvignon Blanc", "Pinot Noir"], style: "Intensiv aromatischer Sauvignon Blanc (Maracuja, Stachelbeere, Limette), weltweit ein Stilbegriff.", note: "Kühles, sehr sonniges Klima auf der Südinsel Neuseelands." },
  { id: "mendoza", name: "Mendoza", country: "Neue Welt", lat: -33.0, lon: -68.8, lab: "r", grapes: ["Malbec"], style: "Dunkelfruchtige, samtige Malbecs.", note: "Weinberge in großer Höhe am Fuß der Anden. Die kühlen Nächte bewahren Frische." }
];

/* Speisenbegleiter */
const DISHES = [
  {
    id: "steak", name: "Steak", rule: "Tannin + Eiweiß/Fett",
    picks: [
      { style: "Kräftiger, tanninreicher Rotwein", ex: "Cabernet Sauvignon (Bordeaux, Napa), Malbec aus Mendoza", why: "Eiweiß und Fett des Fleischs binden das Tannin. Der Wein wirkt weicher, das Fleisch saftiger." },
      { style: "Würziger Rotwein", ex: "Syrah von der Rhône, Ribera del Duero", why: "Röstaromen vom Grill treffen auf Pfeffer- und Holzwürze." }
    ],
    avoid: { what: "Sehr leichte, zarte Weine", why: "Werden vom kräftigen Fleisch einfach überrollt." }
  },
  {
    id: "pasta", name: "Pasta mit Tomatensauce", rule: "Säure trifft Säure",
    picks: [
      { style: "Säurebetonter Rotwein", ex: "Chianti Classico (Sangiovese), Barbera", why: "Tomaten sind sauer. Ein Wein mit ebenso viel Säure bleibt frisch, statt flach zu wirken." },
      { style: "Frischer Weißwein (bei Gemüse- oder Fischsauce)", ex: "Grüner Veltliner, trockener Riesling", why: "Hält mit der Säure mit und bleibt leicht." }
    ],
    avoid: { what: "Säurearme, holzbetonte Weine", why: "Wirken neben der Tomate stumpf und dünn." }
  },
  {
    id: "risotto", name: "Pilzrisotto", rule: "Umami & Cremigkeit",
    picks: [
      { style: "Eleganter Rotwein mit wenig Tannin", ex: "Pinot Noir aus Burgund oder Baden", why: "Erdige Noten im Wein spiegeln die Pilze. Wenig Tannin verträgt sich mit Umami." },
      { style: "Cremiger Weißwein", ex: "Chardonnay mit etwas Holz, Grauburgunder", why: "Ähnliches Gewicht wie das cremige Risotto." }
    ],
    avoid: { what: "Sehr tanninreiche Rotweine", why: "Umami kann Tannin härter und bitterer wirken lassen." }
  },
  {
    id: "sushi", name: "Sushi", rule: "Salz, Umami, Frische",
    picks: [
      { style: "Trockener, frischer Weißwein", ex: "Riesling trocken, Grüner Veltliner, Albariño", why: "Die Säure erfrischt, die Frucht stört den feinen Fisch nicht." },
      { style: "Schaumwein, Brut", ex: "Champagner, Crémant, Winzersekt", why: "Säure und Perlage reinigen den Gaumen, auch nach Sojasauce." }
    ],
    avoid: { what: "Kräftige, tanninreiche Rotweine", why: "Tannin und Fischöle können zusammen metallisch schmecken." }
  },
  {
    id: "ziegenkaese", name: "Ziegenkäse", rule: "Was zusammen wächst …",
    picks: [
      { style: "Sauvignon Blanc", ex: "Sancerre (Loire), Steiermark", why: "Der Klassiker aus derselben Gegend: Die Säure hält mit dem säuerlichen Käse mit und schneidet durch die Cremigkeit." },
      { style: "Trockener Chenin Blanc", ex: "Loire, Südafrika", why: "Viel Säure, dazu etwas mehr Körper für gereiften Käse." }
    ],
    avoid: { what: "Schwere, tanninreiche Rotweine", why: "Tannin und frischer Ziegenkäse beißen sich oft." }
  },
  {
    id: "curry", name: "Scharfes Curry", rule: "Schärfe verstärkt Alkohol & Tannin",
    picks: [
      { style: "Weißwein mit etwas Restsüße", ex: "Riesling Kabinett oder feinherb, Gewürztraminer", why: "Süße mildert die Schärfe, wenig Alkohol verhindert das Brennen." },
      { style: "Fruchtiger Rosé", ex: "Rosé aus Grenache oder Spätburgunder", why: "Frucht und Frische, kein Tannin." }
    ],
    avoid: { what: "Alkoholreiche, tanninstarke Rotweine", why: "Schärfe lässt Alkohol brennen und Tannin bitter wirken." }
  },
  {
    id: "dessert", name: "Desserts", rule: "Wein mindestens so süß wie das Dessert",
    picks: [
      { style: "Edelsüßer Weißwein", ex: "Riesling Auslese, Sauternes, süßer Chenin Blanc", why: "Süße und Säure tragen Obstdesserts und Crème brûlée." },
      { style: "Leicht und perlend süß", ex: "Moscato d'Asti", why: "Leicht, wenig Alkohol, ideal zu Obst und leichten Desserts." },
      { style: "Gespriteter Rotwein zu Schokolade", ex: "Ruby Port (Douro)", why: "Kräftige Süße hält mit dunkler Schokolade mit." }
    ],
    avoid: { what: "Trockene Weine, auch Brut-Schaumwein", why: "Neben Süßem wirken sie sauer, bitter und dünn." }
  },
  {
    id: "kaese", name: "Käseplatte", rule: "Lieber Weiß als Rot, oder Süß zu Blau",
    picks: [
      { style: "Vielseitiger Weißwein", ex: "Riesling, Chenin Blanc, gereifter Chardonnay", why: "Säure passt zu vielen Käsesorten besser als Tannin. Weißwein ist auf gemischten Platten oft die sicherere Wahl." },
      { style: "Süßwein zu Blauschimmel", ex: "Sauternes, Portwein", why: "Salz und Süße: ein klassisches Gegensatzpaar." },
      { style: "Mittelkräftiger Rotwein zu Hartkäse", ex: "Rioja Reserva, Merlot", why: "Gereifter Hartkäse wie Manchego oder alter Gouda verträgt Tannin." }
    ],
    avoid: { what: "Ein einziger kräftiger Rotwein für alles", why: "Tannin plus Weichkäse kann bitter und metallisch wirken." }
  }
];

const PAIRING_RULES = [
  { t: "Säure liebt Fett", d: "Säure schneidet durch Fettiges und erfrischt. Riesling zu Schweinebauch, Champagner zu Frittiertem. Saures Essen (Tomate, Vinaigrette) braucht Säure im Wein, sonst wirkt der Wein flach." },
  { t: "Süße mindestens gleich", d: "Der Wein sollte mindestens so süß sein wie die Speise. Sonst wirkt er sauer, bitter und dünn." },
  { t: "Tannin braucht Eiweiß", d: "Tanninreiche Rotweine harmonieren mit proteinreichem Fleisch. Eiweiß und Fett lassen Tannin weicher wirken." },
  { t: "Schärfe heizt ein", d: "Chili lässt Alkohol brennen und Tannin bitter wirken. Besser: wenig Alkohol, viel Frucht, etwas Restsüße." },
  { t: "Salz hilft, Umami fordert", d: "Salz macht Weine runder und weicher. Umami (Pilze, Parmesan, Sojasauce) kann Tannin und Bitterkeit verstärken." },
  { t: "Struktur schlägt Farbe", d: "Leichtes Essen, leichter Wein. Kräftiges Essen, kräftiger Wein. Die Sauce zählt oft mehr als das Fleisch. Lachs mit Pinot Noir oder Hähnchen mit Chardonnay funktioniert bestens." }
];

/* Serviertemperaturen */
const TEMPS = [
  { id: "schaum", name: "Schaumwein", ex: "Sekt, Prosecco, Cava; Champagner eher am oberen Rand", min: 6, max: 9 },
  { id: "leichtweiss", name: "Leichte Weißweine & Rosé", ex: "Riesling, Sauvignon Blanc, Pinot Grigio, Rosé", min: 7, max: 10 },
  { id: "vollweiss", name: "Volle Weißweine", ex: "Chardonnay mit Holz, kräftiger Grauburgunder", min: 10, max: 13 },
  { id: "suess", name: "Edelsüße Weißweine", ex: "Auslese, Sauternes", min: 8, max: 11 },
  { id: "leichtrot", name: "Leichte Rotweine", ex: "Pinot Noir, junger Spätburgunder, Zweigelt", min: 12, max: 14 },
  { id: "mittelrot", name: "Mittelkräftige Rotweine", ex: "Merlot, Chianti Classico, Rioja Crianza", min: 14, max: 16 },
  { id: "kraeftigrot", name: "Kräftige Rotweine", ex: "Cabernet Sauvignon, Syrah, Barolo", min: 16, max: 18 },
  { id: "port", name: "Portwein", ex: "Ruby, Tawny", min: 14, max: 18 }
];

/* Glossar: Etikettenbegriffe */
const GLOSSARY = [
  { t: "Cuvée / Verschnitt", d: "Mischung aus mehreren Rebsorten, Lagen oder Fässern. Kein Qualitätsmangel: Bordeaux, Châteauneuf-du-Pape und die meisten Champagner sind Cuvées." },
  { t: "Rebsortenwein", d: "In der EU muss ein Wein mindestens 85 % der genannten Rebsorte enthalten, wenn nur eine Sorte auf dem Etikett steht." },
  { t: "Jahrgang", d: "Erntejahr der Trauben (EU: mindestens 85 % aus diesem Jahr). Ein Hinweis auf Alter und Wetter, kein Qualitätssiegel." },
  { t: "Restzucker", d: "Zucker, den die Hefen bei der Gärung übrig gelassen haben. Angabe in Gramm pro Liter (g/l)." },
  { t: "trocken / halbtrocken / lieblich / süß", d: "Für Stillwein in der EU vereinfacht: trocken bis 4 g/l (bis 9 g/l bei genug Säure), halbtrocken bis 12 g/l (bis 18 g/l bei genug Säure), lieblich bis 45 g/l, süß darüber." },
  { t: "feinherb", d: "Gesetzlich nicht definiert. Meist ein Wein mit leichter Restsüße, etwa im Bereich halbtrocken." },
  { t: "Qualitätswein", d: "Deutscher Wein mit geschützter Ursprungsbezeichnung aus einem der 13 Anbaugebiete, amtlich geprüft." },
  { t: "Prädikatswein", d: "Höchste deutsche Stufe. Die Prädikate Kabinett, Spätlese, Auslese, Beerenauslese, Trockenbeerenauslese und Eiswein beschreiben die Reife der Trauben bei der Lese (Mostgewicht, gemessen in Grad Oechsle), nicht die Süße im Glas." },
  { t: "Kabinett", d: "Unterstes Prädikat: oft leicht und alkoholarm, je nach Erzeuger trocken oder restsüß." },
  { t: "Spätlese", d: "Reifere Trauben als beim Kabinett. Kann trocken („Spätlese trocken“) oder süß sein." },
  { t: "Auslese, BA, TBA, Eiswein", d: "Sehr reife bis eingetrocknete oder gefrorene Trauben. Meist süß bis edelsüß, selten und teuer." },
  { t: "A. P. Nr.", d: "Amtliche Prüfnummer: Der Wein hat die amtliche Qualitätsprüfung in Deutschland bestanden." },
  { t: "Gutsabfüllung / Erzeugerabfüllung", d: "Der Wein wurde vom Betrieb selbst abgefüllt. Bei Gutsabfüllung stammen die Trauben aus eigenen Weinbergen." },
  { t: "VDP & Großes Gewächs (GG)", d: "Der VDP ist ein privater Verband von Spitzenweingütern mit eigener Klassifikation: Gutswein, Ortswein, Erste Lage, Große Lage. „Großes Gewächs“ ist ein trockener Wein aus einer Großen Lage." },
  { t: "g. U. / g. g. A.", d: "EU-Herkunftsschutz: geschützte Ursprungsbezeichnung (strengere Regeln) und geschützte geografische Angabe (lockerere Regeln)." },
  { t: "AOP / AOC", d: "Frankreichs geschützte Herkunft (Appellation d'Origine Protégée bzw. Contrôlée). Regelt u. a. Gebiet, Sorten, Erträge und Methoden." },
  { t: "IGP / Vin de France", d: "Lockerere französische Kategorien, z. B. IGP Pays d'Oc. Mehr Freiheit bei Sorten und Stil." },
  { t: "Premier Cru / Grand Cru", d: "Lagen-Klassifikationen, z. B. in Burgund (Grand Cru ganz oben). In Bordeaux bezeichnet „Grand Cru Classé“ dagegen klassifizierte Châteaux." },
  { t: "Château / Domaine", d: "Weingut. „Mis en bouteille au château / au domaine“: auf dem Weingut abgefüllt." },
  { t: "DOCG / DOC / IGT", d: "Italiens Stufen: DOCG (höchste, mit staatlicher Banderole am Flaschenhals), DOC, dann IGT mit mehr Freiheit. Viele Supertuscans sind IGT." },
  { t: "Riserva", d: "Italien: Wein mit längerer vorgeschriebener Reifezeit. Die genaue Dauer legt jede Herkunft selbst fest." },
  { t: "DOP: DO, DOCa, Vino de Pago", d: "Spaniens geschützte Herkünfte. DOCa (in Katalonien DOQ) tragen nur Rioja und Priorat. Vino de Pago steht für einzelne Güter mit eigener Herkunft." },
  { t: "Crianza / Reserva / Gran Reserva", d: "Spanische Reifestufen. In Rioja (Rotwein) mindestens: Crianza 2 Jahre (davon 1 im Fass), Reserva 3 Jahre (1 im Fass), Gran Reserva 5 Jahre (2 im Fass)." },
  { t: "DAC", d: "Österreichs Herkunftssystem (Districtus Austriae Controllatus), z. B. Wachau DAC oder Kamptal DAC." },
  { t: "Barrique", d: "Eichenfass mit 225 Litern. Neues Holz gibt Vanille, Toast und Rauch. Große, alte Fässer prägen den Geschmack kaum." },
  { t: "Brut, Extra Brut, Extra Dry", d: "Süßestufen bei Schaumwein: Brut Nature (fast ohne Zucker), Extra Brut, Brut, dann Extra Dry. Vorsicht: Extra Dry ist süßer als Brut." },
  { t: "Blanc de Blancs / Blanc de Noirs", d: "Weißer Wein aus weißen Trauben bzw. weißer Wein aus roten Trauben, abgepresst ohne Farbe." },
  { t: "Traditionelle Methode", d: "Zweite Gärung in der Flasche: Champagner, Crémant, Cava, viele Winzersekte. Prosecco gärt meist im Tank." }
];

const MYTHS = [
  { m: "Rotwein serviert man bei Zimmertemperatur, also 20–22 °C.", f: "Die Regel stammt aus Zeiten kühler, ungeheizter Räume. Besser sind 14–18 °C, je nach Stil. Zu warm wirkt Alkohol brandig und die Frucht marmeladig." },
  { m: "Je älter ein Wein, desto besser.", f: "Die meisten Weine sind für einen Genuss innerhalb weniger Jahre gemacht. Nur Weine mit viel Struktur (Säure, Tannin, Konzentration, Süße) gewinnen durch Reife." },
  { m: "Teurer Wein ist besserer Wein.", f: "Der Preis spiegelt auch Seltenheit, Prestige, Marketing und Nachfrage. Ab einem gewissen Niveau zahlt man vor allem dafür." },
  { m: "Schraubverschluss heißt billig.", f: "Viele hochwertige Weine aus Österreich, Deutschland, Neuseeland und Australien nutzen ihn. Ein Vorteil: Es gibt keinen Korkfehler." },
  { m: "Fruchtig bedeutet süß.", f: "Frucht riecht man, Süße schmeckt man. Ein knochentrockener Sauvignon Blanc kann intensiv nach Maracuja duften." },
  { m: "Rotwein zu Fleisch, Weißwein zu Fisch, immer.", f: "Struktur, Gewicht und Sauce entscheiden. Lachs mit Pinot Noir oder Kalbfleisch mit Chardonnay passen hervorragend." },
  { m: "Ausgeprägte „Kirchenfenster“ zeigen Qualität.", f: "Die Schlieren am Glas zeigen vor allem Alkohol und Zucker, nicht die Qualität." },
  { m: "Eine geöffnete Flasche „atmet“ einfach so.", f: "Durch den schmalen Flaschenhals kommt kaum Luft an den Wein. Wenn Belüftung, dann in Karaffe oder Glas, und nur bei Weinen, die davon profitieren." },
  { m: "Ein Silberlöffel im Flaschenhals hält Sekt frisch.", f: "Ein Effekt ist nicht belegt. Was hilft: ein Sektverschluss und der Kühlschrank." },
  { m: "Rosé ist gemischter Rot- und Weißwein.", f: "Rosé entsteht aus roten Trauben mit kurzem Schalenkontakt. Mischen ist in der EU für stillen Rosé grundsätzlich nicht erlaubt (Ausnahme u. a. Rosé-Champagner)." }
];

const PHRASES = [
  "Ich mag eher frische, elegante Weine mit guter Säure und nicht zu viel Holz. Haben Sie etwas aus der Richtung?",
  "Ist der eher fruchtig oder eher würzig-herb?",
  "Wir essen Fisch und Fleisch. Gibt es eine Flasche, die zu beidem passt?",
  "Wir hatten an etwas in dieser Preisregion gedacht. (dabei auf einen Preis auf der Karte zeigen)",
  "Schöne Säure, der wirkt richtig frisch.",
  "Das Tannin ist schon recht weich. Der hat offenbar etwas Reife.",
  "Man merkt die kühle Herkunft: sehr schlank und präzise.",
  "Für mich ist da etwas viel Holz drin, aber sauber gemacht ist er.",
  "Was trinken Sie selbst gerade gern von der Karte?",
  "Ich glaube, der Wein hat einen Korkton. Würden Sie bitte einmal probieren?"
];

const TASTING_STEPS = [
  { t: "Sehen", d: "Glas schräg vor einen hellen Hintergrund halten. Farbe (Zitronengelb, Gold, Bernstein; Purpur, Rubin, Granat) und Intensität. Weißweine werden mit dem Alter dunkler, Rotweine heller und am Rand bräunlicher." },
  { t: "Riechen", d: "Erst ruhig riechen, dann schwenken und noch einmal. Erst die Kategorie (Frucht, Blüten, Kräuter, Gewürze, Holz, Reife), dann das Detail." },
  { t: "Schmecken", d: "Süße, Säure, Tannin, Alkohol, Körper und Intensität. Die Struktur ist objektiver als die Aromen, und damit kannst du am meisten zeigen." },
  { t: "Bewerten", d: "Balance, Komplexität, Länge des Abgangs und dein persönlicher Eindruck. Gefallen und Qualität getrennt halten." }
];

const STRUCTURE = [
  { t: "Säure", d: "Frische. Der Mund läuft zusammen. Viel: Riesling, Sauvignon Blanc, Sangiovese. Wenig: Grenache, warmer Chardonnay." },
  { t: "Tannin", d: "Trocknend und zusammenziehend wie starker Schwarztee. Kommt aus Schalen, Kernen und Holz. Viel: Cabernet, Nebbiolo, Syrah. Wenig: Pinot Noir, Grenache." },
  { t: "Körper", d: "Gewicht im Mund: leicht wie Magermilch, voll wie Sahne. Steigt mit Alkohol, Extrakt und Süße." },
  { t: "Alkohol", d: "Wärme im Rachen. Trägt den Körper und kann bei Übermaß brennen. Etwa 8 % (Mosel-Kabinett) bis 15 % (warme Regionen)." },
  { t: "Abgang", d: "Wie lange der Geschmack nach dem Schlucken oder Ausspucken anhält. Wenige Sekunden sind kurz, deutlich über zehn Sekunden lang." }
];
