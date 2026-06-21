"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Pencil, Check, X, ChevronDown, Loader2,
  Inbox, CheckSquare, Lightbulb,
} from "lucide-react"
import TagInput from "@/components/TagInput"
import { TagBadge } from "@/components/TagBadge"

type Tipo = "DEMANDA" | "TAREFA" | "IDEIA"
type Prio = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"

interface Props {
  demandaId:    number
  tipo:         Tipo
  titulo:       string
  descricao:    string | null
  prioridade:   Prio
  prazo:        string | null  // ISO string ou null
  delegadoNome: string | null
  tags:         string[]
}

const TIPO_OPTS = [
  { value: "DEMANDA" as Tipo, label: "Demanda", icon: Inbox,       cls: "bg-violet-100 text-violet-700" },
  { value: "TAREFA"  as Tipo, label: "Tarefa",  icon: CheckSquare, cls: "bg-emerald-100 text-emerald-700" },
  { value: "IDEIA"   as Tipo, label: "Ideia",   icon: Lightbulb,   cls: "bg-amber-100 text-amber-700" },
] as const

const PRIO_OPTS: { value: Prio; label: string }[] = [
  { value: "CRITICA", label: "Crítica" },
  { value: "ALTA",    label: "Alta"    },
  { value: "MEDIA",   label: "Média"   },
  { value: "BAIXA",   label: "Baixa"   },
]

// ISO → "YYYY-MM-DD" para input[type=date]
function isoToDate(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toISOString().slice(0, 10)
}

export default function DetalheContent({
  demandaId, tipo: tipoInit, titulo: tituloInit,
  descricao: descInit, prioridade: prioInit, prazo: prazoInit,
  delegadoNome: delegadoInit, tags: tagsInit,
}: Props) {
  const router = useRouter()

  // Estado local (otimista — atualiza antes do router.refresh())
  const [tipo,      setTipo]      = useState(tipoInit)
  const [titulo,    setTitulo]    = useState(tituloInit)
  const [descricao, setDescricao] = useState(descInit ?? "")
  const [tags,      setTags]      = useState<string[]>(tagsInit)

  // Modo edição
  const [editTitulo,    setEditTitulo]    = useState(false)
  const [editDesc,      setEditDesc]      = useState(false)
  const [showTipoMenu,  setShowTipoMenu]  = useState(false)
  const [showDetalhes,  setShowDetalhes]  = useState(false)

  // Valores temporários nos formulários de edição
  const [tmpTitulo, setTmpTitulo] = useState(tituloInit)
  const [tmpDesc,   setTmpDesc]   = useState(descInit ?? "")
  const [tmpPrio,      setTmpPrio]      = useState<Prio>(prioInit)
  const [tmpPrazo,     setTmpPrazo]     = useState(isoToDate(prazoInit))
  const [tmpDelegado,  setTmpDelegado]  = useState(delegadoInit ?? "")
  const [tmpTags,      setTmpTags]      = useState<string[]>(tagsInit)

  const [loading, setLoading] = useState(false)

  async function patch(data: Record<string, unknown>) {
    setLoading(true)
    await fetch(`/api/demandas/${demandaId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    })
    router.refresh()
    setLoading(false)
  }

  // ── Título ──────────────────────────────────────────────────────────────────
  async function saveTitulo() {
    if (!tmpTitulo.trim()) return
    const novo = tmpTitulo.trim()
    setTitulo(novo)
    setEditTitulo(false)
    await patch({ titulo: novo })
  }

  function cancelTitulo() {
    setTmpTitulo(titulo)
    setEditTitulo(false)
  }

  // ── Descrição ───────────────────────────────────────────────────────────────
  async function saveDesc() {
    const novo = tmpDesc.trim()
    setDescricao(novo)
    setEditDesc(false)
    await patch({ descricao: novo || null })
  }

  function cancelDesc() {
    setTmpDesc(descricao)
    setEditDesc(false)
  }

  // ── Tipo ────────────────────────────────────────────────────────────────────
  async function saveTipo(novoTipo: Tipo) {
    setTipo(novoTipo)
    setShowTipoMenu(false)
    await patch({ tipo: novoTipo })
  }

  // ── Detalhes (tipo + prioridade + prazo + delegado) ─────────────────────────
  async function saveDetalhes() {
    setTags(tmpTags)
    await patch({
      tipo:         tipo,  // tipo já atualizado pelo dropdown ou mantido
      prioridade:   tmpPrio,
      prazo:        tmpPrazo || null,
      delegadoNome: tmpDelegado.trim() || null,
      tags:         tmpTags,
    })
    setShowDetalhes(false)
  }

  const tipoOpt = TIPO_OPTS.find((t) => t.value === tipo)!
  const TipoIcon = tipoOpt.icon

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">

      {/* ── Tipo (dropdown) ──────────────────────────────────────────────────── */}
      <div className="relative inline-block mb-4">
        <button
          onClick={() => setShowTipoMenu(!showTipoMenu)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-opacity hover:opacity-75 ${tipoOpt.cls}`}
        >
          <TipoIcon size={11} strokeWidth={2} />
          {tipoOpt.label}
          <ChevronDown
            size={10}
            className={`transition-transform ${showTipoMenu ? "rotate-180" : ""}`}
          />
        </button>

        {showTipoMenu && (
          <div className="absolute left-0 top-full mt-1.5 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[140px]">
            {TIPO_OPTS.map(({ value, label, icon: Icon, cls }) => (
              <button
                key={value}
                onClick={() => saveTipo(value)}
                disabled={loading || value === tipo}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 transition-colors text-left ${
                  value === tipo ? "opacity-40 cursor-default" : ""
                }`}
              >
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                  <Icon size={11} strokeWidth={2} /> {label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Título (inline edit) ─────────────────────────────────────────────── */}
      {editTitulo ? (
        <div className="mb-4">
          <input
            type="text"
            value={tmpTitulo}
            onChange={(e) => setTmpTitulo(e.target.value)}
            maxLength={500}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") saveTitulo()
              if (e.key === "Escape") cancelTitulo()
            }}
            className="w-full text-xl font-bold text-gray-800 bg-white border border-violet-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={saveTitulo}
              disabled={loading || !tmpTitulo.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Salvar
            </button>
            <button
              onClick={cancelTitulo}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50"
            >
              <X size={12} /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div
          className="group flex items-start gap-2 mb-4 cursor-text"
          onClick={() => { setTmpTitulo(titulo); setEditTitulo(true) }}
        >
          <h1 className="text-xl font-bold text-slate-900 flex-1 leading-snug">{titulo}</h1>
          <Pencil
            size={14}
            className="shrink-0 mt-1.5 text-slate-300 group-hover:text-slate-500 transition-colors"
            strokeWidth={2}
          />
        </div>
      )}

      {/* ── Descrição (inline edit) ──────────────────────────────────────────── */}
      {editDesc ? (
        <div>
          <textarea
            value={tmpDesc}
            onChange={(e) => setTmpDesc(e.target.value)}
            rows={4}
            autoFocus
            className="w-full text-sm text-gray-800 bg-white border border-violet-400 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={saveDesc}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Salvar
            </button>
            <button
              onClick={cancelDesc}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs hover:bg-slate-50"
            >
              <X size={12} /> Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div
          className="group flex items-start gap-2 cursor-text"
          onClick={() => { setTmpDesc(descricao); setEditDesc(true) }}
        >
          {descricao ? (
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap flex-1">
              {descricao}
            </p>
          ) : (
            <p className="text-slate-300 text-sm italic flex-1">Clique para adicionar descrição…</p>
          )}
          <Pencil
            size={14}
            className="shrink-0 mt-0.5 text-slate-300 group-hover:text-slate-500 transition-colors"
            strokeWidth={2}
          />
        </div>
      )}

      {/* ── Tags (exibição) ──────────────────────────────────────────────────── */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4">
          {tags.map((t) => <TagBadge key={t} nome={t} />)}
        </div>
      )}

      {/* ── Editar detalhes (collapse) ───────────────────────────────────────── */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <button
          onClick={() => setShowDetalhes(!showDetalhes)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronDown
            size={13}
            className={`transition-transform ${showDetalhes ? "rotate-180" : ""}`}
          />
          Editar detalhes
        </button>

        {showDetalhes && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Prioridade */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
                <select
                  value={tmpPrio}
                  onChange={(e) => setTmpPrio(e.target.value as Prio)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {PRIO_OPTS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Prazo */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Prazo{" "}
                  {tmpPrazo && (
                    <button
                      type="button"
                      onClick={() => setTmpPrazo("")}
                      className="text-slate-400 hover:text-red-500 ml-1"
                    >
                      <X size={10} className="inline" />
                    </button>
                  )}
                </label>
                <input
                  type="date"
                  value={tmpPrazo}
                  onChange={(e) => setTmpPrazo(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Delegado */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Delegado para</label>
              <input
                type="text"
                value={tmpDelegado}
                onChange={(e) => setTmpDelegado(e.target.value)}
                placeholder="Nome de quem vai executar…"
                maxLength={200}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tags</label>
              <TagInput value={tmpTags} onChange={setTmpTags} placeholder="Adicionar tags…" />
            </div>

            <button
              onClick={saveDetalhes}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar alterações
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
