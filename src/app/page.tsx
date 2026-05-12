"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { SearchFilters } from "@/lib/types"
import { ProviderVenue } from "@/lib/providers/types"
import { MapVenuePin } from "@/components/StudioMap"
import SearchFiltersComponent from "@/components/SearchFilters"
import AvailabilityCard from "@/components/AvailabilityCard"

const StudioMap = dynamic(() => import("@/components/StudioMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
})

const TODAY = new Date().toISOString().split("T")[0]

const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  maxPrice: null,
  minCapacity: null,
  openHour: null,
  closeHour: null,
  date: TODAY,
}

interface RoomCard {
  venue: ProviderVenue
  roomIndex: number
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex gap-1 mt-2">
          <div className="h-5 bg-gray-200 rounded w-16" />
          <div className="h-5 bg-gray-200 rounded w-16" />
          <div className="h-5 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [venues, setVenues] = useState<ProviderVenue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"list" | "map">("list")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchVenues = useCallback(async (f: SearchFilters) => {
    setLoading(true)
    const params = new URLSearchParams({ date: f.date })
    if (f.query) params.set("query", f.query)
    if (f.maxPrice !== null) params.set("maxPrice", String(f.maxPrice))
    if (f.minCapacity !== null) params.set("minCapacity", String(f.minCapacity))
    if (f.openHour !== null) params.set("openHour", String(f.openHour))
    if (f.closeHour !== null) params.set("closeHour", String(f.closeHour))

    try {
      const res = await fetch(`/api/availability?${params}`)
      const data: { venues: ProviderVenue[]; errors: { providerId: string; message: string }[] } = await res.json()
      setVenues(data.venues)
    } catch {
      setVenues([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchVenues(filters), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters, fetchVenues])

  const roomCards: RoomCard[] = venues.flatMap((venue) =>
    venue.rooms.map((_, roomIndex) => ({ venue, roomIndex }))
  )

  const totalRoomCount = roomCards.length

  const handleSelectVenue = useCallback((venueId: string, roomCardId: string) => {
    setSelectedVenueId((prev) => (prev === venueId ? null : venueId))
    setTimeout(() => {
      const el = document.getElementById(roomCardId)
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 50)
  }, [])

  const mapVenues: MapVenuePin[] = venues
    .filter((v) => v.lat !== null && v.lng !== null)
    .map((v) => ({ id: v.venueId, name: v.venueName, lat: v.lat, lng: v.lng }))

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className="font-bold text-gray-900">スタジオファインダー</span>
        </div>
        <span className="text-sm text-gray-400 border border-gray-200 rounded-full px-3 py-0.5">
          大阪市
        </span>
      </header>

      <div className="shrink-0">
        <SearchFiltersComponent
          filters={filters}
          onChange={setFilters}
          resultCount={totalRoomCount}
        />
      </div>

      <div className="md:hidden shrink-0 flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab("list")}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === "list" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500"}`}
        >
          一覧
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === "map" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500"}`}
        >
          地図
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 overflow-y-auto bg-gray-50 ${activeTab === "map" ? "hidden md:block" : ""}`}
        >
          <div className="p-3 space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            ) : roomCards.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">空き枠が見つかりませんでした</p>
              </div>
            ) : (
              roomCards.map(({ venue, roomIndex }) => {
                const room = venue.rooms[roomIndex]
                const cardId = `venue-card-${venue.venueId}-${room.roomId}`
                return (
                  <AvailabilityCard
                    key={`${venue.providerId}-${venue.venueId}-${room.roomId}`}
                    venue={venue}
                    room={room}
                    isSelected={selectedVenueId === venue.venueId}
                    onSelect={() => handleSelectVenue(venue.venueId, cardId)}
                  />
                )
              })
            )}
          </div>
        </div>

        <div className={`flex-1 ${activeTab === "list" ? "hidden md:block" : ""}`}>
          <StudioMap
            venues={mapVenues}
            selectedId={selectedVenueId}
            onSelectVenue={(v) => {
              const firstCard = roomCards.find((rc) => rc.venue.venueId === v.id)
              if (firstCard) {
                const room = firstCard.venue.rooms[firstCard.roomIndex]
                handleSelectVenue(v.id, `venue-card-${v.id}-${room.roomId}`)
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
