"use client"

import { Printer, FileText, FileDown } from "lucide-react"

export default function ExportButtons({ dataISO, nomeUsuario }: { dataISO: string; nomeUsuario: string }) {
  const handlePrint = () => window.print()

  const handlePDF = () => {
    const prev = document.title
    document.title = `${dataISO} - Diário ${nomeUsuario}`
    window.print()
    setTimeout(() => { document.title = prev }, 1000)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePrint}
        title="Imprimir"
        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
      >
        <Printer size={14} strokeWidth={2} />
        Imprimir
      </button>

      <button
        onClick={handlePDF}
        title="Salvar como PDF (abre o diálogo de impressão → escolha 'Salvar como PDF')"
        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
      >
        <FileText size={14} strokeWidth={2} />
        PDF
      </button>

      <a
        href={`/api/diario/${dataISO}/exportar-doc`}
        download
        title="Exportar como Word (.doc)"
        className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
      >
        <FileDown size={14} strokeWidth={2} />
        Word
      </a>
    </div>
  )
}
