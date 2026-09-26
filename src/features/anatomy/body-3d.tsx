/**
 * Visor anatómico 3D (React Three Fiber). Se carga de forma perezosa: three.js solo se descarga
 * cuando se muestra un modelo. El GLB contiene el lado izquierdo del cuerpo y la línea media; el
 * lado derecho se dibuja reflejando el izquierdo (escala x = −1), lo que reduce el peso a la mitad.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { CameraControls, CameraControlsImpl, useGLTF } from '@react-three/drei'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { Box3, type BufferGeometry, type Matrix4, type Mesh } from 'three'

import { type InjurySeverity, type InjuryZone, type Muscle } from '@/domain'
import anatomy from '@/data/generated/anatomy.json'
import { cn } from '@/shared/lib/utils'

import type { HeatLevel, View } from './body-map'
import { useAnatomyColors, type AnatomyColorVar } from './theme-colors'

const MODEL_URL = `/${anatomy.model.path}`
const TARGET_Y = 0.9
const DISTANCE = 3.5

export interface Body3DProps {
  heat: Partial<Record<Muscle, HeatLevel>>
  injuries?: readonly { zone: InjuryZone; severity: InjurySeverity }[]
  selected?: Muscle | null
  onSelect?: (muscle: Muscle) => void
  view?: View
  /** Músculos a encuadrar (p. ej. los de un ejercicio). Vacío: cuerpo entero. */
  focus?: readonly Muscle[]
  label: string
  className?: string
  onReady?: () => void
}

interface Part {
  name: string
  kind: 'm' | 'b'
  group: Muscle | 'other' | 'skeleton'
  side: 'l' | 'c'
  geometry: BufferGeometry
  /** Transformación del nodo (la cuantización de posiciones guarda aquí escala y desplazamiento). */
  matrix: Matrix4
}

function usePartsAndBounds() {
  const { nodes } = useGLTF(MODEL_URL, false, true)
  return useMemo(() => {
    const parts: Part[] = []
    const bounds = new Map<string, Box3>()
    for (const node of Object.values(nodes)) {
      const mesh = node as Mesh
      if (!mesh.isMesh) continue
      // Los nombres de nodo pierden los «:» al cargarse; los metadatos (extras) se conservan.
      const data = mesh.userData as { muscle?: Part['group']; side?: Part['side'] }
      const kind: Part['kind'] = data.muscle ? 'm' : 'b'
      const group = data.muscle ?? 'skeleton'
      const side = data.side ?? 'c'
      mesh.updateWorldMatrix(true, false)
      const matrix = mesh.matrixWorld.clone()
      mesh.geometry.computeBoundingBox()
      parts.push({ name: mesh.name, kind, group, side, geometry: mesh.geometry, matrix })
      if (mesh.geometry.boundingBox)
        bounds.set(group, mesh.geometry.boundingBox.clone().applyMatrix4(matrix))
    }
    return { parts, bounds }
  }, [nodes])
}

const SEVERITY_COLOR: Record<InjurySeverity, AnatomyColorVar> = {
  mild: '--warning',
  moderate: '--ember',
  severe: '--destructive',
}

function Model({
  heat,
  injuries = [],
  selected,
  onSelect,
  onReady,
}: Pick<Body3DProps, 'heat' | 'injuries' | 'selected' | 'onSelect' | 'onReady'>) {
  const colors = useAnatomyColors()
  const { parts } = usePartsAndBounds()
  useEffect(() => onReady?.(), [onReady])

  const colorFor = (part: Part) => {
    if (part.kind === 'b') return colors['--anatomy-bone']
    if (part.group === 'other') return colors['--anatomy-muscle']
    const level = heat[part.group as Muscle] ?? 0
    return level > 0 ? colors[`--heat-${level}`] : colors['--anatomy-muscle']
  }

  const click = (part: Part) => (e: ThreeEvent<MouseEvent>) => {
    // Un arrastre para girar el modelo no cuenta como toque.
    if (!onSelect || e.delta > 6 || part.kind !== 'm' || part.group === 'other') return
    e.stopPropagation()
    onSelect(part.group as Muscle)
  }

  const meshes = (mirror: boolean) =>
    parts
      .filter((p) => !mirror || p.side === 'l')
      .map((part) => {
        const isSelected = part.group === selected
        const color = colorFor(part)
        return (
          <mesh
            key={part.name}
            geometry={part.geometry}
            matrix={part.matrix}
            matrixAutoUpdate={false}
            onClick={click(part)}
            onPointerOver={
              onSelect && part.kind === 'm' && part.group !== 'other'
                ? () => (document.body.style.cursor = 'pointer')
                : undefined
            }
            onPointerOut={onSelect ? () => (document.body.style.cursor = '') : undefined}
          >
            <meshStandardMaterial
              color={color}
              roughness={part.kind === 'b' ? 0.85 : 0.55}
              metalness={0}
              emissive={isSelected ? colors['--foreground'] : '#000000'}
              emissiveIntensity={isSelected ? 0.18 : 0}
            />
          </mesh>
        )
      })

  const anchors = anatomy.anchors as Record<string, { c?: number[]; l?: number[] }>
  const markers = injuries.flatMap(({ zone, severity }) => {
    const anchor = anchors[zone]
    const points: number[][] = []
    if (anchor?.c) points.push(anchor.c)
    if (anchor?.l) points.push(anchor.l, [-anchor.l[0]!, anchor.l[1]!, anchor.l[2]!])
    const radius = zone === 'lowerBack' || zone === 'hip' ? 0.075 : zone === 'wrist' ? 0.04 : 0.055
    return points.map((p, i) => ({
      key: `${zone}-${i}`,
      position: p as [number, number, number],
      radius,
      color: colors[SEVERITY_COLOR[severity]],
    }))
  })

  return (
    <group>
      {meshes(false)}
      <group scale={[-1, 1, 1]}>{meshes(true)}</group>
      {markers.map((m) => (
        <group key={m.key} position={m.position}>
          {/* Visible a través de los músculos para señalar la zona. */}
          <mesh renderOrder={10}>
            <sphereGeometry args={[m.radius * 0.55, 24, 16]} />
            <meshBasicMaterial color={m.color} transparent opacity={0.9} depthTest={false} />
          </mesh>
          <mesh renderOrder={9}>
            <sphereGeometry args={[m.radius, 32, 24]} />
            <meshBasicMaterial color={m.color} transparent opacity={0.28} depthTest={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Gira la cámara al frente o a la espalda y, si se indica, encuadra ciertos músculos. */
function Camera({ view, focus }: { view: View; focus: readonly Muscle[] }) {
  const ref = useRef<CameraControlsImpl>(null)
  const { bounds } = usePartsAndBounds()
  const focusKey = focus.join(',')

  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    // Sin desplazamiento lateral: solo girar y acercar.
    controls.mouseButtons.right = CameraControlsImpl.ACTION.NONE
    controls.mouseButtons.middle = CameraControlsImpl.ACTION.DOLLY
    controls.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY
    controls.touches.three = CameraControlsImpl.ACTION.NONE
    // Deslizar en vertical desplaza la página (en el móvil el modelo ocupa mucha pantalla); en
    // horizontal gira el cuerpo y con dos dedos se acerca.
    const canvas = (controls as unknown as { _domElement?: HTMLElement })._domElement
    if (canvas) canvas.style.touchAction = 'pan-y'
  }, [])

  useEffect(() => {
    const controls = ref.current
    if (!controls) return
    const muscles = focusKey ? (focusKey.split(',') as Muscle[]) : []
    const box = new Box3()
    for (const m of muscles) {
      const b = bounds.get(m)
      if (!b) continue
      box.union(b)
      // Incluye también el lado reflejado.
      box.union(new Box3().set(b.min.clone().setX(-b.max.x), b.max.clone().setX(-b.min.x)))
    }
    const azimuth = view === 'back' ? Math.PI : 0
    if (box.isEmpty()) {
      void controls.setLookAt(
        0,
        TARGET_Y + 0.1,
        view === 'back' ? -DISTANCE : DISTANCE,
        0,
        TARGET_Y,
        0,
        true,
      )
      return
    }
    void controls.rotateTo(azimuth, Math.PI / 2, false)
    box.expandByScalar(0.1)
    void controls.fitToBox(box, true, { cover: false })
  }, [view, focusKey, bounds])

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={0.7}
      maxDistance={4.5}
      minPolarAngle={Math.PI * 0.28}
      maxPolarAngle={Math.PI * 0.72}
      smoothTime={0.35}
    />
  )
}

export default function Body3D({
  heat,
  injuries,
  selected,
  onSelect,
  view = 'front',
  focus = [],
  label,
  className,
  onReady,
}: Body3DProps) {
  const [ready, setReady] = useState(false)
  return (
    <div role="img" aria-label={label} className={cn('relative touch-pan-y', className)}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, TARGET_Y + 0.1, DISTANCE], fov: 30, near: 0.05, far: 20 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      >
        <hemisphereLight args={['#ffffff', '#5a4a44', 1.1]} />
        <directionalLight position={[1.5, 2.5, 2.5]} intensity={1.6} />
        <directionalLight position={[-2, 1.5, -2]} intensity={0.7} />
        <Suspense fallback={null}>
          <Model
            heat={heat}
            injuries={injuries}
            selected={selected}
            onSelect={onSelect}
            onReady={() => {
              setReady(true)
              onReady?.()
            }}
          />
          <Camera view={view} focus={focus} />
        </Suspense>
      </Canvas>
      {!ready && (
        <div className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  )
}
