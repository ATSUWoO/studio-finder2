import { getScrapers } from "./registry"
import { NormalizedVenue } from "./base"

interface RunResult {
  siteName: string
  count: number
  success: boolean
  error?: string
}

export async function runAll(): Promise<{ venues: NormalizedVenue[]; results: RunResult[] }> {
  const scrapers = getScrapers()
  const allVenues: NormalizedVenue[] = []
  const results: RunResult[] = []

  // 各スクレイパーを順次実行（失敗しても他に影響しない）
  for (const scraper of scrapers) {
    try {
      const venues = await scraper.run()
      allVenues.push(...venues)
      results.push({ siteName: scraper.siteName, count: venues.length, success: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      results.push({ siteName: scraper.siteName, count: 0, success: false, error: message })
    }
  }

  return { venues: allVenues, results }
}

// CLIから直接実行する場合のエントリーポイント
if (require.main === module) {
  runAll().then(({ venues, results }) => {
    console.log("\n=== スクレイピング結果 ===")
    for (const r of results) {
      const status = r.success ? "✓" : "✗"
      console.log(`${status} ${r.siteName}: ${r.count}件 ${r.error ? `(${r.error})` : ""}`)
    }
    console.log(`\n合計: ${venues.length}件の店舗`)
  })
}
