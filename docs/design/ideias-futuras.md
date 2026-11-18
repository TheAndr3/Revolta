# Ideias futuras (fora do protótipo)

Ideias discutidas e deixadas de fora do protótipo de propósito. Ficam aqui para virar issues depois do playtest.

## Armadilhas

### Solo que cede (permanente)
Nome provisório: *Solo contaminado*. Ao passar por cima, após 0,5 s o tile cede e **vira parede** permanentemente (proposta: não mata). Cria **rotas de mão única**: o desvio para buscar uma Prova vira uma decisão sem volta, o que reforça a tensão "arrisco ou não?".
- Requer: botão "voltar ao Totem" e o solver detectando possíveis softlocks (estados sem caminho para a Saída).

### Disparo de parede
Nome provisório: *Armadilha de caça*. Fica numa parede; se o Protagonista **parar ao lado**, após 0,5 s ela dispara na direção dele. Torna as paradas perigosas, que é a essência do deslize.
- Risco: parecer injusta se a armadilha não for bem visível na parede.
- Melhor entrar depois que o deslize básico estiver validado no playtest.

## Ameaças

### Facho da lanterna do Guarda Florestal
Área de perigo de 3 tiles à frente do Guarda, na direção em que ele anda ou olha (girando nas pausas). Continua determinística (não reage ao jogador), então é compatível com o ADR 0003.

### Ameaças reativas (modelo híbrido)
Ameaças que veem o jogador (cone de visão) e reagem, por exemplo correndo até um ponto fixo. Vão ser necessárias para o Guarda de Elite e a Câmera de Vigilância da Sede (Mapa 3). Quebram parte da validação do solver.

## Cortados pelo prazo de uma semana

- **Fases 5 e 6:** a progressão original tinha 6 Fases, uma por perigo (paredes, espinhos, Gosma, Drone, Guarda, combinação), com 18 Provas e 6 Habitantes.
- **Solver com tempo:** simular "posição + instante" das Ameaças para garantir que as rotas de patrulha não bloqueiam a Fase (ADR 0003).
- **Preview PNG** das Fases transcritas, gerado por script.
- **Checagem de paleta** no `check-assets`.
- **Intro com 4–6 quadros** (no protótipo são 3).
- **Músicas extras:** faixa calma para menu/Arquivo e vinheta de Fase concluída.

## Narrativa

### Encerramento do Mapa
2 a 4 quadros ilustrados ao terminar um Mapa, costurando a história das Provas dele, com a ponte para o próximo Mapa ("continua...").

## Telas

### Opções e créditos
Controle de volume e tela de créditos no menu principal.

## Protagonista

### Habilidade do espírito
Uma ação extra além do deslize (por exemplo, parar no meio, atravessar uma Ameaça, revelar Provas). Pode se conectar aos habitantes resgatados concederem habilidades (documento longo, seção 6).
