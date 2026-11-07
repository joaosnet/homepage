/**
 * LaPS Data Loader — Versão 3.0 (Expansão Completa LASSE, Equipe, Datasets, Patentes & Grafo Interativo)
 * - Blindagem total contra XSS (Construção 100% via DOM API segura)
 * - Prevenção de Tabnabbing (target="_blank" sempre com rel="noopener noreferrer")
 * - Equipe Completa: Docentes, Doutorandos, Mestrandos, Graduandos e Egressos
 * - Visualizador Tríplice da Equipe: Grade (Grid), Lista (List) e Grafo de Colaboração (Canvas 2D Force-Directed)
 * - Módulos LASSE: Datasets Científicos, Softwares Open Source, Patentes INPI, Notícias com Modal e Cursos
 * - Hub Inteligente de Publicações com Paginação, Busca Instantânea, Filtro por Década e Cópia BibTeX
 * - Suporte a i18n nativo reativo em 4 idiomas (PT, EN, DE, FR)
 */

(function () {
  'use strict';

  const DATA_PATHS = {
    integrantes: 'data/integrantes.json',
    projetos: 'data/projetos.json',
    producao: 'data/producao.json',
    softwares: 'data/softwares.json',
    patentes: 'data/patentes.json',
    datasets: 'data/datasets.json',
    noticias: 'data/noticias.json',
    cursos: 'data/cursos.json',
    lang: 'assets/js/lang.json'
  };

  // Estado global reativo
  const state = {
    currentLang: 'pt',
    langDict: null,
    integrantes: null,
    projetos: null,
    producao: null,
    softwares: null,
    patentes: null,
    datasets: null,
    noticias: null,
    cursos: null,

    // Filtros de Publicações
    searchQuery: '',
    periodFilter: 'all',
    visibleCount: 8,
    pageSize: 8,

    // Filtros e Visualização da Equipe
    teamCategory: 'all',
    teamSearchQuery: '',
    teamViewMode: 'grid', // 'grid' | 'list' | 'graph'

    // Aba ativa de Open Source & Patentes
    openSourceTab: 'softwares', // 'softwares' | 'patentes'

    // Instância ativa do Grafo
    graphInstance: null
  };

  /**
   * Validador de URLs seguras
   */
  function isSafeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('assets/') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('data:image/')
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
   * Gera avatar SVG elegante a partir das iniciais do membro
   */
  function generateInitialsAvatar(name, size = 120) {
    const initials = (name || 'LaPS')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
    const colors = ['#0284c7', '#0369a1', '#4f46e5', '#7c3aed', '#059669', '#0d9488'];
    const hash = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const bg = colors[hash % colors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size / 2)}" fill="${bg}"/>
      <text x="50%" y="54%" font-family="Inter, sans-serif" font-weight="600" font-size="${Math.round(size * 0.38)}px" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  /**
   * Carrega arquivo JSON
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
   * Extrai DOI de referência bibliográfica
   */
  function extractDoi(text) {
    if (!text) return null;
    const match = text.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
    if (!match) return null;
    let doi = match[0];
    if (doi.endsWith('.') || doi.endsWith(';') || doi.endsWith(',')) {
      doi = doi.slice(0, -1);
    }
    return doi;
  }

  /**
   * Gera entrada BibTeX
   */
  function generateBibtex(text, year) {
    const doi = extractDoi(text);
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
     1. RENDERIZADOR: EQUIPE COMPLETA (GRADE, LISTA & GRAFO)
     ============================================================== */

  function getAllTeamMembers() {
    if (!state.integrantes) return [];
    const profs = (state.integrantes.professores || []).map((m) => ({ ...m, roleCategory: 'professores' }));
    const douts = (state.integrantes.doutorandos || []).map((m) => ({ ...m, roleCategory: 'doutorandos' }));
    const mests = (state.integrantes.mestrandos || []).map((m) => ({ ...m, roleCategory: 'mestrandos' }));
    const grads = (state.integrantes.graduandos || []).map((m) => ({ ...m, roleCategory: 'graduandos' }));
    const egres = (state.integrantes.egressos || []).map((m) => ({ ...m, roleCategory: 'egressos' }));
    return [...profs, ...douts, ...mests, ...grads, ...egres];
  }

  function getCategoryLabel(catKey) {
    switch (catKey) {
      case 'professores':
        return t('members.categoryProfessores', 'Docentes');
      case 'doutorandos':
        return t('members.categoryDoutorado', 'Doutorado');
      case 'mestrandos':
        return t('members.categoryMestrado', 'Mestrado');
      case 'graduandos':
        return t('members.categoryGraduacao', 'Iniciação Científica');
      case 'egressos':
        return t('members.categoryEgressos', 'Egressos');
      default:
        return t('members.categoryTodos', 'Todos');
    }
  }

  function renderIntegrantes() {
    const container = document.getElementById('integrantes-container');
    if (!container || !state.integrantes) return;

    const fragment = document.createDocumentFragment();

    // 1. Barra de Controles da Equipe (Filtros de Categoria, Busca e Seletor de Visão)
    const toolbar = document.createElement('div');
    toolbar.className = 'team-toolbar';

    // Pílulas de Categoria
    const pillsWrap = document.createElement('div');
    pillsWrap.className = 'team-category-pills';
    pillsWrap.setAttribute('role', 'tablist');
    pillsWrap.setAttribute('aria-label', t('members.title', 'Categorias da Equipe'));

    const categories = [
      { id: 'all', label: t('members.categoryTodos', 'Todos') },
      { id: 'professores', label: t('members.categoryProfessores', 'Docentes') },
      { id: 'doutorandos', label: t('members.categoryDoutorado', 'Doutorado') },
      { id: 'mestrandos', label: t('members.categoryMestrado', 'Mestrado') },
      { id: 'graduandos', label: t('members.categoryGraduacao', 'Iniciação Científica') },
      { id: 'egressos', label: t('members.categoryEgressos', 'Egressos') }
    ];

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `team-pill-btn ${state.teamCategory === cat.id ? 'active' : ''}`;
      btn.textContent = cat.label;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(state.teamCategory === cat.id));
      btn.setAttribute('data-category', cat.id);

      btn.addEventListener('click', () => {
        state.teamCategory = cat.id;
        renderIntegrantes();
      });

      pillsWrap.appendChild(btn);
    });

    toolbar.appendChild(pillsWrap);

    // Controles Secundários: Busca + Seletor de Visão (Grade | Lista | Grafo)
    const rightControls = document.createElement('div');
    rightControls.className = 'team-right-controls';

    // Campo de Busca
    const searchBox = document.createElement('div');
    searchBox.className = 'team-search-box';
    const sIcon = document.createElement('i');
    sIcon.className = 'bx bx-search team-search-icon';
    searchBox.appendChild(sIcon);

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'team-search-input';
    searchInput.placeholder = t('members.searchPlaceholder', 'Buscar por nome, orientador ou pesquisa...');
    searchInput.value = state.teamSearchQuery;
    searchInput.setAttribute('aria-label', t('members.searchPlaceholder', 'Buscar membros da equipe'));

    searchInput.addEventListener('input', (e) => {
      state.teamSearchQuery = e.target.value.toLowerCase().trim();
      renderTeamContentOnly();
    });

    searchBox.appendChild(searchInput);
    rightControls.appendChild(searchBox);

    // Seletor de Visão
    const viewSwitcher = document.createElement('div');
    viewSwitcher.className = 'team-view-switcher';
    viewSwitcher.setAttribute('role', 'group');
    viewSwitcher.setAttribute('aria-label', t('members.viewSwitcherLabel', 'Modo de visualização'));

    const views = [
      { id: 'grid', label: t('members.viewGrid', 'Grade'), icon: 'bx-grid-alt' },
      { id: 'list', label: t('members.viewList', 'Lista'), icon: 'bx-list-ul' },
      { id: 'graph', label: t('members.viewGraph', 'Grafo Interativo'), icon: 'bx-git-repo-forked' }
    ];

    views.forEach((v) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `team-view-btn ${state.teamViewMode === v.id ? 'active' : ''}`;
      btn.setAttribute('data-view', v.id);
      btn.setAttribute('title', v.label);
      btn.setAttribute('aria-label', v.label);
      btn.setAttribute('aria-pressed', String(state.teamViewMode === v.id));

      const icon = document.createElement('i');
      icon.className = `bx ${v.icon}`;
      btn.appendChild(icon);

      const labelSpan = document.createElement('span');
      labelSpan.className = 'd-none d-sm-inline ml-1';
      labelSpan.textContent = ` ${v.label}`;
      btn.appendChild(labelSpan);

      btn.addEventListener('click', () => {
        state.teamViewMode = v.id;
        renderIntegrantes();
      });

      viewSwitcher.appendChild(btn);
    });

    rightControls.appendChild(viewSwitcher);
    toolbar.appendChild(rightControls);
    fragment.appendChild(toolbar);

    // 2. Container Dinâmico de Conteúdo da Equipe
    const contentWrapper = document.createElement('div');
    contentWrapper.id = 'team-content-wrapper';
    fragment.appendChild(contentWrapper);

    container.replaceChildren(fragment);
    renderTeamContentOnly();
  }

  function getFilteredTeamMembers() {
    const allMembers = getAllTeamMembers();
    const cat = state.teamCategory;
    const query = state.teamSearchQuery;

    return allMembers.filter((m) => {
      if (cat !== 'all' && m.roleCategory !== cat) {
        return false;
      }
      if (query) {
        const textTarget = [
          m.nome || '',
          m.orientador || '',
          m.linhasPesquisa || '',
          m.projeto || '',
          m.titulacao || '',
          m.programa || '',
          m.bio || ''
        ]
          .join(' ')
          .toLowerCase();
        if (!textTarget.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }

  function renderTeamContentOnly() {
    const wrapper = document.getElementById('team-content-wrapper');
    if (!wrapper) return;

    // Destruir grafo anterior se ativo
    if (state.graphInstance && typeof state.graphInstance.destroy === 'function') {
      state.graphInstance.destroy();
      state.graphInstance = null;
    }

    const filtered = getFilteredTeamMembers();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'team-empty-state';
      const icon = document.createElement('i');
      icon.className = 'bx bx-user-x';
      empty.appendChild(icon);
      const text = document.createElement('p');
      text.textContent = t('members.noMembersFound', 'Nenhum membro encontrado com os critérios informados.');
      empty.appendChild(text);
      wrapper.replaceChildren(empty);
      return;
    }

    if (state.teamViewMode === 'grid') {
      renderTeamGrid(wrapper, filtered);
    } else if (state.teamViewMode === 'list') {
      renderTeamList(wrapper, filtered);
    } else if (state.teamViewMode === 'graph') {
      renderTeamGraph(wrapper, filtered);
    }
  }

  /**
   * Visão em Grade (Grid com Cards Modernos)
   */
  function renderTeamGrid(wrapper, members) {
    const grid = document.createElement('div');
    grid.className = 'team-cards-grid';

    const profKeys = {
      'Ana Carolina Q. Siravenha': 'ana',
      'Antônio Pereira Júnior': 'antonio',
      'Francisco Carlos Bentes Frey Müller': 'francisco',
      'Ronaldo de Freitas Zampolo': 'ronaldo'
    };

    members.forEach((member, idx) => {
      const card = document.createElement('article');
      card.className = `member-card ${member.roleCategory === 'professores' ? 'member-card-faculty' : 'member-card-discente'}`;
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String((idx % 8) * 50));

      // Cabeçalho da foto
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'member-img-wrap';

      const img = document.createElement('img');
      const safePhoto = member.foto && isSafeUrl(member.foto) ? member.foto : generateInitialsAvatar(member.nome);
      img.src = safePhoto;
      img.alt = `Foto de ${member.nome}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.className = 'member-photo';
      img.onerror = () => {
        img.src = generateInitialsAvatar(member.nome);
      };
      imgWrapper.appendChild(img);

      // Badge de Categoria Flutuante
      const catBadge = document.createElement('span');
      catBadge.className = `member-badge-category badge-cat-${member.roleCategory}`;
      catBadge.textContent = getCategoryLabel(member.roleCategory);
      imgWrapper.appendChild(catBadge);

      card.appendChild(imgWrapper);

      // Corpo com informações
      const body = document.createElement('div');
      body.className = 'member-body';

      const name = document.createElement('h3');
      name.className = 'member-name';
      name.textContent = member.nome;
      body.appendChild(name);

      // Subtítulo / Titulação / Programa
      const subTitle = document.createElement('div');
      subTitle.className = 'member-subtitle';
      if (member.titulacao) {
        subTitle.textContent = member.titulacao;
      } else if (member.programa) {
        subTitle.textContent = member.programa;
      }
      body.appendChild(subTitle);

      // Orientador (quando aplicável)
      if (member.orientador) {
        const advRow = document.createElement('div');
        advRow.className = 'member-advisor-row';
        const advIcon = document.createElement('i');
        advIcon.className = 'bx bx-user-pin';
        advRow.appendChild(advIcon);
        const advText = document.createElement('span');
        advText.textContent = ` ${t('members.advisorLabel', 'Orientador(a):')} ${member.orientador}`;
        advRow.appendChild(advText);
        body.appendChild(advRow);
      }

      // Projeto Vinculado (quando aplicável)
      if (member.projeto) {
        const projRow = document.createElement('div');
        projRow.className = 'member-project-row';
        const pIcon = document.createElement('i');
        pIcon.className = 'bx bx-bulb';
        projRow.appendChild(pIcon);
        const pText = document.createElement('span');
        pText.textContent = ` ${t('members.projectLabel', 'Projeto:')} ${member.projeto}`;
        projRow.appendChild(pText);
        body.appendChild(projRow);
      }

      // Biografia / Linhas de Pesquisa
      if (member.bio) {
        const profKey = profKeys[member.nome] || '';
        const bioText = profKey ? t(`members.bios.${profKey}`, member.bio) : member.bio;
        const bioPara = document.createElement('p');
        bioPara.className = 'member-bio';
        bioPara.textContent = bioText;
        body.appendChild(bioPara);
      }

      if (member.linhasPesquisa) {
        const profKey = profKeys[member.nome] || '';
        const linesText = profKey ? t(`members.lines.${profKey}`, member.linhasPesquisa) : member.linhasPesquisa;
        const linesWrap = document.createElement('div');
        linesWrap.className = 'member-research-lines';
        const linesLabel = document.createElement('strong');
        linesLabel.textContent = t('members.researchLinesLabel', 'Linhas de Pesquisa:') + ' ';
        linesWrap.appendChild(linesLabel);
        const linesContent = document.createElement('span');
        linesContent.textContent = linesText;
        linesWrap.appendChild(linesContent);
        body.appendChild(linesWrap);
      }

      // Links Acadêmicos & Redes
      const socialLinks = document.createElement('div');
      socialLinks.className = 'member-social-links';

      function addLink(url, iconClass, label, titleKey) {
        if (!url || !isSafeUrl(url)) return;
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        const titleText = titleKey ? t(`members.${titleKey}`, label) : label;
        a.title = `${titleText} - ${member.nome}`;
        a.setAttribute('aria-label', `${titleText} - ${member.nome}`);
        a.className = 'academic-icon-btn';
        const icon = document.createElement('i');
        icon.className = `bx ${iconClass}`;
        a.appendChild(icon);
        socialLinks.appendChild(a);
      }

      addLink(member.lattes, 'bx-id-card', 'Lattes', 'lattesTitle');
      addLink(member.orcid, 'bx-award', 'ORCID', 'orcidTitle');
      addLink(member.scholar, 'bx-book-open', 'Google Scholar', 'scholarTitle');
      addLink(member.github, 'bxl-github', 'GitHub', 'githubTitle');
      addLink(member.linkedin, 'bxl-linkedin', 'LinkedIn', 'linkedinTitle');
      if (member.email) {
        addLink(`mailto:${encodeURIComponent(member.email)}?Subject=Contato%20LaPS`, 'bx-envelope', 'E-mail', 'emailTitle');
      }

      body.appendChild(socialLinks);
      card.appendChild(body);
      grid.appendChild(card);
    });

    wrapper.replaceChildren(grid);
  }

  /**
   * Visão em Lista Compacta e Acessível
   */
  function renderTeamList(wrapper, members) {
    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-responsive team-list-container';

    const table = document.createElement('table');
    table.className = 'team-table table table-hover';
    table.setAttribute('aria-label', t('members.title', 'Tabela de Membros do LaPS'));

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th scope="col">${t('members.tableColName', 'Nome')}</th>
        <th scope="col">${t('members.tableColCategory', 'Categoria')}</th>
        <th scope="col">${t('members.tableColAdvisor', 'Orientador / Programa')}</th>
        <th scope="col">${t('members.tableColResearch', 'Pesquisa / Projeto')}</th>
        <th scope="col" class="text-right">${t('members.tableColLinks', 'Perfis')}</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    members.forEach((m) => {
      const tr = document.createElement('tr');

      // Coluna Nome + Avatar mini
      const tdName = document.createElement('td');
      tdName.className = 'team-td-name';
      const nameWrap = document.createElement('div');
      nameWrap.className = 'd-flex align-items-center';

      const miniImg = document.createElement('img');
      miniImg.src = m.foto && isSafeUrl(m.foto) ? m.foto : generateInitialsAvatar(m.nome, 36);
      miniImg.alt = m.nome;
      miniImg.className = 'team-mini-avatar mr-2';
      miniImg.loading = 'lazy';
      miniImg.onerror = () => {
        miniImg.src = generateInitialsAvatar(m.nome, 36);
      };
      nameWrap.appendChild(miniImg);

      const spanName = document.createElement('strong');
      spanName.textContent = m.nome;
      nameWrap.appendChild(spanName);
      tdName.appendChild(nameWrap);
      tr.appendChild(tdName);

      // Coluna Categoria
      const tdCat = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = `badge-meta badge-cat-${m.roleCategory}`;
      badge.textContent = getCategoryLabel(m.roleCategory);
      tdCat.appendChild(badge);
      tr.appendChild(tdCat);

      // Coluna Orientador / Programa
      const tdAdv = document.createElement('td');
      tdAdv.textContent = m.orientador ? `${m.orientador} (${m.programa || 'UFPA'})` : (m.titulacao || m.programa || 'Docente UFPA');
      tr.appendChild(tdAdv);

      // Coluna Pesquisa / Projeto
      const tdRes = document.createElement('td');
      tdRes.className = 'team-td-research';
      tdRes.textContent = m.linhasPesquisa || m.projeto || '-';
      tr.appendChild(tdRes);

      // Coluna Links
      const tdLinks = document.createElement('td');
      tdLinks.className = 'text-right team-td-links';

      function addTableIcon(url, iconClass, title) {
        if (!url || !isSafeUrl(url)) return;
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'team-table-link-btn mr-1';
        a.title = `${title} - ${m.nome}`;
        a.setAttribute('aria-label', `${title} - ${m.nome}`);
        const i = document.createElement('i');
        i.className = `bx ${iconClass}`;
        a.appendChild(i);
        tdLinks.appendChild(a);
      }

      addTableIcon(m.lattes, 'bx-id-card', 'Lattes');
      addTableIcon(m.orcid, 'bx-award', 'ORCID');
      addTableIcon(m.scholar, 'bx-book-open', 'Google Scholar');
      addTableIcon(m.github, 'bxl-github', 'GitHub');
      addTableIcon(m.linkedin, 'bxl-linkedin', 'LinkedIn');
      if (m.email) {
        addTableIcon(`mailto:${encodeURIComponent(m.email)}`, 'bx-envelope', 'E-mail');
      }

      tr.appendChild(tdLinks);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrapper.replaceChildren(tableWrap);
  }

  /**
   * Visão em Grafo de Colaboração (HTML5 Canvas Force-Directed)
   */
  function renderTeamGraph(wrapper, members) {
    const graphContainer = document.createElement('div');
    graphContainer.className = 'team-graph-container';

    // Barra de Ferramentas do Grafo
    const graphToolbar = document.createElement('div');
    graphToolbar.className = 'graph-toolbar';

    const legend = document.createElement('div');
    legend.className = 'graph-legend';
    legend.innerHTML = `
      <span class="legend-item"><span class="legend-dot dot-faculty"></span> ${t('members.categoryProfessores', 'Docentes')}</span>
      <span class="legend-item"><span class="legend-dot dot-phd"></span> ${t('members.categoryDoutorado', 'Doutorado')}</span>
      <span class="legend-item"><span class="legend-dot dot-msc"></span> ${t('members.categoryMestrado', 'Mestrado')}</span>
      <span class="legend-item"><span class="legend-dot dot-ic"></span> ${t('members.categoryGraduacao', 'Graduação')}</span>
      <span class="legend-item"><span class="legend-dot dot-alumni"></span> ${t('members.categoryEgressos', 'Egressos')}</span>
      <span class="legend-item"><span class="legend-dot dot-hub"></span> ${t('members.graphHub', 'Linhas de Pesquisa')}</span>
    `;
    graphToolbar.appendChild(legend);

    const zoomControls = document.createElement('div');
    zoomControls.className = 'graph-zoom-controls';
    zoomControls.innerHTML = `
      <button type="button" class="graph-btn" id="graph-zoom-in" title="Aproximar"><i class="bx bx-plus"></i></button>
      <button type="button" class="graph-btn" id="graph-zoom-out" title="Afastar"><i class="bx bx-minus"></i></button>
      <button type="button" class="graph-btn" id="graph-zoom-reset" title="Centralizar"><i class="bx bx-reset"></i></button>
    `;
    graphToolbar.appendChild(zoomControls);

    graphContainer.appendChild(graphToolbar);

    // Canvas do Grafo
    const canvas = document.createElement('canvas');
    canvas.id = 'team-network-canvas';
    canvas.className = 'team-network-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('members.graphAriaLabel', 'Grafo interativo de colaboração e orientação científica do LaPS'));
    graphContainer.appendChild(canvas);

    // Tooltip Flutuante
    const tooltip = document.createElement('div');
    tooltip.id = 'team-graph-tooltip';
    tooltip.className = 'team-graph-tooltip';
    graphContainer.appendChild(tooltip);

    wrapper.replaceChildren(graphContainer);

    // Inicializar simulação física do grafo
    initNetworkGraph(canvas, tooltip, members);
  }

  function initNetworkGraph(canvas, tooltip, members) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.parentElement.clientWidth || 800;
    let height = 520;
    const dpr = window.devicePixelRatio || 1;

    function resizeCanvas() {
      width = canvas.parentElement.clientWidth || 800;
      height = window.innerWidth < 768 ? 440 : 540;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    }
    resizeCanvas();

    // Nós temáticos centrais (Linhas de Pesquisa / Eixos)
    const researchHubs = [
      { id: 'hub-ia-vis', label: 'Visão & IA', color: '#8b5cf6', radius: 22, isHub: true },
      { id: 'hub-bio-eeg', label: 'Sinais & Neuro', color: '#ec4899', radius: 22, isHub: true },
      { id: 'hub-telecom', label: 'Telecom 5G/6G', color: '#06b6d4', radius: 22, isHub: true }
    ];

    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    // Adicionar hubs
    researchHubs.forEach((hub, i) => {
      const angle = (i / researchHubs.length) * Math.PI * 2;
      const hNode = {
        id: hub.id,
        name: hub.label,
        type: 'hub',
        color: hub.color,
        radius: hub.radius,
        x: width / 2 + Math.cos(angle) * 110,
        y: height / 2 + Math.sin(angle) * 110,
        vx: 0,
        vy: 0,
        isHub: true
      };
      nodes.push(hNode);
      nodeMap.set(hub.id, hNode);
    });

    // Mapeamento de cores por categoria
    const categoryColors = {
      professores: '#0284c7',
      doutorandos: '#10b981',
      mestrandos: '#3b82f6',
      graduandos: '#f59e0b',
      egressos: '#94a3b8'
    };

    const categoryRadii = {
      professores: 20,
      doutorandos: 15,
      mestrandos: 13,
      graduandos: 11,
      egressos: 11
    };

    members.forEach((m, i) => {
      const angle = (i / members.length) * Math.PI * 2;
      const dist = m.roleCategory === 'professores' ? 160 : 230;
      const radius = categoryRadii[m.roleCategory] || 12;
      const color = categoryColors[m.roleCategory] || '#0284c7';

      const n = {
        id: m.id || `node-${i}`,
        name: m.nome,
        data: m,
        type: m.roleCategory,
        color: color,
        radius: radius,
        x: width / 2 + Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
        y: height / 2 + Math.sin(angle) * dist + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0
      };
      nodes.push(n);
      nodeMap.set(n.id, n);
    });

    // Criar arestas (Conexões de Orientação e Linhas de Pesquisa)
    nodes.forEach((n) => {
      if (n.isHub) return;
      const m = n.data;

      // 1. Conexão Discente -> Orientador Docente
      if (m.orientador) {
        const orientadorSub = m.orientador.split(' ')[0].toLowerCase();
        for (const target of nodes) {
          if (target.type === 'professores' && target.name.toLowerCase().includes(orientadorSub)) {
            edges.push({ source: n, target: target, length: 90, color: 'rgba(2, 132, 199, 0.4)' });
            break;
          }
        }
      }

      // 2. Conexão com Hubs Temáticos baseado no texto de pesquisa
      const researchText = ((m.linhasPesquisa || '') + ' ' + (m.projeto || '')).toLowerCase();
      if (researchText.includes('visão') || researchText.includes('imagem') || researchText.includes('deep learning')) {
        edges.push({ source: n, target: nodeMap.get('hub-ia-vis'), length: 110, color: 'rgba(139, 92, 246, 0.25)' });
      }
      if (researchText.includes('eeg') || researchText.includes('bioelétrico') || researchText.includes('neuro') || researchText.includes('psicofísica')) {
        edges.push({ source: n, target: nodeMap.get('hub-bio-eeg'), length: 110, color: 'rgba(236, 72, 153, 0.25)' });
      }
      if (researchText.includes('comunicaç') || researchText.includes('sinal') || researchText.includes('alta tensão') || researchText.includes('ozônio') || researchText.includes('telecom')) {
        edges.push({ source: n, target: nodeMap.get('hub-telecom'), length: 110, color: 'rgba(6, 182, 212, 0.25)' });
      }
    });

    // Física e Interatividade
    let zoom = 1.0;
    let panX = 0;
    let panY = 0;
    let draggedNode = null;
    let hoveredNode = null;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;
    let animId = null;

    function simulatePhysics() {
      const kRepel = 2400;
      const kCenter = 0.008;
      const cx = width / 2;
      const cy = height / 2;

      // Repulsão entre nós
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);
          const force = kRepel / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== draggedNode) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (n2 !== draggedNode) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // Atração pelas molas das arestas
      edges.forEach((edge) => {
        const dx = edge.target.x - edge.source.x;
        const dy = edge.target.y - edge.source.y;
        const dist = Math.hypot(dx, dy) || 1;
        const diff = dist - (edge.length || 100);
        const force = diff * 0.035;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (edge.source !== draggedNode) {
          edge.source.vx += fx;
          edge.source.vy += fy;
        }
        if (edge.target !== draggedNode) {
          edge.target.vx -= fx;
          edge.target.vy -= fy;
        }
      });

      // Força de atração central e amortecimento
      nodes.forEach((n) => {
        if (n === draggedNode) return;
        n.vx += (cx - n.x) * kCenter;
        n.vy += (cy - n.y) * kCenter;

        n.vx *= 0.84;
        n.vy *= 0.84;

        n.x += n.vx;
        n.y += n.vy;

        // Limites da tela
        const pad = n.radius + 10;
        n.x = Math.max(pad, Math.min(width - pad, n.x));
        n.y = Math.max(pad, Math.min(height - pad, n.y));
      });
    }

    function renderFrame() {
      simulatePhysics();

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Fundo e grade sutil de coordenadas
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      ctx.fillStyle = isDark ? '#090D16' : '#F8FAFC';
      ctx.fillRect(0, 0, width, height);

      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // Desenhar Arestas
      edges.forEach((edge) => {
        const isHighlighted = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);
        ctx.strokeStyle = isHighlighted ? (isDark ? '#38BDF8' : '#0284C7') : edge.color;
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        ctx.stroke();
      });

      // Desenhar Nós
      nodes.forEach((n) => {
        const isHovered = n === hoveredNode;
        const radius = isHovered ? n.radius + 4 : n.radius;

        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = isHovered ? 16 : 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.lineWidth = isHovered ? 3 : 1.5;
        ctx.strokeStyle = isDark ? '#1E293B' : '#FFFFFF';
        ctx.stroke();

        // Rótulo simplificado do nó
        ctx.font = n.isHub ? '600 11px Inter, sans-serif' : '500 10px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
        ctx.textAlign = 'center';
        const shortName = n.name.split(' ')[0];
        ctx.fillText(n.isHub ? n.name : shortName, n.x, n.y + radius + 12);
      });

      ctx.restore();
      animId = requestAnimationFrame(renderFrame);
    }

    animId = requestAnimationFrame(renderFrame);

    // Eventos do Mouse e Toque
    function getCanvasCoordinates(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const x = (clientX - rect.left - panX) / zoom;
      const y = (clientY - rect.top - panY) / zoom;
      return { x, y, rawX: clientX - rect.left, rawY: clientY - rect.top };
    }

    function findNodeAt(x, y) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dist = Math.hypot(n.x - x, n.y - y);
        if (dist <= n.radius + 6) return n;
      }
      return null;
    }

    canvas.addEventListener('mousemove', (e) => {
      const { x, y, rawX, rawY } = getCanvasCoordinates(e);

      if (draggedNode) {
        draggedNode.x = x;
        draggedNode.y = y;
        draggedNode.vx = 0;
        draggedNode.vy = 0;
        return;
      }

      if (isPanning) {
        panX = rawX - startPanX;
        panY = rawY - startPanY;
        return;
      }

      const node = findNodeAt(x, y);
      hoveredNode = node;
      canvas.style.cursor = node ? 'grab' : 'crosshair';

      if (node && node.data) {
        const m = node.data;
        tooltip.innerHTML = `
          <div class="tip-header">
            <strong>${m.nome}</strong>
            <span class="tip-badge badge-cat-${m.roleCategory}">${getCategoryLabel(m.roleCategory)}</span>
          </div>
          ${m.orientador ? `<div class="tip-row"><i class="bx bx-user-pin"></i> ${m.orientador}</div>` : ''}
          ${m.linhasPesquisa ? `<div class="tip-row"><i class="bx bx-bulb"></i> ${m.linhasPesquisa}</div>` : ''}
        `;
        tooltip.style.left = `${rawX + 16}px`;
        tooltip.style.top = `${rawY + 16}px`;
        tooltip.classList.add('visible');
      } else if (node && node.isHub) {
        tooltip.innerHTML = `
          <div class="tip-header">
            <strong>Eixo Científico LaPS</strong>
          </div>
          <div class="tip-row">${node.name}</div>
        `;
        tooltip.style.left = `${rawX + 16}px`;
        tooltip.style.top = `${rawY + 16}px`;
        tooltip.classList.add('visible');
      } else {
        tooltip.classList.remove('visible');
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      const { x, y, rawX, rawY } = getCanvasCoordinates(e);
      const node = findNodeAt(x, y);
      if (node) {
        draggedNode = node;
        canvas.style.cursor = 'grabbing';
      } else {
        isPanning = true;
        startPanX = rawX - panX;
        startPanY = rawY - panY;
      }
    });

    window.addEventListener('mouseup', () => {
      draggedNode = null;
      isPanning = false;
      canvas.style.cursor = 'default';
    });

    // Controles de Zoom
    const zoomInBtn = document.getElementById('graph-zoom-in');
    const zoomOutBtn = document.getElementById('graph-zoom-out');
    const zoomResetBtn = document.getElementById('graph-zoom-reset');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        zoom = Math.min(2.5, zoom + 0.2);
      });
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        zoom = Math.max(0.6, zoom - 0.2);
      });
    }
    if (zoomResetBtn) {
      zoomResetBtn.addEventListener('click', () => {
        zoom = 1.0;
        panX = 0;
        panY = 0;
      });
    }

    // Instância registrada para destruição segura
    state.graphInstance = {
      destroy: () => {
        cancelAnimationFrame(animId);
      }
    };
  }

  /* ==============================================================
     2. RENDERIZADOR: DATASETS CIENTÍFICOS
     ============================================================== */
  function renderDatasets() {
    const container = document.getElementById('datasets-container');
    if (!container || !state.datasets) return;

    const data = state.datasets;
    const fragment = document.createDocumentFragment();

    const grid = document.createElement('div');
    grid.className = 'datasets-grid';

    data.forEach((ds, idx) => {
      const card = document.createElement('article');
      card.className = 'dataset-card-modern';
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String(idx * 70));

      const header = document.createElement('div');
      header.className = 'dataset-header';

      const catBadge = document.createElement('span');
      catBadge.className = 'badge-meta badge-dataset-cat';
      const iconDb = document.createElement('i');
      iconDb.className = 'bx bx-data';
      catBadge.appendChild(iconDb);
      const catText = document.createElement('span');
      catText.textContent = ` ${ds.categoria}`;
      catBadge.appendChild(catText);
      header.appendChild(catBadge);

      const yearBadge = document.createElement('span');
      yearBadge.className = 'badge-meta badge-year';
      yearBadge.textContent = String(ds.ano);
      header.appendChild(yearBadge);

      card.appendChild(header);

      const title = document.createElement('h3');
      title.className = 'dataset-title';
      title.textContent = ds.titulo;
      card.appendChild(title);

      const desc = document.createElement('p');
      desc.className = 'dataset-desc';
      desc.textContent = ds.descricao;
      card.appendChild(desc);

      // Metadados técnicos
      const metaList = document.createElement('div');
      metaList.className = 'dataset-tech-meta';

      const itemFmt = document.createElement('div');
      itemFmt.className = 'tech-meta-item';
      itemFmt.innerHTML = `<strong>${t('datasets.formatLabel', 'Formato:')}</strong> ${ds.formato}`;
      metaList.appendChild(itemFmt);

      const itemSamples = document.createElement('div');
      itemSamples.className = 'tech-meta-item';
      itemSamples.innerHTML = `<strong>${t('datasets.samplesLabel', 'Amostras:')}</strong> ${ds.amostras}`;
      metaList.appendChild(itemSamples);

      const itemLic = document.createElement('div');
      itemLic.className = 'tech-meta-item';
      itemLic.innerHTML = `<strong>${t('datasets.licenseLabel', 'Licença:')}</strong> ${ds.licenca}`;
      metaList.appendChild(itemLic);

      card.appendChild(metaList);

      // Ações (Download / Repositório & Citação)
      const actions = document.createElement('div');
      actions.className = 'dataset-actions';

      if (ds.link && isSafeUrl(ds.link)) {
        const linkBtn = document.createElement('a');
        linkBtn.href = ds.link;
        linkBtn.target = '_blank';
        linkBtn.rel = 'noopener noreferrer';
        linkBtn.className = 'btn-laps-primary dataset-btn';
        const dIcon = document.createElement('i');
        dIcon.className = 'bx bx-download';
        linkBtn.appendChild(dIcon);
        const lSpan = document.createElement('span');
        lSpan.textContent = ` ${t('datasets.accessDataset', 'Acessar Dados')}`;
        linkBtn.appendChild(lSpan);
        actions.appendChild(linkBtn);
      }

      // Botão Copiar Citação
      const citeBtn = document.createElement('button');
      citeBtn.type = 'button';
      citeBtn.className = 'btn-laps-secondary dataset-btn';
      citeBtn.setAttribute('aria-label', t('datasets.copyCitation', 'Copiar Citação do Dataset'));
      const cIcon = document.createElement('i');
      cIcon.className = 'bx bx-copy';
      citeBtn.appendChild(cIcon);
      const cSpan = document.createElement('span');
      cSpan.textContent = ` ${t('datasets.cite', 'Citar')}`;
      citeBtn.appendChild(cSpan);

      citeBtn.addEventListener('click', async () => {
        const citation = `${ds.titulo}. Laboratório de Processamento de Sinais (LaPS/UFPA), ${ds.ano}. Licença: ${ds.licenca}. Disponível em: ${ds.link}`;
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(citation);
          }
        } catch (_) {}
        cSpan.textContent = ` ${t('publications.copiedBibtex', 'Copiado!')}`;
        setTimeout(() => {
          cSpan.textContent = ` ${t('datasets.cite', 'Citar')}`;
        }, 2000);
      });

      actions.appendChild(citeBtn);
      card.appendChild(actions);
      grid.appendChild(card);
    });

    fragment.appendChild(grid);
    container.replaceChildren(fragment);
  }

  /* ==============================================================
     3. RENDERIZADOR: SOFTWARES OPEN SOURCE & PATENTES INPI
     ============================================================== */
  function renderOpenSourceAndPatentes() {
    const container = document.getElementById('open-source-container');
    if (!container) return;

    const fragment = document.createDocumentFragment();

    // Barra de Abas (Tabs)
    const tabsWrap = document.createElement('div');
    tabsWrap.className = 'open-source-tabs';
    tabsWrap.setAttribute('role', 'tablist');

    const tabSoftwares = document.createElement('button');
    tabSoftwares.type = 'button';
    tabSoftwares.className = `os-tab-btn ${state.openSourceTab === 'softwares' ? 'active' : ''}`;
    tabSoftwares.innerHTML = `<i class="bx bxl-github mr-1"></i> ${t('softwares.tabSoftwares', 'Softwares & Repositórios GitHub')}`;
    tabSoftwares.setAttribute('role', 'tab');
    tabSoftwares.setAttribute('aria-selected', String(state.openSourceTab === 'softwares'));

    tabSoftwares.addEventListener('click', () => {
      state.openSourceTab = 'softwares';
      renderOpenSourceAndPatentes();
    });

    const tabPatentes = document.createElement('button');
    tabPatentes.type = 'button';
    tabPatentes.className = `os-tab-btn ${state.openSourceTab === 'patentes' ? 'active' : ''}`;
    tabPatentes.innerHTML = `<i class="bx bx-award mr-1"></i> ${t('softwares.tabPatentes', 'Patentes & Registros INPI')}`;
    tabPatentes.setAttribute('role', 'tab');
    tabPatentes.setAttribute('aria-selected', String(state.openSourceTab === 'patentes'));

    tabPatentes.addEventListener('click', () => {
      state.openSourceTab = 'patentes';
      renderOpenSourceAndPatentes();
    });

    tabsWrap.appendChild(tabSoftwares);
    tabsWrap.appendChild(tabPatentes);
    fragment.appendChild(tabsWrap);

    // Conteúdo da Aba Ativa
    const contentWrap = document.createElement('div');
    contentWrap.className = 'open-source-content';

    if (state.openSourceTab === 'softwares') {
      renderSoftwaresGrid(contentWrap);
    } else {
      renderPatentesGrid(contentWrap);
    }

    fragment.appendChild(contentWrap);
    container.replaceChildren(fragment);
  }

  function renderSoftwaresGrid(wrapper) {
    if (!state.softwares) return;
    const grid = document.createElement('div');
    grid.className = 'softwares-grid';

    state.softwares.forEach((sw, idx) => {
      const card = document.createElement('article');
      card.className = 'software-card';
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String(idx * 60));

      const header = document.createElement('div');
      header.className = 'software-card-header';

      const langBadge = document.createElement('span');
      langBadge.className = 'badge-meta badge-lang';
      langBadge.textContent = sw.linguagem;
      header.appendChild(langBadge);

      if (sw.estrelas && sw.estrelas > 0) {
        const starBadge = document.createElement('span');
        starBadge.className = 'badge-meta badge-stars';
        starBadge.innerHTML = `<i class="bx bxs-star"></i> ${sw.estrelas}`;
        header.appendChild(starBadge);
      }

      card.appendChild(header);

      const title = document.createElement('h3');
      title.className = 'software-title';
      title.textContent = sw.nome;
      card.appendChild(title);

      const desc = document.createElement('p');
      desc.className = 'software-desc';
      desc.textContent = sw.descricao;
      card.appendChild(desc);

      // Tópicos / Tags
      if (Array.isArray(sw.topicos) && sw.topicos.length > 0) {
        const tagsWrap = document.createElement('div');
        tagsWrap.className = 'software-tags';
        sw.topicos.forEach((tag) => {
          const tSpan = document.createElement('span');
          tSpan.className = 'software-tag-item';
          tSpan.textContent = `#${tag}`;
          tagsWrap.appendChild(tSpan);
        });
        card.appendChild(tagsWrap);
      }

      // Link para Repositório
      if (sw.repo && isSafeUrl(sw.repo)) {
        const repoLink = document.createElement('a');
        repoLink.href = sw.repo;
        repoLink.target = '_blank';
        repoLink.rel = 'noopener noreferrer';
        repoLink.className = 'software-repo-btn';
        repoLink.innerHTML = `<i class="bx bxl-github"></i> ${t('softwares.viewRepo', 'Ver no GitHub')}`;
        card.appendChild(repoLink);
      }

      grid.appendChild(card);
    });

    wrapper.replaceChildren(grid);
  }

  function renderPatentesGrid(wrapper) {
    if (!state.patentes) return;
    const grid = document.createElement('div');
    grid.className = 'patentes-grid';

    state.patentes.forEach((pat, idx) => {
      const card = document.createElement('article');
      card.className = 'patente-card';
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String(idx * 60));

      const header = document.createElement('div');
      header.className = 'patente-header';

      const typeBadge = document.createElement('span');
      typeBadge.className = 'badge-meta badge-patente-type';
      typeBadge.textContent = pat.tipo;
      header.appendChild(typeBadge);

      const statusBadge = document.createElement('span');
      const isGranted = (pat.status || '').toLowerCase().includes('concedido');
      statusBadge.className = `badge-meta ${isGranted ? 'badge-status-granted' : 'badge-status-pending'}`;
      statusBadge.innerHTML = `<i class="bx ${isGranted ? 'bx-check-double' : 'bx-time-five'}"></i> ${pat.status}`;
      header.appendChild(statusBadge);

      card.appendChild(header);

      const title = document.createElement('h3');
      title.className = 'patente-title';
      title.textContent = pat.titulo;
      card.appendChild(title);

      const metaRow = document.createElement('div');
      metaRow.className = 'patente-meta-row';
      metaRow.innerHTML = `
        <span class="patente-process"><strong>Processo:</strong> ${pat.processo}</span>
        <span class="patente-year"><strong>Ano:</strong> ${pat.ano}</span>
        <span class="patente-inst"><strong>Órgão:</strong> ${pat.instituicao}</span>
      `;
      card.appendChild(metaRow);

      const desc = document.createElement('p');
      desc.className = 'patente-desc';
      desc.textContent = pat.descricao;
      card.appendChild(desc);

      const invRow = document.createElement('div');
      invRow.className = 'patente-inventores';
      invRow.innerHTML = `<strong>Inventores:</strong> ${pat.inventores.join(', ')}`;
      card.appendChild(invRow);

      grid.appendChild(card);
    });

    wrapper.replaceChildren(grid);
  }

  /* ==============================================================
     4. RENDERIZADOR: NOTÍCIAS COM MODAL ACESSÍVEL
     ============================================================== */
  function renderNoticias() {
    const container = document.getElementById('noticias-container');
    if (!container || !state.noticias) return;

    const data = state.noticias;
    const fragment = document.createDocumentFragment();

    const grid = document.createElement('div');
    grid.className = 'noticias-grid';

    data.forEach((item, idx) => {
      const card = document.createElement('article');
      card.className = 'noticia-card';
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String(idx * 70));

      if (item.imagem && isSafeUrl(item.imagem)) {
        const imgWrap = document.createElement('div');
        imgWrap.className = 'noticia-img-wrap';
        const img = document.createElement('img');
        img.src = item.imagem;
        img.alt = item.titulo;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.className = 'noticia-img';
        imgWrap.appendChild(img);
        card.appendChild(imgWrap);
      }

      const body = document.createElement('div');
      body.className = 'noticia-body';

      const meta = document.createElement('div');
      meta.className = 'noticia-meta';

      const cat = document.createElement('span');
      cat.className = 'badge-meta badge-noticia-cat';
      cat.textContent = item.categoria;
      meta.appendChild(cat);

      const dateSpan = document.createElement('span');
      dateSpan.className = 'noticia-date';
      dateSpan.innerHTML = `<i class="bx bx-calendar"></i> ${item.data}`;
      meta.appendChild(dateSpan);

      body.appendChild(meta);

      const title = document.createElement('h3');
      title.className = 'noticia-title';
      title.textContent = item.titulo;
      body.appendChild(title);

      const resumo = document.createElement('p');
      resumo.className = 'noticia-resumo';
      resumo.textContent = item.resumo;
      body.appendChild(resumo);

      const readMoreBtn = document.createElement('button');
      readMoreBtn.type = 'button';
      readMoreBtn.className = 'btn-noticia-read';
      readMoreBtn.innerHTML = `${t('noticias.readMore', 'Ler notícia completa')} <i class="bx bx-right-arrow-alt"></i>`;

      readMoreBtn.addEventListener('click', () => {
        openNoticiaModal(item);
      });

      body.appendChild(readMoreBtn);
      card.appendChild(body);
      grid.appendChild(card);
    });

    fragment.appendChild(grid);
    container.replaceChildren(fragment);
  }

  function openNoticiaModal(item) {
    let modal = document.getElementById('noticias-modal');
    if (!modal) {
      modal = document.createElement('dialog');
      modal.id = 'noticias-modal';
      modal.className = 'laps-dialog-modal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog-content">
        <button type="button" class="modal-close-btn" id="modal-noticia-close" aria-label="Fechar notícia">
          <i class="bx bx-x"></i>
        </button>
        ${item.imagem ? `<div class="modal-hero-img"><img src="${item.imagem}" alt="${item.titulo}" class="img-fluid" /></div>` : ''}
        <div class="modal-body-padding">
          <div class="modal-meta-row">
            <span class="badge-meta badge-noticia-cat">${item.categoria}</span>
            <span class="noticia-date"><i class="bx bx-calendar"></i> ${item.data}</span>
          </div>
          <h2 class="modal-title">${item.titulo}</h2>
          <div class="modal-prose-content">
            <p>${item.conteudo}</p>
          </div>
          ${item.link && isSafeUrl(item.link) ? `
            <div class="modal-footer-action mt-4">
              <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="btn-laps-primary">
                ${t('noticias.officialLink', 'Acessar Link Oficial')} <i class="bx bx-link-external"></i>
              </a>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', 'true');
    }

    const closeBtn = document.getElementById('modal-noticia-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (typeof modal.close === 'function') {
          modal.close();
        } else {
          modal.removeAttribute('open');
        }
      });
    }

    // Fechar ao clicar no backdrop
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
      }
    });
  }

  /* ==============================================================
     5. RENDERIZADOR: CURSOS & OFICINAS
     ============================================================== */
  function renderCursos() {
    const container = document.getElementById('cursos-container');
    if (!container || !state.cursos) return;

    const data = state.cursos;
    const fragment = document.createDocumentFragment();

    const grid = document.createElement('div');
    grid.className = 'cursos-grid';

    data.forEach((c, idx) => {
      const card = document.createElement('article');
      card.className = 'curso-card';
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String(idx * 70));

      const header = document.createElement('div');
      header.className = 'curso-card-header';

      const levelBadge = document.createElement('span');
      levelBadge.className = 'badge-meta badge-curso-level';
      levelBadge.textContent = c.nivel;
      header.appendChild(levelBadge);

      const hoursBadge = document.createElement('span');
      hoursBadge.className = 'badge-meta badge-curso-hours';
      hoursBadge.innerHTML = `<i class="bx bx-time"></i> ${c.cargaHoraria}`;
      header.appendChild(hoursBadge);

      card.appendChild(header);

      const title = document.createElement('h3');
      title.className = 'curso-title';
      title.textContent = c.titulo;
      card.appendChild(title);

      const modRow = document.createElement('div');
      modRow.className = 'curso-modalidade-row';
      modRow.innerHTML = `<i class="bx bx-map-pin"></i> <span>${c.modalidade}</span>`;
      card.appendChild(modRow);

      const desc = document.createElement('p');
      desc.className = 'curso-desc';
      desc.textContent = c.descricao;
      card.appendChild(desc);

      // Instrutores
      const instWrap = document.createElement('div');
      instWrap.className = 'curso-instrutores';
      instWrap.innerHTML = `<strong>${t('cursos.instructorsLabel', 'Instrutores:')}</strong> ${c.instrutores.join(', ')}`;
      card.appendChild(instWrap);

      // Tópicos
      if (Array.isArray(c.topicos)) {
        const topWrap = document.createElement('div');
        topWrap.className = 'curso-topics-pills';
        c.topicos.forEach((tp) => {
          const pill = document.createElement('span');
          pill.className = 'curso-topic-pill';
          pill.textContent = tp;
          topWrap.appendChild(pill);
        });
        card.appendChild(topWrap);
      }

      // Link / Inscrição
      if (c.link && isSafeUrl(c.link)) {
        const linkBtn = document.createElement('a');
        linkBtn.href = c.link;
        linkBtn.target = '_blank';
        linkBtn.rel = 'noopener noreferrer';
        linkBtn.className = 'btn-laps-primary curso-action-btn';
        linkBtn.innerHTML = `${t('cursos.moreInfo', 'Saiba Mais & Material')} <i class="bx bx-right-arrow-alt"></i>`;
        card.appendChild(linkBtn);
      }

      grid.appendChild(card);
    });

    fragment.appendChild(grid);
    container.replaceChildren(fragment);
  }

  /* ==============================================================
     6. RENDERIZADOR: PROJETOS DE P&D
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

      const pKey = `p${idx + 1}`;
      const titleText = t(`projects.titles.${pKey}`, proj.titulo);

      const title = document.createElement('h3');
      title.className = 'project-title';
      title.textContent = titleText;
      body.appendChild(title);

      const badges = document.createElement('div');
      badges.className = 'project-meta-badges';

      const badgePeriod = document.createElement('span');
      badgePeriod.className = 'badge-meta badge-period';
      const iconCal = document.createElement('i');
      iconCal.className = 'bx bx-calendar';
      badgePeriod.appendChild(iconCal);
      const spanPeriod = document.createElement('span');
      spanPeriod.textContent = ` ${proj.periodo}`;
      badgePeriod.appendChild(spanPeriod);
      badges.appendChild(badgePeriod);

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

    if (typeof window.$ !== 'undefined' && typeof window.$.fn.venobox !== 'undefined') {
      window.$('.venobox').venobox();
    }
  }

  /* ==============================================================
     7. RENDERIZADOR: PRODUÇÃO CIENTÍFICA (HUB INTELIGENTE)
     ============================================================== */
  function renderProducao() {
    const container = document.getElementById('producao-container');
    if (!container || !state.producao) return;

    const fragment = document.createDocumentFragment();

    const controlsWrap = document.createElement('div');
    controlsWrap.className = 'publications-controls-bar';

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

      const availableSlots = state.visibleCount - currentRendered;
      const worksToRender = group.trabalhos.slice(0, availableSlots);

      if (worksToRender.length > 0) {
        const yearBadge = document.createElement('div');
        yearBadge.className = 'timeline-year-badge-v2';
        const yearSpan = document.createElement('span');
        yearSpan.textContent = group.ano;
        yearBadge.appendChild(yearSpan);
        timelineContainer.appendChild(yearBadge);

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

          const actionsBar = document.createElement('div');
          actionsBar.className = 'pub-actions-bar';

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
            } catch (_) {}

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
    renderDatasets();
    renderOpenSourceAndPatentes();
    renderNoticias();
    renderCursos();
  };

  /**
   * Inicialização
   */
  async function init() {
    state.langDict = await loadJSON(DATA_PATHS.lang);

    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get('lang');
    const savedLang = localStorage.getItem('laps-language');
    const initialLang = langParam || savedLang || 'pt';
    state.currentLang = ['pt', 'en', 'de', 'fr'].includes(initialLang) ? initialLang : 'pt';

    // Carregar todas as 8 fontes de dados simultaneamente
    const [
      integrantesData,
      projetosData,
      producaoData,
      softwaresData,
      patentesData,
      datasetsData,
      noticiasData,
      cursosData
    ] = await Promise.all([
      loadJSON(DATA_PATHS.integrantes),
      loadJSON(DATA_PATHS.projetos),
      loadJSON(DATA_PATHS.producao),
      loadJSON(DATA_PATHS.softwares),
      loadJSON(DATA_PATHS.patentes),
      loadJSON(DATA_PATHS.datasets),
      loadJSON(DATA_PATHS.noticias),
      loadJSON(DATA_PATHS.cursos)
    ]);

    state.integrantes = integrantesData;
    state.projetos = projetosData;
    state.producao = producaoData;
    state.softwares = softwaresData;
    state.patentes = patentesData;
    state.datasets = datasetsData;
    state.noticias = noticiasData;
    state.cursos = cursosData;

    renderIntegrantes();
    renderProjetos();
    renderProducao();
    renderDatasets();
    renderOpenSourceAndPatentes();
    renderNoticias();
    renderCursos();

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
