/**
 * Genera favicon e iconos PWA a partir del trazado del logotipo.
 * Uso: npm run icons
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import sharp from 'sharp'

import { LOGO_MARK_PATH } from '../../src/config/brand'

const OUT = resolve(import.meta.dirname, '../../public')
const BG = '#14110f'

const gradient = `
  <linearGradient id="g" x1="0.2" y1="0" x2="0.75" y2="1">
    <stop offset="0" stop-color="#ffb347"/>
    <stop offset="0.6" stop-color="#ff6a2b"/>
    <stop offset="1" stop-color="#d9401c"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.62" r="0.55">
    <stop offset="0" stop-color="#ff6a2b" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#ff6a2b" stop-opacity="0"/>
  </radialGradient>`

/** Icono cuadrado con fondo. `padding` = fracción del lado que queda libre alrededor del símbolo. */
function iconSvg(size: number, padding: number, radius: number) {
  const inner = size * (1 - padding * 2)
  const offset = size * padding
  const scale = inner / 64
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${gradient}</defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#glow)"/>
  <path transform="translate(${offset} ${offset}) scale(${scale})" d="${LOGO_MARK_PATH}" fill="url(#g)" fill-rule="evenodd"/>
</svg>`
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>${gradient}</defs>
  <path d="${LOGO_MARK_PATH}" fill="url(#g)" fill-rule="evenodd"/>
</svg>
`

async function png(svg: string, file: string) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(resolve(OUT, file))
  console.log(`✓ ${file}`)
}

await mkdir(OUT, { recursive: true })
await writeFile(resolve(OUT, 'favicon.svg'), favicon)
await png(iconSvg(192, 0.16, 42), 'pwa-192x192.png')
await png(iconSvg(512, 0.16, 112), 'pwa-512x512.png')
// Maskable: sin esquinas redondeadas y con zona segura del 20 %.
await png(iconSvg(512, 0.24, 0), 'maskable-icon-512x512.png')
await png(iconSvg(180, 0.16, 0), 'apple-touch-icon.png')
await png(iconSvg(64, 0.12, 14), 'favicon-64x64.png')
