# demandoo — Arquitetura e Contexto

> Leia este arquivo antes de planejar qualquer feature.
> Para o estado atual e backlog, ver `_docs/PIPELINE.md`.
> Última atualização: 2026-08-04 (v1.11)

---

## 1. O que é o demandoo

**demandoo.net** é um SaaS standalone de captura de demandas, tarefas e ideias com IA.
É um produto independente — **não tem nenhuma relação com o projeto `inicio.aprendiassim.com`**.

**Problema:** Profissionais recebem pedidos, tarefas e ideias de forma caótica (WhatsApp, reunião, voz, e-mail) e perdem coisas por falta de um sistema rápido de captura.

**Diferencial:** O usuário fala ou digita qualquer coisa e a IA (Whisper + GPT-4o-mini) estrutura automaticamente: título, tipo, prioridade, prazo, solicitante e próximas ações. Cada item tem histórico de atualizações e pode gerar um relatório narrativo completo.

**Multi-tenant:** cada empresa (`Company`) tem seu ambiente isolado. Convites e equipe via `/equipe`.

⚠️ **O cadastro cria uma empresa com o nome da pessoa** — quem entra sozinho vira um tenant
de um usuário só. Foi o que aconteceu na Viracopos, consolidada manualmente em 2026-08-04
(9 pessoas numa empresa só; ver `_docs/sql-consolidacao-viracopos.sql`). Não existe tela para
renomear a empresa, e o cadastro via Google nem pergunta o nome — ambos no backlog.

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
- **Domínio:** `https://demandoo.com.br` (canônico) — `demandoo.net` redireciona para ele.
  O `.net` é bloqueado por filtro corporativo em algumas empresas, por isso o `.com.br` é o domínio de uso.
- **Super-admin:** `rluize@gmail.com` (via `SUPER_ADMIN_EMAIL`)

---

## 4. Bancos de dados

| Ambiente | Banco | URL |
|---|---|---|
| **Local** | `u822347350_demandoo_dev` | `localhost:3000` |
| **Produção** | `u822347350_bd_demandoo` | `demandoo.com.br` |

Hostinger prefixa banco e usuário com `u822347350_`. SQL alterado precisa ser rodado **nos dois bancos** via phpMyAdmin.

### Schema (resumo)

```
plans
  └── companies (tenant)
        └── users
              └── demandas
              │     ├── acoes_demanda
              │     ├── comentarios
              │     ├── anexos
              │     ├── demanda_tags ──→ tags
              │     ├── demanda_relacoes (auto-relacional: demanda ↔ demanda)
              │     └── delegacoes (mãe ↔ filha, entre usuários da empresa)
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
| `tipo` | VARCHAR(20) | `NOTA` \| `AUDIO` \| `STATUS` \| `TELEFONEMA` \| `EMAIL` \| `REUNIAO` \| `POMODORO` |

Os tipos `TELEFONEMA`, `EMAIL` e `REUNIAO` são usados exclusivamente no módulo Diário. `STATUS` é auto-log interno (filtrado nas views de Diário). `POMODORO` é gerado ao concluir um ciclo de foco — aparece na timeline do Diário; na impressão/Word é consolidado em seção própria (fora do "Tempo de foco").

Toda tabela de domínio tem: `companyId` (isolamento tenant) + `deletedAt`/`deletedBy` (soft delete).

### Tabela `sessoes_foco`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INT PK | |
| `companyId` | INT | isolamento tenant |
| `userId` | INT | FK users |
| `demandaId` | INT | FK demandas |
| `duracaoMin` | INT | minutos da sessão (derivado de início/término) |
| `iniciadoEm` | DATETIME(3) | timestamp de início (UTC) |
| `encerradoEm` | DATETIME(3) | timestamp de término (UTC) |

Criada automaticamente ao tirar um item do foco. Desde **v1.5.1** é **editável** no Diário via `/api/sessoes-foco` (editar início/término, adicionar sessão manual, excluir — hard delete, por ser registro de tempo). Ao encerrar uma sessão > 6h, o Quadro de Foco pede confirmação/ajuste do término (`focoEncerradoEm` no PATCH de demanda) — é aviso, não bloqueio.

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

### Tabelas `tags` + `demanda_tags` (v1.5)

**`tags`** — etiquetas por empresa (autocomplete, contagem, filtro)

| Campo | Tipo | Descrição |
|---|---|---|
| `companyId` | INT | isolamento tenant |
| `nome` | VARCHAR(50) | normalizado: lowercase, sem `#` |
| `cor` | VARCHAR(20) NULL | reservado p/ uso futuro |

`@@unique([companyId, nome])` impede duplicar tag na empresa e vazamento entre tenants. Soft delete (`deletedAt`/`deletedBy`).

**`demanda_tags`** — junção N:N entre `demandas` e `tags`

| Campo | Tipo | Descrição |
|---|---|---|
| `demandaId` | INT | FK demandas (ON DELETE CASCADE) |
| `tagId` | INT | FK tags (ON DELETE CASCADE) |
| `companyId` | INT | isolamento tenant |

Tabela associativa: **hard delete** ao desassociar; `@@unique([demandaId, tagId])`. Sincronização em `src/lib/tags.ts` (`merge` na criação, `replace` na edição).

### Tabela `demanda_relacoes` (v1.8)

Vínculo direto entre duas demandas — continuidade e desdobramento. **Não** é agrupamento
por tag: tag agrupa, o vínculo dá direção e cadeia.

| Campo | Tipo | Descrição |
|---|---|---|
| `companyId` | INT | isolamento tenant |
| `demandaOrigemId` | INT | o item **anterior** da cadeia (FK demandas, CASCADE) |
| `demandaDestinoId` | INT | o item que veio **depois** (FK demandas, CASCADE) |
| `tipo` | ENUM | `CONTINUACAO` \| `DESDOBRAMENTO` \| `RELACIONADA` |

O registro é direcional, mas a **leitura é bidirecional** (`OR` nos dois lados): uma única
linha aparece nas duas pontas, com rótulo invertido conforme o lado (`sentido` = ADIANTE
quando a demanda consultada é a origem). Rótulos e opções em `src/lib/relacoes.ts` (puro,
importável por componente client); a consulta em `src/lib/relacoes-db.ts`.

`@@unique([demandaOrigemId, demandaDestinoId])` impede duplicar o par **na mesma direção** —
o par invertido (B→A) o banco aceita, então o `POST` da API checa os dois sentidos antes de
criar. Tabela associativa: **hard delete** ao desvincular, como `demanda_tags`.

### Tabela `delegacoes` (v1.9)

Delegação a outro membro da empresa, no desenho **demanda-filha**: delegar cria uma
demanda nova pertencente ao delegado (`filha`), ligada à original (`origem`).

| Campo | Tipo | Descrição |
|---|---|---|
| `demandaOrigemId` | INT | a demanda-mãe, de quem delegou (FK, CASCADE) |
| `demandaFilhaId` | INT | a demanda criada para o delegado (FK, CASCADE) — `@@unique` |
| `delegadoPorUserId` / `delegadoParaUserId` | INT | FK users |
| `instrucao` | TEXT NULL | o que foi pedido — registro imutável, não muda se o delegado editar a demanda dele |
| `prazoRetorno` | DATETIME(3) NULL | quando o delegante espera retorno — independe do prazo da filha |
| `devolutiva` / `respondidoAt` | TEXT / DATETIME(3) NULL | retorno escrito pelo delegado |

**Por que este desenho:** o app inteiro escopa por `userId` (15+ queries). Visibilidade
compartilhada exigiria reescrever todas, com risco de vazamento entre usuários. Com
demanda-filha cada um segue dono do seu registro, nenhuma query mudou, e a cadeia vira
N níveis de graça — a filha pode ser delegada adiante.

A filha nasce com a **instrução** como descrição e o delegante como `solicitanteUserId`/`solicitanteNome`.
O checklist da mãe **não** é copiado: copiar criava dois checklists desconectados, e o que o
delegado marcava não voltava para a mãe. Cada delegação é um pedido específico com resposta
específica — dividir trabalho entre pessoas = várias delegações, cada uma com sua instrução.
O histórico **não** é compartilhado: a timeline da filha é exibida na mãe, somente leitura.

⚠️ `carregarDelegacao` em `src/lib/delegacao-db.ts` é o **único ponto do app que lê demanda
de outro usuário** — sempre através da linha de `delegacoes` e sempre validando `companyId`.

Cancelar a delegação remove a filha, e só é permitido enquanto ela está **intocada**
(ABERTA, sem comentário não-`STATUS` do delegado, sem ação marcada, sem repasse adiante).

### Planos atuais

| slug | name | priceCents | aiQuota | maxUsers |
|---|---|---|---|---|
| `free` | Gratuito | 0 | **500** ⚠️ | 1 |
| `trial` | Trial | 0 | 100 | 5 |
| `basic` | Básico | 4900 | 200 | 1 |
| `complete` | Completo | 9900 | 500 | 1 |
| `basic_equipe` | Básico Equipe | 14900 | 500 | 5 |
| `complete_equipe` | Completo Equipe | 29900 | 1500 | 20 |
| `cortesia` | Cortesia | 0 | NULL | 100 |

> **`aiQuota = NULL` = IA ilimitada** — o código só bloqueia quando o valor não é nulo
> (`aiQuota !== null && aiUsed >= aiQuota`). `maxUsers` é NOT NULL, então "ilimitado"
> vira um número alto. Os legados `pro` e `team` também têm quota nula.

> ⚠️ `free.aiQuota = 500` temporariamente (beta, 2026-05-28). Reverter para 20 antes do
> billing: é o que limita o custo de OpenAI se alguém entrar com conta Google descartável,
> caminho que pula a verificação de e-mail.

> `cortesia` (v1.10) é liberação de teste da Viracopos, não plano comercial.

---

## 5. Variáveis de ambiente

Produção: painel Hostinger → Environment Variables. Local: `.env.local` (gitignored).
**`.env` só tem placeholders — nunca commitar segredos.**

> 📋 Lista completa das chaves de produção, origem de cada valor e armadilhas:
> **`_docs/ENV-PRODUCAO.md`**. Leia antes de mexer no painel — em especial o aviso
> sobre o botão "Importar .env", que substitui todas as variáveis em vez de mesclar.

| Variável | Observação |
|---|---|
| `DATABASE_URL` | `mysql://USER:SENHA@srv####.hstgr.io:3306/BANCO` |
| `AUTH_SECRET` | Configurado no painel |
| `NEXTAUTH_URL` | `https://demandoo.com.br` (prod) / `http://localhost:3000` (dev) — **nunca o `.net`**, ver `ENV-PRODUCAO.md` |
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
│   │   │   │   │                      # abas Todas/Delegadas/Recebidas (v1.11)
│   │   │   │   ├── diario/            # Módulo Diário — timeline + sessões de foco (v1.4)
│   │   │   │   │   └── DiarioClient.tsx
│   │   │   │   ├── resumo/            # Resumo do mês — fechamento mensal (v1.6)
│   │   │   │   └── listas/            # Galeria de listas + detalhe com itens
│   │   │   │       └── [id]/          # ListaDetalhe.tsx — checklist + áudio
│   │   │   ├── relatorios/            # Seleção + filtros + checkboxes
│   │   │   ├── configuracoes/         # Perfil, e-mail, senha, plano
│   │   │   └── equipe/                # Gestão de membros + convites
│   │   │
│   │   ├── (print)/                   # Impressão sem Sidebar (auth guard ativo)
│   │   │   ├── relatorios/imprimir/
│   │   │   ├── resumo/[mes]/imprimir/ # Impressão do Resumo do mês (v1.6)
│   │   │   └── diario/[data]/imprimir/ # Impressão do Diário (v1.4)
│   │   │       ├── page.tsx           # Server component — busca dados + renderiza
│   │   │       └── PrintButton.tsx    # Botões Imprimir + Word (client)
│   │   │
│   │   ├── admin/                     # Restrito a SUPER_ADMIN_EMAIL
│   │   │   └── empresas/ usuarios/ planos/ consumo/
│   │   │
│   │   ├── auth/                      # Login, cadastro, verificar, etc.
│   │   │
│   │   └── api/
│   │       ├── admin/planos/[id]/
│   │       ├── auth/                  # cadastro, esqueci-senha, nova-senha,
│   │       │                          # aceitar-convite, reenviar-verificacao (v1.10)
│   │       ├── configuracoes/         # perfil, email, senha
│   │       ├── cron/lembretes/        # GET (bearer auth) — D-0 e D-1 demandas
│   │       ├── cron/lembretes-listas/ # GET (bearer auth) — lembrar N dias antes
│   │       ├── diario/
│   │       │   ├── [data]/exportar-doc/ # GET — gera .doc Word (HTML MSO)
│   │       │   └── pomodoro/           # POST — registra ciclo de foco no Diário do dia
│   │       ├── tags/                   # GET — autocomplete de tags da empresa
│   │       ├── listas/                # GET + POST
│   │       │   └── [id]/
│   │       │       ├── route.ts       # GET + PATCH + DELETE
│   │       │       └── itens/         # GET + POST (texto ou áudio)
│   │       │           └── [itemId]/  # PATCH + DELETE
│   │       ├── demandas/
│   │       │   ├── route.ts           # GET + POST (pipeline IA)
│   │       │   └── [id]/
│   │       │       ├── route.ts       # GET + PATCH (+ auto-log status, focoEncerradoEm) + DELETE
│   │       │       ├── acoes/         # POST + [acaoId] PATCH/DELETE (aceitam prazo, v1.7)
│       │       ├── relacoes/      # GET+POST, [relacaoId] DELETE, candidatos (v1.8)
│       │       ├── delegar/       # POST + [delegacaoId] DELETE (v1.9)
│       │       ├── devolutiva/    # POST — delegado registra retorno (v1.9)
│   │       │       ├── calendar.ics/
│   │       │       ├── comentarios/   # GET + POST + [cId] PATCH/DELETE
│   │       │       └── relatorio/     # POST (gerar IA) + PATCH (salvar)
│   │       ├── sessoes-foco/          # POST + [id] PATCH/DELETE (editar tempo de foco)
│   │       ├── equipe/
│   │       └── upload/                # audio, avatar
│   │
│   ├── auth/                          # NextAuth config + types
│   ├── components/                    # Sidebar, Providers, TagInput, TagBadge
│   │   ├── AutoPrint.tsx              # Auto-dispara window.print() via ?pdf=1 (Diário + Resumo)
│   │   └── pomodoro/                  # PomodoroProvider (context global) + PomodoroWidget (flutuante)
│   └── lib/
│       ├── prisma.ts                  # Singleton
│       ├── date.ts                    # Helpers BRT (data + datetime + mês BRT↔UTC)
│       ├── resumo-mes.ts              # Agregações do fechamento mensal (tela + print + Word)
│       ├── openai.ts                  # Lazy singleton
│       ├── cloudinary.ts
│       ├── tags.ts                    # parse de #, normalização, sincronização de tags
│       ├── relacoes.ts                # vínculos: rótulos/opções/tipos (puro, sem prisma)
│       ├── relacoes-db.ts             # vínculos: carregamento bidirecional
│       ├── delegacao.ts               # delegação: tipos/rótulos (puro, sem prisma)
│       ├── delegacao-db.ts            # delegação: leitura da cadeia + membros
│       ├── rate-limit.ts              # janela por IP, em memória (corta rajada)
│       ├── faxina-contas.ts           # remove contas nunca verificadas (+30 dias, DESARMADA)
│       └── email.ts                   # Nodemailer + templates
```

---

## 7. Pipeline de IA (POST /api/demandas)

1. Verifica quota (`aiUsedTotal >= aiQuota` → bloqueado)
2. Se áudio → Whisper-1 transcreve
3. GPT-4o-mini retorna JSON: `{ titulo, descricao, tipo, prioridade, prazo, acoes, solicitanteNome, tags }`
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

- **Estratégia:** JWT — a sessão é um cookie assinado, **não há registro no servidor**.
  A tabela `sessions` existe (criada pelo PrismaAdapter) mas está sem uso: apagar linha
  de lá não derruba ninguém. A única invalidação em massa é trocar o `AUTH_SECRET`.
- **Providers:** Credentials + Google OAuth (`allowDangerousEmailAccountLinking: true`,
  então uma conta Google nova se vincula sozinha a um e-mail já cadastrado)
- **`trustHost: true`** — obrigatório na Hostinger (proxy reverso)
- **JWT payload:** `id, companyId, companyName, planSlug, aiQuota, aiUsedTotal, role,
  avatarUrl, planExpiresAt`
- Google OAuth: cria empresa automaticamente no 1º acesso, já com `emailVerified`

### ⚠️ Nunca consultar o banco no `jwt` callback fora do login

Tentado na v1.10 (revalidação a cada 5 min) e **revertido no mesmo dia, em produção,
com perda de trabalho de usuário**.

O `middleware.ts` envolve `auth()` com matcher que pega quase toda requisição, e
`auth()` executa o `jwt` callback. Consulta ao banco ali vira consulta em **cada
navegação**; falhando (limite de recursos da Hostinger, pool, timeout), o callback
lança, a sessão não resolve e o middleware redireciona para o login no meio do trabalho.

**Consequência aceita:** o token carrega os dados do login até o próximo login. Mudou
empresa, papel ou plano no banco? Avise a pessoa a sair e entrar.

### Ordem das checagens no `authorize()`

Senha **primeiro**, avisos de estado depois. Na ordem inversa, o `EMAIL_NOT_VERIFIED`
era lançado antes do `bcrypt.compare` e qualquer senha revelava se o e-mail tinha conta.

### Como propagar erro de login para a tela

`throw new Error("X")` **não funciona**: o Auth.js v5 embrulha exceções do `authorize()`
num `CallbackRouteError` e a URL vira `?error=Configuration`, perdendo o motivo — foi
assim durante toda a vida do app, e a mensagem "Confirme seu e-mail" nunca apareceu.

Só `CredentialsSignin` propaga, e o motivo chega no parâmetro **`code`**, não em `error`:

```
/auth/login?error=CredentialsSignin&code=EMAIL_NOT_VERIFIED
```

Códigos em uso: `EMAIL_NOT_VERIFIED`, `ACCOUNT_INACTIVE`, `COMPANY_SUSPENDED`.

### Verificação de e-mail

Quatro pontos gravam `emailVerified`: `/auth/verificar` (link do cadastro),
`/auth/confirmar-email` (troca de e-mail), `aceitar-convite` e o `signIn` do Google.
Desde a v1.10, **`nova-senha` também** — clicar num link enviado ao endereço prova posse
dele. Sem isso, quem perdia as 24h do token ficava sem forma de entrar, mesmo com a
senha certa. O reenvio fica em `POST /api/auth/reenviar-verificacao`.

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
| Input de chips perde texto não confirmado | Tag digitada sem Enter/vírgula se perdia ao submeter — `TagInput` confirma a tag pendente no `onBlur`; sugestão usa `onMouseDown`+`preventDefault` p/ não duplicar |
| Timer JS desacelera em aba de fundo | Pomodoro conta por **timestamp** (`Date.now() - inicio`), nunca somando ticks de `setInterval` |
| Conta sem `emailVerified` não faz login | O `authorize()` barra, e Google/convite já nascem verificados. Logo conta não verificada tem **zero dados** — é o que torna a faxina segura. Mas também trancava para fora quem perdia as 24h do link: por isso existe `/api/auth/reenviar-verificacao` |
| Ordem das checagens no `authorize()` | Senha primeiro, avisos de estado depois. Na ordem inversa, o erro `EMAIL_NOT_VERIFIED` revelava a existência da conta para qualquer senha |
| Consulta ao banco no `jwt` callback | O middleware roda `auth()` em quase toda requisição — consulta ali vira consulta por navegação, e falha de banco vira **logout no meio do trabalho**. Tentado e revertido na v1.10.1. O token carrega os dados do login até o próximo login |
| E-mail disparado dentro de transação | Falha de SMTP não pode desfazer trabalho já gravado. Todo envio vai **depois** do `$transaction`, **sem `await`**, com `.catch()` — no pior caso o aviso não chega |
| Delegação só no detalhe, nunca na captura | A instrução é obrigatória e não cabe na tela de captura rápida — um seletor de pessoa ali criaria delegação sem pedido, e a API recusaria com 400 |
| Delegação exige plano de equipe | `maxUsers = 1` (free/basic/complete) bloqueia o convite em `/equipe`, então não há para quem delegar — a v1.9 fica inerte, sem erro aparente. Planos com vaga: `trial` (5), `basic_equipe` (5), `complete_equipe` (20). Convite **pendente** também ocupa vaga |
| Regra de "intocada" duplicada em leitura e escrita | `cancelavel` (leitura) e o `DELETE` precisam ignorar comentários `STATUS` — a própria delegação cria um. Se divergirem, o botão aparece e a ação é recusada |
| `@@unique` em par de FKs auto-relacional | Só cobre a direção declarada — (B,A) passa pelo unique de (A,B). Checar os dois sentidos na API antes de criar |
| Campo de data opcional em body JSON | Validar formato antes de converter — `parseDataOpcionalBRT` devolve `null` para vazio/inválido, evitando `Invalid Date` gravado no banco. `undefined` no body = não mexe no campo; `null` = limpa |
| `<input type="datetime-local">` e fuso | Retorna string sem timezone — tratar como **BRT** e converter com `parseDateTimeBRT`/`toDateTimeLocalBRT`; nunca `new Date(inputValue)` cru |

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
| Pomodoro como widget global (não por demanda) | Foco "livre" que segue entre telas; estado no client (localStorage), zero schema |
| Ciclo de pomodoro na timeline do Diário (não em `sessoes_foco`) | Não inflar o "Tempo de foco" das demandas; no documento impresso vira seção "Pomodoro" |
| Delegação por **demanda-filha** em vez de visibilidade compartilhada | O app inteiro escopa por `userId` em 15+ queries; compartilhar visibilidade exigiria reescrever todas, com risco de vazamento. Com demanda-filha nenhuma query mudou, e a cadeia vira N níveis de graça |
| Vínculo direcional com leitura bidirecional (`demanda_relacoes`) | Uma linha só, sem espelho a manter em sincronia; o `sentido` inverte o rótulo na exibição. Tag agrupa, vínculo dá direção e cadeia |
| `lib/relacoes.ts` separado de `lib/relacoes-db.ts` | Componente client importa os rótulos; se o módulo importasse prisma, o client acabaria no bundle do browser |
| Tags relacionais (`tags` + `demanda_tags`) | Autocomplete, contagem e isolamento por empresa; IA sugere tags no pipeline |

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
