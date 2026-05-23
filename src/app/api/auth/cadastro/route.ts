import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const { name, email, password, lgpdConsent, companyName } = await req.json()

    // Validações básicas
    if (!name || !email || !password || !lgpdConsent) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "A senha deve ter no mínimo 8 caracteres" }, { status: 400 })
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 })
    }

    // Verifica duplicata
    const existente = await prisma.user.findUnique({ where: { email } })
    if (existente) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 })
    }

    // Slug da empresa
    const nomeEmpresa = companyName || name
    const baseSlug = nomeEmpresa.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50)
    const slugFinal = `${baseSlug}-${Date.now()}`

    const passwordHash = await bcrypt.hash(password, 12)
    const verificationToken = crypto.randomBytes(32).toString("hex")
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    // Cria empresa + usuário admin + token de verificação
    const user = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name:    nomeEmpresa,
          slug:    slugFinal,
          email,
          planId:  1, // free
        },
      })

      const newUser = await tx.user.create({
        data: {
          companyId:    company.id,
          name,
          email,
          passwordHash,
          role:         "ADMIN",
          lgpdConsentAt: new Date(),
        },
      })

      await tx.verificationToken.create({
        data: {
          identifier: email,
          token:      verificationToken,
          expires:    tokenExpires,
        },
      })

      return newUser
    })

    // Envia e-mail de verificação (não bloqueia o retorno)
    sendVerificationEmail(user.email, verificationToken).catch(console.error)

    return NextResponse.json({ ok: true, message: "Verifique seu e-mail para ativar a conta." })
  } catch (err) {
    console.error("[POST /api/auth/cadastro]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
