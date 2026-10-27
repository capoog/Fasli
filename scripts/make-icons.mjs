// Renders the Fasli logo into every icon size the app needs.
// Run with: npm run icons
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'node:fs';

const BLUE = '#1D5C8C';
const PEN = '#C7362C';
const DOT = '#F06A5E';

// The mark: an open book with a red grading tick, and the dot of the Arabic letter "ف" above it.
const mark = (scale = 1, offset = 0) => `
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="M11 22c7.5-3.2 14.5-2.6 21 1.6V50c-6.5-4-13.5-4.6-21-1.6z" fill="#fff"/>
    <path d="M53 22c-7.5-3.2-14.5-2.6-21 1.6V50c6.5-4 13.5-4.6 21-1.6z" fill="#fff" opacity=".9"/>
    <path d="M37 35.5l4.2 4.3 8.3-9.3" fill="none" stroke="${PEN}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="12.5" r="4" fill="${DOT}"/>
  </g>`;

const full = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="17" fill="${BLUE}"/>${mark()}</svg>`;
const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${BLUE}"/>${mark()}</svg>`;
// Android adaptive foreground: mark inside the 66% safe zone, transparent background.
const fg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark(0.62, 12.2)}</svg>`;
const bg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${BLUE}"/></svg>`;
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g transform="translate(12.2 12.2) scale(.62)">
  <path d="M11 22c7.5-3.2 14.5-2.6 21 1.6V50c-6.5-4-13.5-4.6-21-1.6z" fill="#000"/>
  <path d="M53 22c-7.5-3.2-14.5-2.6-21 1.6V50c6.5-4 13.5-4.6 21-1.6z" fill="#000"/>
  <circle cx="32" cy="12.5" r="4" fill="#000"/></g></svg>`;
const splash = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark()}</svg>`;

mkdirSync('assets', { recursive: true });
writeFileSync('assets/logo.svg', full);
const out = [
  [square, 'assets/icon.png', 1024],
  [fg, 'assets/android-icon-foreground.png', 1024],
  [bg, 'assets/android-icon-background.png', 1024],
  [mono, 'assets/android-icon-monochrome.png', 1024],
  [splash, 'assets/splash-icon.png', 1024],
  [full, 'assets/favicon.png', 196],
  [full, 'assets/logo.png', 512],
];
for (const [svg, file, size] of out) {
  await sharp(Buffer.from(svg), { density: 600 }).resize(size, size).png().toFile(file);
  console.log('wrote', file);
}
