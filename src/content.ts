// Narrative content: classes (§8) and achievements (§13). Keys are stable;
// texts can change freely.
import type { AttributeKey, Category } from './config'

export type ClassDef = {
  key: string
  name: string
  tier: number
  lore: string
  minLevel: number
  // Minimum attribute levels (disciplina included where the spec uses its level).
  attrs?: Partial<Record<AttributeKey, number>>
  // Every attribute at least this level.
  allAttrs?: number
  // 30-day completion rate, requiring a full window of data.
  rate?: number
  requirementText: string
}

export const SLOGAN = 'Não há volta. Só evolução.'

export const CLASSES: ClassDef[] = [
  { key: 'despertado', name: 'Despertado', tier: 0, minLevel: 1, requirementText: 'Classe inicial',
    lore: 'A primeira vez que alguém abre os olhos para o próprio potencial não tem nome de especialidade. Só tem início.' },

  { key: 'lamina', name: 'Lâmina', tier: 1, minLevel: 5, attrs: { saude: 15 }, requirementText: 'Nível 5 · Saúde 15',
    lore: 'O corpo como arma forjada pela repetição.' },
  { key: 'oraculo', name: 'Oráculo', tier: 1, minLevel: 5, attrs: { sabedoria: 15 }, requirementText: 'Nível 5 · Sabedoria 15',
    lore: 'Quem começa a enxergar padrões que os outros não veem.' },
  { key: 'devoto_chama', name: 'Devoto da Chama', tier: 1, minLevel: 5, attrs: { espiritualidade: 15 }, requirementText: 'Nível 5 · Espiritualidade 15',
    lore: 'Uma fé que ainda arde baixo, mas já não se apaga.' },
  { key: 'forjador_fortuna', name: 'Forjador de Fortuna', tier: 1, minLevel: 5, attrs: { prosperidade: 15 }, requirementText: 'Nível 5 · Prosperidade 15',
    lore: 'O primeiro a entender que riqueza se constrói, não se espera.' },
  { key: 'inquebravel', name: 'Inquebrável', tier: 1, minLevel: 5, rate: 0.75, requirementText: 'Nível 5 · 75% de conclusão por 30 dias',
    lore: 'Quem não falha porque decidiu, há muito, não falhar.' },

  { key: 'centuriao', name: 'Centurião', tier: 2, minLevel: 10, attrs: { saude: 30 }, rate: 0.8, requirementText: 'Nível 10 · Saúde 30 · 80% de conclusão',
    lore: 'Comanda o próprio corpo como um general comanda tropas.' },
  { key: 'arquimago', name: 'Arquimago', tier: 2, minLevel: 10, attrs: { sabedoria: 30 }, rate: 0.8, requirementText: 'Nível 10 · Sabedoria 30 · 80% de conclusão',
    lore: 'Domina o conhecimento com precisão cirúrgica.' },
  { key: 'profeta', name: 'Profeta', tier: 2, minLevel: 10, attrs: { espiritualidade: 30, sabedoria: 30 }, requirementText: 'Nível 10 · Espiritualidade 30 · Sabedoria 30',
    lore: 'Vê além do presente, guiado por fé e razão ao mesmo tempo.' },
  { key: 'magnata', name: 'Magnata em Ascensão', tier: 2, minLevel: 10, attrs: { prosperidade: 30, sabedoria: 30 }, requirementText: 'Nível 10 · Prosperidade 30 · Sabedoria 30',
    lore: 'Já não improvisa, calcula cada movimento patrimonial.' },
  { key: 'monge_ferro', name: 'Monge de Ferro', tier: 2, minLevel: 10, attrs: { espiritualidade: 30 }, rate: 0.85, requirementText: 'Nível 10 · Espiritualidade 30 · 85% de conclusão',
    lore: 'Disciplina espiritual que não se abala por nada.' },
  { key: 'barao_sombras', name: 'Barão das Sombras', tier: 2, minLevel: 10, attrs: { prosperidade: 30 }, rate: 0.85, requirementText: 'Nível 10 · Prosperidade 30 · 85% de conclusão',
    lore: 'Constrói impérios silenciosamente, sem precisar de plateia.' },

  { key: 'tita', name: 'Titã', tier: 3, minLevel: 15, attrs: { saude: 50, sabedoria: 50, disciplina: 50 }, requirementText: 'Nível 15 · Saúde, Sabedoria e Disciplina 50',
    lore: 'Força, mente e constância fundidas em uma só presença.' },
  { key: 'senhor_eras', name: 'Senhor das Eras', tier: 3, minLevel: 15, attrs: { prosperidade: 50, sabedoria: 50, disciplina: 50 }, requirementText: 'Nível 15 · Prosperidade, Sabedoria e Disciplina 50',
    lore: 'Pensa em décadas enquanto os outros pensam em dias.' },
  { key: 'guardiao', name: 'Guardião Sagrado', tier: 3, minLevel: 15, attrs: { espiritualidade: 50, disciplina: 50, saude: 50 }, requirementText: 'Nível 15 · Espiritualidade, Disciplina e Saúde 50',
    lore: 'Corpo, fé e disciplina como um só voto.' },
  { key: 'soberano', name: 'Soberano', tier: 3, minLevel: 15, allAttrs: 40, requirementText: 'Nível 15 · todos os atributos 40',
    lore: 'Não domina uma área. Domina a si mesmo, por inteiro.' },

  { key: 'monarca', name: 'Monarca', tier: 4, minLevel: 20, allAttrs: 70, requirementText: 'Nível 20 · todos os atributos 70',
    lore: 'Não existe nada acima disto. Quem chega aqui já não compete com os outros, só com a própria lenda.' },
]

export const classByKey = (key: string) => CLASSES.find((c) => c.key === key) ?? CLASSES[0]

export type AchievementDef = { key: string; name: string; description: string }

const attrAchievements = (cat: Category, name: string): AchievementDef[] =>
  [25, 50, 75, 100].map((lvl) => ({ key: `attr_${cat}_${lvl}`, name: `${name} ${lvl}`, description: `${name} atingiu o nível ${lvl}.` }))

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'level_2', name: 'Primeiro Passo', description: 'Subiu de nível pela primeira vez.' },
  { key: 'level_5', name: 'Nível 5', description: 'Alcançou o nível 5.' },
  { key: 'level_10', name: 'Nível 10', description: 'Alcançou o nível 10.' },
  { key: 'level_15', name: 'Nível 15', description: 'Alcançou o nível 15.' },
  { key: 'level_20', name: 'Nível 20', description: 'Alcançou o nível 20.' },
  { key: 'class_1', name: 'Nova Forma', description: 'Primeira troca de classe.' },
  { key: 'class_2', name: 'Metamorfose', description: 'Segunda troca de classe.' },
  { key: 'prestige_1', name: 'Renascimento', description: 'Entrou em Prestígio pela primeira vez.' },
  { key: 'streak_7', name: 'Sete Dias', description: 'Sequência de 7 dias.' },
  { key: 'streak_30', name: 'Trinta Dias', description: 'Sequência de 30 dias.' },
  { key: 'streak_100', name: 'Cem Dias', description: 'Sequência de 100 dias.' },
  { key: 'streak_365', name: 'Um Ano', description: 'Sequência de 365 dias.' },
  { key: 'perfect_7', name: 'Semana Perfeita', description: '7 dias perfeitos seguidos.' },
  { key: 'perfect_30', name: 'Mês Perfeito', description: '30 dias perfeitos seguidos.' },
  { key: 'first_boss', name: 'Primeiro Boss', description: 'Derrotou o primeiro boss.' },
  { key: 'comeback_30d', name: 'Retorno', description: 'Voltou após 30 dias ou mais parado.' },
  { key: 'bounce_back', name: 'De Pé', description: 'Quebrou a sequência e voltou no dia seguinte.' },
  ...attrAchievements('saude', 'Saúde'),
  ...attrAchievements('sabedoria', 'Sabedoria'),
  ...attrAchievements('espiritualidade', 'Espiritualidade'),
  ...attrAchievements('prosperidade', 'Prosperidade'),
]

export const achievementByKey = (key: string) => ACHIEVEMENTS.find((a) => a.key === key)
