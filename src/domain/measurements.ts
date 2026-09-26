import { z } from 'zod'

/** Medidas corporales opcionales. Son datos personales: solo se guardan en el dispositivo. */
export const MEASUREMENT_FIELDS = [
  'weightKg',
  'bodyFatPercent',
  'waistCm',
  'hipCm',
  'chestCm',
  'armCm',
  'thighCm',
  'calfCm',
  'neckCm',
] as const

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]

export const MEASUREMENT_LIMITS: Record<
  MeasurementField,
  { min: number; max: number; step: number }
> = {
  weightKg: { min: 30, max: 300, step: 0.1 },
  bodyFatPercent: { min: 3, max: 60, step: 0.1 },
  waistCm: { min: 40, max: 200, step: 0.5 },
  hipCm: { min: 50, max: 200, step: 0.5 },
  chestCm: { min: 50, max: 200, step: 0.5 },
  armCm: { min: 15, max: 70, step: 0.5 },
  thighCm: { min: 25, max: 100, step: 0.5 },
  calfCm: { min: 20, max: 70, step: 0.5 },
  neckCm: { min: 20, max: 70, step: 0.5 },
}

const measurementValue = (field: MeasurementField) =>
  z.number().min(MEASUREMENT_LIMITS[field].min).max(MEASUREMENT_LIMITS[field].max).optional()

export const MeasurementSchema = z.object({
  id: z.string(),
  /** Fecha local `YYYY-MM-DD`. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: measurementValue('weightKg'),
  bodyFatPercent: measurementValue('bodyFatPercent'),
  waistCm: measurementValue('waistCm'),
  hipCm: measurementValue('hipCm'),
  chestCm: measurementValue('chestCm'),
  armCm: measurementValue('armCm'),
  thighCm: measurementValue('thighCm'),
  calfCm: measurementValue('calfCm'),
  neckCm: measurementValue('neckCm'),
})

export type Measurement = z.infer<typeof MeasurementSchema>
