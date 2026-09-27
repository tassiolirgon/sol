import { useState } from 'react'
import { dateKey } from '../../engine/dates'
import { bossProgress, isDoneOn, isScheduledOn } from '../../engine/progression'
import { useGame, useStore } from '../../store'
import { Sheet } from '../components/bits'
import { Composer } from '../components/Composer'
import { MissionItem, recurrenceText } from '../components/MissionItem'
import { activeBosses, BossBanner } from './Home'

export function Missions() {
  const game = useGame()
  const tap = useStore((s) => s.tapComplete)
  const setPaused = useStore((s) => s.setPaused)
  const [composing, setComposing] = useState(false)
  const today = dateKey(new Date())

  const daily = game.missions.filter((m) => m.type === 'diaria' && m.status === 'ativa')
  const personal = game.missions.filter((m) => m.type === 'pessoal' && m.status === 'ativa')
  const paused = game.missions.filter((m) => m.status === 'pausada')
  const bosses = activeBosses(game.missions, today)

  return (
    <div className="stack">
      <header className="row between">
        <h1 style={{ fontSize: 22 }}>Missões</h1>
        <button className="btn" onClick={() => setComposing(true)}>+ Nova</button>
      </header>

      {bosses.length > 0 && <p className="section-title">Bosses</p>}
      {bosses.map((b) => {
        const p = bossProgress(game, b)
        return (
          <div key={b.id} className="stack" style={{ gap: 8 }}>
            <BossBanner boss={b} />
            {b.rationale && <p className="tiny muted" style={{ padding: '0 4px' }}>Por quê: {b.rationale}</p>}
            {p.done >= p.count && <button className="btn gold block" onClick={() => tap(b.id)}>Derrotar boss</button>}
          </div>
        )
      })}

      <p className="section-title">Diárias</p>
      {daily.length === 0 && <p className="small muted">Nenhuma missão diária.</p>}
      <div>
        {daily.map((m) => (
          <MissionItem key={m.id} mission={m} done={isDoneOn(game, m.id, today)} showDays disabled={!isScheduledOn(m, today)} />
        ))}
      </div>

      <p className="section-title">Pessoais</p>
      {personal.length === 0 && <p className="small muted">Nenhuma missão pontual pendente.</p>}
      <div>{personal.map((m) => <MissionItem key={m.id} mission={m} done={false} />)}</div>

      {paused.length > 0 && <>
        <p className="section-title">Pausadas</p>
        {paused.map((m) => (
          <div key={m.id} className="card row between">
            <div>
              <p style={{ fontWeight: 550 }}>{m.title}</p>
              <p className="tiny muted">{recurrenceText(m.recurrence)}</p>
            </div>
            <button className="btn ghost" onClick={() => setPaused(m.id, false)}>Reativar</button>
          </div>
        ))}
      </>}

      {daily.length > 0 && (
        <details className="small muted">
          <summary style={{ cursor: 'pointer' }}>Pausar uma missão diária</summary>
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            {daily.map((m) => (
              <div key={m.id} className="row between">
                <span>{m.title}</span>
                <button className="link" onClick={() => setPaused(m.id, true)}>Pausar</button>
              </div>
            ))}
          </div>
        </details>
      )}

      {composing && (
        <Sheet onClose={() => setComposing(false)}>
          <h2 style={{ marginBottom: 14 }}>Nova missão</h2>
          <Composer onDone={() => setComposing(false)} />
        </Sheet>
      )}
    </div>
  )
}
