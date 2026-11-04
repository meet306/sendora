/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      },
      colors: {
        // Human-designed stone & paper palette
        paper: {
          50: '#FDFDFC',
          100: '#F7F7F5',
          200: '#EEEEEC',
          300: '#E2E2DF',
          400: '#C8C8C4',
          500: '#8E8E89',
          600: '#646460',
          700: '#42423E',
          800: '#282825',
          900: '#191917',
          950: '#0E0E0C'
        },
        // Deep obsidian dark mode palette
        obsidian: {
          50: '#F4F4F6',
          100: '#E8E8EC',
          200: '#CFCFD6',
          300: '#9C9CA9',
          400: '#6E6E7D',
          500: '#484854',
          600: '#2E2F38',
          700: '#202128',
          800: '#16171C',
          900: '#101115',
          950: '#090A0D'
        },
        // Signature Swiss Vermilion Accent
        vermilion: {
          DEFAULT: '#E54D2E',
          hover: '#D13F20',
          subtle: '#FFF0EE',
          dark: '#FF6243'
        },
        // Legacy aliases for seamless compatibility
        sendora: {
          50: '#FDFDFC',
          100: '#F7F7F5',
          200: '#EEEEEC',
          300: '#E2E2DF',
          400: '#C8C8C4',
          500: '#8E8E89',
          600: '#646460',
          700: '#42423E',
          800: '#282825',
          900: '#191917',
          950: '#0E0E0C'
        },
        accent: {
          DEFAULT: '#E54D2E',
          hover: '#D13F20',
          subtle: '#FFF0EE',
          dark: '#FF6243'
        }
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.03)',
        'card-dark': '0 0 0 1px rgba(255, 255, 255, 0.07), 0 2px 8px rgba(0, 0, 0, 0.4)',
        'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(0, 0, 0, 0.06)',
        'premium-dark': '0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'glow': '0 0 25px -5px rgba(229, 77, 46, 0.35)',
      }
    },
  },
  plugins: [],
}
