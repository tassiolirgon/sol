import { SLOGAN } from '../../content'
import { dateKey, diffDays } from '../../engine/dates'
import { allAttributeLevels, bossProgress, dailyMissionsFor, isDoneOn } from '../../engine/progression'
import type { Mission } from '../../engine/types'
import { useGame } from '../../store'
import { AttrTag, IdentityCard, Radar } from '../components/bits'
import { MissionItem } from '../components/MissionItem'

const greeting = (h: number) => (h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite')

export const activeBosses = (missions: Mission[], today: string) =>
  missions.filter((m) => (m.type === 'boss_semanal' || m.type === 'boss_mensal') && m.status === 'ativa' && m.period && m.period.end >= today)

export function Home({ onBell, onGoMissions }: { onBell: () => void; onGoMissions: () => void }) {
  const game = useGame()
  const now = new Date()
  const today = dateKey(now)
  const daily = dailyMissionsFor(game, today)
  const personal = game.missions.filter((m) => m.type === 'pessoal' && (m.status === 'ativa' || game.completions.some((c) => c.missionId === m.id && c.date === today)))
  const doneDaily = daily.filter((m) => isDoneOn(game, m.id, today)).length
  const bosses = activeBosses(game.missions, today)
  const weekly = bosses.find((b) => b.type === 'boss_semanal') ?? bosses[0]
  const unread = game.actions.filter((a) => !a.ack).length
  const streakAlive = game.streak.lastActiveDate === today || game.streak.current > 0

  return (
    <div className="stack">
      <header className="row between greet">
        <div>
          <h1>{greeting(now.getHours())}, {game.profile.name}</h1>
          <p className="small muted">Seu Sistema está ativo</p>
        </div>
        <button className="bell" onClick={onBell} aria-label={`Alertas${unread ? `, ${unread} novos` : ''}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          {unread > 0 && <span className="dot" />}
        </button>
      </header>

      <IdentityCard game={game} />

      <div className="tiles">
        <div className="tile">
          <span className="tiny muted">SEQUÊNCIA</span>
          <b>{streakAlive ? game.streak.current : 0} {game.streak.current === 1 ? 'dia' : 'dias'}</b>
        </div>
        <div className="tile">
          <span className="tiny muted">HOJE</span>
          <b>{doneDaily}/{daily.length} <span className="small muted" style={{ fontWeight: 400 }}>missões</span></b>
        </div>
        <div className="tile">
          <span className="tiny muted">BOSS</span>
          <b>{weekly ? `${diffDays(weekly.period!.end, today) + 1}d restantes` : '—'}</b>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 8px 4px' }}>
        <Radar levels={allAttributeLevels(game, today)} />
      </div>

      <div>
        <p className="section-title" style={{ marginBottom: 12 }}>Missões do dia</p>
        {daily.length + personal.length === 0 && (
          <div className="card small muted">Nenhuma missão para hoje. <button className="link" onClick={onGoMissions}>Registrar missão</button></div>
        )}
        {daily.map((m) => <MissionItem key={m.id} mission={m} done={isDoneOn(game, m.id, today)} />)}
        {personal.map((m) => <MissionItem key={m.id} mission={m} done={m.status === 'concluida'} />)}
      </div>

      {weekly && <BossBanner boss={weekly} onGo={onGoMissions} />}

      <p className="slogan">{SLOGAN}</p>
    </div>
  )
}

export function BossBanner({ boss, onGo }: { boss: Mission; onGo?: () => void }) {
  const game = useGame()
  const p = bossProgress(game, boss)
  return (
    <div className="boss">
      <div className="row between">
        <span className="tiny muted" style={{ letterSpacing: '0.16em' }}>{boss.type === 'boss_semanal' ? 'BOSS SEMANAL' : 'BOSS MENSAL'}</span>
        <AttrTag cat={boss.category} />
      </div>
      <h3 className="epic-font" style={{ fontSize: 19, marginTop: 6 }}>{boss.title}</h3>
      <p className="small muted" style={{ marginTop: 2 }}>{boss.description}</p>
      <div className="bar" style={{ marginTop: 12 }}><i style={{ width: `${(p.done / p.count) * 100}%`, background: 'var(--text-muted)' }} /></div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span className="small">{p.done}/{p.count} · +{boss.xp} XP</span>
        {onGo && <button className="link" onClick={onGo}>Ver bosses</button>}
      </div>
    </div>
  )
}
