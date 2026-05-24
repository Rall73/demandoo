import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOpenAI } from "@/lib/openai"
import { hojeISOBrasil, diaSemanaHojePT, parseDateBRT } from "@/lib/date"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const tipo      = searchParams.get("tipo") ?? undefined
    const status    = searchParams.get("status") ?? undefined
    const pagina    = Number(searchParams.get("pagina") ?? 1)
    const porPagina = Number(searchParams.get("porPagina") ?? 50)

    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    const demandas = await prisma.demanda.findMany({
      where: {
        companyId,
        userId,
        deletedAt: null,
        ...(tipo   ? { tipo:   tipo   as "DEMANDA" | "TAREFA" | "IDEIA" } : {}),
        ...(status ? { status: status as "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA" } : {}),
      },
      include: { acoes: { orderBy: { ordem: "asc" } } },
      orderBy: [{ prioridade: "asc" }, { createdAt: "desc" }],
      skip:  (pagina - 1) * porPagina,
      take:  porPagina,
    })

    return NextResponse.json({ demandas })
  } catch (err) {
    console.error("[GET /api/demandas]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const companyId = session.user.companyId
    const userId    = Number(session.user.id)
    const body      = await req.json()

    const {
      manual,
      audioUrl,
      descricao,
      titulo:    tituloBody,
      tipo:      tipoBody,
      prioridade: prioBody,
      prazo:     prazoBody,
      solicitanteNome: solNomeBody,
      delegadoUserId:  delegadoBody,
    } = body

    if (!audioUrl && !descricao && !tituloBody) {
      return NextResponse.json({ error: "Informe a descrição ou título" }, { status: 400 })
    }

    // ─── Controle de quota de IA ───────────────────────────────────────────────
    // manual: true → pula pipeline de IA e não consome quota
    const usandoIA = !manual && !!(audioUrl || descricao)
    let aiBlocked  = false

    if (usandoIA) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { plan: true },
      })

      if (company?.plan.aiQuota !== null && company?.plan.aiQuota !== undefined) {
        if ((company.aiUsedTotal ?? 0) >= company.plan.aiQuota) {
          aiBlocked = true
        }
      }
    }

    // ─── Pipeline de IA ────────────────────────────────────────────────────────
    let transcricao = ""
    let aiResult: {
      titulo?: string; descricao?: string; tipo?: string
      prioridade?: string; prazo?: string | null
      acoes?: string[]; solicitanteNome?: string | null
    } = {}

    if (usandoIA && !aiBlocked) {
      const openai = getOpenAI()

      // 1. Transcrição (só se vier áudio)
      if (audioUrl) {
        try {
          const audioResponse = await fetch(audioUrl)
          const audioBuffer   = await audioResponse.arrayBuffer()
          const audioFile     = new File([audioBuffer], "audio.webm", { type: "audio/webm" })

          const transcription = await openai.audio.transcriptions.create({
            model: "whisper-1",
            file:  audioFile,
            language: "pt",
          })
          transcricao = transcription.text
        } catch (err) {
          console.error("[Whisper]", err)
        }
      }

      const textoParaAnalisar = transcricao || descricao || ""

      // 2. Estruturação com GPT
      if (textoParaAnalisar) {
        try {
          const hoje       = hojeISOBrasil()
          const diaSemana  = diaSemanaHojePT()

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `Você é um assistente que estrutura demandas, tarefas e ideias de profissionais.
Hoje é ${hoje} (${diaSemana}).
Retorne SOMENTE um JSON com os campos: titulo, descricao, tipo, prioridade, prazo, acoes, solicitanteNome.

CLASSIFICAÇÃO DO TIPO:
- IDEIA: fala começa com "tive uma ideia", "pensei em", "uma sacada", "e se...", "imagina se", tom exploratório/hipotético. Não tem urgência ou solicitante.
- TAREFA: pedido simples SÓ do próprio usuário, curto, máx 1-2 ações, sem terceiros. Ex.: "comprar pão amanhã", "ligar para o banco".
- DEMANDA (padrão): solicitante terceiro, contexto narrativo, múltiplos passos, ou qualquer coisa que não se encaixe nos dois anteriores.

REGRAS:
- titulo: máx 80 chars, conciso e claro.
- descricao: narrativa rica preservando contexto original.
- prioridade: BAIXA | MEDIA | ALTA | CRITICA (inferir pelo tom e urgência).
- prazo: YYYY-MM-DD absoluto (resolver datas relativas como "amanhã", "sexta", "semana que vem") ou null.
- acoes: array de strings com próximas ações concretas (vazio para IDEIA e TAREFA simples).
- solicitanteNome: nome da pessoa que fez o pedido, ou null.`,
              },
              { role: "user", content: textoParaAnalisar },
            ],
          })

          aiResult = JSON.parse(completion.choices[0].message.content ?? "{}")
        } catch (err) {
          console.error("[GPT]", err)
        }
      }
    }

    // ─── Resolve solicitante ───────────────────────────────────────────────────
    let solicitanteUserId: number | null = null
    const nomeSolicitante = solNomeBody ?? aiResult.solicitanteNome ?? null

    if (nomeSolicitante) {
      const primeiroNome = nomeSolicitante.trim().split(" ")[0].toLowerCase()
      const userMatch = await prisma.user.findFirst({
        where: {
          companyId,
          deletedAt: null,
          name: { startsWith: primeiroNome },
        },
      })
      if (userMatch) solicitanteUserId = userMatch.id
    }

    // ─── Resolve prazo ────────────────────────────────────────────────────────
    const prazoStr = prazoBody ?? aiResult.prazo ?? null
    const prazo = prazoStr ? parseDateBRT(prazoStr) : null

    // ─── Salva no banco ───────────────────────────────────────────────────────
    const titulo    = tituloBody    ?? aiResult.titulo    ?? "Sem título"
    const tipo      = (tipoBody     ?? aiResult.tipo      ?? "DEMANDA")  as "DEMANDA" | "TAREFA" | "IDEIA"
    const prioridade = (prioBody    ?? aiResult.prioridade ?? "MEDIA")   as "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"
    const acoes      = (aiResult.acoes ?? []) as string[]

    // No modo manual, usa descricao do body diretamente (aiResult está vazio)
    const descricaoFinal = manual ? (descricao ?? null) : (aiResult.descricao ?? descricao ?? null)

    const demanda = await prisma.demanda.create({
      data: {
        companyId,
        userId,
        titulo:           titulo.slice(0, 500),
        descricao:        descricaoFinal,
        tipo,
        prioridade,
        prazo,
        solicitanteNome:  solicitanteUserId ? null : nomeSolicitante,
        solicitanteUserId,
        delegadoUserId:   delegadoBody ?? null,
        audioUrl:         audioUrl ?? null,
        acoes: {
          create: acoes.map((desc: string, i: number) => ({ descricao: desc, ordem: i })),
        },
      },
    })

    // ─── Incrementa contador de IA ─────────────────────────────────────────────
    if (usandoIA && !aiBlocked) {
      await prisma.company.update({
        where: { id: companyId },
        data:  { aiUsedTotal: { increment: 1 } },
      })
    }

    return NextResponse.json({ demanda, aiBlocked }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/demandas]", err)
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 })
  }
}
