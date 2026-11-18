# Protótipo é uma vertical slice do Mapa 1 (Floresta Contaminada)

O protótipo tem um único Mapa, a Floresta Contaminada, com poucas Fases completas: movimento por deslize, Ameaças, Armadilhas, três Provas obrigatórias por Fase (cada uma abre na tela ao ser coletada e fica guardada no Arquivo da Resistência, acessível pelo menu principal) e Habitantes opcionais. Ele responde a duas perguntas: **o deslize é divertido?** e **ler as Provas no meio da Fase engaja o jogador sem quebrar o ritmo?** O segundo ponto é o risco real do jogo, e um protótipo só de mecânica não o testaria.

A base canônica é o `Re_volta__Conceito_Enxuto.md`: 3 Mapas, o Protagonista é o espírito encarnado e há 3 Ameaças por Mapa. Ficam fora do protótipo: os Mapas 2 e 3, a evolução do povoado, os finais múltiplos e o XP.

## Considered Options

- Protótipo só de mecânica: mais rápido, mas não testa o diferencial (as Provas).
- Campanha resumida com os 3 Mapas: tudo ficaria raso, e a arte por IA precisaria de 3 tilesets logo no início.

## Revisão

Na versão inicial as Provas eram opcionais, e a pergunta era "as Provas fazem o jogador querer explorar?". Elas passaram a ser **obrigatórias para concluir a Fase**, o que simplifica o design e garante que todo jogador conheça a história completa. Consequência: os finais múltiplos (fora do protótipo) passam a depender dos Habitantes resgatados, e não das Provas. A ideia é "as Provas garantem a denúncia; o povo decide se ela vira revolta".
