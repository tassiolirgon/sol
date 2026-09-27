// State transitions. Every write to XP, level, attribute and class happens
// here (the future server-side `complete-mission`, `attribute-decay`, etc.).
// Nothing in this file ever subtracts total XP or lowers the overall level.
import {
  ATTRIBUTE_INFO, CATEGORIES, DECAY, MAX_ALERTS_PER_DAY, MAX_LEVEL, MISSION_PAUSE_DAYS,
  MULTIPLIERS, PRESTIGE, PRESTIGE_STEP, XP_PICK, XP_RANGES, attributeThreshold, type Category, type Difficulty,
} from '../config'
import { classByKey } from '../content'
import { priceMission } from './classify'
import { addDays, dateKey, diffDays, eachDay, formatShort, monthEnd, monthStart, weekEnd, weekStart, type DateKey } from './dates'
import {
  activeCategories, attrLevelFromXp, bossProgress, classCheck, dailyMissionsFor, isDoneOn, isScheduledOn,
  levelFromXp, stageName, stageStart, suggestedClass,
} from './progression'
import type { AttributeState, EngineEvent, Mission, State, SystemAction } from './types'

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function createInitialState(name: string, now: Date): State {
  const today = dateKey(now)
  const attr = (): AttributeState => ({ xp: 0, level: 1, lastActivityDate: today, decayApplied: 0, floor: 1 })
  return {
    version: 1,
    onboarded: true,
    profile: {
      name: name.trim(), createdDate: today, level: 1, totalXp: 0, prestige: 0, prestigeBaseXp: 0,
      classKey: 'despertado', mode: 'arquiteto',
    },
    attributes: { saude: attr(), sabedoria: attr(), espiritualidade: attr(), prosperidade: attr() },
    missions: [],
    completions: [],
    streak: { current: 0, longest: 0, lastActiveDate: null },
    perfectDays: [],
    achievements: {},
    classHistory: [],
    classSuggestion: null,
    actions: [],
    lastProcessedDate: today,
  }
}

// ---- Missions --------------------------------------------------------------

export type NewMission = {
  title: string
  category: Category
  difficulty: Difficulty
  recurrence: number[] | null
}

export function addMission(prev: State, input: NewMission, now: Date): { state: State; mission: Mission } {
  const s = structuredClone(prev)
  const type = input.recurrence ? 'diaria' : 'pessoal'
  const mission: Mission = {
    id: uid(),
    title: input.title.trim(),
    category: input.category,
    difficulty: input.difficulty,
    type,
    xp: priceMission(type, input.difficulty),
    source: 'user',
    status: 'ativa',
    recurrence: input.recurrence ?? undefined,
    createdDate: dateKey(now),
  }
  s.missions.push(mission)
  return { state: s, mission }
}

export function setMissionPaused(prev: State, id: string, paused: boolean, now: Date): State {
  const s = structuredClone(prev)
  const m = s.missions.find((x) => x.id === id)
  if (!m || m.type !== 'diaria') return prev
  m.status = paused ? 'pausada' : 'ativa'
  m.pausedDate = paused ? dateKey(now) : undefined
  return s
}

// ---- Completing ------------------------------------------------------------

export type CompleteResult = { state: State; events: EngineEvent[]; xp: number; attrXp: number; multipliers: string[] }

export function canComplete(s: State, m: Mission, today: DateKey): string | null {
  if (m.status !== 'ativa') return 'Missão não está ativa.'
  if (m.type === 'diaria') {
    if (!isScheduledOn(m, today)) return 'Esta missão não está programada para hoje.'
    if (isDoneOn(s, m.id, today)) return 'Já concluída hoje.'
    return null
  }
  if (m.type === 'boss_semanal' || m.type === 'boss_mensal') {
    if (!m.period || today < m.period.start || today > m.period.end) return 'Este boss já expirou.'
    const p = bossProgress(s, m)
    if (p.done < p.count) return `O Sistema ainda não confirma: ${p.done}/${p.count}.`
  }
  return null
}

export function completeMission(prev: State, missionId: string, now: Date): CompleteResult {
  const s = structuredClone(prev)
  const today = dateKey(now)
  const m = s.missions.find((x) => x.id === missionId)
  if (!m) throw new Error('Missão inexistente.')
  const blocked = canComplete(s, m, today)
  if (blocked) throw new Error(blocked)

  const events: EngineEvent[] = []
  const levelBefore = s.profile.level
  const isBoss = m.type === 'boss_semanal' || m.type === 'boss_mensal'

  updateStreak(s, today, now, events)

  // Multipliers (§6.2). Bosses pay their flat value.
  const multipliers: string[] = []
  let mult = 1
  if (!isBoss) {
    if (!s.completions.some((c) => c.missionId === m.id)) { mult *= MULTIPLIERS.firstCompletion; multipliers.push('Primeira vez ×1.5') }
    if (s.streak.current >= 30) { mult *= MULTIPLIERS.streak30; multipliers.push('Sequência 30+ ×2') }
    else if (s.streak.current >= 7) { mult *= MULTIPLIERS.streak7; multipliers.push('Sequência 7+ ×1.5') }
    if (now.getHours() < MULTIPLIERS.earlyBirdHour) { mult *= MULTIPLIERS.earlyBird; multipliers.push('Antes das 9h ×1.2') }
    mult = Math.min(mult, MULTIPLIERS.cap)
  }
  const base = m.xp * (1 + PRESTIGE_STEP * s.profile.prestige)
  const xp = Math.round(base * mult)

  const attr = s.attributes[m.category]
  if (attr.decayApplied > 0) {
    // §11.1 — returning to a decaying area ends the cycle and grants 7 days of
    // double attribute XP, starting with this completion.
    attr.decayApplied = 0
    attr.recoveryUntil = addDays(today, MULTIPLIERS.recoveryDays - 1)
  }
  const recovering = attr.recoveryUntil !== undefined && today <= attr.recoveryUntil
  const attrXp = recovering ? xp * MULTIPLIERS.recoveryAttribute : xp
  if (recovering) multipliers.push(`Retorno: ${ATTRIBUTE_INFO[m.category].name} ×2`)

  s.profile.totalXp += xp
  gainAttributeXp(s, m.category, attrXp, today, now, events)

  s.completions.push({
    id: uid(), missionId: m.id, date: today, at: now.toISOString(), xp, attrXp, category: m.category, multipliers,
  })
  if (m.type !== 'diaria') m.status = 'concluida'
  if (isBoss) {
    events.push({ kind: 'boss', title: m.title, xp })
    unlock(s, 'first_boss', now, events)
  }

  // Day complete bonus: every daily mission scheduled today is done.
  const todays = dailyMissionsFor(s, today)
  if (todays.length > 0 && todays.every((x) => isDoneOn(s, x.id, today)) && !s.perfectDays.includes(today)) {
    s.perfectDays.push(today)
    s.profile.totalXp += MULTIPLIERS.dayCompleteBonus
    events.push({ kind: 'day_complete', xp: MULTIPLIERS.dayCompleteBonus })
    const run = perfectRun(s, today)
    if (run >= 7) unlock(s, 'perfect_7', now, events)
    if (run >= 30) unlock(s, 'perfect_30', now, events)
  }

  recomputeLevel(s, levelBefore, now, events)
  checkClass(s, today, events)
  return { state: s, events, xp, attrXp, multipliers }
}

function updateStreak(s: State, today: DateKey, now: Date, events: EngineEvent[]) {
  const st = s.streak
  const last = st.lastActiveDate
  if (last === today) return
  if (last && diffDays(today, last) >= 31) unlock(s, 'comeback_30d', now, events)
  if (last && diffDays(today, last) === 2) unlock(s, 'bounce_back', now, events)
  st.current = last === addDays(today, -1) ? st.current + 1 : 1
  st.longest = Math.max(st.longest, st.current)
  st.lastActiveDate = today
  for (const n of [7, 30, 100, 365]) if (st.current >= n) unlock(s, `streak_${n}`, now, events)
}

const perfectRun = (s: State, today: DateKey) => {
  let run = 0
  for (let d = today; s.perfectDays.includes(d); d = addDays(d, -1)) run++
  return run
}

function gainAttributeXp(s: State, cat: Category, amount: number, today: DateKey, now: Date, events: EngineEvent[]) {
  const a = s.attributes[cat]
  const before = a.level
  a.xp += amount
  a.level = attrLevelFromXp(a.xp)
  a.lastActivityDate = today
  a.floor = Math.max(a.floor, stageStart(a.level))
  if (stageStart(a.level) > stageStart(before)) events.push({ kind: 'stage', category: cat, stage: stageName(cat, a.level) })
  for (const n of [25, 50, 75, 100]) if (a.level >= n && before < n) unlock(s, `attr_${cat}_${n}`, now, events)
}

function recomputeLevel(s: State, levelBefore: number, now: Date, events: EngineEvent[]) {
  const p = s.profile
  // Math.max guarantees the overall level never regresses.
  p.level = Math.max(p.level, levelFromXp(p.totalXp - p.prestigeBaseXp, p.prestige))
  if (p.level > levelBefore) {
    events.push({ kind: 'level', level: p.level })
    if (p.prestige === 0) for (const n of [2, 5, 10, 15, 20]) if (p.level >= n) unlock(s, `level_${n}`, now, events)
  }
}

function unlock(s: State, key: string, now: Date, events: EngineEvent[]) {
  if (s.achievements[key]) return
  s.achievements[key] = now.toISOString()
  events.push({ kind: 'achievement', key })
}

function checkClass(s: State, today: DateKey, events: EngineEvent[]) {
  const c = suggestedClass(s, today)
  if (!c || s.classSuggestion === c.key) return
  s.classSuggestion = c.key
  s.classHistory.push({ key: c.key, suggestedDate: today })
  events.push({ kind: 'class_suggested', key: c.key })
}

// ---- Classes and prestige --------------------------------------------------

export function acceptClass(prev: State, key: string, now: Date): { state: State; events: EngineEvent[] } {
  const s = structuredClone(prev)
  const today = dateKey(now)
  const c = classByKey(key)
  if (c.key !== key || !classCheck(s, today, c)) throw new Error('Requisitos da classe não atendidos.')
  const events: EngineEvent[] = []
  s.profile.classKey = key
  s.classSuggestion = null
  const h = [...s.classHistory].reverse().find((x) => x.key === key && !x.acceptedDate && !x.declinedDate)
  if (h) h.acceptedDate = today
  else s.classHistory.push({ key, suggestedDate: today, acceptedDate: today })
  const changes = s.classHistory.filter((x) => x.acceptedDate).length
  if (changes >= 1) unlock(s, 'class_1', now, events)
  if (changes >= 2) unlock(s, 'class_2', now, events)
  events.push({ kind: 'class_changed', key })
  return { state: s, events }
}

export function declineClass(prev: State, now: Date): State {
  const s = structuredClone(prev)
  const h = [...s.classHistory].reverse().find((x) => x.key === s.classSuggestion && !x.acceptedDate && !x.declinedDate)
  if (h) h.declinedDate = dateKey(now)
  s.classSuggestion = null
  return s
}

export const canPrestige = (s: State) => s.profile.level >= MAX_LEVEL && s.profile.prestige < PRESTIGE.length

export function enterPrestige(prev: State, now: Date): { state: State; events: EngineEvent[] } {
  if (!canPrestige(prev)) throw new Error('Prestígio indisponível.')
  const s = structuredClone(prev)
  const events: EngineEvent[] = []
  s.profile.prestige += 1
  s.profile.prestigeBaseXp = s.profile.totalXp // total XP keeps accumulating
  s.profile.level = 1
  unlock(s, 'prestige_1', now, events)
  events.push({ kind: 'prestige', prestige: s.profile.prestige })
  return { state: s, events }
}

// ---- Daily processing (decay, pauses, streak, bosses) ----------------------

const alertsOn = (s: State, day: DateKey) => s.actions.filter((a) => a.date === day && a.kind === 'alerta').length

function pushAction(s: State, a: Omit<SystemAction, 'id' | 'ack'>) {
  if (a.kind === 'alerta' && alertsOn(s, a.date) >= MAX_ALERTS_PER_DAY) return
  s.actions.push({ ...a, id: uid(), ack: false })
}

// Runs every calendar day between the last processed day and today. Safe to
// call on every app open.
export function processDays(prev: State, now: Date): State {
  const today = dateKey(now)
  if (!prev.onboarded || prev.lastProcessedDate >= today) return ensureBosses(prev, today)
  const s = structuredClone(prev)
  for (const day of eachDay(addDays(s.lastProcessedDate, 1), today)) {
    for (const cat of CATEGORIES) decayDay(s, cat, day)
    pauseIdleMissions(s, day)
    for (const m of s.missions) {
      if ((m.type === 'boss_semanal' || m.type === 'boss_mensal') && m.status === 'ativa' && m.period && m.period.end < day) {
        m.status = 'expirada'
      }
    }
  }
  if (s.streak.lastActiveDate && s.streak.lastActiveDate < addDays(today, -1)) s.streak.current = 0
  s.lastProcessedDate = today
  return ensureBosses(s, today)
}

function decayDay(s: State, cat: Category, day: DateKey) {
  const a = s.attributes[cat]
  const idle = diffDays(day, a.lastActivityDate)
  const name = ATTRIBUTE_INFO[cat].name
  if (idle === DECAY.warnDay && a.level > a.floor) {
    pushAction(s, {
      date: day, kind: 'alerta', title: `${name} entrará em decaimento em ${DECAY.startDay - DECAY.warnDay} dias.`,
      reason: `${idle} dias sem missões de ${name}.`,
    })
  }
  if (idle >= DECAY.startDay && a.decayApplied < DECAY.maxPerCycle && a.level > a.floor) {
    if (a.decayApplied === 0) {
      pushAction(s, {
        date: day, kind: 'acao', title: `${name} entrou em decaimento.`,
        reason: `${idle} dias sem missões de ${name}. Conclua uma missão da área para parar a queda e ganhar XP em dobro por 7 dias.`,
      })
    }
    a.level = Math.max(a.floor, a.level - DECAY.perDay)
    a.xp = attributeThreshold(a.level) // [PROPOSTO] keep XP coherent with the curve
    a.decayApplied += DECAY.perDay
  }
}

function pauseIdleMissions(s: State, day: DateKey) {
  for (const m of s.missions) {
    if (m.type !== 'diaria' || m.status !== 'ativa') continue
    const last = s.completions.filter((c) => c.missionId === m.id).reduce<DateKey>((acc, c) => (c.date > acc ? c.date : acc), m.createdDate)
    const idle = diffDays(day, last)
    if (idle < MISSION_PAUSE_DAYS) continue
    // Only pause if it was actually scheduled during the idle window.
    let expected = 0
    for (const d of eachDay(addDays(last, 1), day)) if (isScheduledOn(m, d)) expected++
    if (expected === 0) continue
    m.status = 'pausada'
    m.pausedDate = day
    pushAction(s, {
      date: day, kind: 'acao', title: `Sua missão "${m.title}" foi pausada.`, reason: `${idle} dias sem conclusão.`, missionId: m.id,
    })
  }
}

// ---- Bosses (template-based until the LLM layer exists) --------------------

const WEEKLY_TITLE: Record<Category, string> = {
  saude: 'Prova do Corpo', sabedoria: 'Prova da Mente', espiritualidade: 'Prova da Fé', prosperidade: 'Prova do Patrimônio',
}
const MONTHLY_TITLE: Record<Category, string> = {
  saude: 'Mês do Corpo', sabedoria: 'Mês da Mente', espiritualidade: 'Mês Espiritual', prosperidade: 'Mês Financeiro',
}

const scheduledBetween = (s: State, cat: Category, from: DateKey, to: DateKey) => {
  let n = 0
  for (const d of eachDay(from, to)) for (const m of s.missions) if (m.category === cat && m.status === 'ativa' && isScheduledOn(m, d)) n++
  return n
}

// Categories with daily missions, weakest attribute first.
const bossCandidates = (s: State) =>
  activeCategories(s).sort((a, b) => s.attributes[a].level - s.attributes[b].level || s.attributes[a].xp - s.attributes[b].xp)

export function ensureBosses(prev: State, today: DateKey): State {
  if (!prev.onboarded) return prev
  const hasBoss = (type: Mission['type'], start: DateKey) =>
    prev.missions.some((m) => m.type === type && m.period?.start === start)
  const ws = weekStart(today)
  const ms = monthStart(today)
  const needWeekly = !hasBoss('boss_semanal', ws)
  const needMonthly = !hasBoss('boss_mensal', ms)
  if (!needWeekly && !needMonthly) return prev

  const s = structuredClone(prev)
  let weeklyCat: Category | null = null

  if (needWeekly) {
    const end = weekEnd(today)
    for (const cat of bossCandidates(s)) {
      const available = scheduledBetween(s, cat, today, end)
      if (available < 2) continue
      const count = Math.min(available, 7)
      const [lo, hi] = XP_RANGES.boss_semanal
      const xp = Math.min(hi, Math.max(lo, XP_PICK.boss_semanal - 100 + (count - 2) * 40))
      const name = ATTRIBUTE_INFO[cat].name
      s.missions.push({
        id: uid(), title: WEEKLY_TITLE[cat], description: `Complete ${count} missões de ${name} até domingo (${formatShort(end)}).`,
        category: cat, difficulty: 'dificil', type: 'boss_semanal', xp, source: 'sistema', status: 'ativa',
        createdDate: today, period: { start: ws, end }, target: { category: cat, count },
        rationale: `${name} é o seu atributo mais baixo entre as áreas que você treina (nível ${s.attributes[cat].level}).`,
      })
      weeklyCat = cat
      break
    }
  }

  if (needMonthly) {
    const end = monthEnd(today)
    const cands = bossCandidates(s)
    // Prefer a different area than this week's boss, when there is one.
    const ordered = weeklyCat && cands.length > 1 ? [...cands.filter((c) => c !== weeklyCat), weeklyCat] : cands
    for (const cat of ordered) {
      const available = scheduledBetween(s, cat, today, end)
      const count = Math.min(30, Math.floor(available * 0.8))
      if (count < 4) continue
      const [lo, hi] = XP_RANGES.boss_mensal
      const xp = Math.min(hi, Math.max(lo, lo + (count - 4) * 16))
      const name = ATTRIBUTE_INFO[cat].name
      s.missions.push({
        id: uid(), title: MONTHLY_TITLE[cat], description: `Complete ${count} missões de ${name} até ${formatShort(end)}.`,
        category: cat, difficulty: 'dificil', type: 'boss_mensal', xp, source: 'sistema', status: 'ativa',
        createdDate: today, period: { start: ms, end }, target: { category: cat, count },
        rationale: `Um mês focado em ${name}, a área que mais precisa de atenção agora.`,
      })
      break
    }
  }
  return s
}

