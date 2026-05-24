import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/** Remove um membro da equipe (soft delete). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Apenas administradores." }, { status: 403 })

    const { userId } = await params
    const targetId  = Number(userId)
    const companyId = session.user.companyId
    const selfId    = Number(session.user.id)

    if (targetId === selfId) {
      return NextResponse.json({ error: "Você não pode remover a si mesmo." }, { status: 400 })
    }

    const target = await prisma.user.findFirst({
      where: { id: targetId, companyId, deletedAt: null },
    })
    if (!target) return NextResponse.json({ error: "Membro não encontrado." }, { status: 404 })

    // Soft delete
    await prisma.user.update({
      where: { id: targetId },
      data:  { deletedAt: new Date(), active: false },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/equipe/[userId]]", err)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}
