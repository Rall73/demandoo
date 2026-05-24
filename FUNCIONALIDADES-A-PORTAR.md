# Funcionalidades do módulo Demandas a portar para o demandoo

> **Documento de referência** extraído do projeto `inicio.aprendiassim.com` (pasta `check-list`).
> Lista TODAS as funcionalidades do módulo de captura de demandas/tarefas/ideias já em produção lá,
> que ainda **não foram implementadas** (ou estão em versão simplificada) no demandoo.
>
> Use este documento como **roadmap de paridade de features** para a nova sessão dedicada ao demandoo.

---

## 1. Arquitetura de rotas existente no check-list

```
/demandas                          Hub principal com abas + KPIs + lista
/demandas?tipo=TAREFA              Filtra por tipo
/demandas?tipo=IDEIA               Filtra por tipo
/demandas?from=...&to=...          Filtra por período
/demandas/nova                     Form de criação (voz/texto + IA)
/demandas/[id]                     Detalhe completo + edição inline
/demandas/calendario               Calendário mensal
/demandas/calendario?ano=&mes=     Navegação por mês

API:
GET    /api/demandas                       lista
POST   /api/demandas                       cria (pipeline IA completo)
GET    /api/demandas/[id]                  detalhe
PATCH  /api/demandas/[id]                  atualiza qualquer campo
DELETE /api/demandas/[id]                  soft delete + cleanup Cloudinary
POST   /api/demandas/[id]/acoes            cria ação
PATCH  /api/demandas/[id]/acoes/[acaoId]   atualiza ação (descricao/concluida)
DELETE /api/demandas/[id]/acoes/[acaoId]   soft delete ação
GET    /api/demandas/[id]/calendar.ics     download .ics (Google/Apple/Outlook)
```

No demandoo as rotas equivalentes são `/app`, `/app/nova`, `/app/[id]`, `/app/calendario`.
Layout group `(demandas-nav)` no check-list valida `companyModule.enabled` — no demandoo isso não se aplica (é single-product).

---

## 2. HUB PRINCIPAL — Funcionalidades

### Cabeçalho dinâmico
- Ícone + título mudam por tipo (Inbox / CheckSquare / Lightbulb)
- Subtítulo explicativo:
  - **Demanda:** "Demandas com contexto, solicitante e ações."
  - **Tarefa:** "Coisas rápidas pra você lembrar de fazer."
  - **Ideia:** "Insights capturados para explorar depois."
- Cor do botão "Novo registro" muda com o tipo ativo

### Sistema de abas (DEMANDA / TAREFA / IDEIA)
- 3 abas com **badge de contagem** (só ABERTAS + EM_ANDAMENTO contam)
- Cor da aba ativa muda conforme tipo (violeta/esmeralda/âmbar)
- Preserva filtro de período ao trocar de aba (mantém `?from=&to=` na URL)

### KPIs — 4 cards adaptados por tipo

**Para DEMANDA:**
Em aberto · Concluídas no mês · Alta prioridade · Com prazo

**Para TAREFA:**
A fazer · Feitas no mês · Com prazo · Alta prioridade

**Para IDEIA:**
Em exploração · Arquivadas · Total no mês · Alta prioridade

Cores adaptam-se (vermelho para alta prio > 0, âmbar para pendentes, esmeralda para concluídas).

### Filtro de período (server-side)
- Inputs `date` from/to + botão Filtrar com loading state (`useTransition`)
- Default: mês atual em BRT (`inicioMesNoBrasil`/`fimMesNoBrasil`)
- Re-renderiza com `router.push` mantendo o `tipo` selecionado

### Filtros client-side (instantâneos)
- **Busca textual:** procura em `titulo`, `descricao` e `solicitanteNome`
- **Filtro por status:** Todos / Aberta / Em andamento / Concluída / Cancelada
- **Filtro por prioridade:** Todas / Alta / Média / Baixa
- Botão "Limpar" aparece quando há filtros ativos
- Contador: "X tarefas/demandas/ideias"

### Lista de cards — comportamento por tipo

**TAREFA (modo simplificado):**
- Checkbox grande à esquerda que alterna ABERTA ↔ CONCLUIDA com 1 clique
- Esconde badges de status/prioridade/IA
- Esconde descrição (só título)
- Esconde solicitante/delegado/contagem de ações
- Texto riscado (line-through) quando concluída

**DEMANDA / IDEIA (modo completo):**
- Badge de status com ícone (Clock/PlayCircle/CheckCircle2/Ban)
- Badge de prioridade (▲ Alta / ● Média / ▼ Baixa) — escondido em IDEIA
- Badge ✦ IA quando `aiProcessado: true`
- Badge "Prazo vencido" em vermelho se prazo < hoje e não concluída
- Descrição truncada em 2 linhas (`line-clamp-2`)
- Metadados em rodapé: data criação, prazo, solicitante, delegado, contagem de ações (`feitas/total`)
- IDEIA tem fundo levemente âmbar
- Botão chevron → detalhe

### Empty states diferenciados por tipo
- Ícone do tipo grande em cinza
- Mensagem contextual ("Nenhuma tarefa no período. Clique em Novo registro para começar.")
- Estado "sem resultados para filtros" diferente de "sem dados no período"

---

## 3. CRIAÇÃO `/nova` — Funcionalidades

### Toggle de modo (Voz / Texto)
Pílulas com fundo cinza, indicador branco para ativo.

### Modo VOZ — 4 estados
1. **idle:** botão circular violeta com Mic + instrução
2. **recording:** bolinha vermelha pulsante + cronômetro `MM:SS` + botão Stop vermelho
3. **uploading:** spinner + "Enviando áudio…"
4. **done:** player `<audio>` + botão "Descartar e regravar"

**Detalhes técnicos:**
- Detecta codec: `audio/webm;codecs=opus` → fallback `audio/mp4`
- `MediaRecorder.start(1000)` (chunks de 1s)
- Stop libera tracks do MediaStream
- Tratamento de erro de permissão de microfone

### Campos opcionais (collapse expansível)
Toggle "Mostrar/Ocultar campos opcionais" com ChevronDown rotacionável.

**PessoaSelector** (componente reutilizável para Solicitante e Delegado):
- Sub-pílulas **Usuário / Externo** dentro do campo
- Modo "Usuário": `<select>` com lista de users da empresa
- Modo "Externo": `<input>` text livre para nome

**Prazo:** input `date`

**Prioridade:** select com "Deixar a IA decidir" como default

### Submissão
- Body do usuário **sobrescreve** o que a IA detectar
- Botão "Criar demanda" → "Analisando com IA…" com spinner
- Redirect para detalhe ao concluir

---

## 4. DETALHE `/[id]` — Funcionalidades

### Card principal — Barra de badges/ações
- **Botão "tipo" com menu dropdown** → permite **MUDAR O TIPO** (DEMANDA ↔ TAREFA ↔ IDEIA) sem perder dados
- Badge de status, prioridade, IA, "Calendário" (link .ics), "Prazo vencido"

### Botões de transição de status (contextuais)
- **ABERTA:** [Iniciar] [Cancelar]
- **EM_ANDAMENTO:** [Concluir] [Cancelar]
- **CONCLUIDA:** [Reabrir]
- **CANCELADA:** [Reabrir]

Ao mudar para CONCLUIDA, salva `concluidoAt = new Date()`. Reabrir limpa.

### Título e descrição editáveis inline
- Ícone Pencil aparece no hover → modo edição
- Inputs com botões Salvar/Cancelar

### Player de áudio
Card violeta com ícone Volume2 + `<audio controls>` quando há `audioUrl`.

### Bloco de metadados
- Data de criação (pt-BR + SP timezone)
- Prazo (vermelho se vencida)
- **Concluída em + duração** (calculada: `< 1h` / `Xh` / `Xd Yh`)
- Solicitante (resolvendo `userId` → nome ou usando texto livre)
- Delegado (mesma lógica)

### Card "Editar detalhes" (collapse)
Permite editar Prioridade, Prazo, Solicitante e Delegado (com PessoaSelector).

### Card "Ações" (sub-checklist)
- Header com contador "X/Y" (verde se completo)
- Cada ação tem: checkbox 18x18, texto riscado se concluída, edit/delete no hover
- Modo edição inline (Enter = salvar, Esc = cancelar)
- Input "Nova ação…" no rodapé
- Empty state: "Nenhuma ação. Adicione abaixo ou crie outra demanda com IA."

### Exclusão (soft delete)
- Link discreto "Excluir esta demanda"
- Confirmação inline (sem modal)
- DELETE faz soft delete + **deleta áudio do Cloudinary** (best-effort)

---

## 5. CALENDÁRIO — Funcionalidades

- Botões Anterior / Próximo (chevrons) com URL `?ano=X&mes=Y`
- Nome do mês em pt-BR + ano no centro
- Grid 7 colunas (Dom→Sáb), células min-h 100px
- **Dia atual destacado em violeta**
- Até 3 pills por dia, "+N mais" se houver mais
- Pill colorida pelo tipo (violeta/esmeralda/âmbar)
- Riscado/opaco se CONCLUIDA ou CANCELADA
- Click → detalhe
- **Legenda no rodapé** com bolinhas e labels

---

## 6. PIPELINE DE IA (POST /api/demandas) — Detalhes completos

### Fluxo
```
1. Recebe body: { audioUrl?, descricaoRaw?, solicitanteUserId?, solicitanteNome?,
                  delegadoUserId?, delegadoNome?, prazo?, prioridade?, tipo? }

2. Se audioUrl:
   - fetch do áudio do Cloudinary
   - Detecta ext (mp4 ou webm) → MIME apropriado
   - openai.audio.transcriptions.create({ model: "whisper-1", language: "pt" })

3. GPT-4o-mini com response_format json_object:
   - Injeta data hoje BRT + dia da semana em português
   - Retorna JSON: { tipo, titulo, descricao, prioridade, acoes[], solicitanteNome, prazo }

4. Match automático de solicitante:
   - Se GPT extraiu solicitanteNomeIA e usuário não setou:
     - Pega primeiroNome.toLowerCase()
     - prisma.user.findFirst({ name: { startsWith: primeiroNome } })
     - Se achou → solicitanteUserId. Se não → mantém texto livre.

5. Body do usuário > IA (manual sempre prevalece)

6. prazoFinal: "YYYY-MM-DD" + "T03:00:00Z" (meia-noite BRT = 03:00 UTC)

7. prisma.demanda.create com acoes nested + aiProcessado: true
```

### Heurísticas de classificação no prompt
- **IDEIA:** "tive uma ideia", "tive um insight", "pensei em", "e se...", tom exploratório/hipotético. Prioridade tende a BAIXA.
- **TAREFA:** pedido simples, só envolve quem fala. Ex.: "comprar pão amanhã", "ligar pro dentista".
- **DEMANDA (padrão):** solicitante terceiro, contexto narrativo, múltiplos passos.

### Regras de prioridade
- **ALTA:** urgente, hoje, imediato, crítico
- **BAIXA:** sem pressa, semana que vem, ideias em geral
- **MEDIA:** padrão

### Resolução de prazos relativos
- "amanhã" → hoje + 1
- "próximo domingo" / "domingo que vem" → calcula
- "semana que vem" → segunda-feira da próxima
- "fim do mês" → último dia do mês corrente
- Retorna YYYY-MM-DD absoluto

### Descrição rica
O prompt instrui o GPT a gerar descrição com 1 a 3 parágrafos curtos, **preservando todo o contexto** (motivação, envolvidos, restrições, justificativas, riscos) em prosa fluida — não apenas repetir o título.

---

## 7. EXPORTAÇÃO .ICS

- Rota: `GET /api/demandas/[id]/calendar.ics`
- Evento de **1 hora começando às 09:00 BRT** do dia do prazo
- Implementa RFC 5545:
  - `fmtIcsUtc`: formato `YYYYMMDDTHHmmssZ`
  - `escapeIcs`: escapa `\ ; , \n`
  - `foldIcs`: quebra linhas em 75 octets com indent
- Headers: `text/calendar; charset=utf-8` + `Content-Disposition: attachment`
- Compatível com Google Calendar, Apple Calendar, Outlook
- UID: `demanda-${id}@demandoo.net`

---

## 8. SCHEMA — Modelos necessários

```prisma
model Demanda {
  id                Int
  companyId         Int                // tenant
  userId            Int                // dono
  titulo            String
  descricao         String?
  status            DemandaStatus      // ABERTA, EM_ANDAMENTO, CONCLUIDA, CANCELADA
  prioridade        DemandaPrioridade  // ALTA, MEDIA, BAIXA
  tipo              DemandaTipo        // DEMANDA, TAREFA, IDEIA
  prazo             DateTime?
  solicitanteUserId Int?
  solicitanteNome   String?            // texto livre se não é user
  delegadoUserId    Int?               // FALTA no demandoo
  delegadoNome      String?            // FALTA no demandoo
  audioUrl          String?
  aiProcessado      Boolean
  concluidoAt       DateTime?
  createdAt         DateTime
  deletedAt         DateTime?          // soft delete
  deletedBy         Int?
  acoes             DemandaAcao[]      // FALTA no demandoo
}

model DemandaAcao {                    // FALTA TODA no demandoo
  id          Int
  demandaId   Int
  descricao   String
  concluida   Boolean
  concluidaAt DateTime?
  createdAt   DateTime
  deletedAt   DateTime?
}
```

---

## 9. CONSTANTES VISUAIS COMPARTILHADAS (`src/lib/demandas.ts`)

```ts
TIPO_LABEL          // plural: "Demandas" / "Tarefas" / "Ideias"
TIPO_LABEL_SINGULAR // singular
TIPO_CHIP           // classes para badges
TIPO_ACCENT         // sistema completo: text, bg, bgHover, border, ring, iconText
STATUS_LABEL        // "Em aberto" / "Em andamento" / "Concluída" / "Cancelada"
PRIORIDADE_LABEL    // "Alta" / "Média" / "Baixa"
```

Esse sistema de tokens permite que qualquer componente consuma cores e textos de forma consistente — aba, botão, badge, ícone do header, tudo muda harmonicamente quando o tipo muda.

---

## 10. GAP ANALYSIS — o que falta no demandoo

### Funcionalidades AUSENTES totalmente:

| Funcionalidade | Onde existe no check-list |
|---|---|
| Sistema de **ações** (sub-checklist) | `acoes_demanda` table + 3 endpoints + UI no detalhe |
| **Mudar tipo** de uma demanda (dropdown no detalhe) | `mudarTipo()` em DemandaDetail.tsx |
| **Transições de status** contextuais (Iniciar/Concluir/Cancelar/Reabrir) | `STATUS_TRANSITIONS` map |
| Edição **inline** de título/descrição | `editingHeader` state |
| Card collapse "Editar detalhes" | `showMeta` state |
| **PessoaSelector** (toggle Usuário/Externo) | Componente reutilizável |
| Campo **Delegado** (delegadoUserId + delegadoNome) | Schema + UI |
| Cálculo de **duração** (criada → concluída) | `durHours()` |
| Badge **"Prazo vencido"** | Condicional `vencida` |
| **Download .ics** (Google/Apple/Outlook) | Rota `calendar.ics/route.ts` |
| **Match automático de solicitante** por primeiro nome | POST /api/demandas |
| **KPIs adaptados** por tipo (4 cards diferentes para cada) | Switch na page.tsx |
| **Filtro de período** server-side (from/to) | `handlePeriod()` |
| **Filtros client-side** (busca, status, prioridade) + Limpar | DemandasList state |
| **Contagem por tipo** nos badges das abas | `groupBy` no server |
| Modo **TAREFA** simplificado (checkbox inline, sem badges/desc) | `isTarefa` condicional |
| **Empty states** diferenciados por tipo | `TIPO_EMPTY_ICON` |
| Cronômetro durante gravação | `recSecs` |
| Detecção de codec MIME (`isTypeSupported`) | `startRec` |
| Tratamento de erro de permissão de microfone | catch no `getUserMedia` |
| Campos opcionais expansíveis no form de criação | `showExtra` toggle |
| Override usuário > IA (manual sempre vence) | `body.X ?? tipoIA` |
| **Soft delete de áudio do Cloudinary** ao excluir | `deleteCloudinaryAsset` |
| Sistema de **cores por tipo** centralizadas | `TIPO_ACCENT` em lib/demandas.ts |
| Preservação de filtro ao trocar de aba | `periodParams` |
| Badge ✦ **IA** quando processado | `aiProcessado` flag |
| Confirmação inline de exclusão (sem modal) | `confirmDelete` state |

### Funcionalidades que existem no demandoo mas estão simplificadas:
- Lista de demandas (sem filtros, sem busca, sem KPIs adaptados)
- Detalhe (sem ações, sem edição inline, sem mudar tipo, sem transições contextuais)
- Calendário (existe mas sem URL params e sem legenda completa)
- Criação (existe voz+texto, mas sem campos opcionais expansíveis nem PessoaSelector)

### Funcionalidades que existem no demandoo e NÃO existem no check-list:
- Controle de quota de IA (`aiUsedTotal` / `aiQuota`) — feature do freemium
- Banner de aviso de quota no Hub
- Bloqueio de voz quando quota esgotada
- Google OAuth como provider de auth
- PWA (manifest + apple-icon)
- Landing page pública multi-seção

---

## 11. ORDEM SUGERIDA DE IMPLEMENTAÇÃO

Para minimizar retrabalho, esta é a ordem recomendada:

1. **`src/lib/demandas.ts`** — constantes visuais (TIPO_LABEL, TIPO_CHIP, TIPO_ACCENT, STATUS_LABEL, PRIORIDADE_LABEL)
2. **Schema:** adicionar `DemandaAcao` model + `delegadoUserId`/`delegadoNome` na Demanda — entregar SQL ao usuário para rodar no phpMyAdmin
3. **APIs de ações:** `/api/demandas/[id]/acoes` (POST) e `[acaoId]` (PATCH/DELETE)
4. **API .ics:** `/api/demandas/[id]/calendar.ics` (copy + trocar UID para `@demandoo.net`)
5. **Hub (`/app`):** abas com badges de contagem, KPIs adaptados, filtros server+client, modo TAREFA simplificado, empty states por tipo
6. **Detalhe (`/app/[id]`):** mudar tipo, transições de status, edição inline, ações, collapse de detalhes, badge prazo vencido, download .ics
7. **Criação (`/app/nova`):** PessoaSelector, campos opcionais expansíveis, cronômetro, override manual > IA
8. **Calendário:** legenda + URL params ano/mes (estrutura já existe)
9. **POST /api/demandas:** match de solicitante por primeiro nome, override usuário > IA, soft delete de áudio no DELETE

Cada passo é essencialmente um copy-paste com adaptação de paths (`/demandas` → `/app`).
O grosso do trabalho intelectual (prompt da IA, lógica de fuso BRT, regex de prazo, RFC 5545)
já está pronto e testado em produção no check-list — basta portar preservando as adaptações:

**Adaptações ao portar do check-list para o demandoo:**
- `/demandas` → `/app`
- `userId: Number(session.user.id)` mantém igual (multi-tenant via companyId continua)
- UID do .ics: `@inicio.aprendiassim.com` → `@demandoo.net`
- Cor primária: violeta (mesma)
- **Sempre verificar quota de IA antes de chamar Whisper/GPT** (feature exclusiva do demandoo)
- Sidebar do demandoo é diferente da DemandasSidebar do check-list

---

## 12. CONTEXTO DE ONDE EXTRAIR O CÓDIGO ORIGINAL

Todos os arquivos de referência estão em `C:\Users\Ricardo\Blog\check-list`:

```
src/app/(app)/(demandas-nav)/
├── layout.tsx                                          # wrapper com sidebar
├── demandas/
│   ├── page.tsx                                        # Hub + KPIs + abas
│   ├── components/DemandasList.tsx                     # Lista + filtros
│   ├── nova/
│   │   ├── page.tsx
│   │   └── components/NovaDemandaForm.tsx              # Form voz/texto + PessoaSelector
│   ├── [id]/
│   │   ├── page.tsx
│   │   └── components/DemandaDetail.tsx                # Detalhe completo
│   └── calendario/
│       ├── page.tsx
│       └── components/CalendarioGrid.tsx

src/app/api/demandas/
├── route.ts                                            # GET + POST (pipeline IA)
├── [id]/
│   ├── route.ts                                        # GET + PATCH + DELETE
│   ├── acoes/
│   │   ├── route.ts                                    # POST ação
│   │   └── [acaoId]/route.ts                           # PATCH + DELETE ação
│   └── calendar.ics/route.ts                           # Download .ics

src/lib/demandas.ts                                     # Constantes visuais
```

Esses arquivos podem ser abertos como referência (ou copiados literalmente, adaptando paths)
ao implementar cada item da seção 11.
