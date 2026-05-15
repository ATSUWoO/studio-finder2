import { AvailabilityProvider, ProviderVenue, TimeSlot } from "./types"
import { fetchJson, chunk, isOsakaBounds } from "./_utils"
import { findStudio1000Venue, isKnownStudio1000Id } from "@/lib/venueMaster"

const BASE_URL = "https://api.m.studio1000.jp/api"
const CHUNK_SIZE = 20

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

function isOsaka(room: S1Room): boolean {
  if (room.studio?.address?.includes("大阪")) return true
  const coords = room.studio?.location?.coordinates
  if (coords) {
    const fixed = fixCoords(coords)
    if (fixed) return isOsakaBounds(fixed[0], fixed[1])
  }
  // 住所・座標で判定できない場合はstudioIdで照合（studioId指定済みのマスターのみマッチ）
  return isKnownStudio1000Id(room.studio?.id ?? -1)
}

function toHHMM(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`
}

export class Studio1000Provider implements AvailabilityProvider {
  readonly providerId = "studio1000"

  async fetchAvailability(date: string): Promise<ProviderVenue[]> {
    const allRooms: S1Room[] = await fetchJson(`${BASE_URL}/room`, {
      next: { revalidate: 60 },
    })
    console.info(`[studio1000] allRooms.length=${allRooms.length}`)

    const osakaRooms = allRooms.filter(isOsaka)
    console.info(`[studio1000] osakaRooms.length=${osakaRooms.length}`)
    if (osakaRooms.length === 0) return []

    const timeStart = `${date}T06:00:00.000+09:00`
    const timeEnd = `${date}T23:59:59.000+09:00`

    const chunks = chunk(osakaRooms, CHUNK_SIZE)
    const chunkResults = await Promise.allSettled(
      chunks.map(async (rooms) => {
        const params = new URLSearchParams({ timeStart, timeEnd })
        rooms.forEach((r) => params.append("roomIds", String(r.id)))
        return fetchJson<S1Slot[]>(`${BASE_URL}/room/history?${params}`, { cache: "no-store" })
      })
    )
    const rejectedChunks = chunkResults.filter((r) => r.status === "rejected")
    if (rejectedChunks.length > 0) {
      console.info(`[studio1000] chunk failures: ${rejectedChunks.length}/${chunkResults.length}`, rejectedChunks.map((r) => (r as PromiseRejectedResult).reason))
    }
    const allSlots: S1Slot[] = chunkResults
      .filter((r): r is PromiseFulfilledResult<S1Slot[]> => r.status === "fulfilled")
      .flatMap((r) => r.value)
    const availableSlotCount = allSlots.filter((s) => s.available === true || s.available === "true").length
    console.info(`[studio1000] allSlots.length=${allSlots.length} availableSlotCount=${availableSlotCount}`)

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
          fixedApiCoords && isOsakaBounds(fixedApiCoords[0], fixedApiCoords[1])
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

    console.info(`[studio1000] studioMap.size=${studioMap.size}`)
    return Array.from(studioMap.values())
  }
}
