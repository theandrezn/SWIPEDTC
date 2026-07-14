# DTC Swipe Hub

Plataforma web para organizar swipes DTC: advertorials, quizzes, páginas de venda, criativos, bibliotecas de anúncios, coleções, funis, análise de copy e métricas manuais.

## Stack

- Next.js App Router
- React + TypeScript
- TailwindCSS
- Lucide Icons
- Framer Motion
- Cheerio para Open Graph/metadata
- Captura real de screenshots via Cloudflare Browser Rendering
- Fallback manual/OG image quando o site bloqueia captura
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
npm run preview
```

## Deploy Cloudflare

O projeto está preparado para Cloudflare Workers via OpenNext.

No painel da Cloudflare, use:

```bash
npm run deploy
```

O comando roda `opennextjs-cloudflare build` antes do deploy. Evite usar `npx wrangler deploy` como comando principal em um checkout limpo, porque ele pode tentar migrar o projeto automaticamente durante o build.

### Sincronização automática da Meta Ads Library

O Worker tem um `scheduled()` handler em `worker.ts` e um Cron Trigger em `wrangler.jsonc`:

```jsonc
"triggers": {
  "crons": ["0 */6 * * *"]
}
```

Depois do deploy, a Cloudflare executa `/api/ad-libraries/sync-meta` a cada 6 horas, mesmo com o PC desligado e sem Codex aberto. Para funcionar em produção, configure no Worker:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yugkirleuiqreddxbzis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
META_AD_SYNC_TOKEN=
```

`SUPABASE_SERVICE_ROLE_KEY` é obrigatório para a rotina atualizar os swipes de todos os usuários. `META_AD_SYNC_TOKEN` é opcional, mas recomendado; quando configurado, a rota exige o header `x-sync-token` e o Cron interno envia esse token automaticamente.

## Captura de URL

A rota `POST /api/capture` recebe:

```json
{ "url": "https://example.com" }
```

Ela valida a URL, busca metadata Open Graph/HTML e tenta capturar screenshot real com Cloudflare Browser Rendering. O `wrangler.jsonc` já inclui o binding `BROWSER`; no painel da Cloudflare, habilite Browser Rendering para o Worker. Se o site bloquear captura, a rota usa a imagem Open Graph como fallback e permite upload manual de screenshot.

## Supabase

1. Crie um projeto Supabase.
2. Rode o SQL em `supabase/schema.sql`.
3. Crie um bucket de Storage chamado `swipe-screenshots`.
4. Configure as variáveis no `.env.local` para desenvolvimento e também nas variáveis de ambiente do Cloudflare:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yugkirleuiqreddxbzis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
META_AD_SYNC_TOKEN=
```

O schema inclui RLS para isolar dados por usuário.

Para cadastro real funcionar no deploy, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` precisam estar disponíveis no build da Cloudflare. A conexão MCP do Codex não injeta essas variáveis no navegador.

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
