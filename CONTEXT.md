# Re(volta)

Jogo 2D de labirinto com movimento por deslize (o personagem só para ao bater em algo), sobre educação ambiental crítica. A fonte canônica do conceito é `Re_volta__Conceito_Enxuto.md`; o documento longo serve de material de apoio.

## Estrutura da campanha

**Mapa**:
Uma das três regiões temáticas da campanha (Floresta Contaminada, Zona Industrial, Sede da Corporação), cada uma com seu conjunto próprio de Ameaças.
_Avoid_: Mundo, bioma, capítulo

**Fase**:
Um labirinto jogável dentro de um Mapa, com começo, saída e três Provas.
_Avoid_: Nível, level, estágio

**Totem**:
Ponto da Fase onde o espírito do Protagonista se reancora; ao morrer, o Protagonista volta ao último Totem que tocou.
_Avoid_: Checkpoint, save point, árvore sagrada

**Saída**:
Ponto da Fase que a conclui ao ser alcançado, desde que as três Provas tenham sido coletadas. Fica apagada até a terceira Prova e então acende. Nos dois primeiros Mapas pode estar em qualquer lugar da Fase; na Sede da Corporação fica sempre no topo.
_Avoid_: Fim, goal, porta

## Coleta e narrativa

**Prova**:
Documento dentro de uma Fase que revela um trecho da história daquele lugar. Ao ser coletada, abre na tela; o jogador pode fechá-la e continuar jogando. Cada Fase tem exatamente três (O Passado, A Transformação e Os Responsáveis), e as três são obrigatórias para concluir a Fase.
_Avoid_: Papel, documento, evidência, estrela, colecionável

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
