export function todayStr(): string {
  return new Date().toISOString().split("T")[0]
}

export function tomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}

/** 現在時刻の次の整時を返す（7〜23 にクランプ） */
export function nowOpenHour(): number {
  return Math.max(7, Math.min(23, new Date().getHours() + 1))
}
