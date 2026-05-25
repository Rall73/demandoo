import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Building2, Users, Zap, CheckCircle, XCircle } from "lucide-react"

export default async function AdminEmpresasPage() {
  const empresas = await prisma.company.findMany({
    where: { deletedAt: null },
    include: {
      plan: { select: { name: true, slug: true } },
      _count: { select: { users: { where: { deletedAt: null, active: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-500 text-sm mt-1">{empresas.length} tenants cadastrados</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 font-medium">Plano</th>
                <th className="text-right px-4 py-3 font-medium">
                  <span className="flex items-center justify-end gap-1"><Users size={12} /> Usuários</span>
                </th>
                <th className="text-right px-4 py-3 font-medium">
                  <span className="flex items-center justify-end gap-1"><Zap size={12} /> IA usada</span>
                </th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-semibold text-slate-900">{empresa.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{empresa.slug} · {empresa.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      empresa.plan.slug === "free"             ? "bg-slate-100 text-slate-600" :
                      empresa.plan.slug === "trial"            ? "bg-blue-100 text-blue-700" :
                      empresa.plan.slug?.includes("equipe")   ? "bg-emerald-100 text-emerald-700" :
                                                                 "bg-violet-100 text-violet-700"
                    }`}>
                      {empresa.plan.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="flex items-center justify-end gap-1 text-slate-700">
                      <Building2 size={13} className="text-slate-400" />
                      {empresa._count.users}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="font-medium text-slate-700">{empresa.aiUsedTotal.toLocaleString("pt-BR")}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {empresa.active ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle size={13} strokeWidth={2} /> Ativa
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <XCircle size={13} strokeWidth={2} /> Suspensa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {empresa.createdAt.toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {empresas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">
                    Nenhuma empresa cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
