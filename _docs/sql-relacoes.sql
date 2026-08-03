-- ─────────────────────────────────────────────────────────────────────────────
-- demandoo v1.8 — Vínculo direto entre demandas
--
-- Rodar no phpMyAdmin nos DOIS bancos, nesta ordem:
--   1) u822347350_demandoo_dev   (desenvolvimento)
--   2) u822347350_bd_demandoo    (produção)
--
-- Só cria tabela nova. Não altera nem apaga nada existente — se algo der
-- errado, DROP TABLE `demanda_relacoes` volta ao estado anterior sem perda.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE `demanda_relacoes` (
  `id`               INT NOT NULL AUTO_INCREMENT,
  `companyId`        INT NOT NULL,
  `demandaOrigemId`  INT NOT NULL,
  `demandaDestinoId` INT NOT NULL,
  `tipo`             ENUM('CONTINUACAO','DESDOBRAMENTO','RELACIONADA')
                     NOT NULL DEFAULT 'RELACIONADA',
  `createdAt`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),

  -- impede vincular o mesmo par duas vezes na mesma direção
  UNIQUE KEY `uq_demanda_relacao` (`demandaOrigemId`,`demandaDestinoId`),

  INDEX `idx_drel_origem`  (`demandaOrigemId`),
  INDEX `idx_drel_destino` (`demandaDestinoId`),
  INDEX `idx_drel_company` (`companyId`),

  -- excluir a demanda leva os vínculos dela junto
  CONSTRAINT `fk_drel_origem`
    FOREIGN KEY (`demandaOrigemId`)  REFERENCES `demandas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_drel_destino`
    FOREIGN KEY (`demandaDestinoId`) REFERENCES `demandas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Conferência (opcional) ───────────────────────────────────────────────────
-- SHOW CREATE TABLE `demanda_relacoes`;
-- SELECT COUNT(*) FROM `demanda_relacoes`;   -- deve retornar 0

-- ── Desfazer, se necessário ──────────────────────────────────────────────────
-- DROP TABLE `demanda_relacoes`;
