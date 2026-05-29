// Turns a Dieline into a Cricut-ready SVG string.
//
// Cricut Design Space imports SVG and groups paths into layers by colour.
// We emit two layers:
//   - "cut"   : solid black  (#000000) -> set operation to "Cut"
//   - "score" : dashed blue  (#1565ff) -> set operation to "Score"
//
// Geometry is authored in millimetres. The chosen display unit only changes
// the root width/height/viewBox; a single transform maps mm -> user units so
// stroke widths and dash patterns stay physically correct in both units.

import { fmt } from './geometry.js';

const MM_PER_IN = 25.4;
export const CUT_COLOR = '#000000';
export const SCORE_COLOR = '#1565ff';

/**
 * @param {Dieline} dieline
 * @param {{unit?: 'mm'|'in', margin?: number}} [opts] margin is in mm
 * @returns {{svg: string, sheetWidthMM: number, sheetHeightMM: number}}
 */
export function toSVG(dieline, opts = {}) {
  const { unit = 'mm', margin = 5 } = opts;
  if (dieline.bbox.empty) throw new Error('Empty dieline: nothing to render');

  const factor = unit === 'in' ? 1 / MM_PER_IN : 1;
  const b = dieline.bbox;
  // Shift so the artwork starts at (margin, margin) in mm-space.
  const dx = -b.minX + margin;
  const dy = -b.minY + margin;
  const sheetWidthMM = b.width + 2 * margin;
  const sheetHeightMM = b.height + 2 * margin;
  const vbW = sheetWidthMM * factor;
  const vbH = sheetHeightMM * factor;

  const join = (paths) =>
    paths.map((p) => `<path d="${p.d.trim()}"/>`).join('');

  const svg =
`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${fmt(vbW)}${unit}" height="${fmt(vbH)}${unit}" viewBox="0 0 ${fmt(vbW)} ${fmt(vbH)}">
  <g transform="scale(${fmt(factor)}) translate(${fmt(dx)} ${fmt(dy)})" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g id="cut" stroke="${CUT_COLOR}" stroke-width="0.4">${join(dieline.cuts)}</g>
    <g id="score" stroke="${SCORE_COLOR}" stroke-width="0.4" stroke-dasharray="2.5 1.5">${join(dieline.folds)}</g>
  </g>
</svg>`;

  return { svg, sheetWidthMM, sheetHeightMM };
}
