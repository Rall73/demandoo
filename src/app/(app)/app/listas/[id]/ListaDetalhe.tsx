"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, ShoppingCart, Bell, CalendarClock, ListChecks,
  Plus, Mic, MicOff, Loader2, Trash2, ExternalLink, Check,
  ChevronDown, ChevronUp, Pencil, X,
} from "lucide-react"

type ListaTipo = "COMPRAS" | "VENCIMENTOS" | "LEMBRETES" | "GERAL"

interface ItemLista {
  id: number
  texto: string
  concluido: boolean
  concluidoAt: string | null
  dataVencimento: string | null
  recorrente: boolean
  lembrarAntesDias: number | null
  url: string | null
  createdAt: string
}

interface Lista {
  id: number
  titulo: string
  descricao: string | null
  tipo: ListaTipo
  cor: string | null
  itens: ItemLista[]
}

const TIPO_CONFIG: Record<ListaTipo, { label: string; icon: React.ElementType; cor: string }> = {
  COMPRAS:     { label: "Compras",     icon: ShoppingCart,  cor: "text-emerald-600" },
  VENCIMENTOS: { label: "Vencimentos", icon: CalendarClock, cor: "text-amber-600"   },
  LEMBRETES:   { label: "Lembretes",   icon: Bell,          cor: "text-sky-600"     },
  GERAL:       { label: "Geral",       icon: ListChecks,    cor: "text-violet-600"  },
}

// Estado de edição de um item
interface EditState {
  texto: string
  dataVencimento: string   // YYYY-MM-DD ou ""
  recorrente: boolean
  lembrarAntesDias: string // número como string ou ""
  url: string
}

export default function ListaDetalhe({ listaId }: { listaId: number }) {
  const [lista, setLista]               = useState<Lista | null>(null)
  const [loading, setLoading]           = useState(true)
  const [novoTexto, setNovoTexto]       = useState("")
  const [novaData, setNovaData]         = useState("")
  const [novoLembrar, setNovoLembrar]   = useState("")
  const [novaUrl, setNovaUrl]           = useState("")
  const [recorrente, setRecorrente]     = useState(false)
  const [salvando, setSalvando]         = useState(false)
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false)
  const [editandoId, setEditandoId]     = useState<number | null>(null)
  const [editState, setEditState]       = useState<EditState>({
    texto: "", dataVencimento: "", recorrente: false, lembrarAntesDias: "", url: "",
  })
  const [gravando, setGravando]         = useState(false)
  const [transcrevendo, setTranscrevendo] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])

  const tipoExtraData = lista?.tipo === "VENCIMENTOS" || lista?.tipo === "LEMBRETES"
  const tipoUrl       = lista?.tipo === "COMPRAS"

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/listas/${listaId}`)
      const data = await res.json()
      setLista(data.lista ?? null)
    } finally {
      setLoading(false)
    }
  }, [listaId])

  useEffect(() => { carregar() }, [carregar])

  // ── Toggle concluído ──────────────────────────────────────────────────────
  async function toggleItem(item: ItemLista) {
    setLista((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        itens: prev.itens.map((i) =>
          i.id === item.id ? { ...i, concluido: !i.concluido } : i
        ),
      }
    })
    await fetch(`/api/listas/${listaId}/itens/${item.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ concluido: !item.concluido }),
    })
  }

  // ── Adicionar item por texto ──────────────────────────────────────────────
  async function adicionarItem() {
    const texto = novoTexto.trim()
    if (!texto) return
    setSalvando(true)
    try {
      await fetch(`/api/listas/${listaId}/itens`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          texto,
          dataVencimento:   novaData || undefined,
          recorrente,
          lembrarAntesDias: novoLembrar ? Number(novoLembrar) : undefined,
          url:              novaUrl || undefined,
        }),
      })
      setNovoTexto("")
      setNovaData("")
      setNovoLembrar("")
      setNovaUrl("")
      setRecorrente(false)
      await carregar()
    } finally {
      setSalvando(false)
    }
  }

  // ── Deletar item ──────────────────────────────────────────────────────────
  async function deletarItem(itemId: number) {
    setLista((prev) => {
      if (!prev) return prev
      return { ...prev, itens: prev.itens.filter((i) => i.id !== itemId) }
    })
    await fetch(`/api/listas/${listaId}/itens/${itemId}`, { method: "DELETE" })
  }

  // ── Iniciar edição ────────────────────────────────────────────────────────
  function iniciarEdicao(item: ItemLista) {
    setEditandoId(item.id)
    setEditState({
      texto:            item.texto,
      dataVencimento:   item.dataVencimento
        ? new Date(item.dataVencimento).toISOString().slice(0, 10)
        : "",
      recorrente:       item.recorrente,
      lembrarAntesDias: item.lembrarAntesDias != null ? String(item.lembrarAntesDias) : "",
      url:              item.url ?? "",
    })
  }

  // ── Salvar edição completa ────────────────────────────────────────────────
  async function salvarEdicao(itemId: number) {
    const texto = editState.texto.trim()
    if (!texto) return
    await fetch(`/api/listas/${listaId}/itens/${itemId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        texto,
        dataVencimento:   editState.dataVencimento || null,
        recorrente:       editState.recorrente,
        lembrarAntesDias: editState.lembrarAntesDias ? Number(editState.lembrarAntesDias) : null,
        url:              editState.url.trim() || null,
      }),
    })
    setEditandoId(null)
    await carregar()
  }

  // ── Gravação de áudio ─────────────────────────────────────────────────────
  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr     = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        await enviarAudio(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setGravando(true)
    } catch {
      alert("Sem permissão para o microfone.")
    }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop()
    setGravando(false)
  }

  async function enviarAudio(blob: Blob) {
    setTranscrevendo(true)
    try {
      const form = new FormData()
      form.append("audio", blob, "audio.webm")
      const up  = await fetch("/api/upload/audio", { method: "POST", body: form })
      const upj = await up.json()
      if (!upj.url) { alert("Erro no upload do áudio."); return }

      const res  = await fetch(`/api/listas/${listaId}/itens`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ audioUrl: upj.url }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? "Erro ao processar áudio."); return }
      await carregar()
    } catch {
      alert("Erro de conexão ao processar áudio.")
    } finally {
      setTranscrevendo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-violet-600" strokeWidth={2} />
      </div>
    )
  }

  if (!lista) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Lista não encontrada.</p>
        <Link href="/app/listas" className="text-violet-600 text-sm mt-2 inline-block hover:underline">
          ← Voltar para listas
        </Link>
      </div>
    )
  }

  const cfg          = TIPO_CONFIG[lista.tipo]
  const TipoIcon     = cfg.icon
  const pendentes    = lista.itens.filter((i) => !i.concluido)
  const concluidos   = lista.itens.filter((i) => i.concluido)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6">
        <Link
          href="/app/listas"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 mb-3 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Listas
        </Link>
        <div className="flex items-center gap-2.5">
          <TipoIcon size={22} className={cfg.cor} strokeWidth={2} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{lista.titulo}</h1>
            <p className="text-xs text-gray-500">{cfg.label} · {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        {lista.descricao && (
          <p className="mt-2 text-sm text-gray-600">{lista.descricao}</p>
        )}
      </div>

      {/* Adicionar item */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Adicionar item…"
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionarItem()}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={gravando ? pararGravacao : iniciarGravacao}
            disabled={transcrevendo}
            title={gravando ? "Parar gravação" : "Adicionar por voz"}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium ${
              gravando
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-violet-100 text-violet-700 hover:bg-violet-200"
            } disabled:opacity-50`}
          >
            {transcrevendo ? (
              <Loader2 size={16} className="animate-spin" strokeWidth={2} />
            ) : gravando ? (
              <MicOff size={16} strokeWidth={2} />
            ) : (
              <Mic size={16} strokeWidth={2} />
            )}
          </button>
          <button
            onClick={adicionarItem}
            disabled={salvando || !novoTexto.trim()}
            className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {salvando ? <Loader2 size={16} className="animate-spin" strokeWidth={2} /> : <Plus size={16} strokeWidth={2} />}
          </button>
        </div>

        {gravando && (
          <p className="text-xs text-red-500 font-medium animate-pulse">● Gravando… clique no microfone para parar</p>
        )}
        {transcrevendo && (
          <p className="text-xs text-violet-600 font-medium">Processando áudio com IA…</p>
        )}

        {/* Campos extras ao adicionar */}
        {(tipoExtraData || tipoUrl) && novoTexto && (
          <div className="grid gap-2 sm:grid-cols-2">
            {tipoExtraData && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data</label>
                <input
                  type="date"
                  value={novaData}
                  onChange={(e) => setNovaData(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}
            {tipoExtraData && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Avisar com antecedência (dias)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="ex: 30"
                  value={novoLembrar}
                  onChange={(e) => setNovoLembrar(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}
            {lista.tipo === "LEMBRETES" && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recorrente}
                  onChange={(e) => setRecorrente(e.target.checked)}
                  className="rounded accent-violet-600"
                />
                Repete todo ano (ex: aniversário)
              </label>
            )}
            {tipoUrl && (
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Link (opcional)</label>
                <input
                  type="url"
                  placeholder="https://…"
                  value={novaUrl}
                  onChange={(e) => setNovaUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty state */}
      {pendentes.length === 0 && concluidos.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          Nenhum item ainda. Adicione acima ou use o microfone.
        </div>
      )}

      {/* Itens pendentes */}
      <div className="space-y-1.5">
        {pendentes.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            tipo={lista.tipo}
            editandoId={editandoId}
            editState={editState}
            onEditStateChange={setEditState}
            onToggle={() => toggleItem(item)}
            onDelete={() => deletarItem(item.id)}
            onEditStart={() => iniciarEdicao(item)}
            onEditSave={() => salvarEdicao(item.id)}
            onEditCancel={() => setEditandoId(null)}
          />
        ))}
      </div>

      {/* Itens concluídos */}
      {concluidos.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setMostrarConcluidos((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors"
          >
            {mostrarConcluidos ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
            {concluidos.length} concluído{concluidos.length !== 1 ? "s" : ""}
          </button>
          {mostrarConcluidos && (
            <div className="space-y-1.5 opacity-60">
              {concluidos.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  tipo={lista.tipo}
                  editandoId={editandoId}
                  editState={editState}
                  onEditStateChange={setEditState}
                  onToggle={() => toggleItem(item)}
                  onDelete={() => deletarItem(item.id)}
                  onEditStart={() => iniciarEdicao(item)}
                  onEditSave={() => salvarEdicao(item.id)}
                  onEditCancel={() => setEditandoId(null)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente de linha de item ───────────────────────────────────────────────

interface ItemRowProps {
  item: ItemLista
  tipo: ListaTipo
  editandoId: number | null
  editState: EditState
  onEditStateChange: (s: EditState) => void
  onToggle: () => void
  onDelete: () => void
  onEditStart: () => void
  onEditSave: () => void
  onEditCancel: () => void
}

function ItemRow({
  item, tipo, editandoId, editState, onEditStateChange,
  onToggle, onDelete, onEditStart, onEditSave, onEditCancel,
}: ItemRowProps) {
  const editando     = editandoId === item.id
  const temExtraData = tipo === "VENCIMENTOS" || tipo === "LEMBRETES"
  const temUrl       = tipo === "COMPRAS"

  const vencimento = item.dataVencimento
    ? new Date(item.dataVencimento).toLocaleDateString("pt-BR")
    : null

  function set(field: keyof EditState, value: string | boolean) {
    onEditStateChange({ ...editState, [field]: value })
  }

  return (
    <div className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          item.concluido
            ? "border-emerald-500 bg-emerald-500"
            : "border-gray-300 hover:border-violet-400"
        }`}
      >
        {item.concluido && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        {editando ? (
          /* ── Formulário de edição expandido ── */
          <div className="space-y-2">
            <input
              autoFocus
              value={editState.texto}
              onChange={(e) => set("texto", e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") onEditCancel() }}
              placeholder="Texto do item"
              className="w-full px-2 py-1 rounded border border-violet-300 text-sm text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
            />

            {temExtraData && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Data</label>
                  <input
                    type="date"
                    value={editState.dataVencimento}
                    onChange={(e) => set("dataVencimento", e.target.value)}
                    className="w-full px-2 py-1 rounded border border-gray-300 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Avisar (dias antes)</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="ex: 30"
                    value={editState.lembrarAntesDias}
                    onChange={(e) => set("lembrarAntesDias", e.target.value)}
                    className="w-full px-2 py-1 rounded border border-gray-300 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                {tipo === "LEMBRETES" && (
                  <label className="col-span-2 flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editState.recorrente}
                      onChange={(e) => set("recorrente", e.target.checked)}
                      className="rounded accent-violet-600"
                    />
                    Repete todo ano (aniversário)
                  </label>
                )}
              </div>
            )}

            {temUrl && (
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Link (opcional)</label>
                <input
                  type="url"
                  placeholder="https://…"
                  value={editState.url}
                  onChange={(e) => set("url", e.target.value)}
                  className="w-full px-2 py-1 rounded border border-gray-300 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onEditSave}
                className="flex items-center gap-1 px-3 py-1 bg-violet-600 text-white text-xs rounded-md hover:bg-violet-700 transition-colors"
              >
                <Check size={12} strokeWidth={2.5} />
                Salvar
              </button>
              <button
                onClick={onEditCancel}
                className="flex items-center gap-1 px-3 py-1 bg-white text-gray-600 text-xs rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <X size={12} strokeWidth={2.5} />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className={`text-sm text-gray-800 break-words ${item.concluido ? "line-through text-gray-400" : ""}`}>
              {item.texto}
            </p>

            {/* Metadados */}
            {(vencimento || item.url) && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {vencimento && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                    tipo === "VENCIMENTOS" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
                  }`}>
                    {item.recorrente ? "↺ " : ""}{vencimento}
                    {item.lembrarAntesDias ? ` · avisar ${item.lembrarAntesDias}d antes` : ""}
                  </span>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-0.5 text-xs text-violet-600 hover:underline"
                  >
                    <ExternalLink size={11} strokeWidth={2} />
                    Ver link
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Ações (visíveis no hover, apenas quando não está editando) */}
      {!editando && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEditStart} className="p-1.5 rounded-md text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors">
            <Pencil size={13} strokeWidth={2} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  )
}
