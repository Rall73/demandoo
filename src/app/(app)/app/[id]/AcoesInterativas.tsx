"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Pencil, Trash2, Check, X } from "lucide-react"

interface Acao {
  id:        number
  descricao: string
  feita:     boolean
}

interface Props {
  demandaId: number
  acoes:     Acao[]
}

export default function AcoesInterativas({ demandaId, acoes: acoesInit }: Props) {
  const router = useRouter()

  // Estado local (otimista)
  const [acoes,       setAcoes]       = useState<Acao[]>(acoesInit)
  const [novaDesc,    setNovaDesc]    = useState("")
  const [addindo,     setAddindo]     = useState(false)
  const [editandoId,  setEditandoId]  = useState<number | null>(null)
  const [tmpDesc,     setTmpDesc]     = useState("")
  const [loadingId,   setLoadingId]   = useState<number | null>(null)
  const [salvandoNova, setSalvandoNova] = useState(false)
  const inputNovaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addindo) inputNovaRef.current?.focus()
  }, [addindo])

  // ── Toggle feita ──────────────────────────────────────────────────────────────
  async function toggleFeita(acao: Acao) {
    const novaFeita = !acao.feita
    // Otimista
    setAcoes((prev) => prev.map((a) => a.id === acao.id ? { ...a, feita: novaFeita } : a))
    setLoadingId(acao.id)
    await fetch(`/api/demandas/${demandaId}/acoes/${acao.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ feita: novaFeita }),
    })
    router.refresh()
    setLoadingId(null)
  }

  // ── Editar descrição ──────────────────────────────────────────────────────────
  function iniciarEdicao(acao: Acao) {
    setEditandoId(acao.id)
    setTmpDesc(acao.descricao)
  }

  async function salvarEdicao(id: number) {
    if (!tmpDesc.trim()) return
    const novo = tmpDesc.trim()
    setAcoes((prev) => prev.map((a) => a.id === id ? { ...a, descricao: novo } : a))
    setEditandoId(null)
    setLoadingId(id)
    await fetch(`/api/demandas/${demandaId}/acoes/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ descricao: novo }),
    })
    router.refresh()
    setLoadingId(null)
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setTmpDesc("")
  }

  // ── Excluir ───────────────────────────────────────────────────────────────────
  async function excluir(id: number) {
    setAcoes((prev) => prev.filter((a) => a.id !== id))
    await fetch(`/api/demandas/${demandaId}/acoes/${id}`, { method: "DELETE" })
    router.refresh()
  }

  // ── Adicionar nova ────────────────────────────────────────────────────────────
  async function adicionarAcao() {
    if (!novaDesc.trim()) return
    const desc = novaDesc.trim()
    setNovaDesc("")
    setAddindo(false)
    setSalvandoNova(true)

    // Otimista: insere com id temporário negativo
    const tmpId = -(Date.now())
    setAcoes((prev) => [...prev, { id: tmpId, descricao: desc, feita: false }])

    const res = await fetch(`/api/demandas/${demandaId}/acoes`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ descricao: desc }),
    })
    const data = await res.json()
    // Substitui id temporário pelo real
    if (data.acao) {
      setAcoes((prev) => prev.map((a) => a.id === tmpId ? { ...a, id: data.acao.id } : a))
    }
    router.refresh()
    setSalvandoNova(false)
  }

  const total     = acoes.length
  const feitas    = acoes.filter((a) => a.feita).length
  const todasFeitas = total > 0 && feitas === total

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Próximas ações</p>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className={`text-xs font-medium ${todasFeitas ? "text-emerald-600" : "text-slate-400"}`}>
              {feitas}/{total}
            </span>
          )}
          {salvandoNova && <Loader2 size={13} className="animate-spin text-slate-400" />}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-1.5">
        {acoes.map((acao) => (
          <div key={acao.id} className="group flex items-start gap-2.5">
            {/* Checkbox */}
            <button
              onClick={() => toggleFeita(acao)}
              disabled={loadingId === acao.id}
              className="shrink-0 mt-0.5 disabled:opacity-40"
            >
              {loadingId === acao.id ? (
                <Loader2 size={16} className="animate-spin text-slate-400" />
              ) : (
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  acao.feita
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-slate-300 hover:border-emerald-400"
                }`}>
                  {acao.feita && <Check size={10} strokeWidth={3} className="text-white" />}
                </div>
              )}
            </button>

            {/* Descrição ou editor inline */}
            {editandoId === acao.id ? (
              <div className="flex-1 flex items-center gap-1.5">
                <input
                  type="text"
                  value={tmpDesc}
                  autoFocus
                  onChange={(e) => setTmpDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") salvarEdicao(acao.id)
                    if (e.key === "Escape") cancelarEdicao()
                  }}
                  maxLength={1000}
                  className="flex-1 text-sm text-gray-800 bg-white border border-violet-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <button
                  onClick={() => salvarEdicao(acao.id)}
                  disabled={!tmpDesc.trim()}
                  className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                >
                  <Check size={14} strokeWidth={2.5} />
                </button>
                <button onClick={cancelarEdicao} className="text-slate-400 hover:text-slate-600">
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <span
                className={`flex-1 text-sm leading-snug ${
                  acao.feita ? "line-through text-slate-400" : "text-slate-700"
                }`}
              >
                {acao.descricao}
              </span>
            )}

            {/* Ações de edição/exclusão (visíveis no hover) */}
            {editandoId !== acao.id && (
              <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                <button
                  onClick={() => iniciarEdicao(acao)}
                  className="text-slate-300 hover:text-slate-600 transition-colors"
                  title="Editar"
                >
                  <Pencil size={12} strokeWidth={2} />
                </button>
                <button
                  onClick={() => excluir(acao.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={12} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Campo de nova ação */}
      {addindo ? (
        <div className="flex items-center gap-1.5 mt-3">
          <div className="w-4 h-4 shrink-0 rounded border border-slate-200 mt-0.5" />
          <input
            ref={inputNovaRef}
            type="text"
            value={novaDesc}
            onChange={(e) => setNovaDesc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") adicionarAcao()
              if (e.key === "Escape") { setAddindo(false); setNovaDesc("") }
            }}
            placeholder="Descreva a ação…"
            maxLength={1000}
            className="flex-1 text-sm text-gray-800 bg-white border border-violet-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            onClick={adicionarAcao}
            disabled={!novaDesc.trim()}
            className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => { setAddindo(false); setNovaDesc("") }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddindo(true)}
          className="flex items-center gap-1.5 mt-3 text-xs text-slate-400 hover:text-violet-600 transition-colors"
        >
          <Plus size={13} strokeWidth={2} />
          Adicionar ação
        </button>
      )}
    </div>
  )
}
