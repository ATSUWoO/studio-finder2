"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "studio-finder.favorites"

// モジュールレベルのキャッシュ: useSyncExternalStore は毎レンダーで readSnapshot を呼ぶため、
// localStorage の文字列が変わっていなければ同じ配列参照を返してレンダーを抑制する。
let cachedSnapshot: readonly string[] = []
let cachedSnapshotRaw: string | null = null
const listeners = new Set<() => void>()

function readSnapshot(): readonly string[] {
  if (typeof window === "undefined") return cachedSnapshot
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === cachedSnapshotRaw) return cachedSnapshot
  cachedSnapshotRaw = raw
  try {
    const parsed = raw ? JSON.parse(raw) : []
    cachedSnapshot = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    cachedSnapshot = []
  }
  return cachedSnapshot
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) cb() }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", onStorage)
  }
}

function notify() {
  for (const l of listeners) l()
}

const emptySnapshot: readonly string[] = []

export function useFavorites() {
  const ids = useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => emptySnapshot,
  )

  const has = useCallback((venueId: string) => ids.includes(venueId), [ids])

  const toggle = useCallback((venueId: string) => {
    const current = readSnapshot()
    const next = current.includes(venueId)
      ? current.filter((id) => id !== venueId)
      : [...current, venueId]
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
    cachedSnapshotRaw = null // force re-parse
    notify()
  }, [])

  return { favorites: ids, toggle, has, loaded: true }
}
