"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { SearchFilters, VenueSearchResult } from "@/lib/types"
import SearchFiltersComponent from "@/components/SearchFilters"
import StudioList from "@/components/StudioList"

const StudioMap = dynamic(() => import("@/components/StudioMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-100 animate-pulse" />,
})

const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  maxPrice: null,
  minCapacity: null,
  openHour: null,
  closeHour: null,
}

export default function HomePage() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [venues, setVenues] = useState<VenueSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"list" | "map">("list")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchVenues = useCallback(async (f: SearchFilters) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (f.query) params.set("query", f.query)
    if (f.maxPrice !== null) params.set("maxPrice", String(f.maxPrice))
    if (f.minCapacity !== null) params.set("minCapacity", String(f.minCapacity))
    if (f.openHour !== null) params.set("openHour", String(f.openHour))
    if (f.closeHour !== null) params.set("closeHour", String(f.closeHour))
    const res = await fetch(`/api/venues?${params}`)
    const data = await res.json()
    setVenues(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchVenues(filters), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters, fetchVenues])

  const handleSelectVenue = useCallback((venue: VenueSearchResult) => {
    setSelectedId((prev) => (prev === venue.id ? null : venue.id))
    setTimeout(() => {
      const el = document.getElementById(`venue-card-${venue.id}`)
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }, 50)
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className="font-bold text-gray-900">スタジオファインダー</span>
        </div>
        <span className="text-sm text-gray-400 border border-gray-200 rounded-full px-3 py-0.5">大阪市</span>
      </header>
      <div className="shrink-0">
        <SearchFiltersComponent filters={filters} onChange={setFilters} resultCount={venues.length} />
      </div>
      <div className="md:hidden shrink-0 flex border-b border-gray-200 bg-white">
        <button onClick={() => setActiveTab("list")} className={`flex-1 py-2 text-sm font-medium ${activeTab === "list" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500"}`}>一覧</button>
        <button onClick={() => setActiveTab("map")} className={`flex-1 py-2 text-sm font-medium ${activeTab === "map" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-gray-500"}`}>地図</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className={`w-full md:w-80 lg:w-96 shrink-0 overflow-y-auto bg-gray-50 ${activeTab === "map" ? "hidden md:block" : ""}`}>
          <StudioList venues={venues} selectedId={selectedId} onSelect={handleSelectVenue} loading={loading} />
        </div>
        <div className={`flex-1 ${activeTab === "list" ? "hidden md:block" : ""}`}>
          <StudioMap venues={venues} selectedId={selectedId} onSelectVenue={handleSelectVenue} />
        </div>
      </div>
    </div>
  )
}
