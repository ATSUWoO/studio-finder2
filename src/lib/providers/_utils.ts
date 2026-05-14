/** Generic fetch with HTTP error throwing. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

/** Splits an array into chunks of the given size. */
export function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, (i + 1) * size)
  )
}

/** Osaka prefecture bounding box. */
export const OSAKA_BOUNDS = { latMin: 34.0, latMax: 35.1, lngMin: 135.0, lngMax: 136.0 }

/** Returns true if the coordinate is within Osaka prefecture bounds. */
export function isOsakaBounds(lat: number, lng: number): boolean {
  return (
    lat >= OSAKA_BOUNDS.latMin && lat <= OSAKA_BOUNDS.latMax &&
    lng >= OSAKA_BOUNDS.lngMin && lng <= OSAKA_BOUNDS.lngMax
  )
}
