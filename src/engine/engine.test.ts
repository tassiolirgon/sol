import { describe, expect, it } from 'vitest'
import { attributeThreshold } from '../config'
import { classify, priceMission } from './classify'
import { addDays, dateKey, fromKey } from './dates'
import { addMission, completeMission, createInitialState, enterPrestige, processDays } from './engine'
import { disciplineFromRate, disciplineLevel, levelFromXp, suggestedClass } from './progression'
import type { State } from './types'

const at = (key: string, hour = 12) => { const d = fromKey(key); d.setHours(hour); return d }
const START = '2026-09-28' // segunda

const withDaily = (s: State, title = 'Academia', cat: 'saude' | 'sabedoria' = 'saude') =>
  addMission(s, { title, category: cat, difficulty: 'moderada', recurrence: [0, 1, 2, 3, 4, 5, 6] }, at(START))

describe('classify', () => {
  it('reads the spec example', () => {
    const c = classify('academia seg, qua e sex')
    expect(c).toMatchObject({ title: 'Academia', category: 'saude', difficulty: 'moderada', recurrence: [1, 3, 5] })
  })
  it('handles every-day, pages and pontual', () => {
    expect(classify('Ler 10 páginas todo dia')).toMatchObject({ title: 'Ler 10 páginas', category: 'sabedoria', difficulty: 'simples', recurrence: [0, 1, 2, 3, 4, 5, 6] })
    expect(classify('pagar boleto do cartão hoje')).toMatchObject({ category: 'prosperidade', recurrence: null })
    expect(classify('meditar 10 min dias úteis')).toMatchObject({ category: 'espiritualidade', difficulty: 'simples', recurrence: [1, 2, 3, 4, 5] })
  })
  it('does not read sexta-feira as fé', () => {
    expect(classify('orçamento sexta-feira').category).toBe('prosperidade')
  })
  it('prices inside official ranges', () => {
    expect(priceMission('diaria', 'simples')).toBe(20)
    expect(priceMission('pessoal', 'dificil')).toBe(40)
  })
})

describe('levels', () => {
  it('follows the table and prestige scaling', () => {
    expect(levelFromXp(0, 0)).toBe(1)
    expect(levelFromXp(499, 0)).toBe(1)
    expect(levelFromXp(500, 0)).toBe(2)
    expect(levelFromXp(480000, 0)).toBe(20)
    expect(levelFromXp(500, 1)).toBe(1) // needs 600 in prestige I
    expect(levelFromXp(600, 1)).toBe(2)
  })
  it('discipline bands interpolate', () => {
    expect(disciplineFromRate(0)).toBe(1)
    expect(disciplineFromRate(0.6)).toBe(38)
    expect(disciplineFromRate(1)).toBe(100)
  })
})

describe('completeMission', () => {
  it('pays first-completion multiplier, credits total and attribute, never twice a day', () => {
    let s = createInitialState('T', at(START))
    const { state, mission } = withDaily(s)
    s = state
    const r = completeMission(s, mission.id, at(START, 10))
    expect(r.xp).toBe(Math.round(45 * 1.5))
    expect(r.state.attributes.saude.xp).toBe(r.xp)
    // day-complete bonus is added to total only
    expect(r.state.profile.totalXp).toBe(r.xp + 100)
    expect(() => completeMission(r.state, mission.id, at(START, 11))).toThrow()
  })

  it('applies early-bird and caps the combined multiplier', () => {
    let s = createInitialState('T', at(START))
    const { state, mission } = withDaily(s)
    s = state
    s.streak = { current: 40, longest: 40, lastActiveDate: addDays(START, -1) }
    const r = completeMission(s, mission.id, at(START, 7))
    // 1.5 (first) * 2 (streak 30+) * 1.2 = 3.6 → capped at 3
    expect(r.xp).toBe(135)
  })

  it('builds streaks and resets them after a missed day', () => {
    let s = createInitialState('T', at(START))
    const { state, mission } = withDaily(s)
    s = state
    for (let i = 0; i < 3; i++) s = completeMission(processDays(s, at(addDays(START, i))), mission.id, at(addDays(START, i))).state
    expect(s.streak.current).toBe(3)
    s = processDays(s, at(addDays(START, 5)))
    expect(s.streak.current).toBe(0)
    expect(s.streak.longest).toBe(3)
  })
})

describe('decay', () => {
  it('warns on day 11, decays from day 14, respects floor and cap, recovers with double XP', () => {
    let s = createInitialState('T', at(START))
    s.attributes.saude = { xp: attributeThreshold(40), level: 40, lastActivityDate: START, decayApplied: 0, floor: 31 }
    s = processDays(s, at(addDays(START, 11)))
    expect(s.actions.some((a) => a.kind === 'alerta' && a.title.includes('Saúde'))).toBe(true)
    expect(s.attributes.saude.level).toBe(40)
    s = processDays(s, at(addDays(START, 14)))
    expect(s.attributes.saude.level).toBe(39)
    s = processDays(s, at(addDays(START, 40)))
    expect(s.attributes.saude.level).toBe(31) // floor of "Resistente"
    const { state, mission } = withDaily(s)
    const r = completeMission(state, mission.id, at(addDays(START, 40)))
    expect(r.state.attributes.saude.decayApplied).toBe(0)
    expect(r.attrXp).toBe(r.xp * 2)
  })

  it('never lowers total XP or overall level', () => {
    let s = createInitialState('T', at(START))
    s.profile.totalXp = 5000
    s.profile.level = 5
    s = processDays(s, at(addDays(START, 60)))
    expect(s.profile.totalXp).toBe(5000)
    expect(s.profile.level).toBe(5)
  })
})

describe('missions pause and bosses', () => {
  it('pauses a daily mission after 14 idle days with a reason', () => {
    const s0 = createInitialState('T', at(START))
    const { state, mission } = withDaily(s0)
    const s = processDays(state, at(addDays(START, 14)))
    expect(s.missions.find((m) => m.id === mission.id)!.status).toBe('pausada')
    expect(s.actions.find((a) => a.missionId === mission.id)!.reason).toContain('14 dias')
  })

  it('creates a weekly boss verified by history', () => {
    const s0 = createInitialState('T', at(START))
    let s = processDays(withDaily(s0).state, at(START))
    const boss = s.missions.find((m) => m.type === 'boss_semanal')!
    expect(boss.target).toEqual({ category: 'saude', count: 7 })
    expect(boss.xp).toBeGreaterThanOrEqual(200)
    expect(boss.xp).toBeLessThanOrEqual(400)
    expect(() => completeMission(s, boss.id, at(START))).toThrow(/0\/7/)
    const daily = s.missions.find((m) => m.type === 'diaria')!
    for (let i = 0; i < 7; i++) {
      const day = at(addDays(START, i))
      s = completeMission(processDays(s, day), daily.id, day).state
    }
    const r = completeMission(s, boss.id, at(addDays(START, 6)))
    expect(r.events.some((e) => e.kind === 'boss')).toBe(true)
  })
})

describe('classes and prestige', () => {
  it('suggests Lâmina at level 5 with Saúde 15', () => {
    const s = createInitialState('T', at(START))
    s.profile.level = 5
    s.attributes.saude.level = 15
    expect(suggestedClass(s, START)?.key).toBe('lamina')
    s.classHistory.push({ key: 'lamina', suggestedDate: START, declinedDate: START })
    expect(suggestedClass(s, START)).toBeNull()
  })

  it('discipline needs time to build', () => {
    let s = createInitialState('T', at(START))
    const { state, mission } = withDaily(s)
    s = completeMission(state, mission.id, at(START)).state
    expect(disciplineLevel(s, START)).toBeLessThan(10)
  })

  it('prestige resets level but keeps total XP', () => {
    const s = createInitialState('T', at(START))
    s.profile.level = 20
    s.profile.totalXp = 500000
    const { state } = enterPrestige(s, at(START))
    expect(state.profile).toMatchObject({ level: 1, totalXp: 500000, prestige: 1, prestigeBaseXp: 500000 })
  })
})

it('dateKey round-trips', () => {
  expect(dateKey(fromKey(START))).toBe(START)
})
