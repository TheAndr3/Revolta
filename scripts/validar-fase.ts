/**
 * Valida Fases com o solver estático.
 *
 *   npm run validar-fase                       # todas as Fases em public/fases/
 *   npm run validar-fase -- public/fases/x.txt # uma ou mais Fases
 *
 * Sai com código 1 se alguma Fase for inválida (erro de formato ou de desenho).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { ErroParseFase, parseFase } from '../src/core/parser';
import { resolverFase } from '../src/core/solver';

const PASTA_FASES = resolve(process.cwd(), 'public/fases');

function listarFasesPadrao(): string[] {
  return readdirSync(PASTA_FASES)
    .filter((nome) => nome.endsWith('.txt'))
    .sort()
    .map((nome) => join(PASTA_FASES, nome));
}

function validarArquivo(caminho: string): boolean {
  const nome = relative(process.cwd(), caminho);
  console.log(`\n${nome}`);

  let fase;
  try {
    fase = parseFase(readFileSync(caminho, 'utf-8'));
  } catch (erro) {
    const mensagem =
      erro instanceof ErroParseFase || erro instanceof Error ? erro.message : String(erro);
    console.log(`  ✘ formato inválido: ${mensagem}`);
    return false;
  }

  const resultado = resolverFase(fase);
  for (const erro of resultado.erros) console.log(`  ✘ ${erro}`);
  for (const aviso of resultado.avisos) console.log(`  ⚠ ${aviso}`);

  if (resultado.rotaMinima) {
    console.log(
      `  ✔ rota mínima: ${resultado.rotaMinima.length} deslizes (${resultado.rotaMinima.join(' → ')})`,
    );
  }
  console.log(
    resultado.valida
      ? `  ✔ válida (${resultado.estadosExplorados} estados explorados)`
      : '  ✘ inválida',
  );
  return resultado.valida;
}

const argumentos = process.argv.slice(2);
const arquivos = argumentos.length > 0 ? argumentos.map((a) => resolve(a)) : listarFasesPadrao();

if (arquivos.length === 0) {
  console.log('Nenhuma Fase encontrada em public/fases/.');
  process.exit(1);
}

const invalidas = arquivos.filter((arquivo) => !validarArquivo(arquivo));
console.log(
  `\n${arquivos.length - invalidas.length}/${arquivos.length} Fase(s) válida(s).`,
);
process.exit(invalidas.length > 0 ? 1 : 0);
