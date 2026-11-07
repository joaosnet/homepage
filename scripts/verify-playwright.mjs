import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT_DIR = path.resolve(fileURLToPath(import.meta.url), "../..");
const PORT = 8085;

// Servidor estático leve com MIME types adequados
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split("?")[0]);
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.join(ROOT_DIR, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
});

async function runVerification() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[Critic] Servidor local ativo em http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    permissions: ["clipboard-read", "clipboard-write"]
  });

  const screenshotsDir = path.join(ROOT_DIR, "screenshots");
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const errors = [];
  let testCount = 0;
  let passCount = 0;

  function check(condition, desc) {
    testCount++;
    if (condition) {
      console.log(`  ✔ [PASS] ${desc}`);
      passCount++;
    } else {
      console.error(`  ✖ [FAIL] ${desc}`);
      errors.push(desc);
    }
  }

  console.log("\n=======================================================");
  console.log("Gauntlet Loop: Validação Dinâmica do Critic (Playwright)");
  console.log("=======================================================\n");

  const page = await context.newPage();

  // Coletar erros de console
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
  });

  // 1. Desktop Viewport (1440x900)
  console.log("1. Testando Desktop (1440x900)...");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Checar zero scroll horizontal
  const docOverflow1440 = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
  });
  check(docOverflow1440, "Desktop 1440px: zero scroll horizontal (scrollWidth <= clientWidth)");

  // Checar renderização dos elementos chave
  const heroTitle = await page.textContent(".hero-main-title");
  check(heroTitle.includes("Laboratório de Processamento de Sinais"), `Hero title presente: "${heroTitle.trim()}"`);

  // Checar cards de docentes carregados
  await page.waitForSelector(".member-card", { timeout: 5000 });
  const membersCount = await page.$$eval(".member-card", (els) => els.length);
  check(membersCount >= 4, `Docentes renderizados com segurança: ${membersCount} cards`);

  // Checar projetos carregados
  await page.waitForSelector(".project-card-modern", { timeout: 5000 });
  const projectsCount = await page.$$eval(".project-card-modern", (els) => els.length);
  check(projectsCount >= 9, `Projetos de P&D carregados: ${projectsCount} cards`);

  // Checar publicações carregadas
  await page.waitForSelector(".timeline-point-v2", { timeout: 5000 });
  const pubCount = await page.$$eval(".timeline-point-v2", (els) => els.length);
  check(pubCount > 0, `Hub de publicações ativo: ${pubCount} itens visíveis`);

  await page.screenshot({ path: path.join(screenshotsDir, "desktop-1440-light.png"), fullPage: false });

  // 2. Testar Alternância de Idiomas (PT -> EN -> DE -> FR -> PT)
  console.log("\n2. Testando Motor i18n Dinâmico (PT, EN, DE, FR)...");
  // Clicar em EN
  await page.click('[data-lang-btn="en"]');
  await page.waitForTimeout(400);
  const heroEn = await page.textContent(".hero-main-title");
  check(heroEn.includes("Signal Processing Laboratory"), `Tradução EN aplicada no Hero: "${heroEn.trim()}"`);
  const profBioEn = await page.textContent(".member-bio");
  check(profBioEn.includes("B.Sc.") || profBioEn.includes("Ph.D.") || profBioEn.includes("Associate Professor"), "Card dinâmico de docente traduzido para EN");

  // Clicar em DE
  await page.click('[data-lang-btn="de"]');
  await page.waitForTimeout(400);
  const heroDe = await page.textContent(".hero-main-title");
  check(heroDe.includes("Labor für Signalverarbeitung"), `Tradução DE aplicada no Hero: "${heroDe.trim()}"`);

  // Clicar em FR
  await page.click('[data-lang-btn="fr"]');
  await page.waitForTimeout(400);
  const heroFr = await page.textContent(".hero-main-title");
  check(heroFr.includes("Laboratoire de Traitement du Signal"), `Tradução FR aplicada no Hero: "${heroFr.trim()}"`);

  // Voltar para PT
  await page.click('[data-lang-btn="pt"]');
  await page.waitForTimeout(400);
  const heroPt = await page.textContent(".hero-main-title");
  check(heroPt.includes("Laboratório de Processamento de Sinais"), "Retorno para PT canônico com sucesso");

  // 3. Testar Tema Escuro / Claro (Dark Mode)
  console.log("\n3. Testando Alternador de Tema Escuro / Claro...");
  await page.click("#theme-toggle-btn");
  await page.waitForTimeout(400);
  const themeDark = await page.getAttribute("html", "data-theme");
  check(themeDark === "dark", "Modo escuro ativado com sucesso (html[data-theme='dark'])");
  await page.screenshot({ path: path.join(screenshotsDir, "desktop-1440-dark.png"), fullPage: false });

  // Voltar para light
  await page.click("#theme-toggle-btn");
  await page.waitForTimeout(400);
  const themeLight = await page.getAttribute("html", "data-theme");
  check(themeLight === "light", "Modo claro restaurado com sucesso");

  // 4. Testar Laboratório Interativo de DSP & Filtros de Convolução
  console.log("\n4. Testando Laboratório Interativo de Visão Computacional & DSP...");
  await page.click('[data-dsp-filter="sobel"]');
  await page.waitForTimeout(300);
  const matrixText = await page.textContent("#dsp-kernel-matrix");
  check(matrixText.includes("-1") && matrixText.includes("2"), "Matriz Sobel exibida no painel interativo");

  await page.click('[data-dsp-filter="gaussian"]');
  await page.waitForTimeout(300);
  const matrixGauss = await page.textContent("#dsp-kernel-matrix");
  check(matrixGauss.includes("1/16"), "Filtro Gaussiano com fator de escala 1/16 exibido");

  // 5. Testar Busca de Publicações e Cópia de BibTeX
  console.log("\n5. Testando Busca e Cópia de Citação BibTeX...");
  await page.fill(".pub-search-input", "Zampolo");
  await page.waitForTimeout(400);
  const filteredPubs = await page.$$eval(".timeline-point-v2", (els) => els.length);
  check(filteredPubs > 0, `Busca por 'Zampolo' filtrou ${filteredPubs} publicações`);

  // Clicar no primeiro botão BibTeX
  const bibtexBtn = await page.$(".pub-bibtex-btn");
  if (bibtexBtn) {
    await bibtexBtn.click();
    await page.waitForTimeout(200);
    const copiedClass = await page.$eval(".pub-bibtex-btn", (el) => el.classList.contains("copied"));
    check(copiedClass, "Botão BibTeX acionou estado '.copied' com micro-feedback");
  }

  // Limpar busca
  await page.fill(".pub-search-input", "");
  await page.waitForTimeout(400);

  // 6. Testar Viewports Mobile e Tablet (Zero Overflow & Touch)
  const viewports = [
    { name: "Mobile Compacto (320x568)", width: 320, height: 568 },
    { name: "Mobile Padrão (390x844)", width: 390, height: 844 },
    { name: "Mobile Landscape (844x390)", width: 844, height: 390 },
    { name: "Tablet (768x1024)", width: 768, height: 1024 }
  ];

  console.log("\n6. Testando Viewports Móveis e Responsividade Estrita...");
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(400);

    const hasNoHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    check(hasNoHorizontalOverflow, `${vp.name}: Zero scroll horizontal (${vp.width}px)`);

    const filename = `viewport-${vp.width}x${vp.height}.png`;
    await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: false });
  }

  // 7. Checar Drawer Mobile
  console.log("\n7. Testando Drawer Mobile...");
  await page.setViewportSize({ width: 390, height: 844 });
  const toggleBtn = await page.$(".mobile-nav-toggle");
  check(toggleBtn !== null, "Botão hambúrguer visível em tela mobile");
  if (toggleBtn) {
    await toggleBtn.click();
    await page.waitForTimeout(300);
    const isNavOpen = await page.evaluate(() => document.body.classList.contains("mobile-nav-active"));
    check(isNavOpen, "Drawer de navegação abriu ao clicar no hambúrguer");

    // Fechar via tecla Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const isNavClosed = await page.evaluate(() => !document.body.classList.contains("mobile-nav-active"));
    check(isNavClosed, "Drawer fechou com tecla Escape (Acessibilidade WCAG)");
  }

  // 8. Checar Erros de Console
  console.log("\n8. Auditoria de Erros de Console e Rede...");
  check(consoleErrors.length === 0, `Zero erros de console/terminal (erros encontrados: ${consoleErrors.length})`);
  if (consoleErrors.length > 0) {
    console.error("  Erros de console:", consoleErrors);
  }

  await browser.close();
  await new Promise((resolve) => server.close(resolve));

  console.log("\n=======================================================");
  console.log(`Resultado do Critic: ${passCount}/${testCount} verificações aprovadas.`);
  console.log("=======================================================\n");

  if (errors.length > 0) {
    console.error("FALHAS ENCONTRADAS:");
    errors.forEach((e) => console.error(" - " + e));
    process.exit(1);
  } else {
    console.log("Validação dinâmica do Critic concluída com SUCESSO ABSOLUTO!");
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error("Erro fatal durante a verificação:", err);
  process.exit(1);
});
