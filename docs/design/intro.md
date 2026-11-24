# Introdução ilustrada

Na primeira vez que o jogador clica em **Jogar**, o jogo exibe uma sequência de **7 quadros ilustrados** em ordem (`01` a `07`) que contam a história do povo Rekanã, a chegada da Biovex Corp., a destruição da floresta e o despertar do Protagonista junto ao espírito da mata.

Arquivos principais:
- Conteúdo e ordem dos quadros: [`content/intro.json`](../../content/intro.json)
- Ilustrações (`01` a `07`): `public/assets/intro/quadro-01.jpg` a `quadro-07.jpg`
- Validação de conteúdo: [`src/core/conteudo.ts`](../../src/core/conteudo.ts) (`TOTAL_QUADROS_INTRO = 7`) e [`scripts/check-content.ts`](../../scripts/check-content.ts)
- Tela, navegação e transições: [`index.html`](../../index.html), [`src/game/intro.ts`](../../src/game/intro.ts) e [`src/style.css`](../../src/style.css)
- Persistência de primeira visualização: [`src/game/armazenamentoProgresso.ts`](../../src/game/armazenamentoProgresso.ts) (`revolta:intro-vista:v2`)

## Sequência narrativa (01 → 07)

| Quadro | Arquivo | Narrativa |
|---|---|---|
| 01 | `quadro-01.jpg` | Por gerações, o povo Rekanã viveu em harmonia com a floresta, protegendo aquilo que também os protegia. |
| 02 | `quadro-02.jpg` | Prometeram prosperidade. Mas seus verdadeiros interesses estavam escondidos. |
| 03 | `quadro-03.jpg` | A floresta, antes cheia de vida, começou a ser destruída em nome do progresso. |
| 04 | `quadro-04.jpg` | Aqueles que se recusaram a abandonar suas terras foram perseguidos, capturados ou mortos. |
| 05 | `quadro-05.jpg` | Quando tudo parecia perdido, a floresta ainda não havia desistido dele. |
| 06 | `quadro-06.jpg` | A vida que habita a floresta ainda resiste em você. |
| 07 | `quadro-07.jpg` | Encontre as provas. Resgate os sobreviventes. Libere as almas daqueles que foram esquecidos. A floresta ainda pode renascer. |

## Comportamento e controles

- **Primeira vez:** exibida automaticamente ao clicar em **Jogar** quando `progresso.introVista()` é `false`. Ao concluir o quadro 7 (**Começar**) ou clicar em **Pular**, a introdução é marcada como vista em `localStorage` (`revolta:intro-vista:v2`) e o jogador segue direto para a Fase.
- **Navegação:** botões **Anterior**, **Próximo** (vira **Começar** no quadro 7) e **Pular**; no teclado, `←`, `→` e `Esc`; no celular, deslize horizontal sobre o quadro.
- **Pré-carregamento:** ao exibir um quadro, o próximo já é pré-carregado em memória para evitar piscadas na troca.
- **Transição:** usa View Transitions direcionais (`forward` / `backward`) quando o navegador suporta, respeitando `prefers-reduced-motion` e com fallback imediato.

## Layout e acessibilidade

- **Enquadramento sem rolagem:** as ilustrações são verticais e já trazem a caixa de texto narrativa na própria arte. A tela `.tela-intro` usa layout `flex` em coluna travado em `100dvh` (`overflow: hidden`) com `.intro-quadro` em `flex: 1 1 0; min-block-size: 0` e imagem em `object-fit: contain`, garantindo que cada quadro apareça inteiro e os controles fiquem sempre visíveis e acima da imagem (`z-index: 2`), sem rolagem vertical.
- **Leitores de tela:** cada quadro mantém a descrição visual completa em `alt` e o texto narrativo em `<figcaption id="intro-texto" class="sr-only" aria-live="polite">`, evitando duplicar o texto visualmente sem perder acessibilidade.
