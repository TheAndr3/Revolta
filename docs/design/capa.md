# Capa e logo

A capa e o menu ficam sobre uma **abertura animada**: a floresta à noite, as ruínas da aldeia, o Protagonista agachado na clareira, Almas azuis subindo, vagalumes, névoa e cogumelos que brilham. A logo deixa de ser o texto "Re(volta)" e vira um desenho em pixel art: **RE** em cima e **VOLTA** embaixo, sem os parênteses.

Código: [`src/game/capaAnimada.ts`](../../src/game/capaAnimada.ts) (cena e animação) e [`src/game/logoRevolta.ts`](../../src/game/logoRevolta.ts) (logo, pura e testada).

## A logo

As duas partes têm estéticas diferentes e se leem juntas como "REVOLTA":

| Parte | O que é | Como aparece |
|---|---|---|
| **RE** | o espírito da floresta | Letras finas em azul de Alma (`Totem`, `luz`), contorno de `água limpa`, brilho pulsante, flutuando 1 px; faíscas acendem em volta e pequenas almas descem dele até o VOLTA |
| **VOLTA** | a terra (e a revolta) | Letras grossas de traço 3 px em faixas de `areia`, `barro` e `madeira`, com bisel, contorno `noite`, rachaduras de `óleo`, musgo verde no topo com pingos, folhas que balançam e raízes descendo |

A leitura: o espírito volta à terra, e a terra se revolta. Todas as cores são da paleta (`art/paleta.hex`), e as letras são desenhadas pixel a pixel, sem fonte externa. O nome visível do jogo nas telas passou a ser "Revolta" (`content/telas.json`).

## A cena, de trás para a frente

1. **Céu** em três faixas da paleta, com transição em pontilhado ordenado (Bayer 4×4). A primeira transição fica abaixo da logo: o céu atrás dela é liso.
2. **Copas ao longe**: duas fileiras de silhueta que deslizam devagar (paralaxe).
3. **Aura** verde e azul atrás do Protagonista, pulsando. É o único ponto claro da cena.
4. **Meio**: árvores CC0 dos lados, a ruína de pedra e casas da aldeia perto da clareira, tudo escurecido para recuar.
5. **Névoa** baixa em duas faixas que se cruzam.
6. **Chão**: grama escura e a trilha de terra, que sai dos pés do Protagonista e desce até a borda. Na beira da trilha só há arbustos e cogumelos, a mesma regra do jogo.
7. **Protagonista** agachado, respirando: a metade de cima sobe e desce 1 px.
8. **Almas** subindo, com núcleo claro e brilho azul, e **vagalumes** piscando em lima.
9. **Frente**: capim escuro nos cantos de baixo, e uma vinheta.

Com `prefers-reduced-motion`, a cena fica num quadro parado e o botão e o subtítulo não pulsam.

## Referências (princípios, não visual copiado)

- O cenário não pode competir com o título. Num exemplo, a cor de um horizonte próximo atrapalhava a leitura da logo ([PixelJoint](https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=14179)). Por isso o céu atrás da logo é liso e escuro.
- Paralaxe suave e luz discreta dão profundidade sem tirar a nitidez dos sprites ([inkl](https://www.inkl.com/news/why-2d-game-art-is-thriving-in-2025-and-how-you-can-do-it-too)). Pixel art pede poucas cores, sem degradês lisos ([wiki de design de tela de título](https://github-wiki-see.page/m/UQdeco2800/2021-studio-6/wiki/Title-Screen-Design-Documentation)), e por isso usamos faixas com pontilhado.
- A capa precisa passar o clima do jogo, não só ter botões ([PixelJoint](https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=26297), [devlog](https://projectlevel.itch.io/bubblegum-zombie-hunter/devlog/335493/designing-a-title-screen)).
- Uma logo boa tem contraste com o fundo, forma simples e um foco claro, e continua legível pequena ([bugnet](https://bugnet.io/blog/how-to-design-a-memorable-game-logo), [Game Developer](https://gamedeveloper.com/art/designing-game-logos), [GamineAI](https://gamineai.com/blog/creating-game-icons-and-logos-design-principles-game-branding)). Uma logo expressiva para a capa pode conviver com uma marca simplificada para usos pequenos ([presskit.gg](https://presskit.gg/field-guides/game-logo-design-guide)).

## Pendências

- **Ícone pequeno** (favicon e ícone do app): pode ser só o "RE" azul, que se lê bem em tamanho pequeno.
- **Arte final:** se o Protagonista ganhar um sprite novo (#24), a capa usa o mesmo arquivo `assets/protagonista.png`.

## Revisão de 25/11/2026: o dash pela floresta

A capa deixou de mostrar o Protagonista agachado na clareira. Agora ele aparece **em dash de lado**, no centro, usando os quadros de deslize da spritesheet em 2×, com ecos verdes, linhas de velocidade e folhas atrás. Ele avança e recua devagar e flutua 1–2 px. A floresta passa por ele em paralaxe, com cada camada indo para a esquerda na sua velocidade: copas ao longe (6 px/s), árvores e ruínas (22), trilha lateral com arbustos e cogumelos (70) e capim da frente (110). Ficaram como estavam a logo, as Almas azuis subindo (agora levadas pelo vento do dash), os vagalumes, a névoa e a vinheta. Com movimento reduzido, a cena fica parada num quadro do dash.
