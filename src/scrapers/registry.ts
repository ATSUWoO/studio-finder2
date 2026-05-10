import { BaseScraper } from "./base"
import { SpacemarketScraper } from "./sites/spacemarket"
import { InstabasScraper } from "./sites/instabas"

export function getScrapers(): BaseScraper[] {
  return [
    new SpacemarketScraper(),
    new InstabasScraper(),
    // 新しいサイトを追加する場合はここにインスタンスを追加するだけ
  ]
}
