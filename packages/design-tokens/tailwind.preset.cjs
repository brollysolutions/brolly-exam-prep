// Tailwind v3 preset generated from tokens.json. Used by apps/mobile (NativeWind) and apps/web.
const t = require('./tokens.json');

const px = (n) => `${n}px`;
const spacing = Object.fromEntries(Object.entries(t.spacing).map(([k, v]) => [k, px(v)]));
const borderRadius = Object.fromEntries(Object.entries(t.radius).map(([k, v]) => [k, px(v)]));
const fontSize = Object.fromEntries(Object.entries(t.text).map(([k, v]) => [k, px(v)]));

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    colors: { transparent: 'transparent', current: 'currentColor', ...t.colors },
    spacing,
    borderRadius,
    fontSize,
    extend: {
      fontFamily: {
        en: [t.font.en.family, 'system-ui', 'sans-serif'],
        te: [t.font.te.family, 'sans-serif'],
        ur: [t.font.ur.family, 'serif'],
      },
      letterSpacing: Object.fromEntries(Object.entries(t.tracking).map(([k, v]) => [k, px(v)])),
      height: {
        touch: px(t.size.touch),
        touchLg: px(t.size.touchLg),
        key: px(t.size.key),
        field: px(t.size.field),
        rail: px(t.size.rail),
        progress: px(t.size.progress),
        chip: px(t.size.chip),
        chipMd: px(t.size.chipMd),
        dot: px(t.size.dot),
      },
      minHeight: { touch: px(t.size.touch), touchLg: px(t.size.touchLg) },
      minWidth: { touch: px(t.size.touch), touchMin: px(t.size.touchMin) },
      width: {
        touch: px(t.size.touch),
        touchLg: px(t.size.touchLg),
        prefix: px(t.size.prefix),
        dot: px(t.size.dot),
      },
      borderWidth: { 1.5: '1.5px', 3: '3px' },
      transitionDuration: {
        fast: `${t.motion.fast}ms`,
        base: `${t.motion.base}ms`,
        slow: `${t.motion.slow}ms`,
      },
    },
  },
};
