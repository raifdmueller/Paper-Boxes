// Geometry helpers for paper-box dielines.
// All coordinates are in millimetres. The module is framework-free so it can
// be used both in the browser app and in the Node validation test.

/** Format a number for SVG output: round to 4 decimals, normalise -0 to 0. */
export function fmt(n) {
  if (!Number.isFinite(n)) throw new Error(`Non-finite coordinate: ${n}`);
  const r = Math.round(n * 1e4) / 1e4;
  return (r === 0 ? 0 : r).toString();
}

/** Axis-aligned bounding box that grows as points are added. */
export class BBox {
  constructor() {
    this.minX = Infinity;
    this.minY = Infinity;
    this.maxX = -Infinity;
    this.maxY = -Infinity;
  }
  add(x, y) {
    if (x < this.minX) this.minX = x;
    if (y < this.minY) this.minY = y;
    if (x > this.maxX) this.maxX = x;
    if (y > this.maxY) this.maxY = y;
  }
  get width() { return this.maxX - this.minX; }
  get height() { return this.maxY - this.minY; }
  get empty() { return !Number.isFinite(this.minX); }
}

/**
 * Builds an SVG path "d" string while feeding every touched point into a
 * shared bounding box. Supports straight lines and quadratic curves with an
 * apex offset (used for the pillow box).
 */
export class Path {
  constructor(bbox) {
    this.bbox = bbox;
    this.d = '';
    this.cx = 0;
    this.cy = 0;
  }
  M(x, y) {
    this.d += `M${fmt(x)} ${fmt(y)} `;
    this.bbox.add(x, y);
    this.cx = x; this.cy = y;
    return this;
  }
  L(x, y) {
    this.d += `L${fmt(x)} ${fmt(y)} `;
    this.bbox.add(x, y);
    this.cx = x; this.cy = y;
    return this;
  }
  /**
   * Quadratic curve from the current point to (x,y) whose midpoint bulges by
   * `apex` mm perpendicular to the chord. `dir` (+1/-1) selects the side.
   */
  q(x, y, apex, dir = 1) {
    const x0 = this.cx, y0 = this.cy;
    const dx = x - x0, dy = y - y0;
    const len = Math.hypot(dx, dy) || 1;
    // Unit perpendicular to the chord.
    const px = (-dy / len) * dir;
    const py = (dx / len) * dir;
    const mx = (x0 + x) / 2, my = (y0 + y) / 2;
    // Control point so the curve midpoint sits `apex` mm off the chord.
    const cxp = mx + px * 2 * apex;
    const cyp = my + py * 2 * apex;
    this.bbox.add(mx + px * apex, my + py * apex); // actual apex
    this.bbox.add(cxp, cyp); // control point (safe upper bound)
    this.d += `Q${fmt(cxp)} ${fmt(cyp)} ${fmt(x)} ${fmt(y)} `;
    this.cx = x; this.cy = y;
    return this;
  }
  Z() {
    this.d += 'Z ';
    return this;
  }
}

/**
 * A dieline = a set of CUT paths and SCORE/FOLD paths sharing one bounding box.
 * Cricut treats different colours as separate layers, so cut and score lines
 * are emitted into separate groups by svg.js.
 */
export class Dieline {
  constructor() {
    this.bbox = new BBox();
    this.cuts = [];
    this.folds = [];
  }
  cut() {
    const p = new Path(this.bbox);
    this.cuts.push(p);
    return p;
  }
  fold() {
    const p = new Path(this.bbox);
    this.folds.push(p);
    return p;
  }
  /** Convenience: a straight score/fold line. */
  foldLine(x1, y1, x2, y2) {
    this.fold().M(x1, y1).L(x2, y2);
    return this;
  }
}
