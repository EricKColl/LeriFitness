/**
 * Pipeline reproducible del modelo anatómico 3D:
 *   1. Descarga el atlas de Z-Anatomy (commit fijado) a scripts/anatomy/.cache.
 *   2. Extrae músculos y esqueleto con Blender como módulo de Python (`extract.py`, vía uv).
 *   3. Optimiza y comprime el GLB para la web (`optimize.ts`).
 *   4. Escribe public/anatomy/body.glb y src/data/generated/anatomy.json.
 *
 * Requisitos: Python 3.11 y uv (https://docs.astral.sh/uv/). Uso: npm run anatomy:build
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { optimize } from './optimize'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const CACHE = join(ROOT, 'scripts/anatomy/.cache')
const SOURCE = {
  name: 'Z-Anatomy',
  repo: 'https://github.com/Z-Anatomy/Models-of-human-anatomy',
  commit: '3f4bbd72ef45ef61483e9b03650c6f8843a0a183',
  file: 'Z-Anatomy.zip',
  sha256: 'e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736',
  license: 'CC BY-SA 4.0',
}
const BPY = 'bpy==4.5.14'

function sha256(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

async function download() {
  const zip = join(CACHE, SOURCE.file)
  if (!existsSync(zip)) {
    const url = `https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/${SOURCE.commit}/${SOURCE.file}`
    console.log('Descargando', url)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Descarga fallida: ${response.status}`)
    writeFileSync(zip, Buffer.from(await response.arrayBuffer()))
  }
  const hash = sha256(zip)
  if (SOURCE.sha256 && hash !== SOURCE.sha256)
    throw new Error(`El archivo de origen ha cambiado (sha256 ${hash})`)
  const blend = join(CACHE, 'Startup.blend')
  if (!existsSync(blend)) {
    execFileSync(
      'python3',
      [
        '-c',
        'import sys, zipfile; z = zipfile.ZipFile(sys.argv[1]); open(sys.argv[2], "wb").write(z.read("Z-Anatomy/Startup.blend"))',
        zip,
        blend,
      ],
      { stdio: 'inherit' },
    )
  }
  return { blend, hash }
}

mkdirSync(CACHE, { recursive: true })
const { blend, hash } = await download()
const rawGlb = join(CACHE, 'raw.glb')
const rawJson = join(CACHE, 'raw.json')
console.log('Extrayendo músculos y esqueleto con Blender (tarda unos minutos)…')
execFileSync(
  'uv',
  [
    'run',
    '--quiet',
    '--python',
    '3.11',
    '--with',
    BPY,
    'python',
    'scripts/anatomy/extract.py',
    blend,
    rawGlb,
    rawJson,
  ],
  { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
)
const out = join(ROOT, 'public/anatomy/body.glb')
mkdirSync(dirname(out), { recursive: true })
const result = await optimize(rawGlb, out)
const extracted = JSON.parse(readFileSync(rawJson, 'utf8')) as {
  anchors: Record<string, Record<string, number[]>>
  stats: Record<string, number>
}
writeFileSync(
  join(ROOT, 'src/data/generated/anatomy.json'),
  `${JSON.stringify(
    {
      source: { ...SOURCE, sha256: hash },
      model: { path: 'anatomy/body.glb', bytes: result.bytes, triangles: result.triangles },
      nodes: result.nodes,
      anchors: extracted.anchors,
    },
    null,
    2,
  )}\n`,
)
console.log(
  `Listo: ${out} (${(result.bytes / 1024).toFixed(0)} KB, ${result.triangles} triángulos)`,
)
