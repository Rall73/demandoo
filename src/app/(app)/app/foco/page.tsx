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
    },
    orderBy: [{ prioridade: "asc" }, { prazo: "asc" }, { createdAt: "desc" }],
    take: 200,
  })

  const serialized: DemandaFoco[] = demandas.map((d) => ({
    id:               d.id,
    titulo:           d.titulo,
    tipo:             d.tipo,
    status:           d.status as DemandaFoco["status"],
    prioridade:       d.prioridade,
    prazo:            d.prazo?.toISOString() ?? null,
    delegadoNome:     d.delegadoNome,
    focoIniciadoEm:   d.focoIniciadoEm?.toISOString() ?? null,
    focoMotivoEspera: d.focoMotivoEspera,
  }))

  return <FocoBoard demandas={serialized} />
}
