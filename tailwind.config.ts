import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class', '[data-theme="night"]'],
  content: ['./src/**/*.{ts,tsx,mdx}', './content/**/*.md'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1100px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        // Kategoriefarben der Tracker – ueber CSS-Variablen, damit der Nachtmodus
        // sie eigenstaendig entsaettigen kann.
        cat: {
          sleep: 'hsl(var(--cat-sleep))',
          feed: 'hsl(var(--cat-feed))',
          bottle: 'hsl(var(--cat-bottle))',
          pump: 'hsl(var(--cat-pump))',
          solids: 'hsl(var(--cat-solids))',
          diaper: 'hsl(var(--cat-diaper))',
          mood: 'hsl(var(--cat-mood))',
          health: 'hsl(var(--cat-health))',
          other: 'hsl(var(--cat-other))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        xl: 'calc(var(--radius) + 6px)',
        '2xl': 'calc(var(--radius) + 14px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Basis leicht groesser als Default – Bedienung im Halbdunkeln.
        base: ['1.0625rem', { lineHeight: '1.6' }],
      },
      spacing: { touch: '3rem' },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        breathe: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        breathe: 'breathe 3.6s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
}
export default config
