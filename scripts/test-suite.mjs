import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(fileURLToPath(import.meta.url), "../..");

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(` ✔ ${message}`);
    totalPassed++;
  } else {
    console.error(` ✖ FALHA: ${message}`);
    totalFailed++;
  }
}

console.log("=================================================================");
console.log("LaPS — Suíte de Testes Automatizados e Integridade (v3.0 LASSE)");
console.log("=================================================================\n");

// 1. Validar index.html e SEO
console.log("1. Validação de HTML5, Acessibilidade e SEO Técnico:");
const htmlPath = resolve(ROOT_DIR, "index.html");
assert(existsSync(htmlPath), "index.html existe na raiz");

const html = readFileSync(htmlPath, "utf-8");
assert(!html.includes('name="descriptison"'), "Erro de digitação 'descriptison' foi corrigido");
assert(html.includes('<meta name="description"'), "Meta description configurada");
assert(html.includes('rel="canonical"') && html.includes('https://laps.ufpa.br/'), "Canonical link para https://laps.ufpa.br/ presente");
assert(html.includes('hreflang="pt"'), "Tag hreflang pt presente");
assert(html.includes('hreflang="en"'), "Tag hreflang en presente");
assert(html.includes('hreflang="de"'), "Tag hreflang de presente");
assert(html.includes('hreflang="fr"'), "Tag hreflang fr presente");
assert(html.includes('property="og:image"'), "Open Graph image configurada");
assert(html.includes('name="twitter:card"'), "Twitter Card configurado");
assert(html.includes('"@type": "ResearchOrganization"'), "Schema.org JSON-LD para ResearchOrganization configurado");
assert(html.includes('https://www.instagram.com/laps_ufpa/'), "Instagram oficial configurado no Schema.org sameAs");

// Acessibilidade no index.html
assert(html.includes('class="skip-links"') && html.includes('href="#hero"'), "Skip-links acessíveis para teclado no início do body");
assert(html.includes('id="a11y-announcer"') && html.includes('aria-live="polite"'), "Announcer dinâmico aria-live='polite' presente");
assert(html.includes('id="a11y-font-reset"'), "Botão A0 de redefinição de escala de fonte presente");
assert(html.includes('instagram-header-btn'), "Botão de atalho do Instagram presente no header");

// Seções adicionadas do padrão LASSE
assert(html.includes('id="datasets"'), "Seção #datasets presente em index.html");
assert(html.includes('id="open-source"'), "Seção #open-source presente em index.html");
assert(html.includes('id="noticias"'), "Seção #noticias presente em index.html");
assert(html.includes('id="cursos"'), "Seção #cursos presente em index.html");
assert(html.includes('instagram-community-card'), "Card do Instagram na seção de Contato presente");

// Verificar se todos os target="_blank" possuem rel="noopener noreferrer"
const targetBlankRegex = /<a\s+[^>]*target=["']_blank["'][^>]*>/gi;
const targetBlankLinks = html.match(targetBlankRegex) || [];
assert(targetBlankLinks.length > 0, `Encontrados ${targetBlankLinks.length} links target="_blank" em index.html`);
const unsafeLinks = targetBlankLinks.filter(tag => !tag.includes('rel="noopener noreferrer"'));
assert(unsafeLinks.length === 0, `Zero links vulneráveis a tabnabbing (todos têm rel="noopener noreferrer")`);

// Verificar ausência de scripts legados externos não-gerenciados
assert(!html.includes('google_translate_element'), "Elemento legado google_translate_element foi removido");
assert(!html.includes('translate.google.com'), "Script legado translate.google.com removido");

// 2. Validar robots.txt e sitemap.xml
console.log("\n2. Validação de Arquivos de Indexação:");
const robotsPath = resolve(ROOT_DIR, "robots.txt");
assert(existsSync(robotsPath), "robots.txt existe");
if (existsSync(robotsPath)) {
  const robots = readFileSync(robotsPath, "utf-8");
  assert(robots.includes("Sitemap: https://laps.ufpa.br/sitemap.xml"), "robots.txt aponta para o sitemap");
}

const sitemapPath = resolve(ROOT_DIR, "sitemap.xml");
assert(existsSync(sitemapPath), "sitemap.xml existe");
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, "utf-8");
  assert(sitemap.includes("<loc>https://laps.ufpa.br/</loc>"), "sitemap.xml lista a URL canônica");
}

// 3. Validar assets visuais principais
console.log("\n3. Validação de Assets Visuais:");
const ogPreview = resolve(ROOT_DIR, "assets/img/og-preview.png");
assert(existsSync(ogPreview), "assets/img/og-preview.png existe");
if (existsSync(ogPreview)) {
  const sizeKb = statSync(ogPreview).size / 1024;
  assert(sizeKb > 10, `og-preview.png possui tamanho válido (${sizeKb.toFixed(1)} KB)`);
}

const demoGif = resolve(ROOT_DIR, "assets/img/demo.gif");
assert(existsSync(demoGif), "assets/img/demo.gif existe");
if (existsSync(demoGif)) {
  const sizeMb = statSync(demoGif).size / (1024 * 1024);
  assert(sizeMb < 3.5, `demo.gif está otimizado (< 3.5 MB): ${sizeMb.toFixed(2)} MB`);
}

// 4. Validar Dicionário i18n em 4 Idiomas (16 Seções)
console.log("\n4. Validação do Dicionário i18n (assets/js/lang.json):");
const langPath = resolve(ROOT_DIR, "assets/js/lang.json");
assert(existsSync(langPath), "assets/js/lang.json existe");
if (existsSync(langPath)) {
  const langJson = JSON.parse(readFileSync(langPath, "utf-8"));
  const langs = ["pt", "en", "de", "fr"];
  langs.forEach(l => {
    assert(!!langJson[l], `Idioma '${l}' presente no dicionário`);
  });

  const sections = [
    "nav", "hero", "about", "partners", "areas", "dspLab",
    "members", "projects", "publications", "contact", "footer",
    "datasets", "softwares", "noticias", "cursos", "instagram"
  ];
  langs.forEach(l => {
    sections.forEach(s => {
      assert(!!langJson[l][s], `Seção '${s}' presente no idioma '${l}'`);
    });
  });
}

// 5. Validar data-loader.js e main.js
console.log("\n5. Validação de Qualidade e Recursos do JS:");
const dataLoaderPath = resolve(ROOT_DIR, "assets/js/data-loader.js");
assert(existsSync(dataLoaderPath), "assets/js/data-loader.js existe");
if (existsSync(dataLoaderPath)) {
  const loaderCode = readFileSync(dataLoaderPath, "utf-8");
  assert(loaderCode.includes("team-network-canvas"), "Canvas do Grafo interativo implementado no data-loader");
  assert(loaderCode.includes("renderTeamGrid") && loaderCode.includes("renderTeamList") && loaderCode.includes("renderTeamGraph"), "Visões Grade, Lista e Grafo implementadas");
  assert(loaderCode.includes("generateInitialsAvatar"), "Fallback de avatar SVG inteligente implementado");
  assert(loaderCode.includes("renderDatasets"), "Renderizador de datasets presente");
  assert(loaderCode.includes("renderOpenSourceAndPatentes"), "Renderizador de softwares e patentes presente");
  assert(loaderCode.includes("renderNoticias"), "Renderizador de notícias com modal presente");
  assert(loaderCode.includes("renderCursos"), "Renderizador de cursos e workshops presente");
}

const mainJsPath = resolve(ROOT_DIR, "assets/js/main.js");
assert(existsSync(mainJsPath), "assets/js/main.js existe");
if (existsSync(mainJsPath)) {
  const mainCode = readFileSync(mainJsPath, "utf-8");
  assert(mainCode.includes("normalizeLangCode"), "Detector e normalizador de locale do navegador implementado");
  assert(mainCode.includes("laps-theme-mode"), "Tema com ciclo de 3 estados (system -> dark -> light) implementado");
  assert(mainCode.includes("prefers-color-scheme"), "Listener matchMedia para tema do dispositivo implementado");
  assert(mainCode.includes("a11y-font-reset"), "Handler para reset de escala de fonte (A0) presente");
}

// 6. Validar Todos os 8 Arquivos JSON em data/
console.log("\n6. Validação dos 8 Arquivos em data/*.json:");
const jsonFiles = [
  "integrantes.json",
  "projetos.json",
  "producao.json",
  "softwares.json",
  "patentes.json",
  "datasets.json",
  "noticias.json",
  "cursos.json"
];

jsonFiles.forEach(f => {
  const p = resolve(ROOT_DIR, "data", f);
  assert(existsSync(p), `Arquivo data/${f} existe`);
  if (existsSync(p)) {
    const parsed = JSON.parse(readFileSync(p, "utf-8"));
    assert(parsed !== null && typeof parsed === "object", `data/${f} contém JSON válido`);
  }
});

// Integrantes detalhes
const integrantesData = JSON.parse(readFileSync(resolve(ROOT_DIR, "data/integrantes.json"), "utf-8"));
assert(Array.isArray(integrantesData.professores) && integrantesData.professores.length === 4, "4 professores docentes mantidos");
assert(Array.isArray(integrantesData.doutorandos) && integrantesData.doutorandos.length >= 2, "Doutorandos presentes");
assert(Array.isArray(integrantesData.mestrandos) && integrantesData.mestrandos.length >= 3, "Mestrandos presentes");
assert(Array.isArray(integrantesData.graduandos) && integrantesData.graduandos.length >= 3, "Graduandos presentes");
assert(Array.isArray(integrantesData.egressos) && integrantesData.egressos.length >= 2, "Egressos presentes");
assert(Array.isArray(integrantesData.alunos), "Array concatenado 'alunos' preservado para retrocompatibilidade");

console.log("\n=================================================================");
console.log(`Resultado: ${totalPassed} testes passaram, ${totalFailed} falharam.`);
console.log("=================================================================");

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log("Todos os testes automatizados da suíte foram concluídos com 100% de sucesso!\n");
  process.exit(0);
}
