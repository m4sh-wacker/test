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
        purple: 'var(--purple)',
        'purple-text': 'var(--purple-text)',
        'purple-soft': 'var(--purple-soft)',
        'purple-line': 'var(--purple-line)',
        ok: 'var(--green)',
        warn: 'var(--amber)',
        link: 'var(--blue)',
        danger: 'var(--red)',
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        brand: ['Poppins', 'Barlow', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
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
        card: '12px',
        control: '8px',
        chip: '6px',
      },
      boxShadow: {
        // The only two shadows in the system. Depth otherwise comes from borders.
        overlay: '0 8px 32px rgba(0, 0, 0, 0.4)',
        focus: '0 0 0 1px var(--purple-line), 0 0 40px rgba(157, 78, 221, 0.10)',
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
