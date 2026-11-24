# Re(volta) — Legenda e Regras de Desenho de Fases

> **Documento oficial** do protótipo (Vertical Slice — Mapa 1: *Floresta Contaminada*, Fase única desde 23/11/2026, ADR 0007).
> Usado por duas pontas do pipeline: **(a)** a equipe, que desenha as Fases à mão em papel quadriculado; **(b)** a IA de visão, que transcreve a foto do papel para o `.txt` (ASCII) consumido pelo parser TypeScript e pelo *solver* estático.
> Em caso de divergência com o conceito geral do jogo, **as regras do protótipo valem**: sem XP, sem facho de lanterna no Guarda, sem perseguição, sem inimigos dos Mapas 2 e 3.

**Parâmetros ajustáveis** (valores propostos; não vieram do briefing e devem ser confirmados):

| Parâmetro | Valor | Onde é usado |
|---|---|---|
| `VEL_PROTAGONISTA` | 15 tiles/s | Seção 4 (validação de tempo) |
| `RAIO_VISAO` | 7 linhas (câmera mostra pelo menos 7 linhas acima e 7 abaixo do Protagonista) | Regras R05, R06 e R13 |
| `RAIO_VISAO_H` | 4 colunas (câmera mostra cerca de 9 colunas: 4 de cada lado do Protagonista; ADR 0006) | Regras R06 e R13 |
| `DESLIZES_INICIAIS` | 3 | Regra R05 |
| Velocidade de referência do Guarda | 5 tiles/s | Seção 2 |

---

## 1. Legenda de Símbolos (Papel e ASCII)

### 1.1 Tabela dos 14 elementos

O alfabeto do `.txt` é **fechado**: apenas os 14 caracteres abaixo são válidos. Qualquer outro caractere é erro de parser.

| # | Elemento | No papel quadriculado | ASCII |
|---|---|---|---|
| 1 | Parede (bloqueia e para o deslize) | Célula **inteira preenchida** a caneta/lápis (preto ou hachura densa) | `#` |
| 2 | Chão (espaço livre) | Célula **em branco** | `.` |
| 3 | Início / Spawn do Protagonista (1 por Fase) | `@` grande, centralizado | `@` |
| 4 | Saída (1 por Fase; começa apagada, acende ao coletar a 3ª Prova) | `X` grande, centralizado | `X` |
| 5 | Totem (checkpoint) | `T` maiúsculo | `T` |
| 6 | Prova 1 — *O Passado* | Dígito `1` com base (traço embaixo) | `1` |
| 7 | Prova 2 — *A Transformação* | Dígito `2` | `2` |
| 8 | Prova 3 — *Os Responsáveis* | Dígito `3` | `3` |
| 9 | Habitante (1 por Fase, opcional de coletar) | `H` maiúsculo | `H` |
| 10 | Espinhos temporários / *Estacas da empresa* (sobem 0,5 s após a passagem, ativos por 1,5 s) | Triângulo pequeno `^` | `^` |
| 11 | Gosma Tóxica (posição inicial) | `G` **dentro de um círculo** | `G` |
| 12 | Drone Desmatador (posição inicial) | `D` **dentro de um círculo** | `D` |
| 13 | Guarda Florestal (posição inicial) | `R` **dentro de um círculo** (R de *Ronda*; o `G` já é da Gosma) | `R` |
| 14 | Alma da floresta (colecionável opcional, várias por Fase; pega ao deslizar por cima) | **Bolinha cheia** (pequeno círculo pintado), no centro da célula | `o` |

Por que estes caracteres: não há `I`, `l`, `O`, `0`, `S`, `5`, `Z`, `B`, `8` nem `7` no alfabeto, então `1` e `2` não têm par ambíguo. As Ameaças ganham círculo no papel para a IA nunca confundi-las com elementos fixos (`G`/`6`, `D`/`0`, `R`/`P`).

### 1.2 Regras de preenchimento do papel

- **Uma célula = um símbolo.** Nunca dois elementos na mesma célula.
- Escreva em **letra de forma maiúscula**, sem floreios, ocupando menos de 80% da célula.
- Parede = célula totalmente preenchida. Chão = célula vazia (não use pontos nem traços).
- A posição inicial de cada Ameaça é a célula do círculo; ao lado dele escreva o ID em letra pequena (ex.: `G1`).
- Ameaças com mesma letra são numeradas na **ordem de leitura** (de cima para baixo, da esquerda para a direita): `G1`, `G2`, …

### 1.3 Coordenadas e numeração da folha

- Coluna `c` de `0` a `14`, da esquerda para a direita. Linha `r` a partir de `0`, **de cima para baixo**. Origem `(0,0)` = canto superior esquerdo.
- Escreva `0`…`14` acima da primeira linha e o número de **cada linha** na margem esquerda.
- No `.txt`, coordenadas são sempre `c,r` (sem espaço): `9,4` = coluna 9, linha 4.
- Fase que não cabe numa folha: divida em faixas horizontais consecutivas, mantendo a numeração contínua das linhas, e repita a última linha de uma faixa como primeira da seguinte (marcada "sobreposição"). A IA descarta a linha duplicada.

### 1.4 Protocolo para a IA de transcrição

- Transcreva **somente** os 13 caracteres da legenda, uma linha do papel por linha do `.txt`, exatamente 15 caracteres por linha.
- Célula ilegível ou ambígua: escreva `?` no rascunho e liste as coordenadas ao final. **Nunca adivinhe.** O parser rejeita `?`.
- Célula com dois símbolos, símbolo fora da legenda ou círculo sem letra: reporte como conflito, não resolva sozinha.
- Transcreva também o quadro de Ameaças (Seção 2) e confira que cada rota começa na célula do respectivo círculo.
- Depois de transcrever, rode as verificações da Seção 3.

---

## 2. Notação das Rotas das Ameaças (ADR 0003)

### 2.1 Princípios

- Todas as Ameaças são **tempo real determinístico**: trilho e ritmo fixos, sem aleatoriedade e sem perseguição.
- Ao morrer, **todas reiniciam o ciclo do zero** (cada Ameaça volta ao vértice `v1` na fase 0 do ciclo).
- O trilho é uma **polilinha de segmentos horizontais ou verticais** ligando *vértices* `v1, v2, …, vn`. `v1` é sempre a célula do símbolo da Ameaça no grid.

### 2.2 Perfil de cada tipo

| Tipo | Símbolo | Ciclo permitido | Vértices | Velocidade de referência | Pausas |
|---|---|---|---|---|---|
| Gosma Tóxica | `G` | somente `loop` | 4 ou mais | 3 tiles/s | não |
| Drone Desmatador | `D` | somente `vai-e-volta` | exatamente 2, na mesma linha ou na mesma coluna (linha reta) | 10 tiles/s | não |
| Guarda Florestal | `R` | `loop` ou `vai-e-volta` | 2 ou mais | 5 tiles/s (valor a confirmar) | sim, em vértices marcados |

A velocidade é declarada em cada Ameaça ou, com `-`, herdada da referência do tipo (definida em `src/core/config.ts`, `velocidadeReferenciaAmeacaTilesPorSegundo`). O parser aceita qualquer número positivo; o validador emite *aviso* (não erro) se o valor diferir da referência do tipo.

### 2.3 Notação no papel quadriculado

1. Desenhe a rota como linha fina passando pelo **centro das células**, saindo do círculo da Ameaça. Coloque uma **seta** no meio de cada segmento, no sentido do movimento.
2. Marque cada vértice com um ponto e a etiqueta pequena `v1`, `v2`, … na ordem de percurso (`v1` = célula do círculo).
3. `loop`: desenhe também o segmento de fechamento de `vn` de volta a `v1`, com seta. `vai-e-volta`: setas de ida e de volta (ou seta de duas pontas).
4. **Pausa do Guarda:** ao lado do vértice escreva `p=2` (pausa de 2 segundos). Só vértices podem ter pausa.
5. Copie as informações no **quadro de Ameaças**, na margem da folha, uma linha por Ameaça, no mesmo formato do `.txt` (item 2.4):

```
ID | ciclo | vel | rota | pausas
G1 | loop | 3 | 3,8 7,8 7,9 3,9 | -
```

Se desenho e quadro divergirem, a IA reporta conflito (Seção 1.4).

### 2.4 Notação no arquivo `.txt`

Estrutura completa do arquivo:

```
; comentário (linha iniciada por ';', permitido só fora de [GRID])
REVOLTA-FASE v1
LARGURA 15
ALTURA <N>
[GRID]
<N linhas de exatamente 15 caracteres>
[AMEACAS]
<uma linha por Ameaça>
[FIM]
```

Cada linha de `[AMEACAS]` tem **5 campos separados por `|`** (espaços ao redor são ignorados):

```
ID | ciclo | vel | rota | pausas
```

| Campo | Formato | Observação |
|---|---|---|
| `ID` | `[GDR][1-9][0-9]*` | `G1`, `D1`, `R2`… Letra = tipo; número pela ordem de leitura do símbolo no grid |
| `ciclo` | `loop` ou `vai-e-volta` | |
| `vel` | número `>0`, ponto decimal (`3`, `2.5`), ou `-` | tiles por segundo; `-` usa a velocidade de referência do tipo (config) |
| `rota` | vértices `c,r` separados por **um espaço**, em ordem de percurso | mínimo 2 |
| `pausas` | `-` (nenhuma) ou lista `c,r=seg` separada por espaço (`13,3=2 7,1=0.5`) | `c,r` deve ser um vértice da rota; `seg > 0` |

Para o parser TypeScript: ler linha a linha; ao ver `[GRID]` consumir exatamente `ALTURA` linhas; ao ver `[AMEACAS]` fazer `linha.split('|').map(s => s.trim())` e exigir 5 campos; `rota.split(' ')` e depois `split(',')` para obter `[c, r]`; `pausas` = `'-'` ou `split(' ')` e depois `split('=')`. Linhas em branco são ignoradas fora do `[GRID]`.

### 2.5 Semântica do movimento (contrato para parser e *solver*)

- **Posição inicial:** em `t = 0` (início da Fase ou renascimento) a Ameaça está em `v1`. Se `v1` tiver pausa, ela espera essa pausa antes de partir.
- **Trilho:** células percorridas = todas as células dos segmentos entre vértices consecutivos, incluindo os vértices.
- **`loop`:** `v1 → v2 → … → vn → v1 → …`, sempre no sentido listado. O segmento `vn → v1` também deve ser horizontal ou vertical.
- **`vai-e-volta`:** `v1 → … → vn → … → v1 → …`; a volta reutiliza o mesmo trilho em sentido inverso (não é uma segunda rota).
- **Pausa:** toda vez que a Ameaça **chega** a um vértice com pausa, ela fica parada naquele vértice pelo tempo indicado e depois segue. Em `vai-e-volta`, vale para ida e volta; em `v1`, vale também no início de cada ciclo.
- **Período do ciclo** = (soma dos comprimentos dos segmentos percorridos ÷ velocidade) + soma das pausas.
- Fora dos vértices e das pausas, a velocidade é constante.

### 2.6 Regras de validade das rotas

- [ ] `v1` coincide com a célula do símbolo (`G`, `D` ou `R`) de mesmo ID no grid; o número de símbolos de cada letra é igual ao número de linhas dessa letra.
- [ ] Segmentos consecutivos são horizontais ou verticais e têm comprimento ≥ 1; sem vértices repetidos.
- [ ] O trilho não passa duas vezes pela mesma célula (exceto a volta do `vai-e-volta`).
- [ ] Todas as células do trilho são `.`, exceto `v1`, que é o próprio símbolo da Ameaça (ver R07 na Seção 3).
- [ ] `G` e `D` sempre com `pausas = -`.

---

## 3. Regras de Desenho (Restrições de Level Design)

Checklist exigido do desenhista e do *solver* estático. Cada item é verificável por script.

**Dimensões e estrutura**

- [ ] **R01 — Dimensões:** largura fixa de **15 colunas**; altura entre **40 e 120 linhas**.
- [ ] **R02 — Contorno fechado:** colunas `0` e `14`, primeira e última linha são `#`. As 15 colunas incluem esse contorno (decisão deste documento: evita deslize infinito para fora do mapa).
- [ ] **R03 — Contagens:** exatamente 1 `@`, 1 `X`, 1 `1`, 1 `2`, 1 `3` e 1 `H`; pelo menos 1 `T`.
- [ ] **R04 — Alfabeto:** só os 13 caracteres da Seção 1; nenhum `?`.

**Legibilidade (sem minimapa nem seta; só sinalização diegética)**

- [ ] **R05 — Saída visível cedo:** existe uma célula de parada alcançável do Início em no máximo `DESLIZES_INICIAIS` (3) deslizes (contando o próprio Início como 0) cuja linha difere da linha da `X` em no máximo `RAIO_VISAO` (7) linhas. A rota até a Saída pode ser longa e dobrar-se, mas a Saída precisa ser vista (ou seu brilho) logo cedo.
- [ ] **R06 — Trilho visível antes do cruzamento:** para cada deslize da solução que cruza o trilho de uma Ameaça, a primeira célula de trilho cruzada está a no máximo `RAIO_VISAO` linhas **e** `RAIO_VISAO_H` colunas da **célula de onde o deslize parte**. A câmera mostra só cerca de 9 das 15 colunas (ADR 0006).
- [ ] **R13 — Deslize às cegas termina seguro:** todo deslize cuja Parada fica a mais de `RAIO_VISAO` linhas ou `RAIO_VISAO_H` colunas de onde ele parte termina numa Parada segura: fora de trilho de Ameaça, fora de espinhos, e sem cruzar trilho ou espinhos fora da área visível no caminho. Prefira deslizes curtos; deslizes longos são respiros, não armadilhas.
- [ ] **R14 — Exploração com Desvios:** além da Rota crítica, a Fase tem de 2 a 3 Desvios que voltam a ela; o Habitante fica num Desvio, e Almas recompensam os Desvios. Altura recomendada: 60–100 linhas (o limite de R01 continua 40–120); jogada limpa de 1 a 2 min.

**Ameaças**

- [ ] **R07 — Trilho só sobre chão:** células de trilho são `.` (exceto `v1`). Nenhum trilho passa por `#`, `^`, `@`, `X`, `T`, `1`, `2`, `3` ou `H`. (Restrição deste documento, mais estrita que o briefing, para eliminar ambiguidade; pode ser afrouxada depois.)
- [ ] **R08 — Trilhos não se cruzam:** nenhuma célula pertence a dois trilhos.
- [ ] **R09 — Sem Totem em trilho:** nenhum `T` sobre a rota de uma Ameaça (já garantido por R07).
- [ ] **R10 — Rotas válidas:** todas as regras da Seção 2.6.

**Solução**

- [ ] **R11 — Solução válida:** existe sequência de deslizes (o Protagonista só para ao bater em `#`; atravessa o resto coletando Provas, Habitante, Totens e Saída) que coleta `1`, `2` e `3` e depois atravessa `X`. Verificação estática: busca em largura sobre (célula de parada, Provas coletadas), **ignorando** o tempo das Ameaças.
- [ ] **R12 — Solução segura no tempo:** para cada cruzamento de trilho existe uma janela de partida em que o Protagonista não colide com a Ameaça (o Protagonista pode esperar em qualquer célula de parada fora de trilhos). Nenhuma parada obrigatória sobre `^` nem sobre célula de trilho.

**Recomendações (não bloqueiam)**

- Deixe pelo menos 1 célula livre entre células de parada e trilhos.
- Prefira cruzar o trilho perto de uma extremidade ou de uma pausa do Guarda, onde a janela segura é maior.

---

## 4. Fase de Exemplo (Mini-Mapa)

Demonstração: **15 colunas × 16 linhas** (a altura é reduzida só para exemplo; R01 vale para as Fases reais). Usa os 13 elementos e as 3 Ameaças.

### 4.1 Arquivo `.txt`

```
; fase de exemplo - Re(volta) - legenda-fases
REVOLTA-FASE v1
LARGURA 15
ALTURA 16
[GRID]
###############
#.............#
#.............#
#.........R...#
#....#...D.3..#
#...........#.#
#X............#
#....H........#
#..G..........#
#.............#
#............##
#...#......2..#
#............T#
#.............#
#@....1...^...#
###############
[AMEACAS]
G1 | loop | 3 | 3,8 7,8 7,9 3,9 | -
D1 | vai-e-volta | 10 | 9,4 9,12 | -
R1 | vai-e-volta | 5 | 10,3 13,3 | 13,3=2
[FIM]
```

Visão com régua (não faz parte do arquivo):

```
     000000000011111
     012345678901234
r00  ###############
r01  #.............#
r02  #.............#
r03  #.........R...#
r04  #....#...D.3..#
r05  #...........#.#
r06  #X............#
r07  #....H........#
r08  #..G..........#
r09  #.............#
r10  #............##
r11  #...#......2..#
r12  #............T#
r13  #.............#
r14  #@....1...^...#
r15  ###############
```

### 4.2 Elementos e Ameaças

| Elemento | Posição `c,r` |
|---|---|
| `@` Início | 1,14 |
| `X` Saída | 1,6 |
| `T` Totem | 13,12 |
| `1`, `2`, `3` Provas | 6,14 · 11,11 · 11,4 |
| `H` Habitante | 5,7 |
| `^` Espinhos | 10,14 |
| `#` interno (pontos de parada) | 13,10 · 4,11 · 5,4 · 12,5 |

| ID | Trilho (células) | Ciclo | Velocidade | Pausas | Período |
|---|---|---|---|---|---|
| G1 Gosma | retângulo: linha 8 e linha 9, colunas 3 a 7 | `loop` (3,8 → 7,8 → 7,9 → 3,9) | 3 tiles/s | — | 3,33 s |
| D1 Drone | coluna 9, linhas 4 a 12 | `vai-e-volta` | 10 tiles/s | — | 1,6 s |
| R1 Guarda | linha 3, colunas 10 a 13 | `vai-e-volta` | 5 tiles/s | 2 s em 13,3 | 3,2 s (0,6 ida + 2 pausa + 0,6 volta) |

### 4.3 Rota de solução (8 deslizes)

A busca em largura confirma que a menor solução tem **8 deslizes** e é esta:

1. `1,14` → **direita** → `13,14`. Coleta Prova 1 em `6,14`. Atravessa os espinhos em `10,14` (sobem 0,5 s depois; o Protagonista já está 3 células adiante e não volta). Para no contorno (`14,14`).
2. `13,14` → **cima** → `13,11`. Ativa o Totem em `13,12`. Para na parede `13,10`.
3. `13,11` → **esquerda** → `5,11`. Coleta Prova 2 em `11,11`. **Cruza o trilho do Drone em `9,11`.** Para na parede `4,11`.
4. `5,11` → **cima** → `5,5`. **Cruza o trilho da Gosma em `5,9` e `5,8`.** Atravessa o Habitante em `5,7`. Para na parede `5,4`.
5. `5,5` → **direita** → `11,5`. **Cruza o trilho do Drone em `9,5`.** Para na parede `12,5`.
6. `11,5` → **cima** → `11,1`. Coleta Prova 3 em `11,4` (Saída acende). **Cruza o trilho do Guarda em `11,3`.** Para no contorno (`11,0`).
7. `11,1` → **esquerda** → `1,1`. Sem itens. Para no contorno (`0,1`).
8. `1,1` → **baixo** → atravessa a Saída em `1,6` com as 3 Provas: **Fase concluída**.

### 4.4 Validação das regras da Seção 3

| Regra | Resultado |
|---|---|
| R01 | 15 colunas. 16 linhas (exceção de exemplo; ver acima). |
| R02 | Contorno todo `#`. |
| R03 | 1 `@`, 1 `X`, 1 de cada Prova, 1 `H`, 1 `T`. |
| R04 | Só os 13 caracteres da legenda. |
| R07 | Todas as células de trilho são `.`, exceto `v1` (`G` em 3,8; `D` em 9,4; `R` em 10,3). |
| R08 | Trilhos disjuntos (G1: linhas 8–9; D1: coluna 9; R1: linha 3, colunas 10–13). |
| R09 | O único `T` (13,12) está a 4 células do trilho mais próximo. |
| R05 | Após 2 deslizes o Protagonista para em `13,11`; `\|11 − 6\| = 5 ≤ 7`. A Saída também fica a 5 linhas de `5,11` (3 deslizes). |
| R06 | Distância em linhas até a primeira célula de trilho cruzada, a partir da célula de partida: deslize 3 = 0; deslize 4 = 2; deslize 5 = 0; deslize 6 = 2. Todas ≤ 7. |
| R10 | Rotas axiais, sem repetir célula, `G` e `D` sem pausa. |
| R11 | Busca em largura (ignorando Ameaças): solução em 8 deslizes (4.3). |
| R12 | Ver 4.5. Nenhuma parada em `^` ou em trilho; todas as paradas ficam a pelo menos 2 células de qualquer trilho. |

### 4.5 Validação de tempo (R12)

Modelo usado (premissas a confirmar com o jogo): o Protagonista desliza a 15 tiles/s e pode esperar parado em qualquer parada; as Ameaças partem de `v1` em `t = 0` e reiniciam ao morrer; há colisão quando os quadrados de 1×1 tile se sobrepõem (encostar nas bordas não mata). Simulado em passos de 2 ms. A "fase" é o tempo desde o reinício, módulo o período da Ameaça.

| Deslize | Ameaça | Fase em que o jogador pode **apertar a direção** (janela segura) | Folga |
|---|---|---|---|
| 3 (`13,11` → `5,11`) | D1, período 1,6 s | de 0,80 s a 1,87 s (passando por 0) | ≈ 1,07 s |
| 4 (`5,11` → `5,5`) | G1, período 3,33 s | de 0,87 s a 1,80 s, ou de 2,60 s a 3,40 s (passando por 0) | ≈ 0,9 s e ≈ 0,8 s |
| 5 (`5,5` → `11,5`) | D1, período 1,6 s | de 0,00 s a 1,07 s | ≈ 1,07 s |
| 6 (`11,5` → `11,1`) | R1, período 3,2 s | de 0,34 s a 2,60 s (Guarda parado ou ainda longe de `11,3`) | ≈ 2,27 s |

Os deslizes 1, 2, 7 e 8 não cruzam trilhos. A pausa de 2 s do Guarda em `13,3` é o que abre a janela longa do deslize 6.

**Conclusão:** a Fase de exemplo é solucionável com a mecânica de deslize (o Protagonista só para ao bater em `#`), em 8 deslizes, e cumpre todas as regras da Seção 3.
