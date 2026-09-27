// Local-calendar date keys ("YYYY-MM-DD"). All day boundaries use the device's
// timezone, which is the user's timezone in this single-user build.
export type DateKey = string

const pad = (n: number) => String(n).padStart(2, '0')

export const dateKey = (d: Date): DateKey => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Noon avoids DST edge cases when doing day arithmetic.
export const fromKey = (k: DateKey): Date => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export const addDays = (k: DateKey, n: number): DateKey => {
  const d = fromKey(k)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export const diffDays = (a: DateKey, b: DateKey): number =>
  Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86_400_000)

export const weekday = (k: DateKey): number => fromKey(k).getDay() // 0 = domingo

export const weekStart = (k: DateKey): DateKey => addDays(k, -((weekday(k) + 6) % 7)) // segunda
export const weekEnd = (k: DateKey): DateKey => addDays(weekStart(k), 6)
export const monthStart = (k: DateKey): DateKey => `${k.slice(0, 7)}-01`
export const monthEnd = (k: DateKey): DateKey => {
  const d = fromKey(monthStart(k))
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  return dateKey(d)
}

export function* eachDay(from: DateKey, to: DateKey): Generator<DateKey> {
  for (let k = from; k <= to; k = addDays(k, 1)) yield k
}

export const formatShort = (k: DateKey) => {
  const d = fromKey(k)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
