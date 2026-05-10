/**
 * 全スタジオの静的マスターデータ
 *
 * 【管理ルール】
 * - 住所・座標・部屋構成など「変わらない情報」はここだけに書く
 * - 空き枠は各プロバイダーが毎回APIから取得するため書かない
 * - スタジオを追加するときはこのファイルだけ編集すればよい
 *
 * 【Studio1000 の補足】
 * 部屋IDはAPIから動的取得するため rooms は undefined。
 * nameKeywords でAPIのstudio.nameと照合する。
 * studioId が判明したら設定すると完全一致で速くなる。
 */

export interface RoomMaster {
  /** Studio AX: WordPress APIの studio_id */
  apiId?: number
  name: string
  capacity: number | null
}

export interface VenueMaster {
  providerId: string
  venueId: string
  venueName: string
  address: string | null
  lat: number | null
  lng: number | null
  sourceUrl: string | null
  /** Studio1000のみ: APIのstudio.nameとの照合キーワード */
  nameKeywords?: string[]
  /** Studio1000のみ: APIのstudio.id（判明した場合に設定） */
  studioId?: number
  /** Studio AX・Alleyoop: 部屋一覧（静的定義） / Studio1000: undefined（API動的取得） */
  rooms?: RoomMaster[]
}

export const VENUE_MASTER: VenueMaster[] = [
  // ────────────────────────────────────────────
  // Studio AX
  // ────────────────────────────────────────────
  {
    providerId: "studioax",
    venueId: "studioax",
    venueName: "Studio AX",
    address: "大阪市中央区西心斎橋1-9-16 大京心斎橋第2ビル4F",
    lat: 34.6726,
    lng: 135.4982,
    sourceUrl: "https://yoyaku.rental-ax.com/",
    rooms: [
      { apiId: 9943, name: "Studio 1",  capacity: 20 },
      { apiId: 9945, name: "Studio 2",  capacity: 15 },
      { apiId: 9946, name: "Studio 3",  capacity: 10 },
      { apiId: 9940, name: "Studio A",  capacity: 25 },
      { apiId: 9941, name: "Studio B",  capacity: 30 },
      { apiId: 9942, name: "Studio AB", capacity: 60 },
      { apiId: 9947, name: "Studio C",  capacity:  5 },
      { apiId: 9948, name: "Studio X",  capacity:  8 },
    ],
  },

  // ────────────────────────────────────────────
  // Alleyoop
  // ────────────────────────────────────────────
  {
    providerId: "alleyoop",
    venueId: "alleyoop",
    venueName: "Studio Alleyoop",
    address: "大阪市中央区東心斎橋1-12-20 心斎橋ダイワビル5F",
    lat: 34.6739,
    lng: 135.5009,
    sourceUrl: "https://st-alleyoop.com/rental/reserve/",
    // 定員はHTMLに含まれないため静的管理。判明次第数値を入れる。
    rooms: [
      { name: "STUDIO 1", capacity: null },
      { name: "STUDIO 2", capacity: null },
      { name: "STUDIO 3", capacity: null },
      { name: "STUDIO A", capacity: null },
      { name: "STUDIO B", capacity: null },
      { name: "STUDIO C", capacity: null },
    ],
  },

  // ────────────────────────────────────────────
  // Studio1000（rooms は API から動的取得）
  // ────────────────────────────────────────────
  {
    providerId: "studio1000",
    venueId: "studio1000-umeda",
    venueName: "Studio1000 梅田",
    nameKeywords: ["梅田", "Umeda"],
    address: "大阪府大阪市北区兎我野町5-6",
    lat: 34.7008,
    lng: 135.5044,
    sourceUrl: null,
  },
  {
    providerId: "studio1000",
    venueId: "studio1000-resort",
    venueName: "Studio1000 RESORT",
    nameKeywords: ["RESORT", "Resort", "リゾート"],
    address: "大阪府大阪市北区兎我野町1-6-20",
    lat: 34.6994,
    lng: 135.5040,
    sourceUrl: null,
  },
  {
    providerId: "studio1000",
    venueId: "studio1000-america",
    venueName: "Studio1000 AMERICA",
    nameKeywords: ["AMERICA", "America", "アメリカ"],
    address: "大阪府大阪市北区兎我野町2-9",
    lat: 34.7001,
    lng: 135.5042,
    sourceUrl: null,
  },
  {
    providerId: "studio1000",
    venueId: "studio1000-kyobashi",
    venueName: "Studio1000 KYOBASHI",
    nameKeywords: ["KYOBASHI", "Kyobashi", "京橋", "Europe"],
    address: "大阪市城東区",
    lat: 34.6971173,
    lng: 135.5342135,
    sourceUrl: null,
  },
  {
    providerId: "studio1000",
    venueId: "studio1000-nanba",
    venueName: "Studio1000 NANBA",
    nameKeywords: ["NANBA", "Namba", "難波", "Amemura", "アメ村"],
    address: "大阪市西区",
    lat: 34.6862099,
    lng: 135.4811102,
    sourceUrl: null,
  },
]

// ────────────────────────────────────────────
// ヘルパー関数
// ────────────────────────────────────────────

export function getProviderVenues(providerId: string): VenueMaster[] {
  return VENUE_MASTER.filter((v) => v.providerId === providerId)
}

/** Studio1000: studioId完全一致 → nameKeywords部分一致 の順で照合 */
export function findStudio1000Venue(studioId: number, studioName: string): VenueMaster | undefined {
  const byId = VENUE_MASTER.find(
    (v) => v.providerId === "studio1000" && v.studioId === studioId
  )
  if (byId) return byId

  const nameLower = studioName.toLowerCase()
  return VENUE_MASTER.find(
    (v) =>
      v.providerId === "studio1000" &&
      v.nameKeywords?.some((kw) => nameLower.includes(kw.toLowerCase()))
  )
}
