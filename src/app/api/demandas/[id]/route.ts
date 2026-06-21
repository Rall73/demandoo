import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteCloudinaryAsset, cloudinaryResourceType } from "@/lib/cloudinary"
import { sincronizarTags } from "@/lib/tags"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { id } = await params
    const demanda = await prisma.demanda.findFirst({
      where:   { id: Number(id), companyId: session.user.companyId, deletedAt: null },
      include: { acoes: { orderBy: { ordem: "asc" } } },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    return NextResponse.json({ demanda })
  } catch (err) {
    console.error("[GET /api/demandas/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { id } = await params
    const body   = await req.json()

    const campos: Record<string, unknown> = {}
    if (body.titulo)     campos.titulo     = body.titulo
    if (body.descricao !== undefined) campos.descricao = body.descricao
    if (body.prioridade) campos.prioridade = body.prioridade
    if (body.tipo)       campos.tipo       = body.tipo
    if (body.prazo !== undefined) campos.prazo = body.prazo ? new Date(body.prazo + "T03:00:00Z") : null
    if (body.delegadoNome !== undefined) campos.delegadoNome = body.delegadoNome || null

    const STATUS_LABEL_BR: Record<string, string> = {
      ABERTA: "Aberta", EM_ANDAMENTO: "Em andamento", EM_ESPERA: "Em espera",
      CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
    }

    // Busca status atual para registrar a mudança
    const demandaAtual = body.status
      ? await prisma.demanda.findFirst({
          where:  { id: Number(id), companyId: session.user.companyId, deletedAt: null },
          select: { status: true, companyId: true, focoIniciadoEm: true },
        })
      : null

    if (body.status) {
      campos.status = body.status

      if (body.status === "CONCLUIDA") {
        campos.concluidoAt = new Date()
        campos.focoIniciadoEm = null
      } else if (body.status === "ABERTA" || body.status === "CANCELADA") {
        campos.concluidoAt    = null
        campos.focoIniciadoEm = null
      } else if (body.status === "EM_ANDAMENTO") {
        // só seta focoIniciadoEm se não estava em andamento antes
        if (demandaAtual?.status !== "EM_ANDAMENTO") {
          campos.focoIniciadoEm = new Date()
        }
        campos.concluidoAt    = null
        campos.focoMotivoEspera = null
      } else if (body.status === "EM_ESPERA") {
        campos.focoIniciadoEm = null
        if (body.focoMotivoEspera !== undefined) {
          campos.focoMotivoEspera = body.focoMotivoEspera || null
        }
      }
    }

    if (body.focoMotivoEspera !== undefined && !body.status) {
      campos.focoMotivoEspera = body.focoMotivoEspera || null
    }

    await prisma.demanda.updateMany({
      where: { id: Number(id), companyId: session.user.companyId, deletedAt: null },
      data:  campos,
    })

    // Auto-log de mudança de status
    if (body.status && demandaAtual && demandaAtual.status !== body.status) {
      let logMsg = `Status alterado de "${STATUS_LABEL_BR[demandaAtual.status] ?? demandaAtual.status}" para "${STATUS_LABEL_BR[body.status] ?? body.status}"`

      // registra sessão de foco estruturada ao sair de EM_ANDAMENTO
      if (demandaAtual.status === "EM_ANDAMENTO" && demandaAtual.focoIniciadoEm) {
        const encerradoEm = new Date()
        const mins = Math.round((encerradoEm.getTime() - demandaAtual.focoIniciadoEm.getTime()) / 60000)
        if (mins > 0) {
          logMsg += ` (sessão de foco: ${mins < 60 ? `${mins}min` : `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}min` : ""}` })`
          await prisma.sessaoFoco.create({
            data: {
              companyId:   session.user.companyId,
              userId:      Number(session.user.id),
              demandaId:   Number(id),
              iniciadoEm:  demandaAtual.focoIniciadoEm,
              encerradoEm,
              duracaoMin:  mins,
            },
          })
        }
      }

      if (body.status === "EM_ESPERA" && body.focoMotivoEspera) {
        logMsg += ` — motivo: ${body.focoMotivoEspera}`
      }

      await prisma.comentario.create({
        data: {
          demandaId: Number(id),
          userId:    Number(session.user.id),
          companyId: session.user.companyId,
          conteudo:  logMsg,
          tipo:      "STATUS",
        },
      })
    }

    // Edição de tags (substitui o conjunto atual)
    if (Array.isArray(body.tags)) {
      await sincronizarTags(session.user.companyId, Number(id), body.tags, "replace")
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PATCH /api/demandas/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    const { id }   = await params
    const userId   = Number(session.user.id)

    const demanda = await prisma.demanda.findFirst({
      where:  { id: Number(id), companyId: session.user.companyId, deletedAt: null },
      select: {
        audioUrl:    true,
        comentarios: { where: { deletedAt: null, audioUrl: { not: null } }, select: { audioUrl: true } },
        anexos:      { where: { deletedAt: null }, select: { url: true, tipo: true } },
      },
    })
    if (!demanda) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    // Soft delete
    await prisma.demanda.updateMany({
      where: { id: Number(id), companyId: session.user.companyId },
      data:  { deletedAt: new Date(), deletedBy: userId },
    })

    // Cloudinary — limpa todos os assets associados (best-effort, fire-and-forget)
    const cleanups: Promise<unknown>[] = []
    if (demanda.audioUrl)
      cleanups.push(deleteCloudinaryAsset(demanda.audioUrl, "video"))
    for (const c of demanda.comentarios)
      if (c.audioUrl) cleanups.push(deleteCloudinaryAsset(c.audioUrl, "video"))
    for (const a of demanda.anexos)
      cleanups.push(deleteCloudinaryAsset(a.url, cloudinaryResourceType(a.tipo)))
    Promise.allSettled(cleanups).catch(console.error)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/demandas/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
