# Decisões de design: protótipo

Registro das decisões tomadas na sessão de planejamento (18/11/2026), que serve de base para quebrar o trabalho em issues. Decisões difíceis de reverter ficam em `docs/adr/`; termos, em `CONTEXT.md`; o que ficou de fora, em `ideias-futuras.md`.

## Escopo e prazo
- Vertical slice do Mapa 1, Floresta Contaminada (ADR 0001). O Enxuto é a fonte canônica do conceito.
- **Prazo: uma semana**, duas pessoas, todo o conteúdo gerado por IA e revisado por humanos.
- **4 Fases**: 1) paredes + espinhos; 2) Gosma; 3) Drone + Guarda; 4) combinação.
- 3 Provas por Fase = **12 Provas**; 1 Habitante por Fase = **4 Habitantes**.

## Plataforma e tecnologia
- Web, com teclado no PC e swipe no celular (ADR 0002).
- Phaser 3 + TypeScript + Vite, com a lógica num núcleo puro e testável.
- Deploy automático: um link de playtest a cada push.
- Provas e Arquivo da Resistência em HTML/CSS sobreposto ao canvas.
- **Solver só estático** no protótipo: valida que existe uma rota que pega as 3 Provas e chega à Saída, que nenhum Totem está em trilho de Ameaça e que os trilhos não se cruzam. Não simula o tempo das Ameaças: essa parte é validada no teste manual.

## Formato da Fase
- Largura fixa de 15 tiles e altura variável (40–120 tiles); a câmera rola só na vertical, com look-ahead na direção do deslize.
- Tiles de 16×16 px, pixel art, com escala inteira (×3 no celular, ×4 no PC).
- Saída em qualquer lugar nos Mapas 1 e 2; sempre no topo no Mapa 3 (Sede).
- Sinalização da Saída: só diegética (luz e partículas, com o desenho da Fase conduzindo o olhar), sem seta nem minimapa.
  - Risco: uma Saída fora da tela não é vista. Regra de desenho: o layout leva o jogador a ver a Saída (ou o brilho dela) cedo. O plano B, se o playtest pedir, é o indicador na borda.

## Deslize (regras do Protagonista)
- Velocidade de ~15 tiles/s, numa config ajustável.
- Buffer de 1 comando durante o deslize, executado ao parar; não dá para mudar de direção no meio.
- Comando contra a parede: um pequeno "tranco" visual, sem efeito.
- Atravessa e ativa ao passar: Provas, Habitantes, Totens e Saída. Para: paredes. Mata: Ameaças e espinhos ativos.
- Prova coletada no meio do deslize: o overlay abre **quando o Protagonista parar** (e o mundo pausa). Se ele morrer antes de parar, a Prova já está salva e o overlay abre após reaparecer no Totem.
- Controles: setas + WASD; no celular, swipe em qualquer lugar da tela (distância mínima ~30 px).
- Sem ação extra (dash, habilidade) no protótipo.

## Dano e morte
- Encostar numa Ameaça ou num espinho ativo é morte instantânea; o Protagonista volta ao último Totem tocado (ou ao início da Fase).
- A quantidade e o espaçamento dos Totens são decididos no desenho e funcionam como controle de dificuldade.
- Ao reaparecer, todas as Ameaças reiniciam o ciclo do zero e todas as Armadilhas voltam ao estado inicial.

## Provas
- **As 3 Provas são obrigatórias para concluir a Fase** (ADR 0001, revisão).
- A Prova vai para o Arquivo da Resistência **no momento da coleta**; morrer não a tira.
- Ao ser coletada, abre um overlay com a história; o jogador fecha e continua.
- A Saída fica **apagada** até a 3ª Prova e **acende** quando ela é coletada. Antes disso, passar pela Saída não tem efeito.
- Finais múltiplos (fora do protótipo) passam a depender dos Habitantes, não das Provas.

## Habitantes
- **Opcionais**, colecionáveis. Um por Fase.
- Resgate ao encostar (inclusive deslizando): uma fala curta em balão, **sem pausar o jogo**, e o Habitante some ("foi para o ponto de encontro").
- Fica salvo na hora; morrer não tira.

## Ameaças
- Tempo real determinístico: trilhos e ciclos fixos, sem aleatoriedade e sem perseguição (ADR 0003).
- O mundo inteiro pausa enquanto o overlay da Prova está aberto.
- **Gosma Tóxica** (paciência): lenta (~3 tiles/s), trilho fechado em loop. Deixa um brilho no trilho.
- **Drone Desmatador** (timing): rápido (~10 tiles/s), vai e volta em linha reta. O som do motor aumenta com a proximidade.
- **Guarda Florestal** (leitura de padrão): ronda num trilho, com pausas em pontos marcados. Sem facho de lanterna.
- Todas matam ao encostar e rodam sempre, mesmo fora da tela. Regra de desenho: o trilho de uma Ameaça que cruza a rota do jogador precisa ficar visível antes da passagem.

## Armadilhas
- Só **espinhos temporários** (nome provisório: *Estacas da empresa*): ao passar por cima, após 0,5 s sobem e ficam ativos por 1,5 s, depois recolhem.
- A 15 tiles/s, passar deslizando é sempre seguro; o perigo é parar em cima ou voltar logo.

## Level design
- As Fases são **desenhadas pela equipe**; a IA só reproduz o desenho no formato de texto do jogo. A IA não inventa layouts.
- Pipeline: desenho em papel quadriculado (15 colunas, legenda fixa de símbolos; rotas de Ameaças como setas, mais a velocidade e o tipo de ciclo) → foto → a IA transcreve para o `.txt` da Fase → solver estático → **a equipe abre a Fase no próprio jogo** e compara com o desenho (sem preview PNG).
- **Em avaliação:** o editor Tiled. O jogo carrega um formato interno neutro, para o qual o parser de ASCII (e um eventual importador do Tiled) convertem.

## Fluxo de telas
- **"Toque para começar"** (capa; destrava o áudio no celular).
- **Menu principal:** Jogar · Arquivo da Resistência · Sobre o projeto. Sem opções e sem créditos.
- **Introdução:** **3 quadros** ilustrados com texto curto, na primeira vez que se joga (dá para pular).
- **Seleção de Fase:** lista linear das 4 Fases, desbloqueio em sequência, mostrando se o Habitante foi resgatado; dá para rejogar.
- **HUD:** Provas x/3 · ícone do Habitante (cinza/colorido) · botão de pausa.
- **Pausa:** Continuar · Voltar ao Totem · Reiniciar Fase · Sair.
- **Overlay da Prova:** ilustração + tipo (O Passado / A Transformação / Os Responsáveis) + título + texto de **até ~100 palavras** + fechar.
- **Fim de Fase:** Provas 3/3 · Habitante ✔/✘ · mortes · tempo · [Próxima] [Repetir]. Sem XP.
- **Fim do protótipo:** tela simples depois da Fase 4.
- **Arquivo da Resistência:** abas **Provas** (por Fase, na ordem Passado → Transformação → Responsáveis) e **Povo** (fichas dos Habitantes: nome, retrato, uma frase).
- **Sobre o projeto:** contexto educativo + fontes reais que inspiraram as Provas.
- **Salvamento:** automático no navegador (localStorage).
- **Idioma:** só PT-BR, com todos os textos em arquivos de conteúdo separados do código.

## Arte
- Duas camadas (ADR 0004): **pixel art 16×16** no gameplay e **ilustração pintada** nas telas.
- Sugestão de estilo da ilustração: pintura com textura, tons terrosos, inspiração em arte popular latino-americana e gravura.
- Ferramentas: **PixelLab** (gameplay) e **Gemini + GPT-image** (ilustrações). Cada **série** de ilustração é feita inteira numa mesma ferramenta, com as imagens-âncora como referência.
- **Kit de estilo em `art/`:** paleta fixa (24–32 cores), `estilo-gameplay.md`, `estilo-ilustracao.md` + imagens-âncora, `representacao.md`, `prompts/` com o prompt de cada asset, e um script `check-assets` que valida **o tamanho** dos sprites (sem checagem de paleta no protótipo).
- **Animação:** o mínimo de frames desenhados; a "vida" vem do código (esticar/achatar, tremor, partículas, luz da Saída).
  - Protagonista: idle (2–4), pose de deslize nas 4 direções (1–2 cada), morte "se desfaz em folhas" (4), reaparecer (4).
  - Gosma: loop (4). Drone: hélice (2–4), visto de cima, rotacionado por código. Guarda: andar nas 4 direções (4 cada) + parado.
  - Espinhos: recolhido, aviso (2), ativo, recolhendo. Totem: inativo + ativo em loop. Saída: apagada + acesa.
  - Prova no mapa: papel flutuando (2–4). Habitantes: 1 sprite base com variações; escondido (2) + alívio (2–4).
  - Tileset da Floresta: ~40–60 tiles + 1 tile animado (água contaminada).
- Ilustrações: 12 Provas, 4 retratos, 3 quadros de intro.
- Primeira tarefa de arte: **teste de estilo** (Protagonista, bloco do tileset, Gosma e uma ilustração de Prova numa Fase de teste). Se falhar, o plano B é o gameplay geométrico.

## Representação
- Povo indígena **fictício**, na **Amazônia** (ADR 0005).
- Diretriz "fazer / evitar" em `art/representacao.md`, aplicada a todo prompt de arte, texto e música.
- **Revisão humana de representação** no teste de estilo e nos textos e assets de personagens. Pedir ao revisor no **dia 1**, porque depende da agenda de outra pessoa.
- Pendente com o revisor: como nomear o povo e os personagens.

## História e Provas (texto)
- **Bíblia da história** (`docs/historia/biblia.md`) antes de qualquer Prova: a IA rascunha e a equipe revisa.
- **As decisões de conteúdo** (setor da corporação, caso central, nomes, arco das 4 Fases) ficam para a issue da história, que começa com uma **entrevista de decisões** com a equipe.
- Cada Fase conta uma micro-história (Passado → Transformação → Responsáveis), com formatos variados (diário, foto, carta, notícia, laudo, memorando, mensagem).
- Ficção fundamentada em fatos reais; nenhuma empresa ou pessoa real é nomeada; fontes reais listadas em "Sobre o projeto".
- Arquivo por Prova: `content/provas/fase-NN/N-tipo.md`, com cabeçalho (tipo, formato, título, ilustração, tema, fontes) + texto de até ~100 palavras, validado pelo script `check-content`. As falas e fichas dos Habitantes seguem o mesmo padrão.
- Duas revisões: conteúdo educativo e representação.

## Áudio
- **1 música** (IA, Suno/Udio): Floresta, usada também no menu. ⚠️ Conferir a licença se o jogo for publicado.
- **~15 efeitos:** ElevenLabs para os específicos (folhas, Gosma, Drone), Kenney CC0 para interface e sons genéricos.
- Sem voz. Sem botão de mudo (o volume fica com o sistema/navegador).

## Organização do trabalho
- Issues divididas **por tipo** (código, design, arte, conteúdo, áudio), com rótulos. Sem dono: as duas pessoas pegam as issues aos poucos.
- Ordem "cinza primeiro": toda a mecânica com arte provisória antes da arte final.
- Rastreador: GitHub Issues + Project, no repositório `TheAndr3/Revolta`.

### Cronograma (7 dias)
| Dia | Código | Arte / Design / Conteúdo |
|---|---|---|
| 1 | Fundação: projeto, deploy, núcleo do deslize, parser, Fase cinza com swipe | Kit de estilo + teste de estilo · entrevista da bíblia · pedir a revisão de representação |
| 2 | Provas + overlay, Saída acende, Totem/morte, HUD, pausa | Protagonista + tileset · desenho das 4 Fases |
| 3 | Gosma, Drone, Guarda, espinhos · solver estático | Ameaças e objetos em pixel art · escrita das 12 Provas |
| 4 | Seleção de Fase, fim de Fase, Arquivo, salvamento, "toque para começar" | Ilustrações das Provas · Habitantes · transcrição das Fases |
| 5 | Integração da arte e do áudio · Sobre + intro | Áudio · 3 quadros de intro · revisão de conteúdo |
| 6 | Playtest interno e correções | Ajustes de Fase e de texto |
| 7 | Folga e entrega | Folga e entrega |
