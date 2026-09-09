/// <reference types="vite/client" />

/**
 * Substituted at build time from package.json and the clock.
 *
 * A standalone copy never updates itself, so the one thing its holder needs is
 * a way to tell which build they have.
 */
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
