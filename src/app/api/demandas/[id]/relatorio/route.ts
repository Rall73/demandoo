import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOpenAI } from "@/lib/openai"

type Ctx = { params: Promise<{ id: string }> }

const TIPO_LABEL: Record<string, string> = {
  DEMANDA: "Demanda",
  TAREFA:  "Tarefa",
  IDEIA:   "Ideia",
}
const STATUS_LABEL: Record<string, string> = {
  ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", EM_ESPERA: "Em espera", CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
}
const PRIO_LABEL: Record<string, string> = {
  BAIXA: "Baixa", MEDIA: "Média", ALTA: "Alta", CRITICA: "Crítica",
}

// ── POST — gera relatório com IA ──────────────────────────────────────────────
export async function POST(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    // ── Verificar quota de IA ─────────────────────────────────────────────────
    const company = await prisma.company.findUnique({
      where:   { id: companyId },
      include: { plan: true },
    })
    if (company?.plan.aiQuota !== null && company?.plan.aiQuota !== undefined) {
      if ((company.aiUsedTotal ?? 0) >= company.plan.aiQuota) {
        return NextResponse.json({ error: "Quota de IA esgotada" }, { status: 402 })
      }
    }

    // ── Busca todos os dados da demanda ───────────────────────────────────────
    const demanda = await prisma.demanda.findFirst({
      where:   { id: Number(id), companyId, userId, deletedAt: null },
      include: {
        acoes:       { where: { deletedAt: null }, orderBy: { ordem: "asc" } },
        comentarios: {
          where:   { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: { user: { select: { name: true } } },
        },
      },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    // ── Monta contexto para o GPT ─────────────────────────────────────────────
    const prazoStr = demanda.prazo
      ? new Date(demanda.prazo.getTime() - 3 * 3600000).toLocaleDateString("pt-BR")
      : null

    const contexto = {
      tipo:            TIPO_LABEL[demanda.tipo] ?? demanda.tipo,
      titulo:          demanda.titulo,
      descricao:       demanda.descricao ?? "(sem descrição)",
      status:          STATUS_LABEL[demanda.status] ?? demanda.status,
      prioridade:      PRIO_LABEL[demanda.prioridade] ?? demanda.prioridade,
      prazo:           prazoStr ?? "sem prazo",
      solicitante:     demanda.solicitanteNome ?? "não informado",
      delegado:        demanda.delegadoNome ?? "não informado",
      criadoEm:        new Date(demanda.createdAt.getTime() - 3 * 3600000).toLocaleDateString("pt-BR"),
      concluidoEm:     demanda.concluidoAt
        ? new Date(demanda.concluidoAt.getTime() - 3 * 3600000).toLocaleDateString("pt-BR")
        : null,
      acoes: demanda.acoes.map((a) => ({
        descricao: a.descricao,
        feita:     a.feita,
      })),
      historico: demanda.comentarios.map((c) => ({
        data:    new Date(c.createdAt.getTime() - 3 * 3600000).toLocaleString("pt-BR"),
        autor:   c.user.name,
        tipo:    c.tipo,
        conteudo: c.conteudo,
      })),
    }

    // ── Chamada ao GPT ────────────────────────────────────────────────────────
    const openai = getOpenAI()
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um assistente profissional que elabora relatórios claros e objetivos em português do Brasil.
Gere um relatório bem estruturado usando Markdown simples (##, **, listas com -).
Divida em três seções:

## Abertura
Contexto inicial: tipo, título, quem criou, quem solicitou (se houver), data de criação, prazo e prioridade.

## Desenvolvimento
Histórico cronológico com cada atualização, comentário e mudança de status.
Liste as ações do checklist, indicando quais foram concluídas.
Seja preciso mas preserve todos os detalhes relevantes.

## Conclusão
Estado atual. Se concluído, descreva o resultado e o prazo cumprido (ou não).
Se em aberto, indique próximos passos ou pendências.`,
        },
        {
          role: "user",
          content: `Gere o relatório da seguinte ${contexto.tipo}:\n\n${JSON.stringify(contexto, null, 2)}`,
        },
      ],
    })

    const relatorio = completion.choices[0].message.content ?? ""

    // ── Salva + incrementa quota ──────────────────────────────────────────────
    await Promise.all([
      prisma.demanda.updateMany({
        where: { id: Number(id), companyId, userId },
        data:  { relatorioGerado: relatorio, relatorioGeradoAt: new Date() },
      }),
      prisma.company.update({
        where: { id: companyId },
        data:  { aiUsedTotal: { increment: 1 } },
      }),
    ])

    return NextResponse.json({ ok: true, relatorio })
  } catch (err) {
    console.error("[POST /relatorio]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// ── PATCH — salva edição manual do relatório ──────────────────────────────────
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id }    = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    const { relatorioGerado } = await req.json() as { relatorioGerado: string }

    await prisma.demanda.updateMany({
      where: { id: Number(id), companyId, userId, deletedAt: null },
      data:  { relatorioGerado },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PATCH /relatorio]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
