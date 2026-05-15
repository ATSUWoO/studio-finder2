import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { Agent, fetch as undiciFetch } from "undici"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const RESERVE_URL = "https://www.sprout-rental.com/reserve/"

// 引継ぎ書の実データに基づくモック HTML（パースロジック検証用）
const MOCK_HTML = `
<html><body>
<table>
  <tr>
    <th>スタジオ</th><th>6-7</th><th>7-8</th><th>16-17</th><th>23-24</th><th>深夜パック 24-30</th>
  </tr>
  <tr>
    <td><a href="?sid=1&amp;rid=1">Aスタジオ</a></td>
    <td></td>
    <td>7-8 800 円</td>
    <td>16-17 1,100 円</td>
    <td>23-0 800 円</td>
    <td>深夜 パック 5,000 円</td>
  </tr>
  <tr>
    <td><a href="?sid=1&amp;rid=2">Bスタジオ</a></td>
    <td></td>
    <td></td>
    <td>16-17 1,100 円</td>
    <td></td>
    <td></td>
  </tr>
</table>
</body></html>
`

const SLOT_RE = /(\d{1,2})-(\d{1,2})\s+([\d,]+)\s*円/
const PACK_RE = /深夜\s*パック\s+([\d,]+)\s*円/
const RID_RE = /[?&]rid=(\d+)/

const sproutAgent = new Agent({
  connect: {
    ciphers: [
      "TLS_AES_128_GCM_SHA256", "TLS_AES_256_GCM_SHA384", "TLS_CHACHA20_POLY1305_SHA256",
      "ECDHE-ECDSA-AES128-GCM-SHA256", "ECDHE-RSA-AES128-GCM-SHA256",
      "ECDHE-ECDSA-AES256-GCM-SHA384", "ECDHE-RSA-AES256-GCM-SHA384",
      "ECDHE-ECDSA-CHACHA20-POLY1305", "ECDHE-RSA-CHACHA20-POLY1305",
    ].join(":"),
    minVersion: "TLSv1.2" as const,
  },
  allowH2: true,
})

export async function GET(req: NextRequest) {
  const sid = req.nextUrl.searchParams.get("sid") ?? "1"
  const rid = req.nextUrl.searchParams.get("rid")
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0]
  const mock = req.nextUrl.searchParams.get("mock") === "1"
  const vd = date.replace(/-/g, "")
  const result: Record<string, unknown> = { sid, date, vd }

  // ?mock=1: パースロジックのみ検証（Cloudflare bypass 不要）
  if (mock) {
    result.mode = "mock"
    const $ = cheerio.load(MOCK_HTML)
    const table = $("table").filter((_, el) => $(el).text().includes("深夜パック")).first()
    result.table_found = table.length > 0
    const rows = table.find("tr")
    result.row_count = rows.length
    const parsed: unknown[] = []
    rows.slice(1).each((_, row) => {
      const cells = $(row).find("td")
      const ridM = cells.first().find("a[href]").attr("href")?.match(RID_RE)
      const rid = ridM ? parseInt(ridM[1], 10) : null
      const slots: unknown[] = []
      cells.slice(1).each((_, cell) => {
        const text = $(cell).text().trim().replace(/\s+/g, " ")
        if (!text) return
        const m = SLOT_RE.exec(text)
        if (m) { slots.push({ start: `${m[1]}:00`, end: m[2] === "0" ? "00:00" : `${m[2]}:00`, price: parseInt(m[3].replace(",",""),10) }); return }
        const p = PACK_RE.exec(text)
        if (p) slots.push({ start: "00:00", end: "06:00", price: parseInt(p[1].replace(",",""),10), isAllnight: true })
      })
      parsed.push({ rid, studio: cells.first().text().trim(), slots })
    })
    result.parsed_rows = parsed
    return NextResponse.json(result)
  }

  // AJAX 詳細エンドポイント直接テスト
  if (rid) {
    const url = `https://www.sprout-rental.com/tpl/ajx_studio_detail.php?sid=${sid}&rid=${rid}`
    result.url = url
    const res = await undiciFetch(url, { dispatcher: sproutAgent, headers: { "User-Agent": USER_AGENT, "Referer": RESERVE_URL } })
    const html = await res.text()
    result.status = res.status
    result.html_bytes = html.length
    result.html_preview = html.slice(0, 2000)
    return NextResponse.json(result)
  }

  // 通常テスト
  const url = `${RESERVE_URL}?sid=${sid}&vd=${vd}`
  result.url = url
  const res = await undiciFetch(url, {
    dispatcher: sproutAgent,
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "ja-JP,ja;q=0.9,en-US;q=0.8",
      "Referer": RESERVE_URL,
      "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document", "sec-fetch-mode": "navigate", "sec-fetch-site": "same-origin",
    },
  })
  const html = await res.text()
  result.status = res.status
  result.html_bytes = html.length
  result.html_preview = html.slice(0, 1500)

  if (!res.ok) {
    result.error = `HTTP ${res.status}: ${html.slice(0, 100)}`
    return NextResponse.json(result)
  }

  const $ = cheerio.load(html)
  const table = $("table").filter((_, el) => $(el).text().includes("深夜パック")).first()
  result.reservation_table_found = table.length > 0
  if (table.length) {
    const rows = table.find("tr")
    result.row_count = rows.length
    result.header_cells = rows.first().find("th, td").map((_, c) => $(c).text().trim()).get()
    result.sample_rows = rows.slice(1, 4).map((_, row) => {
      const cells = $(row).find("td")
      const ridM = cells.first().find("a[href]").attr("href")?.match(RID_RE)
      return {
        rid: ridM ? ridM[1] : null,
        studio_cell: cells.first().text().trim().slice(0, 60),
        available_cells: cells.slice(1).map((_, c) => $(c).text().trim()).get().filter(Boolean),
      }
    }).get()
  }
  return NextResponse.json(result)
}
