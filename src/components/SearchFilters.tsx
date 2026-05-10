"use client"

import { SearchFilters } from "@/lib/types"
import { formatHour, formatPrice } from "@/lib/utils"

interface Props {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  resultCount: number
}

const PRICE_OPTIONS = [
  { label: "指定なし", value: null },
  { label: `〜${formatPrice(1000)}`, value: 1000 },
  { label: `〜${formatPrice(2000)}`, value: 2000 },
  { label: `〜${formatPrice(3000)}`, value: 3000 },
]

const CAPACITY_OPTIONS = [
  { label: "5人以上", value: 5 },
  { label: "10人以上", value: 10 },
  { label: "20人以上", value: 20 },
]

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 7)

const DEFAULT_DATE = new Date().toISOString().split("T")[0]

export default function SearchFiltersComponent({ filters, onChange, resultCount }: Props) {
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch })

  const hasActiveFilters =
    filters.query || filters.maxPrice !== null || filters.minCapacity !== null ||
    filters.openHour !== null || filters.closeHour !== null

  const clearFilters = () =>
    onChange({ query: "", maxPrice: null, minCapacity: null, openHour: null, closeHour: null, date: filters.date })

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
      <div className="flex gap-2">
        <input
          type="date"
          value={filters.date}
          min={DEFAULT_DATE}
          onChange={(e) => set({ date: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shrink-0"
        />
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="スタジオ名で検索"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filters.maxPrice ?? ""}
          onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : null })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">料金 ▼</option>
          {PRICE_OPTIONS.filter((o) => o.value !== null).map((opt) => (
            <option key={opt.value} value={opt.value!}>{opt.label}</option>
          ))}
        </select>

        <select
          value={filters.minCapacity ?? ""}
          onChange={(e) => set({ minCapacity: e.target.value ? Number(e.target.value) : null })}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">定員 ▼</option>
          {CAPACITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 text-sm">
          <select
            value={filters.openHour ?? ""}
            onChange={(e) => set({ openHour: e.target.value ? Number(e.target.value) : null })}
            className="border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">開始 ▼</option>
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>{formatHour(h)}</option>
            ))}
          </select>
          <span className="text-gray-400">〜</span>
          <select
            value={filters.closeHour ?? ""}
            onChange={(e) => set({ closeHour: e.target.value ? Number(e.target.value) : null })}
            className="border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">終了 ▼</option>
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>{formatHour(h)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          <span className="font-semibold text-indigo-600">{resultCount}</span> スタジオが空いています
        </span>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-gray-400 hover:text-gray-600 underline text-xs"
          >
            クリア
          </button>
        )}
      </div>
    </div>
  )
}
