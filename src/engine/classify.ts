// Rule-based stand-in for `classify-mission` until the LLM layer exists.
// It reads free text like "academia seg, qua e sex" and returns category,
// difficulty and recurrence. The user may correct category/difficulty, never XP.
import { XP_PICK, XP_RANGES, type Category, type Difficulty, type MissionType } from '../config'

export type Classification = {
  title: string
  category: Category | null
  difficulty: Difficulty
  recurrence: number[] | null // null = pontual (missão pessoal)
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const KEYWORDS: Record<Category, string[]> = {
  saude: ['academia', 'treino', 'treinar', 'musculacao', 'correr', 'corrida', 'caminhar', 'caminhada', 'bike', 'pedalar',
    'natacao', 'nadar', 'yoga', 'alongar', 'alongamento', 'agua', 'dormir', 'sono', 'dieta', 'salada', 'fruta', 'proteina',
    'acucar', 'refrigerante', 'alcool', 'cerveja', 'flexao', 'abdominal', 'crossfit', 'luta', 'jiu', 'muay', 'futebol',
    'exercicio', 'passos', 'vitamina', 'suplemento', 'refeicao', 'cozinhar', 'marmita', 'medico', 'dentista', 'pilates'],
  sabedoria: ['ler', 'leitura', 'livro', 'estudar', 'estudo', 'curso', 'aula', 'ingles', 'espanhol', 'idioma', 'duolingo',
    'podcast', 'artigo', 'aprender', 'revisar', 'resumo', 'faculdade', 'mba', 'pos', 'prova', 'concurso', 'programar',
    'codigo', 'escrever', 'pesquisar', 'documentario', 'flashcard', 'anki', 'tese', 'certificacao'],
  espiritualidade: ['orar', 'oracao', 'rezar', 'terco', 'biblia', 'versiculo', 'devocional', 'igreja', 'missa', 'culto',
    'meditar', 'meditacao', 'gratidao', 'jejum', 'salmo', 'louvor', 'fe', 'deus', 'silencio', 'diario', 'journaling',
    'proposito', 'voluntario', 'caridade', 'perdoar'],
  prosperidade: ['investir', 'investimento', 'aporte', 'poupar', 'economizar', 'guardar', 'gastos', 'despesas', 'orcamento',
    'planilha', 'financas', 'financeiro', 'dinheiro', 'renda', 'divida', 'boleto', 'contas', 'patrimonio', 'acoes',
    'tesouro', 'reserva', 'vendas', 'vender', 'cliente', 'prospectar', 'negocio', 'freela', 'salario', 'extrato', 'cartao'],
}

const HARD = ['academia', 'treino', 'musculacao', 'corrida', 'correr', 'crossfit', 'jejum', 'estudar', 'curso', 'aula', 'luta', 'prospectar']
const EASY = ['agua', 'orar', 'oracao', 'gratidao', 'alongar', 'vitamina', 'suplemento', 'versiculo', 'gastos', 'extrato', 'duolingo', 'salmo']

const DAY_WORDS: [RegExp, number][] = [
  [/\bdom(ingo)?s?\b/, 0], [/\bseg(unda)?s?(-feira)?\b/, 1], [/\bter(ca)?s?(-feira)?\b/, 2], [/\bqua(rta)?s?(-feira)?\b/, 3],
  [/\bqui(nta)?s?(-feira)?\b/, 4], [/\bsex(ta)?s?(-feira)?\b/, 5], [/\bsab(ado)?s?\b/, 6],
]
const ALL = [0, 1, 2, 3, 4, 5, 6]

export function parseRecurrence(text: string): { days: number[] | null; pontual: boolean; rest: string } {
  let t = ' ' + norm(text) + ' '
  const strip = (re: RegExp) => { t = t.replace(re, ' ') }

  if (/\b(hoje|amanha|uma vez|pontual)\b/.test(t)) {
    strip(/\b(hoje|amanha|uma vez|pontual)\b/g)
    return { days: null, pontual: true, rest: t }
  }
  if (/\b(todo dia|todos os dias|diariamente|diario|toda noite|toda manha|sempre)\b/.test(t)) {
    strip(/\b(todo dia|todos os dias|diariamente|diario|toda noite|toda manha|sempre)\b/g)
    return { days: ALL, pontual: false, rest: t }
  }
  if (/\b(dias uteis|dia util|de segunda a sexta|seg a sex)\b/.test(t)) {
    strip(/\b(dias uteis|dia util|de segunda a sexta|seg a sex)\b/g)
    return { days: [1, 2, 3, 4, 5], pontual: false, rest: t }
  }
  if (/\b(fim de semana|fins de semana|finais de semana)\b/.test(t)) {
    strip(/\b(fim de semana|fins de semana|finais de semana)\b/g)
    return { days: [0, 6], pontual: false, rest: t }
  }
  const found = new Set<number>()
  for (const [re, d] of DAY_WORDS) {
    if (re.test(t)) {
      found.add(d)
      strip(new RegExp(re.source, 'g'))
    }
  }
  if (found.size) {
    strip(/\b(e|as|nas|nos|na|no|toda|todas|toda)\b/g)
    return { days: [...found].sort(), pontual: false, rest: t }
  }
  return { days: null, pontual: false, rest: t }
}

export function classifyCategory(text: string): Category | null {
  const words = norm(text).split(/[^a-z0-9]+/)
  let best: Category | null = null
  let bestScore = 0
  for (const cat of Object.keys(KEYWORDS) as Category[]) {
    const score = KEYWORDS[cat].filter((k) => words.includes(k) || (k.length >= 4 && words.some((w) => w.startsWith(k)))).length
    if (score > bestScore) { best = cat; bestScore = score }
  }
  return best
}

export function classifyDifficulty(text: string): Difficulty {
  const t = norm(text)
  const num = (re: RegExp) => { const m = t.match(re); return m ? Number(m[1].replace(',', '.')) : null }
  const minutes = num(/(\d+)\s*(min|minuto)/) ?? ((num(/(\d+(?:[.,]\d+)?)\s*(h\b|hora)/) ?? 0) * 60 || null)
  if (minutes !== null) return minutes <= 15 ? 'simples' : minutes <= 45 ? 'moderada' : 'dificil'
  const km = num(/(\d+(?:[.,]\d+)?)\s*km/)
  if (km !== null) return km <= 3 ? 'simples' : km <= 8 ? 'moderada' : 'dificil'
  const pages = num(/(\d+)\s*(pag|pagina)/)
  if (pages !== null) return pages <= 10 ? 'simples' : pages <= 30 ? 'moderada' : 'dificil'
  const words = t.split(/[^a-z0-9]+/)
  if (words.some((w) => HARD.includes(w))) return 'moderada'
  if (words.some((w) => EASY.includes(w))) return 'simples'
  return 'moderada'
}

const tidyTitle = (original: string, normalizedRest: string) => {
  // Keep the user's original casing/accents for words that survived stripping.
  const keep = new Set(normalizedRest.split(/\s+/).filter(Boolean))
  const words = original.split(/\s+/).filter((w) => keep.has(norm(w).replace(/[,.;]+$/, '')))
  const title = words.join(' ').replace(/[,;]+$/, '').trim() || original.trim()
  return title.charAt(0).toUpperCase() + title.slice(1)
}

export function classify(text: string): Classification {
  const { days, pontual, rest } = parseRecurrence(text)
  return {
    title: tidyTitle(text, rest),
    category: classifyCategory(text),
    difficulty: classifyDifficulty(text),
    recurrence: pontual ? null : days ?? ALL,
  }
}

// §6.1 — the engine alone prices missions, and rejects out-of-range values.
export function priceMission(type: MissionType, difficulty: Difficulty): number {
  if (type === 'diaria') {
    const xp = XP_PICK.diaria[difficulty]
    const [lo, hi] = XP_RANGES.diaria[difficulty]
    if (xp < lo || xp > hi) throw new Error('XP fora da faixa oficial')
    return xp
  }
  if (type === 'pessoal') {
    const xp = XP_PICK.pessoal[difficulty]
    const [lo, hi] = XP_RANGES.pessoal
    if (xp < lo || xp > hi) throw new Error('XP fora da faixa oficial')
    return xp
  }
  throw new Error(`Tipo ${type} não é precificado por dificuldade`)
}
