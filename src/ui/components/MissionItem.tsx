import { WEEKDAY_SHORT } from '../../engine/dates'
import type { Mission } from '../../engine/types'
import { useStore } from '../../store'
import { AttrTag } from './bits'

export const recurrenceText = (days?: number[]) => {
  if (!days || days.length === 0) return 'Pontual'
  if (days.length === 7) return 'Todos os dias'
  if (days.join() === '1,2,3,4,5') return 'Dias úteis'
  if (days.join() === '0,6') return 'Fins de semana'
  return days.map((d) => WEEKDAY_SHORT[d]).join(' · ')
}

// One-tap binary mission. `done` means already completed for the current period.
export function MissionItem({ mission, done, showDays, disabled }: { mission: Mission; done: boolean; showDays?: boolean; disabled?: boolean }) {
  const pending = useStore((s) => s.pending.includes(mission.id))
  const tap = useStore((s) => s.tapComplete)
  const cls = done ? 'mission done' : pending ? 'mission pending' : 'mission'
  return (
    <button className={cls} disabled={done || pending || disabled} onClick={() => tap(mission.id)} aria-pressed={done || pending}>
      <span className="check" style={disabled && !done ? { opacity: 0.35 } : undefined} />
      <span className="body">
        <span className="title" style={{ display: 'block' }}>{mission.title}</span>
        <span className="row" style={{ gap: 8, marginTop: 2 }}>
          <AttrTag cat={mission.category} />
          {showDays && <span className="tiny muted">{recurrenceText(mission.recurrence)}</span>}
        </span>
      </span>
      {!done && !pending && <span className="xp">+{mission.xp} XP</span>}
    </button>
  )
}
