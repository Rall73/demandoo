import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOpenAI } from "@/lib/openai"

type Ctx = { params: Promise<{ id: string }> }

type ItemExtraido = {
  texto: string
  dataVencimento?: string | null
  recorrente?: boolean
}

// ── GET — itens da lista ──────────────────────────────────────────────────────
export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId

    const lista = await prisma.lista.findFirst({
      where: { id: Number(id), companyId, deletedAt: null },
      select: { id: true },
    })
    if (!lista) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const itens = await prisma.itemLista.findMany({
      where:   { listaId: Number(id), companyId, deletedAt: null },
      orderBy: [{ concluido: "asc" }, { ordem: "asc" }, { createdAt: "asc" }],
    })

    return NextResponse.json({ itens })
  } catch (err) {
    console.error("[GET /api/listas/[id]/itens]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ── POST — adiciona item(s) à lista ──────────────────────────────────────────
export async function POST(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId

    const lista = await prisma.lista.findFirst({
      where: { id: Number(id), companyId, deletedAt: null },
      select: { id: true },
    })
    if (!lista) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    const body: {
      texto?: string
      audioUrl?: string
      dataVencimento?: string
      recorrente?: boolean
      lembrarAntesDias?: number
      url?: string
    } = await req.json()

    // ── Modo áudio ────────────────────────────────────────────────────────────
    if (body.audioUrl) {
      return await processarAudio(body.audioUrl, Number(id), companyId)
    }

    // ── Modo texto: item único ────────────────────────────────────────────────
    const texto = (body.texto ?? "").trim()
    if (!texto) return NextResponse.json({ error: "Texto ou áudio obrigatório" }, { status: 400 })

    const item = await prisma.itemLista.create({
      data: {
        listaId:          Number(id),
        companyId,
        texto,
        dataVencimento:   body.dataVencimento ? new Date(body.dataVencimento) : null,
        recorrente:       body.recorrente ?? false,
        lembrarAntesDias: body.lembrarAntesDias ?? null,
        url:              (body.url ?? "").trim() || null,
      },
    })

    return NextResponse.json({ ok: true, item }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/listas/[id]/itens]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ── Processa áudio: Whisper → GPT → cria itens ───────────────────────────────
async function processarAudio(audioUrl: string, listaId: number, companyId: number) {
  const openai = getOpenAI()

  // 1. Busca o áudio do Cloudinary
  let audioBuffer: ArrayBuffer
  try {
    const resp = await fetch(audioUrl)
    audioBuffer = await resp.arrayBuffer()
  } catch (err) {
    console.error("[itens/audio] fetch Cloudinary falhou:", err)
    return NextResponse.json({ error: "Não foi possível acessar o áudio." }, { status: 500 })
  }

  // 2. Transcrição Whisper
  let textoTranscrito: string
  try {
    const audioFile   = new File([audioBuffer], "audio.webm", { type: "audio/webm" })
    const transcricao = await openai.audio.transcriptions.create({
      model:    "whisper-1",
      file:     audioFile,
      language: "pt",
    })
    textoTranscrito = transcricao.text.trim()
  } catch (err) {
    console.error("[itens/audio] Whisper falhou:", err)
    return NextResponse.json({ error: "Erro na transcrição do áudio." }, { status: 500 })
  }

  if (!textoTranscrito) {
    return NextResponse.json({ error: "Áudio sem conteúdo." }, { status: 400 })
  }

  // 3. GPT extrai itens estruturados (texto + data + recorrência)
  const hoje     = new Date(Date.now() - 3 * 60 * 60 * 1000) // BRT
  const anoAtual = hoje.getUTCFullYear()

  let itensExtraidos: ItemExtraido[] = []
  try {
    const gptResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            `Hoje é ${hoje.toISOString().slice(0, 10)} (ano ${anoAtual}). ` +
            "Extraia itens de lista de um texto falado em português. " +
            "Retorne APENAS um JSON array de objetos com os campos: " +
            '{"texto": string, "dataVencimento": "YYYY-MM-DD" | null, "recorrente": boolean}. ' +
            '"dataVencimento": preencha quando houver data (use o próximo ano se a data já passou). ' +
            '"recorrente": true para "todo ano", "anual", "recorrente", "aniversário" e similares. ' +
            'Exemplo: [{"texto":"Aniversário da Alessandra","dataVencimento":"2027-05-02","recorrente":true}]. ' +
            "Nunca inclua texto fora do JSON.",
        },
        { role: "user", content: textoTranscrito },
      ],
      temperature: 0,
    })

    const raw    = (gptResp.choices[0].message.content ?? "[]").trim()
    const parsed = JSON.parse(raw)
    itensExtraidos = Array.isArray(parsed)
      ? parsed.filter((i: unknown) => i && typeof (i as ItemExtraido).texto === "string")
      : [{ texto: textoTranscrito }]
  } catch (err) {
    console.error("[itens/audio] GPT falhou, usando texto bruto:", err)
    itensExtraidos = [{ texto: textoTranscrito }]
  }

  if (itensExtraidos.length === 0) {
    return NextResponse.json({ error: "Não foi possível extrair itens do áudio." }, { status: 400 })
  }

  // 4. Persiste os itens
  const criados = await Promise.all(
    itensExtraidos.map((item) =>
      prisma.itemLista.create({
        data: {
          listaId,
          companyId,
          texto:         item.texto.trim(),
          dataVencimento: item.dataVencimento ? new Date(item.dataVencimento) : null,
          recorrente:    item.recorrente ?? false,
        },
      })
    )
  )

  return NextResponse.json({ ok: true, criados: criados.length }, { status: 201 })
}
