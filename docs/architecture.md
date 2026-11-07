# Arquitetura Técnica — LaPS Homepage

Documento técnico sobre a arquitetura do portal institucional do **Laboratório de Processamento de Sinais (LaPS)** da Universidade Federal do Pará (UFPA).

---

## 1. Visão Geral

O site do LaPS combina a leveza e velocidade de uma página estática (HTML5, CSS3, JavaScript puro e jQuery) com o dinamismo de dados desacoplados em formato JSON. O objetivo é permitir que membros do laboratório mantenham informações de docentes, projetos e produções científicas atualizadas sem alterar código-fonte HTML.

```
homepage/
├── index.html              # Estrutura principal e metadados SEO
├── robots.txt              # Regras de rastreamento de buscadores
├── sitemap.xml             # Mapeamento canônico para indexação
├── deploy.py               # Motor de deploy institucional para a UFPA
├── data/                   # Bases de dados dinâmicas (JSON)
│   ├── integrantes.json    # Docentes, alunos e links (ORCID, Lattes, Scholar)
│   ├── projetos.json       # Projetos de pesquisa, parceiros e fomentos
│   └── producao.json       # Publicações científicas por ano
├── docs/                   # Documentação modular
│   ├── architecture.md     # Este documento
│   ├── deploy.md           # Manual de deploy e conectividade CTIC/UFPA
│   └── data.md             # Guia de atualização e schemas dos dados
├── assets/
│   ├── css/
│   │   └── style.css       # Estilos visuais, micro-interações táteis e responsividade
│   ├── js/
│   │   ├── main.js         # Comportamento interativo da interface
│   │   └── data-loader.js  # Carregador assíncrono dos JSONs
│   └── img/                # Imagens, banner og-preview.png e demo.gif
└── scripts/                # Suíte de automação, gravação e testes
    ├── sync-data.py        # Camada 1: Coleta via ORCID v3.0 / Crossref
    ├── test-suite.mjs      # Suíte de testes automatizados
    ├── scan-secrets.mjs    # Varredura de credenciais
    ├── audit-workflows.mjs # Auditoria de workflows GitHub Actions
    ├── generate-og-preview.mjs # Geração de card social (1200x630)
    └── record-demo.mjs     # Gravação de vídeo/GIF com Playwright e ffmpeg
```

---

## 2. Ciclo de Vida do Carregamento Dinâmico (`data-loader.js`)

Ao carregar o DOM:
1. `init()` dispara chamadas assíncronas paralelas via `fetch()` para os arquivos em `data/*.json`.
2. `renderIntegrantes()`: Constrói os cards dos professores com links para ORCID, Lattes, Google Scholar e e-mail institucional.
3. `renderProjetos()`: Monta os cards de projetos com imagens em lightbox (`venobox`), badges de período, parceiros e agência de fomento.
4. `renderProducao()`: Constrói a linha do tempo vertical de artigos científicos:
   - Exibe inicialmente os primeiros 6 trabalhos.
   - Oculta anos e trabalhos subsequentes sem deixar marcadores de ano vazios.
   - O botão comutador alterna entre *"Ver mais produções"* e *"Ver menos produções"* mantendo o foco acessível e atualizando o atributo `aria-expanded`.
5. `AOS.refresh()`: Atualiza as animações de entrada de elementos após a injeção do HTML no DOM.

---

## 3. Automação em Duas Camadas

A infraestrutura de automação separa a obtenção de dados da publicação no servidor de produção:

| Camada | Função | Gatilho | Ferramentas |
| :--- | :--- | :--- | :--- |
| **Camada 1** | Coleta produções científicas via ORCID v3.0 e Crossref, validando schemas | Cron semanal ou manual | `scripts/sync-data.py`, `sync-data.yml` |
| **Camada 2** | Conexão VPN CTIC e publicação FTPS no host `laps.ufpa.br` | Push na `master` ou manual | `deploy.py`, `deploy.yml`, strongSwan/FTPS |

---

## 4. Otimização de Busca e Metadados (SEO)

- **URL Canônica**: `https://laps.ufpa.br/`.
- **Hreflang**: Suporte a `pt`, `pt-BR`, `en`, `de`, `fr` e `x-default`.
- **Open Graph & Twitter Cards**: Prévia social padronizada em 1200 × 630 px com `assets/img/og-preview.png`.
- **Dados Estruturados**: Schema.org em formato JSON-LD descrevendo o LaPS como `ResearchOrganization` associado à `Universidade Federal do Pará (UFPA)`.
