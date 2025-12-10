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
     * Renderiza a seção de Projetos
     * @param {Object} data - Dados dos projetos
     */
    function renderProjetos(data) {
        const container = document.getElementById('projetos-container');
        if (!container || !data) return;

        let html = '<div class="row portfolio-container">';

        data.projetos.forEach((projeto, index) => {
            html += `
        <div class="col-lg-12 col-md-12 portfolio-item" data-aos="fade-up" data-aos-delay="${index * 100}">
          <h3>${projeto.titulo}</h3>
          <p>
            <ul>
              <li><strong>Período:</strong> ${projeto.periodo}</li>
              ${projeto.parceiro ? `<li><strong>Parceiro:</strong> ${projeto.parceiro}</li>` : ''}
              <li><strong>Financiador:</strong> ${projeto.financiador}</li>
            </ul>
          </p>
          <div class="portfolio-wrap">
            <div class="portfolio-info">
              <h4>CLIQUE NO ÍCONE PARA AMPLIAR A IMAGEM</h4>
            </div>
            <div class="portfolio-links">
              <a href="${projeto.imagem}" data-gall="portfolioGallery" class="venobox" title="${projeto.titulo}">
                <i class="bx bxs-image"></i>
              </a>
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
     * Renderiza a seção de Produção com Timeline Alternante
     * @param {Object} data - Dados das produções
     */
    function renderProducao(data) {
        const container = document.getElementById('producao-container');
        if (!container || !data) return;

        let html = '<div class="timeline">';

        data.producoes.forEach((producao, index) => {
            const isLeft = index % 2 === 0;
            const position = isLeft ? 'left' : 'right';

            html += `
        <div class="timeline-item ${position}" data-aos="fade-${isLeft ? 'right' : 'left'}" data-aos-delay="${index * 100}">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <h3 class="timeline-year">${producao.ano}</h3>
            <div class="timeline-works">
              ${producao.trabalhos.map(trabalho => `<p>${trabalho}</p>`).join('')}
            </div>
          </div>
        </div>
      `;
        });

        html += '</div>';
        container.innerHTML = html;
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
