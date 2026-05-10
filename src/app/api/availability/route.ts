import { NextRequest, NextResponse } from "next/server"
import { fetchAllAvailability } from "@/lib/providers"
import { ProviderVenue, TimeSlot } from "@/lib/providers/types"

function matchesTimeFilter(slots: TimeSlot[], openHour: number | null, closeHour: number | null): boolean {
  if (openHour === null && closeHour === null) return true
  return slots.some((slot) => {
    const [startH] = slot.start.split(":").map(Number)
    const [endH] = slot.end.split(":").map(Number)
    if (openHour !== null && startH < openHour) return false
    if (closeHour !== null && endH > closeHour) return false
    return true
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0]
  const query = searchParams.get("query") ?? ""
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null
  const minCapacity = searchParams.get("minCapacity") ? Number(searchParams.get("minCapacity")) : null
  const openHour = searchParams.get("openHour") ? Number(searchParams.get("openHour")) : null
  const closeHour = searchParams.get("closeHour") ? Number(searchParams.get("closeHour")) : null

  const allVenues = await fetchAllAvailability(date)

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
        if (!matchesTimeFilter(slots, openHour, closeHour)) return null
        if (minCapacity !== null && room.capacity !== null && room.capacity < minCapacity) return null

        return slots.length > 0 ? { ...room, slots } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (matchingRooms.length === 0) continue

    filtered.push({ ...venue, rooms: matchingRooms })
  }

  return NextResponse.json(filtered)
}
