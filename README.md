# AEVARANNA – Das vollständige Tarot

Eine eigenständige Progressive-Web-App (PWA) mit dem vollständigen klassischen
78-Karten-Tarot: 22 Karten der Großen Arkana und 56 Karten der Kleinen Arkana
(Stäbe, Kelche, Schwerter, Münzen). Alle Kartenmotive sind eigens gestaltet,
in einer abstrakten „Konstellations- und Lichtlinien“-Bildsprache, ohne
optische Nähe zu bekannten historischen Tarot-Decks.

## Funktionen

- **Start:** Tägliche Impulskarte, Nutzungs-Serie, Lernfortschritt/Favoriten/Legungen im Überblick, meistgezogene Karten, Schnellzugriff auf alle Bereiche
- **Legen:** Tageskarte, Drei-Karten-Legung, Wochenlegung, Keltisches Kreuz (10 Karten)
  sowie frei definierbare eigene Legesysteme – mit optionaler eigener Frage,
  Misch-Animation, automatischer Kombinations-Deutung bei Mehrkarten-Legungen,
  Notizfeld und Export als Text (Teilen/Download). Es wird kein Verlauf
  vergangener Legungen gespeichert – jede Legung ist nur während der aktuellen
  Sitzung sichtbar.
- **Lexikon:** Alle 78 Karten durchsuchbar und filterbar, mit Bild,
  Schlüsselwörtern, Bedeutung aufrecht/umgekehrt, Favoriten-Markierung und
  Bild-Export/Teilen-Funktion pro Karte
- **Lernen:** Drei Übungsformen – Karteikarten, Namen-Quiz, Element-Quiz –
  mit Spaced Repetition (unsichere Karten kommen häufiger dran)
- **Anleitung:** Ausführliche Einführung in Tarot, die Legesysteme und die
  Bedienung der App
- **Erfolge:** 6 freischaltbare Achievements mit Konfetti-Animation
- **Einstellungen:** Drei Farbthemen (Mitternacht/Bernstein/Rosenquarz),
  Umkehr-Quote frei wählbar, haptisches Feedback und Klang ein/aus
- **Willkommens-Tour:** 4-Slide-Einführung beim ersten Start, jederzeit erneut aufrufbar
- **Weitere Programme** (über die Startseite erreichbar): Ja/Nein-Orakel
  (Pendel-Antwort), Mondphasen-Kalender (rein astronomisch berechnet),
  Wunsch-Board (Ziele/Wünsche festhalten und abhaken), Hexenbrett
  (buchstabierte Antworten), Numerologie-Rechner (Lebens- und Namenszahl,
  ohne Speicherung von Geburtsdatum/Name) und Horoskop (täglicher
  Sternzeichen-Impuls) – alle komplett offline, ohne externe Quellen
- **Datensicherung:** Export/Import aller lokalen Daten als JSON-Datei
- Update-Hinweis-Banner bei neuer Version
- Vollständig offline nutzbar nach dem ersten Laden (Service Worker)
- Installierbar auf dem Homescreen unter iOS und Android
- Keine externen Abhängigkeiten, kein Tracking, keine Cookies
- Alle Nutzerdaten (Favoriten, Lernfortschritt, eigene Legesysteme, anonyme
  Nutzungszähler) verbleiben ausschließlich lokal auf dem Gerät (localStorage),
  exportierbar als Backup. Es wird kein Verlauf einzelner vergangener
  Legungen gespeichert.

## Technik

Reines HTML/CSS/JavaScript (keine Frameworks, kein Build-Schritt nötig).
Die Kartenmotive werden als SVG zur Laufzeit generiert (`art.js`), die
Kartendaten liegen strukturiert in `cards.js`.

## Veröffentlichung über GitHub Pages

1. Neues (oder bestehendes) Repository auf GitHub anlegen, z. B. `aevaranna`.
2. Alle Dateien aus diesem Ordner in das Repository hochladen (Root-Ebene,
   kein umschließender Unterordner).
3. Im Repository unter **Settings → Pages**:
   - „Source“ auf **Deploy from a branch** stellen
   - Branch: `main`, Ordner: `/ (root)`
   - Speichern
4. Nach kurzer Zeit ist die App erreichbar unter:
   `https://<dein-github-benutzername>.github.io/aevaranna/`
5. Link an Freunde/Kollegen weitergeben. Auf dem iPhone über Safari →
   Teilen → „Zum Home-Bildschirm“, auf Android über Chrome → Menü →
   „App installieren“ zur eigenständigen App machen.

## Aktualisieren

Nach jeder Änderung an den Dateien im Repository baut GitHub Pages die Seite
automatisch neu. Ein Neuladen der App im Browser (ggf. Cache leeren) zeigt
den aktuellen Stand; dank Service Worker wird die neue Version im
Hintergrund geladen und beim nächsten Start aktiv.

## Rechtliches

Siehe `impressum.html`, `datenschutz.html` und `lizenz.html` in der App
(Tab „Mehr“).
