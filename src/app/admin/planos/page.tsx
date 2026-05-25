import { prisma } from "@/lib/prisma"
import { Check, X, Zap, Users } from "lucide-react"
import PlanoEditForm from "./PlanoEditForm"

export default async function AdminPlanosPage() {
  const [planos, empresasPorPlano] = await Promise.all([
    prisma.plan.findMany({ orderBy: { id: "asc" } }),
    prisma.company.groupBy({
      by: ["planId"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
  ])

  const countMap = Object.fromEntries(
    empresasPorPlano.map(({ planId, _count }) => [planId, _count.id])
  )

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Planos</h1>
        <p className="text-slate-500 text-sm mt-1">{planos.length} planos cadastrados — clique no lápis para editar</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-right px-4 py-3 font-medium">Preço</th>
                <th className="text-right px-4 py-3 font-medium">
                  <span className="flex items-center justify-end gap-1"><Zap size={12} /> Quota IA</span>
                </th>
                <th className="text-right px-4 py-3 font-medium">
                  <span className="flex items-center justify-end gap-1"><Users size={12} /> Max usuários</span>
                </th>
                <th className="text-right px-4 py-3 font-medium">Empresas</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {planos.map((plano) => (
                <tr key={plano.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <code className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                      {plano.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-900">{plano.name}</td>
                  <td className="px-4 py-3.5 text-right text-slate-700">
                    {plano.priceCents === 0
                      ? <span className="text-emerald-600 font-medium">Grátis</span>
                      : `R$ ${(plano.priceCents / 100).toFixed(0)}/mês`
                    }
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {plano.aiQuota === null
                      ? <span className="text-violet-600 font-medium">Ilimitada</span>
                      : <span className="text-slate-700">{plano.aiQuota.toLocaleString("pt-BR")}</span>
                    }
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-700">{plano.maxUsers}</td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`font-semibold ${
                      (countMap[plano.id] ?? 0) > 0 ? "text-violet-600" : "text-slate-400"
                    }`}>
                      {countMap[plano.id] ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {plano.active ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <Check size={12} strokeWidth={2.5} /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <X size={12} strokeWidth={2} /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <PlanoEditForm plano={plano} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Alterações de preço e quota são imediatas — empresas existentes ficam no plano atual até fazerem upgrade.
      </p>
    </div>
  )
}
