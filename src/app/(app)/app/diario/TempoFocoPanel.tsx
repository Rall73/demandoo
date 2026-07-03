"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Timer, Pencil, Trash2, Plus, Check, Loader2, ChevronDown,
  Inbox, CheckSquare, Lightbulb,
} from "lucide-react"

export type SessaoFocoItem = {
  id:            number
  demandaId:     number
  demandaTitulo: string
  demandaTipo:   string
  iniciadoEm:    string   // ISO UTC
  encerradoEm:   string   // ISO UTC
  duracaoMin:    number
}
export type DemandaAtiva = { id: number; titulo: string; tipo: string }

const TIPO_ICON: Record<string, typeof Inbox> = {
  DEMANDA: Inbox, TAREFA: CheckSquare, IDEIA: Lightbulb,
}
const TIPO_COR: Record<string, string> = {
  DEMANDA: "bg-violet-100 text-violet-700",
  TAREFA:  "bg-emerald-100 text-emerald-700",
  IDEIA:   "bg-amber-100 text-amber-700",
}

function formatMin(min: number): string {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60), m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}
function horaBRT(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
}
// ISO UTC → "YYYY-MM-DDTHH:mm" em BRT (para <input type="datetime-local">)
function toLocalInput(iso: string): string {
  return new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 16)
}
// "YYYY-MM-DDTHH:mm" (BRT) → ISO UTC (para manter o estado local coerente)
function brtInputToISO(local: string): string {
  return new Date(`${local}:00-03:00`).toISOString()
}

export default function TempoFocoPanel({
  sessoesIniciais, demandasAtivas, dataISO,
}: {
  sessoesIniciais: SessaoFocoItem[]
  demandasAtivas:  DemandaAtiva[]
  dataISO:         string
}) {
  const router = useRouter()

  const [sessoes,   setSessoes]   = useState<SessaoFocoItem[]>(sessoesIniciais)
  const [expandido, setExpandido] = useState<number | null>(null)
  const [editId,    setEditId]    = useState<number | null>(null)
  const [editIni,   setEditIni]   = useState("")
  const [editFim,   setEditFim]   = useState("")
  const [addOpen,   setAddOpen]   = useState(false)
  const [addDem,    setAddDem]    = useState<number | "">("")
  const [addIni,    setAddIni]    = useState(`${dataISO}T09:00`)
  const [addFim,    setAddFim]    = useState(`${dataISO}T10:00`)
  const [busy,      setBusy]      = useState(false)
  const [erro,      setErro]      = useState<string | null>(null)

  const grupos = useMemo(() => {
    const map = new Map<number, { titulo: string; tipo: string; sessoes: SessaoFocoItem[]; totalMin: number }>()
    for (const s of sessoes) {
      const g = map.get(s.demandaId)
      if (g) { g.sessoes.push(s); g.totalMin += s.duracaoMin }
      else map.set(s.demandaId, { titulo: s.demandaTitulo, tipo: s.demandaTipo, sessoes: [s], totalMin: s.duracaoMin })
    }
    return Array.from(map.entries())
      .map(([demandaId, v]) => ({ demandaId, ...v }))
      .sort((a, b) => b.totalMin - a.totalMin)
  }, [sessoes])

  const totalGeral = sessoes.reduce((a, s) => a + s.duracaoMin, 0)

  function abrirEdicao(s: SessaoFocoItem) {
    setEditId(s.id)
    setEditIni(toLocalInput(s.iniciadoEm))
    setEditFim(toLocalInput(s.encerradoEm))
    setErro(null)
  }

  async function salvarEdicao(id: number) {
    setBusy(true); setErro(null)
    try {
      const res  = await fetch(`/api/sessoes-foco/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ iniciadoEm: editIni, encerradoEm: editFim }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? "Erro ao salvar"); return }
      setSessoes((prev) => prev.map((s) => s.id === id
        ? { ...s, iniciadoEm: brtInputToISO(editIni), encerradoEm: brtInputToISO(editFim), duracaoMin: data.duracaoMin }
        : s))
      setEditId(null)
      router.refresh()
    } catch { setErro("Erro de conexão") }
    finally { setBusy(false) }
  }

  async function excluir(id: number) {
    setBusy(true)
    setSessoes((prev) => prev.filter((s) => s.id !== id))
    try {
      await fetch(`/api/sessoes-foco/${id}`, { method: "DELETE" })
      router.refresh()
    } catch { /* já removido da UI */ }
    finally { setBusy(false) }
  }

  async function adicionar() {
    if (!addDem) { setErro("Escolha a demanda"); return }
    setBusy(true); setErro(null)
    try {
      const res  = await fetch(`/api/sessoes-foco`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ demandaId: addDem, iniciadoEm: addIni, encerradoEm: addFim }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? "Erro ao adicionar"); return }
      const dem = demandasAtivas.find((d) => d.id === addDem)
      setSessoes((prev) => [...prev, {
        id:            data.sessao.id,
        demandaId:     Number(addDem),
        demandaTitulo: dem?.titulo ?? "—",
        demandaTipo:   dem?.tipo ?? "DEMANDA",
        iniciadoEm:    brtInputToISO(addIni),
        encerradoEm:   brtInputToISO(addFim),
        duracaoMin:    data.sessao.duracaoMin,
      }])
      setAddOpen(false); setAddDem("")
      router.refresh()
    } catch { setErro("Erro de conexão") }
    finally { setBusy(false) }
  }

  return (
    <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Timer size={12} strokeWidth={2.5} />
          Tempo de foco hoje
        </h2>
        <button
          onClick={() => { setAddOpen((v) => !v); setErro(null) }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
        >
          <Plus size={13} strokeWidth={2.5} /> Registrar
        </button>
      </div>

      <div className="text-2xl font-bold text-slate-800 mb-3">{formatMin(totalGeral)}</div>

      {addOpen && (
        <div className="mb-3 p-3 bg-white border border-violet-200 rounded-xl space-y-2">
          <select
            value={addDem}
            onChange={(e) => setAddDem(e.target.value ? Number(e.target.value) : "")}
            className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Escolha a demanda…</option>
            {demandasAtivas.map((d) => (
              <option key={d.id} value={d.id}>{d.titulo}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <label className="flex-1 text-xs text-slate-500">
              Início
              <input type="datetime-local" value={addIni} onChange={(e) => setAddIni(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 bg-white mt-0.5" />
            </label>
            <label className="flex-1 text-xs text-slate-500">
              Término
              <input type="datetime-local" value={addFim} onChange={(e) => setAddFim(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-gray-800 bg-white mt-0.5" />
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={adicionar} disabled={busy}
              className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-1">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />} Salvar
            </button>
            <button onClick={() => setAddOpen(false)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50">Cancelar</button>
          </div>
        </div>
      )}

      {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}

      {grupos.length === 0 && !addOpen && (
        <p className="text-xs text-slate-400">Nenhuma sessão de foco hoje.</p>
      )}

      <div className="flex flex-col gap-2">
        {grupos.map((g) => {
          const Icon   = TIPO_ICON[g.tipo] ?? Inbox
          const aberto = expandido === g.demandaId
          return (
            <div key={g.demandaId} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => setExpandido(aberto ? null : g.demandaId)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors">
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded shrink-0 ${TIPO_COR[g.tipo] ?? ""}`}>
                  <Icon size={9} strokeWidth={2.5} />
                </span>
                <span className="text-xs text-slate-700 truncate flex-1 text-left">{g.titulo}</span>
                <span className="text-xs font-semibold text-slate-600 shrink-0">{formatMin(g.totalMin)}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
              </button>

              {aberto && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {g.sessoes.map((s) => (
                    <div key={s.id} className="px-3 py-2">
                      {editId === s.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input type="datetime-local" value={editIni} onChange={(e) => setEditIni(e.target.value)}
                              className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs text-gray-800 bg-white" />
                            <input type="datetime-local" value={editFim} onChange={(e) => setEditFim(e.target.value)}
                              className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs text-gray-800 bg-white" />
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => salvarEdicao(s.id)} disabled={busy}
                              className="px-2.5 py-1 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1">
                              {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} strokeWidth={2.5} />} Salvar
                            </button>
                            <button onClick={() => setEditId(null)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="group flex items-center gap-2">
                          <span className="text-xs text-slate-600 flex-1">
                            {horaBRT(s.iniciadoEm)} → {horaBRT(s.encerradoEm)}
                            <span className="text-slate-400 ml-1.5">· {formatMin(s.duracaoMin)}</span>
                          </span>
                          <button onClick={() => abrirEdicao(s)} title="Editar"
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 opacity-0 group-hover:opacity-100 transition-all">
                            <Pencil size={11} strokeWidth={2} />
                          </button>
                          <button onClick={() => excluir(s.id)} title="Excluir"
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={11} strokeWidth={2} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
