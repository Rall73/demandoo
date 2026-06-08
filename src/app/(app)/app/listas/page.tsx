"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ListChecks, ShoppingCart, Bell, CalendarClock, Plus, Trash2, ChevronRight,
} from "lucide-react"

type ListaTipo = "COMPRAS" | "VENCIMENTOS" | "LEMBRETES" | "GERAL"

interface Lista {
  id: number
  titulo: string
  descricao: string | null
  tipo: ListaTipo
  cor: string | null
  createdAt: string
  _count: { itens: number }
  itens: { id: number }[]
}

const TIPO_CONFIG: Record<ListaTipo, { label: string; icon: React.ElementType; cor: string; borda: string }> = {
  COMPRAS:     { label: "Compras",     icon: ShoppingCart,  cor: "bg-emerald-50",  borda: "border-emerald-400" },
  VENCIMENTOS: { label: "Vencimentos", icon: CalendarClock, cor: "bg-amber-50",    borda: "border-amber-400"   },
  LEMBRETES:   { label: "Lembretes",   icon: Bell,          cor: "bg-sky-50",      borda: "border-sky-400"     },
  GERAL:       { label: "Geral",       icon: ListChecks,    cor: "bg-violet-50",   borda: "border-violet-400"  },
}

const TIPOS: ListaTipo[] = ["COMPRAS", "VENCIMENTOS", "LEMBRETES", "GERAL"]

export default function ListasPage() {
  const [listas, setListas]     = useState<Lista[]>([])
  const [loading, setLoading]   = useState(true)
  const [criando, setCriando]   = useState(false)
  const [titulo, setTitulo]     = useState("")
  const [tipo, setTipo]         = useState<ListaTipo>("GERAL")
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    setLoading(true)
    try {
      const res = await fetch("/api/listas")
      const data = await res.json()
      setListas(data.listas ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  async function criarLista() {
    const t = titulo.trim()
    if (!t) return
    setSalvando(true)
    try {
      await fetch("/api/listas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ titulo: t, tipo }),
      })
      setTitulo("")
      setTipo("GERAL")
      setCriando(false)
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function deletarLista(id: number, e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm("Excluir esta lista e todos os seus itens?")) return
    await fetch(`/api/listas/${id}`, { method: "DELETE" })
    setListas((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <ListChecks size={22} className="text-violet-600" strokeWidth={2} />
          <h1 className="text-xl font-bold text-gray-900">Listas</h1>
        </div>
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus size={16} strokeWidth={2} />
          Nova lista
        </button>
      </div>

      {/* Formulário de nova lista */}
      {criando && (
        <div className="mb-6 p-4 border border-violet-200 rounded-xl bg-violet-50 space-y-3">
          <p className="text-sm font-semibold text-violet-800">Nova lista</p>

          <input
            autoFocus
            type="text"
            placeholder="Nome da lista"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criarLista()}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIPOS.map((t) => {
              const cfg = TIPO_CONFIG[t]
              const Icon = cfg.icon
              return (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-colors ${
                    tipo === t
                      ? "border-violet-600 bg-violet-100 text-violet-800"
                      : "border-gray-200 bg-white text-gray-600 hover:border-violet-300"
                  }`}
                >
                  <Icon size={13} strokeWidth={2} />
                  {cfg.label}
                </button>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={criarLista}
              disabled={salvando || !titulo.trim()}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {salvando ? "Criando…" : "Criar"}
            </button>
            <button
              onClick={() => { setCriando(false); setTitulo(""); setTipo("GERAL") }}
              className="px-4 py-2 bg-white text-gray-600 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Estado de carregamento */}
      {loading && (
        <div className="text-center py-16 text-gray-400 text-sm">Carregando listas…</div>
      )}

      {/* Empty state */}
      {!loading && listas.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <ListChecks size={40} className="mx-auto text-gray-300" strokeWidth={1.5} />
          <p className="text-gray-500 font-medium">Nenhuma lista ainda</p>
          <p className="text-gray-400 text-sm">Crie sua primeira lista para começar</p>
          <button
            onClick={() => setCriando(true)}
            className="mt-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
          >
            + Nova lista
          </button>
        </div>
      )}

      {/* Grid de listas */}
      {!loading && listas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {listas.map((lista) => {
            const cfg  = TIPO_CONFIG[lista.tipo]
            const Icon = cfg.icon
            const pendentes = lista.itens.length
            const total     = lista._count.itens

            return (
              <Link
                key={lista.id}
                href={`/app/listas/${lista.id}`}
                className={`group relative flex items-center gap-3 p-4 rounded-xl border-l-4 border border-gray-200 bg-white hover:shadow-md transition-shadow ${cfg.borda}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cfg.cor}`}>
                  <Icon size={20} className="text-gray-600" strokeWidth={1.8} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{lista.titulo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {cfg.label} · {pendentes} pendente{pendentes !== 1 ? "s" : ""} de {total}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => deletarLista(lista.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Excluir lista"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                  <ChevronRight size={16} className="text-gray-400" strokeWidth={2} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
