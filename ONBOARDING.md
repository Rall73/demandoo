# demandoo.net — Documento de Contexto Completo

> **Este arquivo é o ponto de partida obrigatório para qualquer sessão de desenvolvimento no projeto demandoo.**
> Leia integralmente antes de escrever qualquer linha de código.
>
> Última atualização: 2026-05-25 (v1.0)

---

## 1. O que é o demandoo

**demandoo.net** é um SaaS standalone de captura de demandas, tarefas e ideias com IA.
É um produto independente — **não tem nenhuma relação com o projeto inicio.aprendiassim.com**.

**Problema que resolve:** Profissionais recebem pedidos, tarefas e ideias de forma caótica ao longo do dia (WhatsApp, reunião, voz, e-mail) e perdem coisas por falta de sistema rápido de captura.

**Diferencial:** O usuário fala ou digita qualquer coisa e a IA (Whisper + GPT-4o-mini) estrutura automaticamente: título, tipo, prioridade, prazo, solicitante e próximas ações. Cada item tem um histórico de atualizações e pode gerar um relatório narrativo completo com IA.

**Multi-tenant:** cada empresa (`Company`) tem seu ambiente isolado. Convites e equipe via `/equipe`.

---

## 2. Stack e versões

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| ORM | Prisma 6 (MySQL) |
| Auth | Auth.js v5 (next-auth@beta) — JWT strategy |
| Banco | MySQL/MariaDB via Hostinger |
| IA | OpenAI Whisper (transcrição) + GPT-4o-mini (estruturação + relatórios) |
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
- `users` — usuários (com `avatarUrl`)
- `accounts` / `sessions` / `verification_tokens` — Auth.js
- `demandas` — capturas (DEMANDA/TAREFA/IDEIA), inclui `relatorioGerado` e `relatorioGeradoAt`
- `acoes_demanda` — checklist de ações por demanda
- `comentarios` — histórico por demanda (NOTA / AUDIO / STATUS)
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
| `DATABASE_URL` | `mysql://USER:SENHA@srv####.hstgr.io:3306/BANCO` |
| `AUTH_SECRET` | Configurado no painel |
| `NEXTAUTH_URL` | `https://demandoo.net` (prod) / `http://localhost:3000` (dev) |
| `NEXT_PUBLIC_APP_URL` | Igual ao acima |
| `OPENAI_API_KEY` | Conta OpenAI do Ricardo |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Conta Cloudinary |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth via Google Cloud Console |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` (SSL) |
| `SMTP_USER` | `noreply@demandoo.net` |
| `SMTP_PASS` | **SOMENTE alphanum + `_`/`-`** — `#`, `@` etc. quebram parser de env var |
| `EMAIL_FROM` | `demandoo <noreply@demandoo.net>` |
| `CRON_SECRET` | Token bearer para `/api/cron/*` |
| `SUPER_ADMIN_EMAIL` | `rluize@gmail.com` — libera acesso a `/admin` |

---

## 6. Estrutura de arquivos (v1.0)

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
│   │   ├── icon.tsx                   # Favicon 32×32
│   │   ├── apple-icon.tsx             # Apple Touch Icon 180×180
│   │   ├── globals.css
│   │   ├── como-funciona/             # Página pública (SSG)
│   │   ├── planos/                    # Tabela de planos
│   │   │
│   │   ├── (app)/                     # Rotas autenticadas (com Sidebar)
│   │   │   ├── layout.tsx             # Verifica sessão + Sidebar
│   │   │   ├── app/
│   │   │   │   ├── page.tsx           # Dashboard — 3 cards por tipo
│   │   │   │   ├── lista/
│   │   │   │   │   ├── page.tsx       # Lista filtrada por tipo
│   │   │   │   │   └── DemandasList.tsx  # Filtros + ordenação client-side
│   │   │   │   ├── nova/              # Captura (voz + texto + manual)
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx       # Detalhe + histórico + relatório IA
│   │   │   │   │   ├── DetalheContent.tsx
│   │   │   │   │   ├── DetalheActions.tsx
│   │   │   │   │   ├── AcoesInterativas.tsx
│   │   │   │   │   └── ComentariosSection.tsx  # Histórico + relatório IA
│   │   │   │   └── calendario/
│   │   │   ├── relatorios/
│   │   │   │   ├── page.tsx           # Seleção + filtros + checkboxes
│   │   │   │   └── RelatorioClient.tsx
│   │   │   ├── configuracoes/         # Perfil, e-mail, senha, plano
│   │   │   └── equipe/                # Gestão de membros + convites
│   │   │
│   │   ├── (print)/                   # Rotas de impressão (sem Sidebar)
│   │   │   ├── layout.tsx             # Auth guard mínimo
│   │   │   └── relatorios/imprimir/
│   │   │       ├── page.tsx           # Página limpa CSS @media print
│   │   │       └── PrintButton.tsx    # window.print() client component
│   │   │
│   │   ├── admin/                     # ADMIN — restrito a SUPER_ADMIN_EMAIL
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               # Dashboard global
│   │   │   ├── empresas/ / usuarios/ / planos/ / consumo/
│   │   │
│   │   ├── auth/                      # Login, cadastro, verificar, etc.
│   │   │
│   │   └── api/
│   │       ├── admin/planos/[id]/     # PATCH (super-admin)
│   │       ├── auth/                  # cadastro, esqueci-senha, nova-senha, aceitar-convite
│   │       ├── configuracoes/         # perfil, email, senha
│   │       ├── cron/lembretes/        # GET (bearer auth) — D-0 e D-1
│   │       ├── demandas/
│   │       │   ├── route.ts           # GET + POST
│   │       │   └── [id]/
│   │       │       ├── route.ts       # GET + PATCH (+ auto-log status) + DELETE
│   │       │       ├── acoes/         # POST + [acaoId] PATCH/DELETE
│   │       │       ├── calendar.ics/  # GET
│   │       │       ├── comentarios/   # GET + POST + [cId] DELETE
│   │       │       └── relatorio/     # POST (gerar IA) + PATCH (salvar)
│   │       ├── equipe/                # listar, convidar, atualizar, remover
│   │       └── upload/                # audio, avatar
│   │
│   ├── auth/                          # NextAuth config + types
│   ├── components/                    # Sidebar, Providers
│   └── lib/
│       ├── prisma.ts                  # Singleton
│       ├── date.ts                    # Helpers BRT
│       ├── openai.ts                  # Lazy singleton
│       ├── cloudinary.ts              # Upload + delete
│       └── email.ts                   # Nodemailer + templates
│
├── CLAUDE.md / AGENTS.md             # Convenções obrigatórias
├── PIPELINE.md                        # Histórico de versões + backlog
└── ONBOARDING.md                      # Este arquivo
```

---

## 7. Modos de captura e classificação por IA

### Três modos (`/app/nova`)

| Modo | UI | Tipo escolhido por |
|---|---|---|
| **Voz** | Grava áudio → Whisper → GPT estrutura | **IA** |
| **Texto + IA** | Texto livre → GPT estrutura | **IA** |
| **Manual** | Formulário completo | **Usuário** |

> ⚠️ O seletor de tipo só aparece no modo **Manual**. Nos outros, a IA classifica.

### Pipeline de IA (POST /api/demandas)

1. Verifica quota (`aiUsedTotal >= aiQuota` → bloqueado)
2. Se áudio → Whisper-1 transcreve
3. GPT-4o-mini retorna JSON: `{ titulo, descricao, tipo, prioridade, prazo, acoes, solicitanteNome }`
4. Prazo: GPT resolve relativos → `YYYY-MM-DD` → `parseDateBRT()` (meia-noite BRT = `T03:00:00Z`)
5. Solicitante: match por primeiro nome nos `users` da empresa
6. Salva demanda + ações, incrementa `aiUsedTotal`

---

## 8. Histórico de Comentários + Relatório IA

### Comentários (`/api/demandas/[id]/comentarios`)

- **NOTA**: texto digitado pelo usuário
- **AUDIO**: gravação → upload Cloudinary → Whisper transcreve → salva texto + audioUrl
- **STATUS**: criado automaticamente no PATCH da demanda quando o status muda

### Relatório IA (`/api/demandas/[id]/relatorio`)

- **POST**: GPT-4o-mini recebe dados completos (demanda + acoes + comentarios) e gera relatório em markdown (Abertura / Desenvolvimento / Conclusão). Consome 1 crédito de quota.
- **PATCH**: salva edição manual do texto
- Armazenado em `demandas.relatorioGerado`
- Exibido na página de detalhe e na impressão

---

## 9. Autenticação (Auth.js v5)

- **Estratégia:** JWT
- **Providers:** Credentials + Google OAuth
- **`trustHost: true`** — obrigatório na Hostinger (proxy reverso)
- **JWT payload:** `id, companyId, companyName, planSlug, aiQuota, aiUsedTotal, role, avatarUrl, planExpiresAt`

---

## 10. Convenções obrigatórias

### Banco
- Soft delete: `deletedAt DateTime?` + `deletedBy Int?`; toda query filtra `deletedAt: null`
- `companyId` em toda tabela de domínio (isolamento de tenant)
- Schema alterado → SQL manual → Ricardo roda no phpMyAdmin **nos dois bancos** → depois o código

### Fuso horário
- Servidor UTC, usuários em Brasília (UTC-3)
- **Nunca** `new Date()` cru em API para "hoje"
- Usar `src/lib/date.ts`: `hojeISOBrasil()`, `hojeNoBrasil()`, `parseDateBRT()`

### UI
- Ícones: sempre `lucide-react`
- Todo `<input>` e `<select>`: obrigatório `text-gray-800 bg-white`
- Paleta: violet-600 (DEMANDA/brand), emerald (TAREFA), amber (IDEIA)

### Middleware
- Arquivo **obrigatoriamente** `src/middleware.ts`
- `/api/cron/*` isento de autenticação
- Next.js 16 exibe warning pedindo `proxy.ts` — ignorar, regra é `middleware.ts`

### E-mail
- `smtp.hostinger.com:465` (SSL)
- **Senha SMTP: só alphanum + `_`/`-`** — `#` é comentário em env var
- Transporter criado dentro de função, nunca singleton de módulo

### Deploy
- **Nunca push sem autorização explícita do Ricardo**
- Portão: `npx tsc --noEmit` + `npx next build`
- Commit semântico via HEREDOC, arquivos nomeados (nunca `git add -A`)
- Nunca `output: 'standalone'` no `next.config`

---

## 11. Controle de acesso

| Tipo de usuário | Acesso |
|---|---|
| Anônimo | Páginas públicas (`/`, `/como-funciona`, `/planos`, `/auth/*`) |
| Usuário autenticado (USER) | `/app/*`, `/relatorios`, `/configuracoes`, `/equipe` (só ver) |
| ADMIN da empresa | + `/equipe` com poder de convidar/remover/alterar role |
| Super admin (`SUPER_ADMIN_EMAIL`) | + `/admin/*` (visão global) |

---

## 12. Decisões de design

| Decisão | Motivo |
|---|---|
| Único model `Demanda` para 3 tipos | Pipeline único, promoção entre tipos, calendário sem JOIN |
| Freemium vitalício (não mensal) | Pool vitalício cria urgência real de conversão |
| `.ics` em vez de Google Calendar OAuth | Zero dependência, funciona em qualquer cliente |
| `src/middleware.ts` fixo | Next.js só carrega esse nome — `proxy.ts` é ignorado silenciosamente |
| `SUPER_ADMIN_EMAIL` em env var | Ricardo é único super-admin — coluna no banco seria over-engineering |
| `(print)` route group | Permite layout sem sidebar para páginas de impressão, mantendo auth guard |

---

## 13. Comandos úteis

```bash
# Desenvolvimento local
cd C:\Users\Ricardo\Blog\demandoo
npm run dev

# Antes de avisar Ricardo
npx tsc --noEmit
npx next build

# Após mudança de schema
npx prisma generate
# Entregar SQL para Ricardo rodar nos dois bancos
```

---

## 14. Como iniciar uma nova sessão

```bash
cd C:\Users\Ricardo\Blog\demandoo
# Claude Code lê CLAUDE.md e AGENTS.md automaticamente
# Memórias: ~/.claude/projects/C--Users-Ricardo-Blog-demandoo/memory/
```

**Antes de qualquer mudança:** ler ONBOARDING.md + PIPELINE.md para entender o estado atual.

---

*Última atualização: 2026-05-25 — v1.0 (histórico + relatório IA + relatórios + dashboard)*
