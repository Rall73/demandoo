"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, CheckCircle2, RotateCcw, Loader2 } from "lucide-react"

interface Props {
  demandaId: number
  status:    string
  tipo:      string
}

export default function DetalheActions({ demandaId, status, tipo }: Props) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function patch(data: Record<string, string>) {
    setLoading(true)
    await fetch(`/api/demandas/${demandaId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    })
    router.refresh()
    setLoading(false)
  }

  async function deletar() {
    if (!confirm("Excluir este registro? A ação não pode ser desfeita.")) return
    setLoading(true)
    await fetch(`/api/demandas/${demandaId}`, { method: "DELETE" })
    router.push("/app")
  }

  const concluida = status === "CONCLUIDA"

  return (
    <div className="flex gap-2 mt-2">
      {tipo === "TAREFA" ? (
        <button
          onClick={() => patch({ status: concluida ? "ABERTA" : "CONCLUIDA" })}
          disabled={loading}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            concluida
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} strokeWidth={2} />}
          {concluida ? "Reabrir" : "Marcar como feita"}
        </button>
      ) : (
        <>
          {!concluida && (
            <button
              onClick={() => patch({ status: "CONCLUIDA" })}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} strokeWidth={2} />}
              Concluir
            </button>
          )}
          {concluida && (
            <button
              onClick={() => patch({ status: "ABERTA" })}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <RotateCcw size={15} strokeWidth={2} />
              Reabrir
            </button>
          )}
        </>
      )}

      <button
        onClick={deletar}
        disabled={loading}
        className="p-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
        title="Excluir"
      >
        <Trash2 size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
