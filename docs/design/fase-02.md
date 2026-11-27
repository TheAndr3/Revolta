# Fase 2: Solo Partido (Floresta Contaminada)

Arquivo: [`public/fases/fase-02.txt`](../../public/fases/fase-02.txt), segunda entrada de [`content/fases.json`](../../content/fases.json). Conteúdo narrativo em `content/provas/fase-02/` e `content/habitantes/fase-02/` (rascunho sobre desmatamento e erosão da encosta causados pela Biovex).

## Nova Armadilha: Solo erodido (`~`)

Implementada no núcleo puro ([`src/core/soloErodido.ts`](../../src/core/soloErodido.ts), integrada em [`src/core/deslize.ts`](../../src/core/deslize.ts) e [`src/game/FaseScene.ts`](../../src/game/FaseScene.ts)):

- **Símbolo no `.txt`:** `~` (regra R07 mantida: trilhos de Ameaças não passam por cima).
- **Granularidade:** célula por célula.
- **1ª passada:** o tile passa de `intacto` para `rachando` e conta `CONFIG.soloErodido.quebraSegundos` (`1,0 s`). Deslizar é seguro; ficar parado em cima até o tempo acabar derruba o Protagonista.
- **2ª passada enquanto `rachando`:** o Protagonista sobrevive deslizando e o tile desaba **imediatamente ao sair dele** (permite ir e voltar correndo em Desvios curtos, mas impede uma 3ª passagem). Parar em cima na 2ª passada derruba na hora.
- **Quebrado:** vira buraco escuro letal permanente até o Protagonista morrer ou usar **Voltar ao Totem**, quando todo o solo erodido da Fase volta a `intacto`. Pausa e overlay de Prova congelam o cronômetro.
- **Áudio e visual:** textura procedural `'solo-erodido'` (4 quadros: intacto, rachando A/B com leve tremor, quebrado) + partículas de terra + efeitos sintetizados `solo_rachando` e `solo_quebrou`.

## Decisões relacionadas (26/11/2026)

- **Seleção de Fase:** todas as Fases do catálogo ficam liberadas desde o início ([`src/core/progresso.ts`](../../src/core/progresso.ts)) para facilitar playtest direto.
- **Simplificação:** foi testada inicialmente uma segunda variante rápida (`Q`), mas removida no playtest por excesso de complexidade frente à velocidade do deslize; ficou apenas o solo erodido `~`.
- **Mapa em evolução:** o mapa atual em `public/fases/fase-02.txt` (69 × 71, 66 deslizes na rota mínima) parte da base da Fase 1 com o trecho inicial redesenhado usando `~`, e segue validado pelo solver estático e pelo teste cronometrado sem morrer em [`src/core/solver.test.ts`](../../src/core/solver.test.ts).
