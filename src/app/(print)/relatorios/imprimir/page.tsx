import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import PrintButton from "./PrintButton"

type Tipo   = "DEMANDA" | "TAREFA" | "IDEIA"
type Status = "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA"
type Prio   = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"

const STATUS_LABEL: Record<Status, string> = {
  ABERTA:       "Aberta",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA:    "Concluída",
  CANCELADA:    "Cancelada",
}

const PRIO_LABEL: Record<Prio, string> = {
  BAIXA:   "Baixa",
  MEDIA:   "Média",
  ALTA:    "Alta",
  CRITICA: "Crítica",
}

const TIPO_LABEL: Record<string, string> = {
  DEMANDA: "Demandas",
  TAREFA:  "Tarefas",
  IDEIA:   "Ideias",
}

function prazoFormatado(iso: Date | null): string | null {
  if (!iso) return null
  return new Date(iso.getTime() - 3 * 3600000).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

export default async function ImprimirPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; tipo?: string }>
}) {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)

  const { ids, tipo } = await searchParams

  const idList = (ids ?? "")
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0)

  if (idList.length === 0) notFound()

  const demandas = await prisma.demanda.findMany({
    where:   { id: { in: idList }, companyId, userId, deletedAt: null },
    include: { acoes: { where: { deletedAt: null }, orderBy: { ordem: "asc" } } },
  })

  if (demandas.length === 0) notFound()

  // Preserva a ordem de seleção do usuário
  const mapaId = new Map(demandas.map((d) => [d.id, d]))
  const lista  = idList.map((id) => mapaId.get(id)).filter(Boolean) as typeof demandas

  const tipoLabel = TIPO_LABEL[tipo ?? "DEMANDA"] ?? "Itens"
  const hoje = new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "long", year: "numeric",
  })

  return (
    <div className="min-h-screen bg-white">

      {/* CSS de impressão */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11pt; }
          @page { margin: 2cm; }
          .print-item { page-break-inside: avoid; break-inside: avoid; }
          .print-acao { page-break-inside: avoid; }
        }
      `}</style>

      {/* ── Barra de ferramentas (oculta na impressão) ── */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shadow-sm">
        <PrintButton />
        <Link
          href="/relatorios"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Voltar ao relatório
        </Link>
        <span className="ml-auto text-sm text-slate-400">
          {lista.length} {lista.length === 1 ? "item selecionado" : "itens selecionados"}
        </span>
      </div>

      {/* ── Conteúdo imprimível ── */}
      <div className="max-w-3xl mx-auto px-8 py-10">

        {/* Cabeçalho do documento */}
        <div className="mb-8 pb-5 border-b-2 border-slate-900 flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-slate-900">demandoo</p>
            <p className="text-sm text-slate-500 mt-0.5">{session!.user.companyName}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p className="font-medium text-slate-700">{session!.user.name}</p>
            <p>{hoje}</p>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-900">Relatório de {tipoLabel}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {lista.length} {lista.length === 1 ? "item" : "itens"}
          </p>
        </div>

        {/* Itens */}
        <div className="space-y-5">
          {lista.map((d, i) => {
            const prazoStr  = prazoFormatado(d.prazo)
            const agora     = new Date()
            const vencida   =
              !!d.prazo &&
              d.prazo < agora &&
              d.status !== "CONCLUIDA" &&
              d.status !== "CANCELADA"

            const acoesTotal  = d.acoes.length
            const acoesFeiras = d.acoes.filter((a) => a.feita).length

            return (
              <div
                key={d.id}
                className="print-item border border-slate-200 rounded-xl p-5"
              >
                {/* Número + título */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <h2 className="text-base font-semibold text-slate-900 leading-snug flex-1">
                    {d.titulo}
                  </h2>
                </div>

                {/* Badges de status e prioridade */}
                <div className="flex flex-wrap gap-2 mb-3 pl-10">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {STATUS_LABEL[d.status as Status]}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {PRIO_LABEL[d.prioridade as Prio]}
                  </span>
                  {prazoStr && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      vencida
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      Prazo: {prazoStr}{vencida ? " (vencido)" : ""}
                    </span>
                  )}
                  {d.solicitanteNome && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                      Por: {d.solicitanteNome}
                    </span>
                  )}
                </div>

                {/* Descrição */}
                {d.descricao && (
                  <p className="text-sm text-slate-600 leading-relaxed pl-10 mb-3">
                    {d.descricao}
                  </p>
                )}

                {/* Ações / checklist */}
                {acoesTotal > 0 && (
                  <div className="pl-10">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Ações ({acoesFeiras}/{acoesTotal})
                    </p>
                    <div className="space-y-1.5">
                      {d.acoes.map((acao) => (
                        <div key={acao.id} className="print-acao flex items-start gap-2">
                          <div className={`shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center ${
                            acao.feita
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-slate-300"
                          }`}>
                            {acao.feita && (
                              <span className="text-white text-[9px] font-bold leading-none">✓</span>
                            )}
                          </div>
                          <span className={`text-sm ${
                            acao.feita ? "line-through text-slate-400" : "text-slate-700"
                          }`}>
                            {acao.descricao}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data de criação (rodapé do item) */}
                <p className="text-xs text-slate-400 pl-10 mt-3">
                  Criado em{" "}
                  {new Date(d.createdAt.getTime() - 3 * 3600000).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                  {d.status === "CONCLUIDA" && d.concluidoAt && (
                    <> · Concluído em{" "}
                      {new Date(d.concluidoAt.getTime() - 3 * 3600000).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </>
                  )}
                </p>
              </div>
            )
          })}
        </div>

        {/* Rodapé do documento */}
        <div className="mt-12 pt-4 border-t border-slate-200 text-xs text-slate-400 text-center">
          Gerado em {hoje} · demandoo.net
        </div>
      </div>
    </div>
  )
}
