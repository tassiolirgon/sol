import { PRESTIGE } from '../../config'
import { classByKey } from '../../content'
import { formatShort } from '../../engine/dates'
import { useStore } from '../../store'
import { fmt, Sheet } from './bits'

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast ${t.tone === 'gold' ? 'gold' : ''}`} onClick={() => dismiss(t.id)}>{t.text}</div>)}
    </div>
  )
}

export function UndoBar() {
  const pending = useStore((s) => s.pending)
  const undo = useStore((s) => s.undo)
  const game = useStore((s) => s.game)
  const id = pending[pending.length - 1]
  if (!id || !game) return null
  const m = game.missions.find((x) => x.id === id)
  return (
    <div className="undo" role="status">
      <span>Concluída: {m?.title}</span>
      <button onClick={() => undo(id)}>Desfazer</button>
    </div>
  )
}

// Full-screen epic moments (§15.7). One at a time, queued.
export function EpicMoment() {
  const epic = useStore((s) => s.epics[0])
  const next = useStore((s) => s.shiftEpic)
  const accept = useStore((s) => s.acceptClass)
  const decline = useStore((s) => s.declineClass)
  if (!epic) return null

  if (epic.kind === 'class_suggested') {
    const c = classByKey(epic.key)
    return (
      <div className="epic">
        <p className="kicker">O Sistema identificou uma evolução</p>
        <h1 className="big">{c.name}</h1>
        <p className="lore">{c.lore}</p>
        <p className="small muted" style={{ marginTop: 14 }}>Requisito atingido: {c.requirementText}</p>
        <div className="actions">
          <button className="btn gold" onClick={() => { next(); accept(c.key) }}>Assumir classe</button>
          <button className="btn ghost" onClick={() => { decline(); next() }}>Manter classe atual</button>
        </div>
      </div>
    )
  }

  let kicker = ''
  let big = ''
  let glyph: string | null = null
  let lore = ''
  if (epic.kind === 'level') { kicker = 'Evolução confirmada'; glyph = String(epic.level); big = 'Subiu de nível'; lore = 'O Sistema registrou sua evolução.' }
  if (epic.kind === 'boss') { kicker = 'Boss derrotado'; big = epic.title; lore = `+${fmt(epic.xp)} XP` }
  if (epic.kind === 'class_changed') { const c = classByKey(epic.key); kicker = 'Nova classe'; big = c.name; lore = c.lore }
  if (epic.kind === 'prestige') { const p = PRESTIGE[epic.prestige - 1]; kicker = `Prestígio ${epic.prestige}`; glyph = p.symbol; big = p.name; lore = 'O nível recomeça. Tudo o que você construiu permanece.' }

  return (
    <div className="epic" onClick={next}>
      {glyph && <div className="glyph"><span style={glyph.length > 2 ? { fontSize: 18 } : undefined}>{glyph}</span></div>}
      <p className="kicker" style={{ marginTop: glyph ? 22 : 0 }}>{kicker}</p>
      <h1 className="big">{big}</h1>
      <p className="lore">{lore}</p>
      <div className="actions"><button className="btn gold" onClick={next}>Continuar</button></div>
    </div>
  )
}

export function AlertsSheet({ onClose }: { onClose: () => void }) {
  const game = useStore((s) => s.game)!
  const ack = useStore((s) => s.ackAction)
  const setPaused = useStore((s) => s.setPaused)
  const items = [...game.actions].reverse().slice(0, 30)
  return (
    <Sheet onClose={onClose}>
      <h2>Alertas do Sistema</h2>
      <div className="stack" style={{ marginTop: 14, gap: 10 }}>
        {items.length === 0 && <p className="muted small">Nenhum alerta. O Sistema está observando.</p>}
        {items.map((a) => {
          const m = a.missionId ? game.missions.find((x) => x.id === a.missionId) : undefined
          return (
            <div key={a.id} className="card" style={{ opacity: a.ack ? 0.55 : 1, borderColor: a.kind === 'alerta' && !a.ack ? 'rgba(226,75,74,0.5)' : undefined }}>
              <p className="tiny muted">{a.kind === 'acao' ? '⚙️ O Sistema agiu' : 'Alerta'} · {formatShort(a.date)}</p>
              <p style={{ marginTop: 4, fontWeight: 550 }}>{a.title}</p>
              <p className="small muted" style={{ marginTop: 2 }}>Motivo: {a.reason}</p>
              {!a.ack && (
                <div className="row" style={{ marginTop: 10, gap: 8 }}>
                  {m && m.status === 'pausada' && <button className="btn ghost" onClick={() => { setPaused(m.id, false); ack(a.id) }}>Reativar</button>}
                  <button className="btn ghost" onClick={() => ack(a.id)}>Entendido</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
