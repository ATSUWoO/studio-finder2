"use client"

import { ProviderVenue, ProviderRoom } from "@/lib/providers/types"
import { formatPrice, cn } from "@/lib/utils"

interface Props {
  venue: ProviderVenue
  room: ProviderRoom
  isSelected: boolean
  onSelect: () => void
}

const PROVIDER_LABELS: Record<string, string> = {
  studioax: "Studio AX",
  alleyoop: "Alleyoop",
  studio1000: "Studio1000",
}

export default function AvailabilityCard({ venue, room, isSelected, onSelect }: Props) {
  const prices = room.slots.map((s) => s.price).filter((p): p is number => p !== null)
  const minPrice = prices.length > 0 ? Math.min(...prices) : null
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null

  return (
    <div
      id={`venue-card-${venue.venueId}-${room.roomId}`}
      onClick={onSelect}
      className={cn(
        "group bg-white rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden",
        isSelected
          ? "border-indigo-500 shadow-lg ring-2 ring-indigo-200"
          : "border-gray-200 hover:border-indigo-300 hover:shadow-md"
      )}
    >
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs bg-emerald-50 text-emerald-600 rounded px-1.5 py-0.5 font-medium">
            {PROVIDER_LABELS[venue.providerId] ?? venue.providerId}
          </span>
          <span className="text-xs text-gray-400 truncate">{venue.venueName}</span>
        </div>

        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">
          {room.roomName}
        </h3>

        {venue.address && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="line-clamp-1">{venue.address}</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500">
            {minPrice !== null ? (
              <span>
                <span className="text-indigo-600 font-semibold text-sm">{formatPrice(minPrice)}</span>
                {maxPrice !== null && maxPrice !== minPrice && (
                  <span>〜{formatPrice(maxPrice)}</span>
                )}
                <span>/時</span>
              </span>
            ) : (
              <span className="text-gray-400">料金未定</span>
            )}
          </div>
          {room.capacity !== null && (
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
              定員 {room.capacity}人
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {room.slots.slice(0, 8).map((slot) => (
            <span
              key={`${slot.start}-${slot.end}`}
              className={cn(
                "text-xs rounded px-1.5 py-0.5",
                slot.isAllnight
                  ? "bg-purple-50 text-purple-700"
                  : "bg-indigo-50 text-indigo-700"
              )}
            >
              {slot.start}〜{slot.end}
              {slot.isAllnight && " 🌙"}
            </span>
          ))}
          {room.slots.length > 8 && (
            <span className="text-xs text-gray-400 self-center">
              +{room.slots.length - 8}浠
            </span>
          )}
        </div>
      </div>

      {venue.sourceUrl && (
        <div className="border-t border-gray-100 px-3 py-2">
          <a
            href={venue.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            予約サイトへ →
          </a>
        </div>
      )}
    </div>
  )
}
