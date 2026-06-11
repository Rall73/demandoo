"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  PlayCircle, CheckCircle2, RotateCcw, XCircle, PauseCircle,
  Trash2, Loader2, AlertTriangle,
} from "lucide-react"

type Status = "ABERTA" | "EM_ANDAMENTO" | "EM_ESPERA" | "CONCLUIDA" | "CANCELADA"

interface Props {
  demandaId: number
  status:    Status
  tipo:      string
}

// Transições contextuais por status
const TRANSICOES: Record<Status, { label: string; novoStatus: Status; icon: React.ElementType; cls: string }[]> = {
  ABERTA: [
    { label: "Iniciar",   novoStatus: "EM_ANDAMENTO", icon: PlayCircle,   cls: "bg-violet-600 text-white hover:bg-violet-700" },
    { label: "Cancelar",  novoStatus: "CANCELADA",    icon: XCircle,      cls: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" },
  ],
  EM_ANDAMENTO: [
    { label: "Concluir",  novoStatus: "CONCLUIDA",    icon: CheckCircle2, cls: "bg-emerald-600 text-white hover:bg-emerald-700" },
    { label: "Em espera", novoStatus: "EM_ESPERA",    icon: PauseCircle,  cls: "bg-white text-amber-600 border border-amber-200 hover:bg-amber-50" },
    { label: "Cancelar",  novoStatus: "CANCELADA",    icon: XCircle,      cls: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" },
  ],
  EM_ESPERA: [
    { label: "Retomar",   novoStatus: "EM_ANDAMENTO", icon: PlayCircle,   cls: "bg-violet-600 text-white hover:bg-violet-700" },
    { label: "Cancelar",  novoStatus: "CANCELADA",    icon: XCircle,      cls: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" },
  ],
  CONCLUIDA: [
    { label: "Reabrir",   novoStatus: "ABERTA",       icon: RotateCcw,    cls: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" },
  ],
  CANCELADA: [
    { label: "Reabrir",   novoStatus: "ABERTA",       icon: RotateCcw,    cls: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" },
  ],
}

// Para TAREFA: apenas toggle simples
const TRANSICOES_TAREFA: Record<string, { label: string; novoStatus: Status; icon: React.ElementType; cls: string }[]> = {
  ABERTA:       [{ label: "Marcar como feita", novoStatus: "CONCLUIDA", icon: CheckCircle2, cls: "bg-emerald-600 text-white hover:bg-emerald-700" }],
  EM_ANDAMENTO: [{ label: "Marcar como feita", novoStatus: "CONCLUIDA", icon: CheckCircle2, cls: "bg-emerald-600 text-white hover:bg-emerald-700" }],
  EM_ESPERA:    [{ label: "Retomar",           novoStatus: "EM_ANDAMENTO", icon: PlayCircle, cls: "bg-violet-600 text-white hover:bg-violet-700" }],
  CONCLUIDA:    [{ label: "Reabrir",           novoStatus: "ABERTA",    icon: RotateCcw,    cls: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" }],
  CANCELADA:    [{ label: "Reabrir",           novoStatus: "ABERTA",    icon: RotateCcw,    cls: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50" }],
}

export default function DetalheActions({ demandaId, status, tipo }: Props) {
  const router = useRouter()

  const [loading,          setLoading]          = useState(false)
  const [confirmandoDelete, setConfirmandoDelete] = useState(false)

  async function patch(novoStatus: Status) {
    setLoading(true)
    await fetch(`/api/demandas/${demandaId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: novoStatus }),
    })
    router.refresh()
    setLoading(false)
  }

  async function deletar() {
    setLoading(true)
    await fetch(`/api/demandas/${demandaId}`, { method: "DELETE" })
    router.push("/app")
  }

  const botoes = tipo === "TAREFA"
    ? TRANSICOES_TAREFA[status] ?? []
    : TRANSICOES[status] ?? []

  return (
    <div className="mt-2 space-y-3">

      {/* ── Botões de transição de status ─────────────────────────────────── */}
      <div className="flex gap-2">
        {botoes.map(({ label, novoStatus, icon: Icon, cls }) => (
          <button
            key={novoStatus}
            onClick={() => patch(novoStatus)}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${cls}`}
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <Icon size={15} strokeWidth={2} />
            }
            {label}
          </button>
        ))}
      </div>

      {/* ── Exclusão com confirmação inline ──────────────────────────────── */}
      {!confirmandoDelete ? (
        <button
          onClick={() => setConfirmandoDelete(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={13} strokeWidth={2} />
          Excluir este registro
        </button>
      ) : (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle size={15} className="shrink-0 text-red-500" strokeWidth={2} />
          <span className="text-sm text-red-700 flex-1">Tem certeza? Esta ação não pode ser desfeita.</span>
          <button
            onClick={deletar}
            disabled={loading}
            className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Excluir"}
          </button>
          <button
            onClick={() => setConfirmandoDelete(false)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
