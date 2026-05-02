/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    'var(--bg-base)',
          surface: 'var(--bg-surface)',
          card:    'var(--bg-card)',
          hover:   'var(--bg-hover)',
        },
        brand: {
          green: 'var(--brand-green)',
          cyan:  'var(--brand-cyan)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          strong:  'var(--border-strong)',
        },
        status: {
          success: '#22c55e',
          warning: '#f59e0b',
          error:   '#ef4444',
          info:    '#3b82f6',
        },
        stage: {
          'new-lead':      '#64748b',
          'reaching-out':  '#3b82f6',
          'no-response':   '#6366f1',
          'meeting-done':  '#8b5cf6',
          'negotiation':   '#f59e0b',
          'prospect-active':'#22d3ee',
          'prospect-cold': '#94a3b8',
          'reconnect':     '#f97316',
          'client-active': '#22c55e',
          'client-inactive':'#ef4444',
          'client-renewal':'#fbbf24',
          'lost':          '#dc2626',
          'unqualified':   '#475569',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        ar:   ['Cairo', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':  ['11px', { lineHeight: '1.5' }],
        'sm':  ['12px', { lineHeight: '1.6' }],
        'base':['14px', { lineHeight: '1.6' }],
        'lg':  ['16px', { lineHeight: '1.5' }],
        'xl':  ['18px', { lineHeight: '1.4' }],
        '2xl': ['20px', { lineHeight: '1.3' }],
        '3xl': ['24px', { lineHeight: '1.2' }],
        '4xl': ['28px', { lineHeight: '1.1' }],
      },
      borderRadius: {
        sm:  '4px',
        DEFAULT: '6px',
        md:  '8px',
        lg:  '12px',
        xl:  '16px',
      },
      spacing: {
        sidebar: '220px',
        topbar:  '52px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.3)',
        modal: '0 8px 32px rgba(0,0,0,0.5)',
        glow:  '0 0 12px rgba(34,197,94,0.3)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        skeleton: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.8' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        skeleton:  'skeleton 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}