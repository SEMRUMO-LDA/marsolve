/**
 * kibanCMS Integration for Marsolve
 * Connects frontend forms, content API and widgets to kibanCMS backend.
 *
 * Backend: https://kiban.pt
 * Tenant: marsolve
 * API Key: kiban_live_wlXgagsjq1v49UWW0ffme71DCFMHjJ0
 */
(function(window) {
  'use strict';

  var CONFIG = {
    apiUrl: (typeof window !== 'undefined' && window.__KIBAN_API_URL__) || 'https://kiban.pt',
    apiKey: (typeof window !== 'undefined' && window.__KIBAN_API_KEY__) || 'kiban_live_wlXgagsjq1v49UWW0ffme71DCFMHjJ0',
    tenant: (typeof window !== 'undefined' && window.__KIBAN_TENANT__) || 'marsolve',
    timeout: 10000,
    enableWidgets: true,
  };

  var Kiban = {
    config: CONFIG,

    /**
     * Internal request helper
     */
    request: function(endpoint, options) {
      options = options || {};
      var url = CONFIG.apiUrl.replace(/\/$/, '') + '/api/v1' + endpoint;
      var headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.apiKey,
        'X-Tenant': CONFIG.tenant,
      };

      if (options.headers) {
        for (var k in options.headers) {
          if (options.headers.hasOwnProperty(k)) {
            headers[k] = options.headers[k];
          }
        }
      }

      var fetchOptions = {
        method: options.method || 'GET',
        headers: headers,
        mode: 'cors',
      };

      if (options.body) {
        fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      }

      // sem limite, um servidor que nao responde deixava o botao em
      // "A enviar..." para sempre; ao fim do timeout cai no fallback
      var controlo = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var limite = null;
      if (controlo) {
        fetchOptions.signal = controlo.signal;
        limite = setTimeout(function() { controlo.abort(); }, CONFIG.timeout);
      }

      return fetch(url, fetchOptions).then(function(res) {
        return res.json().then(function(data) {
          if (!res.ok) {
            var msg = (data && data.error && data.error.message) || ('HTTP ' + res.status);
            var err = new Error(msg);
            err.status = res.status;
            err.data = data;
            throw err;
          }
          return data;
        });
      }).then(function(data) {
        clearTimeout(limite);
        return data;
      }, function(err) {
        clearTimeout(limite);
        throw err;
      });
    },

    /**
     * Submit contact form to KibanCMS Forms API
     * POST /api/v1/forms/submit
     */
    submitContactForm: function(formData) {
      var payload = {
        form_name: formData.form_name || 'contact',
        name: formData.name || '',
        email: formData.email || '',
        phone: formData.phone || '',
        subject: formData.subject || '',
        message: formData.message || '',
        source_url: formData.source_url || (typeof window !== 'undefined' ? window.location.href : ''),
        extra: formData.extra || {}
      };

      return this.request('/forms/submit', {
        method: 'POST',
        body: payload
      });
    },

    /**
     * Get entries from a collection
     * GET /api/v1/entries/:collection
     */
    getEntries: function(collection, query) {
      query = query || {};
      var params = [];
      params.push('status=' + encodeURIComponent(query.status || 'published'));
      if (query.limit) params.push('limit=' + encodeURIComponent(query.limit));
      if (query.offset) params.push('offset=' + encodeURIComponent(query.offset));
      if (query.sort) params.push('sort=' + encodeURIComponent(query.sort));
      if (query.order) params.push('order=' + encodeURIComponent(query.order));

      var qs = params.length ? '?' + params.join('&') : '';
      return this.request('/entries/' + collection + qs).then(function(res) {
        return res.data;
      });
    },

    /**
     * Get single entry by slug
     * GET /api/v1/entries/:collection/:slug
     */
    getEntry: function(collection, slug) {
      return this.request('/entries/' + collection + '/' + slug).then(function(res) {
        return res.data;
      });
    },

    /**
     * Inject universal Kiban Widget Loader
     * Loads Cookie notice, Accessibility, WhatsApp chat, and i18n
     */
    loadWidgets: function() {
      if (!CONFIG.enableWidgets) return;
      if (document.getElementById('kiban-widget-loader')) return;

      var script = document.createElement('script');
      script.id = 'kiban-widget-loader';
      script.src = CONFIG.apiUrl.replace(/\/$/, '') + '/api/v1/widgets/loader.js';
      script.setAttribute('data-api-key', CONFIG.apiKey);
      script.setAttribute('data-tenant', CONFIG.tenant);
      script.async = true;
      document.head.appendChild(script);
    },

    /**
     * A campanha de onde a pessoa veio.
     * Quem chega por um anuncio traz gclid ou utm_* no endereco da primeira
     * pagina -- e quase nunca e a do formulario: entra na home, ve obras e
     * so depois vai ao Contacto. Guarda-se a chegada na sessao para o pedido
     * a levar consigo (a Politica de Privacidade diz que o fazemos).
     */
    CAMPANHA_PARAMS: ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'],

    guardarCampanha: function() {
      var params;
      try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
      var achados = {};
      var algum = false;
      this.CAMPANHA_PARAMS.forEach(function(p) {
        var v = params.get(p);
        if (v) { achados[p] = v.slice(0, 200); algum = true; }
      });
      if (!algum) return;
      // a ultima campanha com que a pessoa chegou e a que conta
      try { sessionStorage.setItem('marsolve-campanha', JSON.stringify(achados)); } catch (e) {}
    },

    lerCampanha: function() {
      try {
        var v = JSON.parse(sessionStorage.getItem('marsolve-campanha') || 'null');
        return v && typeof v === 'object' ? v : null;
      } catch (e) {
        return null;
      }
    },

    /**
     * Auto-bind contact form handlers
     */
    initContactForm: function() {
      var form = document.querySelector('.marsolve-form');
      if (!form || form.dataset.kibanBound) return;
      form.dataset.kibanBound = 'true';

      var submitBtn = form.querySelector('button[type="submit"], .hero-price');
      var originalBtnText = submitBtn ? submitBtn.textContent : 'Enviar mensagem';

      // Feedback container
      var feedbackBox = document.createElement('div');
      feedbackBox.className = 'kiban-form-feedback';
      feedbackBox.style.display = 'none';
      form.appendChild(feedbackBox);

      form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get inputs
        var nameInput = form.querySelector('[name="name"], #c-nome');
        var emailInput = form.querySelector('[name="email"], #c-email');
        var phoneInput = form.querySelector('[name="phone"], #c-tel');
        var subjectInput = form.querySelector('[name="subject"], #c-assunto');
        var messageInput = form.querySelector('[name="message"], #c-msg');

        var campanha = Kiban.lerCampanha();
        var mensagem = messageInput ? messageInput.value.trim() : '';

        var data = {
          form_name: 'contact',
          name: nameInput ? nameInput.value.trim() : '',
          email: emailInput ? emailInput.value.trim() : '',
          phone: phoneInput ? phoneInput.value.trim() : '',
          subject: subjectInput ? (subjectInput.options ? subjectInput.options[subjectInput.selectedIndex].text : subjectInput.value) : '',
          // a mensagem e opcional no site (a politica diz "caso a escreva"),
          // mas o kiban recusa o pedido sem ela: vai uma nota no lugar
          message: mensagem || '(Sem mensagem)',
          source_url: paginaComCampanha(campanha),
          extra: {
            tipo_pedido: subjectInput ? subjectInput.value : '',
            consentimento_privacidade: true,
            consentimento_em: new Date().toISOString(),
            campanha: campanha || null,
          },
        };

        if (!data.email) {
          showFeedback('Por favor, indique um email válido.', 'error');
          if (emailInput) emailInput.focus();
          return;
        }

        // Setting loading state
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'A enviar...';
          submitBtn.style.opacity = '0.7';
          submitBtn.style.cursor = 'wait';
        }
        hideFeedback();

        Kiban.submitContactForm(data)
          .then(function(result) {
            showFeedback(
              '✓ Mensagem enviada com sucesso! Entraremos em contacto consigo com a maior brevidade.',
              'success'
            );
            form.reset();
          })
          .catch(function(err) {
            // 400 e o kiban a dizer que falta ou esta mal um campo: o pedido
            // chegou, e mandar a pessoa para o email nao resolvia nada
            if (err && err.status === 400) {
              console.warn('[kibanCMS] O kiban recusou o pedido:', err.message);
              showFeedback(mensagemDeValidacao(err.message), 'error');
              return;
            }

            console.warn('[kibanCMS] Submissão direta à API falhou, a ativar fallback por email:', err);
            var emailContacto = emailDaPagina();

            // Resilient fallback to mailto so no lead is lost
            var subjectEncoded = encodeURIComponent('[Website Marsolve] ' + (data.subject || 'Contacto') + ' - ' + data.name);
            var bodyEncoded = encodeURIComponent(
              'Nome: ' + data.name + '\n' +
              'Email: ' + data.email + '\n' +
              (data.phone ? 'Telefone: ' + data.phone + '\n' : '') +
              'Assunto: ' + data.subject + '\n\n' +
              'Mensagem:\n' + data.message
            );
            var mailtoUrl = 'mailto:' + emailContacto + '?subject=' + subjectEncoded + '&body=' + bodyEncoded;

            // nada ficou registado: o aviso tem de o dizer, senao a pessoa
            // fecha o email achando que a mensagem ja seguiu
            showFeedback(
              'Não conseguimos enviar a mensagem pelo site. Vamos abrir o seu email com a mensagem já escrita — só falta carregar em enviar. ' +
              '<a href="' + mailtoUrl + '" style="color: inherit; text-decoration: underline; font-weight: bold;">Clique aqui se não abrir</a>, ' +
              'ou escreva-nos para ' + emailContacto + '.',
              'warning'
            );

            // Trigger mailto after brief delay
            setTimeout(function() {
              window.location.href = mailtoUrl;
            }, 600);
          })
          .finally(function() {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalBtnText;
              submitBtn.style.opacity = '1';
              submitBtn.style.cursor = '';
            }
          });
      });

      function showFeedback(htmlMessage, type) {
        feedbackBox.innerHTML = htmlMessage;
        feedbackBox.style.display = 'block';
        feedbackBox.style.padding = '1rem 1.2rem';
        feedbackBox.style.borderRadius = '8px';
        feedbackBox.style.marginTop = '1rem';
        feedbackBox.style.fontSize = '0.9rem';
        feedbackBox.style.lineHeight = '1.45';
        feedbackBox.style.fontFamily = 'var(--sans-font, sans-serif)';

        if (type === 'success') {
          feedbackBox.style.background = '#e8f5e9';
          feedbackBox.style.color = '#1b5e20';
          feedbackBox.style.border = '1px solid #a5d6a7';
        } else if (type === 'warning') {
          feedbackBox.style.background = '#fff8e1';
          feedbackBox.style.color = '#e65100';
          feedbackBox.style.border = '1px solid #ffe082';
        } else {
          feedbackBox.style.background = '#ffebee';
          feedbackBox.style.color = '#b71c1c';
          feedbackBox.style.border = '1px solid #ffcdd2';
        }

        feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function hideFeedback() {
        feedbackBox.style.display = 'none';
        feedbackBox.innerHTML = '';
      }

      // O email de contacto vem do kiban (colecao contactos) e o build
      // escreve-o na pagina; o fallback usa esse, para nao haver dois
      // sitios onde o mudar.
      function emailDaPagina() {
        var a = document.querySelector('.contacto-vias a[href^="mailto:"]');
        var m = a && a.getAttribute('href').match(/^mailto:([^?]+)/);
        return (m && m[1]) || 'comercial@marsolve.net';
      }

      // A pagina e onde o pedido foi feito; os parametros da campanha vao
      // acrescentados, porque o campo "Source Page" e o que o kiban guarda
      // de certeza (o extra depende da versao do add-on).
      function paginaComCampanha(campanha) {
        if (!campanha) return window.location.href;
        try {
          var u = new URL(window.location.href);
          Object.keys(campanha).forEach(function(k) {
            if (!u.searchParams.has(k)) u.searchParams.set(k, campanha[k]);
          });
          return u.href;
        } catch (e) {
          return window.location.href;
        }
      }

      function mensagemDeValidacao(msg) {
        var campos = { email: 'o email', name: 'o nome', phone: 'o telefone', message: 'a mensagem', subject: 'o assunto' };
        var m = String(msg || '').match(/field:\s*(\w+)/i);
        var campo = m && campos[m[1]];
        return campo
          ? 'Confirme ' + campo + ' e tente de novo.'
          : 'Não foi possível enviar: confirme os campos e tente de novo.';
      }
    },

    /**
     * Mantem o <html lang> igual a lingua em que a pagina esta a ser lida.
     * Quem traduz e o widget i18n do kiban, que o loader injeta quando o
     * add-on esta ativo no painel; ele troca o texto mas deixa o atributo
     * em "pt", e os leitores de ecra e o tradutor do browser guiam-se por ele.
     */
    syncLang: function() {
      var raiz = document.documentElement;
      function aplicar(lang) {
        if (lang) raiz.setAttribute('lang', lang);
      }

      // troca feita na bolha
      window.addEventListener('kiban-lang-change', function(e) {
        aplicar(e.detail && e.detail.lang);
      });

      // quem ja chega numa lingua (cookie ou ?lang=) e traduzido sem o
      // evento: le-se a lingua quando o script do widget acaba de correr
      document.addEventListener('load', function(e) {
        var s = e.target;
        if (s && s.tagName === 'SCRIPT' && /\/i18n\/widget\.js/.test(s.src) && window.KibanI18n) {
          aplicar(window.KibanI18n.getLanguage());
        }
      }, true);
    },

    /**
     * A lingua e o WhatsApp na gaveta.
     * Os widgets do kiban desenham-se como botoes a flutuar no canto, por
     * cima das fotografias e do diamante do menu. Neste site vivem na
     * gaveta: o CSS esconde os botoes deles (#kiban-i18n-widget,
     * #kiban-wa-widget) e aqui preenche-se a gaveta com os mesmos dados.
     * O widget de traducao continua a correr -- e ele que traduz a pagina;
     * a gaveta so lhe diz para que lingua.
     */
    initGaveta: function() {
      var self = this;
      var blocos = document.querySelectorAll('[data-kiban-linguas]');
      var wa = document.querySelectorAll('[data-kiban-whatsapp]');

      if (blocos.length) {
        this.request('/i18n/languages').then(function(res) {
          var d = res && res.data;
          var linguas = (d && d.available) || [];
          if (linguas.length < 2) return;
          var padrao = d.default || 'pt';
          blocos.forEach(function(bloco) {
            var lista = bloco.querySelector('.drawer-linguas');
            linguas.forEach(function(l) {
              var b = document.createElement('button');
              b.type = 'button';
              b.className = 'drawer-lingua';
              b.setAttribute('data-lang', l.code);
              b.setAttribute('lang', l.code);
              b.setAttribute('aria-label', l.name);
              // o rotulo vai por CSS (content: attr): o tradutor do kiban
              // traduz todo o texto da pagina, e "PT" passava a outra coisa
              b.setAttribute('data-rotulo', String(l.code).toUpperCase());
              b.addEventListener('click', function() { self.mudarLingua(l.code, padrao); });
              lista.appendChild(b);
            });
            bloco.hidden = false;
          });
          self.marcarLingua(padrao);
          window.addEventListener('kiban-lang-change', function() { self.marcarLingua(padrao); });
        }).catch(function(err) {
          console.warn('[kibanCMS] Sem linguas para a gaveta:', err && err.message);
        });
      }

      if (wa.length) {
        this.request('/whatsapp-widget/config').then(function(res) {
          var c = res && res.data;
          if (!c || !c.enabled || !c.phone_number) return;
          var url = 'https://wa.me/' + String(c.phone_number).replace(/[^0-9]/g, '') +
            (c.default_message ? '?text=' + encodeURIComponent(c.default_message) : '');
          wa.forEach(function(el) {
            if (el.tagName === 'A') el.href = url;
            el.hidden = false;
          });
        }).catch(function(err) {
          console.warn('[kibanCMS] Sem WhatsApp para a gaveta:', err && err.message);
        });
      }
    },

    linguaActual: function(padrao) {
      if (window.KibanI18n) return window.KibanI18n.getLanguage();
      var m = document.cookie.match(/(?:^|; )kiban-lang=([^;]+)/);
      return (m && decodeURIComponent(m[1])) || padrao;
    },

    marcarLingua: function(padrao) {
      var actual = this.linguaActual(padrao);
      document.querySelectorAll('.drawer-lingua').forEach(function(b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-lang') === actual ? 'true' : 'false');
      });
    },

    mudarLingua: function(codigo, padrao) {
      if (window.KibanI18n) {
        window.KibanI18n.setLanguage(codigo);
        this.marcarLingua(padrao);
        return;
      }
      // o widget de traducao ainda nao chegou (ou o add-on esta desligado):
      // a lingua fica no cookie e no endereco, que e o que ele le ao arrancar
      document.cookie = 'kiban-lang=' + encodeURIComponent(codigo) + ';path=/;max-age=31536000;SameSite=Lax';
      var u = new URL(window.location.href);
      if (codigo === padrao) u.searchParams.delete('lang'); else u.searchParams.set('lang', codigo);
      window.location.href = u.href;
    },

    /**
     * Initialize Kiban on page
     */
    init: function() {
      // antes dos widgets, para estar a escuta quando o i18n chegar
      this.syncLang();
      this.guardarCampanha();
      this.loadWidgets();
      this.initGaveta();
      this.initContactForm();
    }
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      Kiban.init();
    });
  } else {
    Kiban.init();
  }

  window.Kiban = Kiban;
})(window);

