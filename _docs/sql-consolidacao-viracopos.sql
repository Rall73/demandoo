-- ═════════════════════════════════════════════════════════════════════════════
-- demandoo — CONSOLIDAÇÃO: trazer usuários para a empresa Viracopos
--
-- Rodar em: u822347350_bd_demandoo  (PRODUÇÃO)
-- phpMyAdmin: cole o bloco INTEIRO e execute de uma vez.
--
-- ⚠️ PRIMEIRA EXECUÇÃO = ENSAIO. O COMMIT no final está comentado, então nada
--    é gravado. Confira as conferências e só então descomente e rode de novo.
--
-- O que faz:
--   1. Renomeia a empresa destino para "Viracopos"
--   2. Coloca a empresa destino no plano de cortesia (IA ilimitada)
--   3. FUNDE as tags de mesmo nome (a parte delicada — ver seção 5)
--   4. Move as 11 tabelas que carregam companyId
--   5. Ajusta papéis (ADMIN / USER)
--   6. Soma o consumo de IA e desativa as empresas que ficaram vazias
--
-- Nenhum dado é apagado, exceto tags duplicadas — e essas só depois de suas
-- associações serem repontadas para a tag que sobrevive.
-- ═════════════════════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  PREENCHA AQUI                                                            ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Empresa que sobrevive e vira a Viracopos.
-- É a #1, onde estão as suas 206 demandas (conta ricardo.luize@viracopos.com).
SET @empresa_destino = 1;

-- Ids dos usuários que ENTRAM na Viracopos, separados por vírgula, SEM espaços.
--
-- Só ids, de propósito: nome e e-mail de terceiro não precisam morar no git,
-- e o git não esquece. A correspondência id → pessoa se obtém no banco, com
-- a consulta da seção 3 abaixo, na hora de rodar.
--
-- O id 1 NÃO entra aqui: é a própria empresa destino, já está dentro.
-- O id 8 fica de fora de propósito — é a conta pessoal e o super-admin.
SET @usuarios = '4,5,9,10,11,13,14,15';

-- Quem fica ADMIN da Viracopos, além de você. Vazio ('') = só você.
-- Precisa ser um subconjunto de @usuarios. Ex.: '4' deixaria a Jussara ADMIN.
SET @admins = '';

-- Nome que a empresa destino vai passar a ter
SET @nome_empresa = 'Viracopos';


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  1. PLANO DE CORTESIA                                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- aiQuota NULL = IA ilimitada (o código só bloqueia quando aiQuota não é nulo).
-- maxUsers é NOT NULL, então 100 faz o papel de "ilimitado".
-- Se o plano já existir de uma execução anterior, o INSERT é ignorado.

INSERT IGNORE INTO plans (slug, name, priceCents, aiQuota, maxUsers, active)
VALUES ('cortesia', 'Cortesia', 0, NULL, 100, 1);

SET @plano_cortesia = (SELECT id FROM plans WHERE slug = 'cortesia');


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  2. DESCOBRE AS EMPRESAS DE ORIGEM                                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SET @origens = (
  SELECT GROUP_CONCAT(DISTINCT companyId)
  FROM users
  WHERE FIND_IN_SET(id, @usuarios) AND companyId <> @empresa_destino
);


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  3. CONFERÊNCIAS ANTES — leia com atenção                                 ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

SELECT @empresa_destino AS empresa_destino, @plano_cortesia AS plano_cortesia,
       @usuarios AS usuarios_entrando, @origens AS empresas_de_origem;

-- Quem exatamente será movido
SELECT u.id, u.email, u.name, u.companyId AS de_empresa, c.name AS empresa_atual,
       u.role AS papel_atual,
       CASE WHEN FIND_IN_SET(u.id, @admins) THEN 'ADMIN' ELSE 'USER' END AS papel_novo
FROM users u JOIN companies c ON c.id = u.companyId
WHERE FIND_IN_SET(u.id, @usuarios)
ORDER BY u.id;

-- ⚠️ GUARDA 1: alguma empresa de origem tem mais de um usuário?
-- Se retornar linhas, PARE — mover a empresa levaria junto gente que você não
-- escolheu. Me avise antes de seguir.
SELECT companyId, COUNT(*) AS usuarios
FROM users
WHERE FIND_IN_SET(companyId, @origens) AND deletedAt IS NULL
GROUP BY companyId
HAVING usuarios > 1;

-- ⚠️ GUARDA 2: cabe no plano? (esperado: cabe = 1)
SELECT
  (SELECT COUNT(*) FROM users WHERE companyId = @empresa_destino AND deletedAt IS NULL)
  + (SELECT COUNT(*) FROM users WHERE FIND_IN_SET(id, @usuarios))          AS total_depois,
  (SELECT maxUsers FROM plans WHERE id = @plano_cortesia)                  AS limite_plano,
  (SELECT COUNT(*) FROM users WHERE companyId = @empresa_destino AND deletedAt IS NULL)
  + (SELECT COUNT(*) FROM users WHERE FIND_IN_SET(id, @usuarios))
  <= (SELECT maxUsers FROM plans WHERE id = @plano_cortesia)               AS cabe;

-- Tags que vão colidir e precisarão ser fundidas.
-- Conta o nome repetido em QUALQUER par do conjunto (destino + origens) — não
-- basta comparar cada origem com o destino: duas origens podem colidir entre si
-- mesmo sem o destino ter aquele nome. Foi o que derrubou a 1ª versão do script.
SELECT nome, COUNT(*) AS tags_com_esse_nome,
       GROUP_CONCAT(companyId ORDER BY companyId) AS empresas
FROM tags
WHERE companyId = @empresa_destino OR FIND_IN_SET(companyId, @origens)
GROUP BY nome
HAVING tags_com_esse_nome > 1
ORDER BY tags_com_esse_nome DESC, nome;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  MAPA DE FUSÃO DAS TAGS                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- Uma tag sobrevivente por nome em todo o conjunto. Preferência para a que já
-- está na empresa destino; sem ela, a de menor id.
-- Fica FORA da transação de propósito: é tabela temporária, morre com a conexão
-- e não altera nada permanente.

DROP TEMPORARY TABLE IF EXISTS tmp_tag_map;
CREATE TEMPORARY TABLE tmp_tag_map (
  nome         VARCHAR(50) NOT NULL,
  sobrevivente INT         NOT NULL,
  PRIMARY KEY (nome)
);

INSERT INTO tmp_tag_map (nome, sobrevivente)
SELECT t.nome,
       SUBSTRING_INDEX(
         GROUP_CONCAT(t.id ORDER BY (t.companyId = @empresa_destino) DESC, t.id ASC),
         ',', 1) + 0
FROM tags t
WHERE t.companyId = @empresa_destino OR FIND_IN_SET(t.companyId, @origens)
GROUP BY t.nome;


START TRANSACTION;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  4. EMPRESA DESTINO: nome e plano                                         ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- O nome aparece no cabeçalho dos relatórios impressos e no convite de equipe,
-- por isso não é cosmético.

UPDATE companies
SET name = @nome_empresa, planId = @plano_cortesia
WHERE id = @empresa_destino;


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  5. FUSÃO DAS TAGS — a parte delicada                                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- `tags` tem UNIQUE(companyId, nome). Duas tags de mesmo nome não podem parar
-- na mesma empresa — e isso vale tanto entre origem e destino quanto entre
-- duas origens. Por isso a fusão usa o mapa `tmp_tag_map`, que elege UMA
-- sobrevivente por nome em todo o conjunto.

-- 5a) Remove associações que virariam duplicata: a demanda já tem a sobrevivente
DELETE dt FROM demanda_tags dt
JOIN tags t           ON t.id = dt.tagId
JOIN tmp_tag_map m    ON m.nome = t.nome
JOIN demanda_tags dt2 ON dt2.demandaId = dt.demandaId AND dt2.tagId = m.sobrevivente
WHERE (t.companyId = @empresa_destino OR FIND_IN_SET(t.companyId, @origens))
  AND t.id <> m.sobrevivente;

-- 5b) Reponta todas as associações das tags absorvidas para a sobrevivente
UPDATE demanda_tags dt
JOIN tags t        ON t.id = dt.tagId
JOIN tmp_tag_map m ON m.nome = t.nome
SET dt.tagId = m.sobrevivente
WHERE (t.companyId = @empresa_destino OR FIND_IN_SET(t.companyId, @origens))
  AND t.id <> m.sobrevivente;

-- 5c) Apaga as tags absorvidas (já sem nenhuma associação)
DELETE t FROM tags t
JOIN tmp_tag_map m ON m.nome = t.nome
WHERE (t.companyId = @empresa_destino OR FIND_IN_SET(t.companyId, @origens))
  AND t.id <> m.sobrevivente;

-- 5d) As sobreviventes passam a pertencer à empresa destino
UPDATE tags t
JOIN tmp_tag_map m ON m.sobrevivente = t.id
SET t.companyId = @empresa_destino;

-- 5e) Sobrevivente que estava soft-deletada mas voltou a ter uso é revivida.
--     Tag apagada e sem associação continua apagada — não ressuscita à toa.
UPDATE tags t
JOIN tmp_tag_map m ON m.sobrevivente = t.id
SET t.deletedAt = NULL, t.deletedBy = NULL
WHERE t.deletedAt IS NOT NULL
  AND EXISTS (SELECT 1 FROM demanda_tags dt WHERE dt.tagId = t.id);


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  6. MOVE AS DEMAIS TABELAS COM companyId                                  ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

UPDATE demandas         SET companyId = @empresa_destino WHERE FIND_IN_SET(companyId, @origens);
UPDATE comentarios      SET companyId = @empresa_destino WHERE FIND_IN_SET(companyId, @origens);
UPDATE anexos           SET companyId = @empresa_destino WHERE FIND_IN_SET(companyId, @origens);
UPDATE listas           SET companyId = @empresa_destino WHERE FIND_IN_SET(companyId, @origens);
UPDATE itens_lista      SET companyId = @empresa_destino WHERE FIND_IN_SET(companyId, @origens);
UPDATE demanda_tags     SET companyId = @empresa_destino WHERE FIND_IN_SET(companyId, @origens);
UPDATE sessoes_foco     SET companyId = @empresa_destino WHERE FIND_IN_SET(companyId, @origens);
UPDATE demanda_relacoes SET companyId = @empresa_destino WHERE FIND_IN_SET(companyId, @origens);
UPDATE delegacoes       SET companyId = @empresa_destino WHERE FIND_IN_SET(companyId, @origens);


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  7. USUÁRIOS: empresa e papel                                             ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝
-- Por padrão entram como USER; só quem estiver em @admins fica ADMIN.
-- USER continua dono das próprias demandas — o papel controla gestão de
-- membros, não leitura de dados.

UPDATE users
SET companyId = @empresa_destino,
    role      = CASE WHEN FIND_IN_SET(id, @admins) THEN 'ADMIN' ELSE 'USER' END
WHERE FIND_IN_SET(id, @usuarios);


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  8. CONSUMO DE IA E EMPRESAS VAZIAS                                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Soma o consumo das origens no destino, preservando o histórico do /admin/consumo
UPDATE companies
SET aiUsedTotal = aiUsedTotal + COALESCE(
  (SELECT SUM(aiUsedTotal) FROM (
     SELECT aiUsedTotal FROM companies WHERE FIND_IN_SET(id, @origens)
   ) AS x), 0)
WHERE id = @empresa_destino;

-- Desativa as empresas que ficaram sem ninguém (soft delete — nada é apagado)
UPDATE companies
SET active = 0, deletedAt = NOW(3), aiUsedTotal = 0
WHERE FIND_IN_SET(id, @origens);

-- Convites pendentes das empresas antigas deixam de fazer sentido
DELETE FROM verification_tokens
WHERE identifier LIKE 'invite:%'
  AND FIND_IN_SET(SUBSTRING_INDEX(SUBSTRING_INDEX(identifier, ':', 2), ':', -1), @origens);


-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  9. CONFERÊNCIAS DEPOIS                                                   ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- A Viracopos, com todo mundo dentro
SELECT c.id, c.name AS empresa, p.slug AS plano, p.aiQuota AS quota_ia,
       p.maxUsers, c.aiUsedTotal,
       (SELECT COUNT(*) FROM users WHERE companyId = c.id AND deletedAt IS NULL) AS usuarios
FROM companies c JOIN plans p ON p.id = c.planId
WHERE c.id = @empresa_destino;

-- Quem está na Viracopos agora
SELECT id, email, name, role FROM users
WHERE companyId = @empresa_destino AND deletedAt IS NULL
ORDER BY role, name;

-- Sobrou algum dado apontando para as empresas antigas? (esperado: tudo 0)
SELECT 'demandas' AS tabela, COUNT(*) AS orfas FROM demandas         WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'comentarios',      COUNT(*) FROM comentarios       WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'anexos',           COUNT(*) FROM anexos            WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'listas',           COUNT(*) FROM listas            WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'itens_lista',      COUNT(*) FROM itens_lista       WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'tags',             COUNT(*) FROM tags              WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'demanda_tags',     COUNT(*) FROM demanda_tags      WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'sessoes_foco',     COUNT(*) FROM sessoes_foco      WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'demanda_relacoes', COUNT(*) FROM demanda_relacoes  WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'delegacoes',       COUNT(*) FROM delegacoes        WHERE FIND_IN_SET(companyId, @origens)
UNION ALL SELECT 'users',            COUNT(*) FROM users             WHERE FIND_IN_SET(companyId, @origens) AND deletedAt IS NULL;

-- Nenhuma associação de tag ficou apontando para tag inexistente? (esperado: 0)
SELECT COUNT(*) AS demanda_tags_quebradas
FROM demanda_tags dt LEFT JOIN tags t ON t.id = dt.tagId
WHERE t.id IS NULL;

-- Nenhuma tag duplicada na Viracopos? (esperado: 0 linhas)
SELECT nome, COUNT(*) FROM tags
WHERE companyId = @empresa_destino
GROUP BY nome HAVING COUNT(*) > 1;


-- ═════════════════════════════════════════════════════════════════════════════
-- Confira tudo acima. Se estiver certo, descomente a linha abaixo e rode o
-- bloco inteiro de novo. Enquanto ela estiver comentada, nada é gravado.
--
-- COMMIT;
-- ═════════════════════════════════════════════════════════════════════════════
