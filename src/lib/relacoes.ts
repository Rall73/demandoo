import type { RelacaoTipo } from "@prisma/client"

/**
 * Vínculo entre demandas — constantes e tipos puros.
 *
 * Sem import de prisma de propósito: este módulo é usado também por componentes
 * client. A consulta ao banco fica em `src/lib/relacoes-db.ts`.
 *
 * O registro é direcional — `origem` é o item anterior, `destino` o que veio
 * depois — mas a leitura é bidirecional: uma única linha aparece nas duas
 * pontas. `sentido` diz de que lado está a demanda consultada.
 */

export type Sentido = "ADIANTE" | "ATRAS"

export const TIPOS_RELACAO = ["CONTINUACAO", "DESDOBRAMENTO", "RELACIONADA"] as const

/** Rótulo do vínculo visto a partir da demanda consultada. */
export const RELACAO_LABEL: Record<RelacaoTipo, Record<Sentido, string>> = {
  CONTINUACAO:   { ADIANTE: "teve continuidade em", ATRAS: "continuidade de" },
  DESDOBRAMENTO: { ADIANTE: "gerou desdobramento",  ATRAS: "desdobramento de" },
  RELACIONADA:   { ADIANTE: "relacionada a",        ATRAS: "relacionada a" },
}

/** Opções oferecidas na UI, já resolvidas em (tipo, sentido). */
export const OPCOES_VINCULO: {
  valor: string; label: string; tipo: RelacaoTipo; sentido: Sentido
}[] = [
  { valor: "continuidade-de",     label: "é continuidade de",    tipo: "CONTINUACAO",   sentido: "ATRAS"   },
  { valor: "teve-continuidade",   label: "teve continuidade em", tipo: "CONTINUACAO",   sentido: "ADIANTE" },
  { valor: "desdobramento-de",    label: "é desdobramento de",   tipo: "DESDOBRAMENTO", sentido: "ATRAS"   },
  { valor: "gerou-desdobramento", label: "gerou desdobramento",  tipo: "DESDOBRAMENTO", sentido: "ADIANTE" },
  { valor: "relacionada",         label: "relacionada a",        tipo: "RELACIONADA",   sentido: "ADIANTE" },
]

export type DemandaLigada = {
  id:     number
  titulo: string
  tipo:   string
  status: string
  prazo:  string | null
}

export type RelacaoItem = {
  relacaoId: number
  tipo:      RelacaoTipo
  sentido:   Sentido
  demanda:   DemandaLigada
}
