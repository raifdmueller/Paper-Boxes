// Validation harness: generates every template at default + edge-case values,
// checks the produced SVG is well-formed XML, contains both layers, and has no
// non-finite coordinates. Run with: node test/validate.mjs
//
// Requires `xmllint` on PATH for the XML well-formedness check.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TEMPLATES, defaults } from '../src/templates.js';
import { toSVG } from '../src/svg.js';

let failures = 0;
const tmp = mkdtempSync(join(tmpdir(), 'box-'));

function check(label, cond) {
  if (!cond) {
    console.error(`  ✗ ${label}`);
    failures++;
  }
}

// A spread of value sets per template: defaults, all-min, all-max.
function valueSets(tmpl) {
  const d = defaults(tmpl);
  const min = Object.fromEntries(tmpl.params.map((p) => [p.key, p.min]));
  const max = Object.fromEntries(tmpl.params.map((p) => [p.key, p.max]));
  return { defaults: d, min, max };
}

for (const tmpl of TEMPLATES) {
  console.log(`\n${tmpl.name} (${tmpl.id})`);
  const sets = valueSets(tmpl);
  for (const [setName, values] of Object.entries(sets)) {
    for (const unit of ['mm', 'in']) {
      const label = `${setName}/${unit}`;
      let result;
      try {
        const dieline = tmpl.generate(values);
        result = toSVG(dieline, { unit });
      } catch (e) {
        check(`${label}: generate threw: ${e.message}`, false);
        continue;
      }
      const { svg, sheetWidthMM, sheetHeightMM } = result;

      // No NaN/Infinity leaked into the output.
      check(`${label}: no NaN/Infinity`, !/NaN|Infinity/.test(svg));
      // Both layers present.
      check(`${label}: has cut layer`, svg.includes('id="cut"'));
      check(`${label}: has score layer`, svg.includes('id="score"'));
      // Sensible sheet size.
      check(`${label}: positive sheet`, sheetWidthMM > 0 && sheetHeightMM > 0);

      // Well-formed XML via xmllint.
      const file = join(tmp, `${tmpl.id}-${setName}-${unit}.svg`);
      writeFileSync(file, svg);
      try {
        execFileSync('xmllint', ['--noout', file], { stdio: 'pipe' });
      } catch (e) {
        check(`${label}: xmllint valid (${e.stderr?.toString().trim()})`, false);
      }
    }
    // Report default sheet size once.
    if (setName === 'defaults') {
      const { sheetWidthMM, sheetHeightMM } = toSVG(tmpl.generate(values));
      console.log(
        `  default sheet: ${sheetWidthMM.toFixed(1)} x ${sheetHeightMM.toFixed(1)} mm`
      );
    }
  }
}

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll checks passed.');
