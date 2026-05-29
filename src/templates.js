// Parametric paper-box dieline generators.
//
// Each template exposes metadata (id, name, description, parameter specs) and a
// `generate(values)` function returning a Dieline in millimetres. All four are
// pure functions of their inputs so they can be unit-tested in Node.
//
// Conventions (millimetres, SVG y-axis points down):
//   - CUT lines  -> solid outline / free edges
//   - FOLD lines -> creases that get scored, never fully cut

import { Dieline } from './geometry.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------------------
// 1. Tray (one-piece open box with corner glue tabs)
// ---------------------------------------------------------------------------
// Cross/plus layout: base in the centre, four walls fold up. The left/right
// walls carry small trapezoidal tabs that wrap around and glue behind the
// front/back walls.
function drawTray(d, ox, oy, L, W, H, tab) {
  // Tab needs room: its top edge spans (H - 2*tab) along the wall depth.
  const t = clamp(tab, 1, H / 2 - 0.5);

  // Base creases (folds between base and each wall).
  d.foldLine(ox, oy, ox + L, oy);
  d.foldLine(ox, oy + W, ox + L, oy + W);
  d.foldLine(ox, oy, ox, oy + W);
  d.foldLine(ox + L, oy, ox + L, oy + W);

  // North wall (free top + sides).
  d.cut().M(ox, oy).L(ox, oy - H).L(ox + L, oy - H).L(ox + L, oy);
  // South wall.
  d.cut().M(ox, oy + W).L(ox, oy + W + H).L(ox + L, oy + W + H).L(ox + L, oy + W);

  // West wall: outer edge + top/bottom glue tabs.
  d.cut().M(ox - H, oy).L(ox - H, oy + W);
  d.cut().M(ox - H, oy).L(ox - H + t, oy - t).L(ox - t, oy - t).L(ox, oy);
  d.foldLine(ox - H, oy, ox, oy);
  d.cut().M(ox - H, oy + W).L(ox - H + t, oy + W + t).L(ox - t, oy + W + t).L(ox, oy + W);
  d.foldLine(ox - H, oy + W, ox, oy + W);

  // East wall: mirrored.
  const ex = ox + L;
  d.cut().M(ex + H, oy).L(ex + H, oy + W);
  d.cut().M(ex, oy).L(ex + t, oy - t).L(ex + H - t, oy - t).L(ex + H, oy);
  d.foldLine(ex, oy, ex + H, oy);
  d.cut().M(ex, oy + W).L(ex + t, oy + W + t).L(ex + H - t, oy + W + t).L(ex + H, oy + W);
  d.foldLine(ex, oy + W, ex + H, oy + W);
}

function tray(v) {
  const d = new Dieline();
  drawTray(d, 0, 0, v.length, v.width, v.height, v.tab);
  return d;
}

// ---------------------------------------------------------------------------
// 2. Lid & Base (two trays: a base and a slightly larger lid)
// ---------------------------------------------------------------------------
function lidBase(v) {
  const d = new Dieline();
  const { length: L, width: W, height: H, thickness: th, clearance: cl } = v;
  const lidH = clamp(v.lidHeight, 3, H);
  // Lid wraps around the base: add material thickness on each side + clearance.
  const grow = 2 * th + cl;
  const Ll = L + grow;
  const Wl = W + grow;

  // Base tray on the left.
  drawTray(d, 0, 0, L, W, H, v.tab);
  // Lid tray on the right, offset clear of the base (account for both walls).
  const gap = 12;
  const lidOX = L + H + gap + lidH; // base east edge + gap + lid west wall depth
  drawTray(d, lidOX, 0, Ll, Wl, lidH, v.tab);
  return d;
}

// ---------------------------------------------------------------------------
// 3. Pillow box (two panels + glue flap, curved tuck ends)
// ---------------------------------------------------------------------------
function pillow(v) {
  const d = new Dieline();
  const W = v.width;      // panel width (front/back)
  const L = v.height;     // panel height (between the curved ends)
  const f = v.flap;       // how far the curved end flaps reach
  const g = v.glue;       // glue flap width
  const cs = clamp(v.curve, 0, f); // score-curve bulge

  const xA = 0, xB = W, xC = 2 * W;   // panel boundaries
  const xG = xC + g;                  // glue flap right edge
  const yTop = 0, yBot = L;
  const ch = clamp(g * 0.4, 0, L / 2 - 1); // glue-flap corner chamfer

  // Outline (single closed cut path), clockwise from top-left.
  const o = d.cut();
  o.M(xA, yTop);
  o.q(xB, yTop, f, -1);                 // top flap A bulges up
  o.q(xC, yTop, f, -1);                 // top flap B bulges up
  o.L(xG - ch, yTop).L(xG, yTop + ch);  // glue flap top corner
  o.L(xG, yBot - ch).L(xG - ch, yBot);  // glue flap bottom corner
  o.q(xB, yBot, f, -1);                 // bottom flap B bulges down
  o.q(xA, yBot, f, -1);                 // bottom flap A bulges down
  o.Z();                                // left (seam) edge

  // Vertical folds: panel A|B and panel B|glue flap.
  d.foldLine(xB, yTop, xB, yBot);
  d.foldLine(xC, yTop, xC, yBot);

  // Curved score lines where the flaps fold in.
  d.fold().M(xA, yTop).q(xB, yTop, cs, -1);
  d.fold().M(xB, yTop).q(xC, yTop, cs, -1);
  d.fold().M(xA, yBot).q(xB, yBot, cs, -1);
  d.fold().M(xB, yBot).q(xC, yBot, cs, -1);

  return d;
}

// ---------------------------------------------------------------------------
// 4. Tuck-top carton (reverse tuck end box)
// ---------------------------------------------------------------------------
// Panels left->right: [glue tab][back L][side W][front L][side W].
// Top: tuck flap on the back, dust flaps on the sides, open front edge.
// Bottom: mirrored (tuck flap on the front).
function tuck(v) {
  const d = new Dieline();
  const { length: L, width: W, height: H } = v;
  const gt = v.glue;
  const tf = v.tuck;
  const df = v.dust;

  const tc = clamp(tf * 0.35, 0, L / 2 - 1);  // tuck-flap corner
  const da = clamp(df * 0.6, 0, W / 2 - 1);   // dust-flap taper
  const ch = clamp(gt * 0.5, 0, H / 2 - 1);   // glue-tab chamfer

  const x1 = gt;                 // glue tab | back
  const x2 = gt + L;             // back | side1
  const x3 = gt + L + W;         // side1 | front
  const x4 = gt + L + W + L;     // front | side2
  const x5 = gt + 2 * L + 2 * W; // right edge

  // Glue tab (chamfered left corners).
  d.cut().M(x1, 0).L(ch, 0).L(0, ch).L(0, H - ch).L(ch, H).L(x1, H);

  // Vertical body folds.
  d.foldLine(x1, 0, x1, H);
  d.foldLine(x2, 0, x2, H);
  d.foldLine(x3, 0, x3, H);
  d.foldLine(x4, 0, x4, H);

  // Right body edge.
  d.cut().M(x5, 0).L(x5, H);

  // --- TOP ---
  // Back: tuck flap.
  d.cut().M(x1, 0).L(x1, -tf + tc).L(x1 + tc, -tf).L(x2 - tc, -tf).L(x2, -tf + tc).L(x2, 0);
  d.foldLine(x1, 0, x2, 0);
  // Side1: dust flap.
  d.cut().M(x2, 0).L(x2 + da, -df).L(x3 - da, -df).L(x3, 0);
  d.foldLine(x2, 0, x3, 0);
  // Front: open edge.
  d.cut().M(x3, 0).L(x4, 0);
  // Side2: dust flap.
  d.cut().M(x4, 0).L(x4 + da, -df).L(x5 - da, -df).L(x5, 0);
  d.foldLine(x4, 0, x5, 0);

  // --- BOTTOM ---
  // Back: open edge.
  d.cut().M(x1, H).L(x2, H);
  // Side1: dust flap.
  d.cut().M(x2, H).L(x2 + da, H + df).L(x3 - da, H + df).L(x3, H);
  d.foldLine(x2, H, x3, H);
  // Front: tuck flap.
  d.cut().M(x3, H).L(x3, H + tf - tc).L(x3 + tc, H + tf).L(x4 - tc, H + tf).L(x4, H + tf - tc).L(x4, H);
  d.foldLine(x3, H, x4, H);
  // Side2: dust flap.
  d.cut().M(x4, H).L(x4 + da, H + df).L(x5 - da, H + df).L(x5, H);
  d.foldLine(x4, H, x5, H);

  return d;
}

// ---------------------------------------------------------------------------
// 5. Knickschachtel (origami pinch-corner tray) — GLUE-FREE
// ---------------------------------------------------------------------------
// One flat sheet, no corner cuts. The four walls fold up; the corner squares
// pinch shut along a diagonal score; a hem on the long walls folds back down
// and clamps the pinched corners in place. Holds purely by folding — no glue,
// no slots.
function pinchTray(v) {
  const d = new Dieline();
  const { length: L, width: W, height: H } = v;
  const hem = clamp(v.hem, 3, H - 1);

  // Outer silhouette (single cut). N/S walls carry a protruding hem.
  d.cut()
    .M(-H, -H)
    .L(0, -H).L(0, -H - hem).L(L, -H - hem).L(L, -H)     // north hem
    .L(L + H, -H)
    .L(L + H, W + H)
    .L(L, W + H).L(L, W + H + hem).L(0, W + H + hem).L(0, W + H) // south hem
    .L(-H, W + H)
    .Z();

  // Base creases (also the wall fold lines).
  d.foldLine(0, 0, L, 0);
  d.foldLine(L, 0, L, W);
  d.foldLine(0, W, L, W);
  d.foldLine(0, 0, 0, W);

  // Corner diagonals (the pinch folds).
  d.foldLine(0, 0, -H, -H);
  d.foldLine(L, 0, L + H, -H);
  d.foldLine(0, W, -H, W + H);
  d.foldLine(L, W, L + H, W + H);

  // Hem fold lines (fold back over the pinched corners).
  d.foldLine(0, -H, L, -H);
  d.foldLine(0, W + H, L, W + H);

  return d;
}

// ---------------------------------------------------------------------------
// 6. Steck-Schale (corner-tab tray) — GLUE-FREE
// ---------------------------------------------------------------------------
// Tray whose end walls carry tapered corner tabs. The tabs wrap around the
// corner and tuck behind the side walls, holding the tray closed without glue.
function lockTray(v) {
  const d = new Dieline();
  const { length: L, width: W, height: H } = v;
  const ft = clamp(v.tab, 4, H); // corner-tab depth
  const tp = clamp(ft * 0.3, 1, ft - 0.5); // corner taper

  // Base creases.
  d.foldLine(0, 0, L, 0);
  d.foldLine(L, 0, L, W);
  d.foldLine(0, W, L, W);
  d.foldLine(0, 0, 0, W);

  // Side walls (free top/bottom edges, outer edge).
  d.cut().M(0, 0).L(-H, 0).L(-H, W).L(0, W);
  d.cut().M(L, 0).L(L + H, 0).L(L + H, W).L(L, W);

  // North wall + two wrap tabs (open polyline; the base edge stays a fold).
  d.cut()
    .M(0, 0)
    .L(-ft, 0)                       // cut: frees tab from west wall
    .L(-ft, -H + tp).L(-ft + tp, -H) // tapered left tab
    .L(L + ft - tp, -H).L(L + ft, -H + tp) // top edge + tapered right tab
    .L(L + ft, 0)
    .L(L, 0);                        // cut: frees tab from east wall
  d.foldLine(0, 0, 0, -H);           // left tab crease
  d.foldLine(L, 0, L, -H);           // right tab crease

  // South wall + two wrap tabs (mirrored).
  d.cut()
    .M(0, W)
    .L(-ft, W)
    .L(-ft, W + H - tp).L(-ft + tp, W + H)
    .L(L + ft - tp, W + H).L(L + ft, W + H - tp)
    .L(L + ft, W)
    .L(L, W);
  d.foldLine(0, W, 0, W + H);
  d.foldLine(L, W, L, W + H);

  return d;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
// Parameter spec: { key, label, default, min, max, step }
export const TEMPLATES = [
  {
    id: 'tray',
    name: 'Faltschale (Tray)',
    description:
      'Einteilige offene Schachtel. Boden in der Mitte, vier Wände klappen hoch; ' +
      'die Seitenwände tragen Klebelaschen für die Ecken.',
    generate: tray,
    params: [
      { key: 'length', label: 'Länge', default: 80, min: 20, max: 280, step: 1 },
      { key: 'width', label: 'Breite', default: 60, min: 20, max: 280, step: 1 },
      { key: 'height', label: 'Höhe', default: 40, min: 10, max: 150, step: 1 },
      { key: 'tab', label: 'Laschengröße', default: 12, min: 4, max: 40, step: 1 },
    ],
  },
  {
    id: 'lidbase',
    name: 'Deckel & Boden',
    description:
      'Zwei Schalen: ein Boden und ein passender Deckel. Der Deckel wird um ' +
      'Materialstärke + Spiel größer berechnet, damit er sauber sitzt.',
    generate: lidBase,
    params: [
      { key: 'length', label: 'Länge (Boden)', default: 80, min: 20, max: 200, step: 1 },
      { key: 'width', label: 'Breite (Boden)', default: 60, min: 20, max: 200, step: 1 },
      { key: 'height', label: 'Höhe (Boden)', default: 50, min: 15, max: 150, step: 1 },
      { key: 'lidHeight', label: 'Höhe (Deckel)', default: 20, min: 5, max: 100, step: 1 },
      { key: 'tab', label: 'Laschengröße', default: 12, min: 4, max: 40, step: 1 },
      { key: 'thickness', label: 'Materialstärke', default: 1.5, min: 0, max: 5, step: 0.1 },
      { key: 'clearance', label: 'Spiel', default: 0.5, min: 0, max: 3, step: 0.1 },
    ],
  },
  {
    id: 'pillow',
    name: 'Pillow-Box',
    description:
      'Geschwungene Kissen-Schachtel aus zwei Panels mit Klebelasche. Die ' +
      'gebogenen Falzlinien erzeugen die typische Kissenform.',
    generate: pillow,
    params: [
      { key: 'width', label: 'Panelbreite', default: 80, min: 30, max: 200, step: 1 },
      { key: 'height', label: 'Panelhöhe', default: 110, min: 40, max: 280, step: 1 },
      { key: 'flap', label: 'Bogen-Tiefe', default: 25, min: 8, max: 80, step: 1 },
      { key: 'curve', label: 'Falz-Wölbung', default: 12, min: 0, max: 60, step: 1 },
      { key: 'glue', label: 'Klebelasche', default: 12, min: 5, max: 30, step: 1 },
    ],
  },
  {
    id: 'tuck',
    name: 'Tuck-Top-Karton',
    description:
      'Klassische Faltschachtel (Reverse Tuck End) mit Klebelasche, ' +
      'Stecklaschen oben/unten und Staubklappen an den Seiten.',
    generate: tuck,
    params: [
      { key: 'length', label: 'Länge (Front)', default: 60, min: 20, max: 200, step: 1 },
      { key: 'width', label: 'Tiefe (Seite)', default: 30, min: 15, max: 150, step: 1 },
      { key: 'height', label: 'Höhe', default: 90, min: 20, max: 250, step: 1 },
      { key: 'tuck', label: 'Stecklasche', default: 22, min: 8, max: 60, step: 1 },
      { key: 'dust', label: 'Staubklappe', default: 18, min: 6, max: 60, step: 1 },
      { key: 'glue', label: 'Klebelasche', default: 12, min: 6, max: 30, step: 1 },
    ],
  },
  {
    id: 'pinch',
    name: 'Knickschachtel (ohne Kleber)',
    description:
      'Origami-Schale aus einem Stück – ganz ohne Kleber. Die Wände klappen ' +
      'hoch, die Ecken knicken diagonal ein, der umgeschlagene Rand klemmt sie ' +
      'fest. Nur Außenkontur schneiden, der Rest wird gefalzt.',
    glueFree: true,
    generate: pinchTray,
    params: [
      { key: 'length', label: 'Länge', default: 90, min: 30, max: 240, step: 1 },
      { key: 'width', label: 'Breite', default: 70, min: 30, max: 240, step: 1 },
      { key: 'height', label: 'Höhe', default: 35, min: 12, max: 100, step: 1 },
      { key: 'hem', label: 'Klemmrand', default: 15, min: 5, max: 60, step: 1 },
    ],
  },
  {
    id: 'locktray',
    name: 'Steck-Schale (ohne Kleber)',
    description:
      'Schale mit Ecklaschen, die um die Ecke greifen und sich hinter die ' +
      'Seitenwände stecken – hält ohne Kleber. Für festen Karton; bei Bedarf ' +
      'die Laschentiefe an dein Papier anpassen.',
    glueFree: true,
    generate: lockTray,
    params: [
      { key: 'length', label: 'Länge', default: 90, min: 30, max: 240, step: 1 },
      { key: 'width', label: 'Breite', default: 70, min: 30, max: 240, step: 1 },
      { key: 'height', label: 'Höhe', default: 40, min: 12, max: 120, step: 1 },
      { key: 'tab', label: 'Laschentiefe', default: 25, min: 6, max: 80, step: 1 },
    ],
  },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id);
}

/** Default values object for a template. */
export function defaults(tmpl) {
  return Object.fromEntries(tmpl.params.map((p) => [p.key, p.default]));
}
