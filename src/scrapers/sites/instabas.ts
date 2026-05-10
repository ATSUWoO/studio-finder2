import { BaseScraper, RawVenue } from "../base"

export class InstabasScraper extends BaseScraper {
  readonly siteName = "インスタベース"
  readonly siteUrl = "https://www.instabase.jp"

  async fetchVenues(): Promise<RawVenue[]> {
    // TODO: Cheerio で実装
    throw new Error("インスタベースのスクレイパーはまだ実装されていません")
  }
}
