# Fase 1 — proposta de teste

Arquivo: [`public/fases/fase-01.txt`](../../public/fases/fase-01.txt) (ligado como "Fase 1" em `content/fases.json`).

> **Proposta, não Fase final.** Pelas decisões de design, as Fases são desenhadas pela equipe. Esta foi desenhada a pedido, para testar na prática as regras novas (câmera de ~9 colunas, Almas, Desvios, R13, R14) e servir de ponto de partida: joguem, risquem no papel e mudem à vontade.

**Tema da Fase 1:** paredes e espinhos (sem Ameaças), como no plano das 4 Fases.

## Números

| | |
|---|---|
| Tamanho | 15 × 60 (R14: 60–100 linhas) |
| Rota mínima | 25 deslizes, sem mortes (testado no núcleo com os espinhos ligados) |
| Almas | 69 (todas alcançáveis; a Marca de todas as Almas é possível) |
| Totens | 3 · Espinhos: 8 · Habitante: 1 (num Desvio) |
| Saída vista cedo (R05) | no 2º deslize, de (11,53) |
| Deslizes às cegas na rota (R13) | todos terminam em Parada segura e não cruzam espinhos fora da tela |

## A ideia: subir e voltar pelo poço

O jogador começa embaixo e, no segundo deslize, já vê a **Saída apagada** num nicho à direita. Ela só é alcançada no fim: no topo, um corredor leva à coluna 13, um **poço de 49 tiles** que desce direto até a Saída. É o único Deslize às cegas longo da Fase, e de propósito: termina com segurança na Saída (R13), fecha o ciclo "vi a Saída no começo, volto até ela" e é um final rápido e satisfatório, típico do gênero.

## Trecho por trecho (de baixo para cima)

Linhas e colunas como `(coluna, linha)`; a linha 0 é o topo.

| Linhas | Trecho | O que ensina ou pede | Elementos |
|---|---|---|---|
| 49–58 | **Início** | Deslizar e seguir o rastro de Almas; ver a Saída | Corredor de Almas; Saída vista de (11,53); becos curtos com Almas |
| 44–48 | **Primeiros espinhos** | Atravessar espinhos deslizando é seguro | Dois espinhos no corredor que leva à **Prova 1** (na Parada (7,45)) |
| 38–43 | **Totem e Desvio da Prova 2** | Explorar compensa | **Totem** (7,43); Desvio curto para baixo com a **Prova 2** (11,42), que volta à subida |
| 33–37 | **Lição: parar em cima mata** | Parar sobre o espinho e sair logo | **Totem** (11,36) antes; Parada sobre o espinho (7,33) visível de onde o deslize parte; fuga para cima |
| 28–32 | **Desvio do Habitante** | Risco e recompensa visíveis na entrada | **Habitante** (11,30) num bolsão cujo fundo é um espinho (11,31): pega-se o Habitante, para-se no espinho e sobe-se rápido |
| 13–27 | **Bifurcação** | Escolher caminho | Esquerda: bolsão de Almas (coluna 1) e corredor com espinhos; direita: subida rápida. As duas se juntam |
| 1–12 | **Clímax** | Juntar o que aprendeu, sob pressão | **Totem** (11,10) antes; parar no espinho (7,6), subir e parar no espinho (7,3), fugir para a direita pegando a **Prova 3** (9,3), que abre numa Parada segura |
| 1 e coluna 13 | **Final** | Recompensa | Corredor do topo até o poço e descida até a Saída |

## Mapa

```
  0 ###############
  1 #.o.o.o.o.o.o.#   ← corredor do topo; a coluna 13 é o poço
  2 ###########.#.#
  3 #.o.o.o^o3o.#.#   ← clímax: 2º espinho e Prova 3
  4 #######o#####.#
  5 #######.#####.#
  6 #######^o.o.#.#   ← clímax: 1º espinho
  7 ###########.#.#
  8 ###########o#.#
  9 ###########.#.#
 10 ###########T#.#   ← Totem 3
 11 ###########.#.#
 12 #.o^.^.o..o.#.#   ← bifurcação (lado esquerdo) volta aqui
 13 #.#########.#.#
 14 #o#########o#.#
 15 #.#########.#.#
 16 #o#########o#.#
 17 #.#########.#.#
 18 #.o.o...o.o.#.#   ← bifurcação: esquerda ou direita
 19 #o####o######.#
 20 #o####.######.#   ← bolsão de Almas (coluna 1)
 21 #o####o######.#
 22 #o####.######.#
 23 ######.o.o..#.#
 24 ###########o#.#
 25 ###########.#.#
 26 ###########o#.#
 27 ###########.#.#
 28 #.o.o...o.o.#.#
 29 #######o###.#.#
 30 #######.###H#.#   ← Desvio do Habitante
 31 #######o###^#.#
 32 #######.#####.#
 33 #######^o.o.#.#   ← lição: parar em cima mata
 34 ###########.#.#
 35 ###########o#.#
 36 ###########T#.#   ← Totem 2
 37 ###########o#.#
 38 ###########.#.#
 39 #.o.o...o.o.#.#
 40 #######o###o#.#
 41 #######.###.#.#
 42 #######o###2#.#   ← Desvio da Prova 2
 43 #######T###.#.#   ← Totem 1
 44 #######.#####.#
 45 #######1^^o.#.#   ← primeiros espinhos e Prova 1
 46 ###########.#.#
 47 ###########o#.#
 48 ###########.#.#
 49 #.o.o...o.o.#.#
 50 ######.######X#   ← Saída (apagada até a 3ª Prova)
 51 ######o########
 52 ######.########
 53 ######.o.o.o###   ← daqui se vê a Saída
 54 ###########.###
 55 ###########o###
 56 ###########.###
 57 ###########o###
 58 #@.o.o.o.o..###   ← Início
 59 ###############
```

## Checklist de boas práticas

- [x] Cada elemento novo aparece primeiro num lugar seguro (espinhos: primeiro atravessar; depois parar, com Totem antes)
- [x] De todo ponto de parada há uma pista de para onde ir (rastro de Almas)
- [x] 2 a 3 Desvios que voltam à Rota crítica (Prova 2, Habitante, bolsão de Almas) — R14
- [x] Risco e recompensa visíveis antes de entrar no Desvio do Habitante
- [x] Nenhum beco vazio (todo beco tem Almas)
- [x] Totem antes de cada trecho difícil
- [x] Deslizes curtos; todo Deslize às cegas termina numa Parada segura — R13
- [ ] Tempo de uma jogada limpa entre 1 e 2 min — **cronometrar no playtest**
- [ ] A Fase lida com a câmera real (o que se vê de cada Parada) — **conferir jogando**

## Pontos para a equipe avaliar no playtest

- **Paredes demais?** A Fase é feita de corredores estreitos (bom para o gênero), mas tem blocos de parede grandes. Com a arte de arbustos, pode parecer densa demais; dá para abrir salões pequenos.
- **Espinho com overlay:** no clímax, a Prova 3 abre numa Parada segura de propósito. Se uma Prova cair numa Parada sobre espinho, o overlay pausa o relógio do espinho e o jogador volta com pouco tempo para reagir.
- **Poço final:** 49 tiles de queda são rápidos (cerca de 1 s). Se parecer abrupto, intercalar 1–2 Paradas no poço.

## Como mexer

1. Edite `public/fases/fase-01.txt` (legenda em [`legenda-fases.md`](legenda-fases.md); Alma = `o`).
2. Rode `npm run validar-fase`: a Fase precisa ser válida e sem avisos.
3. Rode `npm test`: há testes que jogam a rota inteira com os espinhos ligados.
4. Jogue no navegador (`npm run dev`).
