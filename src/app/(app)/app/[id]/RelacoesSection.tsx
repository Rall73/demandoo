"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Link2, Plus, X, Loader2, Search, Unlink,
  Inbox, CheckSquare, Lightbulb,
} from "lucide-react"
import {
  OPCOES_VINCULO, RELACAO_LABEL,
  type RelacaoItem, type DemandaLigada,
} from "@/lib/relacoes"

const TIPO_ICON: Record<string, typeof Inbox> = {
  DEMANDA: Inbox, TAREFA: CheckSquare, IDEIA: Lightbulb,
}

const TIPO_COR: Record<string, string> = {
  DEMANDA: "bg-violet-100 text-violet-700",
  TAREFA:  "bg-emerald-100 text-emerald-700",
  IDEIA:   "bg-amber-100 text-amber-700",
}

const STATUS_LABEL: Record<string, string> = {
  ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", EM_ESPERA: "Em espera",
  CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
}

interface Props {
  demandaId: number
  relacoes:  RelacaoItem[]
}

export default function RelacoesSection({ demandaId, relacoes: relacoesInit }: Props) {
  const router = useRouter()

  const [relacoes,  setRelacoes]  = useState<RelacaoItem[]>(relacoesInit)
  const [abrindo,   setAbrindo]   = useState(false)
  const [opcao,     setOpcao]     = useState(OPCOES_VINCULO[0].valor)
  const [busca,     setBusca]     = useState("")
  const [candidatos, setCandidatos] = useState<DemandaLigada[]>([])
  const [buscando,  setBuscando]  = useState(false)
  const [salvando,  setSalvando]  = useState(false)
  const [erro,      setErro]      = useState<string | null>(null)
  const buscaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (abrindo) buscaRef.current?.focus()
  }, [abrindo])

  // Busca com debounce — dispara também com campo vazio (mostra as recentes)
  useEffect(() => {
    if (!abrindo) return
    let cancelado = false
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/demandas/${demandaId}/relacoes/candidatos?q=${encodeURIComponent(busca)}`,
        )
        const data = await res.json()
        if (!cancelado) setCandidatos(data.candidatos ?? [])
      } finally {
        if (!cancelado) setBuscando(false)
      }
    }, 250)
    return () => { cancelado = true; clearTimeout(t) }
  }, [busca, abrindo, demandaId])

  function fechar() {
    setAbrindo(false)
    setBusca("")
    setCandidatos([])
    setErro(null)
  }

  async function vincular(outra: DemandaLigada) {
    const escolha = OPCOES_VINCULO.find((o) => o.valor === opcao)!
    setSalvando(true)
    setErro(null)

    const res = await fetch(`/api/demandas/${demandaId}/relacoes`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        demandaId: outra.id,
        tipo:      escolha.tipo,
        sentido:   escolha.sentido,
      }),
    })
    const data = await res.json()
    setSalvando(false)

    if (!res.ok) {
      setErro(data.error ?? "Não foi possível vincular.")
      return
    }

    setRelacoes(data.relacoes ?? [])
    fechar()
    router.refresh()
  }

  async function desvincular(relacaoId: number) {
    setRelacoes((prev) => prev.filter((r) => r.relacaoId !== relacaoId))
    await fetch(`/api/demandas/${demandaId}/relacoes/${relacaoId}`, { method: "DELETE" })
    router.refresh()
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Link2 size={14} className="text-slate-400" strokeWidth={2} />
          Demandas vinculadas
        </p>
        {relacoes.length > 0 && (
          <span className="text-xs font-medium text-slate-400">{relacoes.length}</span>
        )}
      </div>

      {/* Lista de vínculos */}
      {relacoes.length === 0 && !abrindo && (
        <p className="text-sm text-slate-400 italic mb-3">
          Nenhuma demanda vinculada.
        </p>
      )}

      {relacoes.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {relacoes.map((r) => {
            const Icon = TIPO_ICON[r.demanda.tipo] ?? Inbox
            const concluida = r.demanda.status === "CONCLUIDA"
            return (
              <div key={r.relacaoId} className="group flex items-start gap-2.5">
                <span className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded ${TIPO_COR[r.demanda.tipo] ?? ""}`}>
                  <Icon size={10} strokeWidth={2.5} />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {RELACAO_LABEL[r.tipo][r.sentido]}
                  </p>
                  <Link
                    href={`/app/${r.demanda.id}`}
                    className={`text-sm leading-snug hover:text-violet-700 transition-colors ${
                      concluida ? "text-slate-400" : "text-slate-700"
                    }`}
                  >
                    {r.demanda.titulo}
                  </Link>
                  <span className={`ml-1.5 text-[11px] ${concluida ? "text-emerald-600" : "text-slate-400"}`}>
                    {STATUS_LABEL[r.demanda.status] ?? r.demanda.status}
                  </span>
                </div>

                <button
                  onClick={() => desvincular(r.relacaoId)}
                  className="shrink-0 mt-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Desfazer vínculo"
                >
                  <Unlink size={12} strokeWidth={2} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulário de vínculo */}
      {abrindo ? (
        <div className="border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-slate-500">Esta demanda</span>
            <select
              value={opcao}
              onChange={(e) => setOpcao(e.target.value)}
              className="text-xs text-gray-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {OPCOES_VINCULO.map((o) => (
                <option key={o.valor} value={o.valor}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2} />
            <input
              ref={buscaRef}
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") fechar() }}
              placeholder="Busque pelo título da demanda…"
              className="w-full text-sm text-gray-800 bg-white border border-violet-400 rounded pl-8 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {(buscando || salvando) && (
              <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>

          {erro && <p className="text-xs text-red-600 mt-1.5">{erro}</p>}

          {/* Resultados */}
          <div className="mt-2 space-y-0.5 max-h-56 overflow-y-auto">
            {!buscando && candidatos.length === 0 && (
              <p className="text-xs text-slate-400 italic py-1.5">
                {busca ? "Nenhuma demanda encontrada." : "Nenhuma demanda disponível para vincular."}
              </p>
            )}
            {candidatos.map((c) => {
              const Icon = TIPO_ICON[c.tipo] ?? Inbox
              return (
                <button
                  key={c.id}
                  onClick={() => vincular(c)}
                  disabled={salvando}
                  className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded hover:bg-violet-50 disabled:opacity-50 transition-colors"
                >
                  <span className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded ${TIPO_COR[c.tipo] ?? ""}`}>
                    <Icon size={10} strokeWidth={2.5} />
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{c.titulo}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={fechar}
            className="flex items-center gap-1.5 mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={13} strokeWidth={2} />
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAbrindo(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 transition-colors"
        >
          <Plus size={13} strokeWidth={2} />
          Vincular demanda
        </button>
      )}
    </div>
  )
}
