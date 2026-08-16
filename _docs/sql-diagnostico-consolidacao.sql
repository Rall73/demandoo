-- ─────────────────────────────────────────────────────────────────────────────
-- demandoo — DIAGNÓSTICO para consolidação de empresas
--
-- Rodar em: u822347350_bd_demandoo  (PRODUÇÃO)
--
-- ⚠️ SOMENTE LEITURA. Nenhuma linha é alterada. Rode uma consulta por vez e
-- me mande os resultados — só com eles dá para escrever a migração com segurança.
-- ─────────────────────────────────────────────────────────────────────────────


-- 1) Panorama: empresas, plano e quantos usuários cada uma tem ───────────────
SELECT
  c.id                        AS empresa_id,
  c.name                      AS empresa,
  c.slug,
  p.slug                      AS plano,
  p.maxUsers,
  p.aiQuota,
  c.aiUsedTotal,
  c.active,
  c.deletedAt,
  COUNT(u.id)                 AS usuarios
FROM companies c
JOIN plans p ON p.id = c.planId
LEFT JOIN users u ON u.companyId = c.id AND u.deletedAt IS NULL
GROUP BY c.id
ORDER BY usuarios DESC, c.id;


-- 2) Todos os usuários: quem é quem, e de qual domínio ───────────────────────
SELECT
  u.id                        AS user_id,
  u.email,
  u.name,
  u.companyId,
  c.name                      AS empresa,
  u.role,
  u.active,
  u.emailVerified IS NOT NULL AS email_verificado,
  u.passwordHash IS NOT NULL  AS tem_senha,
  u.deletedAt,
  SUBSTRING_INDEX(u.email, '@', -1) AS dominio
FROM users u
JOIN companies c ON c.id = u.companyId
ORDER BY dominio, u.email;


-- 3) O e-mail de destino já existe? (esperado: 0 linhas) ─────────────────────
SELECT id, email, companyId, deletedAt
FROM users
WHERE email IN ('ricardo.luize@gmail.com', 'rluize@gmail.com');


-- 4) Volume de dados por empresa — o que será movido ─────────────────────────
SELECT
  c.id   AS empresa_id,
  c.name AS empresa,
  (SELECT COUNT(*) FROM demandas         WHERE companyId = c.id AND deletedAt IS NULL) AS demandas,
  (SELECT COUNT(*) FROM comentarios      WHERE companyId = c.id AND deletedAt IS NULL) AS comentarios,
  (SELECT COUNT(*) FROM anexos           WHERE companyId = c.id AND deletedAt IS NULL) AS anexos,
  (SELECT COUNT(*) FROM listas           WHERE companyId = c.id AND deletedAt IS NULL) AS listas,
  (SELECT COUNT(*) FROM itens_lista      WHERE companyId = c.id AND deletedAt IS NULL) AS itens_lista,
  (SELECT COUNT(*) FROM tags             WHERE companyId = c.id AND deletedAt IS NULL) AS tags,
  (SELECT COUNT(*) FROM demanda_tags     WHERE companyId = c.id) AS demanda_tags,
  (SELECT COUNT(*) FROM sessoes_foco     WHERE companyId = c.id) AS sessoes_foco,
  (SELECT COUNT(*) FROM demanda_relacoes WHERE companyId = c.id) AS relacoes,
  (SELECT COUNT(*) FROM delegacoes       WHERE companyId = c.id) AS delegacoes
FROM companies c
ORDER BY c.id;


-- 5) ⚠️ COLISÃO DE TAGS — o maior risco da fusão ─────────────────────────────
-- `tags` tem UNIQUE(companyId, nome). Se duas empresas usam a mesma tag,
-- juntar as duas na mesma empresa viola a restrição. Estes nomes precisarão
-- ser fundidos (uma tag sobrevive, a outra é apagada e suas associações
-- repontadas) em vez de simplesmente movidos.
SELECT
  t.nome,
  COUNT(DISTINCT t.companyId) AS empresas_que_usam,
  GROUP_CONCAT(DISTINCT t.companyId ORDER BY t.companyId) AS ids_empresas
FROM tags t
WHERE t.deletedAt IS NULL
GROUP BY t.nome
HAVING empresas_que_usam > 1
ORDER BY empresas_que_usam DESC, t.nome;


-- 6) Convites pendentes — apontam para a empresa antiga no identifier ────────
SELECT identifier, expires
FROM verification_tokens
WHERE identifier LIKE 'invite:%'
  AND expires > NOW();


-- 7) Planos disponíveis — a empresa de destino precisa de vagas ──────────────
SELECT id, slug, name, maxUsers, aiQuota, active
FROM plans
ORDER BY maxUsers DESC;
