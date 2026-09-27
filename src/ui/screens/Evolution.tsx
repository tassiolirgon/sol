import { ATTRIBUTE_INFO, CATEGORIES, DECAY } from '../../config'
import { ACHIEVEMENTS, CLASSES, classByKey } from '../../content'
import { dateKey, diffDays, formatShort } from '../../engine/dates'
import { allAttributeLevels, attrProgress, classCheck, disciplineStats, stageName } from '../../engine/progression'
import { useGame, useStore } from '../../store'
import { fmt, Radar } from '../components/bits'

export function Evolution() {
  const game = useGame()
  const accept = useStore((s) => s.acceptClass)
  const today = dateKey(new Date())
  const levels = allAttributeLevels(game, today)
  const disc = disciplineStats(game, today)
  const current = classByKey(game.profile.classKey)
  const nextClasses = CLASSES.filter((c) => c.tier === current.tier + 1)
  const unlocked = ACHIEVEMENTS.filter((a) => game.achievements[a.key])
  const perfect = game.perfectDays.length

  return (
    <div className="stack">
      <h1 style={{ fontSize: 22 }}>Evolução</h1>

      <div className="card" style={{ padding: '12px 8px 4px' }}><Radar levels={levels} size={300} /></div>

      <p className="section-title">Atributos</p>
      <div className="card">
        {CATEGORIES.map((cat) => {
          const a = game.attributes[cat]
          const pr = attrProgress(a.xp, a.level)
          const idle = diffDays(today, a.lastActivityDate)
          const color = ATTRIBUTE_INFO[cat].color
          let status: string
          if (a.recoveryUntil && today <= a.recoveryUntil) status = `XP em dobro até ${formatShort(a.recoveryUntil)}`
          else if (a.decayApplied > 0) status = `Em decaimento (−${a.decayApplied})`
          else if (idle >= DECAY.warnDay) status = `Decaimento em ${DECAY.startDay - idle} dias`
          else if (idle === 0) status = 'Ativo hoje'
          else status = `${idle} ${idle === 1 ? 'dia' : 'dias'} sem atividade`
          return (
            <div key={cat} className="attr-row">
              <div className="row between">
                <span><b style={{ color }}>{ATTRIBUTE_INFO[cat].name}</b> <span className="muted small">· {stageName(cat, a.level)}</span></span>
                <b>{a.level}</b>
              </div>
              <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${Math.max(2, (pr.into / pr.needed) * 100)}%`, background: color }} /></div>
              <div className="row between tiny muted" style={{ marginTop: 4 }}>
                <span>{fmt(pr.into)} / {fmt(pr.needed)} XP</span>
                <span style={a.decayApplied > 0 || idle >= DECAY.warnDay ? { color: 'var(--alert)' } : undefined}>{status}</span>
              </div>
            </div>
          )
        })}
        <div className="attr-row">
          <div className="row between">
            <b style={{ color: ATTRIBUTE_INFO.disciplina.color }}>Disciplina</b>
            <b>{levels.disciplina}</b>
          </div>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            {disc.scheduled > 0 ? `${disc.done} de ${disc.scheduled} missões concluídas ${disc.trackedDays === 1 ? 'hoje' : `nos últimos ${disc.trackedDays} dias`}` : 'Sem dados ainda.'}
            {!disc.fullWindow && ` · consolida em ${30 - disc.trackedDays} dias`}
          </p>
        </div>
      </div>

      <p className="section-title">Histórico</p>
      <div className="tiles">
        <div className="tile"><span className="tiny muted">XP TOTAL</span><b>{fmt(game.profile.totalXp)}</b></div>
        <div className="tile"><span className="tiny muted">MAIOR SEQ.</span><b>{game.streak.longest} d</b></div>
        <div className="tile"><span className="tiny muted">DIAS PERFEITOS</span><b>{perfect}</b></div>
      </div>

      <p className="section-title">Caminho de classes</p>
      <div className="card">
        <p className="tiny muted">CLASSE ATUAL</p>
        <p className="epic-font gold" style={{ fontSize: 20, marginTop: 2 }}>{current.name}</p>
        <p className="small muted" style={{ marginTop: 4 }}>{current.lore}</p>
      </div>
      {nextClasses.map((c) => {
        const ok = classCheck(game, today, c)
        return (
          <div key={c.key} className="card row between" style={{ gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600 }}>{c.name}</p>
              <p className="tiny muted">{c.requirementText}</p>
            </div>
            {ok ? <button className="btn gold" onClick={() => accept(c.key)}>Assumir</button> : <span className="tiny muted">Bloqueada</span>}
          </div>
        )
      })}

      <p className="section-title">Conquistas · {unlocked.length}/{ACHIEVEMENTS.length}</p>
      <div className="ach">
        {ACHIEVEMENTS.map((a) => (
          <div key={a.key} className={game.achievements[a.key] ? '' : 'locked'}>
            <p style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</p>
            <p className="tiny muted">{a.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
