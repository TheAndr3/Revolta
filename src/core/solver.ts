/**
 * Solver estático de Fases (ADR 0003): valida o desenho sem simular o tempo das Ameaças.
 *
 * - R11: existe rota que coleta as 3 Provas e atravessa a Saída (busca em largura
 *   sobre célula de parada + Provas coletadas). Cada deslize é simulado pelo próprio
 *   núcleo do jogo (`solicitarDirecao` + `atualizarDeslize`), sem duplicar a regra.
 * - Habitante e Almas alcançáveis (aviso, não erro).
 * - R09: nenhum Totem em trilho de Ameaça.
 * - R08: trilhos de Ameaças não se cruzam.
 */
import {
  atualizarDeslize,
  criarEstadoFase,
  fecharProvaEmExibicao,
  solicitarDirecao,
  type Direcao,
  type OpcoesEstadoFase,
} from './deslize';
import { TOTAL_PROVAS_FASE, type Coordenada, type Fase, type NumeroProva } from './fase';

export interface ResultadoSolver {
  readonly valida: boolean;
  readonly erros: readonly string[];
  readonly avisos: readonly string[];
  /** Rota mínima em número de deslizes (referência de dificuldade), ou `null` sem solução. */
  readonly rotaMinima: readonly Direcao[] | null;
  /** Quantidade de estados (célula de parada + Provas) visitados pela busca. */
  readonly estadosExplorados: number;
}

const DIRECOES: readonly Direcao[] = ['cima', 'baixo', 'esquerda', 'direita'];

/**
 * O solver ignora o tempo: sem Ameaças nem ciclo dos espinhos (que não bloqueiam,
 * já que dá para sair de cima deles durante o aviso). `simularEspinhos` só existe
 * a partir da #15; num objeto em variável a propriedade extra é aceita antes disso.
 */
const OPCOES_ESTATICAS = { simularAmeacas: false, simularEspinhos: false };

export function formatarCoordenada(coord: Coordenada): string {
  return `(${coord.col},${coord.lin})`;
}

interface ResultadoDeslize {
  readonly parada: Coordenada;
  readonly provas: readonly NumeroProva[];
  readonly resgatouHabitante: boolean;
  /** Índices das Almas atravessadas neste deslize. */
  readonly almas: readonly number[];
  readonly concluiu: boolean;
}

/** Simula um único deslize a partir de uma célula de parada, com o núcleo do jogo. */
function simularDeslize(
  fase: Fase,
  origem: Coordenada,
  provas: readonly NumeroProva[],
  direcao: Direcao,
): ResultadoDeslize | null {
  const opcoes: OpcoesEstadoFase = { ...OPCOES_ESTATICAS, provasJaColetadas: provas };
  const estado = criarEstadoFase(fase, opcoes);
  estado.posicao = { x: origem.col, y: origem.lin };
  estado.celulaAtual = { col: origem.col, lin: origem.lin };

  solicitarDirecao(estado, direcao);
  if (!estado.deslizando) {
    return null; // contra a parede: só o "tranco"
  }

  for (let i = 0; i < 64 && (estado.deslizando || estado.provaEmExibicao !== null); i++) {
    if (estado.provaEmExibicao !== null) {
      fecharProvaEmExibicao(estado);
    } else {
      atualizarDeslize(estado, 1);
    }
  }

  if (estado.mortes > 0 || estado.deslizando) {
    return null;
  }

  return {
    parada: { col: estado.celulaAtual.col, lin: estado.celulaAtual.lin },
    provas: [...estado.provasColetadas].sort(),
    resgatouHabitante: estado.habitanteResgatado,
    almas: estado.almasColetadas.flatMap((pega, i) => (pega ? [i] : [])),
    concluiu: estado.concluida,
  };
}

interface NoBusca {
  readonly parada: Coordenada;
  readonly provas: readonly NumeroProva[];
  readonly anterior: NoBusca | null;
  readonly direcao: Direcao | null;
}

function chaveNo(parada: Coordenada, provas: readonly NumeroProva[]): string {
  return `${parada.col},${parada.lin}|${provas.join('')}`;
}

function reconstruirRota(no: NoBusca, ultima: Direcao): Direcao[] {
  const rota: Direcao[] = [ultima];
  for (let atual: NoBusca | null = no; atual?.direcao; atual = atual.anterior) {
    rota.push(atual.direcao);
  }
  return rota.reverse();
}

function buscarRota(fase: Fase): {
  rota: Direcao[] | null;
  provasAlcancadas: Set<NumeroProva>;
  habitanteAlcancado: boolean;
  almasAlcancadas: Set<number>;
  explorados: number;
} {
  const inicio: NoBusca = { parada: fase.inicio, provas: [], anterior: null, direcao: null };
  const visitados = new Set([chaveNo(inicio.parada, inicio.provas)]);
  const provasAlcancadas = new Set<NumeroProva>();
  const almasAlcancadas = new Set<number>();
  let habitanteAlcancado = false;
  let fila: NoBusca[] = [inicio];
  let rota: Direcao[] | null = null;

  const faltaAlgoOpcional = () =>
    (fase.habitante !== null && !habitanteAlcancado) || almasAlcancadas.size < fase.almas.length;

  // Busca em largura: a primeira rota achada é a mínima. Depois de achá-la, a busca
  // continua só enquanto falta saber se o Habitante e todas as Almas são alcançáveis.
  while (fila.length > 0 && (rota === null || faltaAlgoOpcional())) {
    const proxima: NoBusca[] = [];
    for (const no of fila) {
      for (const direcao of DIRECOES) {
        const resultado = simularDeslize(fase, no.parada, no.provas, direcao);
        if (!resultado) continue;

        resultado.provas.forEach((p) => provasAlcancadas.add(p));
        resultado.almas.forEach((a) => almasAlcancadas.add(a));
        habitanteAlcancado ||= resultado.resgatouHabitante;

        if (resultado.concluiu) {
          rota ??= reconstruirRota(no, direcao);
          continue;
        }

        const chave = chaveNo(resultado.parada, resultado.provas);
        if (visitados.has(chave)) continue;
        visitados.add(chave);
        proxima.push({ parada: resultado.parada, provas: resultado.provas, anterior: no, direcao });
      }
    }
    fila = proxima;
  }

  return { rota, provasAlcancadas, habitanteAlcancado, almasAlcancadas, explorados: visitados.size };
}

function verificarTotensEmTrilho(fase: Fase): string[] {
  const erros: string[] = [];
  for (const totem of fase.totens) {
    for (const ameaca of fase.ameacas) {
      if (ameaca.trilho.some((c) => c.col === totem.col && c.lin === totem.lin)) {
        erros.push(
          `Totem em ${formatarCoordenada(totem)} está no trilho da Ameaça ${ameaca.id} (R09).`,
        );
      }
    }
  }
  return erros;
}

function verificarTrilhosCruzados(fase: Fase): string[] {
  const erros: string[] = [];
  const ameacas = fase.ameacas;
  for (let i = 0; i < ameacas.length; i++) {
    const celulasA = new Set(ameacas[i].trilho.map((c) => `${c.col},${c.lin}`));
    for (let j = i + 1; j < ameacas.length; j++) {
      const comuns = ameacas[j].trilho.filter((c) => celulasA.has(`${c.col},${c.lin}`));
      const unicas = [...new Map(comuns.map((c) => [`${c.col},${c.lin}`, c])).values()];
      if (unicas.length > 0) {
        erros.push(
          `Os trilhos de ${ameacas[i].id} e ${ameacas[j].id} se cruzam em ${unicas
            .map(formatarCoordenada)
            .join(', ')} (R08).`,
        );
      }
    }
  }
  return erros;
}

export function resolverFase(fase: Fase): ResultadoSolver {
  const erros: string[] = [...verificarTotensEmTrilho(fase), ...verificarTrilhosCruzados(fase)];
  const avisos: string[] = [];

  const busca = buscarRota(fase);

  if (busca.rota === null) {
    const inalcancaveis = fase.provas.filter((p) => !busca.provasAlcancadas.has(p.numero));
    if (inalcancaveis.length > 0) {
      for (const prova of inalcancaveis) {
        erros.push(
          `Prova ${prova.numero} em ${formatarCoordenada(prova.posicao)} é inalcançável a partir do Início (R11).`,
        );
      }
    } else if (busca.provasAlcancadas.size < TOTAL_PROVAS_FASE) {
      erros.push(`A Fase não tem as ${TOTAL_PROVAS_FASE} Provas (R11).`);
    } else {
      erros.push(
        `Nenhuma rota coleta as ${TOTAL_PROVAS_FASE} Provas e depois atravessa a Saída em ${formatarCoordenada(
          fase.saida,
        )} (R11).`,
      );
    }
  }

  if (fase.habitante && !busca.habitanteAlcancado) {
    avisos.push(
      `Habitante em ${formatarCoordenada(fase.habitante)} não é alcançável: ninguém conseguirá resgatá-lo.`,
    );
  }

  const almasInalcancaveis = fase.almas.filter((_, i) => !busca.almasAlcancadas.has(i));
  if (almasInalcancaveis.length > 0) {
    avisos.push(
      `${almasInalcancaveis.length} Alma(s) inalcançável(is): ${almasInalcancaveis
        .map(formatarCoordenada)
        .join(', ')}. Ninguém conseguirá a Marca de todas as Almas.`,
    );
  }

  return {
    valida: erros.length === 0,
    erros,
    avisos,
    rotaMinima: busca.rota,
    estadosExplorados: busca.explorados,
  };
}
