"use client"

import { VenueSearchResult } from "@/lib/types"
import StudioCard from "./StudioCard"

interface Props {
  venues: VenueSearchResult[]
  selectedId: string | null
  onSelect: (venue: VenueSearchResult) => void
  loading: boolean
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-32 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex justify-between"><div className="h-4 bg-gray-200 rounded w-1/3" /><div className="h-4 bg-gray-200 rounded w-1/5" /></div>
      </div>
      <div className="border-t border-gray-100 px-3 py-2"><div className="h-3 bg-gray-200 rounded w-1/4" /></div>
    </div>
  )
}

export default function StudioList({ venues, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return <div className="p-3 grid grid-cols-1 gap-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
  }
  if (venues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-sm">条件に合うスタジオが見つかりませんでした</p>
      </div>
    )
  }
  return (
    <div className="p-3 grid grid-cols-1 gap-3">
      {venues.map((venue) => <StudioCard key={venue.id} venue={venue} isSelected={venue.id === selectedId} onSelect={onSelect} />)}
    </div>
  )
}
