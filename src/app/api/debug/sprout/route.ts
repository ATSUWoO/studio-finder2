import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const BASE_URL = "https://www.sprout-rental.com/reserve/"

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid") ?? "1"
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0]
  const vd = date.replace(/-/g, "")

  const url = `${BASE_URL}?sid=${sid}&vd=${vd}`
  const result: Record<string, unknown> = { sid, date, url }

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": USER_AGENT },
    })
    result.http_status = res.status
    const html = await res.text()
    result.html_bytes = html.length
    result.html_preview = html.slice(0, 3000)

    const $ = cheerio.load(html)

    // 全テーブルを検出
    const tables = $("table")
    result.tables_found = tables.length
    result.table_ids = tables.map((_, t) => $(t).attr("id") ?? "(no id)").get()
    result.table_classes = tables.map((_, t) => $(t).attr("class") ?? "(no class)").get()

    // 最初のテーブルの構造サンプル
    const firstTable = tables.first()
    if (firstTable.length) {
      const rows = firstTable.find("tr")
      result.first_table_row_count = rows.length
      result.header_cells = rows.first().find("th, td").map((_, c) => ({
        text: $(c).text().trim().slice(0, 60),
        class: $(c).attr("class") ?? "",
      })).get()

      // 最初のデータ行のセル詳細
      result.first_data_row_cells = rows.eq(1).find("th, td").map((_, c) => ({
        text: $(c).text().trim().slice(0, 60),
        class: $(c).attr("class") ?? "",
        colspan: $(c).attr("colspan") ?? "",
      })).get()
    }

    // フォームや input を探す（別のUI構造の可能性）
    result.forms_found = $("form").length
    result.select_elements = $("select").map((_, s) => $(s).attr("name") ?? "").get()

    // 予約系のクラスを持つ要素を探す
    const reservationClasses = [".reserve", ".timetable", ".time-table", ".schedule", ".calendar"]
    const classResults: Record<string, number> = {}
    for (const cls of reservationClasses) {
      classResults[cls] = $(cls).length
    }
    result.reservation_class_hits = classResults

  } catch (e) {
    result.error = String(e)
  }

  return NextResponse.json(result, { status: 200 })
}
