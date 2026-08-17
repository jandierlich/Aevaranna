/* AEVARANNA – Kartendaten
   78 Karten: 22 Trümpfe (Große Arkana) + 4x14 Farben (Kleine Arkana)
   Jede Karte hat: id, arcana, suit, number, name, element, keywords,
   upright (Bedeutung + Anwendung aufrecht), reversed (Bedeutung + Anwendung umgekehrt),
   advice (Lernfrage), sig (Kunst-Seed)
*/

const SUITS = {
  staebe:  { label: "Stäbe",   element: "Feuer", color: "#c96a3a", accent: "#f2a35a" },
  kelche:  { label: "Kelche",  element: "Wasser", color: "#3a7ca9", accent: "#7fc6e8" },
  schwerter: { label: "Schwerter", element: "Luft", color: "#8a8fa8", accent: "#d8dcec" },
  muenzen: { label: "Münzen",  element: "Erde", color: "#5a7d4a", accent: "#a9c98a" }
};

const MAJOR_NAMES = [
  "Der Narr","Der Magier","Die Hohepriesterin","Die Herrscherin","Der Herrscher",
  "Der Hierophant","Die Liebenden","Der Wagen","Die Kraft","Der Eremit",
  "Das Rad des Schicksals","Die Gerechtigkeit","Der Gehängte","Der Tod","Die Mäßigkeit",
  "Der Teufel","Der Turm","Der Stern","Der Mond","Die Sonne",
  "Das Gericht","Die Welt"
];

const MAJOR_MEANINGS = [
  { key:["Anfang","Unbeschwertheit","Vertrauen"],
    up:"Ein Neuanfang liegt vor dir. Unbeschwertheit, Offenheit und der Mut, ins Unbekannte zu gehen, ohne jede Antwort schon zu kennen. In der Anwendung heißt das: Wage jetzt den ersten Schritt, auch wenn der Plan noch nicht vollständig steht – zu langes Zögern nimmt dir gerade mehr als ein möglicher Fehltritt.",
    rev:"Kopflosigkeit oder Zögern aus Angst. Prüfe, ob du aus echtem Vertrauen handelst oder nur aus Sorglosigkeit ins Risiko läufst. Konkret bedeutet das: Hol dir eine zweite Meinung, bevor du losspringst, oder kläre erst die eine offene Frage, die dich eigentlich schon beschäftigt.",
    advice:"Wo im Leben traust du dich gerade, den ersten Schritt zu tun, ohne das Ende zu kennen?" },
  { key:["Wille","Können","Fokus"],
    up:"Du hast alle Werkzeuge in der Hand. Wille und Fähigkeit treffen aufeinander – jetzt ist die Zeit zu handeln. Nutze diese Karte als Aufforderung, ein konkretes Vorhaben tatsächlich zu beginnen statt nur zu planen: Die Mittel sind längst vorhanden.",
    rev:"Verzettelung, Manipulation oder ungenutztes Potenzial. Die Mittel sind da, aber der Fokus fehlt. Bevor du weitermachst, wähle bewusst ein einziges Ziel statt drei halbherziger – und prüfe, ob du gerade eher überzeugst oder manipulierst.",
    advice:"Welche deiner Fähigkeiten setzt du gerade nicht ein, obwohl du könntest?" },
  { key:["Intuition","Geheimnis","Stille"],
    up:"Innere Weisheit und Intuition führen dich. Nicht alles muss sofort verstanden werden – manches reift im Verborgenen. Praktisch heißt das: Triff jetzt keine überstürzte Entscheidung, sondern schaffe dir bewusst Stille, um zu hören, was du eigentlich schon weißt.",
    rev:"Blockierte Intuition, Geheimnisse werden zur Last, du ignorierst eine innere Stimme. Nimm dir Zeit für Alleinsein und frage dich ehrlich, welches Wissen du gerade vor dir selbst verbirgst, weil es unbequem wäre.",
    advice:"Welches Wissen trägst du bereits in dir, hörst aber noch nicht darauf?" },
  { key:["Fülle","Fürsorge","Kreativität"],
    up:"Fülle, Wachstum und Fürsorge. Etwas Neues entsteht durch deine Hände oder unter deiner Obhut. Gib dem, was gerade wächst – einem Projekt, einer Beziehung, einer Idee – bewusst Raum und Geduld, statt es zu überstürzen.",
    rev:"Überfürsorge, Stillstand in der Kreativität oder Vernachlässigung der eigenen Bedürfnisse. Prüfe konkret, wo du für andere sorgst, aber dich selbst dabei vergisst, und richte den Blick bewusst wieder auf deine eigene Fülle.",
    advice:"Wofür sorgst du gerade – und sorgst du dabei auch gut für dich selbst?" },
  { key:["Struktur","Ordnung","Verantwortung"],
    up:"Struktur, Führung und Stabilität. Du übernimmst Verantwortung und schaffst einen verlässlichen Rahmen. Setze diese Energie konkret um, indem du Regeln oder Zuständigkeiten klärst, die bisher offen geblieben sind.",
    rev:"Starrheit, Kontrollzwang oder ein Mangel an Struktur, der Chaos begünstigt. Überlege, ob du gerade zu sehr an einer Regel festhältst, die niemandem mehr dient – oder ob dir umgekehrt jede Struktur fehlt und du eine einzige verlässliche Routine einführen solltest.",
    advice:"Wo brauchst du gerade mehr Struktur – und wo zu viel Kontrolle loslassen?" },
  { key:["Tradition","Lehre","Zugehörigkeit"],
    up:"Tradition, gemeinsame Werte und Lernen von anderen. Ein Rahmen, in dem Wissen weitergegeben wird. Suche aktiv den Rat einer erfahrenen Person oder einer bewährten Methode, statt das Rad neu zu erfinden.",
    rev:"Starres Festhalten an Konventionen oder Ablehnung jeder Autorität, auch der hilfreichen. Frage dich, ob du gerade aus Prinzip widersprichst oder ob die Regel tatsächlich nicht mehr zu dir passt – beides braucht eine andere Reaktion.",
    advice:"Welche Tradition oder Lehre trägt dich – und welche schränkt dich ein?" },
  { key:["Verbindung","Wahl","Werte"],
    up:"Eine bedeutsame Verbindung oder Entscheidung, die auf deinen tiefsten Werten beruht. Nutze den Moment, um eine Entscheidung wirklich bewusst zu treffen, statt sie länger vor dir herzuschieben.",
    rev:"Disharmonie, eine Entscheidung wird vermieden oder Werte geraten in Konflikt. Schreibe konkret auf, welche zwei Werte gerade gegeneinander stehen – das macht die Entscheidung oft klarer als reines Grübeln.",
    advice:"Welche Entscheidung steht an, bei der du deinen wahren Werten treu bleiben musst?" },
  { key:["Antrieb","Wille","Richtung"],
    up:"Entschlossener Vorwärtsdrang. Gegensätzliche Kräfte werden durch klaren Willen in eine Richtung gelenkt. Setze dir jetzt ein konkretes, terminiertes Ziel – die Energie dafür ist vorhanden, sie braucht nur eine Richtung.",
    rev:"Kontrollverlust, Richtungslosigkeit oder Aggression statt zielgerichteter Energie. Bevor du weiter Gas gibst, halte kurz inne und kläre, wohin die Reise überhaupt gehen soll – sonst verpufft die Kraft ungenutzt.",
    advice:"Welche gegensätzlichen Kräfte in dir müssen sich für dein Ziel verbünden?" },
  { key:["Sanftmut","innere Stärke","Mut"],
    up:"Wahre Stärke zeigt sich in Sanftmut und Geduld, nicht in roher Gewalt. Du meisterst etwas mit innerer Ruhe. Begegne einer schwierigen Situation bewusst weich statt konfrontativ – das ist hier die wirksamere Kraft.",
    rev:"Selbstzweifel, Kontrollverlust über eigene Impulse oder ungezügelte Kraft. Bevor du reagierst, atme bewusst durch – ein impulsiver erster Reflex ist gerade selten der beste Ratgeber.",
    advice:"Wo hilft dir gerade Geduld mehr als Druck?" },
  { key:["Rückzug","Suche","Weisheit"],
    up:"Bewusster Rückzug, um innerlich klarer zu sehen. Zeit für Reflexion, nicht für Aktion. Plane dir aktiv eine Auszeit ein, und triff wichtige Entscheidungen erst danach, nicht mitten im Trubel.",
    rev:"Isolation aus Angst statt aus Wahl, oder Rückzug wird zur Flucht vor der Welt. Prüfe ehrlich, ob dein Rückzug dir gerade guttut oder ob er dich von Menschen fernhält, die du eigentlich brauchst.",
    advice:"Wovon brauchst du gerade wirklich Abstand, um klarer zu sehen?" },
  { key:["Wandel","Zyklen","Schicksal"],
    up:"Das Leben bewegt sich in Zyklen. Ein Wendepunkt zeigt sich – nutze den Schwung des Wandels. Statt gegen die aktuelle Entwicklung anzukämpfen, richte deine nächsten Schritte bewusst an ihr aus.",
    rev:"Widerstand gegen unvermeidlichen Wandel oder das Gefühl, dem Schicksal ausgeliefert zu sein. Suche dir konkret einen kleinen Bereich, in dem du selbst wieder aktiv gestalten kannst, statt nur zu reagieren.",
    advice:"Welcher Zyklus in deinem Leben schließt sich gerade – und welcher beginnt?" },
  { key:["Ausgleich","Wahrheit","Konsequenz"],
    up:"Ausgleich zwischen Ursache und Wirkung. Ehrlichkeit und faire Entscheidungen bringen Klarheit. Triff die anstehende Entscheidung nach klaren, fairen Kriterien statt nach Bauchgefühl allein.",
    rev:"Unfairness, verzerrte Sichtweise oder das Ausweichen vor einer nötigen Wahrheit. Frage dich konkret, welche unbequeme Wahrheit du gerade lieber nicht aussprichst – und ob das auf Dauer wirklich fairer ist.",
    advice:"Wo musst du gerade ehrlicher mit dir selbst sein, um fair zu bleiben?" },
  { key:["Perspektivwechsel","Loslassen","Geduld"],
    up:"Eine andere Perspektive einnehmen, auch wenn es unbequem ist. Aus dem Innehalten wächst neue Einsicht. Versuche bewusst, eine festgefahrene Situation für einen Moment aus der Sicht der anderen Seite zu betrachten.",
    rev:"Widerstand gegen nötiges Loslassen, Opferrolle oder Stillstand aus Angst. Prüfe, ob du dich gerade in einer Lage festhältst, die du eigentlich schon längst hinter dir lassen könntest.",
    advice:"Welche Situation sieht anders aus, wenn du sie einmal umgekehrt betrachtest?" },
  { key:["Wandlung","Ende","Übergang"],
    up:"Ein Kapitel endet, damit ein anderes beginnen kann. Wandlung ist unausweichlich und notwendig. Statt dich an das Alte zu klammern, unterstütze den Übergang aktiv – Widerstand macht ihn nur schmerzhafter.",
    rev:"Widerstand gegen Veränderung, Stagnation oder Angst vor einem längst fälligen Ende. Benenne konkret, was in deinem Leben eigentlich schon vorbei ist, auch wenn du es formal noch nicht beendet hast.",
    advice:"Was in deinem Leben ist bereits zu Ende – auch wenn du es noch nicht losgelassen hast?" },
  { key:["Balance","Geduld","Heilung"],
    up:"Geduldiges Zusammenführen gegensätzlicher Kräfte. Maß und Mitte statt Extreme. Suche aktiv einen Mittelweg zwischen zwei Polen, die dich gerade beschäftigen, statt dich für ein Extrem zu entscheiden.",
    rev:"Ungleichgewicht, Ungeduld oder das Vermischen von Dingen, die nicht zusammengehören. Prüfe, wo du gerade zu viel auf einmal willst – oft hilft es, bewusst eine Sache wieder wegzulassen.",
    advice:"Welche zwei Bereiche deines Lebens brauchen gerade mehr Balance?" },
  { key:["Bindung","Versuchung","Schatten"],
    up:"Erkenne, was dich wirklich bindet – Gewohnheiten, Ängste oder Abhängigkeiten. Bewusstheit ist der erste Schritt zur Freiheit. Benenne die Bindung konkret beim Namen, statt sie zu verdrängen – das allein verändert bereits etwas.",
    rev:"Befreiung aus einer Bindung oder das Erkennen eigener Muster, die dich klein halten. Nutze den Moment, um einen konkreten, kleinen Schritt aus einer alten Gewohnheit heraus zu gehen.",
    advice:"Welche Kette hältst du selbst fest, obwohl du sie lösen könntest?" },
  { key:["Umbruch","Erkenntnis","Befreiung"],
    up:"Ein plötzlicher Umbruch reißt alte, nicht mehr tragfähige Strukturen ein – schmerzhaft, aber befreiend. Nimm eine anstehende Erschütterung eher als Klärung denn als reine Katastrophe – danach steht vieles klarer da.",
    rev:"Aufgeschobene Krise oder die Angst vor dem nötigen Zusammenbruch alter Muster. Prüfe, ob du eine überfällige Veränderung gerade künstlich hinauszögerst – das macht sie meist nur größer.",
    advice:"Welche alte Struktur in dir hält nur noch aus Gewohnheit?" },
  { key:["Hoffnung","Vertrauen","Klarheit"],
    up:"Nach dem Sturm kommt Klarheit. Hoffnung, Inspiration und ein ruhiger Blick nach vorn. Nutze diese ruhigere Phase konkret, um wieder eine Richtung oder ein Ziel für dich zu formulieren.",
    rev:"Verlust von Hoffnung, Entmutigung oder das Gefühl, den eigenen Stern aus den Augen verloren zu haben. Suche dir bewusst eine kleine, machbare Sache, die dir wieder Zuversicht gibt, statt auf das große Ganze zu schauen.",
    advice:"Welcher Funke Hoffnung trägt dich gerade, auch wenn er klein ist?" },
  { key:["Unbewusstes","Illusion","Intuition"],
    up:"Die Ebene des Unbewussten, der Träume und Ängste. Nicht alles ist so klar, wie es scheint – vertraue der Intuition, treffe aber keine großen Entscheidungen rein aus dem Bauch heraus, ohne sie später noch einmal zu prüfen.",
    rev:"Verwirrung, Selbsttäuschung oder verdrängte Ängste, die ans Licht wollen. Hol dir bei einer wichtigen Sache eine nüchterne zweite Meinung von außen – deine eigene Sicht ist gerade getrübt.",
    advice:"Welche Angst oder Illusion beeinflusst dich, ohne dass du es bewusst merkst?" },
  { key:["Freude","Klarheit","Erfolg"],
    up:"Klarheit, Lebensfreude und Erfolg. Etwas gelingt sichtbar und mit Leichtigkeit. Zeig dich mit dem, was gerade gut läuft, ruhig offen – das ist ein guter Moment für Sichtbarkeit und für neue Vorhaben.",
    rev:"Vorübergehende Rückschläge oder übertriebener Optimismus, der die Realität ausblendet. Prüfe konkret, ob du eine Sache gerade schönredest, die eigentlich mehr Aufmerksamkeit bräuchte.",
    advice:"Wofür darfst du dich gerade einfach nur freuen?" },
  { key:["Bilanz","Erwachen","Ruf"],
    up:"Ein innerer Ruf, Bilanz zu ziehen und einem tieferen Lebenssinn zu folgen. Erwachen aus alten Rollen. Nimm dir bewusst Zeit für eine ehrliche Standortbestimmung, statt einfach im gewohnten Trott weiterzumachen.",
    rev:"Selbstkritik, Zweifel am eigenen Wert oder das Ignorieren eines inneren Rufs. Sprich mit jemandem, dem du vertraust, über das, was dich innerlich ruft – allein bleibt es leicht nur ein diffuses Gefühl.",
    advice:"Welchem inneren Ruf weichst du gerade noch aus?" },
  { key:["Vollendung","Integration","Erfüllung"],
    up:"Ein Zyklus vollendet sich stimmig. Integration aller Erfahrungen, Erfüllung und ein neuer, größerer Kreis beginnt. Erlaube dir bewusst, ein abgeschlossenes Kapitel auch wirklich als abgeschlossen zu feiern, bevor du zum nächsten übergehst.",
    rev:"Unvollständigkeit, das Gefühl, nie ganz anzukommen, oder ein Abschluss, der sich erzwungen anfühlt. Prüfe, welcher konkrete letzte Schritt noch fehlt, damit sich eine Sache für dich wirklich rund anfühlt.",
    advice:"Was fühlt sich in deinem Leben gerade rund und vollständig an?" }
];

const RANKS = [
  {n:1, label:"Ass"}, {n:2, label:"Zwei"}, {n:3, label:"Drei"}, {n:4, label:"Vier"},
  {n:5, label:"Fünf"}, {n:6, label:"Sechs"}, {n:7, label:"Sieben"}, {n:8, label:"Acht"},
  {n:9, label:"Neun"}, {n:10, label:"Zehn"}, {n:11, label:"Bube"}, {n:12, label:"Ritter"},
  {n:13, label:"Dame"}, {n:14, label:"König"}
];

// Grund-Deutungsraster je Rang (wird unten pro Farbe mit einer konkreten Anwendung kombiniert)
const RANK_THEMES = {
  1:  { key:["Ursprung","Potenzial"], up:"Ein reiner, ungeformter Anfang – volles Potenzial, roh und unverbraucht.", rev:"Vertane Gelegenheit oder ein Anfang, der ins Stocken gerät, bevor er Form annimmt." },
  2:  { key:["Wahl","Balance"], up:"Eine Weggabelung oder ein Gleichgewicht, das bewusst gehalten werden will.", rev:"Unentschlossenheit oder ein Ungleichgewicht, das zur Last wird." },
  3:  { key:["Wachstum","Zusammenarbeit"], up:"Erste sichtbare Ergebnisse durch Zusammenwirken – etwas beginnt zu wachsen.", rev:"Verzögerung im Wachstum oder mangelnde Abstimmung mit anderen." },
  4:  { key:["Stabilität","Rast"], up:"Ein Moment der Stabilität, des Feierns oder des bewussten Innehaltens.", rev:"Erstarrung, ein Fest, das nicht stattfindet, oder Unruhe trotz äußerer Ruhe." },
  5:  { key:["Konflikt","Herausforderung"], up:"Reibung, Wettstreit oder eine Herausforderung, die Kraft kostet, aber auch schärft.", rev:"Ein Konflikt entschärft sich, oder unnötiger Streit hält dennoch an." },
  6:  { key:["Ausgleich","Fortschritt"], up:"Ein Weg aus der Krise, Unterstützung von außen oder ein spürbarer Fortschritt.", rev:"Rückschritt oder Hilfe, die ausbleibt, obwohl sie nötig wäre." },
  7:  { key:["Prüfung","Standhaftigkeit"], up:"Eine Bewährungsprobe – Durchhaltevermögen und Standpunkt werden auf die Probe gestellt.", rev:"Erschöpfung, Kapitulation zu früh oder Selbstsabotage." },
  8:  { key:["Bewegung","Wandel"], up:"Deutliche Bewegung, schnelle Entwicklung oder ein spürbarer Wandel.", rev:"Stillstand, blockierte Bewegung oder überstürztes Handeln." },
  9:  { key:["Nähe zum Ziel","innere Kraft"], up:"Fast am Ziel – innere Reserven und Widerstandskraft tragen dich fast bis ans Ende.", rev:"Erschöpfung kurz vor dem Ziel oder übervorsichtiges Zögern." },
  10: { key:["Vollendung","Last oder Lohn"], up:"Der Höhepunkt ist erreicht – als Last, die abzulegen ist, oder als voller Lohn.", rev:"Überforderung, ein Kreislauf, der sich unnötig wiederholt." },
  11: { key:["Lernen","Neugier"], up:"Ein neugieriger, lernbereiter Zugang – Anfängergeist und Entdeckerfreude.", rev:"Naivität, unüberlegtes Handeln oder Nachrichten, die missverstanden werden." },
  12: { key:["Handeln","Tempo"], up:"Aktives, zielstrebiges Vorgehen – Bewegung mit klarer Richtung.", rev:"Übereiltes oder rücksichtsloses Handeln, das am Ziel vorbeischießt." },
  13: { key:["Reife","Intuition"], up:"Gereifter, intuitiver Umgang mit der Situation – Fürsorge und innere Sicherheit.", rev:"Überemotionalität, Kontrolle durch Stimmungen oder verschlossene Fürsorge." },
  14: { key:["Meisterschaft","Verantwortung"], up:"Meisterhafte, verantwortungsvolle Beherrschung der Lage nach außen.", rev:"Machtmissbrauch, Kontrollzwang oder ungenutzte Meisterschaft." }
};

// Element-spezifische Anwendung, wird an das Rang-Grundthema angehängt – macht jede der 56 Kleine-Arkana-Karten inhaltlich eigenständig
const SUIT_APPLICATION = {
  staebe: {
    domain: "in Projekten, im Beruf und beim persönlichen Antrieb",
    tipUp: "Konkret heißt das: Setze die Energie jetzt in einen aktiven Schritt um – ein Projekt, eine Initiative, ein mutiges Vorhaben.",
    tipRev: "Bevor du weitermachst, prüfe ehrlich, wofür du gerade wirklich brennst – sonst verpufft die Kraft im Aktionismus."
  },
  kelche: {
    domain: "in Beziehungen, Gefühlen und der Verbindung zu anderen",
    tipUp: "Konkret heißt das: Lass dich in einer Beziehungsfrage von deiner Intuition leiten und sprich offen aus, was du fühlst.",
    tipRev: "Nimm dir bewusst Zeit, ein ungeklärtes Gefühl wirklich anzuschauen, statt es zu überspielen."
  },
  schwerter: {
    domain: "im Denken, in Gesprächen und bei Entscheidungen",
    tipUp: "Konkret heißt das: Sprich klar aus, was du bereits erkannt hast, statt es weiter für dich zu behalten.",
    tipRev: "Hinterfrage, ob ein aktueller Gedanke wirklich stimmt oder nur aus Sorge oder Erschöpfung entsteht."
  },
  muenzen: {
    domain: "im Alltag, bei Geld, Arbeit und im Körperlichen",
    tipUp: "Konkret heißt das: Setze einen greifbaren, praktischen Schritt um – hier zählt Handeln mehr als Nachdenken.",
    tipRev: "Achte auf Signale von Unsicherheit im Materiellen oder Körperlichen und nimm sie ernst, statt sie zu verdrängen."
  }
};

function buildMinorCards() {
  const cards = [];
  let idx = 22;
  Object.keys(SUITS).forEach(suitKey => {
    const suit = SUITS[suitKey];
    const app = SUIT_APPLICATION[suitKey];
    RANKS.forEach(r => {
      const theme = RANK_THEMES[r.n];
      cards.push({
        id: idx++,
        arcana: "minor",
        suit: suitKey,
        number: r.n,
        name: `${r.label} der ${suit.label}`,
        element: suit.element,
        keywords: theme.key,
        upright: `${theme.up} Das zeigt sich vor allem ${app.domain}. ${app.tipUp}`,
        reversed: `${theme.rev} Das betrifft vor allem den Bereich ${app.domain}. ${app.tipRev}`,
        advice: `Wo zeigt sich das Thema „${theme.key[0]}“ im Element ${suit.element} gerade in deinem Alltag?`,
        sig: { seed: idx * 7 + r.n * 3, suit: suitKey, rank: r.n }
      });
    });
  });
  return cards;
}

function buildMajorCards() {
  return MAJOR_NAMES.map((name, i) => ({
    id: i,
    arcana: "major",
    suit: null,
    number: i,
    name,
    element: "Geist",
    keywords: MAJOR_MEANINGS[i].key,
    upright: MAJOR_MEANINGS[i].up,
    reversed: MAJOR_MEANINGS[i].rev,
    advice: MAJOR_MEANINGS[i].advice,
    sig: { seed: i * 11 + 5, suit: "major", rank: i }
  }));
}

const CARDS = [...buildMajorCards(), ...buildMinorCards()];

function getCard(id) { return CARDS.find(c => c.id === id); }
