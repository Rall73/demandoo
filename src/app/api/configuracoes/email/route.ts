import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendEmailChangeEmail } from "@/lib/email"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const userId = Number(session.user.id)
    const { newEmail, password } = await req.json()

    if (!newEmail || !newEmail.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }

    const normalizedEmail = newEmail.trim().toLowerCase()

    if (normalizedEmail === session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "O novo e-mail é igual ao atual." }, { status: 400 })
    }

    // Busca o usuário atual
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 })
    }

    // Contas com senha: valida senha atual
    if (user.passwordHash) {
      if (!password) {
        return NextResponse.json({ error: "Informe sua senha atual para confirmar a troca." }, { status: 400 })
      }
      const valid = await bcrypt.compare(String(password), user.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: "Senha incorreta." }, { status: 400 })
      }
    }

    // Verifica se o novo e-mail já está em uso
    const emailTaken = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (emailTaken) {
      return NextResponse.json({ error: "Este e-mail já está em uso por outra conta." }, { status: 409 })
    }

    // Remove tokens anteriores de email-change para este usuário
    await prisma.verificationToken.deleteMany({
      where: { identifier: { startsWith: `email-change:${userId}:` } },
    })

    const token   = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    await prisma.verificationToken.create({
      data: {
        identifier: `email-change:${userId}:${normalizedEmail}`,
        token,
        expires,
      },
    })

    // Envia e-mail de confirmação para o NOVO endereço
    sendEmailChangeEmail(normalizedEmail, token).catch(console.error)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/configuracoes/email]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
