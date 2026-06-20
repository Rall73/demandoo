# demandoo — Pipeline de Desenvolvimento

> Documento vivo de acompanhamento do projeto.
> Atualizado a cada ciclo de desenvolvimento.
> **Última atualização:** 2026-06-20 (v1.4.2)

---

## 1. Visão do Produto

**demandoo.net** é um SaaS standalone de captura e gestão de demandas, tarefas e ideias com inteligência artificial.

### Problema que resolve
Profissionais e equipes perdem demandas recebidas por WhatsApp, reuniões, e-mail e conversas informais. Sem um sistema central de captura, itens se perdem, prazos são esquecidos e a delegação fica informal.

### Proposta de valor
- **Captura rápida** por voz ou texto livre — a IA estrutura automaticamente
- **Organização em três trilhos**: Demandas (solicitações externas), Tarefas (próprias) e Ideias
- **Histórico completo**: cada item tem linha do tempo de atualizações, notas de voz e log automático de status
- **Relatório IA**: GPT gera relatório estruturado do ciclo de vida completo, editável e imprimível
- **Multi-tenant**: cada empresa tem seu ambiente isolado

### Modelo de negócio
Planos por empresa (tenant). Plano free com quota de IA limitada; planos pagos com quota maior e mais usuários.

---

## 2. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguagem | TypeScript |
| Banco de dados | MySQL (Hostinger) |
| ORM | Prisma |
| Autenticação | Auth.js v5 (Credentials + Google OAuth) |
| IA — transcrição | OpenAI Whisper-1 |
| IA — estruturação / relatórios | OpenAI GPT-4o-mini |
| Upload de áudio / avatares | Cloudinary |
| E-mail transacional | Nodemailer + Hostinger SMTP |
| Estilização | Tailwind CSS |
| Ícones | lucide-react |
| Deploy | Hostinger (Node.js Passenger) |
| Ambiente local | `.env.local` → banco dev separado (`demandoo_dev`) |

---

## 3. Arquitetura do Banco de Dados

```
plans
  └── companies (tenant)
        └── users
              └── demandas
              │     ├── acoes_demanda
              │     ├── comentarios
              │     └── anexos
              └── listas
                    └── itens_lista
accounts / sessions / verification_tokens  (Auth.js)
cron_execucoes
```

### Convenções aplicadas
- Soft delete em todas as entidades de domínio (`deletedAt`, `deletedBy`)
- `companyId` em toda tabela de domínio (isolamento de tenant)
- Fuso horário: servidor UTC, lógica de "hoje" sempre em BRT via `src/lib/date.ts`

### Campos relevantes em `demandas`

| Campo | Tipo | Descrição |
|---|---|---|
| `relatorioGerado` | LONGTEXT NULL | Relatório IA editável |
| `relatorioGeradoAt` | DATETIME(3) NULL | Data da última geração |

### Tabela `comentarios` (nova — v1.0)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INT PK | |
| `demandaId` | INT | FK demandas |
| `userId` | INT | FK users |
| `companyId` | INT | isolamento tenant |
| `conteudo` | TEXT | texto / transcrição |
| `audioUrl` | VARCHAR(1000) NULL | URL Cloudinary (notas de voz) |
| `tipo` | VARCHAR(20) | `NOTA` \| `AUDIO` \| `STATUS` |
| `createdAt` | DATETIME(3) | |
| `deletedAt` | DATETIME(3) NULL | soft delete |
| `deletedBy` | INT NULL | |

### Dados de referência — tabela `plans`

| id | slug | name | priceCents | aiQuota | maxUsers | Tipo |
|---|---|---|---|---|---|---|
| 1 | `free` | Gratuito | 0 | 20 | 1 | Individual |
| 2 | `pro` | Profissional | 1990 | NULL | 1 | Legado |
| 3 | `team` | Equipe | 4990 | NULL | 5 | Legado |
| 4 | `trial` | Trial | 0 | 100 | 5 | Especial |
| 5 | `basic` | Básico | placeholder | 200 | 1 | Individual |
| 6 | `complete` | Completo | placeholder | 500 | 1 | Individual |
| 7 | `basic_equipe` | Básico Equipe | 14900 | 500 | 5 | Equipe |
| 8 | `complete_equipe` | Completo Equipe | 29900 | 1500 | 20 | Equipe |

> Preços `basic`/`complete` são placeholders — ajustar via phpMyAdmin quando billing for definido.

### SQLs históricos (referência — já rodados em dev + prod)

```sql
-- v1.0 — histórico de comentários + relatório IA
CREATE TABLE `comentarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `demandaId` INT NOT NULL, `userId` INT NOT NULL, `companyId` INT NOT NULL,
  `conteudo` TEXT NOT NULL, `audioUrl` VARCHAR(1000) NULL,
  `tipo` VARCHAR(20) NOT NULL DEFAULT 'NOTA',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deletedAt` DATETIME(3) NULL, `deletedBy` INT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_comentarios_demanda` (`demandaId`),
  INDEX `idx_comentarios_company` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `demandas`
  ADD COLUMN `relatorioGerado`   LONGTEXT    NULL,
  ADD COLUMN `relatorioGeradoAt` DATETIME(3) NULL;
```

---

## 4. Módulos Implementados

### ✅ 4.1 Autenticação

| Item | Arquivo | Status |
|---|---|---|
| Login e-mail + senha | `src/app/auth/login/` | ✅ |
| Login com Google OAuth | `src/auth/index.ts` | ✅ |
| Cadastro com criação automática de empresa | `src/app/api/auth/cadastro/route.ts` | ✅ |
| Verificação de e-mail (token 24h) | `src/app/auth/verificar/` | ✅ |
| Esqueci minha senha (token 1h) | `src/app/auth/esqueci-senha/` | ✅ |
| Redefinição de senha | `src/app/auth/nova-senha/` | ✅ |
| Bloqueio de conta inativa / empresa suspensa | `src/auth/index.ts` | ✅ |
| LGPD consent no cadastro (`lgpdConsentAt`) | `src/app/api/auth/cadastro/route.ts` | ✅ |
| Google: criação automática de empresa no 1º acesso | `src/auth/index.ts` | ✅ |

### ✅ 4.2 Layout e Navegação

| Item | Arquivo | Status |
|---|---|---|
| Sidebar desktop (violet-950) | `src/components/Sidebar.tsx` | ✅ |
| Drawer mobile (menu hamburguer) | `src/components/Sidebar.tsx` | ✅ |
| Badge de quota de IA na sidebar | `src/components/Sidebar.tsx` | ✅ |
| Proteção de rota (redirect → login) | `src/app/(app)/layout.tsx` | ✅ |
| Nav: Início / Demandas / Tarefas / Ideias / Calendário / Relatórios / Nova captura / Configurações / Equipe | `src/components/Sidebar.tsx` | ✅ |

### ✅ 4.3 Dashboard (`/app`)

| Item | Status |
|---|---|
| 3 cards resumo (Demanda / Tarefa / Ideia) | ✅ |
| Métricas por card: Total, Concluídas, No prazo, Vencidas | ✅ |
| Métricas de Ideia: Total, Em exploração, Concluídas, Arquivadas | ✅ |
| Botão único "Nova captura" | ✅ |
| Banner de quota de IA (aviso quando ≤ 30%) | ✅ |
| Cards clicáveis → `/app/lista?tipo=X` | ✅ |

### ✅ 4.4 Lista (`/app/lista?tipo=X`)

| Item | Status |
|---|---|
| Abas: Demandas / Tarefas / Ideias com badges de contagem | ✅ |
| KPIs por tipo (4 cards por aba) | ✅ |
| Filtro de status + prioridade + busca textual | ✅ |
| Ordenação: Padrão / Prazo mais próximo / Prioridade / Recente | ✅ |
| Modo card (Demandas/Ideias) com badges de status, prioridade, prazo, ações | ✅ |
| Modo checklist (Tarefas) com toggle ABERTA ↔ CONCLUÍDA com 1 clique | ✅ |
| Empty state por tipo | ✅ |

### ✅ 4.5 Captura (`/app/nova`)

| Modo | Campos | Status |
|---|---|---|
| **Voz** | Grava áudio → Whisper transcreve → GPT estrutura | ✅ |
| **Texto + IA** | Texto livre → GPT estrutura | ✅ |
| **Manual** | Título, descrição, tipo, prioridade, prazo, solicitante, delegado, ações | ✅ |

### ✅ 4.6 Detalhe (`/app/[id]`)

| Item | Status |
|---|---|
| Badges de status + prioridade + IA + prazo vencido | ✅ |
| Botão de impressão unitária (ícone Printer → `/relatorios/imprimir?ids={id}`) | ✅ |
| Edição inline de título, descrição, tipo, prioridade, prazo, delegado | ✅ |
| Metadados: criado em, concluído em + duração, solicitante, delegado, prazo, áudio | ✅ |
| Checklist de ações (toggle, edição inline, soft delete, adicionar) | ✅ |
| Transições de status contextuais (Iniciar / Concluir / Cancelar / Reabrir) | ✅ |
| Export `.ics` (Google Calendar / Apple Calendar) | ✅ |
| **Histórico de comentários** (texto + voz + auto-log de status) | ✅ |
| **Relatório IA** (gerar / editar / imprimir) | ✅ |

### ✅ 4.7 Histórico de Comentários

| Item | Status |
|---|---|
| Nota de texto (inline, Ctrl+Enter) | ✅ |
| Nota de voz (grava → upload Cloudinary → Whisper transcreve → salva texto + áudio) | ✅ |
| Auto-log de mudanças de status (`tipo: STATUS`, itálico cinza) | ✅ |
| Soft delete de comentários (só o autor) | ✅ |
| Timeline cronológica com ícones por tipo | ✅ |

### ✅ 4.8 Relatório IA por Item

| Item | Status |
|---|---|
| Geração com GPT-4o-mini (abertura / desenvolvimento / conclusão) | ✅ |
| Consome 1 crédito da quota de IA do plano | ✅ |
| Salvamento automático após geração | ✅ |
| Edição manual (textarea com markdown simples) | ✅ |
| Botão "Imprimir" → página de impressão com relatório incluso | ✅ |
| Botão "Regenerar" para atualizar após novas atualizações | ✅ |

### ✅ 4.9 Relatórios (`/relatorios` + `/relatorios/imprimir`)

| Item | Status |
|---|---|
| Seleção por checkbox com filtros (status, prioridade, busca, ordenação) | ✅ |
| Abas por tipo com contagem | ✅ |
| Barra inferior fixa com contador e botão "Gerar relatório" | ✅ |
| Página de impressão limpa (sem sidebar) — CSS `@media print` | ✅ |
| Cabeçalho com empresa, usuário e data de geração | ✅ |
| Cada item: título, badges, descrição, checklist de ações, relatório IA (se gerado) | ✅ |
| Botão "Imprimir / Salvar PDF" → `window.print()` (PDF nativo do browser) | ✅ |
| Rota group `(print)` sem sidebar — layout mínimo com auth guard | ✅ |

### ✅ 4.10 Calendário (`/app/calendario`)

| Item | Status |
|---|---|
| Grid mensal com demandas com prazo | ✅ |
| Navegação entre meses | ✅ |
| Badges coloridos por tipo (violet/emerald/amber) | ✅ |

### ✅ 4.11 API REST

| Endpoint | Métodos | Status |
|---|---|---|
| `/api/demandas` | GET, POST | ✅ |
| `/api/demandas/[id]` | GET, PATCH (+ auto-log status), DELETE | ✅ |
| `/api/demandas/[id]/acoes` | POST | ✅ |
| `/api/demandas/[id]/acoes/[acaoId]` | PATCH, DELETE | ✅ |
| `/api/demandas/[id]/calendar.ics` | GET | ✅ |
| `/api/demandas/[id]/comentarios` | GET, POST | ✅ |
| `/api/demandas/[id]/comentarios/[cId]` | PATCH (editar), DELETE | ✅ |
| `/api/diario/[data]/exportar-doc` | GET (gera `.doc` Word) | ✅ |
| `/api/demandas/[id]/relatorio` | POST (gerar IA), PATCH (salvar edição) | ✅ |
| `/api/upload/audio` | POST | ✅ |
| `/api/upload/avatar` | POST | ✅ |
| `/api/auth/cadastro` | POST | ✅ |
| `/api/auth/esqueci-senha` | POST | ✅ |
| `/api/auth/nova-senha` | POST | ✅ |
| `/api/auth/aceitar-convite` | POST | ✅ |
| `/api/configuracoes/perfil` | PATCH | ✅ |
| `/api/configuracoes/email` | POST | ✅ |
| `/api/configuracoes/senha` | POST | ✅ |
| `/api/equipe` | GET | ✅ |
| `/api/equipe/[userId]` | PATCH, DELETE | ✅ |
| `/api/equipe/convite` | POST | ✅ |
| `/api/equipe/convite/[token]` | GET | ✅ |
| `/api/admin/planos/[id]` | PATCH | ✅ |
| `/api/cron/lembretes` | GET (bearer auth) | ✅ |

### ✅ 4.12 Configurações (`/configuracoes`)

| Item | Status |
|---|---|
| Edição de perfil (nome + avatar) | ✅ |
| Troca de e-mail com verificação por token | ✅ |
| Alteração de senha (suporta criar 1ª senha para Google) | ✅ |
| Card de plano com countdown de trial | ✅ |

### ✅ 4.13 Equipe (`/equipe`)

| Item | Status |
|---|---|
| Lista de membros ativos | ✅ |
| Convites por e-mail (token) | ✅ |
| Aceitar convite (`/auth/convite`) | ✅ |
| Alterar role (ADMIN/USER) | ✅ |
| Remover membro (soft delete) | ✅ |

### ✅ 4.14 Painel Admin (`/admin`) — restrito a `SUPER_ADMIN_EMAIL`

| Item | Status |
|---|---|
| Dashboard com KPIs globais | ✅ |
| `/admin/empresas` — lista de tenants | ✅ |
| `/admin/usuarios` — lista global | ✅ |
| `/admin/planos` — edição inline (preço, quota, max users, ativo) | ✅ |
| `/admin/consumo` — OpenAI/Cloudinary/Cron + top 10 consumidores IA | ✅ |

### ✅ 4.15 Cron Jobs

| Item | Status |
|---|---|
| Lembretes de prazo D-0 e D-1 (11h BRT) para demandas | ✅ |
| Lembretes de itens de lista — N dias antes do vencimento (8h BRT) | ✅ |
| Itens recorrentes (aniversários): `lembreteEnviadoAt` resetado após envio | ✅ |
| Protegido por `Authorization: Bearer <CRON_SECRET>` | ✅ |
| Log de execução em `cron_execucoes` | ✅ |

### ✅ 4.18 Módulo Listas (v1.2)

| Item | Status |
|---|---|
| Galeria de listas `/app/listas` — cards por tipo com contagem de pendentes | ✅ |
| Criar lista: título + tipo (COMPRAS / VENCIMENTOS / LEMBRETES / GERAL) | ✅ |
| Detalhe `/app/listas/[id]` — checklist com toggle, edição inline completa, soft delete | ✅ |
| Adicionar item por texto (Enter) | ✅ |
| Adicionar item por áudio: Whisper transcreve → GPT extrai texto + data + recorrência | ✅ |
| Edição completa do item: texto, data, aviso antecipado, recorrência, link | ✅ |
| Itens concluídos colapsados em seção separada | ✅ |
| Campos extras por tipo: data + lembrete (VENCIMENTOS/LEMBRETES), link (COMPRAS) | ✅ |
| Sidebar: entrada "Listas" com ícone `ListChecks` | ✅ |

### ✅ 4.19 Quadro de Foco (v1.3 + v1.3.1)

| Item | Status |
|---|---|
| Quadro Kanban `/app/foco` — colunas por status (ABERTA / EM_ANDAMENTO / CONCLUIDA) | ✅ |
| Drag-and-drop entre colunas (move demanda + atualiza status via PATCH) | ✅ |
| Filtros por tipo (DEMANDA / TAREFA / IDEIA) e ordenação (prazo, prioridade, criação) | ✅ |
| Cards com badges de tipo, prioridade, prazo e contagem de ações | ✅ |
| Sessões de foco: cronômetro por card, salva `sessoes_foco` com `duracaoMin` | ✅ |
| Sidebar: entrada "Foco" com ícone `Timer` | ✅ |

### ✅ 4.20 Módulo Diário (v1.4 + v1.4.1 + v1.4.2)

| Item | Status |
|---|---|
| Página `/app/diario` — visão do dia com painel esquerdo (agenda/ações/foco) e direito (registros) | ✅ |
| Navegação entre dias (anterior / próximo) com clamp no dia de hoje | ✅ |
| Bug fix: `key={dataISO}` no `DiarioClient` evita `useState` congelado ao navegar | ✅ |
| Painel esquerdo: demandas com prazo hoje, ações pendentes hoje, resumo de tempo de foco | ✅ |
| Painel direito: timeline de registros do dia (tipo DIARIO) — TELEFONEMA / EMAIL / REUNIAO / NOTA | ✅ |
| Criar registro com selector de tipo + textarea + Ctrl+Enter | ✅ |
| Edição inline de registros (lápis → textarea → salva via PATCH `/comentarios/[id]`) | ✅ |
| Soft delete de registros (lixeira) | ✅ |
| Botão "+ Demanda" por registro abre modal de nova captura vinculada ao contexto | ✅ |
| Criação automática do `DIARIO` do dia (tipo `DIARIO` no model `Demanda`) | ✅ |
| Página de impressão `/diario/[data]/imprimir` — coluna única, sem sidebar | ✅ |
| Layout impresso: Agenda → Ações → Tempo de foco → Registros por tipo | ✅ |
| Subtítulo no cabeçalho: "Diário demandoo — Nome do usuário" | ✅ |
| Exportar PDF: ícone no Diário abre página de impressão com `?pdf=1` → auto-dispara `window.print()` | ✅ |
| `AutoPrint.tsx`: define `document.title` antes de `window.print()` → Chrome usa como nome do PDF | ✅ |
| Exportar Word: ícone baixa `.doc` via `/api/diario/[data]/exportar-doc` | ✅ |
| Word: HTML MSO com `@page Section1 { margin }` + `div.Section1` — margens corretas no Word | ✅ |
| Nome do arquivo: `2026-06-16 - Diário Ricardo Luize` (PDF e Word) | ✅ |
| 3 ícones de export na tela do Diário: Printer / FileText (PDF) / FileDown (Word) | ✅ |
| Sidebar: entrada "Diário" com ícone `BookOpen` | ✅ |

### ✅ 4.16 Páginas Públicas

| Página | Status |
|---|---|
| `/` — Landing | ✅ |
| `/como-funciona` — Guia completo do produto (SSG) | ✅ |
| `/planos` — Tabela de planos individual + equipe | ✅ |
| Fluxos auth completos | ✅ |

### ✅ 4.17 PWA / Identidade Visual

| Item | Status |
|---|---|
| Favicon ⚡ (32×32) — `src/app/icon.tsx` | ✅ |
| Apple Touch Icon (180×180) — `src/app/apple-icon.tsx` | ✅ |
| SVG PWA — `public/icon.svg` | ✅ |
| `manifest.json` (any + maskable) | ✅ |

---

## 5. Ambiente de Desenvolvimento

| Ambiente | Banco | URL |
|---|---|---|
| **Local** | `u822347350_demandoo_dev` | `localhost:3000` |
| **Produção** | `u822347350_bd_demandoo` | `demandoo.net` |

**Variáveis de ambiente:**
- `.env` → placeholders apenas (commitado, sem segredos)
- `.env.local` → valores reais locais (gitignored)
- Produção → painel Hostinger → Advanced → Environment Variables

**Portão pré-push:**
```bash
npx tsc --noEmit && npx next build
```

---

## 6. Backlog — O Que Ainda Será Criado

### 🔲 6.1 Planos e Billing (🔴 Alta — bloqueador de receita)

**Gateway escolhido: Asaas** (plataforma BR, recorrência nativa, Pix + boleto + cartão, sem câmbio)

| Item | Prioridade |
|---|---|
| Integração Asaas — checkout de assinatura | 🔴 |
| Webhook Asaas → atualiza `planId` e `planExpiresAt` | 🔴 |
| Controle de expiração de plano | 🔴 |
| Reverter `free.aiQuota` de 500 → 20 antes de ativar billing | 🔴 |

> **Nota:** free plan está com `aiQuota = 500` temporariamente (beta, aumentado em 2026-05-28). Reverter via phpMyAdmin antes do billing entrar no ar.

### 🔲 6.2 LGPD (🔴 Alta — obrigação legal)

| Item | Prioridade |
|---|---|
| Exportação de dados pessoais (gera ZIP) | 🔴 |
| Exclusão de conta (soft delete + limpeza) | 🔴 |

### 🔲 6.3 Notificações

| Item | Prioridade |
|---|---|
| E-mail: nova demanda delegada | 🟡 |
| E-mail: demanda concluída (para solicitante) | 🟡 |
| Notificações in-app (badge sidebar) | 🟡 |

### 🔲 6.4 Melhorias de UX

| Item | Prioridade |
|---|---|
| Delegação vinculada a `userId` (hoje texto livre) | 🟡 |
| Paginação nas listagens (hoje limit 100/200) | 🟡 |
| Export CSV da lista com filtros aplicados | 🟡 |
| Drag & drop para reordenar ações | 🟢 |
| Busca global (Ctrl+K) | 🟢 |

### 🔲 6.5 Indicador Pessoal / Trabalho (em avaliação)

Ideia levantada em 2026-06-07: Ricardo usa a mesma conta para demandas profissionais e pessoais. Possível solução: campo `contexto: TRABALHO | PESSOAL` em `demandas` e `listas`.

**Prós:** filtragem por contexto, dashboard separado, foco situacional.
**Contras:** atrito na captura rápida se obrigatório; baixo preenchimento se opcional; IA pode inferir mas com margem de erro.
**Alternativa futura:** IA infere o contexto pelo conteúdo e sugere — usuário confirma ou corrige.

| Item | Prioridade |
|---|---|
| Avaliar adoção real após uso do v1.2 por algumas semanas | 🟡 |
| Se aprovado: campo `contexto` em `demandas` + `listas` + filtro na UI | 🟡 |

### 🔲 6.6 Melhorias futuras no módulo Listas

| Item | Prioridade |
|---|---|
| Captura de lista via "Nova captura" global (detectar intenção por IA) | 🟡 |
| Busca de preços/lojas por IA para itens de COMPRAS (requer API externa) | 🟢 |

---

## 7. Débitos Técnicos

| Item | Impacto |
|---|---|
| `delegadoNome` ainda é texto livre | 🟡 Médio — não vincula ao `users.id` |
| Queries sem paginação (take: 100/200) | 🟡 Médio — OK para MVP |
| `new Date()` cru em `DetalheActions.tsx` (só para log client) | 🟢 Baixo |

---

## 8. Histórico de Versões

| Data | Versão | O que foi entregue |
|---|---|---|
| 2026-05-?? | v0.1–v0.5 | Auth, schema, captura, calendário, SMTP, Google OAuth |
| 2026-05-24 | v0.6 | Configurações: perfil, avatar, e-mail, senha, plano |
| 2026-05-24 | v0.7 | Planos, equipe + convites, cron lembretes D-0/D-1, middleware |
| 2026-05-25 | v0.8 | Admin panel completo, cron log, ícone ⚡, classificação IA corrigida |
| 2026-05-25 | v0.9 | Dashboard com 3 cards, lista separada `/app/lista`, ordenação, relatórios + impressão |
| 2026-05-25 | v1.0 | Histórico de comentários (texto + voz + auto-log status), relatório IA por item editável |
| 2026-05-27 | v1.1 | Google Analytics (G-RZNM5FMJ22), link ajuda no sidebar, landing + /como-funciona atualizados |
| 2026-05-28 | — | Free aiQuota: 20 → 500 (temp, beta). Decisão: manter PWA, não publicar em lojas por ora |
| 2026-06-07 | v1.2 | Módulo Listas: galeria, checklist, captura por áudio (Whisper+GPT estruturado), cron de lembretes |
| 2026-06 | v1.3 | Quadro de foco com Kanban drag-and-drop e cronômetro de sessões |
| 2026-06 | v1.3.1 | Filtros por tipo e ordenação no quadro de foco |
| 2026-06-16 | v1.4 | Módulo Diário: timeline de registros, sessões de foco, navegação entre dias, impressão |
| 2026-06-16 | v1.4.1 | Edição inline de registros e bug fix de navegação (`key={dataISO}`) |
| 2026-06-20 | v1.4.2 | Export PDF (AutoPrint) e Word (HTML MSO) com formatação correta; 3 ícones de export; subtítulo "Diário demandoo" |

---

## 9. Fluxo de Trabalho

**Regra absoluta:** Claude **nunca faz push sem autorização explícita do Ricardo.**

1. Implementar + `npx tsc --noEmit` + `npx next build`
2. Avisar Ricardo que está pronto para teste local
3. Ricardo testa localmente
4. Ricardo diz "pode subir" / "faz o push"
5. Se houver mudança de schema: Ricardo roda SQL no phpMyAdmin **primeiro** (dev + prod), depois push

---

*Este documento é mantido manualmente. Atualize sempre que uma entrega for concluída.*
