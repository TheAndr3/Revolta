/**
 * Arquivo da Resistência (#18): abas Provas e Povo, refletindo o progresso salvo.
 */
import { TIPO_PROVA_POR_NUMERO, type NumeroProva } from '../core/fase';
import type { ConteudoHabitante } from '../core/habitantes';
import type { EntradaCatalogoFase } from '../core/progresso';
import { ROTULO_TIPO_PROVA, type ConteudoProva } from '../core/provas';
import type { RepositorioProgresso } from './armazenamentoProgresso';
import { carregarConteudoHabitanteDaFase } from './carregarHabitante';
import { carregarConteudoProvasDaFase, type MapaConteudoProvas } from './carregarProvas';
import { formatarTexto, TEXTOS } from './textos';

const NUMEROS_PROVA: readonly NumeroProva[] = [1, 2, 3];

type NomeAba = 'provas' | 'povo';

export interface OpcoesArquivo {
  readonly catalogo: readonly EntradaCatalogoFase[];
  readonly progresso: RepositorioProgresso;
  readonly resolverUrlAsset: (caminho: string) => string;
  readonly abrirProva: (prova: ConteudoProva) => void;
}

export interface ControleArquivo {
  /** Remonta as duas abas com o progresso atual (chamar sempre que a tela abrir). */
  renderizar(): void;
}

function elemento<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classe?: string,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function buscar(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento esperado do DOM não encontrado: #${id}`);
  return el;
}

function tentarCarregarProvas(conteudo: string): MapaConteudoProvas | null {
  try {
    return carregarConteudoProvasDaFase(conteudo);
  } catch {
    return null;
  }
}

function tentarCarregarHabitante(conteudo: string): ConteudoHabitante | null {
  try {
    return carregarConteudoHabitanteDaFase(conteudo);
  } catch {
    return null;
  }
}

export function criarArquivo(opcoes: OpcoesArquivo): ControleArquivo {
  const { catalogo, progresso } = opcoes;
  const abas: Record<NomeAba, HTMLElement> = {
    provas: buscar('aba-provas'),
    povo: buscar('aba-povo'),
  };
  const paineis: Record<NomeAba, HTMLElement> = {
    provas: buscar('painel-provas'),
    povo: buscar('painel-povo'),
  };

  const selecionarAba = (nome: NomeAba, focar: boolean) => {
    for (const chave of Object.keys(abas) as NomeAba[]) {
      const ativa = chave === nome;
      abas[chave].setAttribute('aria-selected', String(ativa));
      abas[chave].tabIndex = ativa ? 0 : -1;
      paineis[chave].hidden = !ativa;
    }
    if (focar) abas[nome].focus();
  };

  abas.provas.addEventListener('click', () => selecionarAba('provas', false));
  abas.povo.addEventListener('click', () => selecionarAba('povo', false));
  // Setas alternam entre as abas (padrão de tablist).
  for (const aba of Object.values(abas)) {
    aba.addEventListener('keydown', (evento) => {
      if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
      evento.preventDefault();
      selecionarAba(abas.provas.getAttribute('aria-selected') === 'true' ? 'povo' : 'provas', true);
    });
  }

  const renderizarProvas = () => {
    let coletadas = 0;
    const secoes = catalogo.map((entrada) => {
      const secao = elemento('section', 'arquivo-fase');
      const titulo = elemento('h2', 'arquivo-fase-titulo', entrada.nome);
      if (entrada.subtitulo) {
        titulo.append(elemento('span', 'arquivo-fase-subtitulo', ` · ${entrada.subtitulo}`));
      }
      secao.append(titulo);

      const conteudo = tentarCarregarProvas(entrada.conteudo);
      if (!conteudo) {
        secao.append(elemento('p', 'texto-suave', TEXTOS.arquivo.conteudoIndisponivel));
        return secao;
      }

      const lista = elemento('ul', 'arquivo-provas');
      for (const numero of NUMEROS_PROVA) {
        const prova = conteudo[numero];
        const coletada = progresso.provaColetada(entrada.id, numero);
        const item = elemento('li');
        const cartao = elemento('button', 'cartao-prova');
        cartao.type = 'button';
        cartao.dataset.coletada = String(coletada);
        cartao.append(
          elemento('span', 'cartao-prova-tipo', ROTULO_TIPO_PROVA[TIPO_PROVA_POR_NUMERO[numero]]),
          elemento(
            'span',
            'cartao-prova-titulo',
            coletada ? prova.titulo : TEXTOS.arquivo.desconhecido,
          ),
        );
        if (coletada) {
          coletadas += 1;
          cartao.append(elemento('span', 'cartao-prova-formato', prova.formato));
          cartao.setAttribute(
            'aria-label',
            formatarTexto(TEXTOS.arquivo.abrirProva, {
              tipo: prova.rotuloTipo,
              titulo: prova.titulo,
            }),
          );
          cartao.addEventListener('click', () => opcoes.abrirProva(prova));
        } else {
          cartao.disabled = true;
          cartao.append(elemento('span', 'cartao-prova-formato', TEXTOS.arquivo.provaBloqueada));
        }
        item.append(cartao);
        lista.append(item);
      }
      secao.append(lista);
      return secao;
    });

    const resumo = elemento(
      'p',
      'arquivo-resumo',
      formatarTexto(TEXTOS.arquivo.resumoProvas, {
        coletadas,
        total: catalogo.length * NUMEROS_PROVA.length,
      }),
    );
    paineis.provas.replaceChildren(resumo, ...secoes);
  };

  const renderizarPovo = () => {
    let resgatados = 0;
    const lista = elemento('ul', 'arquivo-povo');
    for (const entrada of catalogo) {
      const habitante = tentarCarregarHabitante(entrada.conteudo);
      const resgatado = habitante !== null && progresso.habitanteResgatado(entrada.id);
      if (resgatado) resgatados += 1;

      const ficha = elemento('li', 'ficha-habitante');
      ficha.dataset.resgatado = String(resgatado);

      const retrato = elemento('img', 'ficha-retrato');
      retrato.loading = 'lazy';
      if (habitante) {
        retrato.src = opcoes.resolverUrlAsset(habitante.retrato);
      }
      retrato.alt = resgatado && habitante
        ? formatarTexto(TEXTOS.arquivo.retrato, { nome: habitante.nome })
        : TEXTOS.arquivo.silhueta;

      const corpo = elemento('div', 'ficha-corpo');
      corpo.append(elemento('span', 'ficha-fase', entrada.nome));
      if (resgatado && habitante) {
        corpo.append(
          elemento('strong', 'ficha-nome', habitante.nome),
          elemento('p', 'ficha-frase', habitante.papel),
        );
      } else {
        corpo.append(
          elemento('strong', 'ficha-nome', TEXTOS.arquivo.desconhecido),
          elemento('p', 'ficha-frase', TEXTOS.arquivo.habitanteNaoResgatado),
        );
      }

      ficha.append(retrato, corpo);
      lista.append(ficha);
    }

    const resumo = elemento(
      'p',
      'arquivo-resumo',
      formatarTexto(TEXTOS.arquivo.resumoPovo, { resgatados, total: catalogo.length }),
    );
    paineis.povo.replaceChildren(resumo, lista);
  };

  return {
    renderizar: () => {
      renderizarProvas();
      renderizarPovo();
    },
  };
}
