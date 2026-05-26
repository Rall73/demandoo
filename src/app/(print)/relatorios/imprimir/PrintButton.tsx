"use client"

import { Printer } from "lucide-react"

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
    >
      <Printer size={15} strokeWidth={2} />
      Imprimir / Salvar PDF
    </button>
  )
}
