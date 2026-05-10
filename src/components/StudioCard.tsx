"use client"

import Link from "next/link"
import { VenueSearchResult } from "@/lib/types"
import { formatPrice, cn } from "@/lib/utils"

interface Props {
  venue: VenueSearchResult
  isSelected: boolean
  onSelect: (venue: VenueSearchResult) => void
}

export default function StudioCard({ venue, isSelected, onSelect }: Props) {
  return (
    <div
      id={`venue-card-${venue.id}`}
      onClick={() => onSelect(venue)}
      className={cn(
        "group bg-white rounded-xl border cursor-pointer transition-all duration-200 overflow-hidden",
        isSelected
          ? "border-indigo-500 shadow-lg ring-2 ring-indigo-200"
          : "border-gray-200 hover:border-indigo-300 hover:shadow-md"
      )}
    >
      {/* 画像プレースホルダー */}
      <div className="h-32 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
        <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>

      <div className="p-3">
        {/* ソースバッジ */}
        <span className="inline-block text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 mb-1">
          {venue.source_site}
        </span>

        {/* 店舗名 */}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">
          {venue.name}
        </h3>

        {/* 最寄り駅 */}
        {venue.nearest_station && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {venue.nearest_station}
          </div>
        )}

        {/* 料金・部屋数 */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {venue.minPrice !== null && (
              <span>
                <span className="text-indigo-600 font-semibold text-sm">{formatPrice(venue.minPrice)}</span>
                {venue.maxPrice !== null && venue.maxPrice !== venue.minPrice && (
                  <span>〜{formatPrice(venue.maxPrice)}</span>
                )}
                <span>/時</span>
              </span>
            )}
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5 font-medium">
            {venue.matchingRoomCount}部屋
          </span>
        </div>
      </div>

      {/* 詳細リンク */}
      <div className="border-t border-gray-100 px-3 py-2">
        <Link
          href={`/venues/${venue.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          詳細を見る →
        </Link>
      </div>
    </div>
  )
}
