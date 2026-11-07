# Arquitetura Técnica — LaPS Homepage (v3.0 LASSE Standard)

Documento técnico sobre a arquitetura do portal institucional do **Laboratório de Processamento de Sinais (LaPS)** da Universidade Federal do Pará (UFPA), incorporando os módulos de excelência acadêmica inspirados no **LASSE**.

---

## 1. Visão Geral da Arquitetura

O portal combina alta velocidade de carregamento estático com componentes dinâmicos interativos, acessibilidade WCAG AAA, motor i18n nativo reativo em 4 idiomas (PT, EN, DE, FR) e visualizador de rede de colaboração em tempo real via HTML5 Canvas.

```
homepage/
├── index.html              # Estrutura semântica, acessibilidade e SEO
├── robots.txt              # Regras de rastreamento de buscadores
├── sitemap.xml             # Mapeamento canônico para indexação
├── deploy.py               # Motor de deploy institucional para a UFPA
├── data/                   # Fontes de dados dinâmicas (JSON)
│   ├── integrantes.json    # Docentes, doutorandos, mestrandos, graduandos e egressos
│   ├── projetos.json       # Projetos de pesquisa, parceiros e fomentos
│   ├── producao.json       # Publicações científicas por ano
│   ├── softwares.json      # Repositórios e ferramentas abertas LAPSHub
│   ├── patentes.json       # Patentes de invenção e registros INPI
│   ├── datasets.json       # Bancos de dados e sinais biomédicos abertos
│   ├── noticias.json       # Comunicados e notícias com modal dialog
│   └── cursos.json         # Treinamentos e oficinas técnicas
├── docs/                   # Documentação modular
│   ├── architecture.md     # Este documento
│   ├── deploy.md           # Manual de deploy e conectividade CTIC/UFPA
│   └── data.md             # Guia de atualização e schemas dos dados
├── assets/
│   ├── css/
│   │   └── style.css       # Design System, modo escuro e responsividade fluida
│   ├── js/
│   │   ├── main.js         # Controlador global, tema 3-state, a11y e locale
│   │   ├── signal-hero.js  # Canvas interativo de ondas e espectro de Fourier
│   │   ├── data-loader.js  # Renderizador reativo, grafo 2D e modais
│   │   └── lang.json       # Dicionário de traduções (16 seções x 4 idiomas)
│   └── img/                # Imagens, og-preview.png e demo.gif animado
└── scripts/                # Suíte de automação, gravação e testes
    ├── sync-data.py        # Coleta via ORCID v3.0 / Crossref
    ├── test-suite.mjs      # Suíte de testes automatizados (137 assertions)
    ├── verify-playwright.mjs # Verificação E2E via Playwright (33 assertions)
    ├── record-demo.mjs     # Gravação de demo.gif (< 3.2 MB)
    └── generate-og-preview.mjs # Geração de card social (1200x630)
```

---

## 2. Componentes e Inovações Técnicas

### 2.1 Grafo de Colaboração Científica (Canvas Force-Directed)
- Implementado em JavaScript puro em `data-loader.js` dentro do elemento `<canvas id="team-network-canvas">`.
- Modela nós temáticos centrais (*Visão & IA*, *Sinais & Neuro*, *Telecom 5G/6G*) e conecta docentes e discentes com base em relações de orientação e palavras-chave de projetos.
- Suporta arrasto de nós, zoom in/out/reset e card flutuante de tooltip ao passar o mouse.
- Alta taxa de quadros (60 FPS) via `requestAnimationFrame` com física de molas (Hooke) e repulsão (Coulomb).

### 2.2 Sistema de Acessibilidade & Preferências
- **Detecção Inteligente de Idioma**: Inicia com o idioma do navegador (`navigator.languages`), respeitando parâmetros de URL (`?lang=`) e preferências salvas (`laps-language-user`).
- **Tema 3-State**: Ciclo `Sistema (Auto)` ➔ `Escuro` ➔ `Claro`. No modo Sistema, um listener `matchMedia('(prefers-color-scheme: dark)')` atualiza o tema dinamicamente quando o usuário altera as configurações do seu dispositivo.
- **Escala de Tipografia**: Botões `A-`, `A0` (redefinição para 100%) e `A+` com CSS variables (`--laps-font-scale`).
- **Leitores de Tela**: Região viva `<div id="a11y-announcer" aria-live="polite">` anunciando alterações de estado e filtros.

### 2.3 Integração com Redes Sociais e LASSE
- **Instagram Oficial**: Links diretos com microinterações no Header, Seção de Contato (`@laps_ufpa`), Rodapé e Schema.org `sameAs`.
- **Módulos de Transparência Ativa**: Datasets com botão de cópia de citação rápida, patentes com números de processo INPI e catálogo de softwares open source do GitHub (`LAPSHub`).
