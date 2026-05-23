import { NextResponse } from "next/server"
import { auth } from "@/auth"
import cloudinary from "@/lib/cloudinary"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    const formData  = await req.formData()
    const audioFile = formData.get("audio") as File | null
    if (!audioFile) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 })

    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const companyId = session.user.companyId

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        `demandoo/audio/${companyId}`,
          resource_type: "video", // Cloudinary trata áudio como "video"
        },
        (err, res) => {
          if (err || !res) return reject(err ?? new Error("Upload falhou"))
          resolve(res)
        }
      )
      stream.end(buffer)
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (err) {
    console.error("[POST /api/upload/audio]", err)
    return NextResponse.json({ error: "Erro no upload do áudio" }, { status: 500 })
  }
}
