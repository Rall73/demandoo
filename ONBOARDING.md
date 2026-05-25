# demandoo.net — Documento de Contexto Completo

> **Este arquivo é o ponto de partida obrigatório para qualquer sessão de desenvolvimento no projeto demandoo.**
> Leia integralmente antes de escrever qualquer linha de código.
>
> Última atualização: 2026-05-25 (v0.8)

---

## 1. O que é o demandoo

**demandoo.net** é um SaaS standalone de captura de demandas, tarefas e ideias com IA.
É um produto independente — **não tem nenhuma relação com o projeto inicio.aprendiassim.com**.

**Problema que resolve:** Profissionais recebem pedidos, tarefas e ideias de forma caótica ao longo do dia (WhatsApp, reunião, voz, e-mail) e perdem coisas por falta de sistema rápido de captura.

**Diferencial:** O usuário fala ou digita qualquer coisa e a IA (Whisper + GPT-4o-mini) estrutura automaticamente: título, tipo, prioridade, prazo, solicitante e próximas ações.

**Multi-tenant:** cada empresa (`Company`) tem seu ambiente isolado. Convites e equipe via `/equipe`.

---

## 2. Stack e versões

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| ORM | Prisma 6 (MySQL) |
| Auth | Auth.js v5 (next-auth@beta) — JWT strategy |
| Banco | MySQL/MariaDB via Hostinger |
| IA | OpenAI Whisper (transcrição) + GPT-4o-mini (estruturação) |
| Armazenamento | Cloudinary (áudio + avatares) |
| E-mail | Nodemailer + Hostinger SMTP (`smtp.hostinger.com:465`) |
| UI | Tailwind CSS v4, lucide-react |
| Deploy | Hostinger Node.js (Passenger) |
| Cron | cron-job.org (HTTPS + Bearer token) |

---

## 3. Repositório e localização

- **GitHub:** `https://github.com/Rall73/demandoo` (privado)
- **Branch de produção:** `main` (push = deploy automático)
- **Pasta local:** `C:\Users\Ricardo\Blog\demandoo`
- **Domínio:** `https://demandoo.net`
- **Dono:** Ricardo Luize (`rluize@gmail.com`) — também é o super-admin via `SUPER_ADMIN_EMAIL`

---

## 4. Bancos de dados (dev + prod)

| Ambiente | Banco | URL |
|---|---|---|
| **Local** | `u822347350_demandoo_dev` | `localhost:3000` |
| **Produção** | `u822347350_bd_demandoo` | `demandoo.net` |

Hostinger prefixa banco e usuário com `u822347350_`. SQL alterado precisa ser rodado **nos dois bancos** via phpMyAdmin.

### Tabelas principais

- `plans` — planos do produto
- `companies` — tenants (uma empresa por cadastro)
- `users` — usuários (com avatarUrl)
- `accounts` / `sessions` / `verification_tokens` — Auth.js
- `demandas` — capturas (DEMANDA/TAREFA/IDEIA)
- `acoes_demanda` — checklist de ações por demanda
- `cron_execucoes` — log de execuções de cron jobs

### Planos atuais (slug → quota IA)

| slug | name | priceCents | aiQuota | maxUsers | Tipo |
|---|---|---|---|---|---|
| `free` | Gratuito | 0 | 20 | 1 | Individual |
| `trial` | Trial | 0 | 100 | 5 | Especial (usa `planExpiresAt`) |
| `basic` | Básico | placeholder | 200 | 1 | Individual |
| `complete` | Completo | placeholder | 500 | 1 | Individual |
| `basic_equipe` | Básico Equipe | 14900 | 500 | 5 | Equipe |
| `complete_equipe` | Completo Equipe | 29900 | 1500 | 20 | Equipe |
| `pro` / `team` | (legado) | — | — | — | Mantidos por compatibilidade |

> Preços `basic`/`complete` ainda são placeholders — aguardando decisão de produto + billing.

---

## 5. Variáveis de ambiente

Todas vivem no painel Hostinger → demandoo.net → Environment variables. Localmente em `.env.local` (gitignored).
**Nunca commitar segredos no `.env` — só placeholders.**

| Variável | Observação |
|---|---|
| `DATABASE_URL` | `mysql://USER:SENHA@srv####.hstgr.io:3306/BANCO` — usa hostname MySQL, não localhost |
| `AUTH_SECRET` | Configurado no painel |
| `NEXTAUTH_URL` | `https://demandoo.net` (prod) ou `http://localhost:3000` (dev) |
| `NEXT_PUBLIC_APP_URL` | Igual ao acima |
| `OPENAI_API_KEY` | Conta OpenAI do Ricardo |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Conta Cloudinary do Ricardo |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth via Google Cloud Console |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` (SSL) |
| `SMTP_USER` | `noreply@demandoo.net` |
| `SMTP_PASS` | **SOMENTE alphanum + `_`/`-`** — `#`, `@` etc. quebram parser de env var |
| `EMAIL_FROM` | `demandoo <noreply@demandoo.net>` |
| `CRON_SECRET` | Token bearer para `/api/cron/*` — gerado via `openssl rand -hex 32` |
| `SUPER_ADMIN_EMAIL` | `rluize@gmail.com` — libera acesso a `/admin` |

---

## 6. Estrutura de arquivos (atualizada)

```
demandoo/
├── prisma/
│   └── schema.prisma                  # Schema completo (Prisma 6)
├── public/
│   ├── icon.svg                       # Ícone SVG escalável (PWA)
│   └── manifest.json                  # PWA manifest
├── src/
│   ├── middleware.ts                  # OBRIGATÓRIO nesse nome — /api/cron isento
│   ├── app/
│   │   ├── layout.tsx                 # Root layout com Providers
│   │   ├── page.tsx                   # Landing page pública
│   │   ├── icon.tsx                   # Favicon 32×32 (Next.js ImageResponse)
│   │   ├── apple-icon.tsx             # Apple Touch Icon 180×180
│   │   ├── globals.css
│   │   ├── como-funciona/             # Página pública (SSG) — guia do produto
│   │   ├── planos/                    # Tabela de planos individual + equipe
│   │   │
│   │   ├── (app)/                     # Rotas autenticadas
│   │   │   ├── layout.tsx             # Verifica sessão + Sidebar
│   │   │   ├── app/                   # Dashboard
│   │   │   │   ├── page.tsx           # Hub (abas + KPIs + lista + ordenação)
│   │   │   │   ├── DemandasList.tsx   # Filtros + ordenação client-side
│   │   │   │   ├── nova/              # Captura (voz + texto + manual)
│   │   │   │   ├── [id]/              # Detalhe
│   │   │   │   └── calendario/        # Grid mensal
│   │   │   ├── configuracoes/         # Perfil, e-mail, senha, plano
│   │   │   └── equipe/                # Gestão de membros + convites
│   │   │
│   │   ├── admin/                     # ADMIN — restrito a SUPER_ADMIN_EMAIL
│   │   │   ├── layout.tsx             # Guarda de acesso
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── page.tsx               # Dashboard global
│   │   │   ├── empresas/              # Lista de tenants
│   │   │   ├── usuarios/              # Lista global
│   │   │   ├── planos/                # Edição inline de planos
│   │   │   └── consumo/               # OpenAI / Cloudinary / Cron / links
│   │   │
│   │   ├── auth/                      # Login, cadastro, verificar, esqueci-senha, etc.
│   │   │
│   │   └── api/
│   │       ├── admin/planos/[id]/route.ts      # PATCH (super-admin)
│   │       ├── auth/                            # cadastro, esqueci-senha, nova-senha, aceitar-convite
│   │       ├── configuracoes/                   # perfil, email, senha
│   │       ├── cron/lembretes/route.ts          # GET (bearer auth) — D-0 e D-1
│   │       ├── demandas/                        # CRUD + ações + calendar.ics
│   │       ├── equipe/                          # listar, convidar, atualizar role, remover
│   │       └── upload/                          # audio, avatar
│   │
│   ├── auth/                          # NextAuth config + types
│   ├── components/                    # Sidebar, Providers
│   └── lib/
│       ├── prisma.ts                  # Singleton
│       ├── date.ts                    # Helpers BRT (hojeNoBrasil, etc.)
│       ├── demandas.ts                # Constantes visuais (TIPO_LABEL, etc.)
│       ├── openai.ts                  # Lazy singleton
│       ├── cloudinary.ts              # Upload + delete
│       └── email.ts                   # Nodemailer transporter + templates
│
├── CLAUDE.md                          # Convenções (importa AGENTS.md)
├── AGENTS.md                          # Aviso sobre Next.js 16
├── PIPELINE.md                        # Histórico de versões + backlog
├── ONBOARDING.md                      # Este arquivo
└── FUNCIONALIDADES-A-PORTAR.md        # Histórico (já cumprido)
```

---

## 7. Modos de captura e classificação por IA

### Três modos (`/app/nova`)

| Modo | UI | Tipo escolhido por |
|---|---|---|
| **Voz** | Grava áudio → Whisper transcreve → GPT estrutura | **IA** (automático) |
| **Texto + IA** | Campo de texto livre → GPT estrutura | **IA** (automático) |
| **Manual** | Formulário completo com todos os campos | **Usuário** (seletor explícito) |

> ⚠️ **Regra:** O seletor de tipo (Demanda / Tarefa / Ideia) só aparece no modo **Manual**. Nos modos Voz e Texto+IA, a IA classifica e o `tipo` enviado pelo front é ignorado.

### Árvore de decisão de tipo (no prompt GPT)

```
Tem expressão de ideia OU tom exploratório/hipotético?  → IDEIA
Senão, pedido simples só de quem fala, sem terceiros?   → TAREFA
Senão (qualquer outro caso, inclusive dúvida)           → DEMANDA
```

- **💡 IDEIA** — "tive uma ideia", "e se...", "imagina se", tom exploratório. Geralmente sem prazo, prioridade BAIXA.
- **✅ TAREFA** — pedido simples, só envolve quem fala, máx 1-2 ações. Ex: "comprar pão amanhã".
- **📋 DEMANDA** (padrão/fallback) — solicitante terceiro, contexto narrativo, múltiplos passos.

### Pipeline de IA (POST /api/demandas — modos Voz e Texto+IA)

1. Verifica quota (`company.aiUsedTotal >= plan.aiQuota` → retorna `aiBlocked`)
2. Se `audioUrl` → fetch → Whisper-1 → transcrição (pt)
3. GPT-4o-mini com `response_format: json_object` retorna `{ titulo, descricao, tipo, prioridade, prazo, acoes, solicitanteNome }`
4. Tipo: vem da IA (não do front, exceto modo manual)
5. Prazo: GPT resolve "amanhã"/"sexta" → `YYYY-MM-DD` → `parseDateBRT()` (meia-noite BRT = `T03:00:00Z`)
6. Solicitante: match por primeiro nome em `users` da mesma `company`
7. Salva demanda + ações em transação (`aiProcessado: true`)
8. Incrementa `company.aiUsedTotal`

---

## 8. Autenticação (Auth.js v5)

- **Estratégia:** JWT
- **Providers:** Credentials (e-mail + senha) + Google OAuth
- **`trustHost: true`** — obrigatório na Hostinger (proxy reverso)
- **Google:** Redirect URI `https://demandoo.net/api/auth/callback/google`. Primeiro acesso cria company + user. `allowDangerousEmailAccountLinking: true`.
- **Credentials:** verifica `emailVerified`, `active`, `company.active`
- **JWT payload:** `id, companyId, companyName, planSlug, aiQuota, aiUsedTotal, role, avatarUrl, planExpiresAt`

### Fluxos cobertos

- ✅ Cadastro por e-mail com verificação (token 24h)
- ✅ Esqueci minha senha (token 1h) + nova senha
- ✅ Google OAuth com criação automática de empresa
- ✅ Criar senha pela 1ª vez (contas Google que esqueceram a senha)
- ✅ Trocar e-mail com verificação no novo endereço
- ✅ Aceitar convite de equipe (token único)

---

## 9. Convenções obrigatórias

### Banco
- Soft delete em tudo: `deletedAt DateTime?` + `deletedBy Int?`
- Toda query filtra `deletedAt: null`
- Toda tabela de domínio tem `companyId` (isolamento de tenant)
- Schema alterado → SQL manual → Ricardo roda no phpMyAdmin **nos dois bancos** (dev + prod) → depois o código

### Fuso horário
- Servidor UTC, usuários em Brasília (UTC-3, sem horário de verão)
- **Nunca** `new Date()` cru em API para "hoje"
- Usar `src/lib/date.ts`: `hojeISOBrasil()`, `hojeNoBrasil()`, `parseDateBRT()`
- Prazo armazenado como meia-noite BRT = `T03:00:00Z` em UTC

### UI
- Ícones: sempre `lucide-react` (nunca emoji como ícone de nav/ação)
- Todo `<input>` e `<select>`: obrigatório `text-gray-800 bg-white`
- Paleta: violet-600 (DEMANDA/brand), emerald (TAREFA), amber (IDEIA)

### Middleware
- Arquivo **obrigatoriamente** `src/middleware.ts` — qualquer outro nome é ignorado pelo Next.js
- Build correto exibe `ƒ Proxy (Middleware)` no output
- `/api/cron/*` isento de autenticação (senão 307 quebra o cron)
- Next.js 16 mostra warning pedindo `proxy.ts` — ignorar, regra do projeto é `middleware.ts`

### Cron
- Protegido por `Authorization: Bearer <CRON_SECRET>` (não por sessão)
- URL sempre HTTPS — HTTP gera 301 que o cron-job.org não segue
- Toda execução registrada em `cron_execucoes`

### E-mail (SMTP Hostinger)
- `smtp.hostinger.com` porta 465 (SSL, `secure: true`)
- **Senha SMTP: só alphanum + `_`/`-`** — `#` é interpretado como comentário em parser de env var → `535 auth failed`
- Transporter criado dentro de função (`makeTransporter()`), nunca singleton de módulo
- Contas Google sem senha: usar `sendDefinePasswordEmail` (criar 1ª senha), não reset

### Deploy
- Portão pré-push: `npx tsc --noEmit` → `npx next build`
- **Nunca push sem autorização explícita do Ricardo** (regra acordada em 2026-05-25)
- Commit semântico via HEREDOC, arquivos nomeados (nunca `git add -A`)
- Sem segredos no repo
- Nunca `output: 'standalone'` no `next.config` — quebra o Passenger

---

## 10. Controle de acesso

| Tipo de usuário | Acesso |
|---|---|
| Anônimo | Páginas públicas (`/`, `/como-funciona`, `/planos`, `/auth/*`) |
| Usuário autenticado (USER) | Tudo em `/app/*`, `/configuracoes`, `/equipe` (só ver) |
| ADMIN da empresa | + `/equipe` com poder de convidar/remover/alterar role |
| Super admin (`SUPER_ADMIN_EMAIL`) | + `/admin/*` (visão global de todas as empresas) |

A guarda do super admin está em `src/app/admin/layout.tsx` (verifica `session.user.email === process.env.SUPER_ADMIN_EMAIL`).

---

## 11. Decisões de design importantes

### Por que um único modelo Demanda para três tipos?
DEMANDA, TAREFA e IDEIA usam a mesma tabela com coluna `tipo ENUM`. Permite pipeline único, promoção entre tipos, calendário sem JOIN, IA classifica na criação.

### Por que freemium vitalício (não mensal)?
20 capturas para sempre no free — não 20 por mês. O pool vitalício cria urgência real de conversão quando o hábito está formado.

### Por que .ics em vez de Google Calendar OAuth?
Google OAuth bidirecional é complexo. O .ics funciona com qualquer cliente (Google, Apple, Outlook) com zero dependência.

### Por que não `output: 'standalone'` no Next.js?
Quebra o Passenger da Hostinger — assets estáticos ficam com 404.

### Por que `src/middleware.ts` e não outro nome?
Next.js só carrega middleware desse nome exato. `proxy.ts` é ignorado silenciosamente. Build confirma com `ƒ Proxy (Middleware)`.

### Por que SUPER_ADMIN_EMAIL em vez de coluna no banco?
Decisão pragmática: o super admin é uma única pessoa (Ricardo). Adicionar coluna `isPlatformAdmin` no User exigiria migração + checks. Variável de ambiente é suficiente e desliga em dev se não setada.

---

## 12. Comandos úteis

```bash
# Desenvolvimento local
cd C:\Users\Ricardo\Blog\demandoo
npm run dev

# Antes de informar Ricardo que algo está pronto
npx tsc --noEmit
npx next build

# Após Ricardo autorizar
git add <arquivos-nomeados>
git commit -m "$(cat <<'EOF'
feat: descrição

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main

# Após mudança de schema
npx prisma generate
# E entregar o SQL para Ricardo rodar nos dois bancos
```

---

## 13. Como iniciar uma nova sessão Claude Code neste projeto

```bash
cd C:\Users\Ricardo\Blog\demandoo
# Iniciar Claude Code aqui — ele lê CLAUDE.md e AGENTS.md automaticamente
# Memórias do projeto estão em ~/.claude/projects/C--Users-Ricardo-Blog-demandoo/memory/
```

**Antes de qualquer mudança:** ler este ONBOARDING e o `PIPELINE.md` para entender o estado atual.

---

*Última atualização: 2026-05-25 — v0.8 (admin panel + cron logging + novo ícone + ordenação)*
