# Articles DB

Gerenciador de artigos científicos do Scopus com React + Supabase.

## Estrutura

```
src/
├── lib/supabase.js          # cliente Supabase
├── components/
│   ├── Sidebar.jsx/css      # navegação lateral
│   └── UI.jsx/css           # componentes reutilizáveis
├── pages/
│   ├── Dashboard.jsx/css    # visão geral
│   ├── Articles.jsx/css     # artigos (listar, inserir, detalhar)
│   ├── Authors.jsx          # autores
│   ├── Keywords.jsx         # keywords
│   ├── References.jsx       # referências
│   └── Importer.jsx/css     # importador CSV do Scopus
sql/
├── schema.sql               # cria todas as tabelas
└── import_scopus.sql        # importa CSV via SQL puro
```

## Setup

### 1. Criar o banco no Supabase
Execute `sql/schema.sql` no SQL Editor do Supabase.

### 2. Configurar variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha:
```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

### 3. Instalar e rodar
```bash
npm install
npm run dev
```

### 4. Build para produção
```bash
npm run build
```

## Como importar o CSV do Scopus

### Opção A — Pelo app (recomendado)
Acesse a seção **Importar CSV** no menu lateral e arraste o arquivo.

### Opção B — Via SQL
Veja instruções em `sql/import_scopus.sql`.

## Deploy no GitHub Pages / Vercel / Netlify
Configure as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
nas configurações de ambiente da plataforma.
