/**
 * LaPS — Main Application Controller (v2.1)
 * - Sistema Nativo de Internacionalização (i18n com auto-detecção via navigator.languages)
 * - Alternador de Tema de 3 Estados (Sistema / Auto ➔ Escuro ➔ Claro com listener matchMedia vivo)
 * - Controles de Acessibilidade WCAG AAA (Escala de Fonte A-/A0/A+, Alto Contraste e Região aria-live)
 * - Navegação Fluida, Dropdowns Acessíveis e Drawer Mobile sem Zona Morta
 */

!(function ($) {
  'use strict';

  /* ==============================================================
     1. SISTEMA NATIVO DE INTERNACIONALIZAÇÃO (i18n)
     ============================================================== */
  let langDict = null;

  function announceA11y(message) {
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) {
      announcer.textContent = message;
    }
  }

  function normalizeLangCode(code) {
    if (!code || typeof code !== 'string') return null;
    const clean = code.trim().toLowerCase();
    if (clean.startsWith('pt')) return 'pt';
    if (clean.startsWith('en')) return 'en';
    if (clean.startsWith('de') || clean === 'dt') return 'de';
    if (clean.startsWith('fr')) return 'fr';
    return null;
  }

  async function loadTranslations() {
    try {
      const res = await fetch('assets/js/lang.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      langDict = await res.json();
    } catch (err) {
      console.warn('[LaPS] Não foi possível carregar lang.json:', err);
    }
  }

  function getTranslationString(dict, lang, path) {
    if (!dict || !dict[lang]) return null;
    const parts = path.split('.');
    let cur = dict[lang];
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return null;
      }
    }
    return typeof cur === 'string' ? cur : null;
  }

  function applyLanguage(lang, isUserAction = false) {
    if (!['pt', 'en', 'de', 'fr'].includes(lang)) {
      lang = 'pt';
    }

    document.documentElement.lang = lang;
    if (isUserAction) {
      localStorage.setItem('laps-language-user', lang);
    }

    // Atualizar botões de idioma
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      const btnLang = btn.getAttribute('data-lang-btn');
      const isActive = btnLang === lang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    if (!langDict) return;

    // Traduzir elementos estáticos [data-translate]
    document.querySelectorAll('[data-translate]').forEach((el) => {
      const key = el.getAttribute('data-translate');
      const text = getTranslationString(langDict, lang, key);
      if (text !== null) {
        if (text.includes('<') && text.includes('>')) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    });

    // Traduzir placeholders [data-translate-placeholder]
    document.querySelectorAll('[data-translate-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-translate-placeholder');
      const text = getTranslationString(langDict, lang, key);
      if (text !== null) {
        el.setAttribute('placeholder', text);
      }
    });

    // Traduzir aria-labels [data-translate-aria-label]
    document.querySelectorAll('[data-translate-aria-label]').forEach((el) => {
      const key = el.getAttribute('data-translate-aria-label');
      const text = getTranslationString(langDict, lang, key);
      if (text !== null) {
        el.setAttribute('aria-label', text);
      }
    });

    // Anúncio acessível
    const langNames = { pt: 'Português', en: 'English', de: 'Deutsch', fr: 'Français' };
    announceA11y(`Idioma alterado para ${langNames[lang] || lang}`);

    // Disparar evento para que data-loader.js e signal-hero.js se atualizem
    window.dispatchEvent(new CustomEvent('laps:languageChanged', { detail: { lang } }));
  }

  function detectPreferredLanguage() {
    // 1. URL Query Param ?lang=
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = normalizeLangCode(urlParams.get('lang'));
    if (urlLang) return urlLang;

    // 2. Escolha manual anterior do usuário
    const savedUserLang = normalizeLangCode(localStorage.getItem('laps-language-user'));
    if (savedUserLang) return savedUserLang;

    // 3. Auto-detecção via navigator.languages ou navigator.language
    if (Array.isArray(navigator.languages)) {
      for (const candidate of navigator.languages) {
        const norm = normalizeLangCode(candidate);
        if (norm) return norm;
      }
    }
    const navSingle = normalizeLangCode(navigator.language);
    if (navSingle) return navSingle;

    // 4. Fallback padrão
    return 'pt';
  }

  function initLanguageSystem() {
    const initialLang = detectPreferredLanguage();

    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const selected = this.getAttribute('data-lang-btn');
        applyLanguage(selected, true);
      });
    });

    loadTranslations().then(() => {
      applyLanguage(initialLang, false);
    });
  }

  /* ==============================================================
     2. ALTERNADOR DE TEMA EM 3 ESTADOS (SISTEMA ➔ ESCURO ➔ CLARO)
     ============================================================== */
  function initThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const root = document.documentElement;
    const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');

    // Modos suportados: 'system', 'dark', 'light'
    let currentMode = localStorage.getItem('laps-theme-mode') || 'system';

    function resolveEffectiveTheme(mode) {
      if (mode === 'system') {
        return mediaDark.matches ? 'dark' : 'light';
      }
      return mode === 'dark' ? 'dark' : 'light';
    }

    function applyTheme(mode, notify = true) {
      currentMode = mode;
      localStorage.setItem('laps-theme-mode', mode);

      const effectiveTheme = resolveEffectiveTheme(mode);
      root.setAttribute('data-theme', effectiveTheme);
      root.setAttribute('data-theme-mode', mode);

      if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        const badge = themeBtn.querySelector('.theme-mode-badge');
        
        if (mode === 'system') {
          if (icon) icon.className = 'bx bx-desktop';
          themeBtn.setAttribute('title', 'Tema: Automático (Sistema)');
          themeBtn.setAttribute('aria-label', 'Tema atual: Automático do Sistema. Clique para mudar para Modo Escuro.');
          if (badge) badge.textContent = 'Auto';
        } else if (mode === 'dark') {
          if (icon) icon.className = 'bx bx-moon';
          themeBtn.setAttribute('title', 'Tema: Escuro');
          themeBtn.setAttribute('aria-label', 'Tema atual: Escuro. Clique para mudar para Modo Claro.');
          if (badge) badge.textContent = 'Dark';
        } else {
          if (icon) icon.className = 'bx bx-sun';
          themeBtn.setAttribute('title', 'Tema: Claro');
          themeBtn.setAttribute('aria-label', 'Tema atual: Claro. Clique para mudar para Modo Automático.');
          if (badge) badge.textContent = 'Light';
        }
      }

      if (notify) {
        const modeLabels = { system: 'Automático do Sistema', dark: 'Escuro', light: 'Claro' };
        announceA11y(`Tema alterado para ${modeLabels[mode] || mode}`);
      }

      window.dispatchEvent(new CustomEvent('laps:themeChanged', { detail: { mode, effectiveTheme } }));
    }

    // Inicialização
    applyTheme(currentMode, false);

    // Ciclo ao clicar: system ➔ dark ➔ light ➔ system
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        let nextMode = 'system';
        if (currentMode === 'system') nextMode = 'dark';
        else if (currentMode === 'dark') nextMode = 'light';
        else if (currentMode === 'light') nextMode = 'system';
        applyTheme(nextMode, true);
      });
    }

    // Ouvir alterações do sistema operacional (apenas ativo quando em modo 'system')
    mediaDark.addEventListener('change', () => {
      if (currentMode === 'system') {
        applyTheme('system', false);
      }
    });
  }

  /* ==============================================================
     3. CONTROLES DE ACESSIBILIDADE WCAG AAA (FONTE E CONTRASTE)
     ============================================================== */
  function initA11yControls() {
    const root = document.documentElement;
    const fontPlusBtn = document.getElementById('a11y-font-plus');
    const fontMinusBtn = document.getElementById('a11y-font-minus');
    const fontResetBtn = document.getElementById('a11y-font-reset');
    const contrastBtn = document.getElementById('a11y-contrast-btn');

    let fontScale = parseFloat(localStorage.getItem('laps-font-scale') || '1.0');

    function applyFontScale(scale, notify = false) {
      fontScale = Math.max(0.85, Math.min(1.30, Math.round(scale * 100) / 100));
      root.style.setProperty('--laps-font-scale', fontScale.toFixed(2));
      localStorage.setItem('laps-font-scale', fontScale.toFixed(2));

      if (fontResetBtn) {
        fontResetBtn.setAttribute('title', `Tamanho atual da fonte: ${Math.round(fontScale * 100)}% (Clique para resetar)`);
        fontResetBtn.setAttribute('aria-label', `Resetar tamanho da fonte para 100%. Atual: ${Math.round(fontScale * 100)}%`);
      }

      if (notify) {
        announceA11y(`Escala de fonte ajustada para ${Math.round(fontScale * 100)}%`);
      }
    }

    if (fontPlusBtn) {
      fontPlusBtn.addEventListener('click', () => applyFontScale(fontScale + 0.08, true));
    }
    if (fontMinusBtn) {
      fontMinusBtn.addEventListener('click', () => applyFontScale(fontScale - 0.08, true));
    }
    if (fontResetBtn) {
      fontResetBtn.addEventListener('click', () => applyFontScale(1.0, true));
    }

    if (contrastBtn) {
      const savedContrast = localStorage.getItem('laps-high-contrast') === 'true';
      if (savedContrast) root.setAttribute('data-high-contrast', 'true');

      contrastBtn.addEventListener('click', () => {
        const isHigh = root.getAttribute('data-high-contrast') === 'true';
        const next = !isHigh;
        root.setAttribute('data-high-contrast', String(next));
        localStorage.setItem('laps-high-contrast', String(next));
        announceA11y(next ? 'Modo de alto contraste ativado' : 'Modo de alto contraste desativado');
      });
    }

    applyFontScale(fontScale, false);
  }

  /* ==============================================================
     4. PRELOADER & NAVEGAÇÃO SUAVE COM SUPORTE A DROPDOWNS
     ============================================================== */
  $(window).on('load', function () {
    if ($('#preloader').length) {
      $('#preloader')
        .delay(100)
        .fadeOut('slow', function () {
          $(this).remove();
        });
    }
  });

  // Dropdown acessível por teclado (Enter, Espaço, Escape)
  $(document).on('click', '.nav-menu .dropdown-toggle', function (e) {
    e.preventDefault();
    var $parent = $(this).closest('.nav-dropdown');
    var isOpen = $parent.hasClass('open');
    $('.nav-dropdown').removeClass('open').find('.dropdown-toggle').attr('aria-expanded', 'false');
    if (!isOpen) {
      $parent.addClass('open');
      $(this).attr('aria-expanded', 'true');
    }
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('.nav-dropdown').length) {
      $('.nav-dropdown').removeClass('open').find('.dropdown-toggle').attr('aria-expanded', 'false');
    }
  });

  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') {
      $('.nav-dropdown').removeClass('open').find('.dropdown-toggle').attr('aria-expanded', 'false');
    }
  });

  // Scroll suave com compensação dinâmica do header
  $(document).on('click', '.nav-menu a:not(.dropdown-toggle), .mobile-nav a:not(.mobile-dropdown-toggle), .scrollto', function (e) {
    if (
      location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '') &&
      location.hostname === this.hostname
    ) {
      var hash = this.hash;
      if (!hash || hash === '#') return;
      var target = $(hash);
      if (target.length) {
        e.preventDefault();
        var headerHeight = $('#header').outerHeight() || 70;
        var scrollto = target.offset().top - headerHeight + 2;

        if (hash === '#header' || hash === '#hero') {
          scrollto = 0;
        }

        $('html, body').animate({ scrollTop: scrollto }, 700, 'easeInOutExpo');

        if ($(this).parents('.nav-menu, .mobile-nav').length) {
          $('.nav-menu .active, .mobile-nav .active').removeClass('active');
          $(this).closest('li').addClass('active');
        }

        // Fechar dropdowns abertos
        $('.nav-dropdown').removeClass('open').find('.dropdown-toggle').attr('aria-expanded', 'false');

        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('.mobile-nav-toggle').attr('aria-expanded', 'false');
          $('.mobile-nav-toggle i').removeClass('bx-x').addClass('bx-menu');
          $('.mobile-nav-overly').fadeOut();
        }
        return false;
      }
    }
  });

  /* ==============================================================
     5. DRAWER MOBILE ACESSÍVEL (SEM ZONA MORTA < 1200px)
     ============================================================== */
  if ($('.nav-menu').length) {
    var $mobile_nav = $('.nav-menu').clone().prop({
      class: 'mobile-nav d-xl-none',
      id: 'mobile-nav'
    });
    $('body').append($mobile_nav);
    $('body').prepend(
      '<button type="button" class="mobile-nav-toggle d-xl-none" aria-label="Abrir menu de navegação" aria-expanded="false"><i class="bx bx-menu"></i></button>'
    );
    $('body').append('<div class="mobile-nav-overly"></div>');

    $(document).on('click', '.mobile-nav-toggle', function () {
      var isActive = $('body').toggleClass('mobile-nav-active').hasClass('mobile-nav-active');
      $(this).attr('aria-expanded', String(isActive));
      $('.mobile-nav-toggle i').toggleClass('bx-menu bx-x');
      $('.mobile-nav-overly').toggle();
    });

    $(document).on('click', '.mobile-nav-overly', function () {
      if ($('body').hasClass('mobile-nav-active')) {
        $('body').removeClass('mobile-nav-active');
        $('.mobile-nav-toggle').attr('aria-expanded', 'false');
        $('.mobile-nav-toggle i').removeClass('bx-x').addClass('bx-menu');
        $('.mobile-nav-overly').fadeOut();
      }
    });

    // Submenu sanfona no menu mobile
    $(document).on('click', '.mobile-nav .dropdown-toggle', function (e) {
      e.preventDefault();
      $(this).next('.dropdown-menu-list').slideToggle(250);
      $(this).find('.dropdown-chevron').toggleClass('bx-chevron-down bx-chevron-up');
    });
  }

  /* ==============================================================
     6. BOTÃO VOLTAR AO TOPO
     ============================================================== */
  $(window).scroll(function () {
    if ($(this).scrollTop() > 100) {
      $('.back-to-top').fadeIn('slow');
    } else {
      $('.back-to-top').fadeOut('slow');
    }
  });

  $('.back-to-top').click(function () {
    $('html, body').animate({ scrollTop: 0 }, 700, 'easeInOutExpo');
    return false;
  });

  /* ==============================================================
     7. INICIALIZAÇÃO GERAL NO CARREGAMENTO
     ============================================================== */
  $(document).ready(function () {
    initLanguageSystem();
    initThemeToggle();
    initA11yControls();

    // Inicialização segura de AOS
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 700,
        easing: 'ease-in-out',
        once: true,
        mirror: false
      });
    }

    // Inicialização segura de Venobox
    if ($.fn.venobox) {
      $('.venobox').venobox({
        bgcolor: '',
        overlayColor: 'rgba(6, 12, 34, 0.85)',
        closeBackground: '',
        closeColor: '#fff'
      });
    }
  });
})(jQuery);
