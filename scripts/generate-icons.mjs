/**
 * Erzeugt die PWA-Icons aus einem SVG. Einmalig ausgefuehrt; die PNGs liegen im
 * Repo, damit der Build ohne zusaetzlichen Schritt auskommt.
 * Aufruf: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const BG = '#C0563A'
const FG = '#FDF6EE'

const sprout = (size, padding) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${padding > 0 ? 0 : 22}" fill="${BG}"/>
  <g transform="translate(50 50) scale(${1 - padding * 2}) translate(-50 -50)"
     fill="none" stroke="${FG}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M50 84 V47"/>
    <path d="M50 55 C50 40 38 30 24 30 C24 45 34 55 50 55 Z" fill="${FG}" stroke="none"/>
    <path d="M50 47 C50 32 62 22 76 22 C76 37 66 47 50 47 Z" fill="${FG}" stroke="none"/>
  </g>
</svg>`

const badge = `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#1a1a1a"/>
  <g fill="#ffffff">
    <path d="M50 82 V46" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
    <path d="M50 54 C50 40 39 31 26 31 C26 45 35 54 50 54 Z"/>
    <path d="M50 46 C50 32 61 23 74 23 C74 37 65 46 50 46 Z"/>
  </g>
</svg>`

await mkdir('public/icons', { recursive: true })

for (const size of [192, 512]) {
  await sharp(Buffer.from(sprout(size, 0))).resize(size, size).png().toFile(`public/icons/icon-${size}.png`)
}
// Maskable braucht ~20% Sicherheitsabstand rundum.
await sharp(Buffer.from(sprout(512, 0.2))).resize(512, 512).png().toFile('public/icons/maskable-512.png')
await sharp(Buffer.from(badge)).resize(96, 96).png().toFile('public/icons/badge-96.png')
await sharp(Buffer.from(sprout(180, 0))).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png')
await writeFile('public/icons/icon.svg', sprout(512, 0))

console.log('Icons erzeugt.')
