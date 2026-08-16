import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"
import { ipDaRequisicao, permitirPorIp, segundosParaLiberar } from "@/lib/rate-limit"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    const ip    = ipDaRequisicao(req)
    const chave = `cadastro:${ip}`
    // 5 cadastros por hora por IP. Um escritório atrás de um NAT só pode ter
    // várias pessoas se cadastrando no mesmo dia; bot tenta em série.
    if (!permitirPorIp(ip, "cadastro", 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
        { status: 429, headers: { "Retry-After": String(segundosParaLiberar(chave)) } },
      )
    }

    const { name, email, password, lgpdConsent, companyName, website } = await req.json()

    // Honeypot: `website` é um campo escondido no formulário. Humano nunca vê,
    // logo nunca preenche; bot que preenche tudo se entrega. Respondemos como
    // se tivesse dado certo — sem criar nada — para não ensinar o bot a desviar.
    if (typeof website === "string" && website.trim() !== "") {
      console.warn("[cadastro] honeypot acionado", { ip })
      return NextResponse.json({ ok: true, message: "Verifique seu e-mail para ativar a conta." })
    }

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
