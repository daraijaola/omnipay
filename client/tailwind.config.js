/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#f4f2ea',
          card: 'rgba(250, 249, 245, 0.74)',
          solid: '#faf9f5'
        },
        ink: {
          DEFAULT: '#11110f',
          soft: 'rgba(17, 17, 15, 0.6)'
        },
        soft: '#d8d3c7',
        signal: '#d4f75a',
        muted: '#6d6a61',
        line: {
          DEFAULT: 'rgba(17, 17, 15, 0.14)',
          soft: 'rgba(17, 17, 15, 0.08)'
        },
        up: '#1f7a4d',
        down: '#c23b22'
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'system-ui', 'sans-serif'],
        mono: ['"Courier New"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'veritas': '0 22px 70px rgba(17, 17, 15, 0.09)',
        'veritas-sm': '0 14px 40px rgba(17, 17, 15, 0.07)',
      }
    },
  },
  plugins: [],
}
