# Ameaças em tempo real com ciclos determinísticos

As Ameaças se movem em tempo real, mas sempre em trilhos e ritmos fixos (loops, vai-e-volta, rondas com pausa), sem aleatoriedade e sem perseguir o Protagonista. Com isso, toda tentativa de uma Fase se comporta igual: a Fase é aprendível e justa, as rotas se desenham no papel como setas mais uma velocidade, e o solver consegue simular "posição + instante" para garantir que as Fases desenhadas à mão têm solução mesmo com as Ameaças. A pausa do overlay da Prova não afeta a justiça da Fase.

## Considered Options

- Tempo real livre (perseguição/aleatório): mais ação, mas o solver não valida as Ameaças e as Fases ficam injustas entre tentativas.
- Por turno: puzzle totalmente validável, mas briga com o deslize (atravessar 1 ou 20 tiles conta como um turno) e perde o ritmo.
- Híbrido com Ameaças reativas (cone de visão): adiado para depois do protótipo.

## Consequences

- No protótipo (prazo de uma semana) o solver é só estático; a simulação com tempo fica para depois. O determinismo continua valendo, porque é o que torna as Fases justas e aprendíveis.
- Ameaças que "perseguem" (por exemplo, o Guarda de Elite da Sede) vão precisar de um modelo novo quando o Mapa 3 entrar, provavelmente o híbrido.
