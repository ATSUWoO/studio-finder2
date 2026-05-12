"use client"

import { useEffect, useRef, useState } from "react"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"

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
  onDeselect?: () => void
}

const OSAKA_CENTER: [number, number] = [34.6937, 135.5022]
const DEFAULT_ZOOM = 12
const DISABLE_CLUSTERING_AT_ZOOM = 16

type LeafletModule = typeof import("leaflet")
type LMap = ReturnType<LeafletModule["map"]>
type LMarker = ReturnType<LeafletModule["marker"]>
type LMarkerClusterGroup = import("leaflet").MarkerClusterGroup

export default function StudioMap({ venues, selectedId, onSelectVenue, onDeselect }: Props) {
  const mapRef = useRef<LMap | null>(null)
  const clusterRef = useRef<LMarkerClusterGroup | null>(null)
  const markersRef = useRef<Map<string, LMarker>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const onDeselectRef = useRef(onDeselect)
  useEffect(() => { onDeselectRef.current = onDeselect }, [onDeselect])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!containerRef.current) return
    if (mapRef.current) return

    ;(async () => {
      const L = await import("leaflet")
      // Leaflet の UMD 末尾が window.L = module.exports を設定する。
      // ここで上書きすると markercluster が可変な module.exports ではなく
      // ESM namespace を掴んでしまい markerClusterGroup の追加が無効になるため削除。
      await import("leaflet.markercluster")

      // markerClusterGroup は window.L (= module.exports) に追加されている。
      // ESM namespace の L にはないため window.L 経由で取得する。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Lmc = (window as any).L as typeof L & { markerClusterGroup: (opts?: object) => import("leaflet").MarkerClusterGroup }

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
      map.on("click", () => { onDeselectRef.current?.() })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map)

      const cluster = Lmc.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: DISABLE_CLUSTERING_AT_ZOOM,
        maxClusterRadius: 40,
        iconCreateFunction: (c: import("leaflet").MarkerCluster) => {
          const count = c.getChildCount()
          return L.divIcon({
            html: `<div class="map-cluster"><span>${count}</span></div>`,
            className: "map-cluster-wrapper",
            iconSize: [36, 36],
          })
        },
      })
      map.addLayer(cluster)

      mapRef.current = map
      clusterRef.current = cluster
      setMapReady(true)
    })().catch((err) => {
      console.error("[StudioMap] init failed:", err)
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
      clusterRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !clusterRef.current) return
    const cluster = clusterRef.current

    import("leaflet").then((L) => {
      const currentIds = new Set(venues.map((v) => v.id))
      const existingIds = new Set(markersRef.current.keys())

      for (const id of existingIds) {
        if (!currentIds.has(id)) {
          const m = markersRef.current.get(id)
          if (m) cluster.removeLayer(m)
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
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })

          const marker = L.marker([venue.lat, venue.lng], { icon })
            .on("click", () => onSelectVenue(venue))

          cluster.addLayer(marker)
          markersRef.current.set(venue.id, marker)
        }
      }
    })
  }, [venues, onSelectVenue, selectedId, mapReady])

  useEffect(() => {
    if (!mapRef.current || !clusterRef.current) return
    const cluster = clusterRef.current

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
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          })
        )
      }

      if (selectedId) {
        const venue = venues.find((v) => v.id === selectedId)
        const marker = markersRef.current.get(selectedId)
        if (venue?.lat && venue?.lng && marker) {
          cluster.zoomToShowLayer(marker, () => {
            const map = mapRef.current
            if (!map) return
            const targetZoom = Math.max(map.getZoom(), 15)
            map.flyTo([venue.lat!, venue.lng!], targetZoom, { animate: true, duration: 0.5 })
          })
        }
      }
    })
  }, [selectedId, venues, mapReady])

  return (
    <>
      <style>{`
        .map-pin-wrapper {
          overflow: visible !important;
        }
        .map-pin {
          position: absolute;
          bottom: 0;
          left: 0;
          transform: translateX(-50%);
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
          transform: translateX(-50%) scale(1.1);
          z-index: 1000;
        }
        .map-pin--selected::after {
          border-top-color: #4f46e5;
        }
        .map-cluster-wrapper {
          background: transparent;
          border: none;
        }
        .map-cluster {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #6366f1;
          color: white;
          font-weight: 700;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.25), 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
        }
        .map-cluster:hover {
          background: #4f46e5;
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </>
  )
}
