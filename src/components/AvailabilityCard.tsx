"use client"

import { ProviderVenue, ProviderRoom } from "@/lib/providers/types"
import { formatPrice, cn } from "@/lib/utils"

interface Props {
  venue: ProviderVenue
  room: ProviderRoom
  isSelected: boolean
  onSelect: () => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

const PROVIDER_LABELS: Record<string, string> = {
  studioax: "Studio AX",
  alleyoop: "Alleyoop",
  studio1000: "Studio1000",
}

export default function AvailabilityCard({ venue, room, isSelected, onSelect, isFavorite, onToggleFavorite }: Props) {
  const prices = room.slots.map((s) => s.price).filter((p): p is number => p !== null)
  const minPrice = prices.length > 0 ? Math.min(...prices) : null
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null

  return (
    <div
      id={`venue-card-${venue.venueId}-${room.roomId}`}
      onClick={onSelect}
      className={cn(
        "group bg-white rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden",
        isSelected
          ? "border-indigo-500 shadow-lg shadow-indigo-100 ring-2 ring-indigo-500"
          : "border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-50"
      )}
    >
      <div className="p-4">
        {/* Header: provider badge + venue name + favorite */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className="inline-block text-[11px] bg-indigo-600 text-white rounded-md px-1.5 py-0.5 font-semibold tracking-wide mb-1">
              {PROVIDER_LABELS[venue.providerId] ?? venue.providerId}
            </span>
            <h3 className="font-bold text-gray-900 text-base leading-snug truncate">
              {room.roomName}
            </h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">{venue.venueName}</p>
          </div>
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
              aria-label={isFavorite ? "お気に入り解除" : "お気に入りに追加"}
              className={cn(
                "shrink-0 mt-0.5 p-1.5 rounded-full transition-colors",
                isFavorite
                  ? "text-yellow-400 bg-yellow-50 hover:bg-yellow-100"
                  : "text-gray-300 hover:text-yellow-400 hover:bg-yellow-50"
              )}
            >
              <svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
        </div>

        {/* Address */}
        {venue.address && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="line-clamp-1">{venue.address}</span>
          </div>
        )}

        {/* Price + capacity */}
        <div className="flex items-end justify-between mb-3">
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
              <span className="text-sm text-gray-400">料金未定</span>
            )}
          </div>
          {room.capacity !== null && (
            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2.5 py-1 font-medium">
              定員 {room.capacity}人
            </span>
          )}
        </div>

        {/* Slot chips */}
        <div className="flex flex-wrap gap-1">
          {room.slots.slice(0, 8).map((slot) => (
            <span
              key={`${slot.start}-${slot.end}`}
              className={cn(
                "text-xs rounded-md px-2 py-0.5 font-medium border",
                slot.isAllnight
                  ? "bg-purple-50 text-purple-600 border-purple-100"
                  : "bg-slate-50 text-slate-600 border-slate-100"
              )}
            >
              {slot.start}〜{slot.end}
              {slot.isAllnight && " 🌙"}
            </span>
          ))}
          {room.slots.length > 8 && (
            <span className="text-xs text-gray-400 self-center">
              +{room.slots.length - 8}件
            </span>
          )}
        </div>
      </div>

      {venue.sourceUrl && (
        <div className="border-t border-gray-50 px-4 py-2.5 flex justify-end">
          <a
            href={venue.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            予約サイトへ
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}
    </div>
  )
}
