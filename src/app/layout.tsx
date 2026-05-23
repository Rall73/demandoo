import type { Metadata } from "next"
import { Geist } from "next/font/google"
import Providers from "@/components/Providers"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })

export const metadata: Metadata = {
  title:       "demandoo — Capture qualquer demanda em segundos",
  description: "Fale, escreva, organize — a IA estrutura tudo automaticamente. Demandas, tarefas e ideias em um só lugar.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://demandoo.net"),
  manifest:    "/manifest.json",
  appleWebApp: {
    capable:           true,
    statusBarStyle:    "default",
    title:             "demandoo",
  },
  openGraph: {
    title:       "demandoo",
    description: "Capture qualquer demanda em segundos. A IA faz o resto.",
    siteName:    "demandoo",
    locale:      "pt_BR",
    type:        "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
