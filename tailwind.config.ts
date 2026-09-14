import type { Config } from 'tailwindcss';

// Colors resolve to CSS custom properties defined in src/styles/theme.css, so a
// single token drives both themes and Tailwind never needs a `dark:` variant.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        faint: 'var(--text-faint)',
        ok: 'var(--green)',
        warn: 'var(--amber)',
        link: 'var(--blue)',
        danger: 'var(--red)',

        /* The accent, by name. Every selected, focused or primary thing points
           here, so the identity is one token rather than a colour repeated. */
        accent: 'var(--accent)',
        'accent-text': 'var(--accent-text)',
        'accent-soft': 'var(--accent-soft)',
        'accent-line': 'var(--accent-line)',
        'accent-wash': 'var(--accent-wash)',

      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        brand: ['Poppins', 'Barlow', 'system-ui', 'sans-serif'],
        mono: [
          'JetBrains Mono',
          'Cascadia Code',
          'Cascadia Mono',
          'Fira Code',
          'SF Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      fontSize: {
        micro: ['0.75rem', { lineHeight: '1rem' }],
        xs2: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.6' }],
        card: ['1.125rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        section: ['1.375rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],
        verdict: ['2.125rem', { lineHeight: '1.15', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        /* Flattened for the editor shell. VS Code's chrome has square corners
           almost everywhere, and 8px radii on every control was the single
           strongest tell that this was a web page wearing an IDE costume. */
        card: '3px',
        control: '3px',
        chip: '2px',
      },
      boxShadow: {
        // The only two shadows in the system. Depth otherwise comes from borders.
        overlay: '0 8px 32px rgba(0, 0, 0, 0.4)',
        focus: '0 0 0 1px var(--accent-line), 0 0 32px var(--accent-wash)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.2, 0, 0.2, 1)',
      },
      maxWidth: {
        page: '1080px',
      },
    },
  },
  plugins: [],
} satisfies Config;
