/* ============================================
   REALEVATE CLONE — App Logic
   ============================================ */

(function () {
  'use strict';

  // — DOM References —
  const body = document.body;
  const preloader = document.getElementById('site-preloader');
  const preloaderFrames = document.querySelectorAll('.site-preloader__frame');
  const tensDigi = document.querySelector('.site-preloader__digit--tens .site-preloader__digit-inner');
  const onesDigi = document.querySelector('.site-preloader__digit--ones .site-preloader__digit-inner');
  const selectionBtn = document.getElementById('open-selection-btn');
  const pageStage = document.getElementById('page-stage');
  const menuToggleBtn = document.getElementById('menu-toggle-btn');
  const navMenu = document.getElementById('nav-menu');
  const navMenuClose = document.getElementById('nav-menu-close');
  const navMenuBackdrop = navMenu ? navMenu.querySelector('.nav-menu__backdrop') : null;

  // — Preloader —
  // Quem pediu ao sistema menos movimento tem perturbacoes vestibulares com
  // mais frequencia do que se imagina, e para essa pessoa isto nao e
  // desconforto, e enjoo. O CSS trata das animacoes; aqui ficam as duas que
  // vivem em JS -- o contador do preloader e o parallax da galeria.
  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

  let preloaderCount = 0;
  const totalFrames = preloaderFrames ? preloaderFrames.length : 0;
  const preloaderTarget = 100;
  let currentFrame = 0;

  function updateCounter(val) {
    if (!preloader) return;
    const clamped = Math.min(val, 99);
    const tens = Math.floor(clamped / 10);
    const ones = clamped % 10;
    const digitEl = document.querySelector('.site-preloader__digit');
    if (!digitEl) return;
    const digitH = parseFloat(getComputedStyle(digitEl).height);
    if (tensDigi) tensDigi.style.transform = `translateY(${-tens * digitH}px)`;
    if (onesDigi) onesDigi.style.transform = `translateY(${-ones * digitH}px)`;
  }

  function setFrame(index) {
    if (!preloaderFrames) return;
    preloaderFrames.forEach((f, i) => {
      f.classList.toggle('active', i === index);
    });
  }

  function runPreloader() {
    if (!preloader) {
      sessionStorage.setItem('marsolve_visited', 'true');
      body.classList.add('is-ready');
      return;
    }

    if (sessionStorage.getItem('marsolve_visited') || menosMovimento.matches) {
      preloader.style.display = 'none';
      body.classList.add('is-ready');
      // o hash e tratado por handlePortfolioHash(), chamado no init
      return;
    }

    sessionStorage.setItem('marsolve_visited', 'true');

    // Isto esteve a metade do compasso durante umas horas, por causa dos 3s
    // que segurava. O Tiago apanhou o que faltava ao raciocinio: o preloader
    // so corre uma vez por separador, portanto quem o ve, ve-o uma vez na
    // vida -- e a 1,3s nao dava para perceber o que era, so um piscar. Ou
    // dura o suficiente para ser alguma coisa, ou nao vale a pena existir.
    // Volta ao compasso original.
    const interval = setInterval(() => {
      preloaderCount += Math.random() * 8 + 2;
      if (preloaderCount >= preloaderTarget) {
        preloaderCount = preloaderTarget;
        clearInterval(interval);
        finishPreloader();
      }

      updateCounter(Math.floor(preloaderCount));

      if (totalFrames > 0) {
        const frameIndex = Math.min(
          Math.floor((preloaderCount / preloaderTarget) * totalFrames),
          totalFrames - 1
        );
        if (frameIndex !== currentFrame) {
          currentFrame = frameIndex;
          setFrame(frameIndex);
        }
      }
    }, 120);
  }

  function finishPreloader() {
    if (!preloader) {
      body.classList.add('is-ready');
      return;
    }
    setTimeout(() => {
      preloader.classList.add('hidden');
      setTimeout(() => {
        body.classList.add('is-ready');
        preloader.style.display = 'none';
        // chegou com #portfolio: abre o estado aqui, ja depois do preloader,
        // para a transicao ser vista em vez de acontecer por tras dele
        handlePortfolioHash();
      }, 600);
    }, 400);
  }

  // — Selection Menu Toggle —
  // O URL acompanha o estado: com o portfolio aberto o endereco e
  // #portfolio, o que o torna partilhavel e faz o botao Voltar fechar.
  // syncingUrl evita que o hashchange que nos proprios provocamos volte a
  // entrar aqui.
  let syncingUrl = false;

  function homeSelectionAvailable() {
    return isHomePage && !!document.getElementById('home-selection');
  }

  function setPortfolioHash(on) {
    if (!homeSelectionAvailable()) return;
    const hasHash = window.location.hash === '#portfolio';
    if (on === hasHash) return;
    syncingUrl = true;
    try {
      const url = on ? '#portfolio' : window.location.pathname + window.location.search;
      history.pushState({ portfolio: on }, '', url);
    } catch (_) {}
    setTimeout(() => { syncingUrl = false; }, 0);
  }

  function openSelection() {
    body.classList.add('selection-open');
    // ate aqui os cards nao tem altura, e sem altura nao ha o que medir
    document.dispatchEvent(new CustomEvent('marsolve:cards'));
    setPortfolioHash(true);
    if (selectionBtn) selectionBtn.setAttribute('aria-expanded', 'true');
    const navPortfolioBtn = document.getElementById('nav-portfolio-btn');
    if (navPortfolioBtn) navPortfolioBtn.setAttribute('aria-expanded', 'true');
    if (navMenu && navMenu.classList.contains('open')) {
      closeNavMenu();
    }
  }

  function closeSelection() {
    body.classList.remove('selection-open');
    setPortfolioHash(false);
    if (selectionBtn) selectionBtn.setAttribute('aria-expanded', 'false');
    const navPortfolioBtn = document.getElementById('nav-portfolio-btn');
    if (navPortfolioBtn) navPortfolioBtn.setAttribute('aria-expanded', 'false');
  }

  if (selectionBtn) {
    selectionBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (body.classList.contains('selection-open')) {
        closeSelection();
      } else {
        openSelection();
      }
    });
  }

  const isPortfolioPage = window.location.pathname.includes('portfolio') || 
                          document.body.classList.contains('page--portfolio');
  const isAboutPage = window.location.pathname.includes('about') || 
                      document.body.classList.contains('page--mosaic');
  const isContactPage = window.location.pathname.includes('contact') || 
                        document.body.classList.contains('page--white');
  const isHomePage = !isPortfolioPage && !isAboutPage && !isContactPage &&
                     (window.location.pathname.endsWith('index.html') || 
                      window.location.pathname === '/' || 
                      window.location.pathname.endsWith('/') ||
                      document.body.classList.contains('page--home') ||
                      !window.location.pathname.includes('.html'));

  // Close selection when clicking the minimized page
  if (pageStage) {
    pageStage.addEventListener('click', (e) => {
      // na home os cards e a moldura vivem dentro do page-stage: cliques neles
      // devem seguir o seu proprio comportamento, nao fechar a selecao
      if (e.target.closest && e.target.closest(
            '.home-selection, .site-nav, .selection-controls, .bottom-left-contact')) return;
      if (body.classList.contains('selection-open')) {
        if (isPortfolioPage) {
          closeSelection();
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 600);
          return;
        }
        closeSelection();
      }
    });
  }

  // — Nav Menu (slide drawer) —
  //
  // Com a gaveta aberta, o Tab andava pela pagina por tras -- o "Scroll", os
  // pontos do carrossel, as setas -- antes de chegar ao menu. Quem nao ve o
  // ecra ficava a percorrer coisas invisiveis.
  //
  // A solucao nao e um ciclo de Tab em JS: e por a pagina inteira em `inert`
  // enquanto a gaveta esta aberta. O browser trata do resto -- tira-a do
  // percurso do teclado e da arvore de acessibilidade de uma vez -- e nao ha
  // ciclo nenhum para manter. So falta levar o foco la para dentro ao abrir e
  // devolve-lo a quem abriu ao fechar, senao a pessoa volta ao inicio da
  // pagina sem perceber porque.
  const foraDaGaveta = () =>
    [...document.body.children].filter(el => el !== navMenu && el.tagName !== 'SCRIPT');

  let quemAbriu = null;

  function openNavMenu() {
    if (!navMenu || navMenu.classList.contains('open')) return;
    quemAbriu = document.activeElement;
    navMenu.classList.add('open');
    navMenu.setAttribute('aria-hidden', 'false');
    foraDaGaveta().forEach(el => el.setAttribute('inert', ''));
    document.querySelectorAll('.menu-btn').forEach(b => b.setAttribute('aria-expanded', 'true'));
    // a seguir a animacao de entrada, senao o browser salta a pagina para o
    // sitio onde o botao ainda esta a caminho
    setTimeout(() => {
      // o querySelector com lista devolve o primeiro do documento, seja
      // qual for o selector que casou -- com o logotipo no topo era ele a
      // apanhar o foco em vez do X
      const primeiro = navMenu.querySelector('.nav-menu__close')
        || navMenu.querySelector('a[href], button');
      if (primeiro) primeiro.focus();
    }, 320);
  }

  function closeNavMenu() {
    if (!navMenu || !navMenu.classList.contains('open')) return;
    navMenu.classList.remove('open');
    navMenu.setAttribute('aria-hidden', 'true');
    foraDaGaveta().forEach(el => el.removeAttribute('inert'));
    document.querySelectorAll('.menu-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (quemAbriu && document.contains(quemAbriu)) quemAbriu.focus();
    quemAbriu = null;
  }

  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navMenu && navMenu.classList.contains('open')) {
        closeNavMenu();
      } else {
        openNavMenu();
      }
    });
  });

  if (navMenuClose) {
    navMenuClose.addEventListener('click', closeNavMenu);
  }

  if (navMenuBackdrop) {
    navMenuBackdrop.addEventListener('click', closeNavMenu);
  }

  if (window.location.hash === '#menu') {
    setTimeout(openNavMenu, 500);
  }
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#menu') openNavMenu();
  });

  // — Keyboard —
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isPortfolioPage) {
        window.location.href = 'index.html';
        return;
      }
      if (body.classList.contains('selection-open')) {
        closeSelection();
      }
      if (navMenu && navMenu.classList.contains('open')) {
        closeNavMenu();
      }
    }
  });

  // — Portfolio triggers —
  function togglePortfolioSelection(e) {
    if (e) {
      e.preventDefault();
      // sem isto o clique sobe ate ao pageStage, que ve selection-open a true
      // e fecha logo a seguir: da hero nada parecia acontecer, e ja aberto
      // voltava atras
      e.stopPropagation();
    }
    closeNavMenu();
    if (isPortfolioPage) {
      updateCarousel(0);
      return;
    }
    // na home o portfolio e um estado, nao uma pagina
    if (isHomePage && document.getElementById('home-selection')) {
      updateCarousel(0);
      openSelection();
      return;
    }
    // noutras paginas, voltar a home com o hash: o portfolio vive la
    window.location.href = 'index.html#portfolio';
  }

  // Attach to all portfolio buttons
  const portfolioBtns = document.querySelectorAll('#nav-portfolio-btn, .portfolio-btn, #drawer-open-portfolio, [data-portfolio-trigger]');
  portfolioBtns.forEach(btn => {
    btn.addEventListener('click', togglePortfolioSelection);
  });

  // #portfolio na home abre o estado; noutra pagina qualquer, volta a home
  function handlePortfolioHash() {
    if (isPortfolioPage) return;
    const wants = window.location.hash === '#portfolio';

    if (homeSelectionAvailable()) {
      // tirar ou por o hash (incluindo pelo botao Voltar) muda o estado
      if (wants && !body.classList.contains('selection-open')) {
        updateCarousel(0);
        openSelection();
      } else if (!wants && body.classList.contains('selection-open')) {
        closeSelection();
      }
      return;
    }

    if (wants) window.location.href = 'index.html#portfolio';
  }

  // a chamada inicial fica no init: aqui o carrossel ainda nao esta declarado
  window.addEventListener('hashchange', () => {
    if (syncingUrl) return;
    handlePortfolioHash();
  });
  window.addEventListener('popstate', () => {
    if (isPortfolioPage) return;
    handlePortfolioHash();
  });

  // — Scroll na home leva ao portfólio —
  // A home é um ecrã fixo (html,body têm overflow:hidden), por isso o gesto
  // de scroll não tinha destino nenhum. Aqui damos-lhe um: descer navega
  // para o portfólio, tal como já fazem os botões "Portfólio".
  if (isHomePage) {
    const WHEEL_THRESHOLD = 60;   // ignora toques leves no trackpad
    const SWIPE_THRESHOLD = 60;
    const ARM_DELAY = 900;        // ignora a inércia residual ao voltar atrás

    let wheelAccum = 0;
    let resetTimer = null;
    let armed = false;

    setTimeout(() => { armed = true; }, ARM_DELAY);

    function gestureAllowed() {
      return armed &&
             body.classList.contains('is-ready') &&
             !(navMenu && navMenu.classList.contains('open'));
    }

    function isOpen() {
      return body.classList.contains('selection-open');
    }

    const homeSelection = document.getElementById('home-selection');

    function showSelection() {
      if (!homeSelection) {
        // sem cards na pagina, o comportamento antigo serve de recurso
        window.location.href = 'portfolio.html';
        return;
      }
      updateCarousel(0);
      openSelection();
    }

    function hideSelection() {
      closeSelection();
    }

    // Com os cards a rolar por dentro -- no telemovel sao oito, um por ecra --
    // o gesto para cima e primeiro deles. So fecha a selecao quando a lista ja
    // esta no topo; a meio do portfolio, dois dedos para cima iam parar a
    // hero sem se perceber porque. Quando a lista ainda tem por onde subir, a
    // contagem e zerada: assim e preciso um gesto novo depois de chegar ao
    // topo, em vez de o mesmo impulso continuar e fechar.
    function listaNoTopo() {
      const slide = document.querySelector('.selection-cards-slide:not([hidden])');
      return !slide || slide.scrollTop <= 1;
    }

    window.addEventListener('wheel', (e) => {
      if (!gestureAllowed()) return;
      // gesto sobretudo horizontal pertence ao carrossel, nao a selecao
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      // acumula na direcao do gesto; inverter o sentido zera a contagem
      if ((wheelAccum > 0 && e.deltaY < 0) || (wheelAccum < 0 && e.deltaY > 0)) wheelAccum = 0;
      wheelAccum += e.deltaY;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { wheelAccum = 0; }, 200);

      if (!isOpen() && wheelAccum >= WHEEL_THRESHOLD) {
        wheelAccum = 0;
        showSelection();
      } else if (isOpen() && wheelAccum <= -WHEEL_THRESHOLD) {
        wheelAccum = 0;
        if (listaNoTopo()) hideSelection();
      }
    }, { passive: true });

    let swipeStartY = null;
    let swipeStartX = null;
    window.addEventListener('touchstart', (e) => {
      swipeStartY = e.changedTouches[0].screenY;
      swipeStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (swipeStartY === null) return;
      const travelled = swipeStartY - e.changedTouches[0].screenY;
      const sideways = Math.abs(swipeStartX - e.changedTouches[0].screenX);
      swipeStartY = null;
      swipeStartX = null;
      // o mesmo criterio do trackpad: gesto lateral e do carrossel
      if (sideways > Math.abs(travelled)) return;
      if (!gestureAllowed()) return;
      if (!isOpen() && travelled > SWIPE_THRESHOLD) showSelection();
      else if (isOpen() && travelled < -SWIPE_THRESHOLD && listaNoTopo()) hideSelection();
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (!gestureAllowed()) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!isOpen() && (e.key === 'ArrowDown' || e.key === 'PageDown')) {
        e.preventDefault();
        showSelection();
      } else if (isOpen() && (e.key === 'ArrowUp' || e.key === 'PageUp')) {
        if (!listaNoTopo()) return;   // a lista sobe primeiro
        e.preventDefault();
        hideSelection();
      }
    });
  }

  // — Canto inferior esquerdo: scroll na hero —
  const scrollCue = document.getElementById('scroll-cue');
  if (scrollCue) {
    scrollCue.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePortfolioSelection();
    });
  }

  // — Pagina da obra —
  // Tres coisas conduzidas pelo scroll, todas na mesma passagem por quadro:
  // a capa a crescer, as fotos a deslizar dentro das molduras, e o fim da
  // pagina a levar a obra seguinte. O JS so conta; as medidas sao do CSS.
  const grelhaObra = document.querySelector('body.page--detalhe .page-grid');
  if (grelhaObra) {
    const raiz = document.documentElement;
    const artigo = document.querySelector('.obra');
    const palco = document.querySelector('.obra-hero__palco');
    const fixo = document.querySelector('.obra-hero__fixo');
    const fotos = [...document.querySelectorAll('.obra-galeria__item img')];
    const seguinte = document.querySelector('.obra-seguinte');
    const ligacao = document.querySelector('.obra-seguinte__link');

    const entre = (v, min, max) => Math.max(min, Math.min(max, v));

    // distancia do topo do elemento ao topo do conteudo que rola
    const topoEm = (el) => {
      let y = 0;
      for (let n = el; n && n !== grelhaObra; n = n.offsetParent) y += n.offsetTop;
      return y;
    };

    // A faixa da abertura tem de ser exactamente a mesma da hero da home,
    // senao a imagem aparece mais abaixo e nota-se logo. A hero vive na linha
    // do meio da grelha; aqui nao ha linhas, por isso a altura e medida a
    // partir das mesmas pecas: a moldura, a linha do logotipo, as folgas, a
    // barra de baixo, e o puxao de 3.8vh que a hero da a si propria.
    const faixaDaHero = () => {
      const nav = document.querySelector('.site-nav');
      const botao = document.querySelector('.menu-btn');
      const est = getComputedStyle(grelhaObra);
      const util = grelhaObra.clientHeight
        - parseFloat(est.paddingTop) - parseFloat(est.paddingBottom);
      const folga = parseFloat(est.rowGap) || 0;
      return util - (nav ? nav.offsetHeight : 70) - folga * 2
        - (botao ? botao.offsetHeight : 46) + window.innerHeight * 0.038;
    };

    // onde a abertura ja esta pousada: a linha do logotipo mais a folga
    const topoDaHero = () => {
      const nav = document.querySelector('.site-nav');
      const folga = parseFloat(getComputedStyle(grelhaObra).rowGap) || 0;
      return (nav ? nav.offsetHeight : 70) + folga;
    };

    let medidas = null;
    const medir = () => {
      const alturaEcra = grelhaObra.clientHeight;
      // as medidas vao para a raiz, e nao para o artigo: o fundo da pagina
      // e pintado no #page-stage, que esta acima dele, e uma variavel so
      // desce, nunca sobe
      raiz.style.setProperty('--obra-hero-altura', faixaDaHero().toFixed(1) + 'px');
      raiz.style.setProperty('--obra-hero-topo', topoDaHero().toFixed(1) + 'px');

      medidas = {
        alturaEcra,
        abertura: palco ? {
          // a que altura de scroll a abertura fica presa. O offsetTop conta a
          // partir da caixa de padding e o top da sticky tambem, por isso a
          // moldura de cima entra nas duas contas e tem de sair de uma: com as
          // folgas certas isto da zero, ou seja cresce desde o primeiro pixel.
          topo: Math.max(0, topoEm(palco)
            - (parseFloat(getComputedStyle(grelhaObra).paddingTop) || 0)
            - (parseFloat(getComputedStyle(fixo).top) || 0)),
          curso: palco.offsetHeight - fixo.offsetHeight
        } : null,
        // cada moldura tem a sua propria passagem pelo ecra
        fotos: fotos.map(img => {
          const moldura = img.closest('.obra-galeria__item');
          return { img: img, topo: topoEm(moldura), altura: moldura.offsetHeight };
        }),
        seguinte: seguinte ? { topo: topoEm(seguinte), altura: seguinte.offsetHeight } : null
      };
    };

    let insistencia = 0;         // 0 a 1: quanto se insistiu no scroll no fim
    const INSISTENCIA_NECESSARIA = 900;
    let acumulado = 0;
    let aNavegar = false;

    const pintar = () => {
      pedido = null;
      if (!medidas) medir();
      const y = grelhaObra.scrollTop;
      const h = medidas.alturaEcra;

      if (medidas.abertura) {
        const a = medidas.abertura;
        const p = a.curso > 0 ? entre((y - a.topo) / a.curso, 0, 1) : 0;
        raiz.style.setProperty('--abertura', p.toFixed(4));
        // o logotipo larga a janela quando a abertura acaba; ate la fica
        // preso por CSS, sem nada escrito a cada frame
        document.body.classList.toggle('obra-aberta', p > 0.995);
        // numa obra o fundo ja e branco desde o inicio e o que muda aqui e
        // so a tinta, do terracota para o preto. No Sobre o fundo tambem
        // esta a virar do azul para o branco (no CSS): a tinta nao se pode
        // misturar, por isso troca de uma vez a meio dessa viragem, onde o
        // fundo ja e claro.
        document.body.classList.toggle('obra-claro', p > 0.81);
      } else {
        document.body.classList.toggle('obra-claro', y > h * 0.34);
      }

      // -1 quando a moldura entra por baixo, +1 quando sai por cima. O
      // parallax anda ao contrario do scroll, que e o que enjoa: com
      // movimento reduzido as fotos ficam quietas dentro das molduras.
      if (!menosMovimento.matches) {
        for (const f of medidas.fotos) {
          const p = entre((y + h - f.topo) / (h + f.altura), 0, 1) * 2 - 1;
          f.img.style.translate = '0 ' + (p * 11).toFixed(2) + '%';
        }
      }

      if (medidas.seguinte) {
        const sg = medidas.seguinte;
        const visivel = y + h > sg.topo + sg.altura * 0.35;
        seguinte.classList.toggle('obra-seguinte--visivel', visivel);
        document.body.classList.toggle('obra-fim', visivel);
        if (!noFundo()) { acumulado = 0; aplicarInsistencia(0); }
      }
    };

    const noFundo = () =>
      grelhaObra.scrollTop >= grelhaObra.scrollHeight - grelhaObra.clientHeight - 4;

    const aplicarInsistencia = (v) => {
      if (v === insistencia) return;
      insistencia = v;
      if (seguinte) seguinte.style.setProperty('--insistencia', v.toFixed(3));
    };

    // Chegado ao fim, continuar a fazer scroll leva a obra seguinte. Nao basta
    // um empurrao: e preciso insistir, senao quem chega ao fundo por acaso era
    // levado para outra pagina sem querer.
    //
    // O medidor nao esvazia com o tempo. Esvaziava, e parar um instante fazia
    // a barra recuar sozinha -- parecia que o scroll nao tinha contado. Fica
    // cheia ate onde se chegou, e o empurrao seguinte continua dai. Quem se
    // afasta do fundo e que volta a zero, no pintar(), e essa e a salvaguarda
    // que interessa: ninguem e levado para outra pagina sem ter insistido.
    const insistir = (delta) => {
      if (aNavegar || !ligacao || !noFundo() || delta <= 0) return;
      acumulado = Math.min(INSISTENCIA_NECESSARIA, acumulado + Math.min(delta, 60));
      aplicarInsistencia(acumulado / INSISTENCIA_NECESSARIA);
      if (acumulado >= INSISTENCIA_NECESSARIA) {
        aNavegar = true;
        window.location.href = ligacao.getAttribute('href');
      }
    };

    let pedido = null;
    const agendar = () => { if (pedido === null) pedido = requestAnimationFrame(pintar); };

    grelhaObra.addEventListener('scroll', agendar, { passive: true });
    grelhaObra.addEventListener('wheel', (e) => insistir(e.deltaY), { passive: true });

    let toqueY = null;
    grelhaObra.addEventListener('touchstart', (e) => { toqueY = e.touches[0].clientY; }, { passive: true });
    grelhaObra.addEventListener('touchmove', (e) => {
      if (toqueY === null) return;
      const y = e.touches[0].clientY;
      insistir((toqueY - y) * 1.8);
      toqueY = y;
    }, { passive: true });

    window.addEventListener('resize', () => { medidas = null; agendar(); });
    window.addEventListener('load', () => { medidas = null; agendar(); });
    medir();
    pintar();
  }

  // — Filtros das obras —
  // Os cards escondidos saem do fluxo, por isso o carrossel tem de voltar
  // ao primeiro slide: com poucos resultados o segundo pode ficar vazio.
  const filterBtns = document.querySelectorAll('.corner-filter');
  if (filterBtns.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const filtro = btn.getAttribute('data-filter');

        filterBtns.forEach(b => {
          const activo = b === btn;
          b.classList.toggle('is-active', activo);
          b.setAttribute('aria-pressed', activo ? 'true' : 'false');
        });

        aplicarFiltro(filtro);
      });
    });
  }

  // — Filtrar e reagrupar —
  // Os cards estao distribuidos por slides fixos de quatro. Esconder alguns
  // deixaria buracos e obras da mesma seleccao espalhadas por duas paginas,
  // por isso os visiveis sao redistribuidos desde o inicio.
  const todosOsCards = [...document.querySelectorAll('.selection-card')];
  const slides = [...document.querySelectorAll('.selection-cards-slide')];
  const POR_SLIDE = 4;

  function aplicarFiltro(filtro) {
    if (!slides.length) return;

    const visiveis = todosOsCards.filter(card =>
      filtro === 'todos' || card.getAttribute('data-status') === filtro);

    todosOsCards.forEach(card => { card.hidden = !visiveis.includes(card); });

    // recolocar por ordem, quatro a quatro
    visiveis.forEach((card, i) => {
      const destino = slides[Math.floor(i / POR_SLIDE)];
      if (destino) destino.appendChild(card);
    });

    const usados = Math.max(Math.ceil(visiveis.length / POR_SLIDE), 1);
    slides.forEach((slide, i) => { slide.hidden = i >= usados; });
    totalSlides = usados;
    updateCarousel(0);

    // No telemovel a fita e scroll nativo: o updateCarousel nao lhe toca e
    // ela ficava onde estava, so limitada pelo novo maximo -- filtrar
    // aterrava no ultimo resultado. Volta ao primeiro.
    if (carouselTrack && fitaNativa()) {
      carouselTrack.scrollTo({ left: 0, behavior: 'auto' });
    }

    // quem usa leitor de ecra nao ve os cards desaparecer
    const aviso = document.getElementById('filtro-resultado');
    if (aviso) {
      aviso.textContent = visiveis.length === 1
        ? '1 projeto' : visiveis.length + ' projetos';
    }
    // o filtro troca os cards de slide: os que entram podem trazer um nome
    // mais comprido do que os que ficaram
    document.dispatchEvent(new CustomEvent('marsolve:cards'));
  }

  // — 4-by-4 Portfolio Carousel Slider Logic —
  const carouselTrack = document.getElementById('selection-track');
  const carouselPrev = document.getElementById('carousel-prev');
  const carouselNext = document.getElementById('carousel-next');
  const carouselDots = document.querySelectorAll('.selection-slide-dot');
  const pageIndicator = document.getElementById('slide-page-indicator');
  let currentSlide = 0;
  let totalSlides = slides.length || 2;

  function updateCarousel(slideIndex) {
    currentSlide = Math.max(0, Math.min(slideIndex, totalSlides - 1));
    if (carouselTrack) {
      carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    if (carouselPrev) carouselPrev.disabled = (currentSlide === 0);
    if (carouselNext) carouselNext.disabled = (currentSlide === totalSlides - 1);

    // Com um filtro activo pode sobrar so uma pagina: os pontos a mais sao
    // escondidos para a pill nao prometer paginas que nao existem.
    carouselDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
      dot.hidden = idx >= totalSlides;
    });

    if (pageIndicator) {
      pageIndicator.textContent = `0${currentSlide + 1} / 0${totalSlides}`;
    }
  }

  if (carouselNext) {
    carouselNext.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCarousel(currentSlide + 1);
    });
  }

  if (carouselPrev) {
    carouselPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCarousel(currentSlide - 1);
    });
  }

  carouselDots.forEach((dot, idx) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCarousel(idx);
    });
  });

  // — Gesto horizontal: trackpad —
  // Num portatil o "swipe" lateral nao gera eventos de toque, gera wheel com
  // deltaX. Sem isto so as setas mudavam de pagina.
  function carouselInteractive() {
    if (isPortfolioPage) return true;
    return body.classList.contains('selection-open') &&
           !!document.getElementById('home-selection');
  }

  // No telemovel a fita rola de verdade, com snap do browser. Nesse modo
  // ninguem lhe pode mexer no transform nem contar paginas por ela: os
  // gestos sao do proprio scroll.
  function fitaNativa() {
    return !!carouselTrack && getComputedStyle(carouselTrack).overflowX === 'auto';
  }

  let hAccum = 0;
  let hTimer = null;
  const H_THRESHOLD = 60;

  window.addEventListener('wheel', (e) => {
    if (!carouselInteractive() || fitaNativa()) return;
    // so tratamos o gesto quando e claramente horizontal, para nao competir
    // com o scroll vertical que abre e fecha a selecao na home
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    if ((hAccum > 0 && e.deltaX < 0) || (hAccum < 0 && e.deltaX > 0)) hAccum = 0;
    hAccum += e.deltaX;
    clearTimeout(hTimer);
    hTimer = setTimeout(() => { hAccum = 0; }, 200);
    if (hAccum >= H_THRESHOLD) { hAccum = 0; updateCarousel(currentSlide + 1); }
    else if (hAccum <= -H_THRESHOLD) { hAccum = 0; updateCarousel(currentSlide - 1); }
  }, { passive: true });

  // Swipe support on touch devices
  let touchStartX = 0;
  let touchEndX = 0;
  if (carouselTrack) {
    carouselTrack.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carouselTrack.addEventListener('touchend', (e) => {
      if (fitaNativa()) return;
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        updateCarousel(currentSlide + 1);
      } else if (touchEndX - touchStartX > 50) {
        updateCarousel(currentSlide - 1);
      }
    }, { passive: true });
  }

  // — O polegar do swipe —
  // So o telemovel o mostra. Nao e uma barra que enche: tem o tamanho da
  // fatia que se ve, como a de um scroll, por isso diz ao mesmo tempo onde se
  // esta e quantos cards ha. As duas medidas saem do proprio scroll da fita,
  // portanto acertam sozinhas quando um filtro tira cards.
  // — O contador —
  // A largura do polegar ja diz a fraccao, mas nao o numero: "01 / 08" diz.
  // A posicao sai do card que esta encostado ao inicio util da fita (o
  // scroll-padding), por isso acerta com o snap em vez de estimar.
  const conta = document.querySelector('.selection-conta');
  function pintarConta() {
    if (!conta || !carouselTrack) return;
    if (!fitaNativa()) { conta.textContent = ''; return; }
    const cards = [...carouselTrack.querySelectorAll('.selection-card')]
      .filter(c => !c.hidden && c.offsetParent !== null);
    if (!cards.length) { conta.textContent = ''; return; }
    const fita = carouselTrack.getBoundingClientRect();
    const recuo = parseFloat(getComputedStyle(carouselTrack).scrollPaddingLeft) || 0;
    const inicio = fita.left + recuo;
    let actual = 0;
    let melhor = Infinity;
    cards.forEach((card, i) => {
      const d = Math.abs(card.getBoundingClientRect().left - inicio);
      if (d < melhor) { melhor = d; actual = i; }
    });
    const dois = n => String(n).padStart(2, '0');
    conta.textContent = dois(actual + 1) + ' / ' + dois(cards.length);
  }

  const polegar = document.querySelector('.selection-progresso');
  if (carouselTrack && polegar) {
    let pedidoPolegar = null;
    const pintarPolegar = () => {
      pedidoPolegar = null;
      const total = carouselTrack.scrollWidth;
      if (total <= 0) return;
      const vista = carouselTrack.clientWidth;
      polegar.style.setProperty('--swipe-fatia', (Math.min(vista / total, 1)).toFixed(4));
      polegar.style.setProperty('--swipe-inicio', (carouselTrack.scrollLeft / total).toFixed(4));
      pintarConta();
    };
    const agendarPolegar = () => {
      if (pedidoPolegar === null) pedidoPolegar = requestAnimationFrame(pintarPolegar);
    };
    carouselTrack.addEventListener('scroll', agendarPolegar, { passive: true });
    window.addEventListener('resize', agendarPolegar);
    document.addEventListener('marsolve:cards', agendarPolegar);
    agendarPolegar();
  }

  // Keyboard navigation when selection is open
  document.addEventListener('keydown', (e) => {
    if (body.classList.contains('selection-open') && !fitaNativa()) {
      if (e.key === 'ArrowRight') updateCarousel(currentSlide + 1);
      if (e.key === 'ArrowLeft') updateCarousel(currentSlide - 1);
    }
  });

  // — Drawer Opener (only for explicit drawer triggers) —
  const drawerTriggers = document.querySelectorAll('[data-open-drawer], a[href="#drawer"]');
  drawerTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openNavMenu();
    });
  });

  // — Selection card hover parallax —
  const selectionCards = document.querySelectorAll('.selection-card');
  selectionCards.forEach((card) => {
    const cover = card.querySelector('.selection-card__cover img');
    if (!cover) return;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      cover.style.transformOrigin = `${50 + x * 20}% ${50 + y * 20}%`;
    });
  });

  // — A localidade nos cards —
  //
  // O nome corre na vertical, do fundo do painel ate a linha do losango. Quem
  // decide o tamanho e o nome mais comprido -- "Armacao de Pera" --, e esse
  // tamanho vale para todos: lado a lado, as localidades tem de casar.
  //
  // Isto nao da para fazer so em CSS. O comprimento de um texto na vertical
  // depende da letra que o browser acabou por carregar, e o CSS nao sabe
  // medi-lo; a conta antiga dividia a altura por um numero de caracteres
  // fixo, o que obrigava a encurtar nomes e nunca enchia o painel. Aqui
  // mede-se o que esta mesmo desenhado e escolhe-se o maior tamanho em que
  // todos cabem.
  const medirLocalidades = () => {
    const titulos = [...document.querySelectorAll('.selection-card__title')];
    if (!titulos.length) return;

    // sem a variavel, o CSS volta ao tamanho de referencia -- e e contra esse
    // que se mede, senao media-se contra o resultado da vez anterior
    document.documentElement.style.removeProperty('--titulo-card');

    // no telemovel o nome e horizontal e cabe-lhe a largura do card, nao a
    // altura do painel: medi-lo daria uma escala enorme. Sai daqui e deixa a
    // variavel por escrever, que e o que faz o CSS mandar.
    if (!getComputedStyle(titulos[0]).writingMode.startsWith('vertical')) return;

    let escala = Infinity;
    for (const t of titulos) {
      const painel = t.closest('.selection-card__panel');
      if (!painel) continue;
      const est = getComputedStyle(painel);
      const util = painel.clientHeight
        - parseFloat(est.paddingTop) - parseFloat(est.paddingBottom);
      const corrido = t.getBoundingClientRect().height;
      if (util > 0 && corrido > 0) escala = Math.min(escala, util / corrido);
    }
    if (!isFinite(escala)) return;

    const base = parseFloat(getComputedStyle(titulos[0]).fontSize);
    document.documentElement.style.setProperty(
      '--titulo-card', (base * escala).toFixed(2) + 'px');
  };

  const agendarMedicao = () => requestAnimationFrame(medirLocalidades);

  // depois da letra chegar: com a de recurso, os nomes medem outra coisa
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(agendarMedicao);
  window.addEventListener('load', agendarMedicao);
  window.addEventListener('resize', agendarMedicao);
  // e quando os cards aparecem, que ate ai nao tem altura para medir
  document.addEventListener('marsolve:cards', agendarMedicao);

  // — Init —
  let preloaderStarted = false;
  function initPreloader() {
    if (preloaderStarted) return;
    preloaderStarted = true;
    const willRunPreloader = !!preloader && !sessionStorage.getItem('marsolve_visited');
    runPreloader();
    // com preloader a correr, o hash so e tratado quando ele termina
    if (!willRunPreloader) handlePortfolioHash();
  }

  if (document.readyState !== 'loading') {
    initPreloader();
  } else {
    window.addEventListener('DOMContentLoaded', initPreloader);
  }

  // — O diamante sobre fundo escuro —
  // O botao do menu e fixo e por baixo dele passam fotografias. A tinta da
  // casa (terracota, ou preto) desaparece nas escuras. Em vez de adivinhar
  // quais sao, le-se o brilho do pedaco de imagem que esta mesmo por tras:
  // a foto e desenhada uma vez num canvas de 48x48 (mesma origem, logo sem
  // taint) e guardada em cache, e depois so se convertem coordenadas.
  (function tintaDoDiamante() {
    const botao = document.querySelector('.menu-btn');
    if (!botao) return;

    const cache = new Map();

    // Brilho medio do pedaco de imagem que fica debaixo de "caixa" (o
    // rectangulo do botao). Devolve 0..1, ou null se a imagem ainda nao
    // esta pronta. A amostra tem o tamanho do proprio diamante: num
    // canvas grosseiro demais, uma parede branca era diluida pelo jardim
    // ao lado e a leitura dava escuro.
    const N = 128;

    function brilho(img, caixa) {
      const chave = img.currentSrc || img.src;
      let am = cache.get(chave);
      if (!am) {
        if (!img.complete || !img.naturalWidth) return null;
        const cv = document.createElement('canvas');
        cv.width = N; cv.height = N;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        try { ctx.drawImage(img, 0, 0, N, N); } catch (e) { return null; }
        am = { ctx };
        cache.set(chave, am);
      }
      const r = img.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      // object-fit: cover -- a imagem e maior do que a caixa e fica centrada
      const escala = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
      const larg = img.naturalWidth * escala;
      const alt = img.naturalHeight * escala;
      // canto superior esquerdo e tamanho da amostra, em pixeis do canvas
      const emX = v => (v - r.left - (r.width - larg) / 2) / escala / img.naturalWidth * N;
      const emY = v => (v - r.top - (r.height - alt) / 2) / escala / img.naturalHeight * N;
      const px = Math.round(emX(caixa.left));
      const py = Math.round(emY(caixa.top));
      const pw = Math.max(2, Math.round(emX(caixa.right) - px));
      const ph = Math.max(2, Math.round(emY(caixa.bottom) - py));
      const x0 = Math.max(0, Math.min(N - pw, px));
      const y0 = Math.max(0, Math.min(N - ph, py));
      let d;
      try { d = am.ctx.getImageData(x0, y0, pw, ph).data; } catch (e) { return null; }
      let soma = 0;
      for (let i = 0; i < d.length; i += 4) {
        soma += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      }
      return soma / (d.length / 4);
    }

    // a capa da obra seguinte leva por cima um veu preto a 42%
    function veu(img) {
      return img.closest('.obra-seguinte') ? 0.58 : 1;
    }

    let claro = false;
    let pedido = null;

    function medir() {
      pedido = null;
      const r = botao.getBoundingClientRect();
      if (!r.width) return;
      // quem esta por tras, tirando o proprio botao
      const img = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        .find(el => el.tagName === 'IMG' && !botao.contains(el));
      const b = img ? brilho(img, r) : null;
      if (!img) {
        claro = false;
      } else if (b === null) {
        // a fotografia ainda nao chegou (as de baixo sao lazy): fica como
        // esta e volta-se a medir no load dela
      } else {
        const luz = b * veu(img);
        // histerese: sem ela a tinta piscava ao passar por um meio-tom.
        // Nos meios-tons fica a tinta da casa -- e o halo que a segura.
        if (!claro && luz < 0.46) claro = true;
        else if (claro && luz > 0.6) claro = false;
      }
      document.body.classList.toggle('diamante-claro', claro);
      // sobre fotografia ha sempre um halo, para o diamante nao se perder
      // num pormenor claro ou escuro da imagem
      document.body.classList.toggle('diamante-em-foto', !!img);
    }

    const agendar = () => {
      if (pedido === null) pedido = requestAnimationFrame(medir);
    };

    // o palco das paginas internas e que rola, nao a janela
    const palco = document.querySelector('.page-grid--scrollable');
    if (palco) palco.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar);
    window.addEventListener('load', agendar);
    // as fotografias de baixo sao lazy: quando uma chega, o que esta por
    // tras do diamante muda sem haver scroll nenhum
    document.addEventListener('load', agendar, true);
    agendar();
  })();

})();
