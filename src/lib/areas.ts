export interface AreaDef {
  id: string
  label: string
  lat: number
  lng: number
  radiusKm: number
  addressKeywords: string[]
}

export const AREAS: AreaDef[] = [
  { id: "umeda", label: "梅田", lat: 34.7024, lng: 135.4959, radiusKm: 1.5, addressKeywords: ["梅田", "大阪駅", "兎我野", "曽根崎"] },
  { id: "namba", label: "難波", lat: 34.6663, lng: 135.5005, radiusKm: 1.5, addressKeywords: ["難波", "なんば", "ナンバ"] },
  { id: "shinsaibashi", label: "心斎橋", lat: 34.6738, lng: 135.5018, radiusKm: 1.2, addressKeywords: ["心斎橋", "南船場"] },
  { id: "honmachi", label: "本町", lat: 34.6831, lng: 135.4983, radiusKm: 1.2, addressKeywords: ["本町"] },
  { id: "tennoji", label: "天王寺", lat: 34.6457, lng: 135.5145, radiusKm: 1.5, addressKeywords: ["天王寺", "阿倍野"] },
  { id: "kyobashi", label: "京橋", lat: 34.6968, lng: 135.5331, radiusKm: 1.5, addressKeywords: ["京橋", "都島"] },
  { id: "fukushima", label: "福島", lat: 34.6974, lng: 135.4860, radiusKm: 1.2, addressKeywords: ["福島"] },
  { id: "tenma", label: "天満", lat: 34.7027, lng: 135.5102, radiusKm: 1.2, addressKeywords: ["天満", "扇町"] },
]

export function findArea(id: string | null): AreaDef | null {
  if (!id) return null
  return AREAS.find((a) => a.id === id) ?? null
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function venueMatchesArea(
  area: AreaDef,
  lat: number | null,
  lng: number | null,
  address: string | null
): boolean {
  if (lat !== null && lng !== null) {
    return haversineKm(area.lat, area.lng, lat, lng) <= area.radiusKm
  }
  if (address) {
    return area.addressKeywords.some((kw) => address.includes(kw))
  }
  return false
}
