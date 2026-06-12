@AGENTS.md

## demandoo.net

SaaS standalone de captura de demandas, tarefas e ideias com IA.
Stack: Next.js 16 (App Router) + Prisma + MySQL + Auth.js v5 + OpenAI + Cloudinary

Consulte antes de planejar qualquer feature:
- `_docs/ARCHITECTURE.md` — modelos, APIs, fluxos, armadilhas conhecidas
- `_docs/PIPELINE.md` — o que está feito e o que vem a seguir

---

## Convenções obrigatórias

### Banco de dados
- Provider: MySQL (`datasource db { provider = "mysql" }`)
- Schema alterado? Gere o SQL equivalente e entregue ao usuário.
- Soft delete em toda entidade de domínio: `deletedAt DateTime?` + `deletedBy Int?`
- Toda query filtra `deletedAt: null`
- Toda tabela de domínio carrega `companyId` (isolamento de tenant)

### Fuso horário
- Servidor roda em UTC; usuários estão em Brasília (UTC-3)
- **Nunca** `new Date()` cru em rota de API para "hoje" ou data relativa
- Usar helpers de `src/lib/date.ts`: `hojeISOBrasil()`, `hojeNoBrasil()`, etc.

### UI
- Ícones: sempre `lucide-react` (nunca emoji como ícone de navegação/ação)
- Todo `<input>` e `<select>`: obrigatório `text-gray-800 bg-white` nas classes
- Ícone: `size={16-20}` navegação, `strokeWidth={2}`
- Paleta principal: violet-600 (brand), emerald (tarefa), amber (ideia)

### Segurança / LGPD
- Todo endpoint valida `companyId` da sessão antes de qualquer query
- Controle de quota de IA: verificar `plan.aiQuota` vs `company.aiUsedTotal`
- Consentimento LGPD: campo `lgpdConsentAt` obrigatório no cadastro
- Soft delete preserva dados; export/delete disponível ao usuário

### Deploy
- Portão pré-push: `npx tsc --noEmit` → `npx next build` → `git push origin main`
- Commit semântico via HEREDOC, arquivos nomeados (nunca `git add -A`)
- Sem segredos no repo — tudo nas env vars do painel Hostinger
- Nunca `output: 'standalone'` no next.config — quebra o Passenger

### Middleware
- Arquivo obrigatoriamente em `src/middleware.ts` — qualquer outro nome é ignorado pelo Next.js
- Build correto exibe `ƒ Proxy (Middleware)` no output
- Rotas `/api/cron/*` devem ser explicitamente isentas de autenticação no middleware
- Cron jobs protegidos por `Authorization: Bearer <CRON_SECRET>` no header (nunca por sessão)
- URL do cron sempre com `https://` — `http://` gera 301 que o cron-job.org não segue

### E-mail transacional (Nodemailer + Hostinger SMTP)
- SMTP: `smtp.hostinger.com`, porta `465` (SSL, `secure: true`) ou `587` (STARTTLS, `secure: false`)
- **Senha de e-mail: NUNCA usar caracteres especiais** (`#`, `@`, `!`, `$`, etc.)
  - `#` em env var é interpretado como comentário → senha truncada → `535 auth failed`
  - `@` e outros precisam de url-encode em DATABASE_URL mas não em variáveis simples
  - Use apenas letras, números e `_` ou `-` em senhas de SMTP
- Transporter Nodemailer: **sempre criado dentro de uma função** (`makeTransporter()`), nunca no nível do módulo — evita cache de env vars antigas
- Contas Google OAuth (sem `passwordHash`): fluxo "esqueci senha" deve enviar `sendDefinePasswordEmail` (criar senha pela 1ª vez), não reset
- Auth.js v5 App Router: `redirect: false` é ignorado para `credentials` → erros chegam via `?error=` na URL, nunca via retorno do `signIn()`
