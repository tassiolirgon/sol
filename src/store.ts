import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  acceptClass, addMission, completeMission, createInitialState, declineClass, enterPrestige, ensureBosses,
  processDays, setMissionPaused, type NewMission,
} from './engine/engine'
import { achievementByKey } from './content'
import { dateKey } from './engine/dates'
import type { EngineEvent, State } from './engine/types'

export type Toast = { id: number; text: string; tone?: 'gold' | 'default' }
export type Epic =
  | { kind: 'level'; level: number }
  | { kind: 'boss'; title: string; xp: number }
  | { kind: 'class_suggested'; key: string }
  | { kind: 'class_changed'; key: string }
  | { kind: 'prestige'; prestige: number }

const UNDO_MS = 2500
const timers = new Map<string, ReturnType<typeof setTimeout>>()
let toastSeq = 0

type Store = {
  game: State | null
  pending: string[] // missions tapped but not yet committed (undo window)
  epics: Epic[]
  toasts: Toast[]

  startGame: (name: string) => void
  finishOnboarding: () => void
  refresh: () => void
  add: (m: NewMission) => void
  tapComplete: (id: string) => void
  undo: (id: string) => void
  setPaused: (id: string, paused: boolean) => void
  acceptClass: (key: string) => void
  declineClass: () => void
  prestige: () => void
  ackAction: (id: string) => void
  rename: (name: string) => void
  importGame: (g: State) => void
  reset: () => void
  shiftEpic: () => void
  toast: (text: string, tone?: Toast['tone']) => void
  dismissToast: (id: number) => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const handleEvents = (events: EngineEvent[]) => {
        const epics: Epic[] = []
        for (const e of events) {
          if (e.kind === 'level' || e.kind === 'boss' || e.kind === 'class_suggested' || e.kind === 'class_changed' || e.kind === 'prestige') {
            epics.push(e)
          } else if (e.kind === 'achievement') {
            get().toast(`Conquista: ${achievementByKey(e.key)?.name ?? e.key}`, 'gold')
          } else if (e.kind === 'stage') {
            get().toast(`Novo estágio: ${e.stage}`)
          } else if (e.kind === 'day_complete') {
            get().toast(`Dia completo · +${e.xp} XP`, 'gold')
          }
        }
        if (epics.length) set((st) => ({ epics: [...st.epics, ...epics] }))
      }

      const commit = (id: string) => {
        timers.delete(id)
        set((st) => ({ pending: st.pending.filter((p) => p !== id) }))
        const game = get().game
        if (!game) return
        try {
          const r = completeMission(processDays(game, new Date()), id, new Date())
          set({ game: r.state })
          const extra = r.multipliers.length ? ` · ${r.multipliers.join(' · ')}` : ''
          get().toast(`+${r.xp} XP${extra}`)
          handleEvents(r.events)
        } catch (err) {
          get().toast((err as Error).message)
        }
      }

      return {
        game: null,
        pending: [],
        epics: [],
        toasts: [],

        startGame: (name) => {
          const g = createInitialState(name, new Date())
          g.onboarded = false
          set({ game: g })
        },
        finishOnboarding: () => {
          const g = get().game
          if (!g) return
          set({ game: ensureBosses({ ...g, onboarded: true }, dateKey(new Date())) })
        },
        refresh: () => {
          const g = get().game
          if (g?.onboarded) set({ game: processDays(g, new Date()) })
        },
        add: (m) => {
          const g = get().game
          if (!g) return
          const { state, mission } = addMission(g, m, new Date())
          set({ game: state.onboarded ? ensureBosses(state, dateKey(new Date())) : state })
          get().toast(`Missão registrada: ${mission.title}`)
        },
        tapComplete: (id) => {
          if (timers.has(id)) return
          set((st) => ({ pending: [...st.pending, id] }))
          timers.set(id, setTimeout(() => commit(id), UNDO_MS))
        },
        undo: (id) => {
          const t = timers.get(id)
          if (t) clearTimeout(t)
          timers.delete(id)
          set((st) => ({ pending: st.pending.filter((p) => p !== id) }))
        },
        setPaused: (id, paused) => {
          const g = get().game
          if (g) set({ game: setMissionPaused(g, id, paused, new Date()) })
        },
        acceptClass: (key) => {
          const g = get().game
          if (!g) return
          try {
            const r = acceptClass(g, key, new Date())
            set({ game: r.state })
            handleEvents(r.events)
          } catch (err) {
            get().toast((err as Error).message)
          }
        },
        declineClass: () => {
          const g = get().game
          if (g) set({ game: declineClass(g, new Date()) })
        },
        prestige: () => {
          const g = get().game
          if (!g) return
          const r = enterPrestige(g, new Date())
          set({ game: r.state })
          handleEvents(r.events)
        },
        ackAction: (id) => {
          const g = get().game
          if (!g) return
          set({ game: { ...g, actions: g.actions.map((a) => (a.id === id ? { ...a, ack: true } : a)) } })
        },
        rename: (name) => {
          const g = get().game
          if (g && name.trim()) set({ game: { ...g, profile: { ...g.profile, name: name.trim() } } })
        },
        importGame: (g) => set({ game: processDays(g, new Date()), epics: [], pending: [] }),
        reset: () => set({ game: null, epics: [], pending: [], toasts: [] }),
        shiftEpic: () => set((st) => ({ epics: st.epics.slice(1) })),
        toast: (text, tone) => {
          const id = ++toastSeq
          set((st) => ({ toasts: [...st.toasts.slice(-2), { id, text, tone }] }))
          setTimeout(() => get().dismissToast(id), 3200)
        },
        dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
      }
    },
    {
      name: 'sol-state',
      version: 1,
      partialize: (st) => ({ game: st.game }),
    },
  ),
)

// Non-null game accessor for screens rendered after onboarding.
export const useGame = () => useStore((st) => st.game!)
