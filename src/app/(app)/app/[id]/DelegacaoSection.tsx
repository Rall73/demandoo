"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  UserPlus, Users, Loader2, X, Check, Clock, CornerDownRight,
  MessageSquare, ChevronDown, ChevronUp, Send, Trash2,
} from "lucide-react"
import {
  situacaoDelegacao,
  type VisaoDelegacao, type DelegacaoFeita,
} from "@/lib/delegacao"

type Membro = { id: number; nome: string; email: string }

interface Props {
  demandaId:   number
  visao:       VisaoDelegacao
  membros:     Membro[]
  hojeISO:     string
  /** false quando a demanda está encerrada ou é do Diário */
  podeDelegar: boolean
}

const COR_BADGE: Record<string, string> = {
  verde:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  vermelho: "bg-red-50 text-red-700 border-red-200",
  ambar:    "bg-amber-50 text-amber-700 border-amber-200",
  cinza:    "bg-slate-100 text-slate-600 border-slate-200",
}

const STATUS_LABEL: Record<string, string> = {
  ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", EM_ESPERA: "Em espera",
  CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
}

function dataCurta(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
  })
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })
}

export default function DelegacaoSection({
  demandaId, visao: visaoInit, membros, hojeISO, podeDelegar,
}: Props) {
  const router = useRouter()

  const [visao,    setVisao]    = useState<VisaoDelegacao>(visaoInit)
  const [abrindo,  setAbrindo]  = useState(false)
  const [para,     setPara]     = useState<string>(membros[0] ? String(membros[0].id) : "")
  const [prazo,    setPrazo]    = useState("")
  const [instrucao, setInstrucao] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro,     setErro]     = useState<string | null>(null)

  const [expandida,  setExpandida]  = useState<number | null>(null)
  const [devolutiva, setDevolutiva] = useState("")
  const [concluir,   setConcluir]   = useState(true)

  async function delegar() {
    if (!para || !instrucao.trim()) return
    setSalvando(true)
    setErro(null)
    const res = await fetch(`/api/demandas/${demandaId}/delegar`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ paraUserId: Number(para), prazoRetorno: prazo || null, instrucao }),
    })
    const data = await res.json()
    setSalvando(false)
    if (!res.ok) { setErro(data.error ?? "Não foi possível delegar."); return }
    setVisao(data.delegacao)
    setAbrindo(false)
    setPrazo("")
    setInstrucao("")
    router.refresh()
  }

  async function cancelar(delegacaoId: number) {
    setErro(null)
    const res = await fetch(`/api/demandas/${demandaId}/delegar/${delegacaoId}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) { setErro(data.error ?? "Não foi possível cancelar."); return }
    setVisao(data.delegacao)
    router.refresh()
  }

  async function enviarDevolutiva() {
    if (!devolutiva.trim()) return
    setSalvando(true)
    setErro(null)
    const res = await fetch(`/api/demandas/${demandaId}/devolutiva`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ devolutiva, concluir }),
    })
    const data = await res.json()
    setSalvando(false)
    if (!res.ok) { setErro(data.error ?? "Não foi possível registrar."); return }
    setVisao(data.delegacao)
    setDevolutiva("")
    router.refresh()
  }

  const nada = visao.feitas.length === 0 && !visao.recebida

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Users size={14} className="text-slate-400" strokeWidth={2} />
          Delegação
        </p>
      </div>

      {/* ── Recebida: alguém delegou para mim ─────────────────────────────── */}
      {visao.recebida && (
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
          <p className="text-xs text-violet-700 font-medium">
            Recebida de {visao.recebida.de.nome}
            {visao.recebida.prazoRetorno && (
              <span className="text-violet-600 font-normal">
                {" "}· retorno até {dataCurta(visao.recebida.prazoRetorno)}
              </span>
            )}
          </p>

          {visao.recebida.instrucao && (
            <div className="mt-2 rounded-lg bg-white border border-violet-100 p-2">
              <p className="text-[11px] text-violet-700 font-medium mb-0.5">O que foi pedido</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{visao.recebida.instrucao}</p>
            </div>
          )}

          {visao.recebida.respondidoAt ? (
            <div className="mt-2 text-sm text-slate-700">
              <p className="text-xs text-emerald-700 font-medium mb-1">
                <Check size={11} className="inline mr-1" strokeWidth={3} />
                Retorno registrado em {dataHora(visao.recebida.respondidoAt)}
              </p>
              <p className="whitespace-pre-wrap text-slate-600">{visao.recebida.devolutiva}</p>
            </div>
          ) : (
            <div className="mt-2">
              <textarea
                value={devolutiva}
                onChange={(e) => setDevolutiva(e.target.value)}
                placeholder="Escreva o retorno para quem delegou…"
                rows={3}
                className="w-full text-sm text-gray-800 bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={concluir}
                    onChange={(e) => setConcluir(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Concluir a demanda ao registrar
                </label>
                <button
                  onClick={enviarDevolutiva}
                  disabled={!devolutiva.trim() || salvando}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors"
                >
                  {salvando ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} strokeWidth={2} />}
                  Registrar retorno
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Feitas: deleguei para alguém ──────────────────────────────────── */}
      {visao.feitas.map((d) => (
        <CardDelegacao
          key={d.id}
          d={d}
          hojeISO={hojeISO}
          expandida={expandida === d.id}
          onToggle={() => setExpandida(expandida === d.id ? null : d.id)}
          onCancelar={() => cancelar(d.id)}
        />
      ))}

      {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}

      {/* ── Formulário de delegação ───────────────────────────────────────── */}
      {abrindo ? (
        <div className="border-t border-slate-100 pt-3 mt-3">
          {membros.length === 0 ? (
            <p className="text-sm text-slate-500">
              Não há outros membros na empresa. Convide alguém em{" "}
              <Link href="/equipe" className="text-violet-600 hover:underline">Equipe</Link>{" "}
              para poder delegar.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs text-slate-500">Delegar para</span>
                <select
                  value={para}
                  onChange={(e) => setPara(e.target.value)}
                  className="text-xs text-gray-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {membros.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">com retorno até</span>
                <input
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="text-xs text-gray-800 bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <textarea
                value={instrucao}
                onChange={(e) => setInstrucao(e.target.value)}
                placeholder="O que exatamente você está pedindo…"
                rows={3}
                className="w-full text-sm text-gray-800 bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={delegar}
                  disabled={salvando || !para || !instrucao.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-40 transition-colors"
                >
                  {salvando ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} strokeWidth={2} />}
                  Delegar
                </button>
                <button
                  onClick={() => { setAbrindo(false); setErro(null) }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={13} strokeWidth={2} />
                  Cancelar
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Cria uma demanda para a pessoa com essa instrução. Suas ações continuam suas —
                o checklist não é copiado.
              </p>
            </>
          )}
        </div>
      ) : (
        podeDelegar && (
          <button
            onClick={() => setAbrindo(true)}
            className={`flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-600 transition-colors ${
              nada ? "" : "mt-3"
            }`}
          >
            <UserPlus size={13} strokeWidth={2} />
            {visao.feitas.length > 0 ? "Delegar para mais alguém" : "Delegar esta demanda"}
          </button>
        )
      )}

      {nada && !abrindo && !podeDelegar && (
        <p className="text-sm text-slate-400 italic">
          Demanda encerrada — não é possível delegar.
        </p>
      )}
    </div>
  )
}

// ── Card de uma delegação feita ──────────────────────────────────────────────

function CardDelegacao({
  d, hojeISO, expandida, onToggle, onCancelar,
}: {
  d:          DelegacaoFeita
  hojeISO:    string
  expandida:  boolean
  onToggle:   () => void
  onCancelar: () => void
}) {
  const sit    = situacaoDelegacao(d, hojeISO)
  const feitas = d.filha.acoes.filter((a) => a.feita).length

  return (
    <div className="rounded-xl border border-slate-200 p-3 mb-2">
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
          <CornerDownRight size={12} strokeWidth={2.5} />
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{d.para.nome}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-medium ${COR_BADGE[sit.cor]}`}>
              {sit.label}
            </span>
            <span className="text-[11px] text-slate-500">
              {STATUS_LABEL[d.filha.status] ?? d.filha.status}
            </span>
            {d.prazoRetorno && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Clock size={10} strokeWidth={2} />
                retorno {dataCurta(d.prazoRetorno)}
              </span>
            )}
            {d.filha.acoes.length > 0 && (
              <span className="text-[11px] text-slate-500">
                ações {feitas}/{d.filha.acoes.length}
              </span>
            )}
          </div>

          {d.filha.repassadaPara.length > 0 && (
            <p className="text-[11px] text-slate-500 mt-1">
              <CornerDownRight size={9} className="inline mr-1" strokeWidth={2.5} />
              repassada para {d.filha.repassadaPara.map((p) => p.nome).join(", ")}
            </p>
          )}

          {d.instrucao && (
            <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 p-2">
              <p className="text-[11px] text-slate-500 font-medium mb-0.5">Pedido</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{d.instrucao}</p>
            </div>
          )}

          {d.devolutiva && (
            <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 p-2">
              <p className="text-[11px] text-emerald-700 font-medium mb-0.5">
                Retorno {d.respondidoAt ? `em ${dataHora(d.respondidoAt)}` : ""}
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{d.devolutiva}</p>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={onToggle}
            title={expandida ? "Recolher" : "Ver andamento"}
            className="text-slate-300 hover:text-slate-600 transition-colors"
          >
            {expandida ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
          </button>
          {d.cancelavel && (
            <button
              onClick={onCancelar}
              title="Cancelar delegação"
              className="text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Andamento da filha — leitura */}
      {expandida && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
          {d.filha.acoes.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Ações
              </p>
              <div className="space-y-1">
                {d.filha.acoes.map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <span className={`shrink-0 mt-1 w-3 h-3 rounded border flex items-center justify-center ${
                      a.feita ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                    }`}>
                      {a.feita && <Check size={7} strokeWidth={4} className="text-white" />}
                    </span>
                    <span className={`text-xs leading-snug ${a.feita ? "line-through text-slate-400" : "text-slate-600"}`}>
                      {a.descricao}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.filha.comentarios.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                <MessageSquare size={9} className="inline mr-1" strokeWidth={2.5} />
                Histórico
              </p>
              <div className="space-y-1.5">
                {d.filha.comentarios.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="text-slate-400">{dataHora(c.createdAt)} · {c.autor}</span>
                    <p className={`leading-snug ${c.tipo === "STATUS" ? "text-slate-400 italic" : "text-slate-600"}`}>
                      {c.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Nenhum registro ainda.</p>
          )}
        </div>
      )}
    </div>
  )
}
