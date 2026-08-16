-- ─────────────────────────────────────────────────────────────────────────────
-- demandoo — DIAGNÓSTICO 2 (antes da troca de e-mails e da consolidação)
--
-- Rodar em: u822347350_bd_demandoo  (PRODUÇÃO)
-- ⚠️ SOMENTE LEITURA.
-- ─────────────────────────────────────────────────────────────────────────────


-- 1) ⚠️ CRÍTICO — vínculos de login Google (tabela accounts) ─────────────────
-- O PrismaAdapter amarra o login Google ao userId, não ao e-mail. Se #1 e/ou #8
-- tiverem vínculo aqui, trocar os e-mails sem tratar isso pode travar o login.
SELECT
  a.userId,
  u.email,
  a.provider,
  a.type,
  LEFT(a.providerAccountId, 8) AS provider_account_prefixo
FROM accounts a
JOIN users u ON u.id = a.userId
ORDER BY a.userId;


-- 2) As duas contas suas, lado a lado ───────────────────────────────────────
SELECT
  u.id, u.email, u.name, u.companyId, c.name AS empresa, c.email AS email_empresa,
  u.role, u.passwordHash IS NOT NULL AS tem_senha,
  u.emailVerified IS NOT NULL       AS email_verificado,
  u.createdAt
FROM users u
JOIN companies c ON c.id = u.companyId
WHERE u.id IN (1, 8);


-- 3) A conta #8 tem dados? (se tiver, a troca precisa de cuidado extra) ──────
SELECT
  'demandas'     AS tabela, COUNT(*) AS total FROM demandas     WHERE userId = 8 AND deletedAt IS NULL
UNION ALL SELECT 'listas',        COUNT(*) FROM listas          WHERE userId = 8 AND deletedAt IS NULL
UNION ALL SELECT 'comentarios',   COUNT(*) FROM comentarios     WHERE userId = 8 AND deletedAt IS NULL
UNION ALL SELECT 'sessoes_foco',  COUNT(*) FROM sessoes_foco    WHERE userId = 8
UNION ALL SELECT 'demandas_u1',   COUNT(*) FROM demandas        WHERE userId = 1 AND deletedAt IS NULL
UNION ALL SELECT 'listas_u1',     COUNT(*) FROM listas          WHERE userId = 1 AND deletedAt IS NULL;


-- 4) Volume por empresa — o que será movido na consolidação ──────────────────
SELECT
  c.id   AS empresa_id,
  c.name AS empresa,
  (SELECT COUNT(*) FROM demandas         WHERE companyId = c.id AND deletedAt IS NULL) AS demandas,
  (SELECT COUNT(*) FROM comentarios      WHERE companyId = c.id AND deletedAt IS NULL) AS comentarios,
  (SELECT COUNT(*) FROM anexos           WHERE companyId = c.id AND deletedAt IS NULL) AS anexos,
  (SELECT COUNT(*) FROM listas           WHERE companyId = c.id AND deletedAt IS NULL) AS listas,
  (SELECT COUNT(*) FROM itens_lista      WHERE companyId = c.id AND deletedAt IS NULL) AS itens,
  (SELECT COUNT(*) FROM tags             WHERE companyId = c.id AND deletedAt IS NULL) AS tags,
  (SELECT COUNT(*) FROM demanda_tags     WHERE companyId = c.id) AS demanda_tags,
  (SELECT COUNT(*) FROM sessoes_foco     WHERE companyId = c.id) AS sessoes,
  c.aiUsedTotal
FROM companies c
ORDER BY c.id;


-- 5) ⚠️ Colisão de tags entre as empresas que serão fundidas ────────────────
-- tags tem UNIQUE(companyId, nome): mesmo nome em duas empresas não pode
-- simplesmente ser movido — precisa ser fundido.
SELECT
  t.nome,
  COUNT(DISTINCT t.companyId) AS empresas,
  GROUP_CONCAT(DISTINCT t.companyId ORDER BY t.companyId) AS ids_empresas
FROM tags t
WHERE t.deletedAt IS NULL
GROUP BY t.nome
HAVING empresas > 1
ORDER BY empresas DESC, t.nome;


-- 6) Planos existentes — conferir se algum já serve de cortesia ─────────────
SELECT id, slug, name, priceCents, maxUsers, aiQuota, active
FROM plans
ORDER BY id;
