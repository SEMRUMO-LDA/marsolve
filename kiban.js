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

        var data = {
          form_name: 'contact',
          name: nameInput ? nameInput.value.trim() : '',
          email: emailInput ? emailInput.value.trim() : '',
          phone: phoneInput ? phoneInput.value.trim() : '',
          subject: subjectInput ? (subjectInput.options ? subjectInput.options[subjectInput.selectedIndex].text : subjectInput.value) : '',
          message: messageInput ? messageInput.value.trim() : '',
          source_url: window.location.href,
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
            console.warn('[kibanCMS] Submissão direta à API falhou, a ativar fallback por email:', err);

            // Resilient fallback to mailto so no lead is lost
            var subjectEncoded = encodeURIComponent('[Website Marsolve] ' + (data.subject || 'Contacto') + ' - ' + data.name);
            var bodyEncoded = encodeURIComponent(
              'Nome: ' + data.name + '\n' +
              'Email: ' + data.email + '\n' +
              (data.phone ? 'Telefone: ' + data.phone + '\n' : '') +
              'Assunto: ' + data.subject + '\n\n' +
              'Mensagem:\n' + data.message
            );
            var mailtoUrl = 'mailto:comercial@marsolve.net?subject=' + subjectEncoded + '&body=' + bodyEncoded;

            // nada ficou registado: o aviso tem de o dizer, senao a pessoa
            // fecha o email achando que a mensagem ja seguiu
            showFeedback(
              'Não conseguimos enviar a mensagem pelo site. Vamos abrir o seu email com a mensagem já escrita — só falta carregar em enviar. ' +
              '<a href="' + mailtoUrl + '" style="color: inherit; text-decoration: underline; font-weight: bold;">Clique aqui se não abrir</a>, ' +
              'ou escreva-nos para comercial@marsolve.net.',
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
     * Initialize Kiban on page
     */
    init: function() {
      // antes dos widgets, para estar a escuta quando o i18n chegar
      this.syncLang();
      this.loadWidgets();
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

