import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail, sendDefinePasswordEmail } from "@/lib/email"
import { ipDaRequisicao, permitirPorIp, segundosParaLiberar } from "@/lib/rate-limit"
import crypto from "crypto"

export async function POST(req: Request) {
  try {
    // Este endpoint dispara e-mail para qualquer endereço informado. Sem limite,
    // vira ferramenta de bombardeio contra terceiros — e queima a reputação do
    // SMTP do domínio, derrubando os e-mails legítimos junto.
    const ip    = ipDaRequisicao(req)
    const chave = `esqueci-senha:${ip}`
    if (!permitirPorIp(ip, "esqueci-senha", 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
        { status: 429, headers: { "Retry-After": String(segundosParaLiberar(chave)) } },
      )
    }

    const { email } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // E-mail não existe ou conta deletada → resposta silenciosa (evita enumeração)
    if (!user || user.deletedAt) {
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

    // Conta Google (sem senha): envia e-mail para CRIAR senha pela 1ª vez
    if (!user.passwordHash) {
      sendDefinePasswordEmail(email, token).catch(console.error)
      return NextResponse.json({ ok: true, isGoogleAccount: true })
    }

    // Conta normal: envia e-mail de reset
    sendPasswordResetEmail(email, token).catch(console.error)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/auth/esqueci-senha]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
