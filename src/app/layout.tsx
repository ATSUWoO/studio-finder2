import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ダンススタジオ検索 | 大阪市",
  description: "大阪市内のダンス・レンタルスタジオを料金・定員・時間帯で検索",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
