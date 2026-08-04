/**
 * Delegação — tipos e rótulos puros.
 *
 * Sem import de prisma: este módulo é usado também por componentes client.
 * As consultas ficam em `src/lib/delegacao-db.ts`.
 *
 * Desenho "demanda-filha": delegar cria uma demanda nova pertencente ao
 * delegado. Cada um é dono do seu registro — por isso nenhuma query existente
 * precisou passar a enxergar demanda de outra pessoa.
 */

export type PessoaResumo = {
  id:   number
  nome: string
}

export type ComentarioFilha = {
  id:        number
  conteudo:  string
  tipo:      string
  createdAt: string
  autor:     string
}

export type AcaoFilha = {
  id:        number
  descricao: string
  feita:     boolean
  prazo:     string | null
}

/** Uma delegação que ESTA demanda originou (eu deleguei para alguém). */
export type DelegacaoFeita = {
  id:           number
  para:         PessoaResumo
  /** O que foi pedido — registro imutável, não muda se o delegado editar a demanda dele */
  instrucao:    string | null
  prazoRetorno: string | null
  devolutiva:   string | null
  respondidoAt: string | null
  createdAt:    string
  /** true enquanto nada foi feito na filha — só então dá para cancelar */
  cancelavel:   boolean
  filha: {
    id:          number
    titulo:      string
    status:      string
    prazo:       string | null
    concluidoAt: string | null
    acoes:       AcaoFilha[]
    comentarios: ComentarioFilha[]
    /** Se a filha foi repassada adiante, para quem — o nível seguinte da cadeia */
    repassadaPara: PessoaResumo[]
  }
}

/** A delegação que criou ESTA demanda (alguém delegou para mim). */
export type DelegacaoRecebida = {
  id:           number
  de:           PessoaResumo
  instrucao:    string | null
  prazoRetorno: string | null
  devolutiva:   string | null
  respondidoAt: string | null
  createdAt:    string
  origem: {
    id:     number
    titulo: string
  }
}

export type VisaoDelegacao = {
  feitas:   DelegacaoFeita[]
  recebida: DelegacaoRecebida | null
}

export const VISAO_VAZIA: VisaoDelegacao = { feitas: [], recebida: null }

/** Situação da delegação, para badge na UI. */
export function situacaoDelegacao(d: DelegacaoFeita, hojeISO: string): {
  label: string
  cor:   "verde" | "vermelho" | "ambar" | "cinza"
} {
  if (d.respondidoAt)                return { label: "Retorno registrado", cor: "verde"    }
  if (d.filha.status === "CONCLUIDA") return { label: "Concluída, sem retorno", cor: "ambar" }
  if (d.filha.status === "CANCELADA") return { label: "Cancelada",         cor: "cinza"    }

  if (d.prazoRetorno) {
    const prazo = d.prazoRetorno.slice(0, 10)
    if (prazo <  hojeISO) return { label: "Retorno vencido", cor: "vermelho" }
    if (prazo === hojeISO) return { label: "Retorno hoje",   cor: "ambar"    }
  }
  return { label: "Em andamento", cor: "cinza" }
}
