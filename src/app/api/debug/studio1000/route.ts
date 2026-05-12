import { NextRequest, NextResponse } from "next/server"

const BASE_URL = "https://api.m.studio1000.jp/api"
const CHUNK_SIZE = 20

const OSAKA_BOUNDS = { latMin: 34.0, latMax: 35.1, lngMin: 135.0, lngMax: 136.0 }

function fixCoords(coords: [number, number]): [number, number] | null {
  const [a, b] = coords
  if (a >= 20 && a <= 46 && b >= 122 && b <= 154) return [a, b]
  if (b >= 20 && b <= 46 && a >= 122 && a <= 154) return [b, a]
  return null
}

function isValidOsaka(lat: number, lng: number) {
  return lat >= OSAKA_BOUNDS.latMin && lat <= OSAKA_BOUNDS.latMax &&
    lng >= OSAKA_BOUNDS.lngMin && lng <= OSAKA_BOUNDS.lngMax
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0]
  const date = searchParams.get("date") ?? today

  try {
    // --- rooms ---
    const roomsRes = await fetch(`${BASE_URL}/room`, { cache: "no-store" })
    if (!roomsRes.ok) {
      const body = await roomsRes.text().catch(() => "")
      return NextResponse.json({ error: `Studio1000 /room HTTP ${roomsRes.status}`, body }, { status: 502 })
    }

    let rooms: unknown[]
    try {
      rooms = await roomsRes.json()
    } catch {
      return NextResponse.json({ error: "Studio1000 API returned non-JSON" }, { status: 502 })
    }

    if (!Array.isArray(rooms)) {
      return NextResponse.json({ error: "Expected array", got: typeof rooms }, { status: 502 })
    }

    const studios = new Map<number, {
      studioId: number; studioName: string; address: string | null
      rawCoords: [number, number] | null; fixedCoords: [number, number] | null
      validOsaka: boolean; isOsakaByAddress: boolean; included: boolean
      rooms: { id: number; name: string }[]
    }>()

    for (const room of rooms) {
      const s = (room as { studio?: { id?: number; name?: string; address?: string; location?: { coordinates?: [number, number] } } }).studio
      if (!s?.id) continue
      if (!studios.has(s.id)) {
        const rawCoords = s.location?.coordinates ?? null
        const fixedCoords = rawCoords ? fixCoords(rawCoords) : null
        const isOsakaByAddress = (s.address ?? "").includes("大阪")
        const validOsaka = fixedCoords ? isValidOsaka(fixedCoords[0], fixedCoords[1]) : false
        const included = isOsakaByAddress || validOsaka
        studios.set(s.id, {
          studioId: s.id, studioName: s.name ?? "", address: s.address ?? null,
          rawCoords, fixedCoords, validOsaka, isOsakaByAddress, included,
          rooms: [],
        })
      }
      const roomAny = room as { id?: number; name?: string }
      if (roomAny.id) studios.get(s.id)!.rooms.push({ id: roomAny.id, name: roomAny.name ?? "" })
    }

    const studioList = Array.from(studios.values()).sort((a, b) => {
      if (a.included !== b.included) return a.included ? -1 : 1
      return a.studioName.localeCompare(b.studioName)
    })
    const includedRoomIds = studioList
      .filter((s) => s.included)
      .flatMap((s) => s.rooms.map((r) => r.id))
      .slice(0, CHUNK_SIZE)

    // --- history ---
    let historyResult: {
      ok: boolean; status: number | null; attemptedUrl: string
      slotCount: number; availableSlotCount: number
      sampleSlots: unknown[]; error: string | null
    }

    if (includedRoomIds.length === 0) {
      historyResult = {
        ok: false, status: null, attemptedUrl: "",
        slotCount: 0, availableSlotCount: 0, sampleSlots: [],
        error: "No included rooms to query",
      }
    } else {
      const timeStart = `${date}T06:00:00.000+09:00`
      const timeEnd = `${date}T23:59:59.000+09:00`
      const params = new URLSearchParams({ timeStart, timeEnd })
      includedRoomIds.forEach((id) => params.append("roomIds", String(id)))
      const historyUrl = `${BASE_URL}/room/history?${params}`

      try {
        const histRes = await fetch(historyUrl, { cache: "no-store" })
        if (!histRes.ok) {
          historyResult = {
            ok: false, status: histRes.status, attemptedUrl: historyUrl,
            slotCount: 0, availableSlotCount: 0, sampleSlots: [],
            error: `HTTP ${histRes.status}`,
          }
        } else {
          const slots = await histRes.json() as unknown[]
          const availableSlots = (slots as { available?: boolean | string }[]).filter(
            (s) => s.available === true || s.available === "true"
          )
          historyResult = {
            ok: true, status: histRes.status, attemptedUrl: historyUrl,
            slotCount: slots.length,
            availableSlotCount: availableSlots.length,
            sampleSlots: availableSlots.slice(0, 5),
            error: null,
          }
        }
      } catch (e) {
        historyResult = {
          ok: false, status: null, attemptedUrl: historyUrl,
          slotCount: 0, availableSlotCount: 0, sampleSlots: [],
          error: String(e),
        }
      }
    }

    return NextResponse.json({
      date,
      rooms: {
        ok: true,
        status: roomsRes.status,
        total: studioList.length,
        includedCount: studioList.filter((s) => s.included).length,
        studios: studioList,
      },
      history: historyResult,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
