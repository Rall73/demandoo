-- ─────────────────────────────────────────────────────────────────────────────
-- demandoo v1.9 — Delegação em cadeia (desenho demanda-filha)
--
-- Rodar no phpMyAdmin nos DOIS bancos, nesta ordem:
--   1) u822347350_demandoo_dev   (desenvolvimento)
--   2) u822347350_bd_demandoo    (produção)
--
-- Só cria tabela nova. Não altera nem apaga nada existente.
-- A coluna `demandas.delegadoUserId` já existe desde o início — não precisa
-- ser criada; a v1.9 apenas passa a usá-la de verdade.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE `delegacoes` (
  `id`                 INT NOT NULL AUTO_INCREMENT,
  `companyId`          INT NOT NULL,
  `demandaOrigemId`    INT NOT NULL,
  `demandaFilhaId`     INT NOT NULL,
  `delegadoPorUserId`  INT NOT NULL,
  `delegadoParaUserId` INT NOT NULL,
  `prazoRetorno`       DATETIME(3) NULL,
  `devolutiva`         TEXT NULL,
  `respondidoAt`       DATETIME(3) NULL,
  `createdAt`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),

  -- uma demanda-filha nasce de exatamente uma delegação
  UNIQUE KEY `uq_delegacao_filha` (`demandaFilhaId`),

  INDEX `idx_deleg_origem`  (`demandaOrigemId`),
  INDEX `idx_deleg_company` (`companyId`),
  INDEX `idx_deleg_para`    (`delegadoParaUserId`),

  -- excluir qualquer uma das pontas leva a delegação junto
  CONSTRAINT `fk_deleg_origem`
    FOREIGN KEY (`demandaOrigemId`) REFERENCES `demandas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deleg_filha`
    FOREIGN KEY (`demandaFilhaId`)  REFERENCES `demandas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deleg_por`
    FOREIGN KEY (`delegadoPorUserId`)  REFERENCES `users`(`id`),
  CONSTRAINT `fk_deleg_para`
    FOREIGN KEY (`delegadoParaUserId`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Conferência (opcional) ───────────────────────────────────────────────────
-- SHOW CREATE TABLE `delegacoes`;
-- SELECT COUNT(*) FROM `delegacoes`;   -- deve retornar 0

-- ── Desfazer, se necessário ──────────────────────────────────────────────────
-- DROP TABLE `delegacoes`;
