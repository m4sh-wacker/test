/**
 * Refreshes the snapshot of CyberChef's operation list.
 *
 * The snapshot is committed rather than fetched at build time: the parity
 * document has to be reproducible without a network, and an upstream addition
 * should arrive as a reviewable diff rather than as a number that changed by
 * itself. This is the only part of the toolchain that talks to the network, and
 * nothing in the build or the test suite runs it.
 *
 * Usage: node scripts/refresh-categories.mjs
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE =
  'https://raw.githubusercontent.com/gchq/CyberChef/master/src/core/config/Categories.json';

const target = join(dirname(fileURLToPath(import.meta.url)), 'cyberchef-categories.json');

const response = await fetch(SOURCE);
if (!response.ok) {
  console.error(`${SOURCE} returned ${response.status}`);
  process.exit(1);
}

const categories = await response.json();
if (!Array.isArray(categories) || !categories.every((c) => c.name && Array.isArray(c.ops))) {
  console.error('Upstream returned something that is not a category list.');
  process.exit(1);
}

writeFileSync(target, JSON.stringify(categories, null, 4) + '\n');
const unique = new Set(categories.flatMap((c) => c.ops));
console.log(`Snapshotted ${unique.size} operations across ${categories.length} categories.`);
