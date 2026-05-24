import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Users } from "lucide-react"
import EquipeClient from "./EquipeClient"

export default async function EquipePage() {
  const session = await auth()
  if (!session?.user) redirect("/auth/login")
  if (session.user.role !== "ADMIN") redirect("/app")

  const companyId    = session.user.companyId
  const currentUserId = Number(session.user.id)

  const [members, invites, company] = await Promise.all([
    prisma.user.findMany({
      where:   { companyId, deletedAt: null },
      select:  { id: true, name: true, email: true, role: true, createdAt: true, avatarUrl: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.verificationToken.findMany({
      where:   { identifier: { startsWith: `invite:${companyId}:` } },
      orderBy: { expires: "desc" },
    }),
    prisma.company.findUnique({
      where:   { id: companyId },
      include: { plan: { select: { maxUsers: true } } },
    }),
  ])

  const pendingInvites = invites.map(inv => ({
    token:   inv.token,
    email:   inv.identifier.split(":").slice(2).join(":"),
    expires: inv.expires.toISOString(),
  }))

  const serializedMembers = members.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }))

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
          <Users size={18} className="text-violet-600" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Equipe</h1>
          <p className="text-sm text-slate-500">Gerencie os membros da sua empresa</p>
        </div>
      </div>

      <EquipeClient
        members={serializedMembers}
        pendingInvites={pendingInvites}
        maxUsers={company?.plan.maxUsers ?? 1}
        currentUserId={currentUserId}
      />
    </div>
  )
}
