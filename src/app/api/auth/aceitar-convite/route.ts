import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { token, name, password } = await req.json()

    if (!token || !name || !password) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter ao menos 8 caracteres." }, { status: 400 })
    }

    const record = await prisma.verificationToken.findUnique({ where: { token } })
    if (!record || !record.identifier.startsWith("invite:")) {
      return NextResponse.json({ error: "Convite inválido ou já utilizado." }, { status: 400 })
    }
    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => null)
      return NextResponse.json({ error: "Este convite expirou. Peça ao administrador que envie um novo." }, { status: 400 })
    }

    // identifier = "invite:${companyId}:${email}"
    const parts     = record.identifier.split(":")
    const companyId = Number(parts[1])
    const email     = parts.slice(2).join(":")

    if (!companyId || !email) {
      return NextResponse.json({ error: "Convite malformado." }, { status: 400 })
    }

    // Verifica se o e-mail já foi cadastrado
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Este e-mail já possui uma conta. Faça login normalmente." }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Cria usuário na empresa existente
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          companyId,
          name:          name.trim(),
          email,
          passwordHash,
          emailVerified: new Date(), // convite via e-mail já valida o endereço
          role:          "USER",
          lgpdConsentAt: new Date(),
        },
      })

      await tx.verificationToken.delete({ where: { token } })
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/auth/aceitar-convite]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
