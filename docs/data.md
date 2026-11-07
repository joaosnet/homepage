# Gestão de Dados Dinâmicos — LaPS

Instruções para manutenção, preenchimento e sincronização dos dados acadêmicos e institucionais do **Laboratório de Processamento de Sinais (LaPS / UFPA)** seguindo o padrão de excelência científica e transparência ativa do **LASSE**.

---

## 1. Estrutura dos Arquivos de Dados

Todos os dados dinâmicos da plataforma estão centralizados em `data/`:

| Arquivo | Descrição |
| :--- | :--- |
| `data/integrantes.json` | Corpo docente, doutorandos, mestrandos, graduandos/IC e egressos |
| `data/projetos.json` | Projetos de pesquisa, parcerias hospitalares/industriais e agências de fomento |
| `data/producao.json` | Produção científica indexada por ano com DOIs e citações BibTeX |
| `data/softwares.json` | Softwares e ferramentas open source da organização LAPSHub |
| `data/patentes.json` | Patentes de invenção e registros de programas de computador no INPI |
| `data/datasets.json` | Bancos de sinais e datasets abertos para ciência reprodutível |
| `data/noticias.json` | Notícias, editais e acontecimentos do laboratório com leitor modal |
| `data/cursos.json` | Treinamentos, workshops e oficinas oferecidos pelo LaPS |

---

## 2. Esquemas e Exemplos de Preenchimento

### 2.1 Integrantes (`data/integrantes.json`)

Contém as categorias: `professores`, `doutorandos`, `mestrandos`, `graduandos`, `egressos` e a lista agregada `alunos`.

```json
{
  "professores": [
    {
      "id": "prof-ronaldo-zampolo",
      "nome": "Ronaldo de Freitas Zampolo",
      "categoria": "professor",
      "titulacao": "Professor Associado",
      "foto": "assets/img/zampolo.png",
      "lattes": "http://lattes.cnpq.br/9088524620828017",
      "email": "zampolo@ufpa.br",
      "orcid": "https://orcid.org/0000-0002-2460-3135",
      "scholar": "https://scholar.google.com.br/citations?user=4nf5cfoAAAAJ",
      "bio": "Trajetória acadêmica...",
      "linhasPesquisa": "Processamento de imagem. Visão computacional."
    }
  ],
  "doutorandos": [
    {
      "id": "disc-charles-silveira",
      "nome": "Charles Silveira",
      "categoria": "doutorado",
      "programa": "PPGEE / UFPA",
      "orientador": "Ronaldo de Freitas Zampolo",
      "linhasPesquisa": "Visão Computacional e Deep Learning.",
      "projeto": "Visão computacional baseada em aprendizado profundo",
      "foto": "https://avatars.githubusercontent.com/u/142239215?v=4",
      "github": "https://github.com/GS-Kusanagi95",
      "lattes": "http://lattes.cnpq.br/209557465",
      "email": "charles.silveira@itec.ufpa.br"
    }
  ]
}
```

> **Fallback de Avatar SVG**: Se um discente não possuir foto ou a imagem falhar ao carregar, o sistema gera dinamicamente um avatar SVG vetorial elegante com suas iniciais e gradiente óptico.

### 2.2 Datasets Científicos (`data/datasets.json`)

```json
[
  {
    "id": "ds-eeg-neurofeedback",
    "titulo": "LaPS-EEG: Banco de Sinais Eletroencefalográficos Multicanal",
    "categoria": "Sinais Biomédicos",
    "formato": "EDF / CSV / HDF5",
    "amostras": "64 canais, 1000 Hz, 48 participantes",
    "licenca": "CC BY-NC 4.0",
    "descricao": "Sinais brutos e pré-filtrados de eletroencefalografia coletados em voluntários...",
    "link": "https://github.com/LAPSHub/dmovel-site",
    "ano": 2024
  }
]
```

### 2.3 Softwares Open Source (`data/softwares.json`)

```json
[
  {
    "id": "sw-dmovel-mobile",
    "nome": "DMóvel Mobile",
    "linguagem": "Dart / Flutter",
    "repo": "https://github.com/LAPSHub/dmovel-mobile",
    "descricao": "Aplicativo multiplataforma para testes clínicos e avaliação psicofísica visual.",
    "estrelas": 3,
    "topicos": ["flutter", "dart", "eye-tracking", "assistive-technology"]
  }
]
```

### 2.4 Patentes e Registros INPI (`data/patentes.json`)

```json
[
  {
    "id": "pat-dmovel-registro",
    "tipo": "Registro de Programa de Computador",
    "titulo": "DMóvel: Plataforma Computacional Portátil para Avaliação Psicofísica Visual",
    "processo": "BR512024001892-0",
    "ano": 2024,
    "instituicao": "INPI / UFPA",
    "inventores": ["Ronaldo de Freitas Zampolo", "Ana Carolina Q. Siravenha", "João Natividade Silva Neto"],
    "status": "Concedido",
    "descricao": "Software embarcado para tablets e smartphones..."
  }
]
```

---

## 3. Sincronização Automática via ORCID (`scripts/sync-data.py`)

O script `scripts/sync-data.py` consulta a API pública do ORCID v3.0 e Crossref para atualizar `producao.json` sem duplicar registros existentes.

```bash
# Validar JSONs de dados:
python scripts/sync-data.py --check-only

# Simulação da busca de novos artigos:
python scripts/sync-data.py --dry-run

# Executar a sincronização:
python scripts/sync-data.py
```
