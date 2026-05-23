import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
})

export default cloudinary

/** Extrai o publicId de uma URL Cloudinary para deletar o asset. */
export function publicIdFromUrl(url: string): string {
  // https://res.cloudinary.com/{cloud}/video/upload/v123/pasta/arquivo.webm
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
  return match ? match[1] : url
}

/** Deleta um asset do Cloudinary. Nunca lança exceção — retorna { ok, error }. */
export async function deleteCloudinaryAsset(
  url: string | null | undefined,
  resourceType: "image" | "video" | "raw" = "video"
): Promise<{ ok: boolean; error?: string }> {
  if (!url) return { ok: true }
  try {
    const publicId = publicIdFromUrl(url)
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
