/**
 * Paso 2 del pipeline del modelo 3D: optimiza el GLB intermedio para la web.
 * Une primitivas, suelda vértices, cuantiza y comprime con EXT_meshopt_compression (se
 * descomprime en el navegador con el decodificador de meshoptimizer, sin trabajadores).
 */
import { readFileSync, writeFileSync } from 'node:fs'

import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, joinPrimitives, meshopt, prune, quantize, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'

export async function optimize(input: string, output: string) {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready])
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
  const document = await io.read(input)

  // El exportador de Blender puede partir una malla en varias primitivas: se reúnen en una.
  for (const mesh of document.getRoot().listMeshes()) {
    const prims = mesh.listPrimitives()
    if (prims.length < 2) continue
    const joined = joinPrimitives(prims)
    for (const p of prims) {
      mesh.removePrimitive(p)
      p.dispose()
    }
    mesh.addPrimitive(joined)
  }
  // Sin texturas ni UV: los materiales se asignan en la app según el estado de cada músculo.
  for (const material of document.getRoot().listMaterials()) material.setBaseColorTexture(null)

  await document.transform(
    dedup(),
    weld(),
    prune(),
    quantize({ quantizePosition: 14, quantizeNormal: 10 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  )
  await io.write(output, document)
  const bytes = readFileSync(output).byteLength
  let triangles = 0
  for (const mesh of document.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) triangles += (p.getIndices()?.getCount() ?? 0) / 3
  return {
    bytes,
    triangles,
    nodes: document
      .getRoot()
      .listNodes()
      .map((n) => n.getName()),
  }
}

if (process.argv[1]?.endsWith('optimize.ts')) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output) throw new Error('Uso: tsx optimize.ts entrada.glb salida.glb')
  const result = await optimize(input, output)
  writeFileSync(`${output}.stats.json`, JSON.stringify(result, null, 2))
  console.log(result)
}
