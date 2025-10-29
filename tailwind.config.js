/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sura-red': '#E31E24',
        'sura-red-dark': '#C41E3A',
        'sura-red-light': '#FF6B6B',
        'sura-blue': '#2D6DF6',
        'sura-gray': '#4A5568',
        'sura-gray-light': '#718096',
      },
      fontFamily: {
        'sans': ['Sura', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
