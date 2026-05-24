import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Resposta idêntica independente de o e-mail existir (evita enumeração)
    if (!user || !user.passwordHash || user.deletedAt) {
      return NextResponse.json({ ok: true })
    }

    const token   = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1h

    // Remove token anterior se houver
    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${email}` },
    })

    await prisma.verificationToken.create({
      data: { identifier: `reset:${email}`, token, expires },
    })

    sendPasswordResetEmail(email, token).catch(console.error)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/auth/esqueci-senha]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
