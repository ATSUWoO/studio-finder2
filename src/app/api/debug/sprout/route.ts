import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const RESERVE_URL = "https://www.sprout-rental.com/reserve/"
const AJAX_URL = "https://www.sprout-rental.com/tpl/ajx_studio_detail.php"

async function fetchHtml(url: string, referer?: string) {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ja-JP,ja;q=0.9",
  }
  if (referer) headers["Referer"] = referer
  const res = await fetch(url, { cache: "no-store", headers })
  const html = await res.text()
  return { ok: res.ok, status: res.status, html }
}

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid") ?? "1"
  const rid = req.nextUrl.searchParams.get("rid") // AJAX直接テスト用
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0]
  const vd = date.replace(/-/g, "")

  const result: Record<string, unknown> = { sid, date, vd }

  // AJAX エンドポイント直接テスト
  if (rid) {
    const ajaxUrl = `${AJAX_URL}?sid=${sid}&rid=${rid}`
    result.ajax_url = ajaxUrl
    const { ok, status, html } = await fetchHtml(ajaxUrl, `${RESERVE_URL}?sid=${sid}`)
    result.ajax_status = status
    result.ajax_html_bytes = html.length
    result.ajax_html_preview = html.slice(0, 3000)

    const $ = cheerio.load(html)
    const tables = $("table")
    result.ajax_tables_found = tables.length
    if (tables.length > 0) {
      const t = tables.first()
      const rows = t.find("tr")
      result.ajax_row_count = rows.length
      result.ajax_header_cells = rows.first().find("th, td").map((_, c) => ({
        text: $(c).text().trim().slice(0, 50),
        class: $(c).attr("class") ?? "",
      })).get()
      result.ajax_first_data_row = rows.eq(1).find("th, td").map((_, c) => ({
        text: $(c).text().trim().slice(0, 80),
        class: $(c).attr("class") ?? "",
      })).get()
    }
    return NextResponse.json(result)
  }

  // メインページ
  const mainUrl = `${RESERVE_URL}?sid=${sid}&vd=${vd}`
  result.main_url = mainUrl

  try {
    const { ok, status, html } = await fetchHtml(mainUrl)
    result.main_status = status
    result.main_html_bytes = html.length
    result.main_html_preview = html.slice(0, 2000)

    if (!ok) {
      result.error = `HTTP ${status}`
      return NextResponse.json(result)
    }

    const $ = cheerio.load(html)
    const tables = $("table")
    result.tables_found = tables.length
    result.table_ids = tables.map((_, t) => $(t).attr("id") ?? "(no id)").get()
    result.table_classes = tables.map((_, t) => $(t).attr("class") ?? "(no class)").get()

    // 最初のテーブルの詳細
    if (tables.length > 0) {
      const t = tables.first()
      const rows = t.find("tr")
      result.first_table_rows = rows.length
      result.header_cells = rows.first().find("th, td").map((_, c) => ({
        text: $(c).text().trim().slice(0, 60),
        class: $(c).attr("class") ?? "",
      })).get()
      result.sample_data_rows = rows.slice(1, 4).map((_, row) =>
        $(row).find("th, td").map((_, c) => ({
          text: $(c).text().trim().slice(0, 60),
          class: $(c).attr("class") ?? "",
        })).get()
      ).get()
    }

    // AJAXエンドポイント用 rid をリンク・selectから収集
    const rids = new Set<string>()
    $("a[href*='rid=']").each((_, el) => {
      const m = ($(el).attr("href") ?? "").match(/[?&]rid=(\d+)/)
      if (m) rids.add(m[1])
    })
    result.rids_found = [...rids]

    // rid が見つかれば1件だけ AJAX テスト
    if (rids.size > 0) {
      const firstRid = [...rids][0]
      const ajaxUrl = `${AJAX_URL}?sid=${sid}&rid=${firstRid}`
      result.sample_ajax_url = ajaxUrl
      const { ok: aok, status: astatus, html: ahtml } = await fetchHtml(ajaxUrl, mainUrl)
      result.sample_ajax_status = astatus
      result.sample_ajax_bytes = ahtml.length
      result.sample_ajax_preview = ahtml.slice(0, 1500)
    }

  } catch (e) {
    result.error = String(e)
  }

  return NextResponse.json(result)
}
