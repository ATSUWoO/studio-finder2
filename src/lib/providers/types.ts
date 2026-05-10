export interface TimeSlot {
  start: string
  end: string
  price: number | null
  isAllnight?: boolean
}

export interface ProviderRoom {
  roomId: string
  roomName: string
  capacity: number | null
  slots: TimeSlot[]
}

export interface ProviderVenue {
  venueId: string
  venueName: string
  providerId: string
  address: string | null
  lat: number | null
  lng: number | null
  sourceUrl: string | null
  rooms: ProviderRoom[]
}

export interface AvailabilityProvider {
  readonly providerId: string
  fetchAvailability(date: string): Promise<ProviderVenue[]>
}
