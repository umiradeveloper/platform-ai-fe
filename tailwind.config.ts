import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const v = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        background: v('background'),
        foreground: v('foreground'),
        card: v('card'),
        'card-foreground': v('card-foreground'),
        muted: v('muted'),
        'muted-foreground': v('muted-foreground'),
        border: v('border'),
        input: v('input'),
        ring: v('ring'),
        primary: v('primary'),
        'primary-foreground': v('primary-foreground'),
        accent: v('accent'),
        'accent-foreground': v('accent-foreground'),
        sidebar: v('sidebar'),
        'sidebar-foreground': v('sidebar-foreground'),
        'sidebar-muted': v('sidebar-muted'),
        destructive: v('destructive'),
        success: v('success'),
        // Palet brand Umira (dari logo)
        teal: {
          50: '#EEF7F9', 100: '#D3EBF0', 200: '#A7D6E1', 300: '#6FB9CB', 400: '#3797B0',
          500: '#0E7A95', 600: '#0A6079', 700: '#075269', 800: '#02475A', 900: '#05333F', 950: '#071E25',
        },
        copper: {
          50: '#FBF4EE', 100: '#F4E2D2', 200: '#E8C3A2', 300: '#D99D6E', 400: '#C77B3E',
          500: '#A8622C', 600: '#8B4A1C', 700: '#713B18', 800: '#5C3117', 900: '#4C2915',
        },
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        rise: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { blink: 'blink 1s step-end infinite', rise: 'rise .25s ease-out both' },
    },
  },
  plugins: [typography],
} satisfies Config;
