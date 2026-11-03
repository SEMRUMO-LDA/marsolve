#!/usr/bin/env node
// As obras do site saem da colecao "obras" do kiban.
//
// Corre no build do Vercel (npm run build) e pode correr a mao. Le as obras
// publicadas e escreve:
//   - os cards do portfolio, em index.html e portfolio.html (entre os
//     marcadores obras:cards e obras:pontos)
//   - uma pagina obra-<endereco>.html por obra, a partir de scripts/obra.molde.html
//   - as obras no sitemap.xml
//
// O site continua estatico: o app.js le os cards e a galeria uma vez, ao
// arrancar, e por isso o conteudo tem de estar no HTML antes de ele correr.
//
// Se o kiban nao responder, ou nao tiver nenhuma obra publicada, nao se
// toca em nada e fica o HTML que esta no git -- o deploy segue. Uma chave
// recusada (401/403) ou um erro do proprio gerador, pelo contrario, param o
// build: e melhor o Vercel manter o deploy anterior, e dizer porque, do que
// publicar paginas pela metade ou fingir que esta tudo bem.
//
//   node scripts/obras.mjs                  obras publicadas, escreve no projeto
//   node scripts/obras.mjs --rascunhos      inclui rascunhos (so para ver antes de publicar)
//   node scripts/obras.mjs --saida=DIR      escreve noutra pasta (para comparar)

import { readFile, writeFile, readdir, unlink, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const opcoes = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const SAIDA = opcoes.saida ? path.resolve(opcoes.saida) : RAIZ;
const COM_RASCUNHOS = Boolean(opcoes.rascunhos);

const ESTADOS = { execucao: 'Obra em execução', concluida: 'Obra concluída' };
const POR_SLIDE = 4;
// a galeria alterna quatro posicoes na grelha de 12 colunas; a linha e a ordem
const GRELHA = [[1, 8], [8, 13], [2, 11], [6, 12]];
// a moldura da abertura tem proporcao fixa; o width/height so reserva o espaco
const ABERTURA = { w: 1024, h: 683 };
// o que vem destes enderecos e do proprio site: usa-se o ficheiro local, que
// tem as versoes avif e webp ao lado
const HOSTS_DO_SITE = new Set(['marsolve.vercel.app', 'marsolve.net', 'www.marsolve.net']);
const SIMBOLO = 'M335.6,237.62L172.41,2.19c-.94-1.38-2.5-2.19-4.18-2.19s-3.23.81-4.18,2.19L.88,237.62c-1.19,1.72-1.17,4.03.02,5.75l163.18,235.44c.94,1.37,2.49,2.19,4.16,2.19s3.22-.83,4.16-2.19l163.18-235.44c1.19-1.72,1.2-4.03.02-5.75M168.24,462.88l-125.22-178.5,82.66-124.6,33.06,54.96-38.76,64.49c-2.14,3.56-2.14,8.16,0,11.73l43.13,69.98c1.09,1.8,3,2.89,5.13,2.89s4.05-1.09,5.13-2.89l43.13-69.98c2.14-3.57,2.14-8.17,0-11.73l-38.76-64.49,33.06-54.96,82.66,124.6-125.22,178.5ZM168.24,230.51l32.29,53.77-32.29,53.17-32.2-53.31,32.2-53.62ZM303.55,269.87l-90.81-137.48c-.97-1.48-3.17-1.43-4.09.08l-40.61,66.38-40.2-66.38c-.93-1.51-3.12-1.56-4.09-.08l-90.81,137.48-20.74-29.4L168.24,15.33l156.05,225.13-20.75,29.4Z';

const avisos = [];
const aviso = (m) => { avisos.push(m); console.warn('[obras] ' + m); };

// — Ligacao ao kiban —
// Os valores sao os do kiban.js (sao os que o browser usa); o Vercel pode
// sobrepo-los com KIBAN_API_URL, KIBAN_API_KEY e KIBAN_TENANT.
async function configuracao() {
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
  console.log(`[obras] kiban ${cfg.url}, tenant ${cfg.tenant}, chave …${String(cfg.chave).slice(-4)} (de ${origem})`);
  return cfg;
}

// Uma chave recusada nao e o kiban em baixo: e configuracao errada, e tem de
// se ver. Para o build, e o Vercel fica com o deploy anterior.
class ChaveRecusada extends Error {}

async function buscarObras(cfg) {
  const estados = COM_RASCUNHOS ? ['published', 'draft'] : ['published'];
  const todas = [];
  for (const estado of estados) {
    const r = await fetch(`${cfg.url}/api/v1/entries/obras?status=${estado}&limit=200`, {
      headers: { Authorization: 'Bearer ' + cfg.chave, 'X-Tenant': cfg.tenant },
      signal: AbortSignal.timeout(15000),
    });
    if (r.status === 401 || r.status === 403) {
      throw new ChaveRecusada(`o kiban recusou a chave (${r.status}): confirmar KIBAN_API_KEY no Vercel ou a chave em kiban.js`);
    }
    if (!r.ok) throw new Error(`o kiban respondeu ${r.status} a /entries/obras`);
    const j = await r.json();
    const total = j.meta?.pagination?.total;
    if (total && total > j.data.length) aviso(`o kiban tem ${total} obras e so vieram ${j.data.length}`);
    todas.push(...j.data);
  }
  return todas;
}

// — Imagens —
async function existe(f) {
  try { await access(f); return true; } catch { return false; }
}

// largura e altura a partir do cabecalho do ficheiro: jpeg, png, webp e gif
function dimensoes(b) {
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) {
        return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  } else if (b.toString('ascii', 1, 4) === 'PNG') {
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  } else if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const tipo = b.toString('ascii', 12, 16);
    if (tipo === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (tipo === 'VP8L') {
      const v = b.readUInt32LE(21);
      return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 };
    }
    if (tipo === 'VP8X') return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
  } else if (b.toString('ascii', 0, 3) === 'GIF') {
    return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  }
  return null;
}

const imagens = new Map();
function imagem(endereco) {
  if (!imagens.has(endereco)) imagens.set(endereco, lerImagem(endereco));
  return imagens.get(endereco);
}

async function lerImagem(endereco) {
  const u = new URL(endereco, 'https://marsolve.net/');
  if (HOSTS_DO_SITE.has(u.hostname) && u.pathname.startsWith('/assets/')) {
    const rel = decodeURIComponent(u.pathname.slice(1));
    if (await existe(path.join(RAIZ, rel))) {
      const base = rel.replace(/\.[a-z0-9]+$/i, '');
      return {
        src: rel,
        avif: (await existe(path.join(RAIZ, base + '.avif'))) ? base + '.avif' : null,
        webp: (await existe(path.join(RAIZ, base + '.webp'))) ? base + '.webp' : null,
        ...dimensoes(await readFile(path.join(RAIZ, rel))),
        local: rel,
      };
    }
  }
  // de fora (a media do kiban, por exemplo): fica onde esta, e mede-se para
  // a pagina reservar o espaco antes de a fotografia chegar
  const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`a imagem ${u.href} respondeu ${r.status}`);
  const d = dimensoes(Buffer.from(await r.arrayBuffer()));
  if (!d) aviso(`nao consegui medir ${u.href}`);
  return { src: u.href, avif: null, webp: null, ...d };
}

// o card usa a versao pequena da capa (capa-sm.jpg ao lado de capa.jpg), se houver
async function versaoPequena(img, endereco) {
  if (img.local) {
    const sm = img.local.replace(/(\.[a-z0-9]+)$/i, '-sm$1');
    if (await existe(path.join(RAIZ, sm))) return imagem(new URL(sm, 'https://marsolve.net/').href);
  }
  return imagem(endereco);
}

// — HTML —
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function picture(img, atributos) {
  const medidas = atributos.medidas || (img.w && img.h ? img : null);
  // prioridade: a capa da abertura; logo: o primeiro card do portfolio, que e
  // o maior elemento do ecra quando a pagina abre
  const attrs = [
    atributos.classe ? `class="${atributos.classe}"` : '',
    `src="${esc(img.src)}"`,
    `alt="${esc(atributos.alt)}"`,
    atributos.prioridade ? '' : atributos.logo ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"',
    medidas ? `width="${medidas.w}" height="${medidas.h}"` : '',
    atributos.prioridade ? 'fetchpriority="high"' : '',
    'decoding="async"',
  ].filter(Boolean).join(' ');
  return [
    '<picture>',
    img.avif && `  <source srcset="${esc(img.avif)}" type="image/avif">`,
    img.webp && `  <source srcset="${esc(img.webp)}" type="image/webp">`,
    `  <img ${attrs}>`,
    '</picture>',
  ].filter(Boolean);
}

const recuar = (linhas, n) => linhas.map((l) => (l ? ' '.repeat(n) + l : l));

function letreiro(o) {
  return Array.from({ length: 8 }, () =>
    `<span class="marquee-item"><span class="marquee-text">${esc(o.localidade)}</span><span class="marquee-sep">&#9671;</span></span>`);
}

function galeria(o) {
  if (!o.galeria.length) return [];
  const itens = o.galeria.flatMap((g, i) => {
    const [de, ate] = GRELHA[i % GRELHA.length];
    const proporcao = g.img.w && g.img.h ? `${g.img.w} / ${g.img.h}` : '3 / 2';
    return [
      `<figure class="obra-galeria__item" style="--de: ${de}; --ate: ${ate}; --linha: ${i + 1}; aspect-ratio: ${proporcao}">`,
      ...recuar(picture(g.img, { alt: g.legenda || `${o.titulo} — imagem ${i + 1}` }), 2),
      '</figure>',
    ];
  });
  return ['<section class="obra-galeria" aria-label="Galeria da obra">', ...recuar(itens, 2), '</section>'];
}

function texto(o) {
  // paragrafos separados por uma linha em branco no kiban
  const paragrafos = o.texto.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (!paragrafos.length) return [];
  return [
    '<section class="obra-texto">',
    ...paragrafos.map((p) => `  <p>${esc(p).replace(/\n/g, '<br>')}</p>`),
    '</section>',
  ];
}

function card(o, logo) {
  return [
    `<a href="obra-${o.slug}.html" class="selection-card" data-status="${o.estado}">`,
    '  <span class="selection-card__panel">',
    '    <svg class="selection-card__symbol" viewBox="0 0 336.48 481.01" fill="currentColor" aria-hidden="true">',
    `      <path d="${SIMBOLO}"/>`,
    '    </svg>',
    `    <span class="selection-card__title">${esc(o.localidade)}</span>`,
    `    <span class="selection-card__desc">${esc(o.tipo)}</span>`,
    '  </span>',
    '  <span class="selection-card__cover">',
    ...recuar(picture(o.capaCard, { alt: o.titulo, logo }), 4),
    '  </span>',
    '</a>',
  ];
}

function cards(obras, primeiroLogo) {
  const linhas = [];
  for (let s = 0; s * POR_SLIDE < obras.length; s++) {
    if (s) linhas.push('');
    linhas.push(`<!-- Slide ${s + 1} -->`, `<div class="selection-cards-slide" data-slide-index="${s}">`);
    obras.slice(s * POR_SLIDE, (s + 1) * POR_SLIDE).forEach((o, i) =>
      linhas.push(...recuar(card(o, primeiroLogo && s === 0 && i === 0), 2)));
    linhas.push('</div>');
  }
  return linhas;
}

function pontos(obras) {
  const n = Math.max(1, Math.ceil(obras.length / POR_SLIDE));
  const dois = (x) => String(x).padStart(2, '0');
  return [
    ...Array.from({ length: n }, (_, i) =>
      `<button type="button" class="selection-slide-dot${i ? '' : ' active'}" data-slide="${i}" aria-label="Slide ${i + 1}"></button>`),
    `<span class="selection-slide-label" id="slide-page-indicator">01 / ${dois(n)}</span>`,
  ];
}

// troca o que esta entre <!-- nome ... --> e <!-- /nome -->, com o recuo do marcador
function entreMarcadores(html, nome, linhas, ficheiro) {
  const re = new RegExp(`(\\n( *)<!-- ${nome}\\b[^\\n]*-->\\n)[\\s\\S]*?(\\n *<!-- /${nome} -->)`);
  const m = html.match(re);
  if (!m) throw new Error(`${ficheiro} nao tem o marcador ${nome}`);
  return html.replace(re, (_, abre, recuo, fecha) =>
    abre + linhas.map((l) => (l ? recuo + l : '')).join('\n') + fecha);
}

function preencherMolde(molde, valores, blocos) {
  const inicio = molde.indexOf('<!DOCTYPE html>');
  if (inicio < 0) throw new Error('o molde nao tem <!DOCTYPE html>');
  let html = molde.slice(inicio);
  // um bloco vazio leva consigo a linha em branco que o separava do seguinte
  html = html.replace(/^( *)\{\{([A-Z_]+)\}\}\n(\n?)/gm, (_, recuo, nome, branca) => {
    if (!(nome in blocos)) throw new Error(`o molde pede o bloco ${nome}, que nao existe`);
    const b = blocos[nome];
    return b.length ? b.map((l) => (l ? recuo + l : '')).join('\n') + '\n' + branca : '';
  });
  html = html.replace(/\{\{([a-z_]+)\}\}/g, (_, nome) => {
    if (!(nome in valores)) throw new Error(`o molde pede {{${nome}}}, que nao existe`);
    return esc(valores[nome]);
  });
  return html;
}

function sitemap(xml, obras) {
  const blocos = xml.match(/  <url>[\s\S]*?<\/url>\n/g) || [];
  const fixos = blocos.filter((b) => !/\/obra-[^<]*\.html</.test(b));
  const daObra = obras.map((o) =>
    `  <url>\n    <loc>https://marsolve.net/obra-${o.slug}.html</loc>\n    <lastmod>${o.alterada}</lastmod>\n    <priority>0.7</priority>\n  </url>\n`);
  // a mesma ordem de sempre: pelo nome do ficheiro, com a raiz no lugar do index
  const chave = (b) => b.match(/<loc>https:\/\/marsolve\.net\/([^<]*)<\/loc>/)[1] || 'index.html';
  const todos = [...fixos, ...daObra].sort((a, b) => chave(a).localeCompare(chave(b)));
  return xml.replace(/  <url>[\s\S]*<\/url>\n/, todos.join(''));
}

// — Das entradas do kiban as obras —
function validar(c) {
  const falta = ['title', 'slug', 'tipo', 'localidade', 'ano', 'estado', 'capa']
    .filter((k) => !String(c[k] ?? '').trim());
  if (falta.length) return `falta ${falta.join(', ')}`;
  if (!/^[a-z0-9-]+$/.test(c.slug)) return `o endereço "${c.slug}" so pode ter minusculas, numeros e hifens`;
  if (!ESTADOS[c.estado]) return `estado desconhecido "${c.estado}"`;
  return null;
}

async function prepararObras(entradas) {
  const vistas = new Set();
  const obras = [];
  for (const e of entradas) {
    const c = e.content || {};
    const erro = validar(c);
    if (erro) { aviso(`"${e.title}" fica de fora: ${erro}`); continue; }
    if (vistas.has(c.slug)) { aviso(`"${e.title}" fica de fora: o endereço ${c.slug} ja e de outra obra`); continue; }
    let capa;
    try {
      capa = await imagem(c.capa);
    } catch (err) {
      aviso(`"${e.title}" fica de fora: a capa nao abre (${err.message})`);
      continue;
    }
    const fotos = [];
    for (const g of Array.isArray(c.galeria) ? c.galeria : []) {
      if (!g?.image) continue;
      try {
        fotos.push({ img: await imagem(g.image), legenda: String(g.caption || '').trim() });
      } catch (err) {
        aviso(`"${e.title}": fotografia da galeria ignorada (${err.message})`);
      }
    }
    vistas.add(c.slug);
    obras.push({
      slug: c.slug,
      titulo: String(c.title).trim(),
      tipo: String(c.tipo).trim(),
      localidade: String(c.localidade).trim(),
      ano: String(c.ano).trim(),
      estado: c.estado,
      texto: String(c.texto || ''),
      ordem: Number.isFinite(Number(c.ordem)) && c.ordem !== '' && c.ordem !== null ? Number(c.ordem) : Infinity,
      capa,
      capaCard: await versaoPequena(capa, c.capa),
      galeria: fotos,
      alterada: String(e.updated_at || e.published_at || new Date().toISOString()).slice(0, 10),
    });
  }
  return obras.sort((a, b) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt'));
}

// — Escrever —
async function main() {
  const cfg = await configuracao();
  let entradas;
  try {
    entradas = await buscarObras(cfg);
  } catch (err) {
    if (err instanceof ChaveRecusada) throw err;
    console.warn(`[obras] sem ligacao ao kiban (${err.message}): fica o HTML que esta no git.`);
    return;
  }
  const obras = await prepararObras(entradas);
  if (!obras.length) {
    console.warn('[obras] o kiban nao tem obras publicadas que se possam usar: fica o HTML que esta no git.');
    return;
  }

  // tudo em memoria primeiro: so se escreve quando todas as paginas estao prontas
  const ficheiros = new Map();
  const molde = await readFile(path.join(RAIZ, 'scripts/obra.molde.html'), 'utf8');
  obras.forEach((o, i) => {
    const s = obras[(i + 1) % obras.length];
    ficheiros.set(`obra-${o.slug}.html`, preencherMolde(molde, {
      titulo: o.titulo,
      descricao: `${o.titulo}. Marsolve, construção no Algarve. ${o.localidade}, ${o.ano}.`,
      slug: o.slug,
      tipo: o.tipo,
      localidade: o.localidade,
      ano: o.ano,
      estado: ESTADOS[o.estado],
      seguinte_slug: s.slug,
      seguinte_localidade: s.localidade,
      seguinte_tipo: s.tipo,
    }, {
      CAPA: picture(o.capa, { classe: 'hero-opening-media', alt: o.titulo, prioridade: true, medidas: ABERTURA }),
      LETREIRO: letreiro(o),
      TEXTO: texto(o),
      GALERIA: galeria(o),
      SEGUINTE_CAPA: picture(s.capa, { alt: '' }),
    }));
  });
  for (const f of ['index.html', 'portfolio.html']) {
    let html = await readFile(path.join(RAIZ, f), 'utf8');
    // na entrada o portfolio esta escondido ao abrir; no portfolio e o que se ve
    html = entreMarcadores(html, 'obras:cards', cards(obras, f === 'portfolio.html'), f);
    html = entreMarcadores(html, 'obras:pontos', pontos(obras), f);
    ficheiros.set(f, html);
  }
  ficheiros.set('sitemap.xml', sitemap(await readFile(path.join(RAIZ, 'sitemap.xml'), 'utf8'), obras));

  await mkdir(SAIDA, { recursive: true });
  for (const [f, conteudo] of ficheiros) await writeFile(path.join(SAIDA, f), conteudo);

  // a pagina de uma obra que saiu do kiban (ou deixou de estar publicada) sai tambem
  if (SAIDA === RAIZ) {
    for (const f of await readdir(RAIZ)) {
      if (/^obra-[a-z0-9-]+\.html$/.test(f) && !ficheiros.has(f)) {
        await unlink(path.join(RAIZ, f));
        console.log(`[obras] ${f} removida`);
      }
    }
  }

  console.log(`[obras] ${obras.length} obras do kiban: ${obras.map((o) => o.slug).join(', ')}`);
  if (avisos.length) console.log(`[obras] ${avisos.length} aviso(s) acima`);
}

main().catch((err) => {
  console.error('[obras] o gerador falhou:', err);
  process.exit(1);
});
