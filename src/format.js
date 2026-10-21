export function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
export function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function weeklySummary(sessions, startDate) {
  const start = Date.parse(startDate)
  const weeks = new Map()
  for (const s of sessions) {
    const n = Math.floor((Date.parse(s.scheduled_date) - start) / WEEK_MS) + 1
    const w = weeks.get(n) ?? { week: n, runs: 0, km: 0, long: null, race: false }
    w.runs += 1
    w.km += s.planned_distance_km ?? 0
    if (s.type === 'long') w.long = s.planned_distance_km
    if (s.type === 'race') w.race = true
    weeks.set(n, w)
  }
  return [...weeks.values()]
    .sort((a, b) => a.week - b.week)
    .map((w) => ({
      ...w,
      starts: new Date(start + (w.week - 1) * WEEK_MS).toISOString().slice(0, 10),
    }))
}

export const TYPE_LABELS = {
  easy: 'Easy run', long: 'Long run', tempo: 'Tempo run', interval: 'Intervals',
  recovery: 'Recovery run', rest: 'Rest', race: 'Race day',
}
export const TYPE_SHORT = { easy: 'E', long: 'L', tempo: 'T', interval: 'I', recovery: 'R', rest: '-', race: 'RACE' }
export const STATUS_LABELS = { planned: 'Planned', completed: 'Done', skipped: 'Skipped', missed: 'Missed' }

export function formatLongDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  })
}

export function paceLabel(seconds, km) {
  if (!seconds || !km) return '-'
  const p = Math.round(seconds / km)
  return `${Math.floor(p / 60)}:${String(p % 60).padStart(2, '0')} /km`
}

// Cells for one month, Monday first. Days outside the month are null.
export function monthGrid(year, month) {
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells = []
  for (let i = 0; i < Math.ceil((offset + daysInMonth) / 7) * 7; i++) {
    const day = i - offset + 1
    cells.push(
      day >= 1 && day <= daysInMonth
        ? new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
        : null,
    )
  }
  return cells
}