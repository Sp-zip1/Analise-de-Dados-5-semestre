-- ============================================================
-- SCHEMA v2 - corrigido
-- ============================================================

DROP TABLE IF EXISTS article_reference CASCADE;
DROP TABLE IF EXISTS article_keywords  CASCADE;
DROP TABLE IF EXISTS article_author    CASCADE;
DROP TABLE IF EXISTS article           CASCADE;
DROP TABLE IF EXISTS author            CASCADE;
DROP TABLE IF EXISTS keywords          CASCADE;
DROP TABLE IF EXISTS reference         CASCADE;

CREATE TABLE author (
    id            TEXT PRIMARY KEY,
    nome          TEXT,
    nome_completo TEXT NOT NULL
);

CREATE TABLE keywords (
    id      SERIAL PRIMARY KEY,
    keyword TEXT NOT NULL
);

CREATE TABLE reference (
    id        SERIAL PRIMARY KEY,
    reference TEXT NOT NULL
);

CREATE TABLE article (
    id                SERIAL PRIMARY KEY,
    title             TEXT NOT NULL,
    year              INTEGER,
    source_title      TEXT,
    qt_cited          INTEGER DEFAULT 0,
    doi               TEXT,
    link              TEXT,
    abstract          TEXT,
    issn              TEXT,
    language          TEXT,
    document_type     TEXT,
    publication_acess TEXT
);

CREATE TABLE article_author (
    id_article INTEGER NOT NULL REFERENCES article(id) ON DELETE CASCADE,
    id_author  TEXT    NOT NULL REFERENCES author(id)  ON DELETE CASCADE,
    PRIMARY KEY (id_article, id_author)
);

CREATE TABLE article_keywords (
    id_article  INTEGER NOT NULL REFERENCES article(id)  ON DELETE CASCADE,
    id_keywords INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (id_article, id_keywords)
);

CREATE TABLE article_reference (
    id_article   INTEGER NOT NULL REFERENCES article(id)   ON DELETE CASCADE,
    id_reference INTEGER NOT NULL REFERENCES reference(id) ON DELETE CASCADE,
    PRIMARY KEY (id_article, id_reference)
);

CREATE INDEX ON article(year);
CREATE INDEX ON article(doi);
CREATE INDEX ON article_author(id_author);
CREATE INDEX ON article_keywords(id_keywords);

-- RLS
ALTER TABLE author            ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference         ENABLE ROW LEVEL SECURITY;
ALTER TABLE article           ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_author    ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_keywords  ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_reference ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'author','keywords','reference','article',
    'article_author','article_keywords','article_reference'
  ] LOOP
    EXECUTE format('CREATE POLICY "anon_select" ON %I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "anon_insert" ON %I FOR INSERT WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "anon_delete" ON %I FOR DELETE USING (true)', t);
  END LOOP;
END $$;
