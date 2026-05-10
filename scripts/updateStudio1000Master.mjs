const BASE_URL = "https://api.m.studio1000.jp/api"
const OSAKA_BOUNDS = { latMin: 34.0, latMax: 35.1, lngMin: 135.0, lngMax: 136.0 }

function fixCoords(coords) {
  const [a, b] = coords
  if (a >= 20 && a <= 46 && b >= 122 && b <= 154) return [a, b]
  if (b >= 20 && b <= 46 && a >= 122 && a <= 154) return [b, a]
  return null
}

function isValidOsaka(lat, lng) {
  return lat >= OSAKA_BOUNDS.latMin && lat <= OSAKA_BOUNDS.latMax &&
    lng >= OSAKA_BOUNDS.lngMin && lng <= OSAKA_BOUNDS.lngMax
}

function isOsakaRoom(room) {
  if (room.studio?.address?.includes("大阪")) return true
  const coords = room.studio?.location?.coordinates
  if (coords) {
    const fixed = fixCoords(coords)
    if (fixed) return isValidOsaka(fixed[0], fixed[1])
  }
  return false
}

async function main() {
  console.log("Studio1000 API から大阪スタジオ一覧を取得中...\n")
  const res = await fetch(`${BASE_URL}/room`, { headers: { "User-Agent": "Mozilla/5.0" } })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  const allRooms = await res.json()
  const osakaRooms = allRooms.filter(isOsakaRoom)
  const studios = new Map()
  for (const room of osakaRooms) {
    const s = room.studio
    if (!studios.has(s.id)) {
      const coords = s.location?.coordinates
      const fixed = coords ? fixCoords(coords) : null
      const validCoords = fixed && isValidOsaka(fixed[0], fixed[1]) ? fixed : null
      studios.set(s.id, { studioId: s.id, studioName: s.name, address: s.address ?? "",
        apiLat: validCoords?.[0] ?? null, apiLng: validCoords?.[1] ?? null, rooms: [] })
    }
    studios.get(s.id).rooms.push({ id: room.id, name: room.name, capacity: room.capacity })
  }
  for (const studio of studios.values()) {
    console.log(`studioId: ${studio.studioId}  ${studio.studioName}`)
    console.log(`  住所: ${studio.address}  lat=${studio.apiLat} lng=${studio.apiLng}`)
    console.log(`  部屋: ${studio.rooms.map(r => `${r.id}(${r.name})`).join(", ")}\n`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
