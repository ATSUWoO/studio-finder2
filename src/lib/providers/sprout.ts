import * as cheerio from "cheerio"
import { AvailabilityProvider, ProviderVenue, TimeSlot } from "./types"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const RESERVE_URL = "https://www.sprout-rental.com/reserve/"
const AJAX_URL = "https://www.sprout-rental.com/tpl/ajx_studio_detail.php"

const STORES = [
  { sid: 1,  venueId: "sprout-umeda",        venueName: "スプラウトレンタルスタジオ 梅田本店",   address: "大阪市北区梅田付近",   lat: 34.7024, lng: 135.4959 },
  { sid: 11, venueId: "sprout-umeda-block",   venueName: "スプラウトレンタルスタジオ 梅田BLOCK", address: "大阪市北区梅田付近",   lat: 34.7031, lng: 135.4967 },
  { sid: 81, venueId: "sprout-umekita",       venueName: "スプラウトレンタルスタジオ うめきた", address: "大阪市北区大深町付近", lat: 34.7065, lng: 135.4935 },
  { sid: 87, venueId: "sprout-umekita-roots", venueName: "スプラウトレンタルスタジオ うめきたROOTS", address: "大阪市北区大深町付近", lat: 34.7068, lng: 135.4940 },
  { sid: 91, venueId: "sprout-nakatsu",       venueName: "スプラウトレンタルスタジオ 中津",     address: "大阪市北区中津付近",   lat: 34.7085, lng: 135.4951 },
  { sid: 41, venueId: "sprout-kitaumeda",     venueName: "スプラウトレンタルスタジオ 北梅田",   address: "大阪市北区梅田付近",   lat: 34.7042, lng: 135.4945 },
  { sid: 61, venueId: "sprout-kantele",       venueName: "スプラウトレンタルスタジオ 関テレ前", address: "大阪市福島区海老江付近", lat: 34.6994, lng: 135.4876 },
  { sid: 51, venueId: "sprout-ogimachi",      venueName: "スプラウトレンタルスタジオ 扇町",     address: "大阪市北区扇町付近",   lat: 34.7019, lng: 135.5070 },
] as const

async function fetchHtml(url: string, referer?: string): Promise<{ ok: boolean; html: string; status: number }> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8",
  }
  if (referer) headers["Referer"] = referer

  const res = await fetch(url, { cache: "no-store", headers })
  const html = await res.text()
  return { ok: res.ok, html, status: res.status }
}

/**
 * HTMLテーブルから空きスロットを抽出する。
 *
 * スプラウトのテーブル構造:
 *   行 = スタジオ（室）
 *   列 = 時刻スロット
 *   空きセル = "23-0 800 円" のようなテキスト（時刻-分 価格 円）
 *   予約済みセル = 空、またはdisabledクラス
 *
 * セルパターン: "HH-MM price 円"  例: "23-0 800 円", "19-0 1,200 円"
 */
function parseTable($: cheerio.CheerioAPI): { roomName: string; slots: TimeSlot[] }[] {
  const results: { roomName: string; slots: TimeSlot[] }[] = []

  // セルから時刻と価格を抽出するパターン: "23-0 800 円" / "19-0 1,200 円"
  const CELL_PATTERN = /(\d{1,2})[-:](\d{2})\s+([\d,]+)\s*円/

  // ヘッダから列時刻を読む（セルに時刻がない場合のフォールバック）
  // 列ヘッダ例: "23:00", "23時", "23"
  const HEADER_TIME_PATTERN = /(\d{1,2})(?:[:\-時](\d{2})?)?/

  $("table").each((_, tableEl) => {
    const rows = $(tableEl).find("tr")
    if (rows.length < 2) return

    // ヘッダ行から各列の時刻マッピングを作成（フォールバック用）
    const colHours: (number | null)[] = []
    rows.first().find("th, td").each((i, el) => {
      if (i === 0) { colHours.push(null); return } // 第1列はスタジオ名
      const text = $(el).text().trim()
      const m = text.match(HEADER_TIME_PATTERN)
      colHours.push(m ? parseInt(m[1], 10) : null)
    })

    // データ行（各行 = スタジオ）
    rows.slice(1).each((_, row) => {
      const cells = $(row).find("th, td")
      if (cells.length < 2) return

      const roomName = cells.first().text().trim()
      if (!roomName) return

      const slots: TimeSlot[] = []

      cells.slice(1).each((colIdx, cell) => {
        const $cell = $(cell)
        const cellClass = $cell.attr("class") ?? ""

        // disable 系クラスは予約済み
        if (
          cellClass.includes("disable") ||
          cellClass.includes("closed") ||
          cellClass.includes("reserved") ||
          cellClass.includes("booked")
        ) return

        const cellText = $cell.text().trim()
        if (!cellText) return // 空セル = 予約済み

        // セルに時刻が含まれる場合（主パターン: "23-0 800 円"）
        const cellMatch = cellText.match(CELL_PATTERN)
        if (cellMatch) {
          const hour = parseInt(cellMatch[1], 10)
          const price = parseInt(cellMatch[3].replace(",", ""), 10)
          slots.push({
            start: `${String(hour).padStart(2, "0")}:00`,
            end: `${String((hour + 1) % 24).padStart(2, "0")}:00`,
            price,
          })
          return
        }

        // セルに価格のみの場合（"800円"）→ 列ヘッダから時刻を補完
        const priceOnlyMatch = cellText.match(/^([\d,]+)\s*円$/)
        if (priceOnlyMatch) {
          const hour = colHours[colIdx + 1] // +1: 第1列はスタジオ名
          if (hour === null || hour === undefined) return
          const price = parseInt(priceOnlyMatch[1].replace(",", ""), 10)
          slots.push({
            start: `${String(hour).padStart(2, "0")}:00`,
            end: `${String((hour + 1) % 24).padStart(2, "0")}:00`,
            price,
          })
        }
      })

      if (slots.length > 0) {
        results.push({ roomName, slots })
      }
    })
  })

  return results
}

/**
 * 日次予約表から空きスロットを取得する。
 *
 * 1次: reserve/?sid={sid}&vd={YYYYMMDD}（日付指定ページ）
 * 2次: ajx_studio_detail.php?sid={sid}&rid={rid}（AJAXパーシャル）
 */
async function fetchStoreSlots(
  sid: number,
  date: string
): Promise<{ roomName: string; slots: TimeSlot[] }[]> {
  const vd = date.replace(/-/g, "")
  const mainUrl = `${RESERVE_URL}?sid=${sid}&vd=${vd}`

  const { ok, html, status } = await fetchHtml(mainUrl)
  if (!ok) throw new Error(`Sprout sid=${sid} HTTP ${status}`)

  const $ = cheerio.load(html)
  const rooms = parseTable($)
  if (rooms.length > 0) return rooms

  // テーブルが空 → AJAXエンドポイントで room ID を収集して再取得
  // メインページのリンクから rid を探す
  const rids = new Set<string>()
  $(`a[href*="rid="]`).each((_, el) => {
    const href = $(el).attr("href") ?? ""
    const m = href.match(/[?&]rid=(\d+)/)
    if (m) rids.add(m[1])
  })
  // form や select の option からも探す
  $("option[value]").each((_, el) => {
    const val = $(el).attr("value") ?? ""
    if (/^\d+$/.test(val)) rids.add(val)
  })

  if (rids.size === 0) return []

  const ajaxResults = await Promise.allSettled(
    [...rids].map(async (rid) => {
      const ajaxUrl = `${AJAX_URL}?sid=${sid}&rid=${rid}`
      const { ok: aok, html: ahtml, status: astatus } = await fetchHtml(
        ajaxUrl,
        `${RESERVE_URL}?sid=${sid}`
      )
      if (!aok) throw new Error(`Sprout AJAX sid=${sid} rid=${rid} HTTP ${astatus}`)
      const $a = cheerio.load(ahtml)
      return parseTable($a)
    })
  )

  const allRooms: { roomName: string; slots: TimeSlot[] }[] = []
  for (const r of ajaxResults) {
    if (r.status === "fulfilled") allRooms.push(...r.value)
  }
  return allRooms
}

export class SproutProvider implements AvailabilityProvider {
  readonly providerId = "sprout"

  async fetchAvailability(date: string): Promise<ProviderVenue[]> {
    const venues: ProviderVenue[] = []

    await Promise.allSettled(
      STORES.map(async (store) => {
        const rooms = await fetchStoreSlots(store.sid, date)
        const roomsWithSlots = rooms.filter((r) => r.slots.length > 0)
        if (roomsWithSlots.length === 0) return

        venues.push({
          venueId: store.venueId,
          venueName: store.venueName,
          providerId: this.providerId,
          address: store.address,
          lat: store.lat,
          lng: store.lng,
          sourceUrl: `${RESERVE_URL}?sid=${store.sid}`,
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
