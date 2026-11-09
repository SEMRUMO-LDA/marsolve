// O que os geradores do build (obras.mjs, conteudo.mjs) partilham: a
// ligacao ao kiban e as duas ferramentas de escrever HTML.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function opcoesDaLinha(argv = process.argv.slice(2)) {
  return Object.fromEntries(argv.map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }));
}

// — Ligacao ao kiban —
// Os valores sao os do kiban.js (sao os que o browser usa); o Vercel pode
// sobrepo-los com KIBAN_API_URL, KIBAN_API_KEY e KIBAN_TENANT.
export async function configuracao(prefixo) {
  const js = await readFile(path.join(RAIZ, 'kiban.js'), 'utf8');
  const valor = (nome) => (js.match(new RegExp(nome + ":[^\\n]*\\|\\|\\s*'([^']+)'")) || [])[1];
  const cfg = {
    url: (process.env.KIBAN_API_URL || valor('apiUrl') || 'https://kiban.pt').replace(/\/$/, ''),
    chave: process.env.KIBAN_API_KEY || valor('apiKey'),
    tenant: process.env.KIBAN_TENANT || valor('tenant') || 'marsolve',
  };
  // a chave pode vir de dois sitios; dizer qual, para uma chave velha num
  // deles nao passar por avaria do kiban
  const origem = process.env.KIBAN_API_KEY ? 'variavel KIBAN_API_KEY' : 'kiban.js';
  console.log(`[${prefixo}] kiban ${cfg.url}, tenant ${cfg.tenant}, chave …${String(cfg.chave).slice(-4)} (de ${origem})`);
  return cfg;
}

// Uma chave recusada nao e o kiban em baixo: e configuracao errada, e tem de
// se ver. Para o build, e o Vercel fica com o deploy anterior.
export class ChaveRecusada extends Error {}

// As entradas de uma colecao. Devolve null se a colecao nao existir no
// kiban -- quem chama decide o que isso quer dizer (para o Sobre e os
// Contactos, que ainda nao foram criadas, quer dizer "fica o HTML").
export async function buscarEntradas(cfg, colecao, { estados = ['published'], aviso = console.warn } = {}) {
  const vistas = new Set();
  const todas = [];
  for (const estado of estados) {
    const r = await fetch(`${cfg.url}/api/v1/entries/${colecao}?status=${estado}&limit=200`, {
      headers: { Authorization: 'Bearer ' + cfg.chave, 'X-Tenant': cfg.tenant },
      signal: AbortSignal.timeout(15000),
    });
    if (r.status === 401 || r.status === 403) {
      throw new ChaveRecusada(`o kiban recusou a chave (${r.status}): confirmar KIBAN_API_KEY no Vercel ou a chave em kiban.js`);
    }
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`o kiban respondeu ${r.status} a /entries/${colecao}`);
    const j = await r.json();
    const total = j.meta?.pagination?.total;
    if (total && total > j.data.length) aviso(`o kiban tem ${total} entradas em ${colecao} e so vieram ${j.data.length}`);
    // o kiban devolve as publicadas tambem quando se pedem os rascunhos
    for (const e of j.data) {
      if (vistas.has(e.id)) continue;
      vistas.add(e.id);
      todas.push(e);
    }
  }
  return todas;
}

// — HTML —
export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// troca o que esta entre <!-- nome ... --> e <!-- /nome -->, com o recuo do marcador
export function entreMarcadores(html, nome, linhas, ficheiro) {
  const re = new RegExp(`(\\n( *)<!-- ${nome}\\b[^\\n]*-->\\n)[\\s\\S]*?(\\n *<!-- /${nome} -->)`);
  const m = html.match(re);
  if (!m) throw new Error(`${ficheiro} nao tem o marcador ${nome}`);
  return html.replace(re, (_, abre, recuo, fecha) =>
    abre + linhas.map((l) => (l ? recuo + l : '')).join('\n') + fecha);
}

export const temMarcador = (html, nome) => html.includes(`<!-- ${nome}`) && html.includes(`<!-- /${nome} -->`);
