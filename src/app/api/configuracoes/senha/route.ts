import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const userId = Number(session.user.id)
    const { currentPassword, newPassword } = await req.json()

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "A nova senha deve ter ao menos 8 caracteres." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    // Conta com senha existente: valida a senha atual
    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Informe sua senha atual." }, { status: 400 })
      }
      const valid = await bcrypt.compare(String(currentPassword), user.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 })
      }
    }

    const hash = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data:  { passwordHash: hash },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/configuracoes/senha]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
