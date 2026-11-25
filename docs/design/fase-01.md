# Fase 1: Floresta Contaminada (Fase única)

Arquivo: [`public/fases/fase-01.txt`](../../public/fases/fase-01.txt), a única Fase de `content/fases.json`. Conteúdo dos Habitantes: `content/habitantes/fase-01/<número>.md` (1, 2, 3 na ordem de leitura do grid).

O escopo foi reduzido em 23/11/2026 (ADR 0007): em vez de 4 Fases curtas, o protótipo tem **uma Fase maior**. Ela apresenta os perigos um de cada vez e depois os combina.

## Fase do Luan (24–25/11/2026)

Em 24/11 o Luan redesenhou a Fase: ela passou de 15 para **69 colunas**, com uma **área nova a leste** (linhas 1–44, colunas 18–45) cheia de Gosmas, Drones, um segundo Guarda e espinhos. O jogo ficou **difícil, punitivo e de reflexo**, e é assim que ele deve ser: o tempo de resposta é curto, morrer faz parte e o fluxo de vida e morte é o que diverte.

Em 25/11 só consertamos o que impedia terminar, sem mudar a proposta:

- **A Saída ficou fechada.** O poço da coluna 14 tinha virado parede das linhas 2 a 34. A **linha 44 foi aberta** (colunas 15–33) e liga a sala da Gosma G4 ao poço. Assim a área leste vira o trecho final antes da Saída.
- **6 Almas na coluna 33 (linhas 35–40) não tinham como ser pegas.** Abrimos **(38,33)**, uma parada (subindo de (38,34)) que leva até a coluna 33.
- **Habitantes:** a Fase agora tem **3**. O do Luan fica no corredor 28. Os 2 novos ficam no Desvio oeste (11,36) e no alto da área leste (34,7).

## Números

| | |
|---|---|
| Tamanho | 69 × 71 (área jogável até a coluna 45; R14: 60–100 linhas) |
| Rota mínima | 64 deslizes (solver estático) |
| Perigos | 27 espinhos · 4 Gosmas · 3 Drones · 2 Guardas |
| Totens | 5 · Almas: 108 |
| Provas | 1 (8,52) · 2 (10,22) · 3 (11,3), todas no lado oeste |
| Habitantes | 3: (34,7) Menino do igarapé · (11,36) Avó que cuida da roça · (28,38) Agente de saúde |
| Jogada limpa | ~18,5 s de jogo, se o jogador acertar todos os tempos (busca do teste) |

## A ideia

O jogador sobe pelo lado oeste, um perigo de cada vez, e pega as 3 Provas. No topo, atravessa para a área leste e desce por ela: Gosma no alto, Drone na linha 12, espinhos, a sala do Guarda R2, as Almas da coluna 33 e a sala da Gosma G4. A linha 44 o leva de volta ao poço, que desce até a Saída.

### Fase de reflexo (a R12 não vale aqui)

A rota **para de propósito** em cima de espinhos e de trilhos de Ameaça: 23 das 64 paradas. Os espinhos ficam na ponta dos corredores, onde o jogador bate. Como o espinho só sobe 0,5 s depois de pisado, quem sai logo escapa. As salas da Gosma têm o trilho em volta inteira. Na faixa do Guarda R1 (linha 5), a janela segura é de cerca de **0,17 s**, quando ele encosta na ponta direita. Com o Guarda a 5 tiles/s ela era de 0,11 s; em 25/11 ele passou para 4 tiles/s porque estava rápido demais.

O que os testes garantem não é que a Fase seja fácil. É que ela **dá para terminar sem morrer** com o tempo certo: uma busca segue a rota mínima, tenta cada momento de partida e volta atrás quando trava (`src/core/solver.test.ts`).

## Mapa (colunas 0–45; o resto é mata)

```
  0 ##############################################
  1 ##To.o.o.o.o.o.......#........################   ← topo: segue para a área leste (linhas 1–3, colunas 18–29)
  2 ##.###############..G.........################
  3 ##.o.o.o.o.3^#####^...........################
  4 ####.#############.###########################
  5 ####R........#####.###########################   ← Guarda R1 (pausa de 1,5 s à esquerda): janela de ~0,17 s
  6 ###########.######......ooooooooooo###########
  7 ##..^.o.o.oT######.......#########H###########   ← Habitante 1 (34,7), alto da área leste
  8 ##.######################^.........###########
  9 ##.######################^........^###########
 10 ##.o..^o...o^############.####################
 11 ######.##################.####################
 12 ######G......#######..........D###############
 13 ######.......############.####################
 14 ############.############^....^###############
 15 ############T#################.###############
 16 ##.o.o.o.o.o.############o^...^......#########
 17 ##.###.#############################o........#
 18 ##.###.####################^########o........#
 19 ##.###D####################o########o........#
 20 ##.########################o########o........#
 21 ##.########################o########o........#
 22 ##.o.o.o^.2^###############^ooooooooo........#   ← Prova 2 (10,22)
 23 ########.###################################o#
 24 ########.###################################o#
 25 ########.###################################o#
 26 ########.###################################o#
 27 ##D.....o....###############################o#
 28 ########.############################....ooo^#
 29 ########.########################.....########
 30 ########.########################.....########
 31 ########.########################.....R#######   ← Guarda R2 na sala das colunas 33–37
 32 ########.########################.....########
 33 ##^o.o.oT########################......#######   ← (38,33) aberta: parada que leva às Almas da coluna 33
 34 ##.#########################^....o.....#######
 35 ##.###########.#############.####o############
 36 ##.o.o.o.o.H^#.#############.####o############   ← Habitante 2 (11,36), Desvio oeste
 37 ###.##########.#############.####o############
 38 ###.##########.#############H####o############   ← Habitante 3 (28,38), Desvio do corredor 28
 39 ###G........##.#############^####o############   ← Gosma G3: toda a sala é trilho
 40 ###.........##.#############.####o..........##
 41 ###########.##.###################...G......##
 42 ###########.##.###################..........##
 43 ###########o##.###################..........##
 44 ###########.##..............................##   ← linha 44 aberta: sala da Gosma G4 → poço da Saída
 45 ###########o##.###############################
 46 ###########..#.###############################
 47 ############.#.###############################
 48 ############.#.###############################
 49 ############.#.###############################
 50 ##To.^.o.^.o.#.###############################
 51 ##.###########.###############################
 52 ##^.o.o.1.o^##.###############################   ← Prova 1 (8,52)
 53 ###########.##.###############################
 54 ##^.o.o.o.o^##.###############################
 55 ##.###########.###############################
 56 ##.###########.###############################
 57 ##.o.o.o.o.o.#.###############################
 58 ############.#.###############################
 59 ############o#.###############################
 60 ############.#.###############################
 61 ############.#.###############################
 62 ############.#.###############################
 63 #######.o.o.o#.###############################
 64 #######.######.###############################
 65 #######o######X###############################   ← Saída (14,65)
 66 #######.######################################
 67 #######o######################################
 68 #######.o.o.o.################################
 69 ##@o.o.o.o.o.o################################   ← Início (2,69)
 70 ##############################################
```

## Visual: floresta legível

Revisto em 24/11/2026 (ADR 0007). O estilo "limpo" (trilha lisa e mata lisa) deixava a Fase sem a ambientação da floresta, então os sprites voltaram: árvores, ruínas e casas da aldeia abandonada, arbustos, cogumelos azuis que brilham e vagalumes. Para o caminho continuar fácil de ler, vale esta regra:

- **Beira da trilha** (parede com chão em alguma das 8 vizinhas): só **grama escura, arbustos e árvores**, mais os cogumelos e flores. Nada com o tom rosado da trilha encosta nela.
- **Miolo da mata:** ruínas, casas, troncos, tocos e pedras, **escurecidos** (`TINTA_CONSTRUCAO`), para a trilha ser o chão mais claro da tela.
- **Cor forte só no que importa:** Provas, Totens, Almas, espinhos e Ameaças. O trilho de cada Ameaça fica marcado de leve no chão.

O problema que levou à regra: a equipe apontou peças de ruína, tocos e pedras, rosadas como a trilha, encostadas no caminho (por exemplo, na coluna estreita entre a trilha e o poço). Elas pareciam caminho onde não era.

Referências (princípios, não visual copiado): faixa de brilho própria para o chão andável ([GamineAI](https://gamineai.com/blog/stylized-foliage-readability-top-down-games-color-script-rules-hold-up-motion-2026)); fundo calmo e contraste reservado para o que interage ([bugnet](https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly)); bordas alinhadas com o chão ([PixelJoint](https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=22310)); poucas escolhas por parada ([Blendo Games](https://blendogames.com/news/post/2026-06-xx-leveldesign_readability/)).

## Checklist de boas práticas

- [x] Cada perigo aparece primeiro sozinho, com Parada segura antes para observar o ciclo
- [x] Combinação só depois de todos os perigos apresentados
- [x] Totem antes de cada trecho difícil
- [ ] ~~Nenhuma Parada da rota sobre trilho ou espinho (R12)~~: **não vale na Fase de reflexo** (ver acima)
- [x] Dá para terminar sem morrer, com o tempo certo (testado: busca que volta atrás em cada parada)
- [x] Saída, todas as Almas e os 3 Habitantes alcançáveis (solver, sem avisos)
- [x] Habitantes em Desvios, com risco visível
- [ ] Tempo de uma jogada limpa entre 1 e 2 min: **cronometrar no playtest**

## Pontos para o playtest

- **Janela do Guarda R1 (linha 5):** ~0,17 s. Medir quantas mortes custa no playtest; se for frustrante demais, a pausa dele na ponta direita alarga a janela.
- **Linha 44:** um deslize de 19 tiles até o poço. Confere se fica bem, ou se uma parada no meio ajuda.
- **Três Habitantes:** cada um num lugar diferente. Medir se os jogadores acham os três.

## Como mexer

1. Edite `public/fases/fase-01.txt` (legenda em [`legenda-fases.md`](legenda-fases.md); Alma = `o`).
2. Rode `npm run validar-fase`: a Fase precisa ser válida e sem avisos.
3. Rode `npm test`: um teste confere que a Fase dá para terminar sem morrer, com espinhos e Ameaças ligados.
4. Jogue no navegador (`npm run dev`).
