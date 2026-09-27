// Single source of balancing values (SPEC §2.2.5). Nothing below should be
// duplicated elsewhere in the code. Items marked [PROPOSTO] come from the spec's
// provisional defaults and are expected to be rebalanced.

export type Category = 'saude' | 'sabedoria' | 'espiritualidade' | 'prosperidade'
export type AttributeKey = Category | 'disciplina'
export type Difficulty = 'simples' | 'moderada' | 'dificil'
export type MissionType = 'diaria' | 'pessoal' | 'boss_semanal' | 'boss_mensal' | 'epica' | 'lendaria' | 'classe'

export const CATEGORIES: Category[] = ['saude', 'sabedoria', 'espiritualidade', 'prosperidade']
export const ATTRIBUTES: AttributeKey[] = ['saude', 'sabedoria', 'espiritualidade', 'prosperidade', 'disciplina']

export const ATTRIBUTE_INFO: Record<AttributeKey, { name: string; short: string; color: string }> = {
  saude: { name: 'Saúde', short: 'HP', color: '#E0775A' },
  sabedoria: { name: 'Sabedoria', short: 'INT', color: '#5B8DEF' },
  espiritualidade: { name: 'Espiritualidade', short: 'ESP', color: '#A07CE0' },
  prosperidade: { name: 'Prosperidade', short: 'PRO', color: '#4DB88A' },
  disciplina: { name: 'Disciplina', short: 'DIS', color: '#B8BCC8' },
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  simples: 'simples',
  moderada: 'moderada',
  dificil: 'difícil',
}

// §6.1 — official ranges. The code picks the value inside the range; anything
// outside is rejected by `priceMission`.
export const XP_RANGES = {
  diaria: { simples: [10, 30], moderada: [30, 60], dificil: [60, 100] },
  pessoal: [15, 40],
  boss_semanal: [200, 400],
  boss_mensal: [400, 800],
  epica: [500, 1000],
  lendaria: [2000, Infinity],
  life_update: 150,
} as const

// Point picked inside each range when no finer signal exists.
export const XP_PICK = {
  diaria: { simples: 20, moderada: 45, dificil: 80 },
  pessoal: { simples: 20, moderada: 30, dificil: 40 },
  boss_semanal: 300,
  boss_mensal: 600,
}

// §6.2
export const MULTIPLIERS = {
  firstCompletion: 1.5,
  streak7: 1.5,
  streak30: 2,
  earlyBird: 1.2,
  earlyBirdHour: 9,
  cap: 3, // [PROPOSTO]
  dayCompleteBonus: 100,
  recoveryAttribute: 2,
  recoveryDays: 7,
}

// §6.4 — cumulative total XP to reach each level (index = level - 1).
export const LEVEL_THRESHOLDS = [
  0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000, 36000,
  50000, 67000, 88000, 115000, 148000, 190000, 242000, 306000, 385000, 480000,
]
export const MAX_LEVEL = LEVEL_THRESHOLDS.length

// §12 [PROPOSTO] — prestige P requires table * (1 + 0.2 * P).
export const PRESTIGE_STEP = 0.2
export const PRESTIGE: { name: string; symbol: string }[] = [
  { name: 'O Renascido', symbol: '✦' },
  { name: 'O Forjado', symbol: '✦✦' },
  { name: 'O Eterno', symbol: '✦✦✦' },
  { name: 'O Imortal', symbol: '✦✦✦✦' },
  { name: 'O Além', symbol: '✦✦✦✦✦' },
]

// §7.3 [PROPOSTO] — cumulative attribute XP to reach level n = 50 * n^1.6.
export const ATTRIBUTE_MAX_LEVEL = 100
export const attributeThreshold = (level: number) => (level <= 1 ? 0 : Math.round(50 * Math.pow(level, 1.6)))

// §7.1 — stage start levels; also the consolidated decay floors.
export const STAGE_STARTS = [1, 6, 16, 31, 51, 76]
export const STAGE_NAMES: Record<Category, string[]> = {
  saude: ['Sedentário', 'Ativo', 'Atlético', 'Resistente', 'Inabalável', 'Corpo de Aço'],
  sabedoria: ['Curioso', 'Estudante', 'Analítico', 'Pensador', 'Erudito', 'Sábio'],
  espiritualidade: ['Buscador', 'Fiel', 'Devoto', 'Enraizado', 'Guiado', 'Ungido'],
  prosperidade: ['Endividado', 'Organizado', 'Poupador', 'Investidor', 'Acumulador', 'Próspero'],
}

// §7.2 — completion rate bands → discipline level range (interpolated inside).
export const DISCIPLINE_BANDS: { minRate: number; maxRate: number; minLevel: number; maxLevel: number }[] = [
  { minRate: 0, maxRate: 0.3, minLevel: 1, maxLevel: 10 },
  { minRate: 0.3, maxRate: 0.5, minLevel: 11, maxLevel: 25 },
  { minRate: 0.5, maxRate: 0.7, minLevel: 26, maxLevel: 50 },
  { minRate: 0.7, maxRate: 0.85, minLevel: 51, maxLevel: 75 },
  { minRate: 0.85, maxRate: 0.95, minLevel: 76, maxLevel: 90 },
  { minRate: 0.95, maxRate: 1, minLevel: 91, maxLevel: 100 },
]
export const DISCIPLINE_WINDOW_DAYS = 30
// [PROPOSTO] Discipline is scaled by how much of the window has data, so a
// single perfect first day does not produce Disciplina 100.
export const DISCIPLINE_CONFIDENCE = true

// §11.1
export const DECAY = {
  warnDay: 11,
  startDay: 14,
  perDay: 1,
  maxPerCycle: 15,
}
export const MISSION_PAUSE_DAYS = 14
export const MAX_ALERTS_PER_DAY = 2
