"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { SearchFilters } from "@/lib/types"
import { ProviderVenue } from "@/lib/providers/types"
import { MapVenuePin } from "@/components/StudioMap"
import SearchFiltersComponent from "@/components/SearchFilters"
import AvailabilityCard from "@/components/AvailabilityCard"
import { formatPrice } from "@/lib/utils"

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

const PROVIDER_LABELS: Record<string, string> = {
  studioax: "Studio AX",
  alleyoop: "Alleyoop",
  studio1000: "Studio1000",
}

function MapBottomSheet({ venue, onClose, onViewInList }: { venue: ProviderVenue; onClose: () => void; onViewInList: () => void }) {
  const prices = venue.rooms.flatMap((r) => r.slots.map((s) => s.price).filter((p): p is number => p !== null))
  const minPrice = prices.length > 0 ? Math.min(...prices) : null
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-2xl shadow-2xl border-t border-gray-100 p-4 pb-safe">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs bg-emerald-50 text-emerald-600 rounded px-1.5 py-0.5 font-medium shrink-0">
              {PROVIDER_LABELS[venue.providerId] ?? venue.providerId}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 text-base leading-snug truncate">{venue.venueName}</h3>
          {venue.address && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{venue.address}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          aria-label="閉じる"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-gray-500">
          {minPrice !== null ? (
            <span>
              <span className="text-indigo-600 font-bold text-lg">{formatPrice(minPrice)}</span>
              {maxPrice !== null && maxPrice !== minPrice && (
                <span className="text-sm">〜{formatPrice(maxPrice)}</span>
              )}
              <span className="text-xs ml-0.5">/時</span>
            </span>
          ) : (
            <span className="text-gray-400 text-sm">料金未定</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewInList}
            className="text-sm text-indigo-600 font-semibold px-3 py-2 rounded-full border border-indigo-200 hover:bg-indigo-50 transition-colors"
          >
            一覧で見る
          </button>
          {venue.sourceUrl && (
            <a
              href={venue.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-indigo-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors"
            >
              予約サイトへ →
            </a>
          )}
        </div>
      </div>
    </div>
  )
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedVenueId(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

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

  const selectedVenue = useMemo(
    () => venues.find((v) => v.venueId === selectedVenueId) ?? null,
    [venues, selectedVenueId]
  )

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

      <div className="md:hidden shrink-0 px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-full transition-all ${
              activeTab === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
            }`}
          >
            一覧
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-full transition-all ${
              activeTab === "map" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
            }`}
          >
            地図
          </button>
        </div>
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

        <div className={`flex-1 relative ${activeTab === "list" ? "hidden md:block" : ""}`}>
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
            onDeselect={() => setSelectedVenueId(null)}
          />
          {selectedVenue && (
            <MapBottomSheet
              venue={selectedVenue}
              onClose={() => setSelectedVenueId(null)}
              onViewInList={() => {
                setActiveTab("list")
                setTimeout(() => {
                  const firstCard = roomCards.find((rc) => rc.venue.venueId === selectedVenue.venueId)
                  if (firstCard) {
                    const room = firstCard.venue.rooms[firstCard.roomIndex]
                    document.getElementById(`venue-card-${firstCard.venue.venueId}-${room.roomId}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
                  }
                }, 50)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
