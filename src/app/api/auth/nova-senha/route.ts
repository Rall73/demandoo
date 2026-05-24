import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Dados ausentes." }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter no mínimo 8 caracteres." }, { status: 400 })
    }

    const vt = await prisma.verificationToken.findUnique({ where: { token } })

    if (!vt || !vt.identifier.startsWith("reset:")) {
      return NextResponse.json({ error: "Link inválido ou já utilizado." }, { status: 400 })
    }

    if (vt.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => null)
      return NextResponse.json({ error: "Link expirado. Solicite um novo." }, { status: 400 })
    }

    const email        = vt.identifier.replace(/^reset:/, "")
    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data:  { passwordHash },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/auth/nova-senha]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
