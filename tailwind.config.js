/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          primary: 'rgb(var(--bg-primary) / <alpha-value>)',
          secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--bg-tertiary) / <alpha-value>)',
          hover: 'rgb(var(--bg-hover) / <alpha-value>)',
        },
        accent: {
          primary: 'rgb(var(--accent-primary) / <alpha-value>)',
          secondary: 'rgb(var(--accent-secondary) / <alpha-value>)',
          glow: 'rgb(var(--accent-primary) / 0.2)',   // fixed alpha, NOT <alpha-value>
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          cursor: 'rgb(var(--text-cursor) / <alpha-value>)',
        },
        word: {
          correct: 'rgb(var(--word-correct) / <alpha-value>)',
          incorrect: 'rgb(var(--word-incorrect) / <alpha-value>)',
          current: 'rgb(var(--word-current) / <alpha-value>)',
          pending: 'rgb(var(--word-pending) / <alpha-value>)',
        },
        status: {
          success: 'rgb(var(--status-success) / <alpha-value>)',
          warning: 'rgb(var(--status-warning) / <alpha-value>)',
          error: 'rgb(var(--status-error) / <alpha-value>)',
          info: 'rgb(var(--status-info) / <alpha-value>)',
        },
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        blink: 'blink 1.1s step-end infinite',
        fadeIn: 'fadeIn 0.35s ease forwards',
        pulse: 'pulse 2s ease-in-out infinite',
        slideUp: 'slideUp 0.4s ease forwards',
      },
      boxShadow: {
        'glow': '0 0 30px rgba(124, 109, 240, 0.1)',
        'glow-strong': '0 0 50px rgba(124, 109, 240, 0.2)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #7C6DF0 0%, #4ECDC4 100%)',
        'gradient-dark': 'linear-gradient(180deg, #14141E 0%, #0A0A0F 100%)',
      },
    },
  },
  plugins: [],
}