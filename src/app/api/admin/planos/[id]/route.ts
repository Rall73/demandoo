import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/admin/planos/[id]
 * Atualiza dados de um plano. Restrito ao super-admin.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.email || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 })
  }

  const { id } = await params
  const planId = Number(id)
  if (!planId || isNaN(planId)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 })
  }

  let body: {
    name?: string
    priceCents?: number
    aiQuota?: number | null
    maxUsers?: number
    active?: boolean
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 })
  }

  // Validações básicas
  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json({ error: "Nome não pode ser vazio." }, { status: 422 })
  }
  if (body.priceCents !== undefined && (isNaN(body.priceCents) || body.priceCents < 0)) {
    return NextResponse.json({ error: "Preço inválido." }, { status: 422 })
  }
  if (body.maxUsers !== undefined && (isNaN(body.maxUsers) || body.maxUsers < 1)) {
    return NextResponse.json({ error: "Max usuários inválido." }, { status: 422 })
  }

  try {
    const plano = await prisma.plan.update({
      where: { id: planId },
      data: {
        ...(body.name        !== undefined && { name:       body.name.trim() }),
        ...(body.priceCents  !== undefined && { priceCents: body.priceCents }),
        ...(body.aiQuota     !== undefined && { aiQuota:    body.aiQuota }),
        ...(body.maxUsers    !== undefined && { maxUsers:   body.maxUsers }),
        ...(body.active      !== undefined && { active:     body.active }),
      },
    })
    return NextResponse.json({ ok: true, plano })
  } catch {
    return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 })
  }
}
