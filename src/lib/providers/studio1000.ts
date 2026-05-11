import { AvailabilityProvider, ProviderVenue, TimeSlot } from "./types"
import { findStudio1000Venue, isKnownStudio1000Id } from "@/lib/venueMaster"

const BASE_URL = "https://api.m.studio1000.jp/api"
const CHUNK_SIZE = 20

const OSAKA_BOUNDS = { latMin: 34.0, latMax: 35.1, lngMin: 135.0, lngMax: 136.0 }

interface S1Room {
  id: number
  name: string
  capacity: number
  studio: {
    id: number
    name: string
    address: string
    location?: { coordinates: [number, number] }
  }
}

interface S1Slot {
  roomId: string
  hourStart: number
  hourEnd: number
  available: boolean | string
  costDefault: number | string
}

function fixCoords(coords: [number, number]): [number, number] | null {
  const [a, b] = coords
  if (a >= 20 && a <= 46 && b >= 122 && b <= 154) return [a, b]
  if (b >= 20 && b <= 46 && a >= 122 && a <= 154) return [b, a]
  return null
}

function isValidOsakaCoords(lat: number, lng: number): boolean {
  return (
    lat >= OSAKA_BOUNDS.latMin && lat <= OSAKA_BOUNDS.latMax &&
    lng >= OSAKA_BOUNDS.lngMin && lng <= OSAKA_BOUNDS.lngMax
  )
}

function isOsaka(room: S1Room): boolean {
  if (room.studio?.address?.includes("大阪")) return true
  const coords = room.studio?.location?.coordinates
  if (coords) {
    const fixed = fixCoords(coords)
    if (fixed) return isValidOsakaCoords(fixed[0], fixed[1])
  }
  // 住所・座標で判定できない場合はstudioIdで照合（studioId指定済みのマスターのみマッチ）
  return isKnownStudio1000Id(room.studio.id)
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, (i + 1) * size)
  )
}

function toHHMM(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`
}

export class Studio1000Provider implements AvailabilityProvider {
  readonly providerId = "studio1000"

  async fetchAvailability(date: string): Promise<ProviderVenue[]> {
    const roomsRes = await fetch(`${BASE_URL}/room`, {
      next: { revalidate: 60 },
    })
    if (!roomsRes.ok) throw new Error(`Studio1000 /room HTTP ${roomsRes.status}`)
    const allRooms: S1Room[] = await roomsRes.json()

    const osakaRooms = allRooms.filter(isOsaka)
    if (osakaRooms.length === 0) return []

    const timeStart = `${date}T06:00:00.000+09:00`
    const timeEnd = `${date}T23:59:59.000+09:00`

    const chunks = chunk(osakaRooms, CHUNK_SIZE)
    const slotResults = await Promise.all(
      chunks.map(async (rooms) => {
        const params = new URLSearchParams({ timeStart, timeEnd })
        rooms.forEach((r) => params.append("roomIds", String(r.id)))
        const res = await fetch(`${BASE_URL}/room/history?${params}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`Studio1000 /room/history HTTP ${res.status}`)
        return res.json() as Promise<S1Slot[]>
      })
    )
    const allSlots: S1Slot[] = slotResults.flat()

    const slotsByRoom = new Map<string, TimeSlot[]>()
    for (const slot of allSlots) {
      const isAvailable = slot.available === true || slot.available === "true"
      if (!isAvailable) continue
      const price = parseFloat(String(slot.costDefault)) || null
      const entry: TimeSlot = {
        start: toHHMM(slot.hourStart),
        end: toHHMM(slot.hourEnd),
        price: price && price > 0 ? price : null,
      }
      const key = String(slot.roomId)
      slotsByRoom.set(key, [...(slotsByRoom.get(key) ?? []), entry])
    }

    const studioMap = new Map<number, ProviderVenue>()
    for (const room of osakaRooms) {
      const slots = slotsByRoom.get(String(room.id)) ?? []
      if (slots.length === 0) continue

      if (!studioMap.has(room.studio.id)) {
        const master = findStudio1000Venue(room.studio.id, room.studio.name)

        const apiCoords = room.studio.location?.coordinates
        const fixedApiCoords = apiCoords ? fixCoords(apiCoords) : null
        const validApiCoords =
          fixedApiCoords && isValidOsakaCoords(fixedApiCoords[0], fixedApiCoords[1])
            ? fixedApiCoords
            : null

        studioMap.set(room.studio.id, {
          venueId: master?.venueId ?? String(room.studio.id),
          venueName: master?.venueName ?? room.studio.name,
          providerId: this.providerId,
          address: master?.address ?? room.studio.address,
          lat: master?.lat ?? validApiCoords?.[0] ?? null,
          lng: master?.lng ?? validApiCoords?.[1] ?? null,
          sourceUrl: master?.sourceUrl ?? `https://m.studio1000.jp/studio/${room.studio.id}`,
          rooms: [],
        })
      }

      studioMap.get(room.studio.id)!.rooms.push({
        roomId: String(room.id),
        roomName: room.name,
        capacity: room.capacity,
        slots,
      })
    }

    return Array.from(studioMap.values())
  }
}
