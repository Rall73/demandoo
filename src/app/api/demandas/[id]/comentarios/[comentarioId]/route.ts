import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { deleteCloudinaryAsset } from "@/lib/cloudinary"

type Ctx = { params: Promise<{ id: string; comentarioId: string }> }

export async function DELETE(_: Request, { params }: Ctx) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const { id, comentarioId } = await params
    const companyId = session.user.companyId
    const userId    = Number(session.user.id)

    // Valida posse (companyId + userId do comentário)
    const comentario = await prisma.comentario.findFirst({
      where: {
        id:        Number(comentarioId),
        demandaId: Number(id),
        companyId,
        userId,       // só o próprio autor pode excluir
        deletedAt:  null,
      },
      select: { id: true, audioUrl: true },
    })
    if (!comentario) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    await prisma.comentario.update({
      where: { id: Number(comentarioId) },
      data:  { deletedAt: new Date(), deletedBy: userId },
    })

    // Remove áudio do Cloudinary (best-effort)
    if (comentario.audioUrl) {
      deleteCloudinaryAsset(comentario.audioUrl, "video").catch(console.error)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /comentarios/[id]]", err)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
