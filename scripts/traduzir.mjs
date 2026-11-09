// As paginas noutra lingua, traduzidas no servidor.
//
// Antes, o widget i18n do kiban traduzia no browser: a pagina abria em
// portugues e so passados uns segundos (carregar o loader, o widget, as
// linguas, e pedir as traducoes) passava a ingles. Agora a funcao do Vercel
// entrega a pagina ja traduzida em ?lingua=en, e o CDN guarda-a como
// qualquer outra -- nao ha momento em portugues, e o Google ve o ingles.
//
// Traduz o mesmo que o widget traduzia (o texto, e os atributos
// placeholder, title e alt), mais o <title> e as descricoes da pagina. As
// traducoes vem do mesmo sitio que as do widget: /i18n/translate-text do
// kiban (DeepL, com cache do lado do kiban); aqui ficam tambem em memoria.

export const PARAMETRO = 'lingua';
export const COOKIE = 'marsolve-lingua';

const SALTAR = new Set(['script', 'style', 'noscript', 'svg', 'code', 'pre', 'iframe', 'canvas', 'template']);
const ATRIBUTOS = ['placeholder', 'title', 'alt', 'aria-label'];
const META = /^(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)$/;
const PAGINAS = /^(?:\.\/)?(?:(?:index|portfolio|about|contact|privacidade)\.html|obra-[a-z0-9-]+\.html)?$/;

// — Entidades —
const NOMES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', Aacute: 'Á', agrave: 'à', Agrave: 'À', acirc: 'â', Acirc: 'Â', atilde: 'ã', Atilde: 'Ã',
  eacute: 'é', Eacute: 'É', egrave: 'è', ecirc: 'ê', Ecirc: 'Ê', iacute: 'í', Iacute: 'Í',
  oacute: 'ó', Oacute: 'Ó', ocirc: 'ô', Ocirc: 'Ô', otilde: 'õ', Otilde: 'Õ',
  uacute: 'ú', Uacute: 'Ú', uuml: 'ü', ccedil: 'ç', Ccedil: 'Ç',
  ordm: 'º', ordf: 'ª', middot: '·', bull: '•', hellip: '…', mdash: '—', ndash: '–',
  laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', copy: '©', reg: '®', euro: '€',
};
const decodificar = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return NOMES[e] ?? m;
});
const texto = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const atributo = (s) => texto(s).replace(/"/g, '&quot;');

const traduzivel = (s) => s.length >= 2 && !/^[\d\s.,;:!?@#$%^&*()\-+=<>{}[\]|/\\•·◇–—]+$/.test(s);

// percorre o HTML e chama `fazer` para cada texto e atributo traduzivel;
// devolve o HTML com o que `fazer` devolver no lugar
function percorrer(html, fazer) {
  // comentarios, <!DOCTYPE> e <?...?> passam como estao
  const re = /<!--[\s\S]*?-->|<[!?][^>]*>|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  let saltar = null;
  let out = '';
  let m;
  while ((m = re.exec(html))) {
    const [bruto, fecho, tag, attrs] = m;
    if (bruto.startsWith('<!') || bruto.startsWith('<?')) { out += bruto; continue; }
    if (tag) {
      const nome = tag.toLowerCase();
      if (saltar) {
        if (fecho && nome === saltar) saltar = null;
        out += bruto;
        continue;
      }
      if (!fecho && SALTAR.has(nome) && !/\/\s*$/.test(attrs)) saltar = nome;
      out += fecho ? bruto : '<' + tag + atributos(nome, attrs, fazer) + '>';
      continue;
    }
    if (saltar || bruto === '<') { out += bruto; continue; }
    // texto: guarda o espaco a volta, traduz o meio
    const [, antes, meio, depois] = bruto.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const limpo = decodificar(meio).replace(/\s+/g, ' ');
    out += traduzivel(limpo.trim()) ? antes + texto(fazer(limpo.trim())) + depois : bruto;
  }
  return out;
}

function atributos(nome, attrs, fazer) {
  const ehMeta = nome === 'meta' && (attrs.match(/\b(?:name|property)="([^"]+)"/) || [])[1];
  return attrs.replace(/(\s)([\w:-]+)="([^"]*)"/g, (todo, esp, a, v) => {
    const traduzir = ATRIBUTOS.includes(a) || (a === 'content' && ehMeta && META.test(ehMeta));
    if (!traduzir) return todo;
    const limpo = decodificar(v).trim();
    return traduzivel(limpo) ? `${esp}${a}="${atributo(fazer(limpo))}"` : todo;
  });
}

// — Traducoes —
const memoria = new Map(); // lingua -> Map(texto -> traducao)

async function pedirTraducoes(cfg, lingua, textos) {
  const LOTE = 200;
  const lotes = [];
  for (let i = 0; i < textos.length; i += LOTE) lotes.push(textos.slice(i, i + LOTE));
  const respostas = await Promise.all(lotes.map(async (lote) => {
    const r = await fetch(`${cfg.url}/api/v1/i18n/translate-text`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.chave, 'X-Tenant': cfg.tenant, 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: lote, target_lang: lingua }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`o kiban respondeu ${r.status} a /i18n/translate-text`);
    const j = await r.json();
    const t = j?.data?.translations;
    if (!Array.isArray(t) || t.length !== lote.length) throw new Error('resposta de traducao incompleta');
    return t;
  }));
  return respostas.flat();
}

// a pagina noutra lingua: o texto traduzido, o <html lang>, os links
// internos a levar a lingua, e o canonical e o og:locale certos
export async function traduzirPagina(html, lingua, cfg) {
  const conhecidas = memoria.get(lingua) ?? new Map();
  memoria.set(lingua, conhecidas);

  const faltam = new Set();
  percorrer(html, (s) => { if (!conhecidas.has(s)) faltam.add(s); return s; });
  if (faltam.size) {
    const lista = [...faltam];
    const feitas = await pedirTraducoes(cfg, lingua, lista);
    lista.forEach((s, i) => conhecidas.set(s, feitas[i] || s));
  }

  let out = percorrer(html, (s) => conhecidas.get(s) ?? s);
  out = out.replace(/<html lang="[^"]*"/, `<html lang="${lingua}"`);
  out = out.replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${lingua === 'en' ? 'en_GB' : lingua}$2`);
  out = out.replace(/(<link rel="canonical" href=")([^"]*)(")/, (_, a, url, b) => a + comLingua(url, lingua) + b);
  out = out.replace(/(<a\b[^>]*?\shref=")([^"]*)(")/g, (todo, a, href, b) => {
    const [caminho, ancora = ''] = href.split('#');
    if (!PAGINAS.test(caminho) || (caminho === '' && ancora)) return todo;
    return a + (caminho || 'index.html') + `?${PARAMETRO}=${lingua}` + (ancora ? '#' + ancora : '') + b;
  });
  return out;
}

function comLingua(url, lingua) {
  try {
    const u = new URL(url);
    u.searchParams.set(PARAMETRO, lingua);
    return u.href;
  } catch {
    return url;
  }
}

// No <head> de todas as paginas: as versoes noutras linguas, para o Google,
// e quem escolheu uma lingua no menu volta a ela mesmo entrando por um link
// sem ?lingua (um favorito, o logotipo, o Escape do portfolio). Corre antes
// de a pagina se desenhar, por isso nao se ve a outra lingua a piscar.
export function cabecalhoDeLinguas(html, f, linguas, padrao) {
  const base = `https://marsolve.net/${f === 'index.html' ? '' : f}`;
  const alternativas = linguas.map((l) =>
    `<link rel="alternate" hreflang="${l}" href="${l === padrao ? base : comLingua(base, l)}">`).join('\n  ');
  const script = `<script>(function(){try{var c=document.cookie.match(/(?:^|; )${COOKIE}=([a-z]{2})/),u=new URL(location.href),q=u.searchParams.get('${PARAMETRO}');if(c&&!q&&c[1]!=='${padrao}'){u.searchParams.set('${PARAMETRO}',c[1]);location.replace(u.href);}}catch(e){}})();</script>`;
  return html.replace(/<head>\n/, `<head>\n  ${script}\n  ${alternativas}\n`);
}
