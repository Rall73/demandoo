import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOpenAI } from "@/lib/openai"

type Ctx = { params: Promise<{ id: string }> }

// ── GET — lista comentários ───────────────────────────────────────────────────
export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    // Confirma que a demanda pertence ao usuário
    const demanda = await prisma.demanda.findFirst({
      where: { id: Number(id), companyId, userId, deletedAt: null },
      select: { id: true },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const comentarios = await prisma.comentario.findMany({
      where:   { demandaId: Number(id), companyId, deletedAt: null },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({ comentarios })
  } catch (err) {
    console.error("[GET /comentarios]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ── POST — adiciona comentário ────────────────────────────────────────────────
export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    // Confirma que a demanda pertence ao usuário
    const demanda = await prisma.demanda.findFirst({
      where: { id: Number(id), companyId, userId, deletedAt: null },
      select: { id: true },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const body: { conteudo?: string; audioUrl?: string; tipo?: string } = await req.json()

    let conteudo = (body.conteudo ?? "").trim()
    const audioUrl = body.audioUrl ?? null
    const tipo     = body.tipo === "AUDIO" ? "AUDIO" : "NOTA"

    // ── Se vier áudio, transcreve com Whisper ─────────────────────────────────
    if (audioUrl && tipo === "AUDIO") {
      try {
        const openai        = getOpenAI()
        const audioResponse = await fetch(audioUrl)
        const audioBuffer   = await audioResponse.arrayBuffer()
        const audioFile     = new File([audioBuffer], "audio.webm", { type: "audio/webm" })

        const transcription = await openai.audio.transcriptions.create({
          model:    "whisper-1",
          file:     audioFile,
          language: "pt",
        })
        conteudo = transcription.text
      } catch (err) {
        console.error("[Whisper comentário]", err)
        conteudo = conteudo || "(Transcrição indisponível)"
      }
    }

    if (!conteudo) return NextResponse.json({ error: "Conteúdo vazio" }, { status: 400 })

    const comentario = await prisma.comentario.create({
      data: {
        demandaId: Number(id),
        userId,
        companyId,
        conteudo,
        audioUrl,
        tipo,
      },
      include: { user: { select: { name: true } } },
    })

    return NextResponse.json({ ok: true, comentario })
  } catch (err) {
    console.error("[POST /comentarios]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
