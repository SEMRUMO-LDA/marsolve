#!/usr/bin/env node
// O Sobre e os Contactos saem das colecoes "sobre" e "contactos" do kiban.
//
// Corre no build do Vercel, a seguir ao obras.mjs (que gera as paginas das
// obras -- e elas tambem tem as redes sociais no menu). Escreve, entre os
// marcadores <!-- nome --> ... <!-- /nome -->:
//   - about.html     sobre:titulo, sobre:blocos
//   - contact.html   contactos:titulo, contactos:vias, e a meta description
//   - toda a pagina  contactos:redes (o Instagram e o Facebook do menu)
//
// As mesmas regras do obras.mjs: se o kiban nao responder, ou a colecao
// ainda nao existir, ou a entrada estiver incompleta, essa parte fica como
// esta no git e o deploy segue. Uma chave recusada para o build.
//
// As colecoes criam-se uma vez com scripts/kiban-colecoes.mjs.
//
//   node scripts/conteudo.mjs               le o kiban, escreve no projeto
//   node scripts/conteudo.mjs --inicial     usa o conteudo inicial do kiban-colecoes.mjs (sem ir ao kiban)
//   node scripts/conteudo.mjs --saida=DIR   escreve noutra pasta (para comparar)

import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { RAIZ, opcoesDaLinha, configuracao, ChaveRecusada, buscarEntradas, esc, entreMarcadores, temMarcador } from './kiban.mjs';
import { COLECOES } from './kiban-colecoes.mjs';

const opcoes = opcoesDaLinha();
const SAIDA = opcoes.saida ? path.resolve(opcoes.saida) : RAIZ;
const INICIAL = Boolean(opcoes.inicial);

const avisos = [];
const aviso = (m) => { avisos.push(m); console.warn('[conteudo] ' + m); };

const OBRIGATORIOS = {
  contactos: ['titulo', 'introducao', 'email', 'telefone', 'morada'],
  sobre: ['titulo', 'quem_somos', 'diferenciacao', 'principios', 'valores', 'em_suma'],
};

// — Texto do kiban para HTML —
// Paragrafos separados por uma linha em branco (como o texto das obras),
// **assim** a negrito, e uma quebra de linha simples fica <br>.
const enfase = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const paragrafos = (texto) => String(texto || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  .map((p) => enfase(p).replace(/\n/g, '<br>'));
const linhas = (texto) => String(texto || '').split('\n').map((l) => l.trim()).filter(Boolean);
const limpo = (v) => String(v ?? '').trim();

function titulo(c) {
  const destaque = limpo(c.titulo_destaque);
  return [`<h1>${esc(limpo(c.titulo))}${destaque ? ` <em>${esc(destaque)}</em>` : ''}</h1>`];
}

// — Contactos —
const telLink = (t) => 'tel:' + t.replace(/[^\d+]/g, '');
const mapaDaMorada = (m) => 'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent(linhas(m).join(' ')).replace(/%20/g, '+');

function redes(c) {
  return [
    ['Instagram', limpo(c.instagram)],
    ['Facebook', limpo(c.facebook)],
  ].filter(([, url]) => url);
}

function vias(c) {
  const morada = linhas(c.morada);
  const r = redes(c);
  return [
    ...paragrafos(c.introducao).map((p, i) => (i ? `<p>${p}</p>` : `<p class="sobre-destaque">${p}</p>`)),
    '',
    '<div class="contacto-vias">',
    '  <div class="contacto-via">',
    '    <span class="contacto-via__rotulo">Email</span>',
    `    <a href="mailto:${esc(limpo(c.email))}">${esc(limpo(c.email))}</a>`,
    '  </div>',
    '  <div class="contacto-via">',
    '    <span class="contacto-via__rotulo">Telefone</span>',
    `    <a href="${esc(telLink(limpo(c.telefone)))}">${esc(limpo(c.telefone))}</a>`,
    '  </div>',
    '  <div class="contacto-via">',
    '    <span class="contacto-via__rotulo">Morada</span>',
    `    <a href="${esc(limpo(c.mapa) || mapaDaMorada(c.morada))}" target="_blank" rel="noopener noreferrer">${morada.map(esc).join('<br>')}</a>`,
    '  </div>',
    ...(r.length ? [
      '  <div class="contacto-via">',
      '    <span class="contacto-via__rotulo">Redes</span>',
      ...r.map(([nome, url]) => `    <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${nome}</a>`),
      '  </div>',
    ] : []),
    '</div>',
  ];
}

function redesDaGaveta(c) {
  return redes(c).flatMap(([nome, url], i) => [
    ...(i ? ['<span class="drawer-social-sep">•</span>'] : []),
    `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="drawer-social-link">${nome}</a>`,
  ]);
}

function descricaoDoContacto(c) {
  return `Fale com a Marsolve: ${limpo(c.telefone)}, ${limpo(c.email)}, ${linhas(c.morada).join(', ')}.`;
}

function trocarMeta(html, atributo, valor, ficheiro) {
  const re = new RegExp(`(<meta ${atributo} content=")[^"]*(">)`);
  if (!re.test(html)) throw new Error(`${ficheiro} nao tem <meta ${atributo}>`);
  return html.replace(re, (_, a, b) => a + esc(valor) + b);
}

// — Sobre —
function bloco(rotulo, corpo, classe = 'sobre-bloco') {
  return [
    `<section class="${classe}">`,
    `  <h2 class="sobre-rotulo">${rotulo}</h2>`,
    '  <div class="sobre-texto">',
    ...corpo.map((l) => '    ' + l),
    '  </div>',
    '</section>',
  ];
}

function blocosDoSobre(c) {
  const dois = (n) => String(n).padStart(2, '0');
  const citacao = limpo(c.em_suma).replace(/^[«"“]\s*|\s*[»"”]$/g, '');
  return [
    ...bloco('(Quem somos)', paragrafos(c.quem_somos).map((p, i) => (i ? `<p>${p}</p>` : `<p class="sobre-destaque">${p}</p>`))),
    '',
    ...bloco('(Diferencia&ccedil;&atilde;o)', paragrafos(c.diferenciacao).map((p) => `<p>${p}</p>`)),
    '',
    ...bloco('(Princ&iacute;pios &amp; prop&oacute;sito)', [
      ...paragrafos(c.principios).map((p) => `<p>${p}</p>`),
      '<ol class="sobre-valores">',
      ...linhas(c.valores).map((v, i) =>
        `  <li><span class="sobre-valores__num">(${dois(i + 1)})</span><span class="sobre-valores__texto">${enfase(v)}</span></li>`),
      '</ol>',
    ]),
    '',
    ...bloco('(Em suma)', [`<p class="sobre-citacao">&laquo;${enfase(citacao)}&raquo;</p>`], 'sobre-bloco sobre-bloco--remate'),
  ];
}

// — Do kiban —
async function lerColecao(cfg, slug) {
  if (INICIAL) return COLECOES.find((c) => c.slug === slug).entrada.content;
  let entradas;
  try {
    entradas = await buscarEntradas(cfg, slug, { aviso });
  } catch (err) {
    if (err instanceof ChaveRecusada) throw err;
    aviso(`sem ligacao ao kiban para ${slug} (${err.message}): fica o HTML que esta no git`);
    return null;
  }
  if (entradas === null) {
    aviso(`o kiban ainda nao tem a colecao ${slug} (criar com node scripts/kiban-colecoes.mjs): fica o HTML que esta no git`);
    return null;
  }
  if (!entradas.length) {
    aviso(`a colecao ${slug} nao tem nenhuma entrada publicada: fica o HTML que esta no git`);
    return null;
  }
  return escolherEntrada(slug, entradas);
}

// a entrada a usar de uma colecao, ou null se estiver incompleta
export function escolherEntrada(slug, entradas, avisar = aviso) {
  if (!entradas || !entradas.length) return null;
  if (entradas.length > 1) avisar(`a colecao ${slug} tem ${entradas.length} entradas publicadas; uso "${entradas[0].title}"`);
  const c = entradas[0].content || {};
  const falta = OBRIGATORIOS[slug].filter((k) => !limpo(c[k]));
  if (falta.length) {
    avisar(`"${entradas[0].title}" (${slug}) fica de fora: falta ${falta.join(', ')}. Fica o HTML que esta no git`);
    return null;
  }
  return c;
}

// — Escrever —
async function existe(f) {
  try { await access(f); return true; } catch { return false; }
}

// quando se escreve noutra pasta, o obras.mjs pode ja la ter posto as
// paginas das obras: le-se de la primeiro
async function ler(f) {
  const naSaida = path.join(SAIDA, f);
  return readFile((await existe(naSaida)) ? naSaida : path.join(RAIZ, f), 'utf8');
}

// Aplica o Sobre e os Contactos as paginas: as que ja estao em `ficheiros`
// (por exemplo, as das obras acabadas de gerar) e as outras lidas com `ler`.
// Usada aqui (build) e pela funcao do Vercel (api/site.mjs).
export async function aplicarConteudo(ficheiros, { contactos, sobre }, ler, paginas) {
  if (contactos) {
    let html = await ler('contact.html');
    html = entreMarcadores(html, 'contactos:titulo', titulo(contactos), 'contact.html');
    html = entreMarcadores(html, 'contactos:vias', vias(contactos), 'contact.html');
    const descricao = descricaoDoContacto(contactos);
    html = trocarMeta(html, 'name="description"', descricao, 'contact.html');
    html = trocarMeta(html, 'property="og:description"', descricao, 'contact.html');
    ficheiros.set('contact.html', html);

    for (const f of paginas) {
      const atual = ficheiros.get(f) ?? await ler(f);
      if (!temMarcador(atual, 'contactos:redes')) continue;
      ficheiros.set(f, entreMarcadores(atual, 'contactos:redes', redesDaGaveta(contactos), f));
    }
  }

  if (sobre) {
    let html = ficheiros.get('about.html') ?? await ler('about.html');
    html = entreMarcadores(html, 'sobre:titulo', titulo(sobre), 'about.html');
    html = entreMarcadores(html, 'sobre:blocos', blocosDoSobre(sobre), 'about.html');
    ficheiros.set('about.html', html);
  }
  return ficheiros;
}

async function main() {
  const cfg = INICIAL ? null : await configuracao('conteudo');
  if (INICIAL) console.log('[conteudo] conteudo inicial do kiban-colecoes.mjs (sem ir ao kiban)');
  const contactos = await lerColecao(cfg, 'contactos');
  const sobre = await lerColecao(cfg, 'sobre');
  if (!contactos && !sobre) {
    console.log('[conteudo] nada a escrever');
    return;
  }

  // tudo em memoria primeiro: so se escreve quando todas as paginas estao prontas
  const paginas = new Set([...await readdir(RAIZ), ...(SAIDA === RAIZ ? [] : await readdir(SAIDA).catch(() => []))]);
  const ficheiros = await aplicarConteudo(new Map(), { contactos, sobre }, ler,
    [...paginas].filter((f) => f.endsWith('.html')).sort());

  await mkdir(SAIDA, { recursive: true });
  let mudaram = 0;
  for (const [f, conteudo] of ficheiros) {
    const antes = await ler(f);
    if (antes !== conteudo || SAIDA !== RAIZ) {
      await writeFile(path.join(SAIDA, f), conteudo);
      if (antes !== conteudo) mudaram++;
    }
  }

  const partes = [contactos && 'contactos', sobre && 'sobre'].filter(Boolean).join(' e ');
  console.log(`[conteudo] ${partes} do kiban: ${mudaram} pagina(s) alterada(s) de ${ficheiros.size}`);
  if (avisos.length) console.log(`[conteudo] ${avisos.length} aviso(s) acima`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error('[conteudo] o gerador falhou:', err);
    process.exit(1);
  });
}
