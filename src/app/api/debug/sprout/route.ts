import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const RESERVE_URL = "https://www.sprout-rental.com/reserve/"
const AJAX_URL = "https://www.sprout-rental.com/tpl/ajx_studio_detail.php"

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja-JP,ja;q=0.9",
      "Referer": RESERVE_URL,
    },
  })
  return { ok: res.ok, status: res.status, html: await res.text() }
}

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid") ?? "1"
  const rid = req.nextUrl.searchParams.get("rid")
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0]
  const vd = date.replace(/-/g, "")
  const result: Record<string, unknown> = { sid, date, vd }

  // ?rid= 指定時は AJAX 詳細エンドポイントをテスト
  if (rid) {
    const url = `${AJAX_URL}?sid=${sid}&rid=${rid}`
    result.url = url
    const { ok, status, html } = await fetchHtml(url)
    result.status = status
    result.html_bytes = html.length
    result.html_preview = html.slice(0, 2000)
    return NextResponse.json(result)
  }

  // 日次予約表テスト
  const url = `${RESERVE_URL}?sid=${sid}&vd=${vd}`
  result.url = url
  const { ok, status, html } = await fetchHtml(url)
  result.status = status
  result.html_bytes = html.length
  result.html_preview = html.slice(0, 1500)

  if (!ok) {
    result.error = `HTTP ${status}: ${html.slice(0, 100)}`
    return NextResponse.json(result)
  }

  const $ = cheerio.load(html)

  // 「深夜パック」テーブルを特定
  const table = $("table").filter((_, el) => $(el).text().includes("深夜パック")).first()
  result.reservation_table_found = table.length > 0

  if (table.length) {
    const rows = table.find("tr")
    result.row_count = rows.length

    // ヘッダ行（列ラベル）
    result.header_cells = rows.first().find("th, td").map((_, c) => $(c).text().trim()).get()

    // データ行サンプル（先頭3行）
    result.sample_rows = rows.slice(1, 4).map((_, row) => {
      const cells = $(row).find("td")
      const link = cells.first().find("a[href]")
      const ridMatch = link.attr("href")?.match(/[?&]rid=(\d+)/)
      return {
        rid: ridMatch ? ridMatch[1] : null,
        studio_cell: cells.first().text().trim().slice(0, 60),
        available_cells: cells.slice(1).map((_, c) => $(c).text().trim()).get().filter(Boolean),
      }
    }).get()
  }

  // 全テーブル一覧
  result.all_tables = $("table").map((i, t) => ({
    index: i,
    id: $(t).attr("id") ?? "",
    class: $(t).attr("class") ?? "",
    has_midnightpack: $(t).text().includes("深夜パック"),
    row_count: $(t).find("tr").length,
  })).get()

  return NextResponse.json(result)
}
