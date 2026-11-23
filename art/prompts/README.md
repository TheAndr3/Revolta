# Convenção dos prompts

Todo asset gerado por IA tem o **prompt exato** guardado aqui, para que qualquer pessoa da equipe consiga refazer, ajustar ou continuar uma série com o mesmo resultado.

## Onde guardar

```
art/prompts/
  gameplay/      ← pixel art (PixelLab)
    protagonista.md
    gosma.md
    tileset-floresta.md
    ...
  ilustracao/    ← telas (Gemini / GPT-image)
    prova-fase-01-1-passado.md
    retrato-fase-01.md
    intro-quadro-1.md
    ...
```

- **Um arquivo por asset** (um spritesheet conta como um asset).
- **Nome do arquivo = nome do asset** em minúsculas, com hífens, igual ao nome do arquivo final em `public/assets/` sem a extensão. Ex.: `public/assets/provas/fase-01-1-passado.png` → `art/prompts/ilustracao/prova-fase-01-1-passado.md`.
- Se o asset foi refeito, **não apague** a tentativa anterior: acrescente uma nova seção "Versão N" no mesmo arquivo, com o novo prompt, e marque qual versão está em uso.

## O que cada arquivo registra

Copie o [modelo](_modelo.md) e preencha:

| Campo | O quê |
|---|---|
| `asset` | Caminho do arquivo final em `public/assets/` |
| `camada` | `gameplay` ou `ilustracao` |
| `serie` | Ex.: `provas`, `retratos`, `intro`, `ameacas` |
| `ferramenta` | PixelLab, Gemini ou GPT-image, com modelo/versão |
| `data` | Quando foi gerado (AAAA-MM-DD) |
| `semente` | Seed, se a ferramenta mostrar |
| `referencias` | Imagens-âncora e paleta anexadas |
| `revisao_representacao` | Para personagens: quem revisou, quando, resultado |
| Prompt | O texto **exato** enviado, com prompt-base incluído |
| Prompt negativo | O texto exato, se usado |
| Ajustes manuais | O que foi editado à mão depois (recorte, cor, pixel corrigido) |

## Por que isso importa

- As duas pessoas da equipe geram arte em paralelo: o prompt salvo é o que mantém a série coerente.
- A revisão de representação precisa saber exatamente o que foi pedido à IA.
- Se uma ferramenta mudar de versão, o registro mostra o que refazer.
