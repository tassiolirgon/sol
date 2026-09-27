import { useState } from 'react'
import { ATTRIBUTE_INFO, CATEGORIES, DIFFICULTY_LABEL, type Category, type Difficulty } from '../../config'
import { classify, priceMission } from '../../engine/classify'
import { WEEKDAY_SHORT } from '../../engine/dates'
import { useStore } from '../../store'

// Modo Arquiteto: the user describes the mission in free text; the System
// classifies and prices it. Category, difficulty and days can be corrected,
// XP never.
export function Composer({ onDone }: { onDone?: () => void }) {
  const add = useStore((s) => s.add)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('moderada')
  const [days, setDays] = useState<number[] | null>(null)
  const [stage, setStage] = useState<'write' | 'review'>('write')

  const analyze = () => {
    if (!text.trim()) return
    const c = classify(text)
    setTitle(c.title)
    setCategory(c.category)
    setDifficulty(c.difficulty)
    setDays(c.recurrence)
    setStage('review')
  }

  const confirm = () => {
    if (!category || !title.trim() || (days !== null && days.length === 0)) return
    add({ title, category, difficulty, recurrence: days })
    setText('')
    setStage('write')
    onDone?.()
  }

  if (stage === 'write') {
    return (
      <form className="stack" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); analyze() }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} autoFocus
          placeholder="Ex: academia seg, qua e sex" enterKeyHint="done" />
        <p className="tiny muted">Escreva do seu jeito. Dias (“todo dia”, “dias úteis”, “seg e qui”) ou “hoje” para missão pontual.</p>
        <button className="btn block" type="submit" disabled={!text.trim()}>Registrar</button>
      </form>
    )
  }

  const type = days === null ? 'pessoal' : 'diaria'
  const xp = priceMission(type, difficulty)
  const color = category ? ATTRIBUTE_INFO[category].color : undefined

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="card" style={{ borderColor: color ?? 'var(--border)' }}>
        <p className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}>Sistema</p>
        <p style={{ marginTop: 6 }}>
          {category
            ? <>Missão registrada: <b style={{ color }}>{ATTRIBUTE_INFO[category].name}</b>, dificuldade {DIFFICULTY_LABEL[difficulty]}, <b>+{xp} XP</b>.</>
            : <>O Sistema não identificou a área desta missão. Indique abaixo.</>}
        </p>
      </div>

      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título da missão" />

      <div>
        <p className="tiny muted" style={{ marginBottom: 6 }}>ÁREA</p>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c} className={`chip ${category === c ? 'on' : ''}`} style={category === c ? { color: ATTRIBUTE_INFO[c].color } : undefined}
              onClick={() => setCategory(c)}>{ATTRIBUTE_INFO[c].name}</button>
          ))}
        </div>
      </div>

      <div>
        <p className="tiny muted" style={{ marginBottom: 6 }}>DIFICULDADE</p>
        <div className="chips">
          {(['simples', 'moderada', 'dificil'] as Difficulty[]).map((d) => (
            <button key={d} className={`chip ${difficulty === d ? 'on' : ''}`} onClick={() => setDifficulty(d)}>{DIFFICULTY_LABEL[d]}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="row between" style={{ marginBottom: 6 }}>
          <p className="tiny muted">FREQUÊNCIA</p>
          <button className="link" onClick={() => setDays(days === null ? [0, 1, 2, 3, 4, 5, 6] : null)}>
            {days === null ? 'Tornar recorrente' : 'Tornar pontual'}
          </button>
        </div>
        {days === null
          ? <p className="small muted">Missão pontual (checklist). Some da lista quando concluída.</p>
          : <div className="days">
              {WEEKDAY_SHORT.map((w, i) => (
                <button key={w} className={`chip ${days.includes(i) ? 'on' : ''}`}
                  onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}>{w}</button>
              ))}
            </div>}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button className="btn ghost" onClick={() => setStage('write')}>Voltar</button>
        <button className="btn" style={{ flex: 1 }} onClick={confirm}
          disabled={!category || !title.trim() || (days !== null && days.length === 0)}>Confirmar missão</button>
      </div>
    </div>
  )
}
