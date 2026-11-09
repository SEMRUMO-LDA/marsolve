#!/usr/bin/env node
// Monta em public/ o que o Vercel serve.
//
// Com um passo de build, o Vercel deixa de servir a raiz do projeto e passa
// a servir uma pasta de saida (vercel.json: outputDirectory). Copia-se para
// la tudo o que e site, e fica de fora o que so serve para o construir.

import { cp, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public');

// na raiz: o que nao e site
const FORA_DA_RAIZ = new Set([
  'public', 'node_modules', 'scripts', 'api', 'Claude outputs',
  'package.json', 'package-lock.json', 'vercel.json',
]);

// as paginas que vem do kiban sao servidas pela funcao (api/site.mjs): se
// estivessem tambem em public/, o Vercel servia o ficheiro e nunca a funcao
const DINAMICAS = /^(?:index|portfolio|about|contact)\.html$|^obra-[a-z0-9-]+\.html$|^sitemap\.xml$/;

function fica(rel) {
  const nome = path.basename(rel);
  if (rel === nome && DINAMICAS.test(nome)) return false;
  if (nome.startsWith('.')) return false;                       // .git, .env, .DS_Store...
  if (/^_/.test(nome)) return false;                            // ficheiros de trabalho (_t.tgz, _*.jpg)
  if (rel.startsWith('assets/originais')) return false;         // originais pesados, fora do git
  if (/^assets\/obras\/[^/]+\/[^/]+\.jpe?g$/i.test(rel)) return false; // idem: o site usa os de web/
  return true;
}

await rm(SAIDA, { recursive: true, force: true });
let n = 0;
for (const nome of await readdir(RAIZ)) {
  if (FORA_DA_RAIZ.has(nome) || !fica(nome)) continue;
  await cp(path.join(RAIZ, nome), path.join(SAIDA, nome), {
    recursive: true,
    filter: (src) => {
      const ok = fica(path.relative(RAIZ, src));
      if (ok) n++;
      return ok;
    },
  });
}
console.log(`[publicar] public/ montada (${n} entradas)`);
