import * as cheerio from "cheerio"
import { AvailabilityProvider, ProviderVenue, TimeSlot } from "./types"

// BUZZ は Cloudflare 配信のため一般的な User-Agent が必要
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const BASE_URL = "https://buzz-st.com"

// BUZZ 店舗定義
// roomIds: 店舗ページ (<a href="/{slug}/{roomId}">...) から取得した部屋ID一覧
// 梅田の 155/156 は確認済み。その他は動的に取得（下記 discoverRoomIds 参照）
const STORES = [
  {
    slug: "osakaumeda",
    venueId: "buzz-umeda",
    venueName: "BUZZ大阪梅田",
    address: "大阪市北区東梅田付近",
    lat: 34.7024,
    lng: 135.5013,
  },
  {
    slug: "osakashinsaibashi",
    venueId: "buzz-shinsaibashi",
    venueName: "BUZZ大阪心斎橋",
    address: "大阪市中央区心斎橋付近",
    lat: 34.6730,
    lng: 135.5007,
  },
  {
    slug: "osakakyobashi",
    venueId: "buzz-kyobashi",
    venueName: "BUZZ大阪京橋",
    address: "大阪市城東区京橋付近",
    lat: 34.6968,
    lng: 135.5325,
  },
] as const

const SOURCE_URL = "https://buzz-st.com"

interface BuzzRoom {
  roomId: string
  roomName: string
}

/** 店舗トップページから部屋IDと名称を収集する */
async function discoverRooms(slug: string): Promise<BuzzRoom[]> {
  const html = await (
    await fetch(`${BASE_URL}/${slug}`, {
      cache: "no-store",
      headers: { "User-Agent": USER_AGENT },
    })
  ).text()

  const $ = cheerio.load(html)
  const rooms: BuzzRoom[] = []
  const seen = new Set<string>()

  // 部屋へのリンク: href="/{slug}/{roomId}" の形式
  $(`a[href^="/${slug}/"]`).each((_, el) => {
    const href = $(el).attr("href") ?? ""
    const match = href.match(new RegExp(`^/${slug}/(\\d+)$`))
    if (!match) return
    const roomId = match[1]
    if (seen.has(roomId)) return
    seen.add(roomId)

    // リンクのテキストまたは近くの見出しを部屋名として使用
    const text = $(el).text().trim() || $(el).find("*").first().text().trim()
    rooms.push({ roomId, roomName: text || `Room ${roomId}` })
  })

  return rooms
}

/**
 * 部屋の週間予約表から指定日の空きスロットを抽出する。
 *
 * BUZZ の予約表は /{slug}/{roomId}/{YYYY-MM-DD} で7日分の週表示を返す。
 * テーブル (#time_table) の列が日付、行が時間帯。
 * 空きセル（テキストなし or class に "empty"/"available" を含む）= 予約可。
 *
 * TODO: 実際のHTMLを確認してセレクタを調整してください。
 */
async function fetchRoomSlots(slug: string, roomId: string, date: string): Promise<TimeSlot[]> {
  const res = await fetch(`${BASE_URL}/${slug}/${roomId}/${date}`, {
    cache: "no-store",
    headers: { "User-Agent": USER_AGENT },
  })
  if (!res.ok) throw new Error(`BUZZ ${slug}/${roomId} HTTP ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)

  // #time_table 以降のテーブルを対象とする
  const table = $("#time_table").next("table").add("table#time_table").first()
  if (!table.length) {
    // フォールバック: ページ内の最初のテーブル
    // TODO: 実際のセレクタに合わせて修正してください
  }

  const slots: TimeSlot[] = []

  // ヘッダー行から対象日付の列インデックスを探す
  let targetColIndex = -1
  table.find("tr").first().find("th, td").each((i, el) => {
    const text = $(el).text().replace(/\s/g, "")
    // "2026-05-15" または "05/15" などの日付表記に対応
    if (text.includes(date) || text.includes(date.slice(5).replace("-", "/"))) {
      targetColIndex = i
    }
  })

  if (targetColIndex < 0) {
    // 列が特定できない場合は全列をスキャン（最初の空き情報列として扱う）
    // TODO: BUZZ の実際のHTML構造に合わせて調整
    targetColIndex = 1
  }

  // 各行から時刻とセルの空き状態を読み取る
  table.find("tr").slice(1).each((_, row) => {
    const cells = $(row).find("th, td")
    const timeCell = cells.first()
    const timeText = timeCell.text().trim()

    // "19:00" または "19:00-20:00" 形式を想定
    const timeMatch = timeText.match(/(\d{1,2}):(\d{2})/)
    if (!timeMatch) return

    const hour = parseInt(timeMatch[1], 10)
    const start = `${String(hour).padStart(2, "0")}:00`
    const end = `${String(hour + 1).padStart(2, "0")}:00`

    const targetCell = cells.eq(targetColIndex)
    if (!targetCell.length) return

    // 空きセルの判定: テキストがない or 明示的な "available"/"空き" クラス
    // TODO: 実際のclass名を確認して調整してください
    const cellText = targetCell.text().trim()
    const cellClass = targetCell.attr("class") ?? ""
    const isReserved =
      cellText.length > 0 ||
      cellClass.includes("reserved") ||
      cellClass.includes("booked") ||
      cellClass.includes("filled")

    if (!isReserved) {
      // 料金は別途セル内テキストから取得できる場合があるが、不明な場合は null
      const priceMatch = cellText.match(/[\d,]+/)
      const price = priceMatch ? parseInt(priceMatch[0].replace(",", ""), 10) : null
      slots.push({ start, end, price })
    }
  })

  return slots
}

export class BuzzProvider implements AvailabilityProvider {
  readonly providerId = "buzz"

  async fetchAvailability(date: string): Promise<ProviderVenue[]> {
    const venues: ProviderVenue[] = []

    await Promise.allSettled(
      STORES.map(async (store) => {
        const rooms = await discoverRooms(store.slug)
        if (rooms.length === 0) return

        const roomResults = await Promise.allSettled(
          rooms.map(async (room) => ({
            room,
            slots: await fetchRoomSlots(store.slug, room.roomId, date),
          }))
        )

        const filledRooms = roomResults
          .filter(
            (r): r is PromiseFulfilledResult<{ room: BuzzRoom; slots: TimeSlot[] }> =>
              r.status === "fulfilled" && r.value.slots.length > 0
          )
          .map(({ value }) => ({
            roomId: value.room.roomId,
            roomName: value.room.roomName,
            capacity: null,
            slots: value.slots,
          }))

        if (filledRooms.length === 0) return

        venues.push({
          venueId: store.venueId,
          venueName: store.venueName,
          providerId: this.providerId,
          address: store.address,
          lat: store.lat,
          lng: store.lng,
          sourceUrl: `${SOURCE_URL}/${store.slug}`,
          rooms: filledRooms,
        })
      })
    )

    return venues
  }
}
