import { prisma } from "@/lib/prisma"
import type {
  VisaoDelegacao, DelegacaoFeita, DelegacaoRecebida,
} from "@/lib/delegacao"

/**
 * Leitura da delegação nos dois papéis.
 *
 * ⚠️ Este é o único ponto do app que lê demanda de OUTRO usuário: a mãe precisa
 * enxergar o andamento da filha. O acesso só acontece através da linha de
 * `delegacoes`, e sempre validando `companyId` — nunca por id solto.
 */

const LIMITE_TIMELINE = 30

export async function carregarDelegacao(
  demandaId: number,
  companyId: number,
): Promise<VisaoDelegacao> {
  const [feitasRaw, recebidaRaw] = await Promise.all([
    prisma.delegacao.findMany({
      where:   { companyId, demandaOrigemId: demandaId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, instrucao: true, prazoRetorno: true, devolutiva: true, respondidoAt: true, createdAt: true,
        delegadoPara: { select: { id: true, name: true } },
        filha: {
          select: {
            id: true, titulo: true, status: true, prazo: true, concluidoAt: true,
            acoes: {
              where:   { deletedAt: null },
              orderBy: { ordem: "asc" },
              select:  { id: true, descricao: true, feita: true, prazo: true },
            },
            comentarios: {
              where:   { deletedAt: null },
              orderBy: { createdAt: "desc" },
              take:    LIMITE_TIMELINE,
              select:  {
                id: true, conteudo: true, tipo: true, createdAt: true,
                user: { select: { name: true } },
              },
            },
            // Nível seguinte da cadeia: a filha repassou para quem?
            delegacoesFeitas: {
              select: { delegadoPara: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),

    prisma.delegacao.findFirst({
      where:  { companyId, demandaFilhaId: demandaId },
      select: {
        id: true, instrucao: true, prazoRetorno: true, devolutiva: true, respondidoAt: true, createdAt: true,
        delegadoPor: { select: { id: true, name: true } },
        origem:      { select: { id: true, titulo: true } },
      },
    }),
  ])

  const feitas: DelegacaoFeita[] = feitasRaw.map((d) => {
    // Cancelável só enquanto a filha está intocada — cancelar remove a filha,
    // e apagar trabalho de outra pessoa não pode ser um clique.
    // Os auto-logs (STATUS) não contam: a própria delegação cria um deles.
    // Mesma regra do DELETE em /delegar/[delegacaoId] — se divergir, o botão
    // aparece e a ação é recusada.
    const intocada =
      d.filha.status === "ABERTA" &&
      !d.filha.comentarios.some((c) => c.tipo !== "STATUS") &&
      !d.filha.acoes.some((a) => a.feita) &&
      d.filha.delegacoesFeitas.length === 0

    return {
      id:           d.id,
      para:         { id: d.delegadoPara.id, nome: d.delegadoPara.name },
      instrucao:    d.instrucao,
      prazoRetorno: d.prazoRetorno?.toISOString() ?? null,
      devolutiva:   d.devolutiva,
      respondidoAt: d.respondidoAt?.toISOString() ?? null,
      createdAt:    d.createdAt.toISOString(),
      cancelavel:   intocada,
      filha: {
        id:          d.filha.id,
        titulo:      d.filha.titulo,
        status:      d.filha.status as string,
        prazo:       d.filha.prazo?.toISOString() ?? null,
        concluidoAt: d.filha.concluidoAt?.toISOString() ?? null,
        acoes: d.filha.acoes.map((a) => ({
          id:        a.id,
          descricao: a.descricao,
          feita:     a.feita,
          prazo:     a.prazo?.toISOString() ?? null,
        })),
        // volta à ordem cronológica para exibição
        comentarios: d.filha.comentarios
          .slice()
          .reverse()
          .map((c) => ({
            id:        c.id,
            conteudo:  c.conteudo,
            tipo:      c.tipo,
            createdAt: c.createdAt.toISOString(),
            autor:     c.user.name,
          })),
        repassadaPara: d.filha.delegacoesFeitas.map((r) => ({
          id:   r.delegadoPara.id,
          nome: r.delegadoPara.name,
        })),
      },
    }
  })

  const recebida: DelegacaoRecebida | null = recebidaRaw
    ? {
        id:           recebidaRaw.id,
        de:           { id: recebidaRaw.delegadoPor.id, nome: recebidaRaw.delegadoPor.name },
        instrucao:    recebidaRaw.instrucao,
        prazoRetorno: recebidaRaw.prazoRetorno?.toISOString() ?? null,
        devolutiva:   recebidaRaw.devolutiva,
        respondidoAt: recebidaRaw.respondidoAt?.toISOString() ?? null,
        createdAt:    recebidaRaw.createdAt.toISOString(),
        origem:       { id: recebidaRaw.origem.id, titulo: recebidaRaw.origem.titulo },
      }
    : null

  return { feitas, recebida }
}

/** Membros ativos da empresa, exceto o próprio usuário — alvos de delegação. */
export async function membrosDelegaveis(companyId: number, exceptUserId: number) {
  const users = await prisma.user.findMany({
    where:   { companyId, deletedAt: null, active: true, id: { not: exceptUserId } },
    select:  { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
  return users.map((u) => ({ id: u.id, nome: u.name, email: u.email }))
}
