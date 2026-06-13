-- ============================================================
-- IMPORTAÇÃO DO CSV DO SCOPUS VIA SQL
-- Como usar:
--   1. Vá em Storage no Supabase → crie um bucket chamado "imports" (público)
--   2. Faça upload do seu CSV para esse bucket
--   3. Execute este script no SQL Editor do Supabase
-- ============================================================

-- PASSO 1: Criar tabela temporária com as colunas do Scopus
DROP TABLE IF EXISTS _scopus_import;

CREATE TEMP TABLE _scopus_import (
  authors             TEXT,
  author_full_names   TEXT,
  authors_id          TEXT,
  title               TEXT,
  year                TEXT,
  source_title        TEXT,
  cited_by            TEXT,
  doi                 TEXT,
  link                TEXT,
  abstract            TEXT,
  author_keywords     TEXT,
  index_keywords      TEXT,
  references          TEXT,
  issn                TEXT,
  isbn                TEXT,
  coden               TEXT,
  language            TEXT,
  document_type       TEXT,
  open_access         TEXT,
  source              TEXT
);

-- PASSO 2: Carregar o CSV da Storage
-- Troque 'SEU-BUCKET-URL' pela URL pública do seu arquivo no Supabase Storage
-- Exemplo: https://xxxx.supabase.co/storage/v1/object/public/imports/scopus.csv

COPY _scopus_import (
  authors, author_full_names, authors_id, title, year,
  source_title, cited_by, doi, link, abstract,
  author_keywords, index_keywords, references, issn, isbn,
  coden, language, document_type, open_access, source
)
FROM PROGRAM 'curl -s "https://SEU-PROJETO.supabase.co/storage/v1/object/public/imports/SEU-ARQUIVO.csv"'
WITH (FORMAT csv, HEADER true, ENCODING 'UTF8', QUOTE '"', DELIMITER ',');

-- (Se não quiser usar Storage, pode usar a extensão file_fdw ou copiar os dados manualmente)

-- ============================================================
-- PASSO 3: Inserir artigos (evitando duplicatas por DOI)
-- ============================================================
INSERT INTO article (title, year, source_title, qt_cited, doi, link, abstract, issn, language, document_type, publication_acess)
SELECT
  TRIM(title),
  CASE WHEN year ~ '^\d+$' THEN year::INTEGER ELSE NULL END,
  NULLIF(TRIM(source_title), ''),
  CASE WHEN cited_by ~ '^\d+$' THEN cited_by::INTEGER ELSE 0 END,
  NULLIF(TRIM(doi), ''),
  NULLIF(TRIM(link), ''),
  NULLIF(TRIM(abstract), ''),
  NULLIF(TRIM(issn), ''),
  NULLIF(TRIM(language), ''),
  NULLIF(TRIM(document_type), ''),
  NULLIF(TRIM(open_access), '')
FROM _scopus_import
WHERE TRIM(title) IS NOT NULL AND TRIM(title) != ''
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASSO 4: Inserir autores únicos
-- Scopus separa autores por "; " em "Author full names"
-- Formato: "Sobrenome, Nome (ID); ..."
-- ============================================================
WITH author_parts AS (
  SELECT DISTINCT
    TRIM(REGEXP_REPLACE(unnest(string_to_array(author_full_names, ';')), '\(\d+\)', '')) AS nome_completo
  FROM _scopus_import
  WHERE author_full_names IS NOT NULL AND author_full_names != ''
),
authors_cleaned AS (
  SELECT
    nome_completo,
    SPLIT_PART(nome_completo, ',', 1) AS nome,
    'A_' || MD5(nome_completo) AS id
  FROM author_parts
  WHERE nome_completo IS NOT NULL AND nome_completo != ''
)
INSERT INTO author (id, nome, nome_completo)
SELECT id, TRIM(nome), TRIM(nome_completo)
FROM authors_cleaned
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PASSO 5: Vincular artigos ↔ autores
-- ============================================================
INSERT INTO article_author (id_article, id_author)
SELECT DISTINCT
  a.id AS id_article,
  'A_' || MD5(TRIM(REGEXP_REPLACE(auth_name, '\(\d+\)', ''))) AS id_author
FROM _scopus_import s
JOIN article a ON TRIM(a.title) = TRIM(s.title)
CROSS JOIN LATERAL unnest(string_to_array(s.author_full_names, ';')) AS auth_name
WHERE s.author_full_names IS NOT NULL
  AND TRIM(REGEXP_REPLACE(auth_name, '\(\d+\)', '')) != ''
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASSO 6: Inserir keywords únicas
-- Scopus separa keywords por "; " em "Author Keywords"
-- ============================================================
INSERT INTO keywords (keyword)
SELECT DISTINCT TRIM(kw)
FROM _scopus_import,
     LATERAL unnest(string_to_array(author_keywords, ';')) AS kw
WHERE author_keywords IS NOT NULL
  AND TRIM(kw) != ''
ON CONFLICT DO NOTHING;

-- ============================================================
-- PASSO 7: Vincular artigos ↔ keywords
-- ============================================================
INSERT INTO article_keywords (id_article, id_keywords)
SELECT DISTINCT
  a.id AS id_article,
  k.id AS id_keywords
FROM _scopus_import s
JOIN article a ON TRIM(a.title) = TRIM(s.title)
CROSS JOIN LATERAL unnest(string_to_array(s.author_keywords, ';')) AS kw_raw
JOIN keywords k ON k.keyword = TRIM(kw_raw)
WHERE s.author_keywords IS NOT NULL
  AND TRIM(kw_raw) != ''
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM article)          AS total_artigos,
  (SELECT COUNT(*) FROM author)           AS total_autores,
  (SELECT COUNT(*) FROM keywords)         AS total_keywords,
  (SELECT COUNT(*) FROM article_author)   AS vinculos_autor,
  (SELECT COUNT(*) FROM article_keywords) AS vinculos_keyword;

-- Limpar tabela temporária
DROP TABLE IF EXISTS _scopus_import;
