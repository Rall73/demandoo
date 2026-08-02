# demandoo — Variáveis de ambiente em produção

> Referência das chaves esperadas no painel Hostinger (hPanel → app do demandoo → Variáveis de ambiente).
> **Este arquivo não contém segredos** — só as chaves, a origem de cada valor e as armadilhas.
> Valores reais: `.env.local` (gitignored) ou o próprio painel.
> Última atualização: 2026-07-25

---

## ⛔ Nunca use o botão "Importar .env"

O "Importar .env" do hPanel **substitui o conjunto inteiro de variáveis, não mescla**.

Em 2026-07-25 um `.env` do projeto Nyflux foi importado no app do demandoo e apagou
todas as variáveis de produção. O site continuou de pé, mas o login Google passou a
falhar com `Missing required parameter: client_id` — porque `GOOGLE_CLIENT_ID` e
`GOOGLE_CLIENT_SECRET` **só existiam no painel** e não têm cópia no repositório.

Para alterar variáveis: **"Adicionar variável de ambiente"** (uma a uma) ou o ícone de
lápis para editar. Sempre. Mesmo que sejam 20 chaves.

---

## 1. Chaves esperadas (19 + 1 opcional)

### Banco de dados

| Chave | Origem do valor | Observação |
|---|---|---|
| `DATABASE_URL` | phpMyAdmin / hPanel → Bancos de dados | **Prod:** banco `u822347350_bd_demandoo`, usuário `u822347350_admin_demandoo`. **Não confundir** com `u822347350_demandoo_dev` / `u822347350_demandoo_duser`, que é o de desenvolvimento e é o que está no `.env.local`. Formato: `mysql://USER:SENHA@srv####.hstgr.io:3306/BANCO` |

### Auth.js v5

| Chave | Origem do valor | Observação |
|---|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` | v5 usa **`AUTH_SECRET`**, não `NEXTAUTH_SECRET`. Trocar o valor derruba todas as sessões ativas — usuários precisam logar de novo |
| `NEXTAUTH_URL` | fixo | `https://demandoo.com.br` — **nunca o `.net`**, ver seção 3. A chave `NEXTAUTH_URL` **continua válida no v5** (lida como alias de `AUTH_URL`, ver `node_modules/next-auth/lib/env.js`). Só o `NEXTAUTH_SECRET` é que foi aposentado |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs e Serviços → Credenciais | **Sem cópia no repositório.** Se perder, só se recupera no console da Google |
| `GOOGLE_CLIENT_SECRET` | idem | Idem. Se o secret não for mais exibido, gerar um novo (invalida o anterior) |

### Aplicação

| Chave | Origem do valor | Observação |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | fixo | `https://demandoo.com.br` — **nunca o `.net`**. **Injetado no build** — ver seção 3 |
| `SUPER_ADMIN_EMAIL` | fixo | `rluize@gmail.com`. Libera `/admin/*` |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | **Opcional.** Formato `G-XXXXXXXXXX`. Vazio ou ausente desativa o Analytics. **Injetado no build** |

### Integrações

| Chave | Origem do valor | Observação |
|---|---|---|
| `OPENAI_API_KEY` | platform.openai.com (conta do Ricardo) | Whisper-1 + GPT-4o-mini |
| `CLOUDINARY_CLOUD_NAME` | console.cloudinary.com | Áudio + avatares |
| `CLOUDINARY_API_KEY` | idem | |
| `CLOUDINARY_API_SECRET` | idem | |

### E-mail transacional

| Chave | Valor de produção | Observação |
|---|---|---|
| `SMTP_HOST` | `smtp.hostinger.com` | |
| `SMTP_PORT` | `465` | SSL. O código deriva `secure` da porta (`src/lib/email.ts`): 465 → SSL, 587 → STARTTLS. Ambos funcionam |
| `SMTP_USER` | `noreply@demandoo.net` | |
| `SMTP_PASS` | hPanel → E-mails | **SOMENTE alfanumérico + `_` ou `-`** — ver seção 3 |
| `EMAIL_FROM` | `demandoo <noreply@demandoo.net>` | |

### Cron

| Chave | Origem do valor | Observação |
|---|---|---|
| `CRON_SECRET` | gerado (hex 64) | Bearer token de `/api/cron/*`. Mesmo valor cadastrado no cron-job.org |

---

## 2. Chaves que NÃO pertencem ao demandoo

Se alguma destas aparecer no painel, veio de outro projeto (Nyflux) e deve ser apagada:

`TOKEN_ENCRYPTION_KEY` · `WHATSAPP_WABA_ID` · `WHATSAPP_APP_SECRET` ·
`WHATSAPP_PHONE_NUMBER_ID` · `WHATSAPP_ACCESS_TOKEN` · `WHATSAPP_VERIFY_TOKEN` ·
`NEXTAUTH_SECRET`

Cuidado especial com `NEXTAUTH_SECRET`: o next-auth v5 o aceita como **fallback**
(`config.secret = AUTH_SECRET ?? NEXTAUTH_SECRET`). Um `NEXTAUTH_SECRET` errado
sobrando no painel não gera erro visível enquanto `AUTH_SECRET` existir — ele
simplesmente é ignorado. Mas se o `AUTH_SECRET` sumir, o app volta a assinar sessões
com o segredo errado silenciosamente. Apagar.

`NODE_OPTIONS` e `UV_THREADPOOL_SIZE` também não são usados pelo demandoo. São tuning
genérico de runtime Node. Não quebram nada, mas `NODE_OPTIONS` costuma carregar
`--max-old-space-size`, que mexe no limite de memória do processo na Hostinger — não
manter valores calibrados para outra aplicação.

---

## 3. Armadilhas

### `NEXT_PUBLIC_*` é injetado no build, não no runtime

`NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_GA_ID` entram no bundle do cliente **durante o
build**. Salvar no painel e reiniciar o app não surte efeito — é preciso um rebuild
(commit na `main` dispara o deploy automático). As demais variáveis são lidas em
runtime e valem após reiniciar.

### `SMTP_PASS` com caractere especial quebra o SMTP

`#` em variável de ambiente é interpretado como início de comentário → a senha chega
truncada → `535 auth failed`. Outros especiais (`@`, `!`, `$`) podem sobreviver ao
campo do hPanel, mas não vale o risco. **Use apenas letras, números, `_` e `-`.**

### O domínio canônico é `demandoo.com.br`, não o `.net`

**`NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL` são `https://demandoo.com.br`.**
O `demandoo.net` existe e redireciona para o `.com.br` — nunca o contrário. Motivo:
o TLD `.net` é bloqueado por filtro de rede em algumas empresas, e o público do
demandoo acessa de dentro delas.

Cuidado com o `NEXTAUTH_URL` em especial, porque a falha é silenciosa e confusa: o
next-auth passa toda requisição por `reqWithEnvURL` (`node_modules/next-auth/lib/env.js`),
que **reescreve a origem da requisição** para a origem do `NEXTAUTH_URL`. Com o valor
errado, o `req.url` dentro do `src/middleware.ts` deixa de ser o domínio acessado, e o
`NextResponse.redirect()` do middleware joga o usuário para o outro domínio. O site
sobe normalmente e só o redirecionamento parece quebrado.

Ao trocar o domínio, atualizar também os **URIs de redirecionamento autorizados** no
Google Cloud Console (`https://demandoo.com.br/api/auth/callback/google`), senão o
login Google quebra com `redirect_uri_mismatch`.

### `localhost` no `.env.local` não vale para produção

`NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL` estão como `http://localhost:3000` no arquivo
local — nunca copiar esses dois do `.env.local` para o painel.

### URL do cron sempre com `https://`

`http://` gera 301 que o cron-job.org não segue.

---

## 4. Ordem segura para reconstruir tudo do zero

1. Aplicar `DATABASE_URL` primeiro e clicar em **"Aplicar mudanças"** — confirma que o
   painel está funcionando e que o banco responde antes de mexer no resto
2. Apagar as chaves da seção 2
3. Corrigir as que já existem com valor errado
4. Adicionar as que faltam (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` são as únicas
   que exigem ir buscar fora — Google Cloud Console)
5. **"Aplicar mudanças"**
6. Disparar um rebuild por causa das `NEXT_PUBLIC_*`
7. Testar: login Google → login e-mail/senha → "esqueci minha senha" (valida SMTP) →
   captura com áudio (valida OpenAI + Cloudinary) → `/admin` (valida `SUPER_ADMIN_EMAIL`)

---

## 5. Backup

O painel Hostinger não tem exportação de variáveis. As chaves estão documentadas aqui;
os **valores** só existem em dois lugares: no painel e no `.env.local` da máquina do
Ricardo — e `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` **não estão nem no `.env.local`**
(são placeholders lá).

Recomendado: manter uma cópia dos valores de produção num gerenciador de senhas,
incluindo os dois do Google.
