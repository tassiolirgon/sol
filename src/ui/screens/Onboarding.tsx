import { useEffect, useState } from 'react'
import { classByKey, SLOGAN } from '../../content'
import { useStore } from '../../store'
import { Composer } from '../components/Composer'
import { MissionItem } from '../components/MissionItem'

type Step = 'welcome' | 'name' | 'analysis' | 'reveal' | 'routine'

const ANALYSIS = ['Identificando padrões...', 'Calibrando o Sistema...', 'Definindo sua classe de entrada...']

export function Onboarding() {
  const game = useStore((s) => s.game)
  const startGame = useStore((s) => s.startGame)
  const finish = useStore((s) => s.finishOnboarding)
  const [step, setStep] = useState<Step>(game ? 'routine' : 'welcome')
  const [name, setName] = useState('')
  const [lines, setLines] = useState(0)

  useEffect(() => {
    if (step !== 'analysis') return
    const ts = ANALYSIS.map((_, i) => setTimeout(() => setLines(i + 1), 300 + i * 1100))
    const done = setTimeout(() => setStep('reveal'), 4000)
    return () => { ts.forEach(clearTimeout); clearTimeout(done) }
  }, [step])

  if (step === 'welcome') {
    return (
      <div className="epic" style={{ background: '#08080b' }}>
        <div className="glyph"><span>☉</span></div>
        <h1 className="big" style={{ marginTop: 18 }}>SOL</h1>
        <p className="kicker">System of Life</p>
        <p className="lore" style={{ marginTop: 28 }}>Você está prestes a iniciar um sistema operacional para a sua vida.</p>
        <div className="actions"><button className="btn gold" onClick={() => setStep('name')}>Começar</button></div>
        <p className="slogan" style={{ position: 'absolute', bottom: 'calc(var(--safe-bottom) + 24px)' }}>{SLOGAN}</p>
      </div>
    )
  }

  if (step === 'name') {
    return (
      <div className="app" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh', paddingBottom: 40 }}>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { startGame(name); setStep('analysis') } }}>
          <p className="tiny muted" style={{ letterSpacing: '0.2em' }}>SISTEMA</p>
          <h1 style={{ fontSize: 22 }}>Como o Sistema deve te chamar?</h1>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Seu nome" enterKeyHint="go" />
          <button className="btn block" disabled={!name.trim()}>Continuar</button>
        </form>
      </div>
    )
  }

  if (step === 'analysis') {
    return (
      <div className="epic" style={{ background: '#08080b' }}>
        <div className="stack" style={{ gap: 14, alignItems: 'center' }}>
          {ANALYSIS.slice(0, lines).map((l, i) => (
            <p key={l} className={`analysis-line ${i === lines - 1 ? 'blink' : 'muted'}`}>{l}</p>
          ))}
        </div>
      </div>
    )
  }

  if (step === 'reveal') {
    return (
      <div className="epic">
        <p className="kicker">Análise concluída</p>
        <div className="glyph" style={{ marginTop: 26 }}><span>1</span></div>
        <h1 className="big">Despertado</h1>
        <p className="lore">{classByKey('despertado').lore}</p>
        <p className="lore muted" style={{ marginTop: 16 }}>Agora defina sua rotina. O Sistema cuida do resto.</p>
        <div className="actions"><button className="btn gold" onClick={() => setStep('routine')}>Iniciar</button></div>
      </div>
    )
  }

  // routine
  const missions = game?.missions.filter((m) => m.source === 'user') ?? []
  return (
    <div className="app">
      <div className="stack">
        <div>
          <p className="tiny muted" style={{ letterSpacing: '0.2em' }}>MODO ARQUITETO</p>
          <h1 style={{ fontSize: 22, marginTop: 6 }}>Cadastre sua rotina</h1>
          <p className="muted small" style={{ marginTop: 6 }}>
            Descreva as missões que quer cumprir. O Sistema classifica cada uma e define o XP. Recomendado: 3 a 5 missões diárias.
          </p>
        </div>
        <Composer />
        {missions.length > 0 && (
          <div>
            <p className="section-title" style={{ marginBottom: 12 }}>Registradas</p>
            {missions.map((m) => <MissionItem key={m.id} mission={m} done={false} showDays disabled />)}
          </div>
        )}
        <button className="btn gold block" disabled={missions.length === 0} onClick={finish}>
          {missions.length === 0 ? 'Registre pelo menos 1 missão' : 'Ativar o Sistema'}
        </button>
      </div>
    </div>
  )
}
