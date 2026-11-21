# Re(volta)

Jogo 2D de labirinto com movimento por deslize sobre educação ambiental crítica (Phaser 3 + TypeScript + Vite).

## Como rodar localmente

Pré-requisito: **Node.js 20+** (inclui `npm`).

```bash
# 1. Instalar as dependências
npm install

# 2. Subir o servidor de desenvolvimento
npm run dev
```

Abra o endereço exibido no terminal (normalmente `http://localhost:5173`).

### Comandos úteis

- `npm run dev` — inicia o jogo em modo desenvolvimento (hot reload)
- `npm test` — executa os testes automatizados do núcleo puro (Vitest)
- `npm run build` — valida tipos TypeScript (`tsc --noEmit`) e gera o build de produção em `dist/`
- `npm run preview` — pré-visualiza localmente o build de produção

### Controles

- **PC:** setas direcionais ou `WASD` para deslizar; `R` para reiniciar a Fase.
- **Celular:** deslize o dedo (swipe) em qualquer lugar da área do jogo.

### Deploy no GitHub Pages

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) publica automaticamente a cada push na branch `main`. Na primeira vez, ative **Settings → Pages → Build and deployment → Source: GitHub Actions** no repositório.
