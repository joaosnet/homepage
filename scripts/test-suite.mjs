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
console.log("LaPS — Suíte de Testes Automatizados e Integridade");
console.log("=================================================================\n");

// 1. Validar index.html e SEO
console.log("1. Validação de HTML5 e SEO Técnico:");
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

// 3. Validar assets de mídia principais
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
  assert(sizeMb < 3.0, `demo.gif está otimizado (< 3.0 MB): ${sizeMb.toFixed(2)} MB`);
}

// 4. Validar JSONs de dados
console.log("\n4. Validação dos Dados em data/*.json:");
const integrantesPath = resolve(ROOT_DIR, "data/integrantes.json");
assert(existsSync(integrantesPath), "data/integrantes.json existe");
if (existsSync(integrantesPath)) {
  const data = JSON.parse(readFileSync(integrantesPath, "utf-8"));
  assert(Array.isArray(data.professores) && data.professores.length >= 4, "integrantes.json contém os professores");
  
  // Checar imagens de fotos
  data.professores.forEach(p => {
    if (p.foto) {
      const pPath = resolve(ROOT_DIR, p.foto);
      assert(existsSync(pPath), `Foto de ${p.nome} existe: ${p.foto}`);
    }
  });
}

const projetosPath = resolve(ROOT_DIR, "data/projetos.json");
assert(existsSync(projetosPath), "data/projetos.json existe");
if (existsSync(projetosPath)) {
  const data = JSON.parse(readFileSync(projetosPath, "utf-8"));
  assert(Array.isArray(data.projetos) && data.projetos.length > 0, "projetos.json contém lista de projetos");
  data.projetos.forEach(p => {
    if (p.imagem) {
      const imgPath = resolve(ROOT_DIR, p.imagem);
      assert(existsSync(imgPath), `Imagem do projeto '${p.titulo.slice(0, 30)}...' existe: ${p.imagem}`);
    }
  });
}

const producaoPath = resolve(ROOT_DIR, "data/producao.json");
assert(existsSync(producaoPath), "data/producao.json existe");
if (existsSync(producaoPath)) {
  const data = JSON.parse(readFileSync(producaoPath, "utf-8"));
  assert(Array.isArray(data.producoes) && data.producoes.length > 0, "producao.json contém anos de produção");
}

console.log("\n=================================================================");
console.log(`Resultado: ${totalPassed} testes passaram, ${totalFailed} falharam.`);
console.log("=================================================================");

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log("Todos os testes automatizados foram concluídos com sucesso!\n");
  process.exit(0);
}
