/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        'plus-jakarta': ['PlusJakartaSans_400Regular', 'sans-serif'],
        'plus-jakarta-400': ['PlusJakartaSans_400Regular', 'sans-serif'],
        'plus-jakarta-500': ['PlusJakartaSans_500Medium', 'sans-serif'],
        'plus-jakarta-600': ['PlusJakartaSans_600SemiBold', 'sans-serif'],
        'plus-jakarta-700': ['PlusJakartaSans_700Bold', 'sans-serif'],
        'jost-700-bold': ['Jost_700Bold', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
