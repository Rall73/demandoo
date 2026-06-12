<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# demandoo — Regras para Agentes

## Antes de comecar qualquer feature

1. Leia `_docs/ARCHITECTURE.md` — modelos, APIs, fluxos e armadilhas conhecidas
2. Leia `_docs/PIPELINE.md` — o que esta feito e o que vem a seguir
3. Leia `CLAUDE.md` — convencoes obrigatorias de codigo

## Regra absoluta de deploy

**Nunca fazer push sem autorizacao explicita do Ricardo.**

Sequencia sempre:
1. Implementar
2. `npx tsc --noEmit` + `npx next build`
3. Avisar Ricardo que esta pronto para teste local
4. Aguardar "pode subir"
5. `git push origin main`

Se houver mudanca de schema MySQL: Ricardo roda o SQL no phpMyAdmin
nos dois bancos (dev + prod) antes do push.
