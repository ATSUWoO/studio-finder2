import { NextResponse } from "next/server"

const BASE_URL = "https://api.m.studio1000.jp/api"

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

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/room`, { cache: "no-store" })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return NextResponse.json({ error: `Studio1000 API HTTP ${res.status}`, body }, { status: 502 })
    }

    let rooms: unknown[]
    try {
      rooms = await res.json()
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

    const result = Array.from(studios.values()).sort((a, b) => {
      if (a.included !== b.included) return a.included ? -1 : 1
      return a.studioName.localeCompare(b.studioName)
    })

    return NextResponse.json({ total: result.length, studios: result })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
