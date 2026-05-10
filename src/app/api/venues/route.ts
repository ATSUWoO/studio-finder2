import { NextRequest, NextResponse } from "next/server"
import { demoVenues } from "@/data/demo"
import { VenueSearchResult } from "@/lib/types"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query") || ""
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : null
  const minCapacity = searchParams.get("minCapacity") ? Number(searchParams.get("minCapacity")) : null
  const openHour = searchParams.get("openHour") ? Number(searchParams.get("openHour")) : null
  const closeHour = searchParams.get("closeHour") ? Number(searchParams.get("closeHour")) : null

  const results: VenueSearchResult[] = []

  for (const venue of demoVenues) {
    if (query) {
      const q = query.toLowerCase()
      const matchesName = venue.name.toLowerCase().includes(q)
      const matchesStation = venue.nearest_station?.toLowerCase().includes(q) ?? false
      const matchesCity = venue.city?.toLowerCase().includes(q) ?? false
      if (!matchesName && !matchesStation && !matchesCity) continue
    }

    const matchingRooms = venue.rooms.filter((room) => {
      if (maxPrice !== null && room.price_per_hour !== null && room.price_per_hour > maxPrice) return false
      if (minCapacity !== null && room.capacity !== null && room.capacity < minCapacity) return false
      if (openHour !== null && room.open_hour !== null && room.open_hour > openHour) return false
      if (closeHour !== null && room.close_hour !== null && room.close_hour < closeHour) return false
      return true
    })

    if (matchingRooms.length === 0) continue

    const prices = matchingRooms.map((r) => r.price_per_hour).filter((p): p is number => p !== null)
    results.push({
      ...venue,
      matchingRoomCount: matchingRooms.length,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
      maxPrice: prices.length > 0 ? Math.max(...prices) : null,
    })
  }

  return NextResponse.json(results)
}
