# PAINEL (celular)

App instalável (PWA) do PAINEL para iPhone, só leitura. Contexto e roteiro: `../Painel Academico App/CONTEXTO-CELULAR.md` e `ROTEIRO-CELULAR.md`.

- `npm run dev`: desenvolvimento (usa `dev/resumo-real.json`, cópia local dos dados, fora do git; gerar com `npx vite-node ferramentas/gerar-resumo-exemplo.ts <banco.db> <saida.json>` na pasta do PAINEL).
- `npm run build`: gera `dist/` (precisa de `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
- Nunca versionar dados reais nem chaves.
