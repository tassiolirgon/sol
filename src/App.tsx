import { useEffect, useState } from 'react'
import { useStore } from './store'
import { AlertsSheet, EpicMoment, Toasts, UndoBar } from './ui/components/Overlays'
import { Evolution } from './ui/screens/Evolution'
import { Home } from './ui/screens/Home'
import { Missions } from './ui/screens/Missions'
import { Onboarding } from './ui/screens/Onboarding'
import { Finance, Profile } from './ui/screens/Profile'

type Tab = 'sistema' | 'missoes' | 'evolucao' | 'financeiro' | 'perfil'

const ICONS: Record<Tab, React.ReactNode> = {
  sistema: <path d="M12 3 L20 12 L12 21 L4 12 Z M12 8.5 L15.5 12 L12 15.5 L8.5 12 Z" />,
  missoes: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  evolucao: <path d="M12 3 20.5 9.2 17.3 19H6.7L3.5 9.2Z M12 8l4 3-1.5 4.7h-5L8 11z" />,
  financeiro: <><path d="M4 19h16" /><path d="M6 15v-4M10 15V8M14 15v-6M18 15V5" /></>,
  perfil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
}
const LABELS: Record<Tab, string> = { sistema: 'Sistema', missoes: 'Missões', evolucao: 'Evolução', financeiro: 'Financeiro', perfil: 'Perfil' }

export function App() {
  const game = useStore((s) => s.game)
  const refresh = useStore((s) => s.refresh)
  const [tab, setTab] = useState<Tab>('sistema')
  const [bell, setBell] = useState(false)

  // Daily processing (decay, pauses, bosses) on open and whenever the app returns to foreground.
  useEffect(() => {
    refresh()
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(refresh, 60_000)
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(t) }
  }, [refresh])

  useEffect(() => { window.scrollTo(0, 0) }, [tab])

  if (!game?.onboarded) return <><Onboarding /><Toasts /></>

  return (
    <>
      <main className="app">
        {tab === 'sistema' && <Home onBell={() => setBell(true)} onGoMissions={() => setTab('missoes')} />}
        {tab === 'missoes' && <Missions />}
        {tab === 'evolucao' && <Evolution />}
        {tab === 'financeiro' && <Finance />}
        {tab === 'perfil' && <Profile />}
      </main>
      <nav className="tabbar">
        <div className="inner">
          {(Object.keys(LABELS) as Tab[]).map((t) => (
            <button key={t} className={`tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[t]}</svg>
              {LABELS[t]}
            </button>
          ))}
        </div>
      </nav>
      <UndoBar />
      {bell && <AlertsSheet onClose={() => setBell(false)} />}
      <EpicMoment />
      <Toasts />
    </>
  )
}
