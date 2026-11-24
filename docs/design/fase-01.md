# Fase 1: Floresta Contaminada (Fase única)

Arquivo: [`public/fases/fase-01.txt`](../../public/fases/fase-01.txt), a única Fase de `content/fases.json`.

O escopo foi reduzido em 23/11/2026 (ADR 0007): em vez de 4 Fases curtas, o protótipo tem **uma Fase maior**. Ela apresenta os perigos um de cada vez e depois os combina.

## Números

| | |
|---|---|
| Tamanho | 15 × 71 (R14: 60–100 linhas) |
| Rota mínima | 26 deslizes (solver estático) |
| Perigos | 4 espinhos · 2 Gosmas · 2 Drones · 1 Guarda |
| Totens | 4 (antes de cada trecho difícil) |
| Provas | 1 nos espinhos · 2 logo depois do Drone · 3 no clímax |
| Habitante | 1, num Desvio no trecho da Gosma |
| Saída vista cedo (R05) | no 3º deslize, de (11,63) |

## A ideia

Subir pela floresta, um perigo de cada vez, e voltar pelo poço. O jogador começa embaixo e logo vê a **Saída apagada** à direita. Ela só é alcançada no fim: do topo, um corredor leva à coluna 13, um poço que desce direto até a Saída (é um Deslize às cegas longo, mas termina na Saída, que é segura: R13).

## Trecho por trecho (de baixo para cima)

Coordenadas como `(coluna, linha)`; a linha 0 é o topo.

| Linhas | Trecho | O que pede | Elementos |
|---|---|---|---|
| 63–69 | **Início** | Aprender a deslizar | Rastro de Almas; a Saída aparece no 3º deslize |
| 47–62 | **Espinhos** | Atravessar espinhos deslizando é seguro | **Prova 1** (1,54); 2 espinhos em (4,50) e (8,50); Totem (11,48) |
| 34–46 | **Gosma** | Atravessar o trilho lento na hora certa | Gosma G2 em volta das linhas 39–40; Desvio do **Habitante** (11,36) |
| 20–33 | **Drone** | Cruzar o trilho rápido | Drone D2 na coluna 7; **Prova 2** (3,27) logo depois dele; Totem (11,30) |
| 8–19 | **Combinação** | Drone e Gosma em sequência, depois espinhos | Drone D1 na coluna 5, Gosma G1 nas linhas 12–13, espinhos na linha 10; Totem (11,15) |
| 1–7 | **Clímax** | Passar pelo Guarda, que para 1,5 s na ponta esquerda | Totem (10,7); Guarda na linha 5; **Prova 3** (6,3); corredor do topo e poço até a Saída |

## Mapa

```
  0 ###############
  1 #.o.o.o.o.o.o.#   ← topo: vai até o poço (coluna 13)
  2 #.###########.#
  3 #.o.o.3.o.o.#.#   ← Prova 3
  4 ###########.#.#
  5 ###R........#.#   ← Guarda (pausa de 1,5 s à esquerda)
  6 ###########.#.#
  7 #..^.o.o.oT.#.#   ← Totem
  8 #.###########.#
  9 #.###########.#
 10 #.o.^.o.^.o.#.#   ← espinhos
 11 ###########.#.#
 12 #####G......#.#   ← Gosma G1
 13 #####.......#.#
 14 ###########.#.#
 15 ###########T#.#   ← Totem
 16 #.o.o.o.o.o.#.#   ← cruza o Drone D1 (coluna 5)
 17 #.###.#######.#
 18 #.###.#######.#
 19 #.###D#######.#
 20 #.###########.#
 21 #.###########.#
 22 #.#####D#####.#   ← Drone D2 (coluna 7)
 23 #.#####.#####.#
 24 #.#####.#####.#
 25 #.#####.#####.#
 26 #.#####.#####.#
 27 #.o2.o.o.o.o#.#   ← Prova 2, logo depois do Drone
 28 #######.###.#.#
 29 #######.###o#.#
 30 #######.###T#.#   ← Totem
 31 #######.###.#.#
 32 #######.###.#.#
 33 #.o.o.o...o.#.#
 34 #.###########.#
 35 #.###########.#
 36 #.o.o.o.o.oH#.#   ← Habitante (Desvio)
 37 ######.######.#
 38 ######.######.#
 39 ##G........##.#   ← Gosma G2
 40 ##.........##.#
 41 ######.######.#
 42 ######.######.#
 43 ######o######.#
 44 ######.######.#
 45 ######.######.#
 46 ######.o.o.o#.#
 47 ###########.#.#
 48 ###########T#.#   ← Totem
 49 ###########.#.#
 50 #.o.^.o.^.o.#.#   ← primeiros espinhos
 51 #.###########.#
 52 #.###########.#
 53 #.###########.#
 54 #1###########.#   ← Prova 1
 55 #.###########.#
 56 #.###########.#
 57 #.o.o.o.o.o.#.#
 58 ###########.#.#
 59 ###########o#.#
 60 ###########.#.#
 61 ###########.#.#
 62 ###########.#.#
 63 ######.o.o.o#.#   ← daqui se vê a Saída
 64 ######.######.#
 65 ######o######X#   ← Saída (apagada até a 3ª Prova)
 66 ######.########
 67 ######o########
 68 ######.########
 69 #@.o.o.########   ← Início
 70 ###############
```

## Visual: estilo limpo

Decidido junto com a Fase (ADR 0007). O objetivo é ler o caminho num relance:

- **Trilha mínima:** chão liso e claro, de uma cor só, sem textura.
- **Mata como massa escura e lisa:** sem casas, ruínas nem arbustos; só copas de árvore em tons próximos do fundo, e só no miolo da mata (nunca encostadas na trilha).
- **Borda nítida:** linha clara de 1 px exatamente onde a trilha acaba, aro escuro do lado da mata e sombra curta para dentro da trilha. O fim de cada corredor fica óbvio.
- **Cor forte só no que importa:** Provas, Totens, Almas, espinhos e Ameaças. O trilho de cada Ameaça fica marcado de leve no chão.

Referências (princípios, não visual copiado): faixa de brilho própria para o chão andável ([GamineAI](https://gamineai.com/blog/stylized-foliage-readability-top-down-games-color-script-rules-hold-up-motion-2026)); fundo calmo e contraste reservado para o que interage ([bugnet](https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly)); bordas alinhadas com o chão ([PixelJoint](https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=22310)); poucas escolhas por parada ([Blendo Games](https://blendogames.com/news/post/2026-06-xx-leveldesign_readability/)).

## Checklist de boas práticas

- [x] Cada perigo aparece primeiro sozinho, com Parada segura antes para observar o ciclo
- [x] Combinação só depois de todos os perigos apresentados
- [x] Totem antes de cada trecho difícil
- [x] Nenhuma Parada da rota sobre trilho ou espinho (R12; testado)
- [x] Existe uma janela segura em todo cruzamento (testado jogando a rota com as Ameaças ligadas)
- [x] Desvio do Habitante com risco visível; Almas nos corredores
- [ ] Tempo de uma jogada limpa entre 1 e 2 min: **cronometrar no playtest**

## Pontos para o playtest

- **Formato repetido:** o traçado é um zigue-zague parecido em cada trecho; se cansar, abrir um salão por trecho.
- **Poço final:** 64 tiles (cerca de 1,4 s). Se parecer abrupto, intercalar 1 ou 2 Paradas.
- **Prova 2 na rota:** fica logo depois do Drone (risco e recompensa), não num Desvio.

## Como mexer

1. Edite `public/fases/fase-01.txt` (legenda em [`legenda-fases.md`](legenda-fases.md); Alma = `o`).
2. Rode `npm run validar-fase`: a Fase precisa ser válida e sem avisos.
3. Rode `npm test`: há testes que jogam a rota inteira com espinhos e Ameaças ligados.
4. Jogue no navegador (`npm run dev`).
