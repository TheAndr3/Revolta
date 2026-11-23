# Re(volta)

Jogo 2D de labirinto com movimento por deslize (o personagem só para ao bater em algo), sobre educação ambiental crítica. A fonte canônica do conceito é `Re_volta__Conceito_Enxuto.md`; o documento longo serve de material de apoio.

## Estrutura da campanha

**Mapa**:
Uma das três regiões temáticas da campanha (Floresta Contaminada, Zona Industrial, Sede da Corporação), cada uma com seu conjunto próprio de Ameaças.
_Avoid_: Mundo, bioma, capítulo

**Fase**:
Um labirinto jogável dentro de um Mapa, com começo, saída e três Provas.
_Avoid_: Nível, level, estágio

**Rota crítica**:
O caminho que todo jogador faz numa Fase: do início às três Provas e daí à Saída.
_Avoid_: Caminho principal, main path

**Desvio**:
Trecho opcional que sai da Rota crítica, oferece algo (uma Prova, o Habitante ou Almas) e volta para ela sem obrigar a refazer o caminho.
_Avoid_: Atalho, ramo, side path, segredo

**Totem**:
Ponto da Fase onde o espírito do Protagonista se reancora; ao morrer, o Protagonista volta ao último Totem que tocou.
_Avoid_: Checkpoint, save point, árvore sagrada

**Parada**:
Célula onde um deslize termina, porque há uma parede logo à frente. É onde o jogador pode pensar e escolher a próxima direção.
_Avoid_: Ponto de parada, stop, plataforma

**Deslize às cegas**:
Deslize cuja Parada fica fora da área que a câmera mostra no momento em que ele começa. Pelas regras de desenho, sempre termina numa Parada segura.
_Avoid_: Deslize longo (comprimento não é o problema; não ver o fim é)

**Saída**:
Ponto da Fase que a conclui ao ser alcançado, desde que as três Provas tenham sido coletadas. Fica apagada até a terceira Prova e então acende. Nos dois primeiros Mapas pode estar em qualquer lugar da Fase; na Sede da Corporação fica sempre no topo.
_Avoid_: Fim, goal, porta

## Coleta e narrativa

**Prova**:
Documento dentro de uma Fase que revela um trecho da história daquele lugar. Ao ser coletada, abre na tela; o jogador pode fechá-la e continuar jogando. Cada Fase tem exatamente três (O Passado, A Transformação e Os Responsáveis), e as três são obrigatórias para concluir a Fase.
_Avoid_: Papel, documento, evidência, estrela, colecionável

**Alma**:
Pequeno espírito da floresta (de um bicho, uma planta, o rio), animado, espalhado pelos caminhos de uma Fase e pego ao deslizar por cima. Ao reunir as Almas, o espírito do Protagonista retoma a força do território. Não são almas de pessoas.
_Avoid_: Moeda, ponto, orbe, semente, alma de antepassado

**Marca**:
Cada uma das três conquistas de uma Fase: concluí-la, reunir todas as Almas e resgatar o Habitante. A nota da Fase é quantas Marcas o jogador já obteve nela.
_Avoid_: Estrela, medalha, troféu, pontuação

**Arquivo da Resistência**:
Acervo de todas as Provas já coletadas, acessível pelo menu principal para reler depois.
_Avoid_: Galeria, coleção, dossiê

## Personagens

**Habitante**:
Morador do território, escondido numa Fase, que pode ser resgatado ao encostar nele. É opcional, um colecionável.
_Avoid_: Morador, NPC, refém, aldeão

**Protagonista**:
O último sobrevivente indígena do território (de um povo fictício da Amazônia), em quem um espírito ancestral da floresta encarnou.
_Avoid_: Herói, player, jogador (quando o assunto é o personagem)

**Ameaça**:
Elemento da Fase que se move sozinho num ciclo fixo e mata o Protagonista ao contato (gosma, drone, guarda...).
_Avoid_: Inimigo, obstáculo (obstáculo é parede, e não fere)

**Armadilha**:
Elemento parado da Fase que é ativado pela passagem do Protagonista e, depois de um atraso, passa a matar.
_Avoid_: Trap, Ameaça (Ameaça se move sozinha; Armadilha reage à passagem)
