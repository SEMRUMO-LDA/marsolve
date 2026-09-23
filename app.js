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

    if (sessionStorage.getItem('marsolve_visited')) {
      preloader.style.display = 'none';
      body.classList.add('is-ready');
      if (window.location.hash === '#portfolio') {
        setTimeout(openSelection, 50);
      }
      return;
    }

    sessionStorage.setItem('marsolve_visited', 'true');

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
        // If arrived with #portfolio, navigate to portfolio page
        if (window.location.hash === '#portfolio') {
          window.location.href = 'portfolio.html';
        }
      }, 600);
    }, 400);
  }

  // — Selection Menu Toggle —
  function openSelection() {
    body.classList.add('selection-open');
    if (selectionBtn) selectionBtn.setAttribute('aria-expanded', 'true');
    const navPortfolioBtn = document.getElementById('nav-portfolio-btn');
    if (navPortfolioBtn) navPortfolioBtn.setAttribute('aria-expanded', 'true');
    if (navMenu && navMenu.classList.contains('open')) {
      closeNavMenu();
    }
  }

  function closeSelection() {
    body.classList.remove('selection-open');
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
      // na home os cards vivem dentro do page-stage: um clique num card
      // deve seguir o link, nao fechar a selecao
      if (e.target.closest && e.target.closest('.home-selection')) return;
      if (body.classList.contains('selection-open')) {
        if (isPortfolioPage) {
          closeSelection();
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 600);
          return;
        }
        closeSelection();
        try { history.replaceState(null, '', window.location.pathname); } catch (_) {}
      }
    });
  }

  // — Nav Menu (slide drawer) —
  function openNavMenu() {
    if (navMenu) {
      navMenu.classList.add('open');
      navMenu.setAttribute('aria-hidden', 'false');
      document.querySelectorAll('.menu-btn').forEach(b => b.setAttribute('aria-expanded', 'true'));
    }
  }

  function closeNavMenu() {
    if (navMenu) {
      navMenu.classList.remove('open');
      navMenu.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('.menu-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }
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
        try { history.replaceState(null, '', window.location.pathname); } catch (_) {}
      }
      if (navMenu && navMenu.classList.contains('open')) {
        closeNavMenu();
      }
    }
  });

  // — Portfolio triggers —
  function togglePortfolioSelection(e) {
    if (e) e.preventDefault();
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
    window.location.href = 'portfolio.html';
  }

  // Attach to all portfolio buttons
  const portfolioBtns = document.querySelectorAll('#nav-portfolio-btn, .portfolio-btn, #drawer-open-portfolio, [data-portfolio-trigger]');
  portfolioBtns.forEach(btn => {
    btn.addEventListener('click', togglePortfolioSelection);
  });

  if (window.location.hash === '#portfolio' && !isPortfolioPage) {
    window.location.href = 'portfolio.html';
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#portfolio' && !isPortfolioPage) {
      window.location.href = 'portfolio.html';
    }
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

    window.addEventListener('wheel', (e) => {
      if (!gestureAllowed()) return;
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
        hideSelection();
      }
    }, { passive: true });

    let swipeStartY = null;
    window.addEventListener('touchstart', (e) => {
      swipeStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (swipeStartY === null) return;
      const travelled = swipeStartY - e.changedTouches[0].screenY;
      swipeStartY = null;
      if (!gestureAllowed()) return;
      if (!isOpen() && travelled > SWIPE_THRESHOLD) showSelection();
      else if (isOpen() && travelled < -SWIPE_THRESHOLD) hideSelection();
    }, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (!gestureAllowed()) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!isOpen() && (e.key === 'ArrowDown' || e.key === 'PageDown')) {
        e.preventDefault();
        showSelection();
      } else if (isOpen() && (e.key === 'ArrowUp' || e.key === 'PageUp')) {
        e.preventDefault();
        hideSelection();
      }
    });
  }

  // — 4-by-4 Portfolio Carousel Slider Logic —
  const carouselTrack = document.getElementById('selection-track');
  const carouselPrev = document.getElementById('carousel-prev');
  const carouselNext = document.getElementById('carousel-next');
  const carouselDots = document.querySelectorAll('.selection-slide-dot');
  const pageIndicator = document.getElementById('slide-page-indicator');
  let currentSlide = 0;
  const totalSlides = 2;

  function updateCarousel(slideIndex) {
    currentSlide = Math.max(0, Math.min(slideIndex, totalSlides - 1));
    if (carouselTrack) {
      carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    if (carouselPrev) carouselPrev.disabled = (currentSlide === 0);
    if (carouselNext) carouselNext.disabled = (currentSlide === totalSlides - 1);

    carouselDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
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

  // Swipe support on touch devices
  let touchStartX = 0;
  let touchEndX = 0;
  if (carouselTrack) {
    carouselTrack.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carouselTrack.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        updateCarousel(currentSlide + 1);
      } else if (touchEndX - touchStartX > 50) {
        updateCarousel(currentSlide - 1);
      }
    }, { passive: true });
  }

  // Keyboard navigation when selection is open
  document.addEventListener('keydown', (e) => {
    if (body.classList.contains('selection-open')) {
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

  // — Init —
  let preloaderStarted = false;
  function initPreloader() {
    if (preloaderStarted) return;
    preloaderStarted = true;
    runPreloader();
  }

  if (document.readyState !== 'loading') {
    initPreloader();
  } else {
    window.addEventListener('DOMContentLoaded', initPreloader);
  }

})();

