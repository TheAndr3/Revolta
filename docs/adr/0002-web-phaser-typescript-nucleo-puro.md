# Web com Phaser 3 + TypeScript, e a lógica do jogo num núcleo puro

O jogo roda no navegador (teclado no PC, swipe no celular), para que o playtest seja só um link. Usamos Phaser 3 + TypeScript + Vite, e não uma engine com editor, porque todo o projeto é produzido por IA e por duas pessoas via git: um projeto feito só de código e texto é editável por agentes de ponta a ponta e fácil de mesclar. A lógica do deslize, das colisões e das Ameaças fica num núcleo TypeScript sem dependência do Phaser, testável isoladamente. Isso permite um solver que valida automaticamente as Fases geradas por IA. As Provas e o Arquivo da Resistência são HTML/CSS sobreposto ao canvas.

## Considered Options

- Godot 4: melhor caminho para lançar nativo/Steam no futuro, mas o build web é pesado (~30–40 MB) e parte do projeto vive no editor, fora do alcance dos agentes.
- Unity 6 (WebGL): pesado no celular, centrado no editor, merge ruim no git.
- KAPLAY: leve e simples, mas limitado para menus, overlays e uma campanha com várias Fases.

## Consequences

- Um port nativo, se houver, passa por Capacitor/Electron, e não por reescrita.
- Não há editor visual de fases: as Fases são arquivos de texto, e as ferramentas (solver, preview) são nossas.
