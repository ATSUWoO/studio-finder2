import { NextRequest, NextResponse } from "next/server"
import { fetchAllAvailability } from "@/lib/providers"
import { ProviderVenue, TimeSlot } from "@/lib/providers/types"

function slotDuration(slot: TimeSlot): number {
  const [sH] = slot.start.split(":").map(Number)
  const [eH] = slot.end.split(":").map(Number)
  return (eH - sH + 24) % 24 || 24
}

function filterByMinDuration(slots: TimeSlot[], minHours: number): TimeSlot[] {
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0]
  const query = searchParams.get("query") ?? ""
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null
  const minCapacity = searchParams.get("minCapacity") ? Number(searchParams.get("minCapacity")) : null
  const openHour = searchParams.get("openHour") ? Number(searchParams.get("openHour")) : null
  const closeHour = searchParams.get("closeHour") ? Number(searchParams.get("closeHour")) : null
  const durationParam = searchParams.get("durationFilter")
  const durationFilter: "2h" | "3h" | "allnight" | null =
    durationParam === "2h" || durationParam === "3h" || durationParam === "allnight" ? durationParam : null

  const { venues: allVenues, errors } = await fetchAllAvailability(date)

  const filtered: ProviderVenue[] = []

  for (const venue of allVenues) {
    if (query) {
      const q = query.toLowerCase()
      if (!venue.venueName.toLowerCase().includes(q) && !venue.address?.toLowerCase().includes(q)) {
        continue
      }
    }

    const matchingRooms = venue.rooms
      .map((room) => {
        let slots = room.slots

        if (maxPrice !== null) {
          slots = slots.filter((s) => s.price === null || s.price <= maxPrice)
        }
        if (openHour !== null || closeHour !== null) {
          slots = slots.filter((slot) => {
            const [startH] = slot.start.split(":").map(Number)
            const [endH] = slot.end.split(":").map(Number)
            if (openHour !== null && startH < openHour) return false
            if (closeHour !== null && endH > closeHour) return false
            return true
          })
        }
        if (durationFilter === "allnight") {
          slots = slots.filter((s) => s.isAllnight === true)
        } else if (durationFilter === "2h" || durationFilter === "3h") {
          const minHours = durationFilter === "2h" ? 2 : 3
          slots = filterByMinDuration(slots, minHours)
        }
        if (minCapacity !== null && room.capacity !== null && room.capacity < minCapacity) return null

        return slots.length > 0 ? { ...room, slots } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (matchingRooms.length === 0) continue

    filtered.push({ ...venue, rooms: matchingRooms })
  }

  return NextResponse.json({ venues: filtered, errors })
}
