import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const userId = Number(session.user.id)
    const { name } = await req.json()

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nome deve ter ao menos 2 caracteres." }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data:  { name: name.trim() },
      select: { name: true },
    })

    return NextResponse.json({ ok: true, name: updated.name })
  } catch (err) {
    console.error("[PATCH /api/configuracoes/perfil]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
