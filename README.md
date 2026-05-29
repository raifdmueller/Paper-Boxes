# 📦 Paper Boxes

Eine statische GitHub-Pages-Website, mit der du **parametrische SVG-Schnittvorlagen
für Papier-Faltschachteln** erzeugst – optimiert für den **Cricut Maker** (inkl.
Maker 4). Schnitt- und Falzlinien liegen auf getrennten Ebenen, sodass der Cricut
sauber schneidet **und** rillt.

➡️ **Live:** `https://raifdmueller.github.io/paper-boxes/` (nach dem ersten Deploy)

## Designs

| Design | Beschreibung |
| --- | --- |
| **Faltschale (Tray)** | Einteilige offene Schachtel mit hochklappbaren Wänden und Eck-Klebelaschen. |
| **Deckel & Boden** | Boden + passender Deckel; der Deckel wird um Materialstärke + Spiel größer berechnet. |
| **Pillow-Box** | Geschwungene Kissen-Schachtel mit gebogenen Falzlinien und Klebelasche. |
| **Tuck-Top-Karton** | Klassische Faltschachtel (Reverse Tuck End) mit Klebe-, Steck- und Staublaschen. |
| **Knickschachtel** 🔓 | **Ohne Kleber.** Origami-Schale aus einem Stück: Wände hoch, Ecken einknicken, umgeschlagener Rand klemmt sie fest. |
| **Steck-Schale** 🔓 | **Ohne Kleber.** Ecklaschen greifen um die Ecke und stecken hinter die Seitenwände. |

> 🔓 = klebefrei – hält allein durch Falten/Stecken. Bei klebefreien „Steck"-Designs
> lohnt sich ein Testschnitt: je nach Papierstärke ggf. Laschentiefe/Klemmrand anpassen.

Alle Maße (Länge/Breite/Höhe, Laschen, Materialstärke …) sind einstellbar, mit
Live-Vorschau und SVG-Download. Einheit wahlweise **mm oder Zoll**.

## Cricut-Workflow

1. SVG herunterladen und im **Cricut Design Space** über *Hochladen* importieren.
2. **Schwarze Ebene** → Operation **Schneiden (Cut)**.
3. **Blaue/gestrichelte Ebene** → Operation **Falzen/Rillen (Score)** (Rillrad oder Falzstift).
4. Beide Ebenen markieren → **Anbringen (Attach)**, damit die Falzlinien sitzen bleiben.
5. Karton ~200–300 g/m² wählen, Druck ggf. erhöhen.

Die SVGs tragen echte physikalische Maße (`mm`/`in`), der Cricut schneidet also 1:1.
Die App warnt, wenn eine Vorlage größer als die 12″×12″- bzw. 12″×24″-Matte wird.

## Projektstruktur

```
index.html             # UI
assets/styles.css      # Styles
src/geometry.js        # Bounding-Box + Pfad-Builder (mm)
src/svg.js             # Dieline -> Cricut-SVG (Cut-/Score-Ebenen, mm/in)
src/templates.js       # Die 4 parametrischen Box-Generatoren
src/app.js             # UI-Logik, Vorschau, Download
test/validate.mjs      # Validierung aller Templates (XML + Geometrie)
.github/workflows/     # Validierung + GitHub-Pages-Deploy
```

Reine statische Seite – **kein Build-Schritt**, nur native ES-Module.

## Lokal ausführen

```bash
# Beliebiger statischer Server (ES-Module brauchen http, nicht file://)
python3 -m http.server 8000
# -> http://localhost:8000
```

## Tests

```bash
node test/validate.mjs   # benötigt xmllint (libxml2-utils)
```
Prüft jedes Design (Standard-, Min- und Max-Werte, mm + Zoll) auf
wohlgeformtes XML, vorhandene Cut-/Score-Ebenen und endliche Koordinaten.

## Deployment

Push auf `main` löst den Workflow `.github/workflows/deploy.yml` aus: erst die
Validierung, dann der Deploy auf GitHub Pages.

> **Einmalige Einrichtung:** Repo → *Settings → Pages → Build and deployment →
> Source: **GitHub Actions***.
