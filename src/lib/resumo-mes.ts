import { prisma } from "@/lib/prisma"
import { hojeNoBrasil, intervaloMesBRT, somarMesesISO } from "@/lib/date"

/**
 * Agregações do fechamento mensal.
 *
 * Só métricas reconstruíveis a partir do que o banco realmente grava:
 * `createdAt`, `concluidoAt`, `prazo` e `status` atual. Não existe histórico de
 * status, então "situação" é sempre a de hoje — nunca uma foto do fim do mês.
 * O tipo DIARIO é excluído de tudo, como no resto do app.
 */

export const TIPOS_RESUMO = ["DEMANDA", "TAREFA", "IDEIA"] as const
export type TipoResumo = (typeof TIPOS_RESUMO)[number]

const STATUS_ATIVOS = ["ABERTA", "EM_ANDAMENTO", "EM_ESPERA"] as const

const ENTRADAS_DIARIO = ["TELEFONEMA", "EMAIL", "REUNIAO", "NOTA"] as const
export type EntradaDiario = (typeof ENTRADAS_DIARIO)[number]

export type ItemResumo = {
  id:          number
  titulo:      string
  tipo:        TipoResumo
  status:      string
  prioridade:  string
  prazo:       string | null   // ISO
  createdAt:   string          // ISO
  concluidoAt: string | null   // ISO
}

export type MovimentoTipo = {
  tipo:       TipoResumo
  criadas:    number
  concluidas: number
  emAberto:   number   // das criadas no mês, quantas seguem abertas hoje
  canceladas: number   // das criadas no mês
}

export type PrazosMes = {
  total:          number  // itens cujo prazo caía neste mês
  noPrazo:        number  // concluídos até o prazo
  comAtraso:      number  // concluídos depois do prazo
  emAbertoVencido: number // ainda abertos e já vencidos
  emAbertoAVencer: number // ainda abertos, prazo no futuro (mês corrente)
  canceladas:     number
}

export type TempoDemanda = { demandaId: number; titulo: string; tipo: string; totalMin: number }

export type ResumoMes = {
  mesISO:       string
  mesAnterior:  string
  mesSeguinte:  string
  ehMesCorrente: boolean

  totalCriadas:    number
  totalConcluidas: number
  movimento:       MovimentoTipo[]
  prazos:          PrazosMes

  /** Dias corridos entre criação e conclusão, média dos concluídos no mês. */
  tempoMedioDias: number | null

  focoTotalMin:   number
  focoSessoes:    number
  focoDiasAtivos: number
  focoPorDemanda: TempoDemanda[]
  pomodoroCiclos: number
  pomodoroMin:    number

  tags: { nome: string; total: number }[]

  diarioDiasComRegistro: number
  diarioPorTipo:         { tipo: EntradaDiario; total: number }[]

  anterior: { criadas: number; concluidas: number; focoTotalMin: number }

  concluidas: ItemResumo[]
  atrasadas:  ItemResumo[]
}

function serializar(d: {
  id: number; titulo: string; tipo: string; status: string; prioridade: string
  prazo: Date | null; createdAt: Date; concluidoAt: Date | null
}): ItemResumo {
  return {
    id:          d.id,
    titulo:      d.titulo,
    tipo:        d.tipo as TipoResumo,
    status:      d.status,
    prioridade:  d.prioridade,
    prazo:       d.prazo?.toISOString() ?? null,
    createdAt:   d.createdAt.toISOString(),
    concluidoAt: d.concluidoAt?.toISOString() ?? null,
  }
}

const SELECT_ITEM = {
  id: true, titulo: true, tipo: true, status: true, prioridade: true,
  prazo: true, createdAt: true, concluidoAt: true,
} as const

export async function carregarResumoMes(
  companyId: number,
  userId: number,
  mesISO: string,
): Promise<ResumoMes> {
  const { inicio, fim }   = intervaloMesBRT(mesISO)
  const mesAnterior       = somarMesesISO(mesISO, -1)
  const mesSeguinte       = somarMesesISO(mesISO, 1)
  const intervaloAnterior = intervaloMesBRT(mesAnterior)
  const hoje              = hojeNoBrasil()
  const ehMesCorrente     = hoje >= inicio && hoje < fim

  const base = { companyId, userId, deletedAt: null, tipo: { not: "DIARIO" as const } }

  const [
    criadas, concluidas, comPrazoNoMes,
    sessoes, comentariosDiario, demandaTags,
    antCriadas, antConcluidas, antFoco,
  ] = await Promise.all([
    prisma.demanda.findMany({
      where:  { ...base, createdAt: { gte: inicio, lt: fim } },
      select: SELECT_ITEM,
      take:   2000,
    }),

    prisma.demanda.findMany({
      where:   { ...base, status: "CONCLUIDA", concluidoAt: { gte: inicio, lt: fim } },
      select:  SELECT_ITEM,
      orderBy: { concluidoAt: "asc" },
      take:    2000,
    }),

    prisma.demanda.findMany({
      where:  { ...base, prazo: { gte: inicio, lt: fim } },
      select: SELECT_ITEM,
      take:   2000,
    }),

    prisma.sessaoFoco.findMany({
      where:   { companyId, userId, iniciadoEm: { gte: inicio, lt: fim } },
      select:  { demandaId: true, duracaoMin: true, iniciadoEm: true,
                 demanda: { select: { titulo: true, tipo: true } } },
    }),

    prisma.comentario.findMany({
      where:  {
        companyId, userId, deletedAt: null,
        createdAt: { gte: inicio, lt: fim },
        tipo:      { in: [...ENTRADAS_DIARIO, "POMODORO"] },
        demanda:   { tipo: "DIARIO", deletedAt: null },
      },
      select: { tipo: true, conteudo: true, createdAt: true },
    }),

    prisma.demandaTag.findMany({
      where:  { companyId, demanda: { ...base, createdAt: { gte: inicio, lt: fim } } },
      select: { tag: { select: { nome: true } } },
    }),

    prisma.demanda.count({
      where: { ...base, createdAt: { gte: intervaloAnterior.inicio, lt: intervaloAnterior.fim } },
    }),

    prisma.demanda.count({
      where: { ...base, status: "CONCLUIDA",
               concluidoAt: { gte: intervaloAnterior.inicio, lt: intervaloAnterior.fim } },
    }),

    prisma.sessaoFoco.aggregate({
      _sum:  { duracaoMin: true },
      where: { companyId, userId,
               iniciadoEm: { gte: intervaloAnterior.inicio, lt: intervaloAnterior.fim } },
    }),
  ])

  // ── Movimento por tipo ──────────────────────────────────────────────────────
  const ativos: readonly string[] = STATUS_ATIVOS
  const movimento: MovimentoTipo[] = TIPOS_RESUMO.map((tipo) => ({
    tipo,
    criadas:    criadas.filter((d) => d.tipo === tipo).length,
    concluidas: concluidas.filter((d) => d.tipo === tipo).length,
    emAberto:   criadas.filter((d) => d.tipo === tipo && ativos.includes(d.status)).length,
    canceladas: criadas.filter((d) => d.tipo === tipo && d.status === "CANCELADA").length,
  }))

  // ── Prazos que venciam no mês ───────────────────────────────────────────────
  const prazos: PrazosMes = {
    total:           comPrazoNoMes.length,
    noPrazo:         0,
    comAtraso:       0,
    emAbertoVencido: 0,
    emAbertoAVencer: 0,
    canceladas:      0,
  }
  for (const d of comPrazoNoMes) {
    if (d.status === "CANCELADA") prazos.canceladas++
    else if (d.status === "CONCLUIDA") {
      // sem concluidoAt (registros antigos) conta como entregue no prazo
      if (!d.concluidoAt || !d.prazo || d.concluidoAt <= d.prazo) prazos.noPrazo++
      else prazos.comAtraso++
    }
    else if (d.prazo && d.prazo < hoje) prazos.emAbertoVencido++
    else prazos.emAbertoAVencer++
  }

  // ── Tempo médio de conclusão (dias corridos) ────────────────────────────────
  const comDuracao = concluidas.filter((d) => d.concluidoAt)
  const tempoMedioDias = comDuracao.length > 0
    ? comDuracao.reduce((acc, d) =>
        acc + (d.concluidoAt!.getTime() - d.createdAt.getTime()) / 86_400_000, 0) / comDuracao.length
    : null

  // ── Tempo de foco ───────────────────────────────────────────────────────────
  const focoMap  = new Map<number, TempoDemanda>()
  const diasFoco = new Set<string>()
  for (const s of sessoes) {
    const ex = focoMap.get(s.demandaId)
    if (ex) ex.totalMin += s.duracaoMin
    else focoMap.set(s.demandaId, {
      demandaId: s.demandaId,
      titulo:    s.demanda.titulo,
      tipo:      s.demanda.tipo,
      totalMin:  s.duracaoMin,
    })
    diasFoco.add(new Date(s.iniciadoEm.getTime() - 3 * 3600_000).toISOString().slice(0, 10))
  }
  const focoPorDemanda = Array.from(focoMap.values()).sort((a, b) => b.totalMin - a.totalMin)
  const focoTotalMin   = focoPorDemanda.reduce((acc, r) => acc + r.totalMin, 0)

  // ── Diário: pomodoro + registros ────────────────────────────────────────────
  const pomodoros     = comentariosDiario.filter((c) => c.tipo === "POMODORO")
  const pomodoroMin   = pomodoros.reduce((acc, c) => {
    const m = c.conteudo.match(/(\d+)\s*min/)
    return acc + (m ? Number(m[1]) : 0)
  }, 0)

  const manuais = comentariosDiario.filter((c) =>
    (ENTRADAS_DIARIO as readonly string[]).includes(c.tipo))
  const diarioPorTipo = ENTRADAS_DIARIO
    .map((tipo) => ({ tipo, total: manuais.filter((c) => c.tipo === tipo).length }))
    .filter((e) => e.total > 0)
  const diarioDiasComRegistro = new Set(
    manuais.map((c) => new Date(c.createdAt.getTime() - 3 * 3600_000).toISOString().slice(0, 10)),
  ).size

  // ── Tags mais usadas ────────────────────────────────────────────────────────
  const tagMap = new Map<string, number>()
  for (const dt of demandaTags) tagMap.set(dt.tag.nome, (tagMap.get(dt.tag.nome) ?? 0) + 1)
  const tags = Array.from(tagMap.entries())
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
    .slice(0, 12)

  // ── Atrasadas hoje (visão de situação, não do mês fechado) ──────────────────
  const atrasadas = comPrazoNoMes
    .filter((d) => ativos.includes(d.status) && d.prazo && d.prazo < hoje)
    .sort((a, b) => (a.prazo?.getTime() ?? 0) - (b.prazo?.getTime() ?? 0))

  return {
    mesISO, mesAnterior, mesSeguinte, ehMesCorrente,

    totalCriadas:    criadas.length,
    totalConcluidas: concluidas.length,
    movimento,
    prazos,
    tempoMedioDias,

    focoTotalMin,
    focoSessoes:    sessoes.length,
    focoDiasAtivos: diasFoco.size,
    focoPorDemanda,
    pomodoroCiclos: pomodoros.length,
    pomodoroMin,

    tags,

    diarioDiasComRegistro,
    diarioPorTipo,

    anterior: {
      criadas:      antCriadas,
      concluidas:   antConcluidas,
      focoTotalMin: antFoco._sum.duracaoMin ?? 0,
    },

    concluidas: concluidas.map(serializar),
    atrasadas:  atrasadas.map(serializar),
  }
}

/** 135 → "2h 15min" */
export function formatMin(min: number): string {
  if (min <= 0) return "0min"
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/** Variação percentual entre dois períodos; null quando a base é zero. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((atual - anterior) / anterior) * 100)
}
