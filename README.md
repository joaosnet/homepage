# LaPS - Laboratório de Processamento de Sinais

Site institucional do LaPS (Laboratório de Processamento de Sinais) da Universidade Federal do Pará.

## 🚀 Como Funciona o Site

O site é uma página estática que utiliza:
- **HTML5** para estrutura
- **CSS3** (Bootstrap 4.5 + CSS customizado) para estilos
- **JavaScript** (jQuery) para interatividade
- **Sistema de dados JSON** para atualização dinâmica de conteúdo

### Estrutura de Arquivos

```
homepage/
├── index.html              # Página principal
├── data/                   # Dados atualizáveis
│   ├── integrantes.json    # Professores e alunos
│   ├── projetos.json       # Projetos do laboratório
│   └── producao.json       # Publicações científicas
├── assets/
│   ├── css/
│   │   └── style.css       # Estilos customizados
│   ├── js/
│   │   ├── main.js         # Script principal
│   │   └── data-loader.js  # Carrega dados dos JSONs
│   ├── img/                # Imagens do site
│   └── vendor/             # Bibliotecas externas
└── README.md               # Este arquivo
```

## 📝 Como Atualizar o Conteúdo

### Atualizando Integrantes

Edite o arquivo `data/integrantes.json`:

```json
{
  "professores": [
    {
      "nome": "Nome Completo",
      "foto": "assets/img/foto.jpg",
      "lattes": "http://lattes.cnpq.br/...",
      "email": "email@ufpa.br",
      "orcid": "https://orcid.org/...",
      "scholar": "https://scholar.google.com/...",
      "bio": "Biografia do professor...",
      "linhasPesquisa": "Áreas de pesquisa."
    }
  ],
  "alunos": [
    {
      "nome": "Nome do Aluno",
      "foto": "assets/img/aluno.jpg",
      "tipo": "Mestrado|Doutorado|IC",
      "orientador": "Nome do Orientador"
    }
  ]
}
```

### Atualizando Projetos

Edite o arquivo `data/projetos.json`:

```json
{
  "projetos": [
    {
      "titulo": "Nome do Projeto",
      "periodo": "2020 - atual",
      "parceiro": "Nome do Parceiro",
      "financiador": "CNPq (Bolsas)",
      "imagem": "assets/img/projeto.jpg"
    }
  ]
}
```

### Atualizando Produção Científica

Edite o arquivo `data/producao.json`:

```json
{
  "producoes": [
    {
      "ano": 2024,
      "trabalhos": [
        "Referência bibliográfica completa...",
        "Outra publicação..."
      ]
    }
  ]
}
```

## 🌐 Como Subir para o Servidor

### Opção 1: GitHub Pages (Recomendado)

1. Faça commit e push das alterações:
   ```bash
   git add .
   git commit -m "Atualização do site"
   git push origin main
   ```

2. No GitHub, vá em **Settings > Pages**
3. Selecione **Source: Deploy from a branch**
4. Escolha **Branch: main** e pasta **/ (root)**
5. Clique em **Save**

O site estará disponível em: `https://LAPSHub.github.io/homepage/`

### Opção 2: Servidor Web Tradicional (Apache/Nginx)

1. Copie todos os arquivos para a pasta do servidor web:
   ```bash
   # Exemplo no Linux/Mac
   scp -r * usuario@servidor:/var/www/html/laps/
   
   # Ou usando FTP
   ```

2. Certifique-se que o servidor está configurado para servir arquivos estáticos

3. Acesse pelo endereço configurado no servidor

### Opção 3: Netlify/Vercel

1. Conecte seu repositório GitHub
2. A ferramenta detectará automaticamente que é um site estático
3. O deploy será feito automaticamente a cada push

## 🎨 Funcionalidades do Site

- **Botão Voltar ao Topo**: Aparece ao rolar a página para baixo
- **Carousel de Imagens**: Navegação manual e automática nas imagens do hero
- **Timeline Alternante**: Visualização moderna das publicações por ano
- **Responsivo**: Adaptado para desktop, tablet e mobile
- **Logos Transparentes**: Parceiros exibidos sem fundo

## 🔧 Desenvolvimento Local

Para testar localmente, você pode usar um servidor simples:

```bash
# Com Python 3
python -m http.server 8000

# Com Node.js (npx)
npx serve

# Com PHP
php -S localhost:8000
```

Depois acesse: `http://localhost:8000`

## 📄 Licença

Template baseado em [BootstrapMade](https://bootstrapmade.com/) - Techie v2.1.0
