"use client"

import { useEffect, useRef } from "react"

export interface MapVenuePin {
  id: string
  name: string
  lat: number | null
  lng: number | null
}

interface Props {
  venues: MapVenuePin[]
  selectedId: string | null
  onSelectVenue: (venue: MapVenuePin) => void
}

const OSAKA_CENTER: [number, number] = [34.6937, 135.5022]
const DEFAULT_ZOOM = 12

export default function StudioMap({ venues, selectedId, onSelectVenue }: Props) {
  const mapRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null)
  const markersRef = useRef<Map<string, ReturnType<typeof import("leaflet")["marker"]>>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!containerRef.current) return
    if (mapRef.current) return

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(containerRef.current!, {
        center: OSAKA_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    import("leaflet").then((L) => {
      const currentIds = new Set(venues.map((v) => v.id))
      const existingIds = new Set(markersRef.current.keys())

      for (const id of existingIds) {
        if (!currentIds.has(id)) {
          markersRef.current.get(id)?.remove()
          markersRef.current.delete(id)
        }
      }

      for (const venue of venues) {
        if (!venue.lat || !venue.lng) continue

        if (!markersRef.current.has(venue.id)) {
          const isSelected = venue.id === selectedId

          const icon = L.divIcon({
            className: "map-pin-wrapper",
            html: `<div class="map-pin ${isSelected ? "map-pin--selected" : ""}">
              <span>${venue.name}</span>
            </div>`,
            iconSize: [1, 1],
            iconAnchor: [0, 1],
          })

          const marker = L.marker([venue.lat, venue.lng], { icon })
            .addTo(map)
            .on("click", () => onSelectVenue(venue))

          markersRef.current.set(venue.id, marker)
        }
      }
    })
  }, [venues, onSelectVenue, selectedId])

  useEffect(() => {
    if (!mapRef.current) return

    import("leaflet").then((L) => {
      for (const [id, marker] of markersRef.current) {
        const venue = venues.find((v) => v.id === id)
        if (!venue) continue

        const isSelected = id === selectedId
        const html = `<div class="map-pin ${isSelected ? "map-pin--selected" : ""}">
          <span>${venue.name}</span>
        </div>`

        marker.setIcon(
          L.divIcon({
            className: "map-pin-wrapper",
            html,
            iconSize: [1, 1],
            iconAnchor: [0, 1],
          })
        )
      }

      if (selectedId) {
        const venue = venues.find((v) => v.id === selectedId)
        if (venue?.lat && venue?.lng) {
          mapRef.current?.panTo([venue.lat, venue.lng], { animate: true })
        }
      }
    })
  }, [selectedId, venues])

  return (
    <>
      <style>{`
        .map-pin {
          background: white;
          border: 2px solid #6366f1;
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          color: #4f46e5;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .map-pin::after {
          content: '';
          position: absolute;
          bottom: -7px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #6366f1;
        }
        .map-pin--selected {
          background: #6366f1;
          color: white;
          border-color: #4f46e5;
          transform: scale(1.1);
          z-index: 1000;
        }
        .map-pin--selected::after {
          border-top-color: #4f46e5;
        }
        .map-pin-wrapper {
          overflow: visible !important;
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </>
  )
}
