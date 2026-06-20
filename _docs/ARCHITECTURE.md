# demandoo — Arquitetura e Contexto

> Leia este arquivo antes de planejar qualquer feature.
> Para o estado atual e backlog, ver `_docs/PIPELINE.md`.
> Última atualização: 2026-06-20 (v1.4.2)

---

## 1. O que é o demandoo

**demandoo.net** é um SaaS standalone de captura de demandas, tarefas e ideias com IA.
É um produto independente — **não tem nenhuma relação com o projeto `inicio.aprendiassim.com`**.

**Problema:** Profissionais recebem pedidos, tarefas e ideias de forma caótica (WhatsApp, reunião, voz, e-mail) e perdem coisas por falta de um sistema rápido de captura.

**Diferencial:** O usuário fala ou digita qualquer coisa e a IA (Whisper + GPT-4o-mini) estrutura automaticamente: título, tipo, prioridade, prazo, solicitante e próximas ações. Cada item tem histórico de atualizações e pode gerar um relatório narrativo completo.

**Multi-tenant:** cada empresa (`Company`) tem seu ambiente isolado. Convites e equipe via `/equipe`.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| ORM | Prisma 6 (MySQL) |
| Auth | Auth.js v5 (next-auth@beta) — JWT strategy |
| Banco | MySQL/MariaDB via Hostinger |
| IA | OpenAI Whisper-1 (transcrição) + GPT-4o-mini (estruturação + relatórios) |
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
- **Super-admin:** `rluize@gmail.com` (via `SUPER_ADMIN_EMAIL`)

---

## 4. Bancos de dados

| Ambiente | Banco | URL |
|---|---|---|
| **Local** | `u822347350_demandoo_dev` | `localhost:3000` |
| **Produção** | `u822347350_bd_demandoo` | `demandoo.net` |

Hostinger prefixa banco e usuário com `u822347350_`. SQL alterado precisa ser rodado **nos dois bancos** via phpMyAdmin.

### Schema (resumo)

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

### Campos relevantes em `demandas`

| Campo | Tipo | Descrição |
|---|---|---|
| `tipo` | DEMANDA \| TAREFA \| IDEIA \| DIARIO | DIARIO é exclusivo do módulo Diário — filtrado de todas as outras views |
| `relatorioGerado` | LONGTEXT NULL | Relatório IA editável |
| `relatorioGeradoAt` | DATETIME(3) NULL | Data da última geração |
| `aiProcessado` | Boolean | true quando IA processou |
| `concluidoAt` | DATETIME(3) NULL | preenchido ao concluir |

### Tabela `comentarios`

| Campo | Tipo | Descrição |
|---|---|---|
| `conteudo` | TEXT | texto / transcrição |
| `audioUrl` | VARCHAR(1000) NULL | URL Cloudinary (notas de voz) |
| `tipo` | VARCHAR(20) | `NOTA` \| `AUDIO` \| `STATUS` \| `TELEFONEMA` \| `EMAIL` \| `REUNIAO` |

Os tipos `TELEFONEMA`, `EMAIL` e `REUNIAO` são usados exclusivamente no módulo Diário. `STATUS` é auto-log interno (filtrado nas views de Diário).

Toda tabela de domínio tem: `companyId` (isolamento tenant) + `deletedAt`/`deletedBy` (soft delete).

### Tabela `sessoes_foco`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INT PK | |
| `companyId` | INT | isolamento tenant |
| `userId` | INT | FK users |
| `demandaId` | INT | FK demandas |
| `duracaoMin` | INT | minutos da sessão |
| `iniciadoEm` | DATETIME(3) | timestamp de início (UTC) |

Usada no Quadro de Foco e no módulo Diário (seção "Tempo de foco").

### Tabelas `listas` + `itens_lista` (v1.2)

**`listas`**

| Campo | Tipo | Descrição |
|---|---|---|
| `tipo` | COMPRAS \| VENCIMENTOS \| LEMBRETES \| GERAL | define campos visíveis na UI |
| `cor` | VARCHAR(20) NULL | cor de destaque visual |

**`itens_lista`**

| Campo | Tipo | Descrição |
|---|---|---|
| `texto` | VARCHAR(1000) | conteúdo do item |
| `concluido` | Boolean | toggle de check |
| `dataVencimento` | DATETIME(3) NULL | usado em VENCIMENTOS e LEMBRETES |
| `recorrente` | Boolean | true = repete todo ano (aniversários) |
| `lembrarAntesDias` | INT NULL | aciona e-mail N dias antes do vencimento |
| `lembreteEnviadoAt` | DATETIME(3) NULL | controle do cron; null em recorrentes após envio |
| `url` | VARCHAR(1000) NULL | link externo (usado em COMPRAS) |

### Planos atuais

| slug | name | priceCents | aiQuota | maxUsers |
|---|---|---|---|---|
| `free` | Gratuito | 0 | 20 | 1 |
| `trial` | Trial | 0 | 100 | 5 |
| `basic` | Básico | placeholder | 200 | 1 |
| `complete` | Completo | placeholder | 500 | 1 |
| `basic_equipe` | Básico Equipe | 14900 | 500 | 5 |
| `complete_equipe` | Completo Equipe | 29900 | 1500 | 20 |

> ⚠️ `free.aiQuota = 500` temporariamente (beta, 2026-05-28). Reverter para 20 via phpMyAdmin antes do billing.

---

## 5. Variáveis de ambiente

Produção: painel Hostinger → Environment Variables. Local: `.env.local` (gitignored).
**`.env` só tem placeholders — nunca commitar segredos.**

| Variável | Observação |
|---|---|
| `DATABASE_URL` | `mysql://USER:SENHA@srv####.hstgr.io:3306/BANCO` |
| `AUTH_SECRET` | Configurado no painel |
| `NEXTAUTH_URL` | `https://demandoo.net` (prod) / `http://localhost:3000` (dev) |
| `NEXT_PUBLIC_APP_URL` | Igual ao acima |
| `OPENAI_API_KEY` | Conta OpenAI do Ricardo |
| `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | Conta Cloudinary |
| `GOOGLE_CLIENT_ID`, `_CLIENT_SECRET` | OAuth via Google Cloud Console |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` | `465` (SSL) |
| `SMTP_USER` | `noreply@demandoo.net` |
| `SMTP_PASS` | **SOMENTE alphanum + `_`/`-`** — `#` é comentário em env var |
| `EMAIL_FROM` | `demandoo <noreply@demandoo.net>` |
| `CRON_SECRET` | Token bearer para `/api/cron/*` |
| `SUPER_ADMIN_EMAIL` | `rluize@gmail.com` |

---

## 6. Estrutura de arquivos

```
demandoo/
├── prisma/schema.prisma
├── public/
│   ├── icon.svg                       # Ícone SVG PWA
│   └── manifest.json
├── src/
│   ├── middleware.ts                  # OBRIGATÓRIO nesse nome — /api/cron isento
│   ├── app/
│   │   ├── layout.tsx                 # Root layout com Providers
│   │   ├── page.tsx                   # Landing page
│   │   ├── icon.tsx / apple-icon.tsx  # Favicons
│   │   ├── globals.css
│   │   ├── como-funciona/             # SSG pública
│   │   ├── planos/                    # Tabela de planos
│   │   │
│   │   ├── (app)/                     # Rotas autenticadas (com Sidebar)
│   │   │   ├── layout.tsx             # Verifica sessão + Sidebar
│   │   │   ├── app/
│   │   │   │   ├── page.tsx           # Dashboard — 3 cards por tipo
│   │   │   │   ├── lista/             # Lista filtrada (DemandasList.tsx)
│   │   │   │   ├── nova/              # Captura (voz + texto + manual)
│   │   │   │   ├── [id]/              # Detalhe + histórico + relatório IA
│   │   │   │   ├── calendario/
│   │   │   │   ├── foco/              # Quadro de foco — Kanban drag-and-drop (v1.3)
│   │   │   │   ├── diario/            # Módulo Diário — timeline + sessões de foco (v1.4)
│   │   │   │   │   └── DiarioClient.tsx
│   │   │   │   └── listas/            # Galeria de listas + detalhe com itens
│   │   │   │       └── [id]/          # ListaDetalhe.tsx — checklist + áudio
│   │   │   ├── relatorios/            # Seleção + filtros + checkboxes
│   │   │   ├── configuracoes/         # Perfil, e-mail, senha, plano
│   │   │   └── equipe/                # Gestão de membros + convites
│   │   │
│   │   ├── (print)/                   # Impressão sem Sidebar (auth guard ativo)
│   │   │   ├── relatorios/imprimir/
│   │   │   └── diario/[data]/imprimir/ # Impressão do Diário (v1.4)
│   │   │       ├── page.tsx           # Server component — busca dados + renderiza
│   │   │       ├── PrintButton.tsx    # Botões Imprimir + Word (client)
│   │   │       └── AutoPrint.tsx      # Auto-dispara window.print() via ?pdf=1 (client)
│   │   │
│   │   ├── admin/                     # Restrito a SUPER_ADMIN_EMAIL
│   │   │   └── empresas/ usuarios/ planos/ consumo/
│   │   │
│   │   ├── auth/                      # Login, cadastro, verificar, etc.
│   │   │
│   │   └── api/
│   │       ├── admin/planos/[id]/
│   │       ├── auth/                  # cadastro, esqueci-senha, nova-senha, aceitar-convite
│   │       ├── configuracoes/         # perfil, email, senha
│   │       ├── cron/lembretes/        # GET (bearer auth) — D-0 e D-1 demandas
│   │       ├── cron/lembretes-listas/ # GET (bearer auth) — lembrar N dias antes
│   │       ├── diario/[data]/
│   │       │   └── exportar-doc/      # GET — gera .doc Word (HTML MSO)
│   │       ├── listas/                # GET + POST
│   │       │   └── [id]/
│   │       │       ├── route.ts       # GET + PATCH + DELETE
│   │       │       └── itens/         # GET + POST (texto ou áudio)
│   │       │           └── [itemId]/  # PATCH + DELETE
│   │       ├── demandas/
│   │       │   ├── route.ts           # GET + POST (pipeline IA)
│   │       │   └── [id]/
│   │       │       ├── route.ts       # GET + PATCH (+ auto-log status) + DELETE
│   │       │       ├── acoes/         # POST + [acaoId] PATCH/DELETE
│   │       │       ├── calendar.ics/
│   │       │       ├── comentarios/   # GET + POST + [cId] PATCH/DELETE
│   │       │       └── relatorio/     # POST (gerar IA) + PATCH (salvar)
│   │       ├── equipe/
│   │       └── upload/                # audio, avatar
│   │
│   ├── auth/                          # NextAuth config + types
│   ├── components/                    # Sidebar, Providers
│   └── lib/
│       ├── prisma.ts                  # Singleton
│       ├── date.ts                    # Helpers BRT
│       ├── openai.ts                  # Lazy singleton
│       ├── cloudinary.ts
│       └── email.ts                   # Nodemailer + templates
```

---

## 7. Pipeline de IA (POST /api/demandas)

1. Verifica quota (`aiUsedTotal >= aiQuota` → bloqueado)
2. Se áudio → Whisper-1 transcreve
3. GPT-4o-mini retorna JSON: `{ titulo, descricao, tipo, prioridade, prazo, acoes, solicitanteNome }`
4. Prazo: GPT resolve relativos → `YYYY-MM-DD` → `parseDateBRT()` (meia-noite BRT = `T03:00:00Z`)
5. Solicitante: match por primeiro nome nos `users` da empresa
6. Body do usuário **sempre** prevalece sobre a IA
7. Salva demanda + ações, incrementa `aiUsedTotal`

**Heurísticas de classificação:**
- **IDEIA:** "tive uma ideia", "e se...", tom exploratório/hipotético
- **TAREFA:** pedido simples, só envolve quem fala
- **DEMANDA (padrão):** solicitante terceiro, contexto narrativo, múltiplos passos

---

## 8. Autenticação (Auth.js v5)

- **Estratégia:** JWT
- **Providers:** Credentials + Google OAuth
- **`trustHost: true`** — obrigatório na Hostinger (proxy reverso)
- **JWT payload:** `id, companyId, companyName, planSlug, aiQuota, aiUsedTotal, role, avatarUrl, planExpiresAt`
- Google OAuth: cria empresa automaticamente no 1º acesso

---

## 9. Controle de acesso

| Tipo de usuário | Acesso |
|---|---|
| Anônimo | `/`, `/como-funciona`, `/planos`, `/auth/*` |
| USER autenticado | `/app/*`, `/relatorios`, `/configuracoes`, `/equipe` (só ver) |
| ADMIN da empresa | + `/equipe` com poder de convidar/remover/alterar role |
| Super-admin (`SUPER_ADMIN_EMAIL`) | + `/admin/*` (visão global) |

---

## 10. Armadilhas conhecidas

| Armadilha | Regra |
|---|---|
| `new Date()` cru em API | Servidor UTC, usuários BRT — usar `src/lib/date.ts` |
| Middleware em outro nome | Next.js só carrega `src/middleware.ts` — qualquer outro nome é ignorado silenciosamente |
| `output: 'standalone'` | Quebra o Passenger da Hostinger — nunca usar |
| Senha SMTP com `#` ou `@` | `#` é comentário em env var → trunca a senha → `535 auth failed` |
| Transporter Nodemailer como singleton | Criar dentro de função (`makeTransporter()`) para não cachear env vars |
| Event handlers em Server Components | Build passa, Passenger crasha em runtime (ERROR 4093732788) |
| `redirect: false` em Auth.js v5 credentials | É ignorado — erros chegam via `?error=` na URL |
| Google OAuth sem `passwordHash` | "Esqueci senha" deve chamar `sendDefinePasswordEmail`, não reset |
| `useState` congelado na navegação SPA | Navegar entre dias no Diário não remonta o componente filho — `entradas` fica frozen. Fix: `key={dataISO}` no pai para forçar remount |
| `margin` no `body` em HTML exportado para Word | Word não interpreta `body { margin }` como margem de página — usar `@page Section1 { margin }` + `div.Section1` wrapper |
| Export PDF via link direto | Não existe API de PDF no browser — usar `window.print()` com `document.title` definido antes. Automação via `?pdf=1` + componente `AutoPrint` |

---

## 11. Decisões de design

| Decisão | Motivo |
|---|---|
| Único model `Demanda` para 3 tipos | Pipeline único, promoção entre tipos, calendário sem JOIN |
| Freemium com pool vitalício (não mensal) | Urgência real de conversão |
| `.ics` em vez de Google Calendar OAuth | Zero dependência, funciona em qualquer cliente |
| `SUPER_ADMIN_EMAIL` em env var | Único super-admin — coluna no banco seria over-engineering |
| `(print)` route group | Layout sem sidebar para impressão, mantendo auth guard. Contém `/relatorios/imprimir` e `/diario/[data]/imprimir` |
| PWA em vez de app nativo | App Store exige reescrita nativa + 30% sobre receitas iOS |
| **Asaas como gateway de billing** | BR nativo, Pix + boleto + cartão, recorrência nativa, sem câmbio |

---

## 12. Comandos úteis

```bash
# Desenvolvimento local
cd C:\Users\Ricardo\Blog\demandoo
npm run dev

# Portão pré-push (obrigatório)
npx tsc --noEmit
npx next build

# Após mudança de schema
npx prisma generate
# Entregar SQL para Ricardo rodar nos dois bancos via phpMyAdmin
```

---

*Para o estado atual das funcionalidades e backlog, ver `_docs/PIPELINE.md`.*
