import { TimeSlot } from "@/lib/providers/types"

function slotDuration(slot: TimeSlot): number {
  const [sH] = slot.start.split(":").map(Number)
  const [eH] = slot.end.split(":").map(Number)
  return (eH - sH + 24) % 24 || 24
}

/**
 * 連続コマフィルタ。
 * 同一室のスロットを開始時刻でソートし、隣接（prev.end === next.start）するグループを連結。
 * 合計時間が minHours 以上のグループのみ残す。
 */
export function filterByMinDuration(slots: TimeSlot[], minHours: number): TimeSlot[] {
  if (slots.length === 0) return slots
  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start))
  const kept: TimeSlot[] = []
  let i = 0
  while (i < sorted.length) {
    let j = i
    let total = slotDuration(sorted[j])
    while (j + 1 < sorted.length && sorted[j].end === sorted[j + 1].start) {
      j++
      total += slotDuration(sorted[j])
    }
    if (total >= minHours) {
      for (let k = i; k <= j; k++) kept.push(sorted[k])
    }
    i = j + 1
  }
  return kept
}
