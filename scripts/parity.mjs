/**
 * Regenerates docs/parity.md.
 *
 * The checklist is CyberChef's own `src/core/config/Categories.json`, snapshotted
 * beside this script so the document is reproducible offline and a change in the
 * upstream list shows up as a diff rather than as a silent drift. Refresh it with:
 *
 *   npm run parity:refresh
 *
 * The name-to-id mapping is curated in `docs/parity-map.json`, because an
 * equivalent operation is often not identically named — CyberChef's "Substitute"
 * is our `find-replace`. Every entry there must resolve to a real operation id;
 * the script fails if one does not, so a renamed operation cannot quietly turn
 * into a false claim of parity.
 *
 * Usage: node scripts/parity.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Reads our registry without compiling it: every operation is `id` then `name`. */
function readOperations() {
  const dir = join(root, 'src/engine/operations');
  const ops = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts') || file === 'index.ts' || file === 'types.ts') continue;
    const lines = readFileSync(join(dir, file), 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length - 1; i++) {
      const id = /^ {4}id: '([^']+)',$/.exec(lines[i]);
      if (!id) continue;
      const name = /^ {4}name: '(.+)',$/.exec(lines[i + 1]);
      if (!name) continue;
      ops.push({ id: id[1], name: name[1], file });
    }
  }
  return ops;
}

const categories = JSON.parse(readFileSync(join(root, 'scripts/cyberchef-categories.json'), 'utf8'));
const map = JSON.parse(readFileSync(join(root, 'docs/parity-map.json'), 'utf8'));
const ops = readOperations();
const byId = new Map(ops.map((o) => [o.id, o]));

const problems = [];
for (const [name, entry] of Object.entries(map)) {
  if (entry.op && !byId.has(entry.op)) problems.push(`${name} -> unknown operation id '${entry.op}'`);
  if (!entry.op && !entry.wont && !entry.note) problems.push(`${name} -> neither an operation nor a reason`);
}
if (problems.length > 0) {
  console.error('docs/parity-map.json is out of date:\n  ' + problems.join('\n  '));
  process.exit(1);
}

const claimed = new Set(Object.values(map).flatMap((e) => (e.op ? [e.op] : [])));
const sections = [];

/**
 * Counted over unique names: CyberChef files 32 operations under two categories,
 * so summing the per-category rows would overstate both halves of the ratio.
 */
const unique = new Set(categories.flatMap((c) => c.ops));
let done = 0;
let todo = 0;
let wont = 0;
for (const name of unique) {
  if (map[name]?.op) done++;
  else if (map[name]?.wont) wont++;
  else todo++;
}

for (const category of categories) {
  if (category.ops.length === 0) continue;
  const rows = [];
  let localDone = 0;
  for (const name of category.ops) {
    const entry = map[name];
    if (entry?.op) {
      localDone++;
      rows.push(`| ${name} | done | \`${entry.op}\` | ${entry.note ?? byId.get(entry.op).name} |`);
    } else if (entry?.wont) {
      rows.push(`| ${name} | wont | — | ${entry.wont} |`);
    } else if (entry?.note) {
      // A todo with a reason: something is in the way, and the reader deserves
      // to know what rather than being left to assume nobody looked.
      rows.push(`| ${name} | todo | — | ${entry.note} |`);
    } else {
      rows.push(`| ${name} | todo | — | |`);
    }
  }
  sections.push(
    `## ${category.name} — ${localDone}/${category.ops.length}\n\n` +
      '| CyberChef | status | DecodeBox | note |\n| --- | --- | --- | --- |\n' +
      rows.join('\n'),
  );
}

const extra = ops.filter((o) => !claimed.has(o.id)).sort((a, b) => a.name.localeCompare(b.name));
const total = unique.size;

const body = `# Operation parity with CyberChef

Generated, not hand-maintained — run \`npm run parity\` after adding an operation.
The checklist is CyberChef's own \`src/core/config/Categories.json\`, snapshotted at
\`scripts/cyberchef-categories.json\`; the name-to-id mapping is curated in
\`docs/parity-map.json\`.

| | count |
| --- | --- |
| CyberChef operations | ${total} |
| implemented here | ${done} |
| still to port | ${todo} |
| deliberately not ported | ${wont} |
| DecodeBox operations with no CyberChef equivalent | ${extra.length} |

Total DecodeBox operations: **${ops.length}**.

Status is \`done\` when an operation with the same behaviour exists here,
whatever it is called; \`todo\` when it does not; \`wont\` when it will not be
ported, always with the reason. Nothing is omitted from this table.

${sections.join('\n\n')}

## DecodeBox operations CyberChef does not have

${extra.map((o) => `- \`${o.id}\` — ${o.name}`).join('\n')}
`;

writeFileSync(join(root, 'docs/parity.md'), body);
console.log(
  `parity.md: ${done} done, ${todo} todo, ${wont} wont, of ${total} CyberChef operations; ` +
    `${ops.length} operations here (${extra.length} with no upstream equivalent).`,
);
