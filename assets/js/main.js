/**
 * LaPS — Main Application Controller (v2.0)
 * - Sistema Nativo de Internacionalização (i18n em 4 Idiomas: PT, EN, DE, FR)
 * - Alternador de Tema Escuro / Claro (Dark & Light Mode)
 * - Controles de Acessibilidade WCAG AAA (Escala de Fonte e Alto Contraste)
 * - Navegação Fluida e Drawer Mobile Acessível
 */

!(function ($) {
  'use strict';

  /* ==============================================================
     1. SISTEMA NATIVO DE INTERNACIONALIZAÇÃO (i18n)
     ============================================================== */
  let langDict = null;

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

  function applyLanguage(lang) {
    if (!['pt', 'en', 'de', 'fr'].includes(lang)) {
      lang = 'pt';
    }

    document.documentElement.lang = lang;
    localStorage.setItem('laps-language', lang);

    // Atualizar botões de idioma
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      const btnLang = btn.getAttribute('data-lang-btn');
      const isActive = btnLang === lang;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    if (!langDict) return;

    // Traduzir elementos estáticos [data-translate]
    document.querySelectorAll('[data-translate]').forEach((el) => {
      const key = el.getAttribute('data-translate');
      const text = getTranslationString(langDict, lang, key);
      if (text !== null) {
        if (text.includes('<') && text.includes('>')) {
          // Apenas tags seguras de formatação (br, strong)
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

    // Disparar evento para que data-loader.js e signal-hero.js se atualizem
    window.dispatchEvent(new CustomEvent('laps:languageChanged', { detail: { lang } }));
  }

  function initLanguageSystem() {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    const savedLang = localStorage.getItem('laps-language');
    const initialLang = langParam || savedLang || 'pt';

    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      btn.addEventListener('click', function () {
        const selected = this.getAttribute('data-lang-btn');
        applyLanguage(selected);
      });
    });

    loadTranslations().then(() => {
      applyLanguage(initialLang);
    });
  }

  /* ==============================================================
     2. ALTERNADOR DE TEMA (DARK / LIGHT MODE)
     ============================================================== */
  function initThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    const root = document.documentElement;

    function setTheme(theme) {
      root.setAttribute('data-theme', theme);
      localStorage.setItem('laps-theme', theme);

      if (themeBtn) {
        const icon = themeBtn.querySelector('i');
        if (icon) {
          icon.className = theme === 'dark' ? 'bx bx-sun' : 'bx bx-moon';
        }
        themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro');
      }
    }

    const savedTheme = localStorage.getItem('laps-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    setTheme(initialTheme);

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
      });
    }

    // Ouvir preferência do sistema operacional
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('laps-theme')) {
        setTheme(e.matches ? 'dark' : 'light');
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
    const contrastBtn = document.getElementById('a11y-contrast-btn');

    let fontScale = parseFloat(localStorage.getItem('laps-font-scale') || '1.0');

    function applyFontScale(scale) {
      fontScale = Math.max(0.9, Math.min(1.25, scale));
      root.style.setProperty('--laps-font-scale', fontScale.toFixed(2));
      localStorage.setItem('laps-font-scale', fontScale.toFixed(2));
    }

    if (fontPlusBtn) {
      fontPlusBtn.addEventListener('click', () => applyFontScale(fontScale + 0.08));
    }
    if (fontMinusBtn) {
      fontMinusBtn.addEventListener('click', () => applyFontScale(fontScale - 0.08));
    }

    if (contrastBtn) {
      const savedContrast = localStorage.getItem('laps-high-contrast') === 'true';
      if (savedContrast) root.setAttribute('data-high-contrast', 'true');

      contrastBtn.addEventListener('click', () => {
        const isHigh = root.getAttribute('data-high-contrast') === 'true';
        root.setAttribute('data-high-contrast', String(!isHigh));
        localStorage.setItem('laps-high-contrast', String(!isHigh));
      });
    }

    applyFontScale(fontScale);
  }

  /* ==============================================================
     4. PRELOADER & NAVEGAÇÃO SUAVE
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

  // Scroll suave com compensação dinâmica do header
  $(document).on('click', '.nav-menu a, .mobile-nav a, .scrollto', function (e) {
    if (
      location.pathname.replace(/^\//, '') === this.pathname.replace(/^\//, '') &&
      location.hostname === this.hostname
    ) {
      var target = $(this.hash);
      if (target.length) {
        e.preventDefault();
        var headerHeight = $('#header').outerHeight() || 70;
        var scrollto = target.offset().top - headerHeight + 2;

        if ($(this).attr('href') === '#header' || $(this).attr('href') === '#hero') {
          scrollto = 0;
        }

        $('html, body').animate({ scrollTop: scrollto }, 900, 'easeInOutExpo');

        if ($(this).parents('.nav-menu, .mobile-nav').length) {
          $('.nav-menu .active, .mobile-nav .active').removeClass('active');
          $(this).closest('li').addClass('active');
        }

        if ($('body').hasClass('mobile-nav-active')) {
          $('body').removeClass('mobile-nav-active');
          $('.mobile-nav-toggle i').toggleClass('bx-menu bx-x');
          $('.mobile-nav-overly').fadeOut();
        }
        return false;
      }
    }
  });

  /* ==============================================================
     5. DRAWER MOBILE ACESSÍVEL
     ============================================================== */
  if ($('.nav-menu').length) {
    var $mobile_nav = $('.nav-menu').clone().prop({
      class: 'mobile-nav d-lg-none',
      id: 'mobile-nav'
    });
    $('body').append($mobile_nav);
    $('body').prepend(
      '<button type="button" class="mobile-nav-toggle d-lg-none" aria-label="Abrir menu de navegação" aria-expanded="false"><i class="bx bx-menu"></i></button>'
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

    $(document).on('keydown', function (e) {
      if (e.key === 'Escape' && $('body').hasClass('mobile-nav-active')) {
        $('body').removeClass('mobile-nav-active');
        $('.mobile-nav-toggle').attr('aria-expanded', 'false');
        $('.mobile-nav-toggle i').removeClass('bx-x').addClass('bx-menu');
        $('.mobile-nav-overly').fadeOut();
      }
    });
  }

  // Header scrolled state
  $(window).scroll(function () {
    if ($(this).scrollTop() > 80) {
      $('#header').addClass('header-scrolled');
      $('.back-to-top').fadeIn('slow');
    } else {
      $('#header').removeClass('header-scrolled');
      $('.back-to-top').fadeOut('slow');
    }
  });

  $('.back-to-top').click(function () {
    $('html, body').animate({ scrollTop: 0 }, 800, 'easeInOutExpo');
    return false;
  });

  // Inicialização de bibliotecas visuais
  function aos_init() {
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 800,
        once: true
      });
    }
  }

  $(window).on('load', function () {
    aos_init();
  });

  // Inicializar sistemas no DOM Ready
  $(document).ready(function () {
    initLanguageSystem();
    initThemeToggle();
    initA11yControls();
  });

})(jQuery);
