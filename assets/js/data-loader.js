/**
 * LaPS Data Loader — Versão 2.0 (Segura, Responsiva e Internacionalizada)
 * - Blindagem total contra XSS (Construção 100% via DOM API segura)
 * - Prevenção de Tabnabbing (target="_blank" sempre com rel="noopener noreferrer")
 * - Hub Inteligente de Publicações (Busca em tempo real, filtros por década, DOI automático e cópia BibTeX)
 * - Paginação sem badges de ano órfãos
 * - Suporte a i18n nativo dinâmico para integrantes, projetos e produções
 */

(function () {
  'use strict';

  const DATA_PATHS = {
    integrantes: 'data/integrantes.json',
    projetos: 'data/projetos.json',
    producao: 'data/producao.json',
    lang: 'assets/js/lang.json'
  };

  // Estado em memória para transições instantâneas
  const state = {
    currentLang: 'pt',
    langDict: null,
    integrantes: null,
    projetos: null,
    producao: null,
    searchQuery: '',
    periodFilter: 'all',
    visibleCount: 8,
    pageSize: 8
  };

  /**
   * Validador de URLs seguras (protege contra javascript: ou data: URIs maliciosos)
   */
  function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('assets/') ||
      trimmed.startsWith('#')
    );
  }

  /**
   * Obtém string traduzida do dicionário atual
   */
  function t(path, fallback) {
    if (!state.langDict || !state.langDict[state.currentLang]) {
      return fallback || '';
    }
    const parts = path.split('.');
    let cur = state.langDict[state.currentLang];
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return fallback || '';
      }
    }
    return typeof cur === 'string' ? cur : fallback || '';
  }

  /**
   * Carrega um arquivo JSON
   */
  async function loadJSON(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ao carregar ${path}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[LaPS] Erro ao carregar ${path}:`, error);
      return null;
    }
  }

  /**
   * Extrai DOI de uma referência bibliográfica em texto
   */
  function extractDoi(text) {
    if (!text) return null;
    const match = text.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
    if (!match) return null;
    // Remover pontuação final se capturada acidentalmente
    let doi = match[0];
    if (doi.endsWith('.') || doi.endsWith(';') || doi.endsWith(',')) {
      doi = doi.slice(0, -1);
    }
    return doi;
  }

  /**
   * Gera entrada BibTeX a partir de uma referência em texto
   */
  function generateBibtex(text, year) {
    const doi = extractDoi(text);
    // Tenta isolar autores e título simplificados
    const clean = text.replace(/doi:?\s*10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/i, '').trim();
    const parts = clean.split('.');
    const authors = parts[0] ? parts[0].trim() : 'LaPS Research Team';
    const title = parts[1] ? parts[1].trim() : clean.slice(0, 80);
    const firstAuthor = authors.split(',')[0].replace(/[^a-zA-Z]/g, '').toLowerCase() || 'laps';
    const key = `${firstAuthor}${year || '2024'}`;

    return `@article{${key},
  author = {${authors}},
  title = {${title}},
  year = {${year || '2024'}},
  institution = {Laboratório de Processamento de Sinais (LaPS/UFPA)}${doi ? `,\n  doi = {${doi}},\n  url = {https://doi.org/${doi}}` : ''}
}`;
  }

  /* ==============================================================
     1. RENDERIZADOR: CORPO DOCENTE (INTEGRANTES)
     ============================================================== */
  function renderIntegrantes() {
    const container = document.getElementById('integrantes-container');
    if (!container || !state.integrantes) return;

    const data = state.integrantes;
    const fragment = document.createDocumentFragment();

    const grid = document.createElement('div');
    grid.className = 'professores-grid';

    const profKeys = ['ana', 'antonio', 'francisco', 'ronaldo'];

    data.professores.forEach((prof, idx) => {
      const card = document.createElement('article');
      card.className = 'member-card';
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String(idx * 80));

      // Cabeçalho / Imagem
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'member-img-wrap';

      const img = document.createElement('img');
      img.src = isSafeUrl(prof.foto) ? prof.foto : 'assets/img/laps_logo.png';
      img.alt = `Foto de ${prof.nome}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.className = 'member-photo';
      imgWrapper.appendChild(img);

      // Informações
      const body = document.createElement('div');
      body.className = 'member-body';

      const name = document.createElement('h3');
      name.className = 'member-name';
      name.textContent = prof.nome;
      body.appendChild(name);

      // Links Acadêmicos Seguros (rel="noopener noreferrer")
      const socialLinks = document.createElement('div');
      socialLinks.className = 'member-social-links';

      function addAcademicLink(url, iconSrc, titleKey, defaultTitle) {
        if (!url || !isSafeUrl(url)) return;
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const linkTitle = t(`members.${titleKey}`, defaultTitle);
        link.title = `${linkTitle} - ${prof.nome}`;
        link.setAttribute('aria-label', `${linkTitle} - ${prof.nome}`);
        link.className = 'academic-icon-btn';

        const icon = document.createElement('img');
        icon.src = iconSrc;
        icon.alt = defaultTitle;
        icon.loading = 'lazy';
        link.appendChild(icon);
        socialLinks.appendChild(link);
      }

      addAcademicLink(prof.lattes, 'assets/img/icons/icon_lattes.png', 'lattesTitle', 'Currículo Lattes');
      addAcademicLink(prof.orcid, 'assets/img/icons/icon_orcid.png', 'orcidTitle', 'ORCID');
      addAcademicLink(prof.scholar, 'assets/img/icons/Google_Scholar_logo.png', 'scholarTitle', 'Google Scholar');
      if (prof.email) {
        addAcademicLink(`mailto:${encodeURIComponent(prof.email)}?Subject=Contato%20LaPS`, 'assets/img/icons/email.png', 'emailTitle', 'E-mail');
      }

      body.appendChild(socialLinks);

      // Biografia (com suporte à tradução dinâmica)
      const profKey = profKeys[idx] || '';
      const bioText = profKey ? t(`members.bios.${profKey}`, prof.bio) : prof.bio;
      const linesText = profKey ? t(`members.lines.${profKey}`, prof.linhasPesquisa) : prof.linhasPesquisa;

      const bioPara = document.createElement('p');
      bioPara.className = 'member-bio';
      bioPara.textContent = bioText;
      body.appendChild(bioPara);

      // Linhas de pesquisa
      const linesWrap = document.createElement('div');
      linesWrap.className = 'member-research-lines';

      const linesLabel = document.createElement('strong');
      linesLabel.textContent = t('members.researchLinesLabel', 'Linhas de Pesquisa:') + ' ';
      linesWrap.appendChild(linesLabel);

      const linesContent = document.createElement('span');
      linesContent.textContent = linesText;
      linesWrap.appendChild(linesContent);

      body.appendChild(linesWrap);

      card.appendChild(imgWrapper);
      card.appendChild(body);
      grid.appendChild(card);
    });

    fragment.appendChild(grid);
    container.replaceChildren(fragment);
  }

  /* ==============================================================
     2. RENDERIZADOR: PROJETOS DE P&D
     ============================================================== */
  function renderProjetos() {
    const container = document.getElementById('projetos-container');
    if (!container || !state.projetos) return;

    const data = state.projetos;
    const fragment = document.createDocumentFragment();

    const grid = document.createElement('div');
    grid.className = 'projetos-grid';

    data.projetos.forEach((proj, idx) => {
      const card = document.createElement('article');
      card.className = 'project-card-modern';
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String(idx * 60));

      if (proj.imagem && isSafeUrl(proj.imagem)) {
        const imgWrap = document.createElement('div');
        imgWrap.className = 'project-cover-wrap';

        const imgLink = document.createElement('a');
        imgLink.href = proj.imagem;
        imgLink.className = 'venobox project-cover-link';
        imgLink.setAttribute('data-gall', 'portfolioGallery');
        imgLink.setAttribute('aria-label', `Ampliar imagem do projeto ${proj.titulo}`);

        const img = document.createElement('img');
        img.src = proj.imagem;
        img.alt = proj.titulo;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.className = 'project-cover-img';

        const overlay = document.createElement('div');
        overlay.className = 'project-cover-overlay';
        const iconZoom = document.createElement('i');
        iconZoom.className = 'bx bx-zoom-in';
        overlay.appendChild(iconZoom);

        imgLink.appendChild(img);
        imgLink.appendChild(overlay);
        imgWrap.appendChild(imgLink);
        card.appendChild(imgWrap);
      }

      const body = document.createElement('div');
      body.className = 'project-card-body';

      // Tradução do título do projeto se disponível
      const pKey = `p${idx + 1}`;
      const titleText = t(`projects.titles.${pKey}`, proj.titulo);

      const title = document.createElement('h3');
      title.className = 'project-title';
      title.textContent = titleText;
      body.appendChild(title);

      const badges = document.createElement('div');
      badges.className = 'project-meta-badges';

      // Badge Período
      const badgePeriod = document.createElement('span');
      badgePeriod.className = 'badge-meta badge-period';
      const iconCal = document.createElement('i');
      iconCal.className = 'bx bx-calendar';
      badgePeriod.appendChild(iconCal);
      const spanPeriod = document.createElement('span');
      spanPeriod.textContent = ` ${proj.periodo}`;
      badgePeriod.appendChild(spanPeriod);
      badges.appendChild(badgePeriod);

      // Badge Parceiro
      if (proj.parceiro && proj.parceiro.trim()) {
        const badgePartner = document.createElement('span');
        badgePartner.className = 'badge-meta badge-partner';
        const iconGrp = document.createElement('i');
        iconGrp.className = 'bx bx-group';
        badgePartner.appendChild(iconGrp);
        const spanPartner = document.createElement('span');
        spanPartner.textContent = ` ${proj.parceiro}`;
        badgePartner.appendChild(spanPartner);
        badges.appendChild(badgePartner);
      }

      // Badge Financiador
      if (proj.financiador && proj.financiador.trim() && proj.financiador !== '-') {
        const badgeFunder = document.createElement('span');
        badgeFunder.className = 'badge-meta badge-funder';
        const iconFund = document.createElement('i');
        iconFund.className = 'bx bx-award';
        badgeFunder.appendChild(iconFund);
        const spanFund = document.createElement('span');
        spanFund.textContent = ` ${proj.financiador}`;
        badgeFunder.appendChild(spanFund);
        badges.appendChild(badgeFunder);
      }

      body.appendChild(badges);
      card.appendChild(body);
      grid.appendChild(card);
    });

    fragment.appendChild(grid);
    container.replaceChildren(fragment);

    // Reinicializar venobox para imagens
    if (typeof window.$ !== 'undefined' && typeof window.$.fn.venobox !== 'undefined') {
      window.$('.venobox').venobox();
    }
  }

  /* ==============================================================
     3. RENDERIZADOR: HUB INTELIGENTE DE PUBLICAÇÕES
     ============================================================== */
  function renderProducao() {
    const container = document.getElementById('producao-container');
    if (!container || !state.producao) return;

    const data = state.producao;
    const fragment = document.createDocumentFragment();

    // 1. Barra de Controles: Busca instantânea + Filtro por Década
    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'publications-controls-bar';

    // Campo de busca
    const searchBox = document.createElement('div');
    searchBox.className = 'pub-search-box';
    const searchIcon = document.createElement('i');
    searchIcon.className = 'bx bx-search pub-search-icon';
    searchBox.appendChild(searchIcon);

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'pub-search-input';
    searchInput.placeholder = t('publications.searchPlaceholder', 'Buscar por título, autor, periódico ou DOI...');
    searchInput.value = state.searchQuery;
    searchInput.setAttribute('aria-label', t('publications.searchPlaceholder', 'Buscar publicações científicas'));

    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      state.visibleCount = state.pageSize;
      renderProducaoListOnly();
    });

    searchBox.appendChild(searchInput);
    controlsWrap.appendChild(searchBox);

    // Pílulas de filtro por período
    const filterPills = document.createElement('div');
    filterPills.className = 'pub-filter-pills';

    const filters = [
      { id: 'all', label: t('publications.filterAll', 'Todas') },
      { id: '2024-2027', label: t('publications.filter2024', '2024–2027') },
      { id: '2020-2023', label: t('publications.filter2020', '2020–2023') },
      { id: '2015-2019', label: t('publications.filter2015', '2015–2019') },
      { id: 'older', label: t('publications.filterOlder', 'Até 2014') }
    ];

    filters.forEach((f) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pub-pill-btn ${state.periodFilter === f.id ? 'active' : ''}`;
      btn.textContent = f.label;
      btn.setAttribute('aria-pressed', String(state.periodFilter === f.id));

      btn.addEventListener('click', () => {
        state.periodFilter = f.id;
        state.visibleCount = state.pageSize;
        renderProducao();
      });

      filterPills.appendChild(btn);
    });

    controlsWrap.appendChild(filterPills);
    fragment.appendChild(controlsWrap);

    // 2. Container da Lista de Publicações
    const listWrapper = document.createElement('div');
    listWrapper.id = 'pub-list-wrapper';
    fragment.appendChild(listWrapper);

    container.replaceChildren(fragment);
    renderProducaoListOnly();
  }

  function getFilteredPublications() {
    if (!state.producao || !Array.isArray(state.producao.producoes)) return [];

    const query = state.searchQuery;
    const filter = state.periodFilter;

    const results = [];

    state.producao.producoes.forEach((group) => {
      const year = parseInt(group.ano, 10) || 0;

      // Filtro por período
      if (filter === '2024-2027' && (year < 2024 || year > 2027)) return;
      if (filter === '2020-2023' && (year < 2020 || year > 2023)) return;
      if (filter === '2015-2019' && (year < 2015 || year > 2019)) return;
      if (filter === 'older' && year > 2014) return;

      if (!Array.isArray(group.trabalhos)) return;

      const matchingWorks = [];
      group.trabalhos.forEach((item) => {
        const text = typeof item === 'string' ? item : '';
        if (!query || text.toLowerCase().includes(query)) {
          matchingWorks.push({
            year: group.ano,
            text: text,
            doi: extractDoi(text)
          });
        }
      });

      if (matchingWorks.length > 0) {
        results.push({
          ano: group.ano,
          trabalhos: matchingWorks
        });
      }
    });

    return results;
  }

  function renderProducaoListOnly() {
    const listWrapper = document.getElementById('pub-list-wrapper');
    if (!listWrapper) return;

    const filteredGroups = getFilteredPublications();
    const totalMatching = filteredGroups.reduce((acc, g) => acc + g.trabalhos.length, 0);

    const fragment = document.createDocumentFragment();

    // Contador de resultados
    const counterBar = document.createElement('div');
    counterBar.className = 'pub-counter-bar';
    const visibleNow = Math.min(state.visibleCount, totalMatching);
    const counterTemplate = t('publications.showingCount', 'Exibindo {visible} de {total} produções científicas');
    counterBar.textContent = counterTemplate
      .replace('{visible}', String(visibleNow))
      .replace('{total}', String(totalMatching));
    fragment.appendChild(counterBar);

    if (totalMatching === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'pub-empty-state';
      const emptyIcon = document.createElement('i');
      emptyIcon.className = 'bx bx-info-circle';
      emptyState.appendChild(emptyIcon);
      const emptyText = document.createElement('p');
      emptyText.textContent = t('publications.noResults', 'Nenhuma publicação encontrada para o filtro informado.');
      emptyState.appendChild(emptyText);
      fragment.appendChild(emptyState);
      listWrapper.replaceChildren(fragment);
      return;
    }

    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-production-v2';

    let currentRendered = 0;

    for (const group of filteredGroups) {
      if (currentRendered >= state.visibleCount) break;

      // Calcular quantos trabalhos deste ano cabem
      const availableSlots = state.visibleCount - currentRendered;
      const worksToRender = group.trabalhos.slice(0, availableSlots);

      if (worksToRender.length > 0) {
        // Badge de Ano (SOMENTE exibido quando há trabalhos visíveis!)
        const yearBadge = document.createElement('div');
        yearBadge.className = 'timeline-year-badge-v2';
        const yearSpan = document.createElement('span');
        yearSpan.textContent = group.ano;
        yearBadge.appendChild(yearSpan);
        timelineContainer.appendChild(yearBadge);

        // Cards dos trabalhos
        worksToRender.forEach((work, idx) => {
          const point = document.createElement('article');
          const isLeft = (currentRendered + idx) % 2 === 0;
          point.className = `timeline-point-v2 ${isLeft ? 'left' : 'right'}`;

          const dot = document.createElement('div');
          dot.className = 'timeline-dot-v2';
          point.appendChild(dot);

          const card = document.createElement('div');
          card.className = 'timeline-card-v2';

          const contentPara = document.createElement('p');
          contentPara.className = 'pub-text';
          contentPara.textContent = work.text;
          card.appendChild(contentPara);

          // Barra de ações do artigo (DOI + Copiar BibTeX)
          const actionsBar = document.createElement('div');
          actionsBar.className = 'pub-actions-bar';

          // Link DOI se existir
          if (work.doi) {
            const doiLink = document.createElement('a');
            doiLink.href = `https://doi.org/${encodeURI(work.doi)}`;
            doiLink.target = '_blank';
            doiLink.rel = 'noopener noreferrer';
            doiLink.className = 'pub-action-btn pub-doi-btn';
            doiLink.title = `Abrir DOI: ${work.doi}`;
            const iconDoi = document.createElement('i');
            iconDoi.className = 'bx bx-link-external';
            doiLink.appendChild(iconDoi);
            const doiText = document.createElement('span');
            doiText.textContent = ` DOI: ${work.doi}`;
            doiLink.appendChild(doiText);
            actionsBar.appendChild(doiLink);
          }

          // Botão Copiar BibTeX
          const bibtexBtn = document.createElement('button');
          bibtexBtn.type = 'button';
          bibtexBtn.className = 'pub-action-btn pub-bibtex-btn';
          bibtexBtn.setAttribute('aria-label', 'Copiar citação BibTeX');
          const iconBib = document.createElement('i');
          iconBib.className = 'bx bx-copy';
          bibtexBtn.appendChild(iconBib);
          const btnSpan = document.createElement('span');
          btnSpan.textContent = ` ${t('publications.copyBibtex', 'Copiar BibTeX')}`;
          bibtexBtn.appendChild(btnSpan);

          bibtexBtn.addEventListener('click', async () => {
            const bibtex = generateBibtex(work.text, work.year);
            let copied = false;
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(bibtex);
                copied = true;
              }
            } catch (_) {
              // Fallback para ambientes sem permissão da Clipboard API
            }

            if (!copied) {
              try {
                const ta = document.createElement('textarea');
                ta.value = bibtex;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                copied = document.execCommand('copy');
                document.body.removeChild(ta);
              } catch (_) {}
            }

            // Sempre concede micro-feedback tátil visual ao usuário
            btnSpan.textContent = ` ${t('publications.copiedBibtex', 'BibTeX Copiado!')}`;
            bibtexBtn.classList.add('copied');
            setTimeout(() => {
              btnSpan.textContent = ` ${t('publications.copyBibtex', 'Copiar BibTeX')}`;
              bibtexBtn.classList.remove('copied');
            }, 2200);
          });

          actionsBar.appendChild(bibtexBtn);
          card.appendChild(actionsBar);
          point.appendChild(card);
          timelineContainer.appendChild(point);
        });

        currentRendered += worksToRender.length;
      }
    }

    fragment.appendChild(timelineContainer);

    // Botões de Paginação
    if (totalMatching > state.pageSize) {
      const paginationWrap = document.createElement('div');
      paginationWrap.className = 'pub-pagination-wrap';

      if (state.visibleCount < totalMatching) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.type = 'button';
        loadMoreBtn.className = 'btn-ver-mais';
        const iconDown = document.createElement('i');
        iconDown.className = 'bx bx-chevron-down';
        loadMoreBtn.appendChild(iconDown);
        const moreSpan = document.createElement('span');
        const remaining = totalMatching - state.visibleCount;
        moreSpan.textContent = ` ${t('publications.verMais', 'Ver mais produções')} (${remaining})`;
        loadMoreBtn.appendChild(moreSpan);

        loadMoreBtn.addEventListener('click', () => {
          state.visibleCount += state.pageSize;
          renderProducaoListOnly();
        });

        paginationWrap.appendChild(loadMoreBtn);
      }

      if (state.visibleCount > state.pageSize) {
        const showLessBtn = document.createElement('button');
        showLessBtn.type = 'button';
        showLessBtn.className = 'btn-ver-mais btn-secondary-laps';
        const iconUp = document.createElement('i');
        iconUp.className = 'bx bx-chevron-up';
        showLessBtn.appendChild(iconUp);
        const lessSpan = document.createElement('span');
        lessSpan.textContent = ` ${t('publications.verMenos', 'Recolher produções')}`;
        showLessBtn.appendChild(lessSpan);

        showLessBtn.addEventListener('click', () => {
          state.visibleCount = state.pageSize;
          renderProducaoListOnly();
          document.getElementById('producao')?.scrollIntoView({ behavior: 'smooth' });
        });

        paginationWrap.appendChild(showLessBtn);
      }

      fragment.appendChild(paginationWrap);
    }

    listWrapper.replaceChildren(fragment);

    if (typeof window.AOS !== 'undefined') {
      window.AOS.refresh();
    }
  }

  /**
   * Atualiza idioma ativo e re-renderiza componentes dinâmicos
   */
  window.updateDataLoaderLanguage = function (lang) {
    if (!lang) return;
    state.currentLang = lang;
    renderIntegrantes();
    renderProjetos();
    renderProducao();
  };

  /**
   * Inicialização
   */
  async function init() {
    // 1. Carregar lang.json primeiro para garantir traduções
    state.langDict = await loadJSON(DATA_PATHS.lang);

    // Detectar idioma inicial salvo ou parâmetro de URL
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    const savedLang = localStorage.getItem('laps-language');
    const initialLang = langParam || savedLang || 'pt';
    state.currentLang = ['pt', 'en', 'de', 'fr'].includes(initialLang) ? initialLang : 'pt';

    // 2. Carregar dados simultaneamente
    const [integrantesData, projetosData, producaoData] = await Promise.all([
      loadJSON(DATA_PATHS.integrantes),
      loadJSON(DATA_PATHS.projetos),
      loadJSON(DATA_PATHS.producao)
    ]);

    state.integrantes = integrantesData;
    state.projetos = projetosData;
    state.producao = producaoData;

    renderIntegrantes();
    renderProjetos();
    renderProducao();

    // Ouvir evento de troca de idioma disparado pelo main.js
    window.addEventListener('laps:languageChanged', (e) => {
      if (e.detail && e.detail.lang) {
        window.updateDataLoaderLanguage(e.detail.lang);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
