# DTC Swipe Hub

Plataforma web para organizar swipes DTC: advertorials, quizzes, páginas de venda, criativos, bibliotecas de anúncios, coleções, funis, análise de copy e métricas manuais.

## Stack

- Next.js App Router
- React + TypeScript
- TailwindCSS
- Lucide Icons
- Framer Motion
- Playwright para screenshot público
- Cheerio para Open Graph/metadata
- Supabase preparado para Auth, Postgres, RLS e Storage

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://127.0.0.1:3000` ou `http://localhost:3000`.

No MVP local, o login aceita qualquer e-mail/senha e salva dados no `localStorage` para facilitar teste imediato.

## Checks

```bash
npm run lint
npm run build
```

## Captura de URL

A rota `POST /api/capture` recebe:

```json
{ "url": "https://example.com" }
```

Ela valida a URL, busca metadata Open Graph/HTML e tenta capturar screenshot com Playwright em viewport `1440x1200`. No modo local, screenshots são salvos em `public/captures`.

## Supabase

1. Crie um projeto Supabase.
2. Rode o SQL em `supabase/schema.sql`.
3. Crie um bucket de Storage chamado `swipe-screenshots`.
4. Configure as variáveis:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

O schema inclui RLS para isolar dados por usuário.

## MVP implementado

- Login local de demonstração
- Dashboard com sidebar, busca global, view toggle e métricas
- Criar swipe por URL
- Captura de metadata e screenshot
- Grid/lista/kanban de swipes
- Filtros por tipo, nicho, GEO, idioma, fonte, status, nota, favorito, screenshot e análise
- Página de detalhe com informações, análise de copy, checkboxes de elementos e métricas manuais
- Favoritar, copiar URL, abrir link externo e excluir
- Coleções
- Funis simples com timeline
- Relatórios básicos por categoria, nicho, GEO e fonte
- Responsividade desktop/mobile
