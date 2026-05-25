# demandoo

> SaaS de captura de demandas, tarefas e ideias com IA.
> Fale ou digite qualquer coisa — Whisper transcreve e GPT-4o-mini estrutura automaticamente.

🌐 **Produção:** [demandoo.net](https://demandoo.net)

---

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript
- **Prisma 6** + MySQL (Hostinger)
- **Auth.js v5** (Credentials + Google OAuth, JWT)
- **OpenAI** Whisper-1 + GPT-4o-mini
- **Cloudinary** para áudio e avatares
- **Nodemailer** + SMTP Hostinger
- **Tailwind CSS v4** + lucide-react
- Cron via [cron-job.org](https://cron-job.org)

---

## Desenvolvimento local

```bash
# 1. Clonar
git clone https://github.com/Rall73/demandoo.git
cd demandoo

# 2. Instalar dependências (roda `prisma generate` automaticamente)
npm install

# 3. Copiar .env e preencher com valores reais (ver ONBOARDING.md)
cp .env .env.local
# edite .env.local

# 4. Subir o dev server
npm run dev
# → http://localhost:3000
```

Variáveis de ambiente necessárias estão documentadas em [`ONBOARDING.md`](./ONBOARDING.md).

---

## Portão pré-deploy

Antes de qualquer `git push`, rodar nessa ordem:

```bash
npx tsc --noEmit     # checa tipos
npx next build       # build de produção (pega erros de rota/SSR/import)
```

Deploy é **automático** ao fazer push na `main` (Hostinger detecta e rebuilda).

---

## Documentação do projeto

| Arquivo | Para que serve |
|---|---|
| [`ONBOARDING.md`](./ONBOARDING.md) | **Comece aqui.** Contexto completo, stack, env vars, estrutura, decisões de design |
| [`CLAUDE.md`](./CLAUDE.md) | Convenções obrigatórias (banco, fuso, UI, segurança, middleware, SMTP, deploy) |
| [`AGENTS.md`](./AGENTS.md) | Aviso para agentes de IA sobre Next.js 16 |
| [`PIPELINE.md`](./PIPELINE.md) | Histórico de versões + backlog priorizado |
| [`FUNCIONALIDADES-A-PORTAR.md`](./FUNCIONALIDADES-A-PORTAR.md) | Histórico — porte de features do projeto original (já cumprido) |

---

## Estrutura mínima

```
src/
├── middleware.ts              # auth + libera /api/cron
├── app/
│   ├── (app)/                 # rotas autenticadas
│   ├── admin/                 # painel super-admin (SUPER_ADMIN_EMAIL)
│   ├── auth/                  # login, cadastro, recuperação
│   ├── api/                   # endpoints REST
│   └── como-funciona/         # página pública do produto
├── auth/                      # config Auth.js v5
├── components/                # Sidebar, Providers
└── lib/                       # prisma, openai, cloudinary, date, email
```

Ver [`ONBOARDING.md`](./ONBOARDING.md) para a estrutura completa.

---

## Licença

Privado — todos os direitos reservados.
