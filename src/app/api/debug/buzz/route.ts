import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const BASE_URL = "https://buzz-st.com"

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "osakaumeda"
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0]

  const result: Record<string, unknown> = { slug, date }

  // Step 1: 店舗ページ取得
  try {
    const storeRes = await fetch(`${BASE_URL}/${slug}`, {
      cache: "no-store",
      headers: { "User-Agent": USER_AGENT },
    })
    result.store_http_status = storeRes.status
    const html = await storeRes.text()
    result.store_html_bytes = html.length
    result.store_html_preview = html.slice(0, 2000)

    // 部屋リンクを探す
    const $ = cheerio.load(html)
    const roomLinks: { href: string; text: string }[] = []
    $(`a[href^="/${slug}/"]`).each((_, el) => {
      const href = $(el).attr("href") ?? ""
      if (/^\/[^/]+\/\d+$/.test(href)) {
        roomLinks.push({ href, text: $(el).text().trim().slice(0, 80) })
      }
    })
    result.room_links_found = roomLinks.length
    result.room_links_sample = roomLinks.slice(0, 10)

    // Step 2: 1部屋のスロットページ取得（最初の部屋IDを使用）
    const firstRoomMatch = html.match(new RegExp(`/${slug}/(\\d+)`))
    if (firstRoomMatch) {
      const roomId = firstRoomMatch[1]
      result.testing_room_id = roomId
      try {
        const slotRes = await fetch(`${BASE_URL}/${slug}/${roomId}/${date}`, {
          cache: "no-store",
          headers: { "User-Agent": USER_AGENT },
        })
        result.slot_http_status = slotRes.status
        const slotHtml = await slotRes.text()
        result.slot_html_bytes = slotHtml.length
        result.slot_html_preview = slotHtml.slice(0, 3000)

        // テーブル検出
        const $s = cheerio.load(slotHtml)
        const tables = $s("table")
        result.tables_found = tables.length
        result.table_ids = tables.map((_, t) => $s(t).attr("id") ?? "(no id)").get()
        result.table_classes = tables.map((_, t) => $s(t).attr("class") ?? "(no class)").get()

        // 最初のテーブルの構造サンプル
        const firstTable = tables.first()
        if (firstTable.length) {
          const rows = firstTable.find("tr")
          result.first_table_row_count = rows.length
          result.first_table_header_cells = rows.first().find("th, td").map((_, c) => $s(c).text().trim().slice(0, 40)).get()
          result.first_table_first_data_row = rows.eq(1).find("th, td").map((_, c) => ({
            text: $s(c).text().trim().slice(0, 40),
            class: $s(c).attr("class") ?? "",
          })).get()
        }
      } catch (e) {
        result.slot_error = String(e)
      }
    } else {
      result.room_id_not_found = true
    }
  } catch (e) {
    result.store_error = String(e)
  }

  return NextResponse.json(result, { status: 200 })
}
