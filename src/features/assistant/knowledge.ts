/**
 * Base de conocimiento curada del asistente. Sirve para dos cosas:
 * 1. Responder sin ningún modelo (sin conexión, sin WebGPU): se muestra la entrada más relevante.
 * 2. Dar contexto fiable al modelo de lenguaje, que es pequeño y puede equivocarse.
 * Son explicaciones generales de entrenamiento; ninguna decide el plan ni es consejo médico.
 */
import { normalize } from '@/features/library/filter'

export interface KnowledgeEntry {
  id: string
  title: string
  /** Palabras y expresiones con las que suele preguntarse (sin tildes, en minúscula). */
  keywords: string[]
  body: string
  /** Razones del motor relacionadas: se añaden a la respuesta para explicar TU plan. */
  reasons?: string[]
}

export const KNOWLEDGE: readonly KnowledgeEntry[] = [
  {
    id: 'rir',
    reasons: ['reasons.scheme.'],
    title: 'Repeticiones en reserva (RIR)',
    keywords: ['rir', 'reserva', 'repeticiones en reserva', 'fallo', 'cerca del fallo', 'margen'],
    body: 'El RIR son las repeticiones que podrías haber hecho con buena técnica al terminar la serie. «Deja 2 en reserva» significa parar cuando aún te quedarían unas 2. Entrenar cerca del fallo, pero sin llegar siempre, da casi el mismo estímulo con menos fatiga. En la sesión lo indicas con los chips: fácil (4 o más), exigente (1-3) o al límite (0).',
  },
  {
    id: 'rpe',
    title: 'Esfuerzo percibido de la sesión (RPE)',
    keywords: ['rpe', 'esfuerzo percibido', 'dura la sesion', 'escala 1 10'],
    body: 'El RPE de la sesión es una nota del 1 al 10 de lo dura que te ha resultado. Forja la usa, junto con las sesiones completadas y tu rendimiento, para decidir si la semana siguiente puede subir un poco el volumen, mantenerlo o adelantar la descarga.',
  },
  {
    id: 'e1rm',
    title: '1RM estimado',
    keywords: [
      '1rm',
      'e1rm',
      'maximo',
      'una repeticion',
      'repeticion maxima',
      'epley',
      'fuerza maxima',
    ],
    body: 'El 1RM es el peso máximo que podrías levantar una vez. No hace falta probarlo: se estima a partir de tus series (fórmula de Epley, corregida por las repeticiones en reserva). Sirve para seguir tu progreso de fuerza y para calcular cargas sugeridas.',
  },
  {
    id: 'doubleProgression',
    reasons: ['reasons.plan.progression'],
    title: 'Doble progresión',
    keywords: [
      'progresion',
      'doble progresion',
      'subir peso',
      'cuando subo',
      'aumentar peso',
      'progresar',
      'estancado',
    ],
    body: 'Cada ejercicio tiene un rango de repeticiones (por ejemplo, 8-12). Mantienes el peso y sumas repeticiones hasta completar todas las series en el tope del rango; entonces subes el peso lo mínimo que permita el material y vuelves al mínimo del rango. Si una sesión cuesta mucho más de lo normal, Forja sugiere bajar un poco la carga.',
  },
  {
    id: 'volume',
    reasons: ['reasons.volume.'],
    title: 'Volumen: series por músculo y semana',
    keywords: [
      'volumen',
      'series',
      'cuantas series',
      'series por musculo',
      'series semanales',
      'conteo fraccional',
    ],
    body: 'El volumen se cuenta en series efectivas por músculo y semana. Un ejercicio suma 1 serie a su músculo principal y 0,5 a los que ayudan. Hay un rango útil (por ejemplo, 10-16 series para ganar músculo en nivel intermedio): por debajo el estímulo es escaso y muy por encima la fatiga crece más que el resultado. Forja ajusta el rango a tu nivel, objetivo, edad y trabajo.',
  },
  {
    id: 'frequency',
    reasons: ['reasons.split.'],
    title: 'Frecuencia y reparto de días',
    keywords: [
      'frecuencia',
      'cuantas veces',
      'dias',
      'split',
      'torso pierna',
      'cuerpo completo',
      'full body',
      'empuje tiron pierna',
      'rutina',
      'reparto',
      'repartida',
      'repartir',
      'organizada',
      'distribucion',
    ],
    body: 'Entrenar cada músculo unas 2 veces por semana es lo que más respaldo tiene. Por eso, con 2-3 días se usa cuerpo completo; con 4, torso y pierna dos veces; y con 5-6, combinaciones de torso, pierna, empuje y tirón. Siempre queda al menos un día de descanso.',
  },
  {
    id: 'mesocycle',
    reasons: ['reasons.plan.mesocycle'],
    title: 'Bloques (mesociclos)',
    keywords: ['bloque', 'mesociclo', 'semana 1', 'ciclo', 'periodizacion'],
    body: 'El plan se organiza en bloques de varias semanas. Empieza cerca del mínimo de volumen y, si te recuperas bien, añade series poco a poco. La última semana del bloque es de descarga. Después empieza otro bloque con cargas renovadas.',
  },
  {
    id: 'deload',
    reasons: ['reasons.plan.deload', 'reasons.adapt.plannedDeload', 'reasons.adapt.earlyDeload'],
    title: 'Semana de descarga',
    keywords: ['descarga', 'deload', 'menos series', 'semana facil', 'por que descargo'],
    body: 'En la descarga se hace la mitad de series y con más margen. Sirve para disipar la fatiga acumulada y llegar con energía al siguiente bloque: no pierdes lo conseguido. Si hay señales de fatiga o el rendimiento cae, Forja puede adelantarla.',
  },
  {
    id: 'calibration',
    reasons: ['reasons.plan.calibration'],
    title: 'Semana de calibración',
    keywords: ['calibracion', 'primera semana', 'que peso', 'peso inicial', 'no se que peso'],
    body: 'La primera semana no hay historial, así que eliges en cada ejercicio un peso que te deje 2-3 repeticiones en reserva. Con lo que registras, Forja estima tu nivel en cada ejercicio y calcula las cargas de las semanas siguientes.',
  },
  {
    id: 'rest',
    reasons: ['reasons.scheme.'],
    title: 'Descanso entre series',
    keywords: ['descanso', 'descansar', 'cuanto descanso', 'minutos entre series', 'temporizador'],
    body: 'Los básicos pesados necesitan más descanso (2-4 minutos) para rendir en la siguiente serie; los ejercicios de aislamiento, menos (1-1,5 minutos). Descansar demasiado poco reduce las repeticiones y el estímulo. Puedes alargar o acortar el temporizador 15 segundos.',
  },
  {
    id: 'superset',
    reasons: ['reasons.time.superset'],
    title: 'Superseries',
    keywords: ['superserie', 'biserie', 'sin descanso', 'dos ejercicios seguidos'],
    body: 'Una superserie alterna dos ejercicios que trabajan músculos distintos (por ejemplo, bíceps y tríceps) sin descansar entre ellos. Ahorra tiempo sin perder rendimiento, por eso Forja la usa cuando la sesión no cabe en tus minutos.',
  },
  {
    id: 'warmup',
    title: 'Calentamiento y series de aproximación',
    keywords: [
      'calentamiento',
      'calentar',
      'aproximacion',
      'series de aproximacion',
      'antes de empezar',
    ],
    body: 'Unos minutos de movilidad y cardio suave suben la temperatura y preparan las articulaciones. Después, en el primer ejercicio pesado, se hacen series de aproximación con poco peso (40 %, 60 % y 80 % aproximadamente) para ensayar la técnica antes de las series efectivas.',
  },
  {
    id: 'overload',
    title: 'Sobrecarga progresiva',
    keywords: [
      'sobrecarga',
      'progresiva',
      'como mejorar',
      'ganar fuerza',
      'ganar musculo',
      'estimulo',
    ],
    body: 'Para seguir mejorando, el estímulo tiene que aumentar poco a poco: más repeticiones, más peso o algo más de volumen. Forja lo gestiona con la doble progresión y el ajuste semanal del volumen. La constancia importa más que cualquier sesión aislada.',
  },
  {
    id: 'doms',
    title: 'Agujetas',
    keywords: ['agujetas', 'doms', 'dolor muscular', 'me duele el musculo', 'rigidez'],
    body: 'Las agujetas son molestias musculares que aparecen 24-72 horas después de un estímulo nuevo o intenso. Son normales al empezar y bajan con la costumbre; no indican que el entrenamiento haya sido mejor. Un dolor agudo, en una articulación o que no mejora no es agujeta: para y consulta con un profesional sanitario.',
  },
  {
    id: 'pain',
    title: 'Dolor y lesiones',
    keywords: [
      'dolor',
      'lesion',
      'molestia',
      'me duele',
      'rodilla',
      'hombro',
      'espalda',
      'lumbar',
      'codo',
      'muneca',
      'tobillo',
      'cadera',
      'cuello',
    ],
    body: 'Forja es una app de fitness, no de rehabilitación: no puede diagnosticar ni tratar. Si indicas una molestia, evita los ejercicios que más cargan esa zona. Si notas dolor (no solo esfuerzo) durante un ejercicio, para, cámbialo por una alternativa y, si persiste, consulta con un profesional sanitario.',
  },
  {
    id: 'substitution',
    reasons: ['reasons.selection.'],
    title: 'Cambiar un ejercicio',
    keywords: [
      'cambiar ejercicio',
      'sustituir',
      'alternativa',
      'no tengo',
      'maquina ocupada',
      'no me gusta',
    ],
    body: 'Cada ejercicio del plan trae alternativas compatibles con tu material y tus molestias, ordenadas por parecido. En la sesión puedes cambiarlo antes de empezar sus series; la carga se recalibra porque cada variante permite pesos distintos.',
  },
  {
    id: 'adaptation',
    reasons: ['reasons.adapt.'],
    title: 'Cómo se ajusta el plan cada semana',
    keywords: [
      'ajuste',
      'adapta',
      'cambia el plan',
      'semana siguiente',
      'check in',
      'por que ha cambiado',
    ],
    body: 'Cada lunes Forja revisa la semana anterior: sesiones completadas, esfuerzo de las sesiones, si tus básicos progresan y, si lo haces, el check-in (energía, sueño, fatiga y molestias). Con eso decide, con reglas fijas, si sube un poco el volumen, lo mantiene, lo baja o adelanta la descarga.',
  },
  {
    id: 'cardio',
    reasons: ['reasons.cardio.'],
    title: 'Cardio',
    keywords: [
      'cardio',
      'aerobico',
      'correr',
      'caminar',
      'oms',
      'minutos de cardio',
      'resistencia',
    ],
    body: 'La OMS recomienda 150-300 minutos semanales de actividad aeróbica moderada (o 75-150 intensa). Forja añade cardio al final de las sesiones si hay tiempo o te sugiere repartirlo en los días de descanso. Caminar a paso vivo también cuenta.',
  },
  {
    id: 'energy',
    title: 'Gasto energético',
    keywords: [
      'calorias',
      'kcal',
      'gasto',
      'metabolismo',
      'tdee',
      'basal',
      'comer',
      'dieta',
      'perder grasa',
    ],
    body: 'El gasto que muestra el plan es una estimación orientativa (fórmula de Mifflin-St Jeor y tu nivel de actividad). Para perder grasa suele bastar un déficit moderado y sostenido, manteniendo el entrenamiento de fuerza para conservar músculo. No es una pauta nutricional: para ajustar tu alimentación, consulta a un dietista-nutricionista.',
  },
  {
    id: 'sleep',
    title: 'Sueño y recuperación',
    keywords: [
      'sueno',
      'dormir',
      'recuperacion',
      'recuperar',
      'cansado',
      'fatiga',
      'descansar dias',
    ],
    body: 'El músculo se construye mientras te recuperas: dormir 7-9 horas, comer suficiente proteína y gestionar el estrés influyen tanto como el entrenamiento. Si llegas agotado, dilo en el check-in: el plan reducirá la carga esa semana.',
  },
  {
    id: 'technique',
    title: 'Técnica',
    keywords: ['tecnica', 'como se hace', 'postura', 'forma', 'hacerlo bien', 'errores'],
    body: 'La técnica va antes que el peso: recorrido completo y controlado, bajada sin prisa y sin rebotes. En la ficha de cada ejercicio tienes los pasos, los errores más comunes y consejos. Si una variante te resulta incómoda, cámbiala por una alternativa.',
  },
]

/** Entradas ordenadas por relevancia para una pregunta (0 = sin coincidencias). */
export function searchKnowledge(question: string, limit = 3) {
  const text = ` ${normalize(question)} `
  const words = new Set(
    text
      .trim()
      .split(' ')
      .filter((w) => w.length > 2),
  )
  return KNOWLEDGE.map((entry) => {
    let score = 0
    for (const keyword of entry.keywords) {
      const k = normalize(keyword)
      if (k.includes(' ') ? text.includes(` ${k} `) || text.includes(k) : words.has(k)) score += 2
      else if (k.length > 4 && [...words].some((w) => w.startsWith(k.slice(0, 5)))) score += 1
    }
    if (words.has(normalize(entry.id))) score += 2
    return { entry, score }
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

const HEALTH_WORDS =
  /\b(dolor|duele|duelen|lesion|lesionado|molestia|molestias|hernia|tendinitis|esguince|rotura|operacion|embarazo|embarazada|medicacion|mareo|pecho)\b/

/** ¿La pregunta toca salud o dolor? Entonces se añade siempre el aviso de consultar a un profesional. */
export function mentionsHealth(question: string) {
  return HEALTH_WORDS.test(normalize(question))
}
