#!/usr/bin/env node
import { writeFileSync, existsSync } from "fs"
import { join } from "path"

const [id, label] = process.argv.slice(2)

if (!id || !label) {
  console.error("使い方: npm run new-provider <id> \"<表示名>\"")
  console.error("例:     npm run new-provider mycompany \"My Company\"")
  process.exit(1)
}

if (!/^[a-z][a-z0-9]*$/.test(id)) {
  console.error("エラー: id は小文字英字で始まる英数字のみ使用可能です (例: mycompany, dancestudio2)")
  process.exit(1)
}

const className = id.charAt(0).toUpperCase() + id.slice(1) + "Provider"
const outPath = join(process.cwd(), "src/lib/providers", `${id}.ts`)

if (existsSync(outPath)) {
  console.error(`エラー: ${outPath} は既に存在します`)
  process.exit(1)
}

const template = `import { AvailabilityProvider, ProviderVenue } from "./types"
import { fetchJson } from "./_utils"
import { getProviderVenues } from "@/lib/venueMaster"

// TODO: 実際のAPIエンドポイントに変更してください
const BASE_URL = "https://example.com/api"

const VENUES = getProviderVenues("${id}")

export class ${className} implements AvailabilityProvider {
  readonly providerId = "${id}"

  async fetchAvailability(date: string): Promise<ProviderVenue[]> {
    // TODO: APIからデータを取得して ProviderVenue[] 形式で返してください
    // 実装ガイドは docs/ADD_PROVIDER.md を参照
    //
    // よくある落とし穴:
    //   - 外部APIのフィールドは必ず optional chaining で防御する (room.studio?.id ?? -1)
    //   - 複数roomの並列取得は Promise.allSettled を使う（1件失敗でも他を返せるように）
    //   - 大阪府内チェックは isOsakaBounds() を使う (_utils から import)
    void fetchJson  // 使う場合は: await fetchJson<YourType>(url)
    void date
    void VENUES
    return []
  }
}
`

writeFileSync(outPath, template, "utf8")

console.log("")
console.log(`✅  src/lib/providers/${id}.ts を生成しました`)
console.log("")
console.log("残り手順（2ステップ）:")
console.log("")
console.log(`  1. src/lib/providers/index.ts に追加:`)
console.log(`       import { ${className} } from "./${id}"`)
console.log(`       // PROVIDERS 配列に: new ${className}()`)
console.log("")
console.log(`  2. src/lib/providers/registry.ts の PROVIDER_LABELS に追加:`)
console.log(`       ${id}: "${label}",`)
console.log("")
console.log("実装ガイド: docs/ADD_PROVIDER.md")
console.log("")
