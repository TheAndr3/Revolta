# Câmera próxima: cerca de 9 colunas visíveis, seguindo nos dois eixos

A câmera mostra cerca de **9 colunas** da Fase (que tem 15), com o Protagonista grande na tela, e passa a seguir na horizontal e na vertical, com look-ahead na direção do deslize. Queremos a sensação dos jogos de labirinto com deslize do gênero do *Tomb of the Mask*: personagem em destaque, exploração de verdade e tensão por não ver a Fase inteira. Antes, a câmera mostrava as 15 colunas, e no celular o personagem ficava com 16 px e quase a Fase inteira aparecia.

Como cada deslize é um compromisso (não dá para parar no meio), ver menos à frente só é justo com uma regra de desenho: **deslizes cujo ponto de parada fica fora da tela terminam numa Parada segura**, e todo cruzamento perigoso (trilho de Ameaça, espinhos) fica visível de onde o deslize parte (regras R06 e R13 da legenda). Por isso as Fases passam a preferir deslizes curtos.

## Considered Options

- **Manter as 15 colunas e só limitar as linhas visíveis:** quase não muda o celular, onde a largura já define a escala; o personagem continuaria pequeno.
- **Cerca de 11 colunas:** meio-termo mais seguro, mas menos próximo da sensação buscada.

## Consequences

- As regras R05 e R06 passam a usar um raio de visão horizontal (`RAIO_VISAO_H`, 4 colunas) além do vertical.
- Fases já desenhadas com deslizes longos cruzando Ameaças precisam ser revistas (a Fase de teste inclusive).
- A escala continua inteira (pixel art nítida); por isso o número exato de colunas varia um pouco de tela para tela (cerca de 9 a 10).
