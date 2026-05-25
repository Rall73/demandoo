# demandoo — Pipeline de Desenvolvimento

> Documento vivo de acompanhamento do projeto.
> Atualizado a cada ciclo de desenvolvimento.
> **Última atualização:** 2026-05-25

---

## 1. Visão do Produto

**demandoo.net** é um SaaS standalone de captura e gestão de demandas, tarefas e ideias com inteligência artificial.

### Problema que resolve
Profissionais e equipes perdem demandas recebidas por WhatsApp, reuniões, e-mail e conversas informais. Sem um sistema central de captura, itens se perdem, prazos são esquecidos e a delegação fica informal.

### Proposta de valor
- **Captura rápida** por voz ou texto livre — a IA estrutura automaticamente
- **Organização em três trilhos**: Demandas (solicitações externas), Tarefas (próprias) e Ideias
- **Gestão leve**: status, prioridade, prazo, delegação, próximas ações
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
| IA — estruturação | OpenAI GPT-4o-mini |
| Upload de áudio | Cloudinary |
| E-mail transacional | Nodemailer + Gmail SMTP (App Password) |
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
                    └── acoes_demanda
accounts / sessions / verification_tokens  (Auth.js)
```

### Convenções aplicadas
- Soft delete em todas as entidades de domínio (`deletedAt`, `deletedBy`)
- `companyId` em toda tabela de domínio (isolamento de tenant)
- Fuso horário: servidor UTC, lógica de "hoje" sempre em BRT via `src/lib/date.ts`

### Dados de referência — tabela `plans` (estado atual)

| id | slug | name | priceCents | aiQuota | maxUsers | Tipo | Observação |
|---|---|---|---|---|---|---|---|
| 1 | `free` | Gratuito | 0 | 20 | 1 | Individual | Default no cadastro — `planId: 1` hardcoded |
| 2 | `pro` | Profissional | 1990 | NULL | 1 | Legado | Slug antigo, mantido para não quebrar dados |
| 3 | `team` | Equipe | 4990 | NULL | 5 | Legado | Slug antigo, mantido para não quebrar dados |
| 4 | `trial` | Trial | 0 | 100 | 5 | Especial | Período de teste — usa `planExpiresAt` |
| 5 | `basic` | Básico | placeholder | 200 | 1 | Individual | Plano pago individual básico |
| 6 | `complete` | Completo | placeholder | 500 | 1 | Individual | Plano pago individual completo |
| 7 | `basic_equipe` | Básico Equipe | placeholder | 500 | 5 | Equipe | Plano pago para equipes pequenas |
| 8 | `complete_equipe` | Completo Equipe | placeholder | 1500 | 20 | Equipe | Plano pago para equipes grandes |

> Preços (`priceCents`) são placeholders — ajustar via phpMyAdmin quando billing for definido.

**SQL para inserir `basic_equipe` e `complete_equipe` (rodar no phpMyAdmin dev e produção):**
```sql
-- Atualizar basic e complete para maxUsers=1 (individuais)
UPDATE plans SET maxUsers=1 WHERE slug IN ('basic', 'complete');

-- Inserir planos de equipe
INSERT INTO plans (slug, name, priceCents, aiQuota, maxUsers, active) VALUES
  ('basic_equipe',    'Básico Equipe',    14900,  500, 5,  1),
  ('complete_equipe', 'Completo Equipe',  29900, 1500, 20, 1);
```

**SQL da coluna nova (avatarUrl — sprint configurações):**
```sql
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `avatarUrl` VARCHAR(1000) NULL;
```

> ⚠️ Rodar nos dois bancos: `u822347350_demandoo_dev` (dev) e `u822347350_bd_demandoo` (produção)

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

### ✅ 4.3 Dashboard Principal (`/app`)

| Item | Status |
|---|---|
| Abas: Demandas / Tarefas / Ideias | ✅ |
| KPIs por tipo (4 cards por aba) | ✅ |
| Lista com filtro de status + prioridade + busca textual | ✅ |
| Modo card (Demandas/Ideias) com badges de status, prioridade, prazo, ações | ✅ |
| Modo checklist (Tarefas) com toggle ABERTA ↔ CONCLUÍDA com 1 clique | ✅ |
| Badge "IA" nos cards quando `aiProcessado = true` | ✅ |
| Banner de quota de IA (aviso quando ≤ 30% restante) | ✅ |
| Empty state por tipo | ✅ |

### ✅ 4.4 Captura (`/app/nova`)

| Modo | Campos | Status |
|---|---|---|
| **Voz** | Grava áudio → Whisper transcreve → GPT estrutura | ✅ |
| **Texto + IA** | Texto livre → GPT estrutura (título, tipo, prioridade, prazo, ações, solicitante) | ✅ |
| **Manual** | Título, descrição, tipo, prioridade, prazo, solicitante, delegado, próximas ações | ✅ |

**Pipeline de IA (voz e texto):**
1. Upload do áudio para Cloudinary
2. Transcrição via Whisper-1
3. Estruturação via GPT-4o-mini (JSON: título, descrição, tipo, prioridade, prazo, ações, solicitante)
4. Resolução de prazo relativo (BRT) via `parseDateBRT()`
5. Match de solicitante com usuário da empresa (por primeiro nome)
6. Criação da demanda + ações em transação

**Controle de quota:**
- Plano free: `aiQuota` fixo
- Cada captura com IA incrementa `company.aiUsedTotal`
- Quando `aiUsedTotal >= aiQuota`: IA bloqueada, modo manual liberado

### ✅ 4.5 Detalhe da Demanda (`/app/[id]`)

| Item | Status |
|---|---|
| Badges de status + prioridade + IA + prazo vencido | ✅ |
| Dropdown inline para trocar tipo | ✅ |
| Edição inline de título (clique para editar) | ✅ |
| Edição inline de descrição (clique para editar) | ✅ |
| Painel "Editar detalhes" (collapse): prioridade, prazo, delegado | ✅ |
| Metadados: criado em, concluído em + duração, solicitante, delegado, prazo, áudio | ✅ |
| Checklist de próximas ações (toggle feita, edição inline, soft delete, adicionar) | ✅ |
| Transições de status contextuais (Iniciar, Concluir, Cancelar, Reabrir) | ✅ |
| `concluidoAt` registrado ao concluir, limpo ao reabrir | ✅ |
| Soft delete com confirmação inline | ✅ |
| Export `.ics` (Google Calendar / Apple Calendar) | ✅ |

### ✅ 4.6 Calendário (`/app/calendario`)

| Item | Status |
|---|---|
| Grid mensal com demandas com prazo | ✅ |
| Navegação entre meses | ✅ |
| Badges coloridos por tipo (violet/emerald/amber) | ✅ |
| Data calculada em BRT | ✅ |

### ✅ 4.7 API REST

| Endpoint | Métodos | Status |
|---|---|---|
| `/api/demandas` | GET, POST | ✅ |
| `/api/demandas/[id]` | GET, PATCH, DELETE | ✅ |
| `/api/demandas/[id]/acoes` | POST | ✅ |
| `/api/demandas/[id]/acoes/[acaoId]` | PATCH, DELETE | ✅ |
| `/api/demandas/[id]/calendar.ics` | GET | ✅ |
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

### ✅ 4.8 Configurações da Conta (`/configuracoes`)

| Item | Status |
|---|---|
| Edição de perfil (nome + avatar) | ✅ |
| Troca de e-mail com verificação por token | ✅ |
| Alteração de senha (suporta criar 1ª senha para Google) | ✅ |
| Card de plano com countdown de trial | ✅ |

### ✅ 4.9 Equipe (`/equipe`)

| Item | Status |
|---|---|
| Lista de membros ativos | ✅ |
| Convites por e-mail (token) | ✅ |
| Aceitar convite (`/auth/convite`) | ✅ |
| Alterar role (ADMIN/USER) | ✅ |
| Remover membro (soft delete) | ✅ |

### ✅ 4.10 Painel Admin (`/admin`) — restrito a `SUPER_ADMIN_EMAIL`

| Item | Status |
|---|---|
| Dashboard com KPIs globais | ✅ |
| `/admin/empresas` — lista de tenants | ✅ |
| `/admin/usuarios` — lista global de usuários | ✅ |
| `/admin/planos` — edição inline (preço, quota, max users, ativo) | ✅ |
| `/admin/consumo` — OpenAI/Cloudinary/Cron + top 10 consumidores IA + links rápidos | ✅ |

### ✅ 4.11 Cron Jobs

| Item | Status |
|---|---|
| Lembretes de prazo D-0 e D-1 (11h BRT diariamente) | ✅ |
| Protegido por `Authorization: Bearer <CRON_SECRET>` | ✅ |
| Log de cada execução em `cron_execucoes` (enviados, d0, d1, erros, detalhes) | ✅ |
| Dispatcher externo: cron-job.org | ✅ |

### ✅ 4.12 Páginas Públicas

| Página | Status |
|---|---|
| `/` — Landing | ✅ |
| `/como-funciona` — Guia completo do produto (SSG) | ✅ |
| `/planos` — Tabela de planos individual + equipe | ✅ |
| `/auth/login`, `/auth/cadastro`, `/auth/verificar`, `/auth/esqueci-senha`, `/auth/nova-senha`, `/auth/convite`, `/auth/confirmar-email` | ✅ |

### ✅ 4.13 PWA / Identidade Visual

| Item | Status |
|---|---|
| Favicon ⚡ raio (32×32, gradiente violet) — `src/app/icon.tsx` | ✅ |
| Apple Touch Icon (180×180) — `src/app/apple-icon.tsx` | ✅ |
| SVG escalável para Android PWA — `public/icon.svg` | ✅ |
| `manifest.json` configurado (any + maskable) | ✅ |

---

## 5. Ambiente de Desenvolvimento

| Ambiente | Banco | URL |
|---|---|---|
| **Local** | `u822347350_demandoo_dev` (Hostinger) | `localhost:3000` |
| **Produção** | `u822347350_bd_demandoo` (Hostinger) | `demandoo.net` |

**Variáveis de ambiente:**
- `.env` → placeholders apenas (commitado, sem segredos)
- `.env.local` → valores reais locais (gitignored)
- Produção → painel Hostinger → Advanced → Environment Variables

**Portão pré-push:**
```bash
npx tsc --noEmit && npx next build && git push origin main
```

---

## 6. Backlog — O Que Ainda Será Criado

### 🔲 6.1 Planos e Billing

| Item | Prioridade | Observações |
|---|---|---|
| Página `/planos` (já referenciada na sidebar) | Alta | Exibe planos free/paid, CTA de upgrade |
| Integração com gateway de pagamento | Alta | Stripe ou Pagar.me |
| Webhook de pagamento → atualiza `planId` e `planExpiresAt` | Alta | |
| Controle de expiração de plano | Média | Banner de aviso + bloqueio suave |

### 🔲 6.2 Configurações da Conta

| Item | Prioridade | Observações |
|---|---|---|
| Página `/configuracoes` (perfil do usuário) | Alta | Nome, e-mail, senha, foto |
| Página `/configuracoes/empresa` | Alta | Nome, logo, slug da empresa |
| Exportação de dados pessoais (LGPD) | Alta | Obrigação legal — gera ZIP com todos os dados |
| Exclusão de conta (LGPD) | Alta | Soft delete + limpeza de dados pessoais |

### 🔲 6.3 Multi-usuário por Empresa

| Item | Prioridade | Observações |
|---|---|---|
| Convidar membros da equipe (por e-mail) | Alta | Gera token de convite |
| Gestão de membros (listar, remover, alterar role) | Alta | ADMIN vs USER |
| Demandas delegadas para outros usuários da empresa | Média | Hoje `delegadoNome` é texto livre; futuro: vincular ao `userId` |
| Visão de equipe: demandas de todos os membros (ADMIN) | Média | Filtro por `userId` no dashboard |

### ✅ 6.4 Notificações e Lembretes

| Item | Prioridade | Observações |
|---|---|---|
| E-mail de lembrete de prazo (D-1 e D0) | Alta | ✅ Cron job via cron-job.org — `GET /api/cron/lembretes` protegido por `CRON_SECRET` |
| Notificação de nova demanda delegada | Média | E-mail para o delegado |
| Notificação de demanda concluída | Baixa | E-mail para o solicitante |
| Notificações in-app (badge na sidebar) | Média | Tabela `notifications` |

### 🔲 6.5 Relatórios e Analytics

| Item | Prioridade | Observações |
|---|---|---|
| Página `/relatorios` | Média | |
| Gráfico de demandas por status ao longo do tempo | Média | |
| Tempo médio de resolução por tipo | Média | Usa `concluidoAt - createdAt` |
| Ranking de solicitantes (quem mais demanda) | Baixa | |
| Export CSV da lista de demandas | Média | Filtros aplicados → CSV |

### 🔲 6.6 Melhorias de UX

| Item | Prioridade | Observações |
|---|---|---|
| Paginação ou scroll infinito na lista (hoje limit 100) | Média | |
| Ordenação customizada na lista (colunas clicáveis) | Média | |
| Arquivar demandas concluídas (ocultar por padrão) | Média | |
| Busca global (ctrl+K) com resultados em tempo real | Baixa | |
| Drag & drop para reordenar ações da demanda | Baixa | |
| Atalhos de teclado no detalhe (S para salvar, etc.) | Baixa | |

### 🔲 6.7 Integrações

| Item | Prioridade | Observações |
|---|---|---|
| Webhook de saída (notificar sistema externo quando status muda) | Baixa | |
| API pública com autenticação por token | Baixa | Permite integração Zapier/n8n |
| Captura via e-mail (endereço único por empresa) | Baixa | Recebe e-mail → cria demanda |

---

## 7. Débitos Técnicos

| Item | Impacto | Observações |
|---|---|---|
| SMTP: migrado para Hostinger (noreply@demandoo.net) | ✅ Resolvido | smtp.hostinger.com:465 (SSL) — funciona local e produção. **Atenção:** senha do mailbox não pode conter `#` ou outros especiais — parser de env var trunca a string → `535 auth failed`. Senha atual: só alphanum. |
| `.env` tinha segredos commitados | 🟡 Resolvido | Corrigido em 2026-05-24 — agora só placeholders |
| `delegadoNome` ainda é texto livre | 🟡 Médio | Não vincula ao `users.id`; melhorar quando multi-usuário chegar |
| Queries sem paginação (take: 100) | 🟡 Médio | OK para MVP; escalar quando base crescer |
| `new Date()` cru em `DetalheActions.tsx` (só para log, não salvo) | 🟢 Baixo | Não impacta dados |

---

## 8. Histórico de Versões

| Data | Versão | O que foi entregue |
|---|---|---|
| 2026-05-?? | v0.1 | Estrutura inicial: auth, schema, dashboard, captura voz + IA |
| 2026-05-?? | v0.2 | Calendário, export .ics, modo texto + IA, filtros na lista |
| 2026-05-24 | v0.3 | aiProcessado badge, concluidoAt + duração, delegadoNome, AcoesInterativas interativo |
| 2026-05-24 | v0.4 | Captura manual completa: prioridade, prazo, solicitante, delegado, ações inline |
| 2026-05-24 | v0.4.1 | Segurança: `.env` limpo de segredos; PIPELINE.md criado |
| 2026-05-24 | v0.5 | SMTP Hostinger corrigido; Google OAuth → criar senha; login erros PT-BR |
| 2026-05-24 | v0.6 | Página `/configuracoes`: perfil, avatar, troca de e-mail c/ verificação, senha, plano |
| 2026-05-24 | v0.7 | Página `/planos` (individual + equipe), gestão de `/equipe` c/ convites por e-mail, lembretes de prazo por cron (D-0 e D-1), middleware corrigido |
| 2026-05-25 | v0.8 | Página pública `/como-funciona` (guia do produto), classificação IA corrigida (voz/texto: IA decide o tipo, seletor só em manual), painel `/admin` completo (dashboard + empresas + usuários + planos com edição inline + consumo de recursos), API `PATCH /api/admin/planos/[id]`, log de execuções do cron em `cron_execucoes`, novo ícone ⚡ (raio) em todos os formatos, ordenação na lista (Padrão / Prazo / Prioridade / Recente) |

---

## 9. Próximas Entregas Planejadas

> Atualizar esta seção a cada sprint.

### Sprint atual
- Definir próximo sprint (sugestões: billing/pagamento, LGPD, ou notificações)

### Backlog priorizado (atualizado 2026-05-25)
- [ ] 🔴 Billing/pagamento (Stripe ou Pagar.me) — sem isso planos pagos não ativam
- [ ] 🔴 Exportação de dados (LGPD) — obrigação legal
- [ ] 🔴 Exclusão de conta (LGPD) — obrigação legal
- [ ] 🟡 Notificação de nova demanda delegada (e-mail para o delegado)
- [ ] 🟡 Notificação de demanda concluída (e-mail para o solicitante)
- [ ] 🟡 Notificações in-app (badge na sidebar)
- [ ] 🟡 Delegação vinculada a `userId` (hoje é texto livre)
- [ ] 🟡 Paginação nas listagens (hoje limitadas a 100 registros)
- [ ] 🟡 Relatórios / export CSV

### Mudanças no fluxo de trabalho (2026-05-25)
**Regra acordada:** Claude **nunca faz push sem autorização explícita**. Fluxo:
1. Implementa as mudanças
2. Roda `npx tsc --noEmit` + `npx next build` localmente
3. Avisa que está pronto para teste
4. Aguarda Ricardo dizer "pode subir" antes de qualquer `git push`

---

*Este documento é mantido manualmente. Atualize sempre que uma entrega for concluída ou um novo item for identificado.*
