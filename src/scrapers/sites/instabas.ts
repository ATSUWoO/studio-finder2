import { BaseScraper, RawVenue } from "../base"

/**
 * インスタベース用スクレイパー
 * 実装時は Cheerio で静的HTMLをパースし、大阪市のダンス系スタジオを取得する
 */
export class InstabasScraper extends BaseScraper {
  readonly siteName = "インスタベース"
  readonly siteUrl = "https://www.instabase.jp"

  async fetchVenues(): Promise<RawVenue[]> {
    // TODO: Cheerio で実装
    // const res = await fetch(`${this.siteUrl}/search?keyword=ダンススタジオ&area=大阪市`)
    // const $ = cheerio.load(await res.text())
    // ...
    throw new Error("インスタベースのスクレイパーはまだ実装されていません")
  }
}
