import { BaseScraper, RawVenue } from "../base"

export class SpacemarketScraper extends BaseScraper {
  readonly siteName = "スペースマーケット"
  readonly siteUrl = "https://www.spacemarket.com"

  async fetchVenues(): Promise<RawVenue[]> {
    // TODO: Playwright で実装
    throw new Error("スペースマーケットのスクレイパーはまだ実装されていません")
  }
}
