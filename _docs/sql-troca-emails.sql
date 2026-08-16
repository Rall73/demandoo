-- ─────────────────────────────────────────────────────────────────────────────
-- demandoo — Troca de e-mails entre as contas #1 e #8
--
-- Rodar em: u822347350_bd_demandoo  (PRODUÇÃO)
--
-- ⚠️ PRÉ-REQUISITO OBRIGATÓRIO
-- Antes de rodar isto, logado como rluize@gmail.com, vá em
-- Configurações → alterar senha e CRIE UMA SENHA.
-- A conta #1 hoje só entra por Google. Este script move o vínculo Google para
-- a conta #8; sem uma senha criada antes, o usuário #1 fica sem forma de login.
--
-- Objetivo:
--   #1  rluize@gmail.com            → ricardo.luize@viracopos.com  (Viracopos, 206 demandas)
--   #8  ricardo.luize@viracopos.com → rluize@gmail.com             (pessoal + super-admin)
--
-- Nenhum dado se move: os registros seguem presos ao userId.
-- Rode o bloco inteiro de uma vez, com "Enable transaction" marcado no phpMyAdmin.
-- ─────────────────────────────────────────────────────────────────────────────

START TRANSACTION;

-- ── Conferência ANTES ────────────────────────────────────────────────────────
SELECT id, email, companyId, passwordHash IS NOT NULL AS tem_senha
FROM users WHERE id IN (1, 8);

SELECT userId, provider FROM accounts WHERE userId IN (1, 8);


-- ── 1) Vínculo Google passa para a conta pessoal ────────────────────────────
UPDATE accounts SET userId = 8 WHERE userId = 1 AND provider = 'google';


-- ── 2) Inversão dos e-mails (UNIQUE exige o passo temporário) ───────────────
UPDATE users SET email = '__troca_em_andamento__@demandoo.local' WHERE id = 8;
UPDATE users SET email = 'ricardo.luize@viracopos.com'           WHERE id = 1;
UPDATE users SET email = 'rluize@gmail.com'                      WHERE id = 8;


-- ── 3) E-mail de contato das empresas acompanha ─────────────────────────────
UPDATE companies SET email = 'ricardo.luize@viracopos.com' WHERE id = 1;
UPDATE companies SET email = 'rluize@gmail.com'            WHERE id = 8;


-- ── Conferência DEPOIS ──────────────────────────────────────────────────────
-- Esperado:
--   #1 = ricardo.luize@viracopos.com, tem_senha = 1, SEM linha em accounts
--   #8 = rluize@gmail.com,            tem_senha = 1, COM linha google em accounts
SELECT id, email, companyId, passwordHash IS NOT NULL AS tem_senha
FROM users WHERE id IN (1, 8);

SELECT userId, provider FROM accounts WHERE userId IN (1, 8);

-- Ninguém ficou com o e-mail temporário? (esperado: 0 linhas)
SELECT id, email FROM users WHERE email LIKE '%__troca_em_andamento__%';


-- ─────────────────────────────────────────────────────────────────────────────
-- COMMIT ativo.
--
-- Na primeira execução esta linha estava comentada, e o phpMyAdmin desfez a
-- transação ao fechar a conexão — o que serviu de ensaio: as 6 alterações
-- rodaram, afetaram 1 linha cada e as três conferências bateram, sem gravar
-- nada. Agora vale.
--
-- Os SELECTs de conferência acima continuam sendo exibidos; role a página e
-- confira antes de seguir para o logout/login.
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;
