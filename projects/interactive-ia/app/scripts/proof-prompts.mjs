/**
 * Proof all assembled prompt templates: token/field parity, leftover
 * brackets in templates and guidance, and a few grammar smells.
 * Usage: node scripts/proof-prompts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const issues = [];
let promptCount = 0;

function note(sev, id, file, msg, excerpt = '') {
  issues.push({ sev, id, file, msg, excerpt: excerpt.slice(0, 160).replace(/\s+/g, ' ') });
}

/** Section headers that are intentional in RICE-style prompts */
const SECTION_HEADERS = new Set([
  'ROLE',
  'R - ROLE',
  'INSTRUCTIONS',
  'I - INSTRUCTIONS',
  'CONTEXT',
  'C - CONTEXT',
  'EXPECTED FORMAT',
  'E - EXPECTED FORMAT',
  'OUTPUT FORMAT',
  'CONSTRAINTS',
  'VALIDATION REQUIREMENTS',
]);

/** Bracket text that is instructional example, not a fillable slot */
function isInstructionalBracket(text) {
  if (SECTION_HEADERS.has(text.trim())) return true;
  if (/^LIKE_THIS$/i.test(text)) return true; // placeholder-naming example
  if (/^Content Type$/i.test(text)) return true; // format hint
  // Leading instructional verbs/phrases used as empty-field UI labels after assemble
  if (/^(Paste |Whole number|Brief |Existing |What |One |e\.g\.|Names of|Approximate|How |Technical|Describe|Your |The card|One group)/i.test(text)) {
    return true;
  }
  return false;
}

for (const ch of fs.readdirSync('chapters').filter((d) => /^ch\d+$/.test(d)).sort()) {
  for (const f of fs.readdirSync(path.join('chapters', ch)).filter((x) => /^chunk-/.test(x)).sort()) {
    const rel = path.join('chapters', ch, f).replace(/\\/g, '/');
    const html = fs.readFileSync(rel, 'utf8');
    const re =
      /<section class="prompt-fill" id="([^"]+)"[\s\S]*?<script type="text\/plain" class="js-prompt-template">([\s\S]*?)<\/script>([\s\S]*?)<\/section>/g;
    let m;
    while ((m = re.exec(html))) {
      promptCount += 1;
      const id = m[1];
      const tpl = m[2];
      const rest = m[3];
      const tokensInTpl = [...tpl.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((x) => x[1]);
      const uniqueTpl = [...new Set(tokensInTpl)];
      const fields = [...rest.matchAll(/data-token="([^"]+)"/g)].map((x) => x[1]);
      const uniqueFields = [...new Set(fields)];

      let assembled = tpl;
      for (const token of uniqueTpl) {
        const field = rest.match(new RegExp(`data-token="${token}"[\\s\\S]{0,400}?data-placeholder="([^"]*)"`));
        const label = field ? field[1].replace(/&quot;/g, '"').replace(/&#x27;/g, "'") : token;
        assembled = assembled.split(`{{${token}}}`).join(`[${label}]`);
      }

      for (const t of uniqueTpl) {
        if (!uniqueFields.includes(t)) note('high', id, rel, `Template uses {{${t}}} but no data-token field exists`);
      }
      for (const t of uniqueFields) {
        if (!uniqueTpl.includes(t)) note('med', id, rel, `Field data-token="${t}" never appears in template`);
      }

      const fieldLabels = new Set(
        [...rest.matchAll(/data-placeholder="([^"]*)"/g)].map((x) =>
          x[1].replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
        )
      );
      uniqueTpl.forEach((t) => fieldLabels.add(t));

      // Leftover brackets in the raw template (before assemble substitutes tokens)
      const rawBrackets = [...tpl.matchAll(/\[([^\]]{1,80})\]/g)].map((x) => x[1]);
      for (const b of rawBrackets) {
        if (isInstructionalBracket(b)) continue;
        if (/^R\b|^I\b|^C\b|^E\b/.test(b) && /ROLE|INSTRUCTIONS|CONTEXT|EXPECTED|OUTPUT/i.test(b)) continue;
        // Authoring leftovers: ALL_CAPS slots, DOMAIN, CHOOSE ONE, Include..., TODO
        if (
          /^[A-Z][A-Z0-9_ -]{2,}$/.test(b) ||
          /DOMAIN|TODO|TBD|FIXME|PLACEHOLDER|CHOOSE ONE|^Include /i.test(b)
        ) {
          note('high', id, rel, `Unresolved bracket placeholder [${b}] in template`, tpl);
        }
      }

      // Grammar: "Create a {{X}} verb" missing "that"
      if (/Create a \{\{[A-Z0-9_]+\}\} [a-z]+s\b/.test(tpl) && !/Create a \{\{[A-Z0-9_]+\}\} that /.test(tpl)) {
        note(
          'high',
          id,
          rel,
          'Possible ungrammatical "Create a {{TOKEN}} <verb>..." (missing "that")',
          tpl.match(/Create a \{\{[A-Z0-9_]+\}\}[^\n]{0,80}/)?.[0] || ''
        );
      }

      if (/\{\{\s*\}\}/.test(tpl)) note('high', id, rel, 'Empty {{}} token');
      if (/\bTODO\b|\bFIXME\b|\bXXX\b/.test(tpl)) note('high', id, rel, 'TODO/FIXME left in template');
      if (/\bundefined\b|\bnull\b/.test(tpl)) note('high', id, rel, 'undefined/null in template');

      const lastMeaningful = assembled.trim().split('\n').filter(Boolean).pop() || '';
      if (/:\s*$/.test(lastMeaningful) && lastMeaningful.length < 40) {
        note('med', id, rel, 'Template ends on a trailing colon', lastMeaningful);
      }

      if (/ \./.test(assembled) || / \,/.test(assembled)) {
        note('med', id, rel, 'Space before punctuation');
      }

      const lines = assembled
        .split('\n')
        .filter((l) => /[^ \n]  +[^ ]/.test(l) && !/[│├└─┌┐┘┤]/.test(l));
      if (lines.length) note('low', id, rel, 'Double spaces inside a line', lines[0]);

      // Guidance leftovers: literal [DOMAIN] etc. when template already uses {{TOKEN}}
      const guidanceMatch = html.slice(Math.max(0, m.index - 2500), m.index).match(
        /<details class="prompt-fill__guidance">[\s\S]*?<\/details>\s*$/
      );
      if (guidanceMatch) {
        const g = guidanceMatch[0];
        const gBrackets = [...g.matchAll(/\[([A-Z][A-Z0-9_]{2,})\]/g)].map((x) => x[1]);
        for (const b of gBrackets) {
          if (SECTION_HEADERS.has(b)) continue;
          note('high', id, rel, `Guidance shows literal [${b}] — use field name prose instead`, g);
        }
      }
    }
  }
}

const bySev = { high: [], med: [], low: [] };
for (const i of issues) bySev[i.sev].push(i);

console.log(`Prompts scanned: ${promptCount}`);
console.log(`HIGH: ${bySev.high.length}  MED: ${bySev.med.length}  LOW: ${bySev.low.length}\n`);
for (const sev of ['high', 'med', 'low']) {
  if (!bySev[sev].length) continue;
  console.log(`=== ${sev.toUpperCase()} ===`);
  for (const i of bySev[sev]) {
    console.log(`[${i.id}] ${i.file}`);
    console.log(`  ${i.msg}`);
    if (i.excerpt) console.log(`  > ${i.excerpt}`);
  }
  console.log('');
}

if (bySev.high.length) process.exitCode = 1;
