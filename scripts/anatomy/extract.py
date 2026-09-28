"""
Paso 1 del pipeline del modelo 3D (se ejecuta con Blender como módulo de Python, `bpy`).

Abre el atlas de Z-Anatomy, se queda con los músculos (agrupados según `mapping.py`) y el
esqueleto, los simplifica, calcula las anclas de las zonas de lesión y exporta un GLB intermedio.
El paso 2 (`optimize.ts`) lo comprime para la web.

Uso: npm run anatomy:build  (ver scripts/anatomy/README.md)
"""

import json
import sys
from pathlib import Path

import bpy  # bmesh y mathutils solo existen tras importar bpy
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

sys.path.insert(0, str(Path(__file__).parent))
import mapping as M  # noqa: E402

BLEND, OUT_GLB, OUT_JSON = sys.argv[-3:]

# Proporción de caras que se conserva al simplificar cada tipo de malla.
MUSCLE_RATIO = 0.12
OTHER_RATIO = 0.06
BONE_RATIO = 0.15
MIN_FACES = 120

bpy.ops.wm.open_mainfile(filepath=BLEND)
depsgraph = bpy.context.evaluated_depsgraph_get()


def base_name(name: str) -> tuple[str, str]:
    """«Soleus muscle.l» → («Soleus muscle», «l»); sin sufijo → («…», «c») (centro)."""
    if name.endswith((".l", ".r")):
        return name[:-2], name[-1]
    return name, "c"


def world_mesh(obj) -> bpy.types.Mesh:
    """Malla en coordenadas del mundo, con modificadores aplicados si los tiene."""
    source = obj.evaluated_get(depsgraph) if obj.modifiers else obj
    mesh = bpy.data.meshes.new_from_object(source)
    mesh.transform(obj.matrix_world)
    return mesh


def decimate(mesh: bpy.types.Mesh, ratio: float) -> bpy.types.Mesh:
    faces = len(mesh.polygons)
    target = max(MIN_FACES, int(faces * ratio))
    if faces <= target:
        return mesh
    tmp = bpy.data.objects.new("tmp", mesh)
    bpy.context.scene.collection.objects.link(tmp)
    mod = tmp.modifiers.new("dec", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = target / faces
    mod.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    result = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp)
    return result


def merge(meshes: list, name: str) -> bpy.types.Mesh:
    bm = bmesh.new()
    for mesh in meshes:
        bm.from_mesh(mesh)
    out = bpy.data.meshes.new(name)
    bm.to_mesh(out)
    bm.free()
    out.validate()  # quita caras degeneradas que deja la simplificación
    out.shade_smooth()
    return out


def lateral_edge(mesh: bpy.types.Mesh) -> dict[int, float]:
    """Borde lateral (|x| máximo) de una malla por franjas de altura de EDGE_BIN metros."""
    edge: dict[int, float] = {}
    for v in mesh.vertices:
        k = int(v.co.z // EDGE_BIN)
        edge[k] = max(edge.get(k, 0.0), abs(v.co.x))
    return edge


def trim_over(mesh: bpy.types.Mesh, edge: dict[int, float]) -> tuple[bpy.types.Mesh, int]:
    """Quita las caras cuyo centro queda por dentro del borde `edge` (a su misma altura)."""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    doomed = []
    for face in bm.faces:
        c = face.calc_center_median()
        k = int(c.z // EDGE_BIN)
        # La franja y sus vecinas: el borde no queda dentado entre una franja y la siguiente.
        limit = max(edge.get(k - 1, 0.0), edge.get(k, 0.0), edge.get(k + 1, 0.0))
        if limit and abs(c.x) < limit:
            doomed.append(face)
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(mesh)
    bm.free()
    return mesh, len(doomed)


EDGE_BIN = 0.01

muscle_group = {n: g for g, names in M.MUSCLES.items() for n in names}
other = set(M.OTHER_MUSCLES)

groups: dict[str, list] = {}
stats = {"muscleObjects": 0, "boneObjects": 0, "trimmedFaces": 0}
muscles = bpy.data.collections["4: Muscular system"].objects
edges = {n: lateral_edge(world_mesh(muscles[f"{n}.l"])) for n in set(M.TRIM_OVER.values())}

for obj in muscles:
    if obj.type != "MESH" or obj.name.endswith((".j", ".g")):
        continue
    name, side = base_name(obj.name)
    group = muscle_group.get(name) or ("other" if name in other else None)
    # El atlas es simétrico: el lado derecho se obtiene en la app reflejando el izquierdo.
    if not group or side == "r":
        continue
    ratio = OTHER_RATIO if group == "other" else MUSCLE_RATIO
    mesh = world_mesh(obj)
    if name in M.TRIM_OVER:
        mesh, trimmed = trim_over(mesh, edges[M.TRIM_OVER[name]])
        stats["trimmedFaces"] += trimmed
    groups.setdefault(f"m:{group}:{side}", []).append(decimate(mesh, ratio))
    stats["muscleObjects"] += 1

bone_meshes: dict[str, list] = {}
bone_vertices: dict[str, list] = {}
for obj in bpy.data.collections["1: Skeletal system"].objects:
    if obj.type != "MESH" or obj.name.endswith((".i", ".j", ".g")):
        continue
    parent = obj.parent.name if obj.parent else ""
    name, side = base_name(obj.name)
    if parent in M.BONE_EXCLUDED_PARENTS or name in M.BONE_EXCLUDED_NAMES or side == "r":
        continue
    mesh = world_mesh(obj)
    bone_vertices[obj.name] = [v.co.copy() for v in mesh.vertices]
    bone_meshes.setdefault(side, []).append(decimate(mesh, BONE_RATIO))
    stats["boneObjects"] += 1


def anchor(bone: str, where: str) -> list[float]:
    points = sorted(bone_vertices[bone], key=lambda v: v.z)
    k = max(1, len(points) * 8 // 100)
    chosen = {"top": points[-k:], "bottom": points[:k], "center": points}[where]
    c = sum(chosen, Vector()) / len(chosen)
    # Blender (Z arriba) → glTF (Y arriba): (x, y, z) → (x, z, -y).
    return [round(c.x, 4), round(c.z, 4), round(-c.y, 4)]


anchors = {}
for zone, (bone, where) in M.ANCHORS.items():
    if bone in bone_vertices:
        anchors[zone] = {"c": anchor(bone, where)}
    else:
        anchors[zone] = {"l": anchor(f"{bone}.l", where)}

# Solo se exporta lo seleccionado: los objetos nuevos, enlazados a la raíz de la escena.
root = bpy.context.scene.collection
view_layer = bpy.context.view_layer
for obj in view_layer.objects:
    obj.select_set(False)
exported = []
for key, meshes in sorted(groups.items()):
    obj = bpy.data.objects.new(key, merge(meshes, key.replace(":", "-")))
    _, group, side = key.split(":")
    obj["muscle"] = group
    obj["side"] = side
    exported.append(obj)
for side, meshes in sorted(bone_meshes.items()):
    obj = bpy.data.objects.new(f"b:skeleton:{side}", merge(meshes, f"skeleton-{side}"))
    obj["side"] = side
    exported.append(obj)
for obj in exported:
    root.objects.link(obj)
    kind = "bone" if obj.name.startswith("b:") else "muscle"
    obj.data.materials.append(bpy.data.materials.new(kind))
    obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    use_selection=True,
    export_extras=True,
    export_yup=True,
    export_texcoords=False,
    export_normals=True,
    export_materials="EXPORT",
    export_animations=False,
)

tris = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in exported}
json.dump(
    {"anchors": anchors, "stats": {**stats, "triangles": sum(tris.values())}, "groups": sorted(tris)},
    open(OUT_JSON, "w"),
    indent=2,
)
print("Exportado", OUT_GLB, stats, "triángulos", sum(tris.values()))
