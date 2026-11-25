# Pesquisa: arte do Drone Desmatador e do Guarda Florestal

> **Feito em 24/11/2026:** Drone e Guarda desenhados com a técnica recomendada abaixo ([`scripts/gerar-ameacas.ts`](../scripts/gerar-ameacas.ts), `npm run gerar-ameacas`; layout em [`src/game/ameacasSprites.ts`](../src/game/ameacasSprites.ts)). Do que está aqui, ficaram para depois: a faixa de aviso laranja no trilho do Drone, as lascas de madeira e a poeira nos passos do Guarda.

Pesquisa feita em 24/11/2026, junto com a arte nova do Protagonista. O objetivo é deixar o Drone e o Guarda prontos para desenhar com a mesma técnica, sem decidir de novo o que já foi decidido. Regras de base: [estilo-gameplay.md](estilo-gameplay.md) (paleta, contorno, luz) e [representacao.md](representacao.md).

## Técnica recomendada: pixel art desenhada em código

É a mesma do Protagonista ([`scripts/gerar-protagonista.ts`](../scripts/gerar-protagonista.ts)): cada quadro é um desenho em texto em que cada letra é uma cor de `paleta.hex`. Um script grava a spritesheet PNG e um teste confere o tamanho e as cores.

| | Desenho em código (recomendado) | PixelLab (gerador de IA) |
|---|---|---|
| Paleta | Exata, conferida por teste | Precisa remapear e limpar à mão |
| Tamanho | Qualquer, pixel a pixel no tamanho do jogo (16 px por tile) | Mínimo prático de 48×48; reduzir para 16 px perde o detalhe (foi o problema do sprite antigo do Protagonista) |
| Animação | Quadros derivados por código (deslocar, espelhar, girar) | Tem endpoint de 4 direções e de animação, assíncrono (2–3 min por personagem) |
| Custo e acesso | Nenhum | Conta paga e chave de API |
| Ajuste no playtest | Editar o texto e rodar o script | Gerar de novo |

**Recomendação:** desenhar em código. O PixelLab só vale se alguém da equipe já tiver conta e quiser uma referência de pose. Mesmo assim, o sprite final precisa ser redesenhado em 16 px.

## Drone Desmatador

**O que já existe no jogo:** um placeholder (quadrado vermelho com "D"). O Drone anda num trilho em linha reta (na Fase única, nas colunas 5 e 7). `FaseScene.estadosAmeacas()` já entrega posição e direção.

**Vista:** de cima, como no guia ("o código rotaciona"). Assim um desenho só serve para as 4 direções, e o código gira o sprite para a direção do trilho.

**Forma (16×16, a hélice pode passar 1–2 px do tile):**
- Corpo em X (quadricóptero): miolo de `metal` com contorno `noite`.
- Um "olho" ou sensor de `vermelho máquina` na frente: mostra para onde ele vai.
- Uma serra ou garra embaixo do corpo, aparecendo na frente, para ler como desmatador e não como drone de entrega. Usar `metal` com brilho `luz`.
- 4 hélices nas pontas do X.

**Animação das hélices** (técnica do Pixelblog 48 da SLYNYRD): desenhar uma pá e copiar girando 22,5° por quadro. Quatro quadros a cerca de 0,05 s cada (20 fps) dão a ilusão de giro. Um asset CC0 mostra que 2 quadros também bastam, desde que tocados rápido. Em código: as hélices viram um borrão de 1 px em `névoa` alternando entre "+" e "×".

| Quadros | Uso |
|---|---|
| hélice ×4 (ou ×2) | loop a 20 fps |
| alerta ×1 | sensor aceso (opcional) |

**Vida por código** (o guia pede que a vida venha do código):
- **Sombra no chão:** uma elipse `noite` com alfa de ~0,35, deslocada 3–4 px para baixo. Faz o Drone parecer voar e ajuda a ler a posição exata.
- **Balanço:** sobe e desce 1 px num seno lento.
- **Luz do sensor piscando** em `vermelho máquina`, com halo aditivo pequeno.
- **Faixa de aviso no trilho:** o trilho por onde ele passa brilha fraco em `laranja alerta`, como o trilho da Gosma já brilha.
- **Partículas:** lascas de `madeira` e folhas quando passa sobre mato (usa a textura `fx-folha` que já existe).

**Estimativa:** 1–2 h (desenho, script, integração em `sincronizarAmeacas`).

## Guarda Florestal

**O que já existe no jogo:** um placeholder (quadrado azul com "R") e uma marca branca provisória de "para onde olha". O Guarda anda numa linha e para 1,5 s na ponta esquerda. `estadosAmeacas()` entrega posição, direção e `pausada`.

**Vista:** 3/4, como o Protagonista. Usar quadros de 24×24 com a mesma origem ([`protagonistaSprites.ts`](../src/game/protagonistaSprites.ts)), para os dois terem a mesma escala.

**Representação:** ele é agente da empresa e se reconhece pelo que faz e veste (uniforme, capacete, lanterna, prancheta ou rádio). Sem caricatura étnica e sem logo real (ver "Evitar" em [representacao.md](representacao.md)). Tom de pele: qualquer um dos três da paleta.

**Forma:**
- Uniforme `azul uniforme` com sombra `noite`.
- Capacete ou boné `metal`.
- Detalhes em `amarelo sinal` (faixa refletiva, crachá).
- Lanterna na mão.
- A silhueta precisa ser diferente da do Protagonista: ombros mais largos, sem cabelo comprido, cabeça menor.

**Animação** (Pixelblog 22 e 55 da SLYNYRD; tutoriais de caminhada em 4 quadros):
- **Andar ×4 por direção:** contato, passagem, contato e passagem espelhada. Frente e costas podem reaproveitar o balanço dos braços espelhando. O lado esquerdo é o direito espelhado, como no Protagonista. Isso dá 3 linhas de desenho.
- **Parado ×2:** na pausa da ponta, olha a prancheta ou fala no rádio (2 quadros alternando devagar). Mostra que a pausa é parte do ciclo, que o jogador pode aproveitar.

| Linha | Quadros |
|---|---|
| frente, costas, lado | andar ×4 · parado ×2 |

**Vida por código:**
- **Cone da lanterna** na direção em que olha: aditivo, `amarelo sinal` com alfa baixo, 2–3 tiles. Substitui a marca branca provisória (`olharGuarda`) e indica perigo sem texto.
- **Na pausa,** o cone varre devagar de um lado para o outro.
- **Poeira nos passos** (a mesma `emissorPoeira` do Protagonista, com 1–2 partículas).

**Estimativa:** 3–4 h (desenho das 3 direções, script, integração e troca da marca de olhar pelo cone).

## Ordem sugerida

1. **Drone primeiro:** é um desenho só, girado por código. Aparece duas vezes na Fase.
2. **Guarda depois:** são 3 direções, e ele só aparece no clímax.

Os dois entram na issue #25 (Ameaças, espinhos, Totem, Saída e Prova no mapa).

## Fontes

- [SLYNYRD, Pixelblog 48: Military Shmup](https://www.slynyrd.com/blog/2024/1/23/pixelblog-48-military-shmup): hélice girando de 22,5° em 22,5°, 4 quadros a 0,05 s.
- [OpenGameArt, Pixel Art Drone (CC0)](https://opengameart.org/content/pixel-art-drone): hélice de 2 quadros tocada rápido.
- [SLYNYRD, Pixelblog 22: Top Down Character Sprites](https://www.slynyrd.com/blog/2019/10/21/pixelblog-22-top-down-character-sprites): 4 direções e caminhada de 4 quadros reaproveitando poses.
- [SLYNYRD, Pixelblog 55: Top Down Character Animation](https://slynyrd.com/blog/2025/3/24/pixelblog-55-top-down-character-animation).
- [Thomas Palef, How to make a run cycle in pixel art](https://medium.com/@thomaspalef/how-to-make-a-run-cycle-in-pixel-art-e72fb9c0b812).
- [PixelLab API](https://www.pixellab.ai/pixellab-api): endpoint de personagem em 4 direções e animação.
- [Phaser, Animations](https://docs.phaser.io/phaser/concepts/animations) e [FX Glow](https://docs.phaser.io/api-documentation/3.90.0/class/fx-glow). Todo FX do Phaser é só WebGL; por isso as luzes do jogo usam imagem aditiva, que funciona também em Canvas.
