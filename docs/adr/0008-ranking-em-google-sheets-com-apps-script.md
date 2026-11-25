# Ranking em Google Sheets com Apps Script

O Ranking de cada Fase (os dez menores tempos, com 3 letras) fica numa **planilha do Google Sheets**, lida e gravada por um **Apps Script publicado como App da Web**. O jogo é estático no GitHub Pages e não tem servidor próprio; a planilha dá infraestrutura zero, a equipe vê e corrige os tempos na mão, e o serviço não "dorme" por falta de uso.

O Apps Script responde em 1 a 3 s (mais na primeira chamada depois de um tempo parado). Para o jogador nunca esperar por isso, o cliente:

1. **pré-carrega o top 10 ao entrar na Fase** e guarda uma cópia no navegador;
2. **decide sozinho se o tempo entra no top 10**, comparando com essa cópia, e já pede as letras;
3. **envia por uma caixa de saída** no navegador: o tempo é guardado antes de sair e reenviado na próxima abertura se a rede falhar. Nenhum tempo se perde.

A planilha guarda tudo o que recebe e nunca apaga; o top 10 é calculado na leitura (menor tempo; empate, quem gravou antes). Só tempos que entram no top 10 são enviados, e a mesma sigla pode aparecer várias vezes.

## Considered Options

- **Cloudflare Worker + KV/D1:** sem cold start e mais robusto, mas exige conta, deploy e mais código; fica como saída se o jogo crescer (o cliente só troca a URL).
- **Supabase (plano grátis):** pausa o projeto depois de 7 dias sem uso, justamente o problema a evitar.
- **Firebase Firestore:** sem pausa e rápido, mas o SDK pesa e as regras de segurança dão mais trabalho que o protótipo justifica.

## Consequences

- Não há proteção real contra trapaça: a URL é pública e o JS também. O script só barra o óbvio (3 letras A–Z, Fase conhecida, tempo inteiro em ms entre um piso e 2 h) e grava com `LockService`. O Apps Script não informa o IP, então não há limite por pessoa. Tempo falso se apaga na planilha.
- O piso de tempo é 80% do mínimo teórico da Fase (rota mais rápida só deslizando, sem reação nem espera de Ameaças): 8,43 s na Fase 1, piso de 6,7 s.
- Rodando em `localhost`, o jogo grava na aba `Testes`, nunca no Ranking real. Os testes automáticos não tocam a rede.
- O Ranking é identificado só pelo id da Fase, sem versão: se o mapa mudar, os tempos antigos continuam valendo.
- O script fica versionado em `scripts/ranking-apps-script.gs`; publicá-lo é manual (Extensões → Apps Script → Implantar → App da Web, acesso "qualquer pessoa").
