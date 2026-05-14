"use client"

import { useState } from "react"
import { SearchFilters, DurationFilter, SortBy } from "@/lib/types"
import { formatHour, formatPrice } from "@/lib/utils"
import { AREAS } from "@/lib/areas"

interface Props {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  resultCount: number
}

const PRICE_OPTIONS = [
  { label: `〜${formatPrice(1000)}/時`, value: 1000 },
  { label: `〜${formatPrice(2000)}/時`, value: 2000 },
  { label: `〜${formatPrice(3000)}/時`, value: 3000 },
]

const CAPACITY_OPTIONS = [
  { label: "5人以上", value: 5 },
  { label: "10人以上", value: 10 },
  { label: "20人以上", value: 20 },
]

const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 7)

const DEFAULT_DATE = new Date().toISOString().split("T")[0]

function todayString() {
  return new Date().toISOString().split("T")[0]
}
function tomorrowString() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}
function nowOpenHour() {
  return Math.max(7, Math.min(23, new Date().getHours() + 1))
}

type QuickPreset = {
  id: "now" | "tonight" | "tomorrow-morning"
  label: string
  build: () => { date: string; openHour: number; closeHour: number | null }
}

const QUICK_PRESETS: QuickPreset[] = [
  { id: "now", label: "今すぐ", build: () => ({ date: todayString(), openHour: nowOpenHour(), closeHour: null }) },
  { id: "tonight", label: "今夜", build: () => ({ date: todayString(), openHour: 18, closeHour: 23 }) },
  { id: "tomorrow-morning", label: "明日朝", build: () => ({ date: tomorrowString(), openHour: 7, closeHour: 12 }) },
]

function countAdvancedActive(filters: SearchFilters): number {
  return [
    filters.maxPrice !== null,
    filters.durationFilter !== null,
    filters.sortBy !== "default",
    filters.areaId !== null,
  ].filter(Boolean).length
}

export default function SearchFiltersComponent({ filters, onChange, resultCount }: Props) {
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch })

  const advancedActiveCount = countAdvancedActive(filters)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(() => advancedActiveCount > 0)

  const hasActiveFilters =
    filters.query || filters.maxPrice !== null || filters.minCapacity !== null ||
    filters.openHour !== null || filters.closeHour !== null || filters.durationFilter !== null ||
    filters.areaId !== null || filters.sortBy !== "default" || filters.favoritesOnly

  const clearFilters = () => {
    onChange({
      query: "", maxPrice: null, minCapacity: null, openHour: null, closeHour: null,
      date: filters.date, durationFilter: null, areaId: null,
      sortBy: "default", favoritesOnly: false,
    })
    setIsAdvancedOpen(false)
  }

  const activePresetId = ((): QuickPreset["id"] | null => {
    for (const p of QUICK_PRESETS) {
      const v = p.build()
      if (filters.date === v.date && filters.openHour === v.openHour && filters.closeHour === v.closeHour) {
        return p.id
      }
    }
    return null
  })()

  const togglePreset = (preset: QuickPreset) => {
    if (activePresetId === preset.id) {
      set({ date: todayString(), openHour: null, closeHour: null })
    } else {
      const v = preset.build()
      set({ date: v.date, openHour: v.openHour, closeHour: v.closeHour })
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-2 space-y-2.5">
      {/* Row 1: 定員 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">定員</span>
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {CAPACITY_OPTIONS.map((opt) => {
            const active = filters.minCapacity === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => set({ minCapacity: active ? null : opt.value })}
                className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Row 2: 開始〜終了時間 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 shrink-0">時間</span>
        <select
          value={filters.openHour ?? ""}
          onChange={(e) => set({ openHour: e.target.value ? Number(e.target.value) : null })}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">開始 ▼</option>
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>{formatHour(h)}</option>
          ))}
        </select>
        <span className="text-gray-400 text-sm">〜</span>
        <select
          value={filters.closeHour ?? ""}
          onChange={(e) => set({ closeHour: e.target.value ? Number(e.target.value) : null })}
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">終了 ▼</option>
          {HOUR_OPTIONS.map((h) => (
            <option key={h} value={h}>{formatHour(h)}</option>
          ))}
        </select>
      </div>

      {/* Row 3: 日付 + テキスト検索 */}
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

      {/* 詳細フィルタパネル（折りたたみ） */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isAdvancedOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pt-1 pb-0.5 space-y-2.5">
          {/* 料金 / コマ / 並び替え */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.maxPrice ?? ""}
              onChange={(e) => set({ maxPrice: e.target.value ? Number(e.target.value) : null })}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">料金(/時) ▼</option>
              {PRICE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={filters.durationFilter ?? ""}
              onChange={(e) => set({ durationFilter: (e.target.value || null) as DurationFilter })}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">コマ ▼</option>
              <option value="2h">2h連続</option>
              <option value="3h">3h連続</option>
              <option value="allnight">オールナイトのみ</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => set({ sortBy: e.target.value as SortBy })}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="default">並び替え ▼</option>
              <option value="priceAsc">安い順</option>
              <option value="slotsDesc">空きが多い順</option>
              <option value="nameAsc">名前順</option>
            </select>
          </div>

          {/* エリアチップ */}
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5 scrollbar-hide">
            {AREAS.map((a) => {
              const active = filters.areaId === a.id
              return (
                <button
                  key={a.id}
                  onClick={() => set({ areaId: active ? null : a.id })}
                  className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {a.label}
                </button>
              )
            })}
          </div>

          {/* クイックプリセット */}
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5 scrollbar-hide">
            {QUICK_PRESETS.map((p) => {
              const active = activePresetId === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => togglePreset(p)}
                  className={`shrink-0 text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Row 4: 件数 + お気に入り + 詳細トグル + クリア */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          <span className="font-semibold text-indigo-600">{resultCount}</span> 件が空いています
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => set({ favoritesOnly: !filters.favoritesOnly })}
            aria-pressed={filters.favoritesOnly}
            title={filters.favoritesOnly ? "お気に入りのみ表示中" : "お気に入りのみ表示"}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors ${
              filters.favoritesOnly
                ? "bg-yellow-50 border-yellow-300 text-yellow-600"
                : "bg-white border-gray-200 text-gray-400 hover:border-yellow-300 hover:text-yellow-500"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill={filters.favoritesOnly ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>お気に入り</span>
          </button>

          <button
            onClick={() => setIsAdvancedOpen((v) => !v)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition-colors ${
              advancedActiveCount > 0
                ? "bg-indigo-50 border-indigo-300 text-indigo-600"
                : "bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            <span>詳細</span>
            {advancedActiveCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {advancedActiveCount}
              </span>
            )}
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${isAdvancedOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

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
    </div>
  )
}
