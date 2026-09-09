/**
 * Everything that needs the operation registry.
 *
 * The registry is five hundred operations and every algorithm behind them: it
 * is by a wide margin the largest thing in the build, and none of it is needed
 * to draw the interface. This module is the seam. It is reached only through a
 * dynamic `import()` in the facade, so the bundler can put it in a chunk of its
 * own and the shell can paint while it downloads.
 *
 * Nothing should import this directly. The facade is the door.
 */

export { publicDefinitions, getOperation } from './operations';
export { bake } from './core/bake';
export { detect } from './detection/detect';
export { autoDecode } from './detection/autoDecode';
export { identify } from './detection/identify';
export { analyse } from './analysis';
export { ctfHints } from './ctf';
