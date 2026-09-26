/**
 * Gráficas SVG ligeras (sin librerías): línea con área y barras. Escalan con el contenedor,
 * usan los colores del tema y llevan una descripción accesible.
 */
import { useId } from 'react'

import { cn } from '@/shared/lib/utils'

export interface Point {
  label: string
  value: number
}

const W = 340
const PAD = { top: 16, right: 12, bottom: 22, left: 34 }

function niceRange(values: number[], zero = false) {
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (zero) min = 0
  if (min === max) {
    min -= 1
    max += 1
  }
  const pad = (max - min) * 0.12
  return { min: zero ? 0 : min - pad, max: max + pad }
}

function ticks(min: number, max: number, count = 3) {
  return Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1))
}

export function LineChart({
  data,
  label,
  format = (v) => String(Math.round(v)),
  height = 180,
  className,
}: {
  data: Point[]
  label: string
  format?: (value: number) => string
  height?: number
  className?: string
}) {
  const id = useId()
  if (data.length === 0) return null
  const { min, max } = niceRange(data.map((d) => d.value))
  const innerW = W - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const x = (i: number) =>
    PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min)) * innerH
  const line = data
    .map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`)
    .join(' ')
  const area = `${line} L${x(data.length - 1).toFixed(1)} ${PAD.top + innerH} L${x(0).toFixed(1)} ${PAD.top + innerH} Z`
  const last = data[data.length - 1]!
  const labelEvery = Math.max(1, Math.ceil(data.length / 5))
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      role="img"
      aria-label={label}
      className={cn('w-full', className)}
    >
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--ember)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks(min, max).map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <text
            x={PAD.left - 6}
            y={y(v) + 3.5}
            textAnchor="end"
            className="fill-muted-foreground text-[9px] tabular-nums"
          >
            {format(v)}
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${id}-fill)`} />
      <path
        d={line}
        fill="none"
        stroke="var(--ember)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, i) => (
        <g key={i}>
          <circle
            cx={x(i)}
            cy={y(d.value)}
            r={i === data.length - 1 ? 4.5 : 2.5}
            fill={i === data.length - 1 ? 'var(--ember-hot)' : 'var(--ember)'}
          />
          {(i % labelEvery === 0 || i === data.length - 1) && (
            <text
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {d.label}
            </text>
          )}
        </g>
      ))}
      <text
        x={Math.min(x(data.length - 1), W - PAD.right - 2)}
        y={y(last.value) - 9}
        textAnchor="end"
        className="fill-foreground text-[11px] font-bold tabular-nums"
      >
        {format(last.value)}
      </text>
    </svg>
  )
}

export function BarChart({
  data,
  label,
  format = (v) => String(Math.round(v)),
  height = 160,
  highlightLast = true,
  className,
}: {
  data: Point[]
  label: string
  format?: (value: number) => string
  height?: number
  highlightLast?: boolean
  className?: string
}) {
  if (data.length === 0) return null
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.15
  const innerW = W - PAD.left - PAD.right
  const innerH = height - PAD.top - PAD.bottom
  const slot = innerW / data.length
  const barW = Math.min(28, slot * 0.62)
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH
  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      role="img"
      aria-label={label}
      className={cn('w-full', className)}
    >
      {ticks(0, max).map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
          <text
            x={PAD.left - 6}
            y={y(v) + 3.5}
            textAnchor="end"
            className="fill-muted-foreground text-[9px] tabular-nums"
          >
            {format(v)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = PAD.left + slot * i + slot / 2
        const top = y(d.value)
        const hot = highlightLast && i === data.length - 1
        return (
          <g key={i}>
            <rect
              x={cx - barW / 2}
              y={top}
              width={barW}
              height={Math.max(0, PAD.top + innerH - top)}
              rx={Math.min(6, barW / 2)}
              fill={hot ? 'var(--ember)' : 'color-mix(in oklch, var(--ember) 45%, transparent)'}
            />
            {d.value > 0 && (
              <text
                x={cx}
                y={top - 4}
                textAnchor="middle"
                className="fill-foreground text-[9px] font-semibold tabular-nums"
              >
                {format(d.value)}
              </text>
            )}
            <text
              x={cx}
              y={height - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
