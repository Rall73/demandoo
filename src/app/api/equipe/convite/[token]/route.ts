import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/** Cancela um convite pendente. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Apenas administradores." }, { status: 403 })

    const { token } = await params
    const companyId = session.user.companyId

    const record = await prisma.verificationToken.findUnique({ where: { token } })
    if (!record || !record.identifier.startsWith(`invite:${companyId}:`)) {
      return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 })
    }

    await prisma.verificationToken.delete({ where: { token } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/equipe/convite/[token]]", err)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}
