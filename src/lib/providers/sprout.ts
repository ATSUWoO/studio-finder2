import * as cheerio from "cheerio"
import { AvailabilityProvider, ProviderVenue, TimeSlot } from "./types"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const RESERVE_URL = "https://www.sprout-rental.com/reserve/"

// sid → rid → スタジオ表示名
// rid=11 (BLOCK) を sid=1 のカタログから除外: sid=11 で別途取得するため重複を避ける
const STUDIO_CATALOG: Record<number, Record<number, string>> = {
  1: {
    1: "Aスタジオ", 2: "Bスタジオ", 3: "Cスタジオ",
    24: "Dスタジオ", 25: "Eスタジオ", 26: "Fスタジオ",
    27: "Gスタジオ", 28: "Hスタジオ", 29: "Iスタジオ",
    30: "Jスタジオ", 31: "Kスタジオ", 301: "ボーカルルーム",
  },
  11: { 11: "BLOCK" },
  41: { 41: "KITA 301", 42: "KITA 302", 43: "KITA 303", 44: "KITA 401", 45: "KITA 501", 46: "CUBE", 47: "KITA 201", 48: "KITA 202", 49: "KITA 203" },
  51: { 51: "OGI 201", 52: "OGI 301", 53: "OGI 401", 54: "OGI 501", 55: "OGI 502", 56: "OGI 601", 57: "OGI 602", 58: "OGI 701" },
  61: { 61: "KTV 301", 62: "KTV 401", 63: "KTV 402", 64: "KTV 403", 65: "KTV 501", 68: "KTV 601", 70: "KTV 701" },
  81: { 81: "N 01", 82: "N 02", 83: "N 03", 84: "N 04", 85: "N 05", 86: "HYPE" },
  87: { 87: "ROOTS" },
  91: { 91: "NKT 101", 92: "NKT 201", 93: "RIZE" },
}

// 通常予約対象店舗（sid=72 GOAT は別サイト予約のため除外）
const STORES = [
  { sid: 1,  venueId: "sprout-umeda",        venueName: "スプラウトレンタルスタジオ 梅田本店",    address: "大阪市北区梅田付近",    lat: 34.7024, lng: 135.4959 },
  { sid: 11, venueId: "sprout-umeda-block",   venueName: "スプラウトレンタルスタジオ 梅田BLOCK",  address: "大阪市北区梅田付近",    lat: 34.7031, lng: 135.4967 },
  { sid: 41, venueId: "sprout-kitaumeda",     venueName: "スプラウトレンタルスタジオ 北梅田",     address: "大阪市北区梅田付近",    lat: 34.7042, lng: 135.4945 },
  { sid: 51, venueId: "sprout-ogimachi",      venueName: "スプラウトレンタルスタジオ 扇町",       address: "大阪市北区扇町付近",    lat: 34.7019, lng: 135.5070 },
  { sid: 61, venueId: "sprout-kantele",       venueName: "スプラウトレンタルスタジオ 関テレ前",   address: "大阪市福島区海老江付近", lat: 34.6994, lng: 135.4876 },
  { sid: 81, venueId: "sprout-umekita",       venueName: "スプラウトレンタルスタジオ うめきた",   address: "大阪市北区大深町付近",  lat: 34.7065, lng: 135.4935 },
  { sid: 87, venueId: "sprout-umekita-roots", venueName: "スプラウトレンタルスタジオ うめきたROOTS", address: "大阪市北区大深町付近", lat: 34.7068, lng: 135.4940 },
  { sid: 91, venueId: "sprout-nakatsu",       venueName: "スプラウトレンタルスタジオ 中津",       address: "大阪市北区中津付近",   lat: 34.7085, lng: 135.4951 },
] as const

// セルテキスト解析パターン（引継ぎ書検証済み）
// "16-17 1,100 円" / "23-0 800 円"（0 は 24:00 を意味）
const SLOT_RE = /(\d{1,2})-(\d{1,2})\s+([\d,]+)\s*円/
// "深夜 パック 5,000 円"
const PACK_RE = /深夜\s*パック\s+([\d,]+)\s*円/
// <a href="...rid=25"> から rid 取得
const RID_RE = /[?&]rid=(\d+)/

async function fetchHtml(url: string): Promise<{ ok: boolean; html: string; status: number }> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8",
      "Referer": RESERVE_URL,
    },
  })
  return { ok: res.ok, html: await res.text(), status: res.status }
}

/**
 * 日次予約表HTMLから空きスロットをパース。
 *
 * テーブル識別: "深夜パック" テキストを含む <table> が予約表。
 * 行 = スタジオ（先頭セルの <a href="...rid=N"> でスタジオ特定）
 * 列 = 時刻スロット
 *
 * セルパターン（逆論理: テキストあり = 空き、空白 = 予約済み）:
 *   "16-17 1,100 円" → 16:00-17:00 ¥1,100
 *   "23-0 800 円"    → 23:00-24:00 ¥800（"0" = 翌0時 = 24時）
 *   "深夜 パック 5,000 円" → 深夜パック（24:00-06:00）¥5,000
 */
function parseReservationTable(
  $: cheerio.CheerioAPI,
  studioMap: Record<number, string>
): { rid: number; roomName: string; slots: TimeSlot[] }[] {
  // 「深夜パック」を含むテーブルが予約表
  const table = $("table").filter((_, el) => $(el).text().includes("深夜パック")).first()
  if (!table.length) return []

  const rows = table.find("tr")
  if (rows.length < 2) return []

  const results: { rid: number; roomName: string; slots: TimeSlot[] }[] = []

  rows.slice(1).each((_, row) => {
    const cells = $(row).find("td")
    if (cells.length < 2) return

    // 先頭セルの <a href> から rid を取得
    const ridMatch = cells.first().find("a[href]").attr("href")?.match(RID_RE)
    if (!ridMatch) return
    const rid = parseInt(ridMatch[1], 10)

    // カタログにない rid はスキップ（BLOCK 重複除去含む）
    const roomName = studioMap[rid]
    if (!roomName) return

    const slots: TimeSlot[] = []

    cells.slice(1).each((_, cell) => {
      const text = $(cell).text().trim().replace(/\s+/g, " ")
      if (!text) return // 空 = 予約済み・利用不可

      // 通常スロット
      const m = SLOT_RE.exec(text)
      if (m) {
        const startHour = parseInt(m[1], 10)
        const endHourRaw = parseInt(m[2], 10)
        // "0" は翌0時（= 24:00）を意味する
        const endHour = endHourRaw === 0 ? 24 : endHourRaw
        slots.push({
          start: `${String(startHour).padStart(2, "0")}:00`,
          end: endHour === 24 ? "00:00" : `${String(endHour).padStart(2, "0")}:00`,
          price: parseInt(m[3].replace(",", ""), 10),
        })
        return
      }

      // 深夜パック（24-30時 = 翌0:00-6:00）
      const p = PACK_RE.exec(text)
      if (p) {
        slots.push({
          start: "00:00",
          end: "06:00",
          price: parseInt(p[1].replace(",", ""), 10),
          isAllnight: true,
        })
      }
    })

    if (slots.length > 0) {
      results.push({ rid, roomName, slots })
    }
  })

  return results
}

async function fetchStoreSlots(sid: number, date: string) {
  const vd = date.replace(/-/g, "")
  const { ok, html, status } = await fetchHtml(`${RESERVE_URL}?sid=${sid}&vd=${vd}`)
  if (!ok) throw new Error(`Sprout sid=${sid} HTTP ${status}`)
  const $ = cheerio.load(html)
  return parseReservationTable($, STUDIO_CATALOG[sid] ?? {})
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
            roomId: String(r.rid),
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
