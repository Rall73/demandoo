import { prisma } from "@/lib/prisma"

/**
 * Faxina de contas que nunca foram verificadas.
 *
 * Uma conta sem `emailVerified` **não consegue fazer login** (o `authorize()`
 * barra; Google e convite já nascem verificados). Logo ela é, por construção,
 * uma conta sem nenhum dado — apagar não destrói nada além da linha vazia.
 * Ainda assim as travas abaixo conferem isso item a item, porque código com
 * efeito destrutivo merece cinto e suspensório.
 *
 * Também é a postura correta em LGPD: guardar nome e e-mail de quem abandonou
 * o cadastro, para sempre, é retenção sem finalidade.
 */

/** Janela de tolerância. 30 dias: o token do cadastro dura 24h, mas com o
 *  reenvio de verificação disponível a pessoa tem um mês para se resolver. */
const DIAS_TOLERANCIA = 30

/**
 * ⚠️ ENSAIO. Com `false`, a rotina apenas apura e registra o que apagaria.
 * Rode assim por algumas execuções, confira o log em `cron_execucoes` e só
 * então mude para `true`.
 */
const ARMADA = false

export type ResultadoFaxina = {
  armada:            boolean
  candidatas:        number
  removidas:         number
  empresasRemovidas: number
  detalhes:          string
}

export async function faxinaContasNaoVerificadas(): Promise<ResultadoFaxina> {
  const limite = new Date(Date.now() - DIAS_TOLERANCIA * 24 * 60 * 60 * 1000)

  const candidatas = await prisma.user.findMany({
    where: {
      emailVerified: null,
      createdAt:     { lt: limite },
      deletedAt:     null,
    },
    select: {
      id: true, email: true, companyId: true, createdAt: true,
      _count: { select: { demandas: true, listas: true, comentarios: true } },
    },
    take: 200,
  })

  // Trava redundante: qualquer sinal de uso tira a conta da lista
  const seguras = candidatas.filter(
    (u) => u._count.demandas === 0 && u._count.listas === 0 && u._count.comentarios === 0,
  )

  const descartadas = candidatas.length - seguras.length
  const resumo = seguras.map((u) => u.email).slice(0, 10).join(", ")

  if (!ARMADA) {
    return {
      armada:            false,
      candidatas:        candidatas.length,
      removidas:         0,
      empresasRemovidas: 0,
      detalhes:
        `ENSAIO — apagaria ${seguras.length} de ${candidatas.length} candidatas` +
        (descartadas > 0 ? ` (${descartadas} com dados, preservadas)` : "") +
        (resumo ? `: ${resumo}` : ""),
    }
  }

  let removidas = 0
  let empresasRemovidas = 0

  for (const u of seguras) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.verificationToken.deleteMany({ where: { identifier: u.email } })
        await tx.user.delete({ where: { id: u.id } })

        // A empresa só cai se não sobrou ninguém nela
        const restantes = await tx.user.count({ where: { companyId: u.companyId } })
        if (restantes === 0) {
          await tx.company.delete({ where: { id: u.companyId } })
          empresasRemovidas++
        }
      })
      removidas++
    } catch (err) {
      console.error(`[faxina] falhou ao remover ${u.email}:`, err)
    }
  }

  return {
    armada:            true,
    candidatas:        candidatas.length,
    removidas,
    empresasRemovidas,
    detalhes:
      `Removidas ${removidas} contas e ${empresasRemovidas} empresas` +
      (descartadas > 0 ? ` (${descartadas} com dados, preservadas)` : ""),
  }
}
