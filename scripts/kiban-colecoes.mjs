#!/usr/bin/env node
// Cria no kiban as colecoes "sobre" e "contactos", e a primeira entrada de
// cada uma com o texto que o site tem hoje -- assim, no primeiro build
// depois disto, nada muda a vista: so passa a vir do kiban.
//
// Criar colecoes pede uma sessao de administrador do kiban; a chave do site
// (kiban.js) so le e recebe formularios. O script pede o email e a password
// de quem o corre e nao os guarda em lado nenhum.
//
//   node scripts/kiban-colecoes.mjs             cria o que faltar (pede login)
//   node scripts/kiban-colecoes.mjs --mostrar   so mostra o que criaria
//
// Pode correr-se mais de uma vez: uma colecao que ja existe nao e mexida, e
// uma entrada que ja existe tambem nao -- o texto que la estiver e o que
// alguem escreveu no kiban, e vale mais do que o daqui.
//
// O conteudo inicial tambem serve ao conteudo.mjs --inicial, que gera as
// paginas a partir dele sem ir ao kiban (para comparar com o HTML actual).

import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

const PARAGRAFOS = 'Parágrafos separados por uma linha em branco. **assim** fica a negrito.';

export const COLECOES = [
  {
    name: 'Contactos',
    slug: 'contactos',
    description: 'Telefone, email, morada e redes sociais do site (página Contacto e menu de todas as páginas)',
    type: 'custom',
    fields: [
      { id: 'titulo', name: 'titulo', label: 'Título da página', type: 'text', required: true, helpText: 'A primeira parte do título grande do Contacto.' },
      { id: 'titulo_destaque', name: 'titulo_destaque', label: 'Título — parte em itálico', type: 'text', helpText: 'O fim do título, que aparece em itálico.' },
      { id: 'introducao', name: 'introducao', label: 'Texto de abertura', type: 'textarea', required: true, helpText: 'O parágrafo antes do email e do telefone.' },
      { id: 'email', name: 'email', label: 'Email', type: 'email', required: true, helpText: 'Também é para onde o formulário manda as pessoas se o envio falhar.' },
      { id: 'telefone', name: 'telefone', label: 'Telefone', type: 'text', required: true, placeholder: '(+351) 282 312 485', helpText: 'Como aparece no site; o link para ligar faz-se a partir dele.' },
      { id: 'morada', name: 'morada', label: 'Morada', type: 'textarea', required: true, helpText: 'Uma linha da morada por linha.' },
      { id: 'mapa', name: 'mapa', label: 'Link do mapa', type: 'url', helpText: 'Opcional. Vazio: abre uma pesquisa da morada no Google Maps.' },
      { id: 'instagram', name: 'instagram', label: 'Instagram', type: 'url', helpText: 'Vazio: o link sai do site.' },
      { id: 'facebook', name: 'facebook', label: 'Facebook', type: 'url', helpText: 'Vazio: o link sai do site.' },
    ],
    entrada: {
      title: 'Contactos',
      slug: 'contactos',
      content: {
        titulo: 'Diga-nos o que tem em mãos e',
        titulo_destaque: 'começamos a construir.',
        introducao: 'Respondemos a todos os pedidos. Se preferir falar directamente, use o telefone ou o email — e se o assunto for uma obra em curso, diga-nos qual.',
        email: 'comercial@marsolve.net',
        telefone: '(+351) 282 312 485',
        morada: 'Quinta dos Arcos, Lote 23 Loja C\n8365-186 Armação de Pêra',
        mapa: 'https://www.google.com/maps/search/?api=1&query=Quinta+dos+Arcos+Lote+23+8365-186+Arma%C3%A7%C3%A3o+de+P%C3%AAra',
        instagram: 'https://www.instagram.com/marsolve_/',
        facebook: 'https://www.facebook.com/marsolve.net/',
      },
    },
  },
  {
    name: 'Sobre',
    slug: 'sobre',
    description: 'O texto da página Sobre Nós',
    type: 'custom',
    fields: [
      { id: 'titulo', name: 'titulo', label: 'Título da página', type: 'text', required: true, helpText: 'A primeira parte do título grande.' },
      { id: 'titulo_destaque', name: 'titulo_destaque', label: 'Título — parte em itálico', type: 'text', helpText: 'O fim do título, que aparece em itálico.' },
      { id: 'quem_somos', name: 'quem_somos', label: '(Quem somos)', type: 'textarea', required: true, helpText: PARAGRAFOS },
      { id: 'diferenciacao', name: 'diferenciacao', label: '(Diferenciação)', type: 'textarea', required: true, helpText: PARAGRAFOS },
      { id: 'principios', name: 'principios', label: '(Princípios & propósito)', type: 'textarea', required: true, helpText: 'O texto antes da lista de valores. ' + PARAGRAFOS },
      { id: 'valores', name: 'valores', label: 'Valores', type: 'textarea', required: true, helpText: 'Um valor por linha. A numeração (01), (02)… é automática.' },
      { id: 'em_suma', name: 'em_suma', label: '(Em suma)', type: 'textarea', required: true, helpText: 'A citação final. As aspas « » são postas pelo site.' },
    ],
    entrada: {
      title: 'Sobre',
      slug: 'sobre',
      content: {
        titulo: 'Construção civil no Algarve,',
        titulo_destaque: 'há mais de 10 anos',
        quem_somos: 'A **MARSOLVE** é uma empresa de construção civil de grande referência na região do Algarve, com mais de 10 anos de experiência consolidada no mercado. Reconhecida como sinónimo de qualidade e garantia, a empresa dedica-se não só à construção civil, mas também a áreas como a topografia e a prestação de serviços complementares de limpeza e gestão de propriedades.',
        diferenciacao: 'O grande fator de diferenciação da **MARSOLVE** face à concorrência reside na sua capacidade de gerir eficazmente os projetos e manter uma interação muito próxima com o cliente. O objetivo principal é garantir que o serviço prestado corresponde de forma exata às necessidades e desejos de cada cliente.\n\nEsta abordagem tem permitido estabelecer e manter uma excelente relação de confiança com promotores, parceiros, trabalhadores e clientes (contando já com o testemunho positivo de entidades de renome como o **Grupo AP Hotels & Resorts**).',
        principios: 'A visão da empresa é clara: ser a primeira escolha na área da construção para os diversos stakeholders na região algarvia. Para atingir este objetivo, a **MARSOLVE** atua com base num conjunto de valores fundamentais:',
        valores: 'Liderar pelo exemplo.\nTrabalhar em equipa, ouvindo atentamente todos os intervenientes nos projetos.\nCumprir as promessas, trabalhando sempre com o objetivo de as exceder.\nColaborar de forma próxima com todos os clientes e parceiros.\nFazer da segurança uma prioridade absoluta, executando cada obra de forma altamente responsável.',
        em_suma: 'A MARSOLVE apresenta-se como um parceiro de excelência, pautando-se pelo rigor, pela transparência, pelo cumprimento rigoroso de prazos e pela qualidade nas construções que efetua.',
      },
    },
  },
];

// — Daqui para baixo so corre quando o script e chamado directamente —

function perguntar(pergunta, { escondido = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (escondido) {
    // a pergunta aparece; o que se escreve a seguir nao
    rl._writeToOutput = (s) => { if (s.includes(pergunta)) process.stdout.write(pergunta); };
  }
  return new Promise((resolver) => rl.question(pergunta, (r) => {
    rl.close();
    if (escondido) process.stdout.write('\n');
    resolver(r.trim());
  }));
}

async function pedido(url, metodo, caminho, { token, tenant, corpo } = {}) {
  const r = await fetch(url + '/api/v1' + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(tenant ? { 'X-Tenant': tenant } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let j = null;
  try { j = await r.json(); } catch { /* sem corpo */ }
  return { ok: r.ok, status: r.status, data: j?.data, erro: j?.error?.message || (r.ok ? null : 'HTTP ' + r.status) };
}

async function main() {
  const mostrar = process.argv.includes('--mostrar');
  if (mostrar) {
    for (const c of COLECOES) {
      console.log(`\n${c.name} (${c.slug}): ${c.description}`);
      for (const f of c.fields) console.log(`  - ${f.id} [${f.type}${f.required ? ', obrigatório' : ''}] ${f.label}`);
    }
    return;
  }

  const url = (process.env.KIBAN_API_URL || 'https://kiban.pt').replace(/\/$/, '');
  console.log(`Login no kiban (${url}). A password não é guardada.`);
  const email = process.env.KIBAN_EMAIL || await perguntar('Email: ');
  const password = process.env.KIBAN_PASSWORD || await perguntar('Password: ', { escondido: true });

  const login = await pedido(url, 'POST', '/auth/login', { corpo: { email, password } });
  if (!login.ok || !login.data?.session?.access_token) {
    throw new Error(`o login falhou: ${login.erro || 'sem sessão na resposta'}`);
  }
  const token = login.data.session.access_token;
  const tenant = login.data.tenantId;
  console.log(`Sessão aberta (tenant ${tenant}).\n`);

  for (const c of COLECOES) {
    const criada = await pedido(url, 'POST', '/collections', {
      token, tenant,
      corpo: { name: c.name, slug: c.slug, description: c.description, type: c.type, fields: c.fields },
    });
    if (criada.ok) {
      console.log(`✓ colecao ${c.slug} criada`);
    } else if (/already exists/i.test(criada.erro || '')) {
      console.log(`· colecao ${c.slug} ja existia: os campos ficam como estao (confirmar que tem ${c.fields.map((f) => f.id).join(', ')})`);
    } else {
      throw new Error(`nao consegui criar a colecao ${c.slug}: ${criada.erro}`);
    }

    const existentes = await pedido(url, 'GET', `/entries/${c.slug}?status=published&limit=5`, { token, tenant });
    const rascunhos = await pedido(url, 'GET', `/entries/${c.slug}?status=draft&limit=5`, { token, tenant });
    const ha = [...(existentes.data || []), ...(rascunhos.data || [])];
    if (ha.length) {
      console.log(`· ${c.slug} ja tem conteudo ("${ha[0].title}"): nao lhe toco`);
      continue;
    }
    const nova = await pedido(url, 'POST', `/entries/${c.slug}`, {
      token, tenant,
      corpo: { ...c.entrada, status: 'published' },
    });
    if (!nova.ok) throw new Error(`nao consegui criar a entrada de ${c.slug}: ${nova.erro}`);
    console.log(`✓ entrada "${c.entrada.title}" publicada em ${c.slug}`);
  }

  // o site le com a chave publica, nao com a sessao: confirmar que ela ve
  // as colecoes novas (uma chave limitada a certas colecoes nao as veria)
  const { configuracao, buscarEntradas } = await import('./kiban.mjs');
  const cfg = await configuracao('colecoes');
  for (const c of COLECOES) {
    const e = await buscarEntradas(cfg, c.slug);
    console.log(e && e.length
      ? `✓ a chave do site ve ${c.slug}`
      : `✗ a chave do site NAO ve ${c.slug}: dar-lhe acesso a esta colecao nas API keys do kiban`);
  }
  console.log('\nFeito. O proximo deploy no Vercel ja vai buscar o Sobre e os Contactos ao kiban.');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[colecoes]', err.message);
    process.exit(1);
  });
}
