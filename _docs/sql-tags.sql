-- ============================================================================
-- demandoo — Sistema de Tags (relacional)
-- Rodar nos DOIS bancos (dev: u822347350_demandoo_dev | prod: u822347350_bd_demandoo)
-- via phpMyAdmin, ANTES do push.
-- ============================================================================

CREATE TABLE `tags` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `companyId` INT NOT NULL,
  `nome` VARCHAR(50) NOT NULL,            -- normalizado: lowercase, sem '#'
  `cor` VARCHAR(20) NULL,
  `deletedAt` DATETIME(3) NULL,
  `deletedBy` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tags_company_nome` (`companyId`, `nome`),
  INDEX `idx_tags_company` (`companyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `demanda_tags` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `demandaId` INT NOT NULL,
  `tagId` INT NOT NULL,
  `companyId` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_demanda_tag` (`demandaId`, `tagId`),
  INDEX `idx_dtags_demanda` (`demandaId`),
  INDEX `idx_dtags_tag` (`tagId`),
  INDEX `idx_dtags_company` (`companyId`),
  CONSTRAINT `fk_dtags_demanda` FOREIGN KEY (`demandaId`) REFERENCES `demandas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dtags_tag`     FOREIGN KEY (`tagId`)     REFERENCES `tags`(`id`)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Observação: o ciclo de pomodoro no Diário NÃO precisa de SQL — usa a tabela
-- `comentarios` existente (tipo = 'POMODORO'), que é VARCHAR livre.
