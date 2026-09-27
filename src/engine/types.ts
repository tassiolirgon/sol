import type { Category, Difficulty, MissionType } from '../config'
import type { DateKey } from './dates'

export type MissionStatus = 'ativa' | 'concluida' | 'pausada' | 'expirada'

export type Mission = {
  id: string
  title: string
  description?: string
  category: Category
  difficulty: Difficulty
  type: MissionType
  xp: number // always set by the engine, never by the user
  source: 'user' | 'sistema'
  status: MissionStatus
  recurrence?: number[] // weekdays, 0 = domingo; daily missions only
  createdDate: DateKey
  pausedDate?: DateKey
  rationale?: string
  // Bosses
  period?: { start: DateKey; end: DateKey }
  target?: { category: Category; count: number }
}

export type Completion = {
  id: string
  missionId: string
  date: DateKey
  at: string
  xp: number
  attrXp: number
  category: Category
  multipliers: string[]
}

export type AttributeState = {
  xp: number
  level: number
  lastActivityDate: DateKey
  decayApplied: number
  floor: number // start of the highest stage consolidated
  recoveryUntil?: DateKey
}

export type SystemAction = {
  id: string
  date: DateKey
  kind: 'alerta' | 'acao'
  title: string
  reason: string
  missionId?: string
  ack: boolean
}

export type Profile = {
  name: string
  createdDate: DateKey
  level: number
  totalXp: number
  prestige: number
  prestigeBaseXp: number
  classKey: string
  mode: 'arquiteto' | 'sistema'
}

export type State = {
  version: 1
  onboarded: boolean
  profile: Profile
  attributes: Record<Category, AttributeState>
  missions: Mission[]
  completions: Completion[]
  streak: { current: number; longest: number; lastActiveDate: DateKey | null }
  perfectDays: DateKey[]
  achievements: Record<string, string>
  classHistory: { key: string; suggestedDate: DateKey; acceptedDate?: DateKey; declinedDate?: DateKey }[]
  classSuggestion: string | null
  actions: SystemAction[]
  lastProcessedDate: DateKey
}

// Things the UI should react to after an engine call.
export type EngineEvent =
  | { kind: 'level'; level: number }
  | { kind: 'boss'; title: string; xp: number }
  | { kind: 'stage'; category: Category; stage: string }
  | { kind: 'achievement'; key: string }
  | { kind: 'class_suggested'; key: string }
  | { kind: 'class_changed'; key: string }
  | { kind: 'prestige'; prestige: number }
  | { kind: 'day_complete'; xp: number }
