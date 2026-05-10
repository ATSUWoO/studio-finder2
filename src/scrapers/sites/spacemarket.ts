import { BaseScraper, RawVenue } from "../base"

/**
 * スペースマーケット用スクレイパー
 * 実装時は Playwright でブラウザを制御し、大阪市のダンス系スタジオを取得する
 */
export class SpacemarketScraper extends BaseScraper {
  readonly siteName = "スペースマーケット"
  readonly siteUrl = "https://www.spacemarket.com"

  async fetchVenues(): Promise<RawVenue[]> {
    // TODO: Playwright で実装
    // const browser = await chromium.launch()
    // const page = await browser.newPage()
    // await page.goto(`${this.siteUrl}/spaces?keyword=ダンス&location=大阪市`)
    // ...
    throw new Error("スペースマーケットのスクレイパーはまだ実装されていません")
  }
}
