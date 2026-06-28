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
        // Clean Dark Theme
        bg: {
          primary: '#0A0A0F',     // Deepest dark
          secondary: '#14141E',   // Card backgrounds
          tertiary: '#1C1C2E',    // Borders / dividers
          hover: '#25253A',       // Hover states
        },
        accent: {
          primary: '#7C6DF0',     // Soft purple - main CTA
          secondary: '#4ECDC4',   // Mint teal - secondary actions
          glow: '#7C6DF033',      // Purple glow
          hover: '#8F81F5',       // Lighter purple
        },
        text: {
          primary: '#F0F0F5',     // Crisp white
          secondary: '#B8B8D0',   // Soft gray
          muted: '#6B6B85',       // Dim text
          cursor: '#7C6DF0',      // Caret
        },
        word: {
          correct: '#B8B8D0',     // Typed correctly
          incorrect: '#FF6B6B',   // Soft red
          current: '#F0F0F5',     // Current word
          pending: '#4A4A66',     // Not typed
        },
        status: {
          success: '#4ECDC4',     // Mint green
          warning: '#FFD93D',     // Warm yellow
          error: '#FF6B6B',       // Soft red
          info: '#7C6DF0',        // Purple
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