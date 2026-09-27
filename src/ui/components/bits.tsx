import { ATTRIBUTE_INFO, ATTRIBUTES, PRESTIGE, type AttributeKey, type Category } from '../../config'
import { classByKey } from '../../content'
import { levelProgress } from '../../engine/progression'
import type { State } from '../../engine/types'

export const fmt = (n: number) => n.toLocaleString('pt-BR')

export const AttrTag = ({ cat }: { cat: Category }) => (
  <span className="tag" style={{ color: ATTRIBUTE_INFO[cat].color }}>{ATTRIBUTE_INFO[cat].name.toUpperCase()}</span>
)

export function IdentityCard({ game }: { game: State }) {
  const p = levelProgress(game)
  const cls = classByKey(game.profile.classKey)
  const pct = p.max ? 100 : Math.max(2, (p.into / p.needed) * 100)
  return (
    <div className="identity">
      <div className="row" style={{ gap: 14 }}>
        <div className="diamond"><span>{p.level}</span></div>
        <div style={{ minWidth: 0 }}>
          <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '0.18em' }}>
            Nível{game.profile.prestige > 0 && <span className="gold"> · {PRESTIGE[game.profile.prestige - 1].symbol}</span>}
          </div>
          <div className="cls">{cls.name}</div>
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        <div className="row between small muted" style={{ marginTop: 6 }}>
          <span>{p.max ? 'Nível máximo do ciclo' : `${fmt(p.into)} / ${fmt(p.needed)} XP`}</span>
          <span>{p.max ? 'Prestígio disponível' : `Nível ${p.level + 1}`}</span>
        </div>
      </div>
    </div>
  )
}

// Five-axis radar. Scale grows with the highest attribute so early levels
// are still readable.
export function Radar({ levels, size = 260 }: { levels: Record<AttributeKey, number>; size?: number }) {
  const max = Math.max(20, Math.ceil(Math.max(...Object.values(levels)) / 10) * 10)
  const c = size / 2
  const r = size / 2 - 42
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / ATTRIBUTES.length
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v]
  }
  const poly = (v: (i: number) => number) => ATTRIBUTES.map((_, i) => pt(i, v(i)).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }} role="img"
      aria-label={ATTRIBUTES.map((k) => `${ATTRIBUTE_INFO[k].name} ${levels[k]}`).join(', ')}>
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={poly(() => f)} fill="none" stroke="#2A2A32" strokeWidth="1" />)}
      {ATTRIBUTES.map((k, i) => { const [x, y] = pt(i, 1); return <line key={k} x1={c} y1={c} x2={x} y2={y} stroke="#2A2A32" /> })}
      <polygon points={poly((i) => Math.max(0.04, levels[ATTRIBUTES[i]] / max))} fill="rgba(236,236,240,0.08)" stroke="#ECECF0" strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round" />
      {ATTRIBUTES.map((k, i) => {
        const [x, y] = pt(i, Math.max(0.04, levels[k] / max))
        return <circle key={k} cx={x} cy={y} r="3.5" fill={ATTRIBUTE_INFO[k].color} />
      })}
      {ATTRIBUTES.map((k, i) => {
        const [x, y] = pt(i, 1.22)
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontFamily="Inter, sans-serif">
            <tspan fill={ATTRIBUTE_INFO[k].color} fontWeight="600">{ATTRIBUTE_INFO[k].short}</tspan>
            <tspan fill="#ECECF0" dx="4">{levels[k]}</tspan>
          </text>
        )
      })}
    </svg>
  )
}

export const Sheet = ({ onClose, children }: { onClose: () => void; children: React.ReactNode }) => (
  <div className="scrim" onClick={onClose}>
    <div className="sheet" onClick={(e) => e.stopPropagation()}>{children}</div>
  </div>
)
