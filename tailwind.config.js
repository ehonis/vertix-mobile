/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        'barlow': ['Barlow_400Regular', 'sans-serif'],
        'barlow-400': ['Barlow_400Regular', 'sans-serif'],
        'barlow-500': ['Barlow_500Medium', 'sans-serif'],
        'barlow-600': ['Barlow_600SemiBold', 'sans-serif'],
        'barlow-700': ['Barlow_700Bold', 'sans-serif'],
        'jost-700-bold': ['Jost_700Bold', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
