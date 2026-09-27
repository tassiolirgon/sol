// Read-only derivations: levels, stages, discipline, class eligibility.
import {
  ATTRIBUTE_MAX_LEVEL, CATEGORIES, DISCIPLINE_BANDS, DISCIPLINE_CONFIDENCE, DISCIPLINE_WINDOW_DAYS,
  LEVEL_THRESHOLDS, MAX_LEVEL, PRESTIGE_STEP, STAGE_NAMES, STAGE_STARTS, attributeThreshold,
  type AttributeKey, type Category,
} from '../config'
import { CLASSES, classByKey, type ClassDef } from '../content'
import { addDays, diffDays, eachDay, weekday, type DateKey } from './dates'
import type { Mission, State } from './types'

// ---- Overall level ---------------------------------------------------------

export const levelThreshold = (level: number, prestige: number) =>
  Math.round(LEVEL_THRESHOLDS[level - 1] * (1 + PRESTIGE_STEP * prestige))

export const levelFromXp = (cycleXp: number, prestige: number) => {
  let level = 1
  while (level < MAX_LEVEL && cycleXp >= levelThreshold(level + 1, prestige)) level++
  return level
}

export const levelProgress = (s: State) => {
  const { level, prestige, totalXp, prestigeBaseXp } = s.profile
  const cycleXp = totalXp - prestigeBaseXp
  if (level >= MAX_LEVEL) return { level, into: 1, needed: 1, remaining: 0, max: true }
  const from = levelThreshold(level, prestige)
  const to = levelThreshold(level + 1, prestige)
  return { level, into: cycleXp - from, needed: to - from, remaining: to - cycleXp, max: false }
}

// ---- Attributes ------------------------------------------------------------

export const attrLevelFromXp = (xp: number) => {
  let level = 1
  while (level < ATTRIBUTE_MAX_LEVEL && xp >= attributeThreshold(level + 1)) level++
  return level
}

export const stageIndex = (level: number) => {
  let i = 0
  while (i + 1 < STAGE_STARTS.length && level >= STAGE_STARTS[i + 1]) i++
  return i
}
export const stageStart = (level: number) => STAGE_STARTS[stageIndex(level)]
export const stageName = (cat: Category, level: number) => STAGE_NAMES[cat][stageIndex(level)]

export const attrProgress = (xp: number, level: number) => {
  if (level >= ATTRIBUTE_MAX_LEVEL) return { into: 1, needed: 1 }
  const from = attributeThreshold(level)
  const to = attributeThreshold(level + 1)
  return { into: Math.max(0, xp - from), needed: to - from }
}

// ---- Scheduling ------------------------------------------------------------

// Whether a daily mission was expected on a given day (history-aware: paused
// missions stop counting from the day they were paused).
export const isScheduledOn = (m: Mission, day: DateKey) => {
  if (m.type !== 'diaria' || !m.recurrence) return false
  if (day < m.createdDate) return false
  if (m.status === 'pausada' && m.pausedDate && day >= m.pausedDate) return false
  return m.recurrence.includes(weekday(day))
}

export const completionsOn = (s: State, day: DateKey) => s.completions.filter((c) => c.date === day)

export const isDoneOn = (s: State, missionId: string, day: DateKey) =>
  s.completions.some((c) => c.missionId === missionId && c.date === day)

export const dailyMissionsFor = (s: State, day: DateKey) =>
  s.missions.filter((m) => m.status === 'ativa' && isScheduledOn(m, day))

// ---- Discipline (§7.2) -----------------------------------------------------

export const disciplineStats = (s: State, today: DateKey) => {
  const windowStart = addDays(today, -(DISCIPLINE_WINDOW_DAYS - 1))
  const from = s.profile.createdDate > windowStart ? s.profile.createdDate : windowStart
  let scheduled = 0
  let done = 0
  for (const day of eachDay(from, today)) {
    for (const m of s.missions) {
      if (!isScheduledOn(m, day)) continue
      const completed = isDoneOn(s, m.id, day)
      // Today only counts what is already done, so the day in progress never hurts.
      if (day === today && !completed) continue
      scheduled++
      if (completed) done++
    }
  }
  const trackedDays = diffDays(today, from) + 1
  const rate = scheduled > 0 ? done / scheduled : null
  return { rate, scheduled, done, trackedDays, fullWindow: trackedDays >= DISCIPLINE_WINDOW_DAYS }
}

export const disciplineFromRate = (rate: number) => {
  const band = DISCIPLINE_BANDS.find((b) => rate < b.maxRate) ?? DISCIPLINE_BANDS[DISCIPLINE_BANDS.length - 1]
  const t = (Math.min(rate, band.maxRate) - band.minRate) / (band.maxRate - band.minRate)
  return Math.round(band.minLevel + t * (band.maxLevel - band.minLevel))
}

export const disciplineLevel = (s: State, today: DateKey) => {
  const { rate, trackedDays } = disciplineStats(s, today)
  if (rate === null) return 1
  const raw = disciplineFromRate(rate)
  const confidence = DISCIPLINE_CONFIDENCE ? Math.min(1, trackedDays / DISCIPLINE_WINDOW_DAYS) : 1
  return Math.max(1, Math.round(raw * confidence))
}

export const allAttributeLevels = (s: State, today: DateKey): Record<AttributeKey, number> => ({
  saude: s.attributes.saude.level,
  sabedoria: s.attributes.sabedoria.level,
  espiritualidade: s.attributes.espiritualidade.level,
  prosperidade: s.attributes.prosperidade.level,
  disciplina: disciplineLevel(s, today),
})

// ---- Classes (§8) ----------------------------------------------------------

export const classCheck = (s: State, today: DateKey, c: ClassDef) => {
  const levels = allAttributeLevels(s, today)
  const disc = disciplineStats(s, today)
  const levelOk = s.profile.level >= c.minLevel
  const attrsOk = Object.entries(c.attrs ?? {}).every(([k, v]) => levels[k as AttributeKey] >= (v ?? 0))
  const allOk = c.allAttrs === undefined || Object.values(levels).every((v) => v >= c.allAttrs!)
  const rateOk = c.rate === undefined || (disc.fullWindow && (disc.rate ?? 0) >= c.rate)
  return levelOk && attrsOk && allOk && rateOk
}

export const eligibleClasses = (s: State, today: DateKey) =>
  CLASSES.filter((c) => c.tier > 0 && classCheck(s, today, c))

// Best class above the current tier that the user has not already declined.
export const suggestedClass = (s: State, today: DateKey): ClassDef | null => {
  const currentTier = classByKey(s.profile.classKey).tier
  const declined = new Set(s.classHistory.filter((h) => h.declinedDate).map((h) => h.key))
  const levels = allAttributeLevels(s, today)
  const score = (c: ClassDef) =>
    Object.keys(c.attrs ?? {}).reduce((sum, k) => sum + levels[k as AttributeKey], 0) + (c.allAttrs ? 1000 : 0)
  const candidates = eligibleClasses(s, today)
    .filter((c) => c.tier > currentTier && !declined.has(c.key))
    .sort((a, b) => b.tier - a.tier || score(b) - score(a))
  return candidates[0] ?? null
}

// Categories that currently have at least one active daily mission.
export const activeCategories = (s: State) =>
  CATEGORIES.filter((c) => s.missions.some((m) => m.type === 'diaria' && m.status === 'ativa' && m.category === c))

export const bossProgress = (s: State, m: Mission) => {
  if (!m.period || !m.target) return { done: 0, count: 0 }
  const { start, end } = m.period
  const done = s.completions.filter((c) => {
    if (c.date < start || c.date > end || c.category !== m.target!.category) return false
    const src = s.missions.find((x) => x.id === c.missionId)
    return src !== undefined && (src.type === 'diaria' || src.type === 'pessoal')
  }).length
  return { done: Math.min(done, m.target.count), count: m.target.count }
}
