export interface S1StudioMaster {
  studioId?: number
  nameKeywords: string[]
  address: string
  lat: number | null
  lng: number | null
}

export const STUDIO1000_STUDIO_MASTER: S1StudioMaster[] = [
  {
    nameKeywords: ["梅田", "Umeda"],
    address: "大阪府大阪市北区兔我野町5-6",
    lat: 34.7008,
    lng: 135.5044,
  },
  {
    nameKeywords: ["RESORT", "Resort", "リゾート"],
    address: "大阪府大阪市北区兔我野町1-6-20",
    lat: 34.6994,
    lng: 135.5040,
  },
  {
    nameKeywords: ["AMERICA", "America", "アメリカ"],
    address: "大阪府大阪市北区兔我野町2-9",
    lat: 34.7001,
    lng: 135.5042,
  },
  {
    nameKeywords: ["KYOBASHI", "Kyobashi", "京橋", "Europe"],
    address: "大阪市城東区",
    lat: 34.6971173,
    lng: 135.5342135,
  },
  {
    nameKeywords: ["NANBA", "Namba", "難波", "Amemura", "アメ村"],
    address: "大阪市西区",
    lat: 34.6862099,
    lng: 135.4811102,
  },
]

export function findStudioMaster(studioId: number, studioName: string): S1StudioMaster | null {
  const byId = STUDIO1000_STUDIO_MASTER.find((m) => m.studioId === studioId)
  if (byId) return byId

  const nameLower = studioName.toLowerCase()
  return (
    STUDIO1000_STUDIO_MASTER.find((m) =>
      m.nameKeywords.some((kw) => nameLower.includes(kw.toLowerCase()))
    ) ?? null
  )
}
