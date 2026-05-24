import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/** Lista membros da empresa e convites pendentes. */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = session.user.companyId

    const [members, invites, company] = await Promise.all([
      prisma.user.findMany({
        where:   { companyId, deletedAt: null },
        select:  { id: true, name: true, email: true, role: true, createdAt: true, avatarUrl: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.verificationToken.findMany({
        where: { identifier: { startsWith: `invite:${companyId}:` } },
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

    return NextResponse.json({
      members,
      pendingInvites,
      maxUsers: company?.plan.maxUsers ?? 1,
    })
  } catch (err) {
    console.error("[GET /api/equipe]", err)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}
