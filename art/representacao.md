# Diretriz de representação: fazer / evitar

Vale para **todo** prompt de arte (pixel art e ilustração), texto (Provas, falas, fichas, intro, Sobre) e música. Base: [ADR 0005](../docs/adr/0005-povo-ficticio-diretriz-de-representacao.md).

O Protagonista e os Habitantes pertencem a um **povo indígena fictício** que vive na **Amazônia** (bioma real). Não nos inspiramos num povo real específico: usar grafismos, cantos, nomes ou objetos sagrados de um povo existente sem consulta seria apropriação. A IA tende ao "índio genérico" estereotipado; esta diretriz existe para puxar o resultado na direção oposta.

> Esta diretriz **não substitui a revisão humana**. Todo asset e texto de personagem passa pela revisão de representação antes de ser fechado (ver o fim deste arquivo).

## Fazer

- **Pessoas contemporâneas.** Roupas do dia a dia (camiseta, bermuda, chinelo, boné, mochila, celular) convivendo com objetos tradicionais de uso cotidiano (cesto, rede, canoa, roça). O conflito é atual, não "do passado".
- **Diversidade entre os Habitantes.** Idades diferentes (criança, jovem, adulto, idoso), gêneros diferentes, corpos e tons de pele diferentes (use os três tons de pele da paleta e combine com luz e sombra), ofícios diferentes.
- **Voz e saber próprios.** Os personagens sabem coisas (as trilhas, o rio, as plantas, a história do lugar), tomam decisões e resistem. Eles não são só vítimas nem cenário.
- **Território vivo.** Mostre a relação com o lugar no trabalho e no cotidiano: pescar, plantar, cuidar das crianças, consertar a casa.
- **Expressões e poses variadas**, como de qualquer pessoa: alívio, cansaço, raiva, humor, cuidado.
- **Empresa e seus agentes** representados pelo que fazem (máquinas, uniformes, placas, papéis), sem caricatura étnica de ninguém.

## Evitar

- **Cocar genérico, pintura corporal genérica, penas como "fantasia"**, tanga como roupa padrão, arco e flecha como acessório de pose.
- **Grafismos, padrões, cantos, instrumentos ou objetos sagrados de povos reais** (nem "inspirados em"). Padrões decorativos do jogo são formas simples criadas pela equipe, sem referência a um povo específico.
- **Nomes pseudo-indígenas inventados** (palavras que imitam línguas indígenas). Como nomear o povo e os personagens é uma **decisão pendente com o revisor** (ver abaixo); até lá, use nomes provisórios descritivos ("Habitante da Mata", "Pescadora do igarapé").
- **O "índio genérico" em qualquer forma**: um só tipo físico, expressão estoica e triste, pose de estátua, "selvagem", "primitivo", "exótico", "místico".
- **Sofrimento como espetáculo**: violência explícita, corpos feridos em close, choro em primeiro plano. Mostre as consequências no território (rio turvo, árvores no chão), não humilhação de pessoas.
- **Salvador de fora**: a narrativa e a arte não colocam alguém de fora como quem resolve tudo.
- **Empresas ou pessoas reais** identificáveis (logos, rostos, nomes).

## Como usar nos prompts

Todo prompt de personagem inclui, além do prompt-base do guia da camada:

```
contemporary Indigenous person from a fictional Amazonian community,
everyday clothes (t-shirt, shorts, flip-flops) with everyday traditional objects,
natural expression, individual features, no headdress, no body paint,
no feathers, no sacred or ceremonial objects, no tribal patterns
```

E no prompt negativo (quando a ferramenta aceitar):

```
headdress, war bonnet, feathers costume, tribal face paint, body paint,
loincloth, tomahawk, bow and arrow pose, stereotype, caricature,
noble savage, mystic shaman, logos, real brands
```

Os guias [estilo-gameplay.md](estilo-gameplay.md) e [estilo-ilustracao.md](estilo-ilustracao.md) já trazem esses trechos nos prompts-base.

## Revisão humana

- **Quando:** no teste de estilo (#21) e antes de fechar qualquer asset ou texto de personagem (Habitantes, Protagonista, retratos, falas, fichas, intro).
- **Quem:** a pessoa revisora de representação combinada no dia 1 do cronograma.
- **Registro:** no arquivo de prompt do asset (`art/prompts/...`), campo `revisao_representacao` com quem revisou, quando e o resultado (aprovado / ajustar: o quê).
- **Decisões pendentes com o revisor:**
  - como nomear o povo e os personagens;
  - se algum elemento visual recorrente (ex.: um padrão decorativo da equipe) precisa de ajuste.
