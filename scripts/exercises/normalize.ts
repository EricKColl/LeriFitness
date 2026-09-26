/**
 * Normalización de free-exercise-db al vocabulario de Forja e inferencia de etiquetas.
 * Las reglas son deterministas; los casos que fallan se corrigen en `overrides.ts`.
 */
import type {
  Category,
  Equipment,
  InjuryZone,
  Level,
  Muscle,
  Pattern,
  StressLevel,
} from '../../src/domain'

import type { SourceExercise } from './source'

export function slugify(sourceId: string) {
  return sourceId
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const has = (name: string, re: RegExp) => re.test(name)

export function mapCategory(category: string): Category {
  switch (category) {
    case 'olympic weightlifting':
      return 'olympic'
    case 'strength':
    case 'powerlifting':
    case 'strongman':
    case 'plyometrics':
    case 'cardio':
    case 'stretching':
      return category
    default:
      throw new Error(`Categoría desconocida: ${category}`)
  }
}

export function mapLevel(level: SourceExercise['level']): Level {
  return level === 'expert' ? 'advanced' : level
}

// ---------------------------------------------------------------------------
// Patrón de movimiento
// ---------------------------------------------------------------------------

export function inferPattern(src: SourceExercise): Pattern {
  const n = src.name.toLowerCase()
  const pm = src.primaryMuscles[0]
  const category = mapCategory(src.category)

  if (category === 'stretching' || src.equipment === 'foam roll' || has(n, /\bsmr\b/))
    return 'mobility'
  if (category === 'cardio') return 'cardio'
  if (category === 'plyometrics') return 'plyometric'
  if (category === 'strongman') return has(n, /farmer|carry|yoke/) ? 'carry' : 'other'
  if (has(n, /battling ropes/)) return 'cardio'
  if (category === 'olympic' || has(n, /\b(clean|snatch|jerk)\b/)) {
    if (has(n, /shrug/)) return 'shrug'
    if (has(n, /deadlift|pull\b|stiff legs/) && !has(n, /high pull/)) return 'hinge'
    if (has(n, /squat/)) return 'squat'
    if (has(n, /\bpress\b|push press|jerk dip/) && !has(n, /clean|snatch/)) return 'verticalPush'
    return 'olympic'
  }

  if (pm === 'neck' || has(n, /neck (exercise|resistance)|head harness/)) return 'neck'
  if (has(n, /farmer|carry|suitcase/)) return 'carry'
  if (has(n, /turkish get-up|pirate ships|bent press|hip flexion|^iron cross|incline shoulder raise/))
    return 'other'
  if (has(n, /shrug/)) return 'shrug'
  if (pm === 'calves' || has(n, /calf|calves|heel raise|toe raise/)) return 'calfRaise'
  if (has(n, /leg extension/)) return 'kneeExtension'
  if (has(n, /leg curl|hamstring curl|glute ham raise|nordic|ball leg curl/)) return 'kneeFlexion'
  if (pm === 'abductors' || has(n, /abduct/)) return 'hipAbduction'
  if (pm === 'adductors' || has(n, /adduct/)) return 'hipAdduction'

  if (
    pm === 'triceps' &&
    !has(n, /bench press|push-?up|\bdips?\b|floor press|board press|pin press|close-grip (dumbbell|ez-bar) press/)
  )
    return 'elbowExtension'
  if (pm === 'biceps' || (has(n, /curl/) && pm !== 'forearms' && pm !== 'hamstrings'))
    return 'elbowFlexion'
  if (pm === 'forearms') return 'wrist'

  if (
    (pm === 'glutes' || pm === 'hamstrings') &&
    has(n, /hip thrust|bridge|kickback|kick back|donkey kick|hip extension|pull[- ]?through|reverse hyper|hip lift|butt lift|glute/)
  )
    return 'hipExtension'
  if (has(n, /kneeling squat/)) return 'hipExtension'
  if (has(n, /floor glute-ham/)) return 'kneeFlexion'
  if (has(n, /deadlift|good ?morning|\brdl\b|romanian|stiff[- ]leg|hyperextension|back extension|swing|rack pull|superman|pull[- ]?through/))
    return 'hinge'
  if (has(n, /lunge|split squat|step[- ]?up|pistol|bulgarian|single[- ]leg squat|one[- ]leg squat|scissor/))
    return 'lunge'
  if (has(n, /squat|leg press|hack|wall sit|sissy/)) return 'squat'

  if (has(n, /pullover/)) return 'pullover'
  if (has(n, /internal rotation/)) return 'other'
  if (
    has(n, /face pull|rear[- ]delt|reverse .*fl(y|ye)|back fl(y|ye)|reverse pec|rear lateral|bent[- ]over.*(raise|fly|flye)|reverse cable crossover|row to neck|external rotation|pull apart/)
  )
    return 'rearDelt'
  if (has(n, /front .*raise|front raise|front delt raise|front two/)) return 'frontRaise'
  if (has(n, /lateral raise|side lateral|side raise|lateral delt|upright .*row|upright row|\blateral\b.*raise|y[- ]raise/))
    return 'lateralRaise'
  if (has(n, /\bfl(y|ye|yes)\b|cross ?over|pec deck|butterfly|around the worlds/)) return 'chestFly'
  if (has(n, /\bdips?\b/) && !has(n, /\bhip/)) return 'dip'

  if (pm === 'abdominals') {
    if (has(n, /side bend|side plank|side bridge|side jack|windmill|side crunch/)) return 'coreLateral'
    if (has(n, /plank|rollout|roll-out|ab roller|wheel|dead bug|hollow|body saw|l-sit|stir the pot|ab ball|bird dog|fallout|ball pull-in|spider crawl/))
      return 'coreAntiExtension'
    if (has(n, /twist|russian|woodchop|wood chop|chop|rotation|pallof|windshield|landmine 180|oblique|judo flip|cable lift|figure 8|pass between|spell caster/))
      return 'coreRotation'
    return 'coreFlexion'
  }

  if (has(n, /pull[- ]?up|chin[- ]?up|\bchins?\b|pulldown|pull[- ]?down|muscle[- ]?up/)) return 'verticalPull'
  if (has(n, /\brow\b|rows\b|rowing/)) return 'horizontalPull'

  if (pm === 'shoulders') {
    if (src.force === 'pull') return 'rearDelt'
    if (has(n, /\bpress\b|push press|arnold|handstand|military|jerk/)) return 'verticalPush'
    if (src.mechanic === 'isolation') return 'lateralRaise'
    return 'verticalPush'
  }
  if (pm === 'chest') return src.mechanic === 'isolation' ? 'chestFly' : 'horizontalPush'
  if (has(n, /bench press|push-?up|chest press|floor press|board press|pin press|close-grip .*press/))
    return 'horizontalPush'
  if (pm === 'lats') return has(n, /\brow/) ? 'horizontalPull' : 'verticalPull'
  if (pm === 'middle back') return 'horizontalPull'
  if (pm === 'traps') return 'shrug'
  if (pm === 'lower back') return 'hinge'
  if (pm === 'quadriceps') return 'squat'
  if (pm === 'hamstrings') return src.mechanic === 'isolation' ? 'kneeFlexion' : 'hinge'
  if (pm === 'glutes') return 'hipExtension'
  return 'other'
}

// ---------------------------------------------------------------------------
// Músculos
// ---------------------------------------------------------------------------

function deltoidFor(pattern: Pattern, force: SourceExercise['force']): Muscle {
  switch (pattern) {
    case 'lateralRaise':
      return 'sideDelts'
    case 'rearDelt':
    case 'horizontalPull':
    case 'verticalPull':
      return 'rearDelts'
    case 'frontRaise':
    case 'verticalPush':
    case 'horizontalPush':
    case 'chestFly':
    case 'dip':
      return 'frontDelts'
    default:
      return force === 'pull' ? 'rearDelts' : 'frontDelts'
  }
}

function mapMuscle(muscle: string, src: SourceExercise, pattern: Pattern): Muscle[] {
  const n = src.name.toLowerCase()
  switch (muscle) {
    case 'abdominals':
      return has(n, /oblique|twist|side bend|russian|woodchop|wood chop|side plank|windmill|side jack|landmine 180/)
        ? ['obliques']
        : ['abs']
    case 'shoulders': {
      const head = deltoidFor(pattern, src.force)
      // Los presses por encima de la cabeza también trabajan de forma notable el deltoides lateral.
      return pattern === 'verticalPush' ? [head, 'sideDelts'] : [head]
    }
    case 'middle back':
      return ['upperBack']
    case 'lower back':
      return ['lowerBack']
    case 'quadriceps':
      return ['quads']
    case 'chest':
    case 'biceps':
    case 'triceps':
    case 'forearms':
    case 'lats':
    case 'traps':
    case 'neck':
    case 'glutes':
    case 'hamstrings':
    case 'calves':
    case 'adductors':
    case 'abductors':
      return [muscle]
    default:
      throw new Error(`Músculo desconocido: ${muscle}`)
  }
}

export function mapMuscles(src: SourceExercise, pattern: Pattern) {
  const primary = [...new Set(src.primaryMuscles.flatMap((m) => mapMuscle(m, src, pattern)))]
  // En los presses verticales el deltoides lateral cuenta como secundario, no principal.
  const primaryFinal = pattern === 'verticalPush' ? primary.filter((m) => m !== 'sideDelts') : primary
  const extraSecondary: Muscle[] = pattern === 'verticalPush' ? ['sideDelts', 'triceps'] : []
  const secondary = [
    ...new Set([...src.secondaryMuscles.flatMap((m) => mapMuscle(m, src, pattern)), ...extraSecondary]),
  ].filter((m) => !primaryFinal.includes(m))
  return { primaryMuscles: primaryFinal, secondaryMuscles: secondary }
}

// ---------------------------------------------------------------------------
// Material
// ---------------------------------------------------------------------------

export function mapEquipment(src: SourceExercise, pattern: Pattern): Equipment[] {
  const n = src.name.toLowerCase()
  const items = new Set<Equipment>()
  const needsBench = has(n, /bench|incline|decline|lying|prone|preacher|seated.*(dumbbell|barbell)|(dumbbell|barbell).*seated|hip thrust|pullover|tate press|spider curl/)

  switch (src.equipment) {
    case 'barbell':
      items.add('barbell')
      if (has(n, /squat|bench press|overhead press|military|shoulder press|push press|rack|good ?morning|lunge|split squat|floor press|pin press|board press/) && !has(n, /landmine|jefferson|zercher|hack/))
        items.add('rack')
      if (needsBench) items.add('bench')
      break
    case 'e-z curl bar':
      items.add('ezBar')
      if (needsBench) items.add('bench')
      break
    case 'dumbbell':
      items.add('dumbbell')
      if (needsBench || has(n, /\bfly|flye|chest press|one[- ]arm dumbbell row|seated/)) items.add('bench')
      break
    case 'kettlebells':
      items.add('kettlebell')
      break
    case 'cable':
      items.add('cable')
      if (has(n, /bench|incline|decline|lying/)) items.add('bench')
      break
    case 'machine':
      items.add('machine')
      break
    case 'bands':
      items.add('bands')
      break
    case 'medicine ball':
      items.add('medicineBall')
      break
    case 'exercise ball':
      items.add('stabilityBall')
      break
    case 'foam roll':
      items.add('foamRoller')
      break
    case 'body only':
    case null:
      items.add('bodyweight')
      if (has(n, /bench|incline|decline/) && !has(n, /stretch/)) items.add('bench')
      break
    case 'other':
      if (has(n, /smith/)) items.add('machine')
      else if (has(n, /landmine|plate|trap bar/)) items.add('barbell')
      else if (has(n, /\bbox\b|platform/)) items.add('box')
      else if (has(n, /band/)) items.add('bands')
      else items.add('other')
      if (has(n, /bench|incline|decline/)) items.add('bench')
      break
    default:
      throw new Error(`Material desconocido: ${src.equipment}`)
  }

  if (pattern === 'verticalPull' && has(n, /pull[- ]?up|chin[- ]?up|muscle[- ]?up/) && !has(n, /band assisted|machine|assisted/))
    items.add('pullupBar')
  if (has(n, /hanging|toes to bar|knees to/)) items.add('pullupBar')
  if (pattern === 'dip' && !has(n, /bench dip|dip on bench|between benches/) && src.equipment !== 'machine')
    items.add('dipStation')
  if (pattern === 'dip' && has(n, /bench dip|between benches/)) items.add('bench')
  if (has(n, /box jump|box squat|step[- ]?up|depth jump/)) items.add('box')

  // Si solo queda «bodyweight» pero hay otro material, sobra.
  if (items.size > 1) items.delete('bodyweight')
  return [...items].sort()
}

// ---------------------------------------------------------------------------
// Estrés articular (base de las contraindicaciones por lesión)
// ---------------------------------------------------------------------------

type Stress = Partial<Record<InjuryZone, StressLevel>>

const RANK: Record<StressLevel, number> = { low: 1, moderate: 2, high: 3 }

function raise(stress: Stress, zone: InjuryZone, level: StressLevel) {
  const current = stress[zone]
  if (!current || RANK[level] > RANK[current]) stress[zone] = level
}

function lower(stress: Stress, zone: InjuryZone, level: StressLevel) {
  const current = stress[zone]
  if (current && RANK[level] < RANK[current]) stress[zone] = level
}

const BASE_STRESS: Partial<Record<Pattern, Stress>> = {
  squat: { knee: 'moderate', hip: 'moderate', lowerBack: 'moderate', ankle: 'low' },
  hinge: { lowerBack: 'high', hip: 'moderate', knee: 'low' },
  lunge: { knee: 'moderate', hip: 'moderate', ankle: 'moderate', lowerBack: 'low' },
  hipExtension: { hip: 'low', lowerBack: 'low', knee: 'low' },
  kneeExtension: { knee: 'moderate' },
  kneeFlexion: { knee: 'moderate' },
  calfRaise: { ankle: 'moderate' },
  hipAbduction: { hip: 'moderate' },
  hipAdduction: { hip: 'moderate' },
  horizontalPush: { shoulder: 'moderate', elbow: 'low', wrist: 'low' },
  verticalPush: { shoulder: 'high', elbow: 'moderate', wrist: 'low', lowerBack: 'low' },
  chestFly: { shoulder: 'moderate', elbow: 'low' },
  dip: { shoulder: 'high', elbow: 'moderate', wrist: 'moderate' },
  horizontalPull: { shoulder: 'low', elbow: 'low', lowerBack: 'low' },
  verticalPull: { shoulder: 'moderate', elbow: 'moderate', wrist: 'low' },
  pullover: { shoulder: 'moderate', elbow: 'low' },
  shrug: { neck: 'moderate', shoulder: 'low' },
  lateralRaise: { shoulder: 'moderate' },
  frontRaise: { shoulder: 'moderate' },
  rearDelt: { shoulder: 'low' },
  elbowFlexion: { elbow: 'moderate', wrist: 'low' },
  elbowExtension: { elbow: 'moderate', shoulder: 'low' },
  wrist: { wrist: 'high', elbow: 'low' },
  coreFlexion: { lowerBack: 'moderate', neck: 'low' },
  coreAntiExtension: { lowerBack: 'low', shoulder: 'low' },
  coreRotation: { lowerBack: 'moderate' },
  coreLateral: { lowerBack: 'moderate' },
  carry: { lowerBack: 'moderate', wrist: 'low', shoulder: 'low', knee: 'low' },
  neck: { neck: 'high' },
  olympic: { wrist: 'high', shoulder: 'high', lowerBack: 'high', knee: 'moderate', elbow: 'moderate', hip: 'moderate' },
  cardio: { knee: 'low', ankle: 'low' },
  mobility: {},
  other: { lowerBack: 'moderate' },
}

export function inferJointStress(src: SourceExercise, pattern: Pattern, primary: Muscle[]): Stress {
  const n = src.name.toLowerCase()
  const stress: Stress = { ...BASE_STRESS[pattern] }
  const lowerBody = primary.some((m) => ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'].includes(m))

  if (pattern === 'plyometric') {
    if (lowerBody || has(n, /jump|hop|bound|skip|lunge|squat|box/)) {
      Object.assign(stress, { knee: 'high', ankle: 'high', hip: 'moderate', lowerBack: 'moderate' })
    } else {
      Object.assign(stress, { shoulder: 'high', wrist: 'high', elbow: 'moderate', lowerBack: 'moderate' })
    }
  }

  if (pattern === 'cardio') {
    if (has(n, /run|jog|sprint|stairs|stair|step mill|jump rope|rope jump|skipping/))
      Object.assign(stress, { knee: 'moderate', ankle: 'moderate', hip: 'low' })
    if (has(n, /jump rope|rope jump/)) raise(stress, 'ankle', 'high')
    if (has(n, /row/)) Object.assign(stress, { lowerBack: 'moderate', knee: 'low' })
    if (has(n, /bicycl|bike|cycling|elliptical|recumbent/)) Object.assign(stress, { knee: 'low', ankle: 'low' })
  }

  // Modificadores por palabras clave
  if (has(n, /behind the neck|behind neck/)) {
    raise(stress, 'shoulder', 'high')
    raise(stress, 'neck', 'moderate')
  }
  if (has(n, /jump|jumping|hop|bound/) && pattern !== 'mobility') {
    raise(stress, 'knee', 'high')
    raise(stress, 'ankle', 'high')
  }
  if (has(n, /overhead squat|overhead lunge/)) {
    raise(stress, 'shoulder', 'high')
    raise(stress, 'lowerBack', 'high')
  }
  if (has(n, /front squat|clean/)) raise(stress, 'wrist', 'moderate')
  if (has(n, /deficit|good ?morning|stiff[- ]leg|jefferson|zercher/)) raise(stress, 'lowerBack', 'high')
  if (pattern === 'squat' && has(n, /barbell|back squat/) && !has(n, /front/)) raise(stress, 'lowerBack', 'moderate')
  if (pattern === 'squat' && has(n, /leg press|hack|machine|smith|goblet|wall sit|bodyweight|body weight|box squat|dumbbell/))
    lower(stress, 'lowerBack', 'low')
  if (has(n, /pistol|sissy|single[- ]leg squat|one[- ]leg squat|deep squat/)) raise(stress, 'knee', 'high')
  if (has(n, /hyperextension|back extension|superman|swing|pull[- ]?through|reverse hyper/))
    stress.lowerBack = has(n, /pull[- ]?through/) ? 'low' : 'moderate'
  if (pattern === 'horizontalPull' && has(n, /bent[- ]over|bent over|pendlay|t-bar|yates|barbell row|upright/) && !has(n, /chest|supported|incline|seated|lying/))
    raise(stress, 'lowerBack', 'high')
  if (pattern === 'horizontalPull' && has(n, /seated|chest|supported|lying|incline|machine|inverted/))
    lower(stress, 'lowerBack', 'low')
  if (has(n, /push-?up|press-?up/) && !has(n, /knuckle|dumbbell|handle/)) {
    raise(stress, 'wrist', 'moderate')
    raise(stress, 'shoulder', 'moderate')
  }
  if (has(n, /plyo|clap/)) {
    raise(stress, 'wrist', 'high')
    raise(stress, 'shoulder', 'high')
  }
  if (has(n, /close[- ]grip/) && pattern === 'horizontalPush') {
    raise(stress, 'elbow', 'moderate')
    raise(stress, 'wrist', 'moderate')
  }
  if (has(n, /handstand/)) {
    raise(stress, 'wrist', 'high')
    raise(stress, 'shoulder', 'high')
    raise(stress, 'neck', 'moderate')
  }
  if (has(n, /upright row/)) {
    raise(stress, 'shoulder', 'high')
    raise(stress, 'wrist', 'moderate')
  }
  if (has(n, /skull ?crusher|lying triceps|french press|lying.*extension|tate press|jm press/))
    raise(stress, 'elbow', 'high')
  if (pattern === 'elbowExtension' && has(n, /overhead|french/)) raise(stress, 'shoulder', 'moderate')
  if (has(n, /muscle[- ]?up|kipping/)) {
    raise(stress, 'shoulder', 'high')
    raise(stress, 'elbow', 'high')
  }
  if (pattern === 'elbowFlexion' && has(n, /barbell/) && !has(n, /ez|e-z/)) raise(stress, 'wrist', 'moderate')
  if (has(n, /hanging/)) raise(stress, 'shoulder', 'moderate')
  if (has(n, /sit-?up|v-?up|jackknife/)) raise(stress, 'lowerBack', 'moderate')
  if (pattern === 'coreFlexion' && has(n, /crunch/) && !has(n, /reverse|decline/)) lower(stress, 'lowerBack', 'low')
  if (pattern === 'coreAntiExtension' && has(n, /rollout|roll-out|ab roller|wheel|body saw/)) {
    raise(stress, 'lowerBack', 'high')
    raise(stress, 'shoulder', 'moderate')
  }
  if (pattern === 'coreAntiExtension' && has(n, /plank/) && has(n, /push|hand|arm/)) raise(stress, 'wrist', 'moderate')
  if (pattern === 'coreRotation' && has(n, /pallof|anti/)) lower(stress, 'lowerBack', 'low')
  if (pattern === 'coreLateral' && has(n, /side plank/)) {
    lower(stress, 'lowerBack', 'low')
    raise(stress, 'shoulder', 'moderate')
  }
  if (has(n, /leg press/)) {
    stress.knee = 'moderate'
    stress.lowerBack = 'moderate'
  }
  if (has(n, /step[- ]?up/)) stress.ankle = 'low'
  if (has(n, /walking lunge|jumping lunge|lunge jump/)) raise(stress, 'knee', 'high')
  if (has(n, /atlas|tire|log lift|keg|stone|axle|car deadlift|conan/)) raise(stress, 'lowerBack', 'high')
  if (has(n, /sprint|sled|prowler/)) {
    raise(stress, 'knee', 'moderate')
    raise(stress, 'hip', 'moderate')
    raise(stress, 'ankle', 'moderate')
  }
  if (has(n, /machine|smith/) && pattern === 'verticalPush') stress.lowerBack = 'low'
  if (has(n, /standing/) && pattern === 'verticalPush' && has(n, /barbell|military/)) raise(stress, 'lowerBack', 'moderate')

  if (src.category === 'strongman') raise(stress, 'lowerBack', 'high')
  if (pattern === 'mobility') {
    for (const zone of Object.keys(stress) as InjuryZone[]) stress[zone] = 'low'
  }

  // Ordenar las claves para una salida estable.
  return Object.fromEntries(Object.entries(stress).sort(([a], [b]) => a.localeCompare(b))) as Stress
}

export function inferUnilateral(src: SourceExercise, pattern: Pattern) {
  const n = src.name.toLowerCase()
  return (
    pattern === 'lunge' ||
    has(n, /one[- ]arm|single[- ]arm|one[- ]leg|single[- ]leg|alternat|unilateral|one[- ]handed|single[- ]handed|kneeling one|side plank|suitcase/)
  )
}
