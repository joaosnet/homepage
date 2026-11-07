# LaPS — Laboratório de Processamento de Sinais

🌐 **[Português](README.md)** • **[English](README.en.md)** • **[Deutsch](README.de.md)** • **[Français](README.fr.md)**

---

[![CI](https://github.com/LAPSHub/homepage/actions/workflows/ci.yml/badge.svg)](https://github.com/LAPSHub/homepage/actions/workflows/ci.yml)
[![Deploy](https://github.com/LAPSHub/homepage/actions/workflows/deploy.yml/badge.svg)](https://github.com/LAPSHub/homepage/actions/workflows/deploy.yml)
[![Site Oficial](https://img.shields.io/badge/Site-laps.ufpa.br-blue.svg)](https://laps.ufpa.br/)
[![Python: 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/)
[![Idiomas: PT | EN | DE | FR](https://img.shields.io/badge/idiomas-PT%20%7C%20EN%20%7C%20DE%20%7C%20FR-green.svg)](#)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-green.svg)](LICENSE)

Portal institucional oficial do **Laboratório de Processamento de Sinais (LaPS)**, vinculado ao Instituto de Tecnologia (ITEC) e à Faculdade de Engenharia da Computação e Telecomunicações da **Universidade Federal do Pará (UFPA)**. O laboratório atua em inteligência artificial, processamento digital de sinais e imagens, visão computacional, bioengenharia e sistemas de comunicação.

Publicado oficialmente em [laps.ufpa.br](https://laps.ufpa.br/).

---

## 🎬 Demonstração do Site

![Demonstração interativa do site do LaPS](assets/img/demo.gif)

O site carrega integrantes, projetos e produções científicas dinamicamente a partir de arquivos JSON em `data/`, oferecendo visualização interativa em carrossel, cards modernos e linha do tempo expansível.

---

## ⚡ Início Rápido (Execução Local)

Execute um servidor local para testar a renderização assíncrona (`fetch`) dos dados JSON:

```bash
# Opção 1: Python 3
python -m http.server 8000

# Opção 2: Node.js (npx serve)
npx serve -l 8000

# Opção 3: uv
uv run python -m http.server 8000
```

Abra `http://localhost:8000` no seu navegador.

---

## 🏛️ Arquitetura e Dados Dinâmicos

Os dados do laboratório estão centralizados em arquivos JSON independentes do código HTML:

| Arquivo | Descrição | Como Atualizar |
| :--- | :--- | :--- |
| `data/integrantes.json` | Professores, alunos e links acadêmicos (ORCID, Lattes, Scholar) | Edição direta do JSON. Ver [docs/data.md](docs/data.md) |
| `data/projetos.json` | Título, período, parceiros, financiadores e imagens de projetos | Edição direta do JSON. Ver [docs/data.md](docs/data.md) |
| `data/producao.json` | Artigos científicos e publicações organizados por ano | Edição manual ou automática via `scripts/sync-data.py` |

---

## ⚙️ Automação em Duas Camadas

O repositório adota um fluxo desacoplado em duas camadas para manter o site e os dados sempre sincronizados:

```
[ORCID v3.0 / Crossref] ---> [Camada 1: sync-data.py] ---> [data/*.json]
                                                                 |
[laps.ufpa.br (CTIC)]   <--- [Camada 2: deploy.py]    <--- [GitHub master]
```

### Camada 1: Sincronização Acadêmica (`sync-data.py` / `sync-data.yml`)
- Consulta a API pública do ORCID v3.0 a partir dos identificadores dos docentes.
- Enriquece os metadados dos artigos novos via Crossref API gerando citações padronizadas.
- Mescla novos artigos em `data/producao.json` sem sobrescrever dados existentes.
- Executada semanalmente via GitHub Actions ou manualmente:
  ```bash
  python scripts/sync-data.py
  ```

### Camada 2: Publicação Institucional UFPA (`deploy.py` / `deploy.yml`)
- Conecta com o servidor `laps.ufpa.br` (`200.239.109.18`) via FTPS/FTP.
- Utiliza cache MD5 (`.ftp_sync_cache.json`) para transmitir apenas arquivos modificados.
- Suporta túnel VPN institucional CTIC (`vpn.dmz.ufpa.br`).
- Executa diagnóstico completo de conectividade:
  ```bash
  python deploy.py --test-network
  ```
- Publica atualizações com verificação pós-deploy:
  ```bash
  python deploy.py --step ftp --verify-live
  ```

---

## 🧪 Testes Automatizados e Segurança

Execute a suíte de integridade antes de enviar alterações:

```bash
# Suíte de testes (valida schemas JSON, imagens e SEO técnico):
node scripts/test-suite.mjs

# Varredura estrita de credenciais:
node scripts/scan-secrets.mjs

# Auditoria de segurança dos workflows do GitHub Actions:
node scripts/audit-workflows.mjs

# Validação rápida de sintaxe:
node --check assets/js/data-loader.js
python -m py_compile deploy.py scripts/sync-data.py
```

---

## 📚 Documentação Modular

Consulte os guias especializados na pasta `docs/`:

- 🏛️ **[Arquitetura do Sistema](docs/architecture.md)**: Detalhes do carregamento assíncrono, micro-interações táteis e acessibilidade.
- 🚀 **[Manual de Deploy e Conectividade](docs/deploy.md)**: Instruções de rede CTIC/UFPA, VPN e configuração de variáveis de ambiente.
- 📊 **[Guia de Dados Dinâmicos](docs/data.md)**: Schemas JSON e uso do script de sincronização com o ORCID.

---

## 📜 Licença e Créditos

Desenvolvido pelo **Laboratório de Processamento de Sinais (LaPS)** — Universidade Federal do Pará (UFPA).  
Base de interface adaptada do template Techie (Bootstrap 4.5) com melhorias de UI/UX, micro-interações táteis e automações de infraestrutura.
