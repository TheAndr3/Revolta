# Arte em duas camadas: pixel art 16×16 no gameplay, ilustração pintada nas telas

Toda a arte é gerada por IA. Separamos duas camadas porque a IA se comporta de forma oposta em cada uma. No **gameplay** (tiles, Protagonista, Ameaças, Armadilhas, Totem, Saída, sprites de Habitantes) usamos pixel art 16×16 com paleta travada, gerada por ferramentas especializadas em pixel art e não por geradores genéricos, que produzem "falsa pixel art" fora da grade. Nas **ilustrações** (Provas, introdução, retratos de Habitantes, Sobre o projeto) usamos um estilo pintado único, travado por um prompt-base e imagens de referência. Antes de produzir os assets em escala, fazemos um teste de estilo (Protagonista + bloco de tileset + Gosma + uma ilustração de Prova numa Fase de teste).

## Considered Options

- Tudo em pixel art, inclusive as ilustrações: máxima coerência, mas a pixel art grande feita por IA sai borrada e exige retoque manual.
- Tudo ilustrado/vetorial: a IA gera bem as imagens soltas, mas os tiles e as animações em 4 direções ficam inconsistentes ("tremidos").
- Gameplay geométrico minimalista: risco quase zero, mas perde a identidade da floresta. **É o plano B** se o teste de estilo falhar.
