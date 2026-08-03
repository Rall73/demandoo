import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hojeISOBrasil, parseDateBRT, toDateBRT } from "@/lib/date"
import DiarioClient from "./DiarioClient"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>
}) {
  const { data } = await searchParams
  const dataISO = data ?? hojeISOBrasil()
  const [ano, mes, dia] = dataISO.split("-")
  return { title: `Diário ${dia}/${mes}/${ano} — demandoo` }
}

export default async function DiarioPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>
}) {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)

  const hojeISO = hojeISOBrasil()

  const { data: dataParam } = await searchParams
  // Nunca mostra datas futuras — limita ao dia de hoje
  const dataISO   = (dataParam && dataParam <= hojeISO) ? dataParam : hojeISO
  const inicioDia = parseDateBRT(dataISO)
  const fimDia    = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000)

  const ehUltimoDia = dataISO >= hojeISO

  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    weekday:  "long",
    day:      "2-digit",
    month:    "2-digit",
    year:     "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(inicioDia)

  // Encontra ou cria o DIARIO do dia
  let diario = await prisma.demanda.findFirst({
    where: {
      companyId,
      userId,
      tipo:      "DIARIO",
      prazo:     { gte: inicioDia, lt: fimDia },
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!diario) {
    const titulo = `Diário — ${dataISO.split("-").reverse().join("/")}`
    diario = await prisma.demanda.create({
      data: {
        companyId,
        userId,
        titulo,
        tipo:       "DIARIO",
        status:     "ABERTA",
        prazo:      inicioDia,
        prioridade: "MEDIA",
      },
      select: { id: true },
    })
  }

  // Dia anterior mais recente que tenha ao menos 1 entrada registrada
  const diarioAnterior = await prisma.demanda.findFirst({
    where: {
      companyId,
      userId,
      tipo:      "DIARIO",
      deletedAt: null,
      prazo:     { lt: inicioDia },
      comentarios: {
        some: { deletedAt: null, tipo: { notIn: ["STATUS"] } },
      },
    },
    orderBy: { prazo: "desc" },
    select:  { prazo: true },
  })
  const prevData = diarioAnterior?.prazo ? toDateBRT(diarioAnterior.prazo) : null

  // Busca paralela de todos os dados do dia
  const [demandasHoje, acoesHoje, comentarios, sessoesHoje, demandasAtivas] = await Promise.all([
    prisma.demanda.findMany({
      where: {
        companyId,
        userId,
        deletedAt: null,
        tipo:      { not: "DIARIO" },
        status:    { notIn: ["CONCLUIDA", "CANCELADA"] },
        prazo:     { gte: inicioDia, lt: fimDia },
      },
      select:  { id: true, titulo: true, tipo: true, status: true, prioridade: true },
      orderBy: [{ prioridade: "asc" }, { titulo: "asc" }],
    }),

    // Inclui as já cumpridas: elas seguem no dia, marcadas — não somem ao concluir
    prisma.acaoDemanda.findMany({
      where: {
        deletedAt: null,
        prazo:     { gte: inicioDia, lt: fimDia },
        demanda:   { companyId, userId, deletedAt: null },
      },
      select: {
        id:        true,
        descricao: true,
        feita:     true,
        demanda:   { select: { id: true, titulo: true, tipo: true } },
      },
      // ordem fixa: a ação não muda de lugar ao ser marcada
      orderBy: { id: "asc" },
    }),

    prisma.comentario.findMany({
      where:   { demandaId: diario.id, deletedAt: null, tipo: { notIn: ["STATUS"] } },
      orderBy: { createdAt: "asc" },
      select:  { id: true, conteudo: true, tipo: true, createdAt: true },
    }),

    prisma.sessaoFoco.findMany({
      where:   { companyId, userId, iniciadoEm: { gte: inicioDia, lt: fimDia } },
      include: { demanda: { select: { id: true, titulo: true, tipo: true } } },
    }),

    prisma.demanda.findMany({
      where:   { companyId, userId, deletedAt: null, tipo: { not: "DIARIO" } },
      select:  { id: true, titulo: true, tipo: true },
      orderBy: { createdAt: "desc" },
      take:    200,
    }),
  ])

  const sessoesSerializadas = sessoesHoje.map((s) => ({
    id:            s.id,
    demandaId:     s.demandaId,
    demandaTitulo: s.demanda.titulo,
    demandaTipo:   s.demanda.tipo as string,
    iniciadoEm:    s.iniciadoEm.toISOString(),
    encerradoEm:   s.encerradoEm.toISOString(),
    duracaoMin:    s.duracaoMin,
  }))

  return (
    <DiarioClient
      key={dataISO}
      dataISO={dataISO}
      dataFormatada={dataFormatada}
      diarioId={diario.id}
      prevData={prevData}
      ehUltimoDia={ehUltimoDia}
      demandasHoje={demandasHoje.map((d) => ({
        id:         d.id,
        titulo:     d.titulo,
        tipo:       d.tipo as string,
        status:     d.status as string,
        prioridade: d.prioridade as string,
      }))}
      acoesHoje={acoesHoje.map((a) => ({
        id:        a.id,
        descricao: a.descricao,
        feita:     a.feita,
        demanda:   { id: a.demanda.id, titulo: a.demanda.titulo, tipo: a.demanda.tipo as string },
      }))}
      comentariosIniciais={comentarios.map((c) => ({
        id:        c.id,
        conteudo:  c.conteudo,
        tipo:      c.tipo,
        createdAt: c.createdAt.toISOString(),
      }))}
      sessoes={sessoesSerializadas}
      demandasAtivas={demandasAtivas.map((d) => ({ id: d.id, titulo: d.titulo, tipo: d.tipo as string }))}
    />
  )
}
