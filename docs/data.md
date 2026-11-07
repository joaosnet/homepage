# Gestão de Dados Dinâmicos — LaPS

Instruções para manutenção, preenchimento e sincronização dos dados acadêmicos do laboratório.

---

## 1. Estrutura dos Arquivos

Os dados que alimentam a interface estão centralizados no diretório `data/`:

- `data/integrantes.json`: Professores e alunos
- `data/projetos.json`: Projetos de pesquisa e extensão
- `data/producao.json`: Publicações científicas organizadas por ano

---

## 2. Especificação dos Esquemas JSON

### 2.1 Integrantes (`data/integrantes.json`)

```json
{
  "professores": [
    {
      "nome": "Nome do Docente",
      "foto": "assets/img/foto.jpg",
      "lattes": "http://lattes.cnpq.br/1234567890123456",
      "email": "docente@ufpa.br",
      "orcid": "https://orcid.org/0000-0000-0000-0000",
      "scholar": "https://scholar.google.com/citations?user=ID",
      "bio": "Resumo da trajetória acadêmica...",
      "linhasPesquisa": "Áreas de atuação."
    }
  ],
  "alunos": [
    {
      "nome": "Nome do Aluno",
      "foto": "assets/img/aluno.jpg",
      "tipo": "Mestrado | Doutorado | Iniciação Científica",
      "orientador": "Nome do Orientador"
    }
  ]
}
```

> **Atenção**: As fotos devem ser salvas em `assets/img/` e possuir proporção aproximada de 1:1 (quadrada), peso inferior a 250 KB e formato JPG/PNG/WebP.

### 2.2 Projetos (`data/projetos.json`)

```json
{
  "projetos": [
    {
      "titulo": "Título do Projeto de Pesquisa",
      "periodo": "2024 - atual",
      "parceiro": "Instituições ou empresas parceiras",
      "financiador": "CNPq / CAPES / FAPESPA / UFPA",
      "imagem": "assets/img/projeto.png"
    }
  ]
}
```

### 2.3 Produção Científica (`data/producao.json`)

```json
{
  "producoes": [
    {
      "ano": 2024,
      "trabalhos": [
        "SOBRENOME, A. ; SOBRENOME, B. Título do Artigo. Periódico, v. 1, p. 1-10, 2024. DOI: 10.1000/xyz"
      ]
    }
  ]
}
```

---

## 3. Sincronização Automática via ORCID (`scripts/sync-data.py`)

O script `scripts/sync-data.py` consulta a API pública do ORCID v3.0 utilizando os identificadores cadastrados em `integrantes.json`. Quando identifica novos artigos com DOI, consulta a API Crossref para formatar a referência e inseri-la em `producao.json`.

```bash
# Apenas validar a sintaxe dos JSONs existentes:
python scripts/sync-data.py --check-only

# Simulação da busca de novos artigos sem alterar arquivos:
python scripts/sync-data.py --dry-run

# Executar a sincronização e atualizar producao.json:
python scripts/sync-data.py
```

O processo é idempotente: trabalhos já registrados na base não serão duplicados.
