import { DurationFilter, SearchFilters, SortBy } from "@/lib/types"

const TODAY = () => new Date().toISOString().split("T")[0]

export function defaultFilters(): SearchFilters {
  return {
    query: "",
    maxPrice: null,
    minCapacity: null,
    openHour: null,
    closeHour: null,
    date: TODAY(),
    durationFilter: null,
    areaId: null,
    sortBy: "default",
    favoritesOnly: false,
  }
}

function parseDuration(v: string | null): DurationFilter {
  return v === "2h" || v === "3h" || v === "allnight" ? v : null
}

function parseSort(v: string | null): SortBy {
  return v === "priceAsc" || v === "slotsDesc" || v === "nameAsc" ? v : "default"
}

function parseIntOrNull(v: string | null): number | null {
  if (v === null || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function filtersFromParams(params: URLSearchParams): SearchFilters {
  return {
    query: params.get("query") ?? "",
    maxPrice: parseIntOrNull(params.get("maxPrice")),
    minCapacity: parseIntOrNull(params.get("minCapacity")),
    openHour: parseIntOrNull(params.get("openHour")),
    closeHour: parseIntOrNull(params.get("closeHour")),
    date: params.get("date") ?? TODAY(),
    durationFilter: parseDuration(params.get("durationFilter")),
    areaId: params.get("areaId"),
    sortBy: parseSort(params.get("sortBy")),
    favoritesOnly: params.get("fav") === "1",
  }
}

export function filtersToParams(f: SearchFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (f.query) params.set("query", f.query)
  if (f.maxPrice !== null) params.set("maxPrice", String(f.maxPrice))
  if (f.minCapacity !== null) params.set("minCapacity", String(f.minCapacity))
  if (f.openHour !== null) params.set("openHour", String(f.openHour))
  if (f.closeHour !== null) params.set("closeHour", String(f.closeHour))
  if (f.date && f.date !== TODAY()) params.set("date", f.date)
  if (f.durationFilter) params.set("durationFilter", f.durationFilter)
  if (f.areaId) params.set("areaId", f.areaId)
  if (f.sortBy !== "default") params.set("sortBy", f.sortBy)
  if (f.favoritesOnly) params.set("fav", "1")
  return params
}
