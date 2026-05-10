import * as cheerio from "cheerio"
import { Element } from "domhandler"
import { getProviderVenues } from "@/lib/venueMaster"
import { AvailabilityProvider, ProviderVenue, TimeSlot } from "./types"

const BASE_URL = "https://st-alleyoop.com/rental/reserve/"
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const VENUE = getProviderVenues("alleyoop")[0]

function getCapacity(roomName: string): number | null {
  return VENUE?.rooms?.find((r) => r.name === roomName)?.capacity ?? null
}

function isAvailableSlot($: cheerio.CheerioAPI, li: Element): boolean {
  const $li = $(li)
  if (!$li.hasClass("empty")) return false
  if ($li.hasClass("disabled") || $li.hasClass("reserved")) return false
  if ($li.find("input[disabled]").length > 0) return false
  return true
}

function isPastTime(startTime: string, date: string): boolean {
  const today = new Date().toISOString().split("T")[0]
  if (date !== today) return false
  const now = new Date()
  const [h, m] = startTime.split(":").map(Number)
  return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())
}

export class AlleyoopProvider implements AvailabilityProvider {
  readonly providerId = "alleyoop"

  async fetchAvailability(date: string): Promise<ProviderVenue[]> {
    const res = await fetch(`${BASE_URL}?sdate=${date}`, {
      cache: "no-store",
      headers: { "User-Agent": USER_AGENT },
    })
    if (!res.ok) throw new Error(`Alleyoop HTTP ${res.status}`)

    const html = await res.text()
    const $ = cheerio.load(html)
    const rooms: ProviderVenue["rooms"] = []

    $("tr.ssm-time-table-row").each((_, row) => {
      const roomName = $(row).find("th.ssm-time-table-head strong.ttl").text().trim()
      if (!roomName) return

      const slots: TimeSlot[] = []

      $(row)
        .find("li")
        .each((_, li) => {
          if (!isAvailableSlot($, li)) return
          const input = $(li).find("input")
          const start = input.attr("data-start-time") ?? ""
          const end = input.attr("data-end-time") ?? ""
          const fee = parseInt(input.attr("data-fee") ?? "0", 10)
          if (!start || !end) return
          if (isPastTime(start, date)) return

          slots.push({
            start,
            end,
            price: fee > 0 ? fee : null,
            isAllnight: $(li).hasClass("allnight"),
          })
        })

      rooms.push({
        roomId: roomName,
        roomName,
        capacity: getCapacity(roomName),
        slots,
      })
    })

    const roomsWithSlots = rooms.filter((r) => r.slots.length > 0)
    if (roomsWithSlots.length === 0 || !VENUE) return []

    return [
      {
        venueId: VENUE.venueId,
        venueName: VENUE.venueName,
        providerId: this.providerId,
        address: VENUE.address,
        lat: VENUE.lat,
        lng: VENUE.lng,
        sourceUrl: VENUE.sourceUrl,
        rooms: roomsWithSlots,
      },
    ]
  }
}
