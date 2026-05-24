# demandoo.net — Documento de Contexto Completo

> **Este arquivo é o ponto de partida obrigatório para qualquer sessão de desenvolvimento no projeto demandoo.**
> Leia integralmente antes de escrever qualquer linha de código.

---

## 1. O que é o demandoo

**demandoo.net** é um SaaS standalone de captura de demandas, tarefas e ideias com IA.
É um produto independente — **não tem nenhuma relação com o projeto inicio.aprendiassim.com**.

**Problema que resolve:** Profissionais recebem pedidos, tarefas e ideias de forma caótica ao longo do dia (WhatsApp, reunião, voz, e-mail) e perdem coisas por falta de sistema rápido de captura.

**Diferencial:** O usuário fala ou digita qualquer coisa e a IA (Whisper + GPT-4o-mini) estrutura automaticamente: título, tipo, prioridade, prazo, solicitante e próximas ações.

---

## 2. Stack e versões

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| ORM | Prisma 6 (MySQL) |
| Auth | Auth.js v5 (next-auth@beta) — JWT strategy |
| Banco | MySQL/MariaDB via Hostinger |
| IA | OpenAI Whisper (transcrição) + GPT-4o-mini (estruturação) |
| Armazenamento | Cloudinary (áudio/vídeo) |
| E-mail | Nodemailer (SMTP) |
| UI | Tailwind CSS v4, lucide-react |
| Deploy | Hostinger Node.js gerenciado |

---

## 3. Repositório e localização

- **GitHub:** `https://github.com/Rall73/demandoo` (privado)
- **Branch de produção:** `main` (push = deploy automático)
- **Pasta local:** `C:\Users\Ricardo\Blog\demandoo`
- **Domínio:** `https://demandoo.net`
- **Servidor Hostinger IP:** `147.93.39.25`

---

## 4. Banco de dados

- **Banco real no MySQL:** `u822347350_bd_demandoo`
- **Usuário MySQL:** `u822347350_admin_demandoo`
- **Senha:** *(configurada no painel phpMyAdmin — não comitar)*
- **Host:** `147.93.39.25` (IP do servidor, nunca `localhost`)
- **Porta:** `3306`
- **Remote MySQL:** configurado com `%` (acesso de qualquer host)

### DATABASE_URL correta:
```
mysql://u822347350_admin_demandoo:[SENHA]@147.93.39.25:3306/u822347350_bd_demandoo
```
*(substituir [SENHA] pela senha real — manter apenas no painel Hostinger)*

> ⚠️ **ATENÇÃO:** A Hostinger prefixa automaticamente banco e usuário com `u822347350_`.
> A DATABASE_URL no painel da Hostinger precisa ser atualizada com os nomes completos prefixados.
> Este é o **blocker principal** que impede o cadastro e login por senha de funcionarem.

### Tabelas criadas (SQL já rodado no phpMyAdmin):
- `plans` — planos do produto (free, pro, team)
- `companies` — tenants (uma empresa por cadastro)
- `users` — usuários
- `accounts` — Auth.js OAuth
- `sessions` — Auth.js sessions
- `verification_tokens` — verificação de e-mail
- `demandas` — demandas/tarefas/ideias
- `acoes_demanda` — ações vinculadas a uma demanda

### Dados seed já inseridos:
```sql
INSERT INTO plans (slug, name, priceCents, aiQuota, maxUsers) VALUES
  ('free', 'Explorador',   0,    15,   1),
  ('pro',  'Profissional', 1990, NULL, 1),
  ('team', 'Equipe',       4990, NULL, 5);
```

---

## 5. Variáveis de ambiente (Hostinger)

Todas as variáveis vivem no painel Hostinger → demandoo.net → Environment variables.
**Nunca commitar no repositório.**

| Variável | Valor atual / observação |
|---|---|
| `DATABASE_URL` | ⚠️ PRECISA SER ATUALIZADA — ver seção 3 abaixo com a URL correta |
| `AUTH_SECRET` | *(já configurado no painel Hostinger — não reutilizar em outros projetos)* |
| `NEXTAUTH_URL` | `https://demandoo.net` |
| `NEXT_PUBLIC_APP_URL` | `https://demandoo.net` |
| `OPENAI_API_KEY` | Mesma chave do projeto inicio.aprendiassim.com |
| `CLOUDINARY_CLOUD_NAME` | Mesmo Cloudinary do projeto inicio.aprendiassim.com |
| `CLOUDINARY_API_KEY` | Idem |
| `CLOUDINARY_API_SECRET` | Idem |
| `GOOGLE_CLIENT_ID` | *(copiar do painel Google Cloud Console — OAuth 2.0 Client IDs)* |
| `GOOGLE_CLIENT_SECRET` | *(copiar do painel Google Cloud Console — OAuth 2.0 Client IDs)* |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | *(e-mail Gmail para envio — ainda não configurado)* |
| `SMTP_PASS` | *(senha de app Gmail — ainda não configurado)* |
| `EMAIL_FROM` | `demandoo <noreply@demandoo.net>` |

### Para desenvolvimento local (.env):
```
DATABASE_URL="mysql://u822347350_admin_demandoo:[SENHA]@147.93.39.25:3306/u822347350_bd_demandoo"
AUTH_SECRET="[copiar do painel Hostinger]"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
OPENAI_API_KEY="[copiar do painel Hostinger]"
CLOUDINARY_CLOUD_NAME="[copiar]"
CLOUDINARY_API_KEY="[copiar]"
CLOUDINARY_API_SECRET="[copiar]"
GOOGLE_CLIENT_ID="[copiar do Google Cloud Console]"
GOOGLE_CLIENT_SECRET="[copiar do Google Cloud Console]"
```

---

## 6. Estrutura de arquivos

```
demandoo/
├── prisma/
│   └── schema.prisma              # Schema completo (Prisma 6)
├── public/
│   └── manifest.json              # PWA manifest
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout com Providers (SessionProvider)
│   │   ├── page.tsx               # Landing page pública
│   │   ├── icon.tsx               # Favicon 32x32 (Next.js ImageResponse)
│   │   ├── apple-icon.tsx         # Ícone iOS 180x180
│   │   ├── globals.css            # Estilos globais Tailwind
│   │   ├── (app)/
│   │   │   ├── layout.tsx         # Layout autenticado — verifica sessão, renderiza Sidebar
│   │   │   └── app/
│   │   │       ├── page.tsx       # Hub principal (abas Demanda/Tarefa/Ideia + KPIs + lista)
│   │   │       ├── nova/
│   │   │       │   ├── page.tsx   # Wrapper com Suspense
│   │   │       │   └── NovaCaptura.tsx  # Form de captura (voz + texto, controle de quota IA)
│   │   │       ├── [id]/
│   │   │       │   ├── page.tsx   # Detalhe da demanda (server)
│   │   │       │   └── DetalheActions.tsx  # Botões concluir/deletar (client)
│   │   │       └── calendario/
│   │   │           ├── page.tsx   # Calendário mensal (server)
│   │   │           └── CalendarioGrid.tsx  # Grid client
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   ├── page.tsx       # Wrapper com Suspense
│   │   │   │   └── LoginForm.tsx  # Login e-mail + botão Google (client)
│   │   │   └── cadastro/
│   │   │       └── page.tsx       # Cadastro e-mail + botão Google
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts  # Handler Auth.js
│   │       │   └── cadastro/route.ts       # POST /api/auth/cadastro
│   │       ├── demandas/
│   │       │   ├── route.ts               # GET + POST /api/demandas
│   │       │   └── [id]/route.ts          # GET + PATCH + DELETE /api/demandas/[id]
│   │       └── upload/
│   │           └── audio/route.ts         # POST /api/upload/audio (Cloudinary)
│   ├── auth/
│   │   ├── index.ts               # NextAuth config (Credentials + Google, trustHost: true)
│   │   └── types.ts               # Tipos da sessão (companyId, planSlug, aiQuota, etc.)
│   ├── components/
│   │   ├── Sidebar.tsx            # Sidebar responsiva (desktop fixed + mobile drawer)
│   │   └── Providers.tsx          # SessionProvider wrapper
│   ├── lib/
│   │   ├── prisma.ts              # Singleton PrismaClient
│   │   ├── date.ts                # Helpers BRT: hojeISOBrasil(), parseDateBRT(), etc.
│   │   ├── demandas.ts            # Constantes visuais: TIPO_LABEL, TIPO_ACCENT, TIPO_CHIP
│   │   ├── openai.ts              # Lazy singleton OpenAI (não instancia em build time)
│   │   ├── cloudinary.ts          # Config Cloudinary + publicIdFromUrl + deleteCloudinaryAsset
│   │   └── email.ts               # sendVerificationEmail + sendPasswordResetEmail
│   └── proxy.ts                   # Middleware de autenticação (Next.js 16: proxy.ts, não middleware.ts)
├── next.config.mjs                # Config Next.js (sem output:standalone, headers de segurança)
├── postcss.config.mjs             # PostCSS com Tailwind
├── tsconfig.json
├── package.json                   # postinstall: "prisma generate"
├── CLAUDE.md                      # Convenções do projeto (lido pelo Claude Code)
└── AGENTS.md                      # Aviso sobre versões do framework
```

---

## 7. Modelo de negócio implementado

### Planos
| Plano | Preço | IA | Usuários |
|---|---|---|---|
| Explorador (free) | R$ 0 | 15 capturas vitalícias | 1 |
| Profissional (pro) | R$ 19,90/mês | Ilimitada | 1 |
| Equipe (team) | R$ 49,90/mês | Ilimitada | 5 |

### Controle de quota de IA
- Coluna `aiUsedTotal` na tabela `companies` — incrementa a cada captura com IA
- Coluna `aiQuota` na tabela `plans` — `NULL` = ilimitado, `15` = free
- API verifica antes de chamar Whisper/GPT: `if (aiUsedTotal >= aiQuota) → aiBlocked = true`
- UI mostra banner de aviso quando restam ≤ 30% das capturas
- UI bloqueia voz quando esgotado, mantém modo manual disponível
- Session carrega `aiQuota` e `aiUsedTotal` para o cliente via JWT

---

## 8. Pipeline de IA (POST /api/demandas)

```
1. Verifica quota (company.aiUsedTotal >= plan.aiQuota → retorna aiBlocked)
2. Se audioUrl → fetch do áudio → Whisper → transcricao
3. GPT-4o-mini (uma chamada):
   - Injeta: data de hoje em BRT + dia da semana
   - Retorna JSON: { titulo, descricao, tipo, prioridade, prazo, acoes, solicitanteNome }
4. Tipo DEMANDA/TAREFA/IDEIA classificado pelo GPT via heurísticas no prompt
5. Prazo: GPT resolve datas relativas ("amanhã", "sexta") → YYYY-MM-DD → parseDateBRT()
6. Solicitante: match por primeiro nome em users da mesma company
7. Salva demanda + acoes em transação
8. Incrementa company.aiUsedTotal
```

**Prompt de classificação de tipo:**
- IDEIA: "tive uma ideia", "pensei em", "e se...", "uma sacada", tom exploratório
- TAREFA: pedido simples do próprio usuário, sem terceiros, 1-2 ações
- DEMANDA (padrão): solicitante terceiro, contexto narrativo, múltiplos passos

---

## 9. Autenticação (Auth.js v5)

- **Estratégia:** JWT (não database sessions)
- **Providers:** Credentials (e-mail + senha) + Google OAuth
- **trustHost: true** — obrigatório na Hostinger (proxy reverso)
- **Google OAuth:**
  - Client ID: *(ver painel Google Cloud Console → OAuth 2.0 Client IDs)*
  - Redirect URI configurado: `https://demandoo.net/api/auth/callback/google`
  - No primeiro acesso Google: cria company + user em transação (signIn callback)
  - allowDangerousEmailAccountLinking: true (vincula Google a conta existente)
- **Credentials:** verifica emailVerified, active, company.active
- **JWT payload:** id, companyId, companyName, planSlug, aiQuota, aiUsedTotal, role
- **Verificação de e-mail:** obrigatória para Credentials (não para Google — Google já verificou)

### Fluxo de cadastro por senha:
1. POST /api/auth/cadastro → cria company + user + verificationToken em transação
2. Envia e-mail com link de verificação (sendVerificationEmail)
3. Usuário clica no link → rota /auth/verificar (ainda não implementada — próximo passo)
4. Login com emailVerified setado

---

## 10. Convenções obrigatórias

### Banco
- Soft delete em tudo: `deletedAt DateTime?` + `deletedBy Int?`
- Toda query filtra `deletedAt: null`
- Toda tabela de domínio tem `companyId` (isolamento de tenant)
- Alterações de schema → SQL manual → usuário roda no phpMyAdmin → depois o código

### Fuso horário
- Servidor UTC, usuários em Brasília (UTC-3)
- **Nunca** `new Date()` cru em API para "hoje"
- Usar `src/lib/date.ts`: `hojeISOBrasil()`, `hojeNoBrasil()`, `parseDateBRT()`, etc.
- Prazo armazenado como meia-noite BRT = `T03:00:00Z` em UTC

### UI
- Ícones: sempre `lucide-react` (nunca emoji como ícone de nav/ação)
- Todo `<input>` e `<select>`: obrigatório `text-gray-800 bg-white`
- Paleta: violet (DEMANDA/brand), emerald (TAREFA), amber (IDEIA)

### Deploy
- Portão pré-push: `npx tsc --noEmit` → `npx next build` → `git push origin main`
- Commit semântico via HEREDOC, arquivos nomeados (nunca `git add -A`)
- Sem segredos no repo
- Nunca `output: 'standalone'` — quebra o Passenger da Hostinger
- Next.js 16: middleware chama-se `proxy.ts` (não `middleware.ts`)

---

## 11. Estado atual do projeto (último commit: c31efe7)

### ✅ Funcionando em produção (demandoo.net):
- Landing page pública com hero, como funciona, planos, segurança
- Tela de cadastro (e-mail + Google)
- Tela de login (e-mail + Google)
- Favicon e Apple icon (gerado via Next.js ImageResponse)
- PWA manifest (pode ser instalado no celular)

### ⚠️ Blocker principal — DATABASE_URL incorreta:
A DATABASE_URL no Hostinger ainda usa `bd_demandoo` sem o prefixo.
**Ação necessária:** Atualizar no painel Hostinger para:
```
mysql://u822347350_admin_demandoo:[SENHA]@147.93.39.25:3306/u822347350_bd_demandoo
```
*(usar a senha real — nunca comitar no repo)*
Depois: **Settings and Redeploy** (não só "Update").

### 🔧 Páginas criadas mas dependem do banco:
- `/app` — lista de demandas (abas Demanda/Tarefa/Ideia)
- `/app/nova` — captura por voz e texto com IA
- `/app/[id]` — detalhe com ações
- `/app/calendario` — grid mensal

### ❌ Ainda não implementado (próximas etapas):
1. **Rota /auth/verificar** — confirma token de e-mail (necessário para login por senha funcionar completamente)
2. **Rota /auth/esqueci-senha** — reset de senha
3. **Rota /auth/nova-senha** — nova senha após reset
4. **Rota /planos** — upgrade de plano (atualmente o link existe mas a página não)
5. **SMTP configurado** — e-mail de verificação não está sendo enviado (SMTP_USER/SMTP_PASS vazios)
6. **Google OAuth vars no Hostinger** — GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET precisam ser adicionados
7. **Endpoint /api/demandas/[id]/calendar.ics** — .ics para download (código não portado ainda)
8. **Tela de configurações da conta** — exportar dados, excluir conta (LGPD)
9. **Página /politica-de-privacidade** — link existe no footer mas página não existe
10. **Página /termos-de-uso** — idem
11. **Stripe ou gateway de pagamento** — para planos pagos
12. **Painel admin** — visão de empresas/usuários para o dono do SaaS

---

## 12. Próximos passos imediatos (em ordem de prioridade)

### Prioridade 1 — Fazer o app funcionar completamente
1. Corrigir DATABASE_URL no Hostinger (prefixo `u822347350_`)
2. Adicionar GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no Hostinger
3. Fazer Settings and Redeploy
4. Implementar /auth/verificar (confirma token de e-mail)
5. Configurar SMTP (Gmail App Password)

### Prioridade 2 — Completar fluxo do usuário
6. Implementar /auth/esqueci-senha + /auth/nova-senha
7. Implementar /planos (tela de upgrade)
8. Implementar /api/demandas/[id]/calendar.ics
9. Criar páginas legais (/politica-de-privacidade, /termos-de-uso)

### Prioridade 3 — Qualidade e crescimento
10. Tela de configurações (exportar dados, excluir conta — LGPD)
11. Melhorar onboarding do novo usuário
12. Integrar Stripe para cobrança dos planos pagos
13. Painel de admin interno

---

## 13. Decisões de design importantes

### Por que um único modelo Demanda para três tipos?
DEMANDA, TAREFA e IDEIA usam a mesma tabela com coluna `tipo ENUM`. Isso permite:
- Pipeline de criação idêntico
- Promoção fácil entre tipos (PATCH tipo)
- Calendário agrega todos sem JOIN complexo
- IA classifica na criação

### Por que freemium vitalício (não mensal)?
15 capturas para sempre no free — não 15 por mês. O pool vitalício cria urgência real de conversão quando o hábito está formado. Usuário free mensal que usa 2/mês nunca converte.

### Por que .ics em vez de Google Calendar OAuth?
Google OAuth bidirecional (refresh_token, sync, webhook) é complexo e tem manutenção alta. O .ics funciona com qualquer cliente de calendário (Google, Apple, Outlook) com zero dependência. OAuth fica como opção futura se .ics provar insuficiente.

### Por que não `output: 'standalone'` no Next.js?
O modo standalone quebra o Passenger da Hostinger (o servidor que roda o Node.js). Assets estáticos ficam com 404. A Hostinger gerencia o serving dos arquivos estáticos automaticamente quando não está em standalone.

### Por que proxy.ts em vez de middleware.ts?
Next.js 16 depreciou a convenção `middleware.ts` — o arquivo correto agora é `proxy.ts`. Usar o nome antigo gera warnings e pode parar de funcionar em versões futuras.

---

## 14. Comandos úteis

```bash
# Desenvolvimento local
cd C:\Users\Ricardo\Blog\demandoo
npm run dev

# Antes de qualquer push
npx tsc --noEmit
npx next build

# Deploy (push = deploy automático)
git push origin main

# Gerar Prisma client após mudança de schema
npx prisma generate

# Ver logs em produção
# Hostinger → demandoo.net → Logs
```

---

## 15. Como iniciar uma nova sessão Claude Code neste projeto

### Opção A (recomendada): Abrir o projeto no Claude Code
```bash
cd C:\Users\Ricardo\Blog\demandoo
# Iniciar Claude Code aqui — ele lê CLAUDE.md e AGENTS.md automaticamente
```

### Opção B: Compartilhar este documento como contexto inicial
Cole o conteúdo deste arquivo como primeira mensagem na nova conversa.

### O que informar ao Claude na abertura:
> "Estou trabalhando no projeto demandoo.net — um SaaS standalone de captura de demandas/tarefas/ideias com IA. O projeto está em C:\Users\Ricardo\Blog\demandoo e o repositório é github.com/Rall73/demandoo. Leia o ONBOARDING.md para contexto completo antes de qualquer ação."

---

*Última atualização: commit c31efe7 — páginas Nova, Detalhe, Calendário + SessionProvider*
