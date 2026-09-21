/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Indigo — reads as trustworthy/professional for a money-handling app
        // (the same register as Razorpay/Vyapar/Zoho Books), more modern than
        // the previous teal, and Tailwind's own well-tested accessible scale.
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontSize: {
        base: ['1rem', '1.5rem'],
      },
      // No custom font-family was set before, so the browser's bare default
      // sans-serif was used — on some devices/browsers that lacks a Devanagari
      // face, and "हिं" (the Hindi language toggle) falls back to a broken/
      // generic glyph instead of the actual text. These system-font stacks all
      // include Devanagari coverage on their respective platforms.
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Noto Sans"',
          '"Noto Sans Devanagari"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      spacing: {
        tap: '2.75rem', // 44px minimum tap target
      },
    },
  },
  plugins: [],
}
