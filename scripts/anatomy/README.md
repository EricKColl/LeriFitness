# Modelo anatómico 3D

`public/anatomy/body.glb` (músculos y esqueleto, ~0,6 MB) se genera de forma reproducible a
partir del atlas libre [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy)
(CC BY-SA 4.0, derivado de BodyParts3D, CC BY-SA 2.1 JP).

```bash
npm run anatomy:build
```

Requisitos: Python 3.11 y [uv](https://docs.astral.sh/uv/) (instala Blender como módulo de Python,
`bpy`, en su caché; la primera vez descarga ~500 MB). Tarda unos 3-4 minutos.

## Pasos

1. `build.ts` descarga `Z-Anatomy.zip` de un commit fijado, comprueba su sha256 y extrae
   `Startup.blend` en `scripts/anatomy/.cache/` (ignorado por git).
2. `extract.py` (Blender) selecciona los músculos según `mapping.py`, los agrupa por los grupos de
   Forja (`src/domain/muscles.ts`), añade el esqueleto (sin dientes, huesecillos ni cartílagos
   laríngeos), simplifica cada malla (colapso de aristas), calcula las anclas de las zonas de
   lesión y exporta un GLB intermedio. Solo se exporta el lado izquierdo: el derecho se dibuja por
   simetría en la app.
3. `optimize.ts` (glTF-Transform) une primitivas, suelda vértices, cuantiza y comprime con
   `EXT_meshopt_compression`.
4. Se escriben `public/anatomy/body.glb` y `src/data/generated/anatomy.json` (origen, tamaño,
   nodos y anclas). `anatomy.test.ts` comprueba que no falta ningún grupo ni ancla.

## Licencia

El modelo derivado se distribuye con la misma licencia, CC BY-SA 4.0: ver
`public/anatomy/LICENSE.txt`. Se excluyen a propósito las piezas del atlas con licencia no
comercial (oído interno, riñón).

## Cambiar el mapeo

Edita `mapping.py` (los nombres son los de la Terminologia Anatomica del atlas, sin el sufijo de
lado) y vuelve a ejecutar `npm run anatomy:build`.
