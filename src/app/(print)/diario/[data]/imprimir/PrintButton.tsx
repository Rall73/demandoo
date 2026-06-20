"use client"

import { Printer, FileDown } from "lucide-react"

export default function ExportButtons({ dataISO }: { dataISO: string }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => window.print()}
        title="Imprimir"
        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
      >
        <Printer size={14} strokeWidth={2} />
        Imprimir
      </button>

      <a
        href={`/api/diario/${dataISO}/exportar-doc`}
        download
        title="Exportar Word (.doc)"
        className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
      >
        <FileDown size={14} strokeWidth={2} />
        Word
      </a>
    </div>
  )
}
