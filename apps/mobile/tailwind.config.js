/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', '../../packages/i18n/src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), require('@tslprb/design-tokens/preset')],
  theme: { extend: {} },
  plugins: [],
};
