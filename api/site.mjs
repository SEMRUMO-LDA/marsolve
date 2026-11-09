// As paginas que vem do kiban, servidas a pedido (ver scripts/site.mjs).
// O vercel.json reescreve para aqui /, a entrada, o portfolio, o Sobre, o
// Contacto, as paginas das obras e o sitemap; o resto do site e estatico.

import { obterSite, DINAMICAS } from '../scripts/site.mjs';

// o CDN guarda 60s; depois disso serve a versao guardada enquanto vai
// buscar a nova -- quem visita nunca espera pelo kiban
const COM_KIBAN = 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400';
// sem o kiban (ou com falhas): pouco tempo, para a versao boa voltar depressa
const SEM_KIBAN = 'public, max-age=0, s-maxage=10, stale-while-revalidate=60';

const NAO_EXISTE = `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Página não encontrada | Marsolve</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="style.css?v=42"></head>
<body class="politica-pagina"><main><article class="politica">
<p class="politica__sobretitulo">Erro 404</p>
<h1 class="politica__titulo">Esta página não existe</h1>
<section class="politica__seccao"><p>A obra pode ter deixado de estar publicada. <a href="portfolio.html">Ver o portfólio</a></p></section>
</article></main></body></html>`;

export default async function handler(req, res) {
  const pedido = new URL(req.url, 'http://local');
  const f = pedido.searchParams.get('f') || 'index.html';

  if (!DINAMICAS.test(f)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(NAO_EXISTE);
  }

  const site = await obterSite();
  const corpo = site.ficheiros.get(f);
  if (!corpo) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', SEM_KIBAN);
    return res.end(NAO_EXISTE);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', f.endsWith('.xml') ? 'application/xml; charset=utf-8' : 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', site.completo ? COM_KIBAN : SEM_KIBAN);
  res.setHeader('X-Marsolve-Kiban', site.completo ? 'sim' : 'nao');
  res.end(corpo);
}
