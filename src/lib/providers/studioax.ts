import { AvailabilityProvider, ProviderVenue, TimeSlot } from "./types"
import { fetchJson as httpGet } from "./_utils"
import { getProviderVenues } from "@/lib/venueMaster"

const BASE_URL = "https://yoyaku.rental-ax.com/wp-admin/admin-ajax.php"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const VENUE = getProviderVenues("studioax")[0]

async function fetchJson<T>(action: string, roomId: number, date: string): Promise<T> {
  const url = `${BASE_URL}?action=${action}&studio_id=${roomId}&date=${date}`
  const json = await httpGet<{ data: T }>(url, { cache: "no-store", headers: { "User-Agent": USER_AGENT } })
  return json.data
}

function parseSlot(timeStr: string): TimeSlot | null {
  const match = timeStr.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/)
  if (!match) return null
  return { start: match[1], end: match[2], price: null }
}

async function fetchRoomAvailability(roomId: number, date: string): Promise<TimeSlot[]> {
  const [reserved, available, repeater] = await Promise.all([
    fetchJson<{ booked_times?: string[] }>("get_reserved_times", roomId, date),
    fetchJson<{ available_times?: string[]; unavailable_times?: string[] }>("get_available_times", roomId, date),
    fetchJson<{ times?: string[] }>("get_repeater_unavailable_times_json", roomId, date),
  ])

  const unavailable = new Set([
    ...(reserved.booked_times ?? []),
    ...(available.unavailable_times ?? []),
    ...(repeater.times ?? []),
  ])

  return (available.available_times ?? [])
    .filter((t) => !unavailable.has(t))
    .map(parseSlot)
    .filter((s): s is TimeSlot => s !== null)
}

export class StudioAxProvider implements AvailabilityProvider {
  readonly providerId = "studioax"

  async fetchAvailability(date: string): Promise<ProviderVenue[]> {
    if (!VENUE?.rooms) return []

    const roomResults = await Promise.allSettled(
      VENUE.rooms.map(async (room) => ({
        room,
        slots: await fetchRoomAvailability(room.apiId!, date),
      }))
    )

    const rooms = roomResults
      .filter(
        (r): r is PromiseFulfilledResult<{ room: NonNullable<typeof VENUE.rooms>[0]; slots: TimeSlot[] }> =>
          r.status === "fulfilled"
      )
      .map(({ value }) => ({
        roomId: String(value.room.apiId),
        roomName: value.room.name,
        capacity: value.room.capacity,
        slots: value.slots,
      }))
      .filter((r) => r.slots.length > 0)

    if (rooms.length === 0) return []

    return [
      {
        venueId: VENUE.venueId,
        venueName: VENUE.venueName,
        providerId: this.providerId,
        address: VENUE.address,
        lat: VENUE.lat,
        lng: VENUE.lng,
        sourceUrl: VENUE.sourceUrl,
        rooms,
      },
    ]
  }
}
