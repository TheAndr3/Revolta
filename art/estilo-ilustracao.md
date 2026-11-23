# Guia de estilo: ilustração pintada (telas)

Camada das telas: 12 ilustrações das Provas, 4 retratos de Habitantes, 3 quadros da introdução e a imagem do Sobre o projeto. Base: [ADR 0004](../docs/adr/0004-arte-pixel-gameplay-ilustracao-telas.md).

Toda ilustração com pessoas segue a [diretriz de representação](representacao.md). Cada imagem gerada tem o prompt exato guardado em [`art/prompts/`](prompts/README.md).

## O estilo

- **Pintura com textura visível** (pincelada, grão de papel), não render 3D nem foto.
- **Tons terrosos** puxados da [paleta](paleta.hex): `terra escura`, `madeira`, `barro`, `areia`, os verdes da floresta viva; o veneno da empresa aparece em `verde doente`, `gosma` e `óleo`; luz e esperança em `espírito` e `luz`. A ilustração pode usar tons intermediários (não é pixel art), mas a cor dominante de cada área vem da paleta.
- **Inspiração em arte popular latino-americana e em gravura** (xilogravura, cordel, cartaz): formas simplificadas, contornos marcados, composição clara, áreas de cor chapada com textura. É uma inspiração de **linguagem gráfica geral**, não de padrões de um povo específico (ver [representação](representacao.md)).
- **Sem texto dentro da imagem.** O texto da Prova fica no HTML.
- **Formato:** 16:10 (ex.: 1600×1000) para Provas, intro e Sobre; 1:1 (ex.: 800×800) para retratos.

## Séries e ferramenta de cada uma

Cada **série** é feita inteira numa mesma ferramenta, com as mesmas imagens-âncora como referência, para não misturar "mãos" diferentes dentro de uma série.

| Série | Quantidade | Ferramenta | Por quê |
|---|---|---|---|
| Provas | 12 | **GPT-image** | Composição de objetos e documentos (diário, carta, laudo, foto) com controle de enquadramento |
| Retratos dos Habitantes | 4 | **Gemini** | Retratos com feições individuais e consistência entre os quatro |
| Quadros da introdução | 3 | **Gemini** | Mesma ferramenta dos retratos: o Protagonista e o povo aparecem nas duas séries |
| Sobre o projeto | 1 | **GPT-image** | Mesma linguagem das Provas |

> Esta divisão é o ponto de partida. O **teste de estilo (#21)** pode trocar a ferramenta de uma série; se trocar, atualize esta tabela e refaça a série inteira na nova ferramenta.

## Imagens-âncora

As imagens-âncora fixam o estilo e são anexadas como referência em todo prompt da série. Elas saem do teste de estilo (#21) e ficam em [`art/ancoras/`](ancoras/README.md).

| Âncora | Usada nas séries | Arquivo |
|---|---|---|
| Ilustração de Prova aprovada no teste de estilo | Provas, Sobre | _a definir em #21_ |
| Retrato aprovado no teste de estilo | Retratos, intro | _a definir em #21_ |

## Prompt-base

```
textured painted illustration, visible brush strokes and paper grain,
earthy palette (deep greens, clay, ochre, dark soil, river teal),
inspired by Latin American folk art and woodcut printmaking,
simplified shapes, bold outlines, clear composition, flat color areas with texture,
Amazon rainforest, no text, no letters, no logos
```

Acrescente o pedido da imagem depois do prompt-base. Para imagens com pessoas, acrescente também o trecho de [representação](representacao.md#como-usar-nos-prompts). Para Provas, descreva o **objeto-documento** (diário, foto com legenda, carta, notícia, laudo, memorando, mensagem de celular) e a cena que ele mostra; o arquivo da Prova traz uma descrição curta da ilustração (#22).

Prompt negativo:

```
3d render, photorealistic, glossy, anime, cartoon mascot, neon colors,
text, letters, watermark, logo, real brand, stereotype, caricature
```

## Checklist antes de aceitar uma imagem

- [ ] Segue o prompt-base e a âncora da série
- [ ] Feita na ferramenta definida para a série
- [ ] Sem texto, logo ou marca real
- [ ] Pessoas seguem a diretriz de representação e passaram pela revisão
- [ ] Prompt salvo em `art/prompts/ilustracao/`
- [ ] Arquivo final em `public/assets/` no caminho usado pelo conteúdo (ex.: o campo `ilustracao` da Prova)
