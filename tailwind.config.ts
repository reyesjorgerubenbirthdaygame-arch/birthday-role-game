import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':    'var(--color-bg-primary)',
        'bg-secondary':  'var(--color-bg-secondary)',
        'bg-card':       'var(--color-bg-card)',
        'text-primary':  'var(--color-text-primary)',
        'text-secondary':'var(--color-text-secondary)',
        'text-muted':    'var(--color-text-muted)',
        accent:          'var(--color-accent)',
        'accent-hover':  'var(--color-accent-hover)',
        danger:          'var(--color-danger)',
        'danger-hover':  'var(--color-danger-hover)',
        success:         'var(--color-success)',
        warning:         'var(--color-warning)',
        negative:        'var(--color-negative)',
        border:          'var(--color-border)',
      },
      fontSize: {
        xs:    ['var(--font-size-xs)',  { lineHeight: 'var(--line-height-base)' }],
        sm:    ['var(--font-size-sm)',  { lineHeight: 'var(--line-height-base)' }],
        md:    ['var(--font-size-md)',  { lineHeight: 'var(--line-height-base)' }],
        lg:    ['var(--font-size-lg)',  { lineHeight: 'var(--line-height-base)' }],
        xl:    ['var(--font-size-xl)',  { lineHeight: 'var(--line-height-tight)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-tight)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-tight)' }],
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
}

export default config
