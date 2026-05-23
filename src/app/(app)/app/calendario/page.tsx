import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, Calendar as CalIcon, ChevronLeft, ChevronRight } from "lucide-react"
import CalendarioGrid from "./CalendarioGrid"

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>
}) {
  const session   = await auth()
  const companyId = session!.user.companyId
  const userId    = Number(session!.user.id)

  const { ano: anoStr, mes: mesStr } = await searchParams

  const agora    = new Date(Date.now() - 3 * 3600000) // BRT
  const anoNow   = anoStr ? Number(anoStr) : agora.getUTCFullYear()
  const mesNow   = mesStr ? Number(mesStr) : agora.getUTCMonth() + 1

  const inicio = new Date(Date.UTC(anoNow, mesNow - 1, 1) + 3 * 3600000)
  const fim    = new Date(Date.UTC(anoNow, mesNow, 1)     + 3 * 3600000)

  const demandas = await prisma.demanda.findMany({
    where: { companyId, userId, deletedAt: null, prazo: { gte: inicio, lt: fim } },
    select: { id: true, titulo: true, tipo: true, status: true, prioridade: true, prazo: true },
    orderBy: { prazo: "asc" },
  })

  const items = demandas.map((d) => ({
    id:        d.id,
    titulo:    d.titulo,
    tipo:      d.tipo,
    status:    d.status,
    prioridade: d.prioridade,
    diaBrt:    new Date(d.prazo!.getTime() - 3 * 3600000).toISOString().slice(0, 10),
  }))

  const mesAnterior = mesNow === 1 ? 12 : mesNow - 1
  const anoAnterior = mesNow === 1 ? anoNow - 1 : anoNow
  const mesSeguinte = mesNow === 12 ? 1 : mesNow + 1
  const anoSeguinte = mesNow === 12 ? anoNow + 1 : anoNow

  const nomeMes = new Date(Date.UTC(anoNow, mesNow - 1, 1)).toLocaleDateString("pt-BR", {
    timeZone: "UTC", month: "long", year: "numeric",
  })

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/app" className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} strokeWidth={2} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalIcon size={24} className="text-violet-600" strokeWidth={2} />
          Calendário
        </h1>
      </div>

      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4">
        <Link href={`/app/calendario?ano=${anoAnterior}&mes=${mesAnterior}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={16} /> Anterior
        </Link>
        <span className="font-semibold text-slate-800 capitalize">{nomeMes}</span>
        <Link href={`/app/calendario?ano=${anoSeguinte}&mes=${mesSeguinte}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          Próximo <ChevronRight size={16} />
        </Link>
      </div>

      <CalendarioGrid ano={anoNow} mes={mesNow} items={items} />
    </div>
  )
}
