import { prisma } from "@/lib/prisma"
import { CheckCircle, XCircle, ShieldCheck, User } from "lucide-react"

export default async function AdminUsuariosPage() {
  const usuarios = await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      company: {
        include: { plan: { select: { name: true, slug: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
        <p className="text-slate-500 text-sm mt-1">{usuarios.length} usuários cadastrados</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Usuário</th>
                <th className="text-left px-4 py-3 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 font-medium">Plano</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">E-mail verificado</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Cadastrado em</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                          <User size={14} className="text-violet-500" strokeWidth={2} />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 text-xs">{user.company.name}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      user.company.plan.slug === "free"           ? "bg-slate-100 text-slate-600" :
                      user.company.plan.slug === "trial"          ? "bg-blue-100 text-blue-700" :
                      user.company.plan.slug?.includes("equipe") ? "bg-emerald-100 text-emerald-700" :
                                                                    "bg-violet-100 text-violet-700"
                    }`}>
                      {user.company.plan.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {user.role === "ADMIN" ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-violet-600">
                        <ShieldCheck size={12} strokeWidth={2} /> Admin
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <User size={12} strokeWidth={2} /> Usuário
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {user.emailVerified ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs">
                        <CheckCircle size={12} strokeWidth={2} /> Verificado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-500 text-xs">
                        <XCircle size={12} strokeWidth={2} /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {user.active ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle size={12} strokeWidth={2} /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                        <XCircle size={12} strokeWidth={2} /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">
                    {user.createdAt.toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400 text-sm">
                    Nenhum usuário cadastrado.
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
