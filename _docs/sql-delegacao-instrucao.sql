-- ─────────────────────────────────────────────────────────────────────────────
-- demandoo v1.9.1 — Instrução da delegação
--
-- Rodar no phpMyAdmin nos DOIS bancos:
--   1) u822347350_demandoo_dev
--   2) u822347350_bd_demandoo
--
-- Acrescenta uma coluna NULL a uma tabela existente. Não altera dado nenhum:
-- as delegações que já existem ficam com `instrucao` vazia.
--
-- Contexto: a delegação deixou de copiar o checklist da demanda-mãe e passou a
-- carregar uma instrução. Ela fica gravada AQUI, e não só na descrição da
-- demanda-filha, para que o registro do que foi pedido não mude quando o
-- delegado editar a demanda dele.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE `delegacoes`
  ADD COLUMN `instrucao` TEXT NULL AFTER `delegadoParaUserId`;

-- ── Conferência (opcional) ───────────────────────────────────────────────────
-- SHOW COLUMNS FROM `delegacoes` LIKE 'instrucao';

-- ── Desfazer, se necessário ──────────────────────────────────────────────────
-- ALTER TABLE `delegacoes` DROP COLUMN `instrucao`;
