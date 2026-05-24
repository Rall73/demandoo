import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import cloudinary, { deleteCloudinaryAsset } from "@/lib/cloudinary"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const userId = Number(session.user.id)

    const formData  = await req.formData()
    const imageFile = formData.get("avatar") as File | null
    if (!imageFile) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })

    // Valida tipo MIME
    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Apenas imagens são permitidas." }, { status: 400 })
    }

    // Busca avatar atual para deletar do Cloudinary depois
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    })

    const buffer = Buffer.from(await imageFile.arrayBuffer())

    // Upload para Cloudinary
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:         `demandoo/avatars/${userId}`,
          resource_type:  "image",
          transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
        },
        (err, res) => {
          if (err || !res) return reject(err ?? new Error("Upload falhou"))
          resolve(res)
        }
      )
      stream.end(buffer)
    })

    // Salva URL no banco
    await prisma.user.update({
      where: { id: userId },
      data:  { avatarUrl: result.secure_url },
    })

    // Apaga o avatar antigo do Cloudinary (fire-and-forget)
    if (user?.avatarUrl) {
      deleteCloudinaryAsset(user.avatarUrl, "image").catch(console.error)
    }

    return NextResponse.json({ url: result.secure_url })
  } catch (err) {
    console.error("[POST /api/upload/avatar]", err)
    return NextResponse.json({ error: "Erro no upload do avatar." }, { status: 500 })
  }
}
