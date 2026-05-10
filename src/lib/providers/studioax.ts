import { AvailabilityProvider, ProviderVenue, TimeSlot } from "./types"

const BASE_URL = "https://yoyaku.rental-ax.com/wp-admin/admin-ajax.php"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const ROOM_MASTER: { id: number; name: string; capacity: number }[] = [
  { id: 9943, name: "Studio 1",  capacity: 20 },
  { id: 9945, name: "Studio 2",  capacity: 15 },
  { id: 9946, name: "Studio 3",  capacity: 10 },
  { id: 9940, name: "Studio A",  capacity: 25 },
  { id: 9941, name: "Studio B",  capacity: 30 },
  { id: 9942, name: "Studio AB", capacity: 60 },
  { id: 9947, name: "Studio C",  capacity:  5 },
  { id: 9948, name: "Studio X",  capacity:  8 },
]

async function fetchJson<T>(action: string, roomId: number, date: string): Promise<T> {
  const url = `${BASE_URL}?action=${action}&studio_id=${roomId}&date=${date}`
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": USER_AGENT },
  })
  if (!res.ok) throw new Error(`StudioAX ${action} HTTP ${res.status}`)
  const json = await res.json()
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
    const roomResults = await Promise.allSettled(
      ROOM_MASTER.map(async (room) => ({
        room,
        slots: await fetchRoomAvailability(room.id, date),
      }))
    )

    const rooms = roomResults
      .filter((r): r is PromiseFulfilledResult<{ room: typeof ROOM_MASTER[0]; slots: TimeSlot[] }> => r.status === "fulfilled")
      .map(({ value }) => ({
        roomId: String(value.room.id),
        roomName: value.room.name,
        capacity: value.room.capacity,
        slots: value.slots,
      }))
      .filter((r) => r.slots.length > 0)

    if (rooms.length === 0) return []

    return [
      {
        venueId: "studioax",
        venueName: "Studio AX",
        providerId: this.providerId,
        address: "大阪市中央区西心斋橈01-9-16 大京心斋橈02ビル4F",
        lat: 34.6726,
        lng: 135.4982,
        sourceUrl: "https://yoyaku.rental-ax.com/",
        rooms,
      },
    ]
  }
}
