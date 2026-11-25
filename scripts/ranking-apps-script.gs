/**
 * Ranking do Revolta (ADR 0008): Apps Script publicado como App da Web.
 *
 * Como publicar:
 *   1. Abra a planilha do Ranking → Extensões → Apps Script.
 *   2. Cole este arquivo inteiro no lugar do Code.gs e salve.
 *   3. Implantar → Nova implantação → tipo "App da Web";
 *      executar como "Eu", quem pode acessar "Qualquer pessoa".
 *   4. Copie a URL que termina em /exec para `CONFIG.ranking.url` (src/core/config.ts).
 *   Ao mudar o script: Implantar → Gerenciar implantações → editar → Nova versão
 *   (a URL continua a mesma).
 *
 * API:
 *   GET  ?acao=top&fase=fase-01&aba=Tempos  → { ok, top: [{ letras, tempoMs, gravadoEm }] }
 *   POST (text/plain) { id, faseId, letras, tempoMs, aba } → { ok, top }
 *
 * A planilha guarda tudo o que recebe e nunca apaga; o top 10 é calculado na leitura.
 * Tempo falso? Apague a linha na planilha.
 */

/** Abas aceitas: o jogo em localhost grava em "Testes". */
var ABAS = ['Tempos', 'Testes'];
var CABECALHO = ['id', 'faseId', 'letras', 'tempoMs', 'gravadoEm'];
var TAMANHO_RANKING = 10;
/** 2 horas: acima disso não é uma Tentativa de verdade. */
var TEMPO_MAXIMO_MS = 2 * 60 * 60 * 1000;
/**
 * Fases aceitas e o piso de tempo de cada uma: 80% do mínimo teórico (rota mais rápida
 * só deslizando, sem reação nem espera de Ameaças). Fase 1: 8,43 s → 6,7 s.
 */
var FASES = {
  'fase-01': { pisoMs: 6700 },
};

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.acao !== 'top' || !FASES.hasOwnProperty(p.fase)) {
    return responder({ ok: false, erro: 'pedido inválido' });
  }
  return responder({ ok: true, top: calcularTop(obterAba(p.aba), p.fase) });
}

function doPost(e) {
  var dados;
  try {
    dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (erro) {
    return responder({ ok: false, erro: 'JSON inválido' });
  }

  var erro = validar(dados);
  if (erro) return responder({ ok: false, erro: erro });

  var trava = LockService.getScriptLock();
  trava.waitLock(10000);
  try {
    var aba = obterAba(dados.aba);
    // Reenvio da caixa de saída (a resposta anterior se perdeu): não grava de novo.
    if (!idJaGravado(aba, dados.id)) {
      aba.appendRow([dados.id, dados.faseId, dados.letras, dados.tempoMs, new Date().toISOString()]);
    }
    return responder({ ok: true, top: calcularTop(aba, dados.faseId) });
  } finally {
    trava.releaseLock();
  }
}

function validar(d) {
  if (typeof d !== 'object' || d === null) return 'corpo inválido';
  if (typeof d.id !== 'string' || d.id.length < 8 || d.id.length > 64) return 'id inválido';
  if (!FASES.hasOwnProperty(d.faseId)) return 'Fase desconhecida';
  if (typeof d.letras !== 'string' || !/^[A-Z]{3}$/.test(d.letras)) return 'letras inválidas';
  if (typeof d.tempoMs !== 'number' || Math.floor(d.tempoMs) !== d.tempoMs) return 'tempo inválido';
  if (d.tempoMs < FASES[d.faseId].pisoMs || d.tempoMs > TEMPO_MAXIMO_MS) return 'tempo fora do limite';
  return null;
}

function obterAba(nome) {
  var nomeAba = ABAS.indexOf(nome) >= 0 ? nome : ABAS[0];
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(nomeAba);
  if (!aba) {
    aba = planilha.insertSheet(nomeAba);
  }
  if (aba.getLastRow() === 0) {
    aba.appendRow(CABECALHO);
    aba.setFrozenRows(1);
  }
  return aba;
}

function lerLinhas(aba) {
  var ultima = aba.getLastRow();
  if (ultima < 2) return [];
  return aba.getRange(2, 1, ultima - 1, CABECALHO.length).getValues();
}

function idJaGravado(aba, id) {
  var linhas = lerLinhas(aba);
  for (var i = 0; i < linhas.length; i++) {
    if (linhas[i][0] === id) return true;
  }
  return false;
}

function calcularTop(aba, faseId) {
  return lerLinhas(aba)
    .filter(function (l) {
      return l[1] === faseId && /^[A-Z]{3}$/.test(l[2]) && typeof l[3] === 'number';
    })
    .map(function (l) {
      var gravadoEm = l[4] instanceof Date ? l[4].toISOString() : String(l[4]);
      return { letras: l[2], tempoMs: l[3], gravadoEm: gravadoEm };
    })
    .sort(function (a, b) {
      if (a.tempoMs !== b.tempoMs) return a.tempoMs - b.tempoMs;
      return a.gravadoEm < b.gravadoEm ? -1 : a.gravadoEm > b.gravadoEm ? 1 : 0;
    })
    .slice(0, TAMANHO_RANKING);
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
