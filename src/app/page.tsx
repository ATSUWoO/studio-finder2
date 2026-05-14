"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { SearchFilters } from "@/lib/types"
import { ProviderVenue } from "@/lib/providers/types"
import { MapVenuePin } from "@/components/StudioMap"
import SearchFiltersComponent from "@/components/SearchFilters"
import AvailabilityCard from "@/components/AvailabilityCard"
import { formatPrice } from "@/lib/utils"
import { useFavorites } from "@/hooks/useFavorites"
import { filtersFromParams, filtersToParams } from "@/lib/filterUrl"
import { PROVIDER_LABELS } from "@/lib/providers/registry"

const StudioMap = dynamic(() => import("@/components/StudioMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
})

interface RoomCard {
  venue: ProviderVenue
  roomIndex: number
}

function minVenuePrice(v: ProviderVenue): number | null {
  const prices = v.rooms.flatMap((r) => r.slots.map((s) => s.price).filter((p): p is number => p !== null))
  return prices.length > 0 ? Math.min(...prices) : null
}
function totalSlots(v: ProviderVenue): number {
  return v.rooms.reduce((sum, r) => sum + r.slots.length, 0)
}

function MapBottomSheet({ venue, onClose, onViewInList }: { venue: ProviderVenue; onClose: () => void; onViewInList: () => void }) {
  const prices = venue.rooms.flatMap((r) => r.slots.map((s) => s.price).filter((p): p is number => p !== null))
  const minPrice = prices.length > 0 ? Math.min(...prices) : null
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl shadow-2xl shadow-slate-900/20 border-t border-gray-100 pt-3 px-4 pb-6">
      {/* Drag handle */}
      <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3" />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="inline-block text-[11px] bg-indigo-600 text-white rounded-md px-1.5 py-0.5 font-semibold tracking-wide mb-1">
            {PROVIDER_LABELS[venue.providerId] ?? venue.providerId}
          </span>
          <h3 className="font-bold text-gray-900 text-base leading-snug truncate">{venue.venueName}</h3>
          {venue.address && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{venue.address}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors"
          aria-label="閉じる"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div>
          {minPrice !== null ? (
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-bold text-indigo-600 leading-none">{formatPrice(minPrice)}</span>
              {maxPrice !== null && maxPrice !== minPrice && (
                <span className="text-sm text-gray-400">〜{formatPrice(maxPrice)}</span>
              )}
              <span className="text-xs text-gray-400 ml-0.5">/時</span>
            </div>
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 rounded-md w-1/4" />
        <div className="h-5 bg-gray-100 rounded-md w-3/4" />
        <div className="h-3 bg-gray-100 rounded-md w-1/2" />
        <div className="h-8 bg-gray-100 rounded-md w-1/3" />
        <div className="flex gap-1.5 mt-1">
          <div className="h-5 bg-gray-100 rounded-md w-20" />
          <div className="h-5 bg-gray-100 rounded-md w-20" />
          <div className="h-5 bg-gray-100 rounded-md w-20" />
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-gray-50" />}>
      <HomePageInner />
    </Suspense>
  )
}

function HomePageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { has: isFavorite, toggle: toggleFavorite, loaded: favoritesLoaded } = useFavorites()

  const [filters, setFilters] = useState<SearchFilters>(() => filtersFromParams(searchParams))
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

  useEffect(() => {
    const qs = filtersToParams(filters).toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [filters, pathname, router])

  const fetchVenues = useCallback(async (f: SearchFilters) => {
    setLoading(true)
    const params = new URLSearchParams({ date: f.date })
    if (f.query) params.set("query", f.query)
    if (f.maxPrice !== null) params.set("maxPrice", String(f.maxPrice))
    if (f.minCapacity !== null) params.set("minCapacity", String(f.minCapacity))
    if (f.openHour !== null) params.set("openHour", String(f.openHour))
    if (f.closeHour !== null) params.set("closeHour", String(f.closeHour))
    if (f.durationFilter) params.set("durationFilter", f.durationFilter)
    if (f.areaId) params.set("areaId", f.areaId)

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

  const visibleVenues = useMemo(() => {
    const filtered = filters.favoritesOnly ? venues.filter((v) => isFavorite(v.venueId)) : venues
    const sorted = [...filtered]
    if (filters.sortBy === "priceAsc") {
      sorted.sort((a, b) => (minVenuePrice(a) ?? Infinity) - (minVenuePrice(b) ?? Infinity))
    } else if (filters.sortBy === "slotsDesc") {
      sorted.sort((a, b) => totalSlots(b) - totalSlots(a))
    } else if (filters.sortBy === "nameAsc") {
      sorted.sort((a, b) => a.venueName.localeCompare(b.venueName, "ja"))
    }
    return sorted
  }, [venues, filters.favoritesOnly, filters.sortBy, isFavorite])

  const roomCards: RoomCard[] = visibleVenues.flatMap((venue) =>
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
    () => visibleVenues.find((v) => v.venueId === selectedVenueId) ?? null,
    [visibleVenues, selectedVenueId]
  )

  const mapVenues: MapVenuePin[] = visibleVenues
    .filter((v) => v.lat !== null && v.lng !== null)
    .map((v) => ({ id: v.venueId, name: v.venueName, lat: v.lat, lng: v.lng }))

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-slate-900 px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-900/40">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className="font-bold text-white tracking-tight">スタジオファインダー</span>
        </div>
        <span className="text-xs text-white/50 border border-white/20 rounded-full px-2.5 py-0.5">
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
        <div className="flex bg-slate-100 rounded-full p-1">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-1.5 text-sm rounded-full transition-all ${
              activeTab === "list" ? "bg-white text-indigo-700 font-bold shadow-sm" : "text-slate-500 font-medium"
            }`}
          >
            一覧
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className={`flex-1 py-1.5 text-sm rounded-full transition-all ${
              activeTab === "map" ? "bg-white text-indigo-700 font-bold shadow-sm" : "text-slate-500 font-medium"
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
          <div className="p-3 space-y-2.5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            ) : roomCards.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-600">空き枠が見つかりませんでした</p>
                <p className="text-xs text-gray-400 mt-1">日付やエリアを変えてみてください</p>
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
                    isFavorite={favoritesLoaded && isFavorite(venue.venueId)}
                    onToggleFavorite={() => toggleFavorite(venue.venueId)}
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
