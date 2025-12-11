/**
 * LaPS Data Loader
 * Script para carregar dinamicamente integrantes, projetos e produção
 * a partir de arquivos JSON
 */

(function () {
  'use strict';

  // Configuração dos caminhos dos arquivos JSON
  const DATA_PATHS = {
    integrantes: 'data/integrantes.json',
    projetos: 'data/projetos.json',
    producao: 'data/producao.json'
  };

  /**
   * Carrega um arquivo JSON
   * @param {string} path - Caminho do arquivo
   * @returns {Promise<Object>} Dados do JSON
   */
  async function loadJSON(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Erro ao carregar ${path}:`, error);
      return null;
    }
  }

  /**
   * Renderiza a seção de Integrantes
   * @param {Object} data - Dados dos integrantes
   */
  function renderIntegrantes(data) {
    const container = document.getElementById('integrantes-container');
    if (!container || !data) return;

    let html = '';

    // Renderizar professores
    data.professores.forEach((prof, index) => {
      html += `
        <div class="testimonial-item" style="padding-top: 30px; margin: 30px 20px 20px 20px;" data-aos="fade-up" data-aos-delay="${index * 100}">
          <img src="${prof.foto}" class="testimonial-img" alt="${prof.nome}" />
          <h3>${prof.nome}</h3>
          <h5>
            ${prof.lattes ? `<a title="CURRÍCULO LATTES" href="${prof.lattes}" target="_blank"><i style="margin-left: 5px;"><img style="width: 20px;" src="assets/img/icons/icon_lattes.png"></i></a>` : ''}
            ${prof.email ? `<a title="E-MAIL" href="mailto:${prof.email}?Subject=Contato%20via%20site" target="_blank"><i style="margin-left: 5px;"><img src="assets/img/icons/email.png"></i></a>` : ''}
            ${prof.orcid ? `<a title="ORCID" href="${prof.orcid}" target="_blank"><i style="margin-left: 5px;"><img style="width: 20px;" src="assets/img/icons/icon_orcid.png"></i></a>` : ''}
            ${prof.scholar ? `<a title="Google Scholar" href="${prof.scholar}" target="_blank"><i style="margin-left: 5px;"><img style="width: 20px;" src="assets/img/icons/Google_Scholar_logo.png"></i></a>` : ''}
          </h5>
          <p style="text-align: justify;">
            ${prof.bio}
            <br><br>
            <strong>Linhas de pesquisa:</strong> ${prof.linhasPesquisa}
          </p>
        </div>
      `;
    });

    // Renderizar alunos (se houver)
    if (data.alunos && data.alunos.length > 0) {
      html += '<h3 class="mt-5 mb-4 text-center">Alunos</h3>';
      html += '<div class="row">';
      data.alunos.forEach((aluno, index) => {
        html += `
          <div class="col-lg-4 col-md-6 mb-4" data-aos="fade-up" data-aos-delay="${index * 100}">
            <div class="testimonial-item" style="padding: 20px;">
              <img src="${aluno.foto}" class="testimonial-img" alt="${aluno.nome}" />
              <h4>${aluno.nome}</h4>
              <p><strong>${aluno.tipo}</strong></p>
              ${aluno.orientador ? `<p><em>Orientador: ${aluno.orientador}</em></p>` : ''}
            </div>
          </div>
        `;
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  /**
   * Renderiza a seção de Projetos com cards modernos
   * @param {Object} data - Dados dos projetos
   */
  function renderProjetos(data) {
    const container = document.getElementById('projetos-container');
    if (!container || !data) return;

    let html = '<div class="row">';

    data.projetos.forEach((projeto, index) => {
      html += `
        <div class="col-lg-6 col-md-6 mb-4" data-aos="fade-up" data-aos-delay="${index * 100}">
          <div class="project-card">
            ${projeto.imagem ? `
            <div class="project-image">
              <a href="${projeto.imagem}" data-gall="portfolioGallery" class="venobox">
                <img src="${projeto.imagem}" alt="${projeto.titulo}" />
                <div class="project-overlay">
                  <i class="bx bx-zoom-in"></i>
                </div>
              </a>
            </div>
            ` : ''}
            <div class="project-content">
              <h4>${projeto.titulo}</h4>
              <div class="project-info">
                <span class="project-badge periodo"><i class="bx bx-calendar"></i> ${projeto.periodo}</span>
                ${projeto.parceiro ? `<span class="project-badge parceiro"><i class="bx bx-group"></i> ${projeto.parceiro}</span>` : ''}
                <span class="project-badge financiador"><i class="bx bx-money"></i> ${projeto.financiador}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Reinicializar venobox para os novos elementos
    if (typeof $.fn.venobox !== 'undefined') {
      $('.venobox').venobox();
    }
  }

  /**
   * Renderiza a seção de Produção com Timeline de pontos individuais
   * @param {Object} data - Dados das produções
   */
  function renderProducao(data) {
    const container = document.getElementById('producao-container');
    if (!container || !data) return;

    const ITEMS_PER_PAGE = 6;
    let allItems = [];
    let itemIndex = 0;

    data.producoes.forEach((producao) => {
      allItems.push({ type: 'year', ano: producao.ano });
      producao.trabalhos.forEach((trabalho) => {
        allItems.push({ type: 'trabalho', trabalho, index: itemIndex });
        itemIndex++;
      });
    });

    let html = '<div class="timeline-production">';
    let visibleCount = 0;

    allItems.forEach((item) => {
      const isHidden = visibleCount >= ITEMS_PER_PAGE && item.type === 'trabalho';
      const hiddenClass = isHidden ? 'timeline-hidden' : '';

      if (item.type === 'year') {
        html += `
          <div class="timeline-year-badge ${hiddenClass}" data-aos="zoom-in">
            <span>${item.ano}</span>
          </div>
        `;
      } else {
        const isLeft = item.index % 2 === 0;
        const position = isLeft ? 'left' : 'right';

        html += `
          <div class="timeline-point ${position} ${hiddenClass}" data-aos="fade-${isLeft ? 'right' : 'left'}">
            <div class="timeline-dot"></div>
            <div class="timeline-card">
              <p>${item.trabalho}</p>
            </div>
          </div>
        `;
        visibleCount++;
      }
    });

    html += '</div>';

    if (allItems.filter(i => i.type === 'trabalho').length > ITEMS_PER_PAGE) {
      html += `
        <div class="text-center mt-4">
          <button class="btn-ver-mais" id="btn-ver-mais-producao">
            <i class="bx bx-chevron-down"></i> Ver mais produções
          </button>
        </div>
      `;
    }

    container.innerHTML = html;

    const btn = document.getElementById('btn-ver-mais-producao');
    if (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.timeline-hidden').forEach(item => item.classList.remove('timeline-hidden'));
        this.style.display = 'none';
        if (typeof AOS !== 'undefined') AOS.refresh();
      });
    }
  }



  /**
   * Inicializa o carregamento de dados
   */
  async function init() {
    // Carregar e renderizar integrantes
    const integrantesData = await loadJSON(DATA_PATHS.integrantes);
    if (integrantesData) {
      renderIntegrantes(integrantesData);
    }

    // Carregar e renderizar projetos
    const projetosData = await loadJSON(DATA_PATHS.projetos);
    if (projetosData) {
      renderProjetos(projetosData);
    }

    // Carregar e renderizar produção
    const producaoData = await loadJSON(DATA_PATHS.producao);
    if (producaoData) {
      renderProducao(producaoData);
    }

    // Reinicializar AOS para os novos elementos
    if (typeof AOS !== 'undefined') {
      AOS.refresh();
    }
  }

  // Iniciar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
