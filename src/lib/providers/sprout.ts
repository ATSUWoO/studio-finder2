import * as cheerio from "cheerio"
import { AvailabilityProvider, ProviderVenue, TimeSlot } from "./types"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const BASE_URL = "https://www.sprout-rental.com/reserve/"

// スプラウト店舗定義
// sid: 予約ページ URL パラメータ
const STORES = [
  {
    sid: 1,
    venueId: "sprout-umeda",
    venueName: "スプラウトレンタルスタジオ 梅田本店",
    address: "大阪市北区梅田付近",
    lat: 34.7024,
    lng: 135.4959,
  },
  {
    sid: 11,
    venueId: "sprout-umeda-block",
    venueName: "スプラウトレンタルスタジオ 梅田BLOCK",
    address: "大阪市北区梅田付近",
    lat: 34.7031,
    lng: 135.4967,
  },
  {
    sid: 81,
    venueId: "sprout-umekita",
    venueName: "スプラウトレンタルスタジオ うめきた",
    address: "大阪市北区大深町付近",
    lat: 34.7065,
    lng: 135.4935,
  },
  {
    sid: 87,
    venueId: "sprout-umekita-roots",
    venueName: "スプラウトレンタルスタジオ うめきたROOTS",
    address: "大阪市北区大深町付近",
    lat: 34.7068,
    lng: 135.4940,
  },
  {
    sid: 91,
    venueId: "sprout-nakatsu",
    venueName: "スプラウトレンタルスタジオ 中津",
    address: "大阪市北区中津付近",
    lat: 34.7085,
    lng: 135.4951,
  },
  {
    sid: 41,
    venueId: "sprout-kitaumeda",
    venueName: "スプラウトレンタルスタジオ 北梅田",
    address: "大阪市北区梅田付近",
    lat: 34.7042,
    lng: 135.4945,
  },
  {
    sid: 61,
    venueId: "sprout-kantele",
    venueName: "スプラウトレンタルスタジオ 関テレ前",
    address: "大阪市福島区海老江付近",
    lat: 34.6994,
    lng: 135.4876,
  },
  {
    sid: 51,
    venueId: "sprout-ogimachi",
    venueName: "スプラウトレンタルスタジオ 扇町",
    address: "大阪市北区扇町付近",
    lat: 34.7019,
    lng: 135.5070,
  },
] as const

/**
 * スプラウト予約ページから空き情報を取得する。
 *
 * スプラウトの予約テーブルは **逆論理**:
 *   - セルに価格テキストあり → 予約可
 *   - セルが空（またはclass="disable"等） → 予約不可・満席
 *
 * URL例: https://www.sprout-rental.com/reserve/?sid=1&vd=20260514
 *
 * テーブル構造（想定）:
 *   行 = 時間帯、列 = 部屋
 *   1行目ヘッダ: 部屋名
 *   1列目: 時間（例 "18:00"）
 *
 * TODO: 実際の HTML を確認してセレクタを調整してください。
 */
async function fetchStoreSlots(
  sid: number,
  date: string
): Promise<{ roomName: string; slots: TimeSlot[] }[]> {
  // vd パラメータは YYYYMMDD 形式
  const vd = date.replace(/-/g, "")
  const url = `${BASE_URL}?sid=${sid}&vd=${vd}`

  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": USER_AGENT },
  })
  if (!res.ok) throw new Error(`Sprout sid=${sid} HTTP ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // 予約テーブルを探す（クラス名は実際のHTMLで確認が必要）
  // TODO: 実際のセレクタに合わせて修正してください
  const table = $("table.reserve-table, table.timetable, .reserve-area table").first()
  if (!table.length) return []

  // ヘッダ行から部屋名を収集
  const roomNames: string[] = []
  table.find("tr").first().find("th, td").each((i, el) => {
    if (i === 0) return // 最初の列は「時間」ラベル
    const name = $(el).text().trim()
    if (name) roomNames.push(name)
  })

  if (roomNames.length === 0) return []

  // 部屋ごとのスロット配列を初期化
  const roomSlots: TimeSlot[][] = roomNames.map(() => [])

  // データ行を処理
  table.find("tr").slice(1).each((_, row) => {
    const cells = $(row).find("th, td")
    const timeText = cells.first().text().trim()

    const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/)
    if (!timeMatch) return

    const hour = parseInt(timeMatch[1], 10)
    const start = `${String(hour).padStart(2, "0")}:00`
    const end = `${String(hour + 1).padStart(2, "0")}:00`

    cells.slice(1).each((colIdx, cell) => {
      if (colIdx >= roomNames.length) return

      const $cell = $(cell)
      const cellText = $cell.text().trim()
      const cellClass = $cell.attr("class") ?? ""

      // スプラウトは逆論理: テキスト（価格）がある = 予約可
      const isDisabled =
        cellClass.includes("disable") ||
        cellClass.includes("closed") ||
        cellClass.includes("reserved") ||
        cellClass.includes("booked")

      if (isDisabled || cellText.length === 0) return

      // 価格テキストから数値を抽出
      const priceMatch = cellText.match(/[\d,]+/)
      const price = priceMatch ? parseInt(priceMatch[0].replace(",", ""), 10) : null

      roomSlots[colIdx].push({ start, end, price })
    })
  })

  return roomNames.map((roomName, i) => ({ roomName, slots: roomSlots[i] }))
}

export class SproutProvider implements AvailabilityProvider {
  readonly providerId = "sprout"

  async fetchAvailability(date: string): Promise<ProviderVenue[]> {
    const venues: ProviderVenue[] = []

    await Promise.allSettled(
      STORES.map(async (store) => {
        const roomData = await fetchStoreSlots(store.sid, date)
        const roomsWithSlots = roomData.filter((r) => r.slots.length > 0)
        if (roomsWithSlots.length === 0) return

        venues.push({
          venueId: store.venueId,
          venueName: store.venueName,
          providerId: this.providerId,
          address: store.address,
          lat: store.lat,
          lng: store.lng,
          sourceUrl: `${BASE_URL}?sid=${store.sid}`,
          rooms: roomsWithSlots.map((r) => ({
            roomId: r.roomName,
            roomName: r.roomName,
            capacity: null,
            slots: r.slots,
          })),
        })
      })
    )

    return venues
  }
}
