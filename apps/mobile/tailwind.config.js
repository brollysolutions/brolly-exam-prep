const tokens = require('@tslprb/design-tokens/tokens.json');

// Primitives resolve colour classes from a `color` prop (e.g. `text-${color}`), so every
// token colour — semantic and legacy alias alike — must survive Tailwind's static scan.
const colorNames = [...Object.keys(tokens.legacyColors), ...Object.keys(tokens.colors)].join('|');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', '../../packages/i18n/src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), require('@tslprb/design-tokens/preset')],
  safelist: [{ pattern: new RegExp(`^(bg|text|border)-(${colorNames})$`) }],
  theme: { extend: {} },
  plugins: [],
};
