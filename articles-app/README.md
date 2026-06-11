# Articles DB — Frontend

Aplicação React para gerenciar o banco de dados de artigos científicos no Supabase.

## Como usar

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar credenciais

Crie um arquivo `.env.local` na raiz do projeto:
```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

Ou simplesmente insira as credenciais na tela de login da própria aplicação (elas ficam salvas na sessão do navegador).

### 3. Rodar localmente
```bash
npm run dev
```

### 4. Build para produção
```bash
npm run build
```

## Funcionalidades

- **Dashboard** — Totais e artigos recentes
- **Artigos** — Listar, buscar, visualizar detalhes e inserir novos (com vínculos de autores e keywords)
- **Autores** — Tabela completa com inserção
- **Keywords** — Lista com adição rápida
- **Referências** — Lista com adição de novas referências

## Atenção: RLS no Supabase

Se você habilitou Row Level Security nas tabelas, certifique-se de criar policies de leitura e escrita para a anon key. Exemplo rápido no SQL Editor do Supabase:

```sql
-- Permitir leitura pública
CREATE POLICY "read all" ON "Article" FOR SELECT USING (true);
CREATE POLICY "insert all" ON "Article" FOR INSERT WITH CHECK (true);
-- Repita para: Author, Keywords, Reference, Article_Author, Article_Keywords, Article_Reference
```
