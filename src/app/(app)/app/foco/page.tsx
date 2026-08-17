import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import FocoBoard, { type DemandaFoco } from "./FocoBoard"

export const metadata = { title: "Foco — demandoo" }

export default async function FocoPage() {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)

  const demandas = await prisma.demanda.findMany({
    where: {
      companyId,
      userId,
      deletedAt: null,
      tipo:   { not: "DIARIO" },
      status: { notIn: ["CONCLUIDA", "CANCELADA"] },
    },
    select: {
      id:               true,
      titulo:           true,
      tipo:             true,
      status:           true,
      prioridade:       true,
      prazo:            true,
      delegadoNome:     true,
      focoIniciadoEm:   true,
      focoMotivoEspera: true,
      createdAt:        true,
      // Só o necessário para as abas: quem recebeu, de quem veio e se já
      // respondeu. Tudo dentro das MINHAS demandas — nada cruza usuário aqui.
      delegacoesFeitas: {
        select: {
          respondidoAt: true,
          prazoRetorno: true,
          delegadoPara: { select: { name: true } },
        },
      },
      delegacaoRecebida: {
        select: {
          respondidoAt: true,
          prazoRetorno: true,
          delegadoPor: { select: { name: true } },
        },
      },
    },
    orderBy: [{ prioridade: "asc" }, { prazo: "asc" }, { createdAt: "desc" }],
    take: 200,
  })

  const serialized: DemandaFoco[] = demandas.map((d) => ({
    id:               d.id,
    titulo:           d.titulo,
    tipo:             d.tipo as DemandaFoco["tipo"],
    status:           d.status as DemandaFoco["status"],
    prioridade:       d.prioridade,
    prazo:            d.prazo?.toISOString() ?? null,
    delegadoNome:     d.delegadoNome,
    focoIniciadoEm:   d.focoIniciadoEm?.toISOString() ?? null,
    focoMotivoEspera: d.focoMotivoEspera,
    createdAt:        d.createdAt.toISOString(),
    delegadaPara:     d.delegacoesFeitas.map((x) => x.delegadoPara.name),
    delegadaRespondida: d.delegacoesFeitas.length > 0
      && d.delegacoesFeitas.every((x) => x.respondidoAt !== null),
    recebidaDe:       d.delegacaoRecebida?.delegadoPor.name ?? null,
    recebidaRespondida: d.delegacaoRecebida?.respondidoAt != null,
    prazoRetorno:     (d.delegacaoRecebida?.prazoRetorno
                       ?? d.delegacoesFeitas[0]?.prazoRetorno)?.toISOString() ?? null,
  }))

  return <FocoBoard demandas={serialized} />
}
