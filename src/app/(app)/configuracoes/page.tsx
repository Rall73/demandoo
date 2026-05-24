import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Settings, CheckCircle } from "lucide-react"
import PerfilForm  from "./PerfilForm"
import EmailForm   from "./EmailForm"
import SenhaForm   from "./SenhaForm"
import PlanoCard   from "./PlanoCard"

interface Props {
  searchParams: Promise<{ emailAtualizado?: string }>
}

export default async function ConfiguracoesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")

  const userId    = Number(session.user.id)
  const companyId = session.user.companyId

  const [user, company] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { name: true, email: true, avatarUrl: true, passwordHash: true },
    }),
    prisma.company.findUnique({
      where:   { id: companyId },
      include: { plan: true },
    }),
  ])

  if (!user || !company) redirect("/auth/login")

  const { emailAtualizado } = await searchParams

  return (
    <div className="p-4 md:p-8 max-w-2xl">

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
          <Settings size={18} className="text-violet-600" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-500">Gerencie seu perfil e conta</p>
        </div>
      </div>

      {/* Banner: e-mail atualizado com sucesso */}
      {emailAtualizado === "true" && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-6">
          <CheckCircle size={16} />
          E-mail atualizado com sucesso! Faça login novamente para aplicar a mudança.
        </div>
      )}

      <div className="space-y-6">
        {/* Card 1: Perfil (nome + avatar) */}
        <PerfilForm
          initialName={user.name}
          initialAvatarUrl={user.avatarUrl}
        />

        {/* Card 2: Troca de e-mail */}
        <EmailForm
          currentEmail={user.email}
          hasPassword={!!user.passwordHash}
        />

        {/* Card 3: Senha */}
        <SenhaForm hasPassword={!!user.passwordHash} />

        {/* Card 4: Plano */}
        <PlanoCard
          planSlug={company.plan.slug}
          planName={company.plan.name}
          aiQuota={company.plan.aiQuota}
          aiUsedTotal={company.aiUsedTotal}
          planExpiresAt={company.planExpiresAt}
        />
      </div>
    </div>
  )
}
