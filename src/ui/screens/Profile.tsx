import { useRef, useState } from 'react'
import { PRESTIGE } from '../../config'
import { canPrestige } from '../../engine/engine'
import type { State } from '../../engine/types'
import { useGame, useStore } from '../../store'
import { IdentityCard } from '../components/bits'

export function Finance() {
  return (
    <div className="stack">
      <h1 style={{ fontSize: 22 }}>Financeiro</h1>
      <div className="card stack" style={{ gap: 8 }}>
        <p style={{ fontWeight: 600 }}>Em construção</p>
        <p className="small muted">
          O registro de patrimônio e investimentos chega numa próxima versão e vai alimentar Prosperidade e os marcos financeiros.
          Por enquanto, registre suas metas financeiras como missões de Prosperidade (ex: “anotar gastos todo dia”, “aporte mensal hoje”).
        </p>
      </div>
    </div>
  )
}

export function Profile() {
  const game = useGame()
  const { rename, prestige, importGame, reset, toast } = useStore()
  const [name, setName] = useState(game.profile.name)
  const fileRef = useRef<HTMLInputElement>(null)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sol-backup-${game.lastProcessedDate}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as State
      if (data.version !== 1 || !data.profile || !Array.isArray(data.missions)) throw new Error()
      if (confirm('Substituir todos os dados atuais pelo backup?')) { importGame(data); toast('Backup restaurado') }
    } catch {
      toast('Arquivo de backup inválido')
    }
  }

  return (
    <div className="stack">
      <h1 style={{ fontSize: 22 }}>Perfil</h1>
      <IdentityCard game={game} />

      {canPrestige(game) && (
        <div className="card stack" style={{ gap: 10, borderColor: 'rgba(186,140,60,0.4)' }}>
          <p className="gold epic-font" style={{ fontSize: 18 }}>Prestígio disponível</p>
          <p className="small muted">O nível volta para 1 e cada nível passa a exigir mais XP. Classe, atributos e conquistas permanecem. Você ganha o título {PRESTIGE[game.profile.prestige].name}.</p>
          <button className="btn gold" onClick={() => confirm('Entrar em Prestígio? Isso não pode ser desfeito.') && prestige()}>Entrar em Prestígio</button>
        </div>
      )}

      <p className="section-title">Configurações</p>
      <div className="card stack" style={{ gap: 12 }}>
        <label className="stack" style={{ gap: 6 }}>
          <span className="tiny muted">NOME</span>
          <div className="row">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn ghost" disabled={name.trim() === game.profile.name || !name.trim()} onClick={() => { rename(name); toast('Nome atualizado') }}>Salvar</button>
          </div>
        </label>
        <div>
          <span className="tiny muted">MODO DE OPERAÇÃO</span>
          <p style={{ marginTop: 4 }}>Arquiteto</p>
          <p className="tiny muted">Você define as missões, o Sistema classifica e precifica. O Modo Sistema (missões geradas por IA) chega quando a IA for integrada.</p>
        </div>
      </div>

      <p className="section-title">Seus dados</p>
      <div className="card stack" style={{ gap: 10 }}>
        <p className="small muted">Tudo fica salvo só neste aparelho. Exporte um backup de vez em quando, principalmente antes de trocar de celular.</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={exportData}>Exportar backup</button>
          <button className="btn ghost" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>Importar</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        <button className="link" style={{ alignSelf: 'flex-start', color: 'var(--alert)' }}
          onClick={() => confirm('Apagar todos os dados do SOL neste aparelho? Exporte um backup antes.') && confirm('Tem certeza? Não há como desfazer.') && reset()}>
          Apagar todos os dados
        </button>
      </div>

      <p className="section-title">Instalar no celular</p>
      <div className="card small muted stack" style={{ gap: 6 }}>
        <p><b style={{ color: 'var(--text)' }}>iPhone:</b> abra no Safari → botão Compartilhar → “Adicionar à Tela de Início”.</p>
        <p><b style={{ color: 'var(--text)' }}>Android:</b> abra no Chrome → menu ⋮ → “Instalar app” ou “Adicionar à tela inicial”.</p>
      </div>
      <p className="tiny muted" style={{ textAlign: 'center' }}>SOL v{__APP_VERSION__}</p>
    </div>
  )
}
