import Link from "next/link"
import { notFound } from "next/navigation"
import { demoVenues } from "@/data/demo"
import { formatPrice, formatHour } from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
}

export default async function VenueDetailPage({ params }: Props) {
  const { id } = await params
  const venue = demoVenues.find((v) => v.id === id)
  if (!venue) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">検索に戻る</span>
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm">スタジオファインダー</span>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="h-48 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <svg className="w-16 h-16 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="inline-block text-xs bg-gray-100 text-gray-500 rounded px-2 py-0.5 mb-2">{venue.source_site}</span>
                <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
              </div>
              {venue.source_url && (
                <a href={venue.source_url} target="_blank" rel="noopener noreferrer" className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">予約はこちら →</a>
              )}
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              {venue.nearest_station && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                  <span>最寄り駅: {venue.nearest_station}</span>
                </div>
              )}
              {venue.address && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <span>{venue.address}</span>
                </div>
              )}
            </div>
            {venue.description && <p className="mt-4 text-sm text-gray-600 leading-relaxed">{venue.description}</p>}
          </div>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">スタジオ一覧<span className="ml-2 text-sm font-normal text-gray-500">{venue.rooms.length}部屋</span></h2>
        <div className="space-y-4">
          {venue.rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-semibold text-gray-900">{room.name}</h3>
                {room.price_per_hour !== null && (
                  <span className="text-indigo-600 font-bold text-lg shrink-0">{formatPrice(room.price_per_hour)}<span className="text-sm font-normal text-gray-500">/時</span></span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                {room.capacity !== null && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    定員 {room.capacity}名
                  </div>
                )}
                {room.open_hour !== null && room.close_hour !== null && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {formatHour(room.open_hour)}〜{formatHour(room.close_hour)}
                  </div>
                )}
              </div>
              {room.facilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {room.facilities.map((f) => <span key={f} className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-1">{f}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
