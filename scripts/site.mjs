// O site montado a pedido, com os dados do kiban desse momento.
//
// Antes, as paginas que dependem do kiban eram escritas no build, e uma
// alteracao no kiban so chegava ao site com um deploy. Agora a funcao do
// Vercel (api/site.mjs) chama obterSite() e serve a pagina pedida; o CDN
// guarda-a 60s e depois serve a antiga enquanto vai buscar a nova. Uma
// obra gravada no kiban aparece em cerca de um minuto, sem deploy.
//
// Monta-se tudo de uma vez (as 9 obras, a entrada, o portfolio, o Sobre,
// o Contacto e o sitemap): sao poucas paginas, e as obras dependem umas das
// outras (a "obra seguinte", os cards). Fica em memoria 30s, para os
// pedidos seguidos nao irem todos ao kiban.
//
// Se o kiban falhar, serve-se a ultima versao boa que esta em memoria; se
// nao houver nenhuma, o HTML que esta no git. O site nunca cai por causa
// do kiban.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { RAIZ, configuracao, ChaveRecusada, buscarEntradas } from './kiban.mjs';
import { prepararObras, gerarObras } from './obras.mjs';
import { escolherEntrada, aplicarConteudo } from './conteudo.mjs';

// as paginas que vem do kiban; o resto do site e estatico
export const DINAMICAS = /^(?:index|portfolio|about|contact)\.html$|^obra-[a-z0-9-]+\.html$|^sitemap\.xml$/;
const DAS_OBRAS = /^(?:index|portfolio)\.html$|^obra-[a-z0-9-]+\.html$|^sitemap\.xml$/;
const VALIDADE = 30 * 1000;
const NOVA_TENTATIVA = 5 * 1000;

const ler = (f) => readFile(path.join(RAIZ, f), 'utf8');

let doGit = null;
export function paginasDoGit() {
  if (!doGit) {
    doGit = (async () => {
      const nomes = (await readdir(RAIZ)).filter((f) => DINAMICAS.test(f));
      return new Map(await Promise.all(nomes.map(async (f) => [f, await ler(f)])));
    })();
  }
  return doGit;
}

let cfg = null;
const calado = () => {};

async function construir() {
  cfg ??= await configuracao('site');
  // undefined: o pedido falhou; null: a colecao nao existe (normal para
  // sobre e contactos enquanto nao forem criadas)
  const pedir = (c) => buscarEntradas(cfg, c, { aviso: calado }).catch((err) => {
    if (err instanceof ChaveRecusada) throw err;
    console.warn(`[site] ${c}: ${err.message}`);
    return undefined;
  });
  const [eObras, eContactos, eSobre] = await Promise.all([pedir('obras'), pedir('contactos'), pedir('sobre')]);
  const git = await paginasDoGit();
  let completo = eObras !== undefined && eContactos !== undefined && eSobre !== undefined;

  const obras = eObras ? await prepararObras(eObras) : [];
  let ficheiros;
  if (obras.length) {
    ficheiros = await gerarObras(obras, ler);
  } else {
    completo = false;
    ficheiros = new Map([...git].filter(([f]) => DAS_OBRAS.test(f)));
  }
  for (const f of ['about.html', 'contact.html']) ficheiros.set(f, git.get(f));

  const contactos = escolherEntrada('contactos', eContactos, calado);
  const sobre = escolherEntrada('sobre', eSobre, calado);
  await aplicarConteudo(ficheiros, { contactos, sobre },
    async (f) => ficheiros.get(f) ?? ler(f),
    [...ficheiros.keys()].filter((f) => f.endsWith('.html')).sort());

  return { ficheiros, completo, quando: Date.now() };
}

let emMemoria = null;
let aConstruir = null;

export async function obterSite() {
  if (emMemoria && Date.now() - emMemoria.quando < VALIDADE) return emMemoria;
  if (!aConstruir) {
    aConstruir = construir()
      .then((novo) => {
        // uma versao incompleta (kiban com falhas) nao substitui uma boa:
        // fica a boa, e tenta-se outra vez daqui a pouco
        if (!novo.completo && emMemoria?.completo) {
          emMemoria.quando = Date.now() - VALIDADE + NOVA_TENTATIVA;
        } else {
          emMemoria = novo;
        }
        return emMemoria;
      })
      .catch(async (err) => {
        console.error('[site] nao consegui montar o site:', err.message);
        if (emMemoria) return emMemoria;
        // o HTML do git, guardado so uns segundos: nao martelar o kiban
        emMemoria = { ficheiros: await paginasDoGit(), completo: false, quando: Date.now() - VALIDADE + NOVA_TENTATIVA };
        return emMemoria;
      })
      .finally(() => { aConstruir = null; });
  }
  return aConstruir;
}
