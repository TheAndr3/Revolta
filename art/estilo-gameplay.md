# Guia de estilo: gameplay (pixel art 16×16)

Camada do jogo em si: tiles, Protagonista, Ameaças, Armadilhas, Totem, Saída, Prova no mapa e sprites de Habitantes. Base: [ADR 0004](../docs/adr/0004-arte-pixel-gameplay-ilustracao-telas.md). Ferramenta: **PixelLab** (gerador especializado em pixel art, que respeita a grade).

Personagens seguem a [diretriz de representação](representacao.md). Cada asset gerado tem o prompt exato guardado em [`art/prompts/`](prompts/README.md).

## Regras da pixel art

| Regra | Valor |
|---|---|
| Grade | **16×16 px** por tile e por quadro de sprite. Sem sub-pixel, sem meio pixel. |
| Paleta | **Só as cores de [`paleta.hex`](paleta.hex)** (32 cores). Importe `paleta.gpl` no editor. Nada de cor fora da paleta, nem por anti-aliasing. |
| Anti-aliasing | Desligado. Bordas duras. |
| Contorno | 1 px, **seletivo**: na cor mais escura do próprio material (ex.: `verde profundo` para folhas, `terra escura` para madeira), não preto puro. Use `noite` só onde precisar separar o personagem do fundo. |
| Luz | Vem **de cima e da esquerda**. Sombra embaixo/à direita, 1 tom mais escuro do mesmo grupo. |
| Sombreamento | 2 a 3 tons por material. Dithering só pontual (água, névoa), nunca em gradiente grande. |
| Fundo do sprite | Transparente. Tiles de chão e parede preenchem os 16×16 inteiros. |
| Leitura | Silhueta reconhecível em 16×16 a 3× de escala no celular. Ameaças precisam ser lidas de longe: use os grupos `empresa` (vermelho, laranja, azul) e `floresta contaminada` (verde-ácido) para elas. |
| Escala no jogo | Inteira (×3 no celular, ×4 no PC). Nunca desenhe pensando em escala fracionada. |

### Cores por elemento (referência)

| Elemento | Grupo / cores principais |
|---|---|
| Chão e paredes da Floresta | `sombra da mata`, `pedra`, `verde profundo`, `verde copa` |
| Água limpa (tile animado) | `água limpa`, `reflexo`, `luz` |
| Floresta contaminada (lodo, árvores doentes) | `lodo`, `verde doente`, `óleo`, `fumaça` |
| Protagonista | tons de pele + roupas do dia a dia; detalhe de luz `espírito` (ele carrega o espírito da mata) |
| Gosma Tóxica | `gosma`, `gosma acesa`, `lodo` |
| Drone Desmatador | `metal`, `vermelho máquina`, `noite` |
| Guarda Florestal | `azul uniforme`, `metal`, `amarelo sinal` (detalhes), tons de pele |
| Espinhos (Estacas da empresa) | `madeira`, `metal`; aviso em `laranja alerta` |
| Totem | `madeira`, `barro`; ativo com `Totem` |
| Saída | apagada em `pedra`/`névoa`; acesa com `espírito` e `luz` |
| Prova no mapa | papel em `luz`/`areia`, destaque `amarelo sinal` |

## Frames de animação (mínimo)

A "vida" vem do código (esticar/achatar, partículas, luz): desenhe só o necessário.

| Asset | Frames |
|---|---|
| Protagonista | idle 2–4 · deslize 1–2 em cada uma das 4 direções · morte "se desfaz em folhas" 4 · reaparecer 4 |
| Gosma | loop 4 |
| Drone | hélice 2–4, visto **de cima** (o código rotaciona) |
| Guarda | andar 4 em cada uma das 4 direções · parado 1 |
| Espinhos | recolhido 1 · aviso 2 · ativo 1 · recolhendo 1 |
| Totem | inativo 1 · ativo em loop 2–4 |
| Saída | apagada 1 · acesa 1 (o brilho é por código) |
| Prova no mapa | papel flutuando 2–4 |
| Habitante | 1 sprite base com variações · escondido 2 · alívio 2–4 |
| Tileset da Floresta | ~40–60 tiles + 1 tile animado (água contaminada) |

Spritesheets: quadros lado a lado na horizontal, 16 px cada, uma linha por animação, na ordem da tabela.

## Prompt-base (PixelLab)

```
16x16 pixel art, top-down view (3/4 for characters), crisp hard edges,
no anti-aliasing, limited palette (use only the provided Re(volta) palette),
1px selective outline in the darkest shade of each material,
light from top-left, 2-3 shades per material,
Amazon rainforest setting, readable silhouette at small size
```

Acrescente o pedido do asset depois do prompt-base. Para personagens, acrescente também o trecho de [representação](representacao.md#como-usar-nos-prompts). Sempre que a ferramenta permitir, **anexe `paleta.png`** como paleta forçada e use as imagens-âncora do teste de estilo como referência.

Prompt negativo:

```
blurry, anti-aliased, gradient, painterly, 3d render, photorealistic,
off-grid pixels, mixed pixel sizes, colors outside palette, text, logo
```

## Checklist antes de aceitar um asset

- [ ] 16×16 por quadro (o `check-assets` da #29 vai conferir o tamanho)
- [ ] Só cores da paleta, sem anti-aliasing
- [ ] Contorno e luz seguem as regras
- [ ] Silhueta legível a ×3
- [ ] Personagem passou pela diretriz de representação (e pela revisão, quando for de pessoa)
- [ ] Prompt salvo em `art/prompts/gameplay/`
- [ ] Arquivo final em `public/assets/` com o nome combinado na issue de integração
