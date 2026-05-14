import { NextRequest, NextResponse } from "next/server"
import { fetchAllAvailability } from "@/lib/providers"
import { ProviderVenue } from "@/lib/providers/types"
import { findArea, venueMatchesArea } from "@/lib/areas"
import { parseIntOrNull, parseDuration } from "@/lib/filterUrl"
import { filterByMinDuration } from "@/lib/slotFilters"
import { todayStr } from "@/lib/dateUtils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") ?? todayStr()
  const query = searchParams.get("query") ?? ""
  const maxPrice = parseIntOrNull(searchParams.get("maxPrice"))
  const minCapacity = parseIntOrNull(searchParams.get("minCapacity"))
  const openHour = parseIntOrNull(searchParams.get("openHour"))
  const closeHour = parseIntOrNull(searchParams.get("closeHour"))
  const durationFilter = parseDuration(searchParams.get("durationFilter"))
  const area = findArea(searchParams.get("areaId"))

  const { venues: allVenues, errors } = await fetchAllAvailability(date)

  const filtered: ProviderVenue[] = []

  for (const venue of allVenues) {
    if (query) {
      const q = query.toLowerCase()
      if (!venue.venueName.toLowerCase().includes(q) && !venue.address?.toLowerCase().includes(q)) {
        continue
      }
    }
    if (area && !venueMatchesArea(area, venue.lat, venue.lng, venue.address)) {
      continue
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
