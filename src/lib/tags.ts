import { prisma } from "@/lib/prisma"

// Normaliza um nome de tag: remove '#', minúsculo, trim, colapsa espaços, máx 50 chars
export function normalizarTag(raw: string): string {
  return raw
    .replace(/^#+/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 50)
}

// Extrai tokens "#tag" de um texto livre (título / descrição / transcrição)
export function parseTags(texto: string | null | undefined): string[] {
  if (!texto) return []
  const matches = texto.match(/#[\p{L}\p{N}_-]+/gu) ?? []
  return matches.map(normalizarTag).filter(Boolean)
}

// Normaliza + deduplica uma lista de nomes vindos de várias fontes
export function normalizarLista(nomes: (string | null | undefined)[]): string[] {
  const set = new Set<string>()
  for (const n of nomes) {
    if (!n) continue
    const norm = normalizarTag(n)
    if (norm) set.add(norm)
  }
  return Array.from(set)
}

/**
 * Garante que a demanda tenha as tags informadas.
 * - "merge": apenas adiciona as que faltam (usado na criação)
 * - "replace": adiciona as novas e remove as ausentes (usado na edição)
 * Tags são por empresa (companyId) — nunca vazam entre tenants.
 */
export async function sincronizarTags(
  companyId: number,
  demandaId: number,
  nomes: string[],
  modo: "merge" | "replace" = "merge",
): Promise<void> {
  const desejadas = normalizarLista(nomes)

  if (modo === "replace") {
    const atuais = await prisma.demandaTag.findMany({
      where:   { demandaId, companyId },
      include: { tag: true },
    })
    const remover = atuais
      .filter((dt) => !desejadas.includes(dt.tag.nome))
      .map((dt) => dt.id)
    if (remover.length > 0) {
      await prisma.demandaTag.deleteMany({ where: { id: { in: remover } } })
    }
  }

  for (const nome of desejadas) {
    const tag = await prisma.tag.upsert({
      where:  { companyId_nome: { companyId, nome } },
      update: { deletedAt: null },          // revive tag soft-deletada com mesmo nome
      create: { companyId, nome },
    })
    await prisma.demandaTag.upsert({
      where:  { demandaId_tagId: { demandaId, tagId: tag.id } },
      update: {},
      create: { demandaId, tagId: tag.id, companyId },
    })
  }
}
