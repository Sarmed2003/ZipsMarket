/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'uakron': {
          blue: '#041E42', // Official University of Akron Blue
          gold: '#A89968', // Official University of Akron Gold
        },
        'uakron-blue': {
          50: '#e6ecf2',
          100: '#b3c4d6',
          200: '#809cba',
          300: '#4d749e',
          400: '#1a4c82',
          500: '#041E42', // Primary University of Akron Blue
          600: '#031832',
          700: '#021222',
          800: '#010c12',
          900: '#000608',
        },
        'uakron-gold': {
          50: '#f5f3ef',
          100: '#e0d9c8',
          200: '#cbbfa1',
          300: '#b6a57a',
          400: '#a18b53',
          500: '#A89968', // Primary University of Akron Gold
          600: '#867a53',
          700: '#645b3e',
          800: '#423c29',
          900: '#201e14',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(168, 153, 104, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(168, 153, 104, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
