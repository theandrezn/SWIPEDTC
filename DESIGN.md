# Design System: DTC Swipe Hub

## 1. Visual Theme & Atmosphere

Interface SaaS premium dark para media buyers, copywriters e estrategistas DTC. O visual combina navy profundo, roxo neon e azul elétrico, com painéis compactos, bordas luminosas discretas e glows controlados. A home deve parecer uma central de inteligência operacional, não um admin genérico.

## 2. Color Palette & Roles

- Background Main (#030716): fundo base do app.
- Background Deep (#050B1D): sidebar, topbar e áreas de maior profundidade.
- Card Surface (#081327): cards, painéis e superfícies principais.
- Soft Card Surface (#0B1730): áreas internas, footers leves e rail lateral.
- Blue Border (#1A2D55): bordas padrão.
- Purple Main (#6D3BFF): glow principal e gradientes.
- Purple Neon (#8B5CFF): bordas especiais, highlights e elementos ativos.
- Purple Glow (#A855F7): luz secundária e hover premium.
- Blue Main (#2563FF): CTA, estado ativo e foco.
- Blue Neon (#1E5BFF): variação intensa para botões e indicadores.
- Cyan Detail (#22D3EE): detalhes especiais, linhas e microindicadores.
- Success Green (#38E77B): crescimento, status positivo e métricas.
- Rating Yellow (#FACC15): estrelas de avaliação.
- Favorite Pink (#FF4F87): favoritos.

## 3. Typography Rules

Fonte principal: Poppins via Google Fonts com pesos 400, 500, 600, 700 e 800. Usar Poppins com hierarquia controlada para não parecer genérico: H1 entre 30 e 36px, títulos de cards em 13 a 15px semibold, metadados em 10 a 12px e badges em uppercase com 10px semibold. Letter spacing sempre 0.

## 4. Component Stylings

* **Fundo do app:** usar radial gradients roxo/azul sobre navy profundo.
* **Hero:** asset sem fundo sobre gradiente, sem retângulo preto; glow roxo/azul atrás do mockup.
* **Botões:** CTA com gradiente #2563FF -> #6D3BFF, altura 44px, raio 8px e shadow neon controlado.
* **Cards:** fundo #081327, área interna #0B1730, borda #1A2D55, hover com borda rgba(139,92,255,.62) e glow roxo/azul.
* **Swipe cards:** imagem 16:9, badges sobre imagem, domínio visível, chips pequenos e footer de ações leve.
* **Inputs/filtros:** fundo #081327, borda #1A2D55, foco azul #2563FF com ring sutil.
* **Right rail:** superfícies #081327/#0B1730, métricas verdes, divisores e linhas em azul/roxo discreto.

## 5. Layout Principles

Sidebar desktop estreita, topbar de 72px, hero no topo com texto à esquerda e visual à direita. Abaixo: KPIs compactos, toolbar horizontal de filtros, grid de swipes e rail lateral com resumo de funil e top tags. No mobile, hero e cards empilham, filtros quebram em linhas e o mockup do hero pode ser reduzido ou ocultado para evitar overflow.
