@AGENTS.md

## Projeto: demandoo.net

SaaS standalone de captura de demandas, tarefas e ideias com IA.
Stack: Next.js 16 (App Router) + Prisma + MySQL + Auth.js v5 + OpenAI + Cloudinary

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
