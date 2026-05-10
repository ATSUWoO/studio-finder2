export interface RawRoom {
  name: string
  priceRaw?: string
  capacityRaw?: string
  openHourRaw?: string
  closeHourRaw?: string
  facilities?: string[]
  imageUrl?: string
  sourceUrl?: string
}

export interface RawVenue {
  name: string
  addressRaw?: string
  nearestStation?: string
  city?: string
  description?: string
  imageUrl?: string
  sourceUrl?: string
  rooms: RawRoom[]
}

export interface NormalizedVenue {
  name: string
  area: string
  city: string | null
  nearest_station: string | null
  address: string | null
  lat: number | null
  lng: number | null
  description: string | null
  image_url: string | null
  source_site: string
  source_url: string | null
  rooms: {
    name: string
    price_per_hour: number | null
    capacity: number | null
    open_hour: number | null
    close_hour: number | null
    facilities: string[]
    image_url: string | null
    source_url: string | null
  }[]
}

export abstract class BaseScraper {
  abstract readonly siteName: string
  abstract readonly siteUrl: string

  abstract fetchVenues(): Promise<RawVenue[]>

  normalize(rawVenues: RawVenue[]): NormalizedVenue[] {
    return rawVenues.map((v) => ({
      name: v.name,
      area: "大阪市",
      city: v.city ?? null,
      nearest_station: v.nearestStation ?? null,
      address: v.addressRaw ?? null,
      lat: null,
      lng: null,
      description: v.description ?? null,
      image_url: v.imageUrl ?? null,
      source_site: this.siteName,
      source_url: v.sourceUrl ?? null,
      rooms: v.rooms.map((r) => ({
        name: r.name,
        price_per_hour: parsePrice(r.priceRaw),
        capacity: parseCapacity(r.capacityRaw),
        open_hour: parseOpenHour(r.openHourRaw),
        close_hour: parseCloseHour(r.closeHourRaw),
        facilities: r.facilities ?? [],
        image_url: r.imageUrl ?? null,
        source_url: r.sourceUrl ?? null,
      })),
    }))
  }

  async run(): Promise<NormalizedVenue[]> {
    console.log(`[${this.siteName}] スクレイピング開始`)
    try {
      const raw = await this.fetchVenues()
      const normalized = this.normalize(raw)
      console.log(`[${this.siteName}] 完了: ${normalized.length}件の店舗`)
      return normalized
    } catch (err) {
      console.error(`[${this.siteName}] エラー:`, err)
      return []
    }
  }
}

export function parsePrice(raw?: string): number | null {
  if (!raw) return null
  const n = raw.replace(/[^\d]/g, "")
  const price = parseInt(n, 10)
  return isNaN(price) ? null : price
}

export function parseCapacity(raw?: string): number | null {
  if (!raw) return null
  const match = raw.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

export function parseOpenHour(raw?: string): number | null {
  if (!raw) return null
  const match = raw.match(/(\d{1,2})[:時]/)
  return match ? parseInt(match[1], 10) : null
}

export function parseCloseHour(raw?: string): number | null {
  if (!raw) return null
  // 「〜22:00」「-22時」などから終了時刻を抽出
  const match = raw.match(/[〜~\-–]\s*(\d{1,2})[:時]/)
  if (match) return parseInt(match[1], 10)
  // 単独の「22:00」形式（2つ目の時刻）
  const allMatches = [...raw.matchAll(/(\d{1,2})[:時]/g)]
  return allMatches.length >= 2 ? parseInt(allMatches[allMatches.length - 1][1], 10) : null
}
