# Boas práticas de game design para as Fases

Guia de referência para desenhar as Fases do Re(volta) (#31) e revisar as regras de [`legenda-fases.md`](legenda-fases.md). Junta o que funciona no gênero "deslize até a parede" — cuja referência mais conhecida é o *Tomb of the Mask* — com princípios gerais de level design, adaptados para **mais exploração**.

> **Inspiração, não cópia.** Usamos as *mecânicas e princípios* do gênero (eles não pertencem a nenhum jogo). Não copiamos fases, arte, nome, personagens, música nem o visual de nenhum jogo existente. Nossas Fases são desenhadas pela equipe (decisões de design, "Level design").

As decisões que esta pesquisa levantou foram tomadas na entrevista de 23/11/2026 e estão listadas no fim (seção 7), com o que mudou na legenda, no glossário e no ADR 0006.

---

## 1. Por que o deslize funciona

O Protagonista só para ao bater numa parede. Isso muda tudo:

- **Cada comando é um compromisso.** Não dá para parar no meio, então o jogador precisa ler o caminho *antes* de deslizar. O jogo vira planejamento rápido, não reflexo puro.
- **O labirinto é o controle.** Como o jogador não freia, as paredes definem onde ele pode parar. Desenhar uma Fase é desenhar **pontos de parada**: cada parede é um "degrau" possível.
- **Ritmo de "olhar, decidir, disparar".** O bom jogo do gênero alterna: parar num lugar seguro → ler o que vem → deslizar → reagir. As Ameaças e Armadilhas quebram esse ritmo no momento certo.
- **Errar é barato.** Morrer volta ao Totem em instantes. Isso convida a tentar de novo em vez de desistir.

**Implicações para o desenho:**
- Toda célula onde o jogador "para" deve ser uma decisão interessante ou um respiro — nunca uma armadilha invisível.
- Evite paradas que não levam a lugar nenhum sem dar algo em troca (ver "becos com recompensa").

## 2. Padrões do gênero que queremos

Padrões comuns em jogos de labirinto com deslize, que se encaixam no Re(volta):

| Padrão | O que é | Como aplicamos |
|---|---|---|
| **Corredores estreitos** | Passagens de 1 tile, curvas fechadas, muitas paredes curtas | Muitos pontos de parada; Fases densas, não salões vazios |
| **Rastro de coleta** | Pequenos itens espalhados pelos caminhos, que se pegam ao passar | **Almas**: pequenas, animadas; o guerreiro espiritual retoma a força ao coletá-las. Guiam o olhar pela rota e recompensam quem explora |
| **Fases curtas e verticais** | Subir ou descer uma coluna estreita, de 30 s a 2 min | Já é nosso formato (15 colunas, 40–120 linhas, rolagem vertical) |
| **Perigo em ciclo** | Inimigos e armadilhas com padrão fixo, legíveis | Já é nosso ADR 0003 (Ameaças determinísticas) e os espinhos |
| **Recomeço rápido** | Morrer custa segundos, não minutos | Totens próximos dos trechos difíceis |
| **Câmera colada no personagem** | O personagem é grande na tela e se vê pouco à frente | Cerca de 9 colunas visíveis (ADR 0006, seção 5) |
| **Pressão de tempo (modo sem fim)** | Algo sobe atrás do jogador e obriga a continuar | Fora do protótipo; anotar em `ideias-futuras.md` se quisermos |

## 3. Princípios de level design

### Ensinar sem texto
- **Um elemento novo por vez.** Apresente a mecânica num lugar seguro, depois teste, depois combine. Ex.: o primeiro espinho aparece num corredor onde passar deslizando é o único caminho — o jogador vê que passar é seguro antes de enfrentar um espinho onde precisa parar perto.
- **Primeiro contato quase impossível de errar.** A primeira vez que uma Ameaça aparece, o jogador deve vê-la de longe e ter uma parada segura para observar o ciclo.
- **Texto por último.** Se precisar explicar, o desenho falhou primeiro. (Nossa única ajuda escrita é a dos controles.)

### Guiar o olhar
- **Marcos e luz.** A Saída acesa (brilho + partículas) é o principal marco. Provas brilham. Use paredes e corredores para "apontar" para eles.
- **Linhas que conduzem.** Corredores longos levam o olhar para o objetivo; becos curtos dizem "aqui tem algo".
- **Não se perder.** Labirinto grande sem direção frustra. Garanta que, de qualquer ponto de parada, haja uma pista de para onde ir (Saída visível cedo, Prova à vista, rastro de coleta).

### Caminho principal e desvios (exploração)
- **Rota crítica clara.** Existe um caminho que todo jogador faz: Início → 3 Provas → Saída.
- **Desvios curtos que voltam.** Ramos opcionais saem da rota, oferecem algo e **voltam para ela** (gargalo), sem obrigar a refazer o caminho.
- **Risco e recompensa visíveis na decisão.** Antes de entrar num desvio, o jogador deve *ver* o que ganha e o que arrisca (ex.: Habitante atrás do trilho de um Drone).
- **Recompensa de exploração não é poder.** Desvios dão Habitantes, conteúdo e coleta — nunca algo que deixe o resto mais fácil (não temos power-ups, e é bom manter assim).
- **Poucos "cadeado e chave".** Excesso de portas e chaves deixa a Fase burocrática.

### Ritmo
- **Curva de intensidade.** Trecho tenso → respiro (com Totem) → trecho tenso maior. Nunca dois trechos máximos seguidos sem respiro.
- **Nem curta demais, nem repetitiva.** Uma Fase não deve exigir repetir o mesmo trecho difícil várias vezes para chegar ao próximo (Totens resolvem isso).
- **Dificuldade sobe aos poucos** dentro da Fase única (ADR 0007): espinhos → Gosma → Drone → combinação → Guarda.

## 4. Aplicando às nossas Fases

| Elemento | Onde colocar | Por quê |
|---|---|---|
| **Prova 1 (O Passado)** | Na rota crítica, cedo | Garante o primeiro trecho de história sem exigir exploração |
| **Prova 2 (A Transformação)** | Num desvio curto que volta à rota | Ensina que vale explorar |
| **Prova 3 (Os Responsáveis)** | Perto do trecho mais difícil | Clímax narrativo junto com o clímax de jogo |
| **Habitante** | Num desvio opcional com risco visível | Exploração recompensada, nunca obrigatória |
| **Almas** | Em trilhas ao longo da Rota crítica e concentradas nos Desvios; nunca soltas em becos sem saída | Guiam o olhar para onde ir e recompensam quem explora; reunir todas é uma Marca |
| **Totem** | Logo antes de cada trecho difícil e logo depois de cada Prova | Recomeço rápido; a Prova não se perde |
| **Saída** | Visível (ou seu brilho) cedo, alcançável só no fim | Orientação constante (regra R05) |
| **Ameaças** | Cruzando a rota em pontos com parada segura antes | O jogador observa o ciclo antes de arriscar (R06, R12) |
| **Espinhos** | Onde o jogador é tentado a parar ou voltar | A mecânica só é interessante se pune parar/voltar |
| **Becos** | Sempre com algo (Prova, Habitante, coleta) | Beco vazio é tempo perdido |

## 5. Câmera e campo de visão

> **Decidido (ADR 0006):** a câmera mostra **cerca de 9 colunas** e segue nos dois eixos. As Fases preferem **deslizes curtos**; todo **Deslize às cegas** (Parada fora da tela) termina numa **Parada segura**, e todo cruzamento perigoso fica visível de onde o deslize parte (regras R06 e R13 da legenda). A análise abaixo é o que levou à decisão.

Hoje a câmera mostra **as 15 colunas inteiras** e rola só na vertical, com look-ahead de 2,5 tiles. A ideia é **aproximar a câmera**: personagem maior, menos mapa visível.

**O que ganhamos com a câmera mais perto**
- Personagem, Ameaças e efeitos maiores e mais legíveis, principalmente no celular.
- Mais tensão e mais "descoberta": o jogador não vê a Fase inteira, explora de verdade.
- Combina com o gênero, em que o personagem ocupa bem a tela.

**O que custa**
- **Vê-se menos à frente.** Num jogo em que cada deslize é um compromisso, o jogador precisa ver *onde vai parar*. Câmera perto demais vira tentativa e erro.
- **A câmera precisa seguir na horizontal** se não couberem as 15 colunas.
- **As regras R05 e R06** (Saída visível cedo; trilho visível antes do cruzamento) usam `RAIO_VISAO = 7` linhas e assumem a largura inteira na tela. Mudam junto.
- **Enjoo:** câmera que se move muito rápido incomoda algumas pessoas; suavizar é obrigatório.

**Boas práticas de câmera para o gênero**
- **Look-ahead proporcional à velocidade**, na direção do deslize (já temos na vertical; estender à horizontal).
- **Zona morta pequena** em volta do personagem: a câmera não treme a cada pixel.
- **Zoom com limites** (mínimo e máximo), ajustável no playtest; nunca fracionário (escala inteira da pixel art).
- **Ver o destino do deslize**: ao disparar, a câmera deve antecipar o ponto de parada, não ficar presa no personagem.

## 6. Checklist por Fase (além de R01–R12)

- [ ] Cada elemento novo aparece primeiro num lugar seguro
- [ ] De todo ponto de parada há uma pista de para onde ir
- [ ] Existem de 2 a 3 Desvios que voltam à Rota crítica (R14)
- [ ] Todo desvio mostra risco e recompensa antes da entrada
- [ ] Nenhum beco vazio
- [ ] Totem antes de cada trecho difícil e depois de cada Prova
- [ ] Curva de intensidade com respiros
- [ ] Deslizes curtos; todo Deslize às cegas termina numa Parada segura (R13)
- [ ] Tempo de uma jogada limpa entre 45 s e 2 min (cronometrar no playtest)

## 7. Decisões tomadas

Resultado da entrevista de decisões (`grill-with-docs`, 23/11/2026):

1. ~~**Câmera:** quantos tiles o jogador vê.~~ **Decidido:** cerca de 9 colunas, seguindo nos dois eixos (ADR 0006).
2. ~~**Regras R05/R06:** novos valores de visão.~~ **Decidido:** `RAIO_VISAO_H` = 4 colunas; R06 atualizada e R13 criada (legenda).
3. ~~**Rastro de coleta:** criar ou não.~~ **Decidido:** **Almas** da floresta (bichos, plantas, o rio), pequenas e animadas; ao reuni-las, o espírito do Protagonista retoma a força do território. Não são almas de pessoas (ADR 0005). São opcionais e **não dão poder**: contam na nota da Fase.
4. ~~**Exploração.**~~ **Decidido:** Rota crítica + 2 a 3 Desvios que voltam a ela (Prova 2, Habitante, Almas); 60–100 linhas; jogada limpa de 1 a 2 min (regra R14 da legenda).
5. ~~**Avaliação da Fase.**~~ **Decidido:** nota de 3 **Marcas** (concluir · todas as Almas · Habitante), no fim da Fase e na seleção.

---

## Fontes

- Mecânica do gênero: [Gamezebo – review](https://www.gamezebo.com/reviews/tomb-of-the-mask-review-fast-fingers/), [Game Developer – análise de inimigos](https://gamedeveloper.com/design/tomb-of-the-mask-enemy-analysis)
- Ensinar sem texto: [Unity – Level design basics](https://unity.com/blog/level-design-basics), [Tutorial design in Puzzledorf](https://www.gamedeveloper.com/game-platforms/tutorial-design-in-puzzledorf-reflections), [Designing without words](https://gamedeveloper.com/design/designing-without-words), [Level design em jogos mobile](https://www.androidauthority.com/level-design-mobile-games-developers-make-games-fun-661877/), [Level design principles (BMCC)](https://openlab.bmcc.cuny.edu/mmp-270-spring-2026/level-design-principles/?pdf=2557)
- Câmera: [Scroll Back – câmeras em side-scrollers](https://www.gamedeveloper.com/design/scroll-back-the-theory-and-practice-of-cameras-in-side-scrollers), [GMTK – How to make a good 2D camera](https://gmtk.substack.com/p/how-to-make-a-good-2d-camera), [Odd Verdure – cameras](https://bitdecaygames.itch.io/odd-verdure-jam/devlog/481096/cameras), [Unity – Camera 101](https://unity.com/blog/video-game-camera-perspectives), [Camera em 2D (Game Design Skills)](https://gamedesignskills.com/game-design/camera-design-2d-side-scroller-games/)
- Exploração e caminhos: [Ten principles of good level design, parte 2](https://gamedeveloper.com/design/ten-principles-of-good-level-design-part-2-), [Critical path e conteúdo opcional](https://bugnet.io/blog/how-to-design-a-levels-critical-path-and-optional-content), [Trinity – Paths](https://gamedeveloper.com/design/trinity-part-8---paths), [Difficulty: self-selecting vs self-defeating](https://gamedeveloper.com/design/difficulty-self-selecting-vs-self-defeating), [Level design techniques (BMCC)](https://openlab.bmcc.cuny.edu/mmp-270-spring-2026/level-design-techniques/?pdf=2559), [Level design patterns in 2D games](https://cxong.github.io/2019/10/level-design-patterns-in-2d-games)
