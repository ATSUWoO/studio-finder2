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
 * studioId を設定するとIDで完全一致するため確実（推奨）。
 * nameKeywords はフォールバック用（studioId未設定時）。
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
  /** Studio1000のみ: APIのstudio.nameとの照合キーワード（フォールバック） */
  nameKeywords?: string[]
  /** Studio1000のみ: APIのstudio.id */
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
  // studioId: デバッグエンドポイントで確認済み
  // ────────────────────────────────────────────
  {
    providerId: "studio1000",
    studioId: 2,
    venueId: "studio1000-umeda",
    venueName: "Studio1000 梅田",
    nameKeywords: ["STUDIO1000", "梅田", "Umeda"],
    address: "大阪府大阪市北区兎我野町5-6",
    lat: 34.7008,
    lng: 135.5044,
    sourceUrl: "https://m.studio1000.jp/studio/2",
  },
  {
    providerId: "studio1000",
    studioId: 28,
    venueId: "studio1000-london-napoli",
    venueName: "Studio1000 LONDON & NAPOLI",
    nameKeywords: ["LONDON", "NAPOLI"],
    address: "大阪府大阪市北区兎我野町5-6",
    lat: 34.7008,
    lng: 135.5044,
    sourceUrl: "https://m.studio1000.jp/studio/28",
  },
  {
    providerId: "studio1000",
    studioId: 30,
    venueId: "studio1000-umeda-hall",
    venueName: "Studio1000 Umeda Hall",
    nameKeywords: ["Umeda Hall"],
    address: "大阪市北区兎我野町5-7 B1",
    lat: 34.7008,
    lng: 135.5044,
    sourceUrl: "https://m.studio1000.jp/studio/30",
  },
  {
    providerId: "studio1000",
    studioId: 14,
    venueId: "studio1000-resort",
    venueName: "Studio1000 RESORT",
    nameKeywords: ["RESORT", "Resort", "リゾート"],
    address: "大阪府大阪市北区曾根崎1丁目6",
    lat: 34.6994,
    lng: 135.5040,
    sourceUrl: "https://m.studio1000.jp/studio/14",
  },
  {
    providerId: "studio1000",
    studioId: 3,
    venueId: "studio1000-america",
    venueName: "Studio1000 AMERICA",
    nameKeywords: ["AMERICA", "America", "アメリカ"],
    address: "大阪府大阪市北区兎我野町2",
    lat: 34.7001,
    lng: 135.5042,
    sourceUrl: "https://m.studio1000.jp/studio/3",
  },
  {
    providerId: "studio1000",
    studioId: 15,
    venueId: "studio1000-nanba",
    venueName: "Studio1000 NANBA",
    nameKeywords: ["AMEMURA", "NANBA", "Namba", "難波", "Amemura", "アメ村"],
    address: "大阪府大阪市中央区西心斎橋2丁目10",
    lat: 34.6712,
    lng: 135.4983,
    sourceUrl: "https://m.studio1000.jp/studio/15",
  },
  {
    providerId: "studio1000",
    studioId: 16,
    venueId: "studio1000-triangle",
    venueName: "Studio1000 TRIANGLE",
    nameKeywords: ["TRIANGLE"],
    address: "大阪府大阪市中央区西心斎橋2丁目10 スパジオビル",
    lat: 34.6713,
    lng: 135.4983,
    sourceUrl: "https://m.studio1000.jp/studio/16",
  },
  {
    providerId: "studio1000",
    studioId: 25,
    venueId: "studio1000-kyobashi",
    venueName: "Studio1000 KYOBASHI",
    nameKeywords: ["EUROPE", "Europe", "KYOBASHI", "Kyobashi", "京橋"],
    address: "大阪市都島区東野田町3丁目1-4",
    lat: 34.6971173,
    lng: 135.5342135,
    sourceUrl: "https://m.studio1000.jp/studio/25",
  },
  {
    providerId: "studio1000",
    studioId: 29,
    venueId: "studio1000-greenland",
    venueName: "Studio1000 GREEN LAND",
    nameKeywords: ["GREEN LAND", "Greenland", "Patagonia", "Stanley"],
    address: "大阪府大阪市北区兎我野町4-9",
    lat: 34.7008,
    lng: 135.5044,
    sourceUrl: "https://m.studio1000.jp/studio/29",
  },
]

// ────────────────────────────────────────────
// ヘルパー関数
// ────────────────────────────────────────────

export function getProviderVenues(providerId: string): VenueMaster[] {
  return VENUE_MASTER.filter((v) => v.providerId === providerId)
}

/** Studio1000: studioId完全一致 → nameKeywords部分一致 の順で照合 */
export function findStudio1000Venue(studioId: number, studioName: string | null | undefined): VenueMaster | undefined {
  const byId = VENUE_MASTER.find(
    (v) => v.providerId === "studio1000" && v.studioId === studioId
  )
  if (byId) return byId

  if (!studioName) return undefined
  const nameLower = studioName.toLowerCase()
  return VENUE_MASTER.find(
    (v) =>
      v.providerId === "studio1000" &&
      v.nameKeywords?.some((kw) => nameLower.includes(kw.toLowerCase()))
  )
}

/** Studio1000: isOsakaのフォールバック用 — studioIdがマスターに登録済みか確認 */
export function isKnownStudio1000Id(studioId: number): boolean {
  return VENUE_MASTER.some(
    (v) => v.providerId === "studio1000" && v.studioId === studioId
  )
}
