# Fase única maior e cenário limpo

O protótipo passa a ter **uma Fase só** (15 × 71), em vez de 4 Fases curtas. A Fase apresenta os perigos um de cada vez (espinhos, Gosma, Drone, Guarda) e depois os combina. Com o prazo de uma semana, uma Fase bem acabada vale mais que quatro desenhadas às pressas, e concentra o trabalho de level design, conteúdo (3 Provas, 1 Habitante) e playtest num lugar só.

Junto vem o **cenário limpo**: a trilha é lisa e clara, a mata é uma massa escura e lisa, e uma linha clara marca onde a trilha acaba. Saem do jogo os tiles CC0 de trilha, grama e objetos (árvores, casas, ruínas, arbustos) e os cogumelos e flores na beira da mata. No playtest, a trilha tinha quase o mesmo brilho da mata e a decoração encostava na borda, então não dava para ver onde o deslize ia parar. Num jogo em que cada deslize é um compromisso, isso é o mais importante para ler.

## Considered Options

- **Manter as 4 Fases e só reduzir o conteúdo:** espalha o pouco tempo em quatro mapas sem playtest.
- **Manter os tiles CC0 e só clarear a trilha:** melhora pouco; a decoração alta nas bordas continua escondendo o limite.

## Consequences

- `content/fases.json` tem uma entrada; a tela de seleção continua (mostra Marcas e Habitante).
- 3 Provas e 1 Habitante no total (antes: 12 e 4). As issues de conteúdo e arte encolhem junto.
- ~~O cenário é desenhado por código~~ (revisto em 24/11, ver abaixo): a arte, atual ou final, mantém a hierarquia de brilho (trilha clara, nada com o tom dela na beira).
- O mapa está em [`docs/design/fase-01.md`](../design/fase-01.md).

## Revisão de 24/11/2026: a floresta volta, com regra de beira

O cenário limpo resolveu a leitura, mas jogou fora a ambientação (árvores, ruínas, cogumelos que brilham), que a equipe considera parte essencial do jogo. Os sprites CC0 voltaram, com uma regra no decorador (`src/game/cenarioFloresta.ts`): a **beira da trilha** só recebe grama escura, arbustos e árvores; ruínas, casas, troncos, tocos e pedras, que têm o tom rosado da trilha, ficam no **miolo** da mata e são desenhados escurecidos. O que vale deste ADR é a Fase única; do cenário limpo fica o princípio (a trilha é o chão mais claro e nada com o tom dela encosta no caminho), não o visual liso.

## Revisão de 26/11/2026: entrada da Fase 2 (Solo Partido)

O protótipo ganhou a **Fase 2** (`public/fases/fase-02.txt`, catálogo `content/fases.json`), dentro do mesmo Mapa 1 (*Floresta Contaminada*), introduzindo a nova Armadilha **Solo erodido** (`~`, `src/core/soloErodido.ts`). Para facilitar o playtest direto, todas as Fases do catálogo passaram a ficar liberadas desde o início na seleção (`src/core/progresso.ts`). Detalhes em [`docs/design/fase-02.md`](../design/fase-02.md).

