// Browser UI: wires the template registry to a live SVG preview + download.
import { TEMPLATES, getTemplate, defaults } from './templates.js';
import { toSVG } from './svg.js';

// Cricut Maker mat sizes (LightGrip/StandardGrip), usable area in mm.
const MAT_12 = 304.8;   // 12" x 12"
const MAT_24 = 609.6;   // 12" x 24"

const els = {
  template: document.getElementById('template'),
  templateDesc: document.getElementById('template-desc'),
  unit: document.getElementById('unit'),
  params: document.getElementById('params'),
  preview: document.getElementById('preview'),
  info: document.getElementById('info'),
  download: document.getElementById('download'),
  reset: document.getElementById('reset'),
};

let current = TEMPLATES[0];
let values = defaults(current);

// --- Template dropdown -----------------------------------------------------
for (const t of TEMPLATES) {
  const opt = document.createElement('option');
  opt.value = t.id;
  opt.textContent = t.name;
  els.template.appendChild(opt);
}

function buildParamInputs() {
  els.params.innerHTML = '';
  for (const p of current.params) {
    const label = document.createElement('label');
    label.className = 'field';
    const span = document.createElement('span');
    span.textContent = unitLabel(p.label);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(p.min);
    input.max = String(p.max);
    input.step = String(p.step);
    input.value = String(values[p.key]);
    input.dataset.key = p.key;
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      if (Number.isFinite(v)) {
        values[p.key] = v;
        render();
      }
    });
    label.append(span, input);
    els.params.appendChild(label);
  }
}

function unitLabel(label) {
  const u = els.unit.value;
  return `${label} (${u})`;
}

// --- Render ----------------------------------------------------------------
function render() {
  const unit = els.unit.value;
  let result;
  try {
    result = toSVG(current.generate(values), { unit });
  } catch (e) {
    els.preview.innerHTML = `<p style="color:#b91c1c">Ungültige Werte: ${e.message}</p>`;
    return;
  }
  els.preview.innerHTML = result.svg;
  els.download.dataset.svg = result.svg;
  updateInfo(result.sheetWidthMM, result.sheetHeightMM, unit);
}

function fmtLen(mm, unit) {
  return unit === 'in'
    ? `${(mm / 25.4).toFixed(2)} in`
    : `${mm.toFixed(1)} mm`;
}

function updateInfo(wMM, hMM, unit) {
  const w = fmtLen(wMM, unit);
  const h = fmtLen(hMM, unit);
  let warn = '';
  const longSide = Math.max(wMM, hMM);
  const shortSide = Math.min(wMM, hMM);
  if (shortSide > MAT_12) {
    warn = `<div class="warn">⚠ Die Vorlage ist größer als jede Cricut-Schneidematte
      (max. 12″ = ${MAT_12.toFixed(0)} mm breit). Bitte Maße verkleinern.</div>`;
  } else if (longSide > MAT_24) {
    warn = `<div class="warn">⚠ Länger als die 12″×24″-Matte (${MAT_24.toFixed(0)} mm).
      Bitte Maße verkleinern.</div>`;
  } else if (longSide > MAT_12) {
    warn = `<div class="warn">ℹ Passt nicht auf die 12″×12″-Matte – nutze die
      <strong>12″×24″</strong>-Matte.</div>`;
  }
  els.info.innerHTML =
    `Benötigtes Material (inkl. Rand):<br>
     <span class="dim">${w} × ${h}</span>${warn}`;
}

function downloadSVG() {
  const svg = els.download.dataset.svg;
  if (!svg) return;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paper-box-${current.id}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Events ----------------------------------------------------------------
els.template.addEventListener('change', () => {
  current = getTemplate(els.template.value);
  values = defaults(current);
  els.templateDesc.textContent = current.description;
  buildParamInputs();
  render();
});

els.unit.addEventListener('change', () => {
  // Re-label inputs and re-render (geometry is unit-agnostic mm internally).
  buildParamInputs();
  render();
});

els.reset.addEventListener('click', () => {
  values = defaults(current);
  buildParamInputs();
  render();
});

els.download.addEventListener('click', downloadSVG);

// --- Init ------------------------------------------------------------------
els.templateDesc.textContent = current.description;
buildParamInputs();
render();
