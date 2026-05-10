export interface Room {
  id: string
  venue_id: string
  name: string
  price_per_hour: number | null
  capacity: number | null
  open_hour: number | null
  close_hour: number | null
  facilities: string[]
  image_url: string | null
  source_url: string | null
}

export interface Venue {
  id: string
  name: string
  area: string
  city: string | null
  nearest_station: string | null
  address: string | null
  lat: number | null
  lng: number | null
  description: string | null
  image_url: string | null
  source_site: string | null
  source_url: string | null
  rooms: Room[]
}

export interface SearchFilters {
  query: string
  maxPrice: number | null
  minCapacity: number | null
  openHour: number | null
  closeHour: number | null
  date: string
}

export interface VenueSearchResult extends Venue {
  matchingRoomCount: number
  minPrice: number | null
  maxPrice: number | null
}
