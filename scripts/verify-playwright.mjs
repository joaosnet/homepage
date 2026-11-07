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

  console.log("\n=======================================================================");
  console.log("Gauntlet Loop: Validação Dinâmica do Critic (Playwright E2E v3.0 LASSE)");
  console.log("=======================================================================\n");

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
  await page.waitForTimeout(800);

  // Checar zero scroll horizontal
  const docOverflow1440 = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
  });
  check(docOverflow1440, "Desktop 1440px: zero scroll horizontal (scrollWidth <= clientWidth)");

  // Checar renderização dos elementos chave (respeitando a detecção de idioma do navegador)
  const heroTitle = await page.textContent(".hero-main-title");
  const hasValidHero = heroTitle.includes("Laboratório de Processamento de Sinais") || heroTitle.includes("Signal Processing Laboratory");
  check(hasValidHero, `Hero title presente e internacionalizado conforme locale: "${heroTitle.trim()}"`);

  // Checar Instagram no Header e Contato
  const igHeaderHref = await page.getAttribute(".instagram-header-btn", "href");
  check(igHeaderHref === "https://www.instagram.com/laps_ufpa/", "Botão do Instagram no header aponta para https://www.instagram.com/laps_ufpa/");

  const igContactHref = await page.getAttribute(".instagram-community-card a", "href");
  check(igContactHref === "https://www.instagram.com/laps_ufpa/", "Card do Instagram no contato aponta para https://www.instagram.com/laps_ufpa/");

  // 2. Testar Equipe Completa, Filtros de Categoria e Modos de Visão
  console.log("\n2. Testando Equipe (Filtros de Categoria, Grade, Lista e Grafo)...");
  await page.waitForSelector(".member-card", { timeout: 5000 });
  const allTeamCount = await page.$$eval(".member-card", (els) => els.length);
  check(allTeamCount >= 14, `Todos os membros carregados na visão geral: ${allTeamCount} membros`);

  // Filtrar por Doutorandos
  await page.click('[data-category="doutorandos"]');
  await page.waitForTimeout(300);
  const phdCount = await page.$$eval(".member-card", (els) => els.length);
  check(phdCount === 2, `Filtro de Doutorandos exibe exatamente 2 membros (Charles e Alice): ${phdCount}`);

  // Filtrar por Professores
  await page.click('[data-category="professores"]');
  await page.waitForTimeout(300);
  const profCount = await page.$$eval(".member-card", (els) => els.length);
  check(profCount === 4, `Filtro de Docentes exibe exatamente 4 professores: ${profCount}`);

  // Voltar para Todos
  await page.click('[data-category="all"]');
  await page.waitForTimeout(300);

  // Testar Visão em Lista
  await page.click('[data-view="list"]');
  await page.waitForTimeout(400);
  const hasTable = await page.$(".team-table");
  check(hasTable !== null, "Visão em Lista renderizou a tabela acessível .team-table");
  const tableRows = await page.$$eval(".team-table tbody tr", (els) => els.length);
  check(tableRows >= 14, `Tabela de membros contém ${tableRows} linhas`);

  // Testar Visão em Grafo Interativo (Canvas Force-Directed)
  await page.click('[data-view="graph"]');
  await page.waitForTimeout(500);
  const hasCanvas = await page.$("#team-network-canvas");
  check(hasCanvas !== null, "Visão em Grafo renderizou o elemento #team-network-canvas");

  const canvasWidth = await page.$eval("#team-network-canvas", (c) => c.width);
  check(canvasWidth > 0, `Canvas do Grafo possui largura válida renderizada (${canvasWidth}px)`);

  // Retornar para Grade
  await page.click('[data-view="grid"]');
  await page.waitForTimeout(400);

  // 3. Testar Seção de Datasets Científicos
  console.log("\n3. Testando Seção de Datasets Científicos...");
  await page.waitForSelector(".dataset-card-modern", { timeout: 5000 });
  const dsCount = await page.$$eval(".dataset-card-modern", (els) => els.length);
  check(dsCount >= 4, `Datasets científicos carregados: ${dsCount} cards`);

  // Testar botão de citação
  const citeBtn = await page.$(".dataset-btn[aria-label*='Citação']");
  if (citeBtn) {
    await citeBtn.click();
    await page.waitForTimeout(200);
    const citeText = await citeBtn.textContent();
    check(citeText.includes("Copiado"), "Botão de citação de dataset exibe feedback 'Copiado!'");
  }

  // 4. Testar Seção Open Source & Patentes
  console.log("\n4. Testando Softwares Open Source & Patentes...");
  await page.waitForSelector(".software-card", { timeout: 5000 });
  const swCount = await page.$$eval(".software-card", (els) => els.length);
  check(swCount >= 8, `Softwares Open Source carregados: ${swCount} repositórios LAPSHub`);

  // Alternar para aba Patentes
  await page.click('[role="tab"]:has-text("Patentes")');
  await page.waitForTimeout(400);
  const patCount = await page.$$eval(".patente-card", (els) => els.length);
  check(patCount >= 4, `Patentes & Registros INPI carregados: ${patCount} registros`);

  // 5. Testar Seção Notícias & Modal Acessível
  console.log("\n5. Testando Notícias e Modal Interativo...");
  await page.waitForSelector(".noticia-card", { timeout: 5000 });
  const notCount = await page.$$eval(".noticia-card", (els) => els.length);
  check(notCount >= 4, `Notícias institucionais carregadas: ${notCount} comunicados`);

  // Clicar no botão para abrir modal
  const readBtn = await page.$(".btn-noticia-read");
  if (readBtn) {
    await readBtn.click();
    await page.waitForTimeout(400);
    const isModalOpen = await page.evaluate(() => {
      const modal = document.getElementById("noticias-modal");
      return modal && (modal.open || modal.hasAttribute("open"));
    });
    check(isModalOpen, "Modal dialog de notícia abre com sucesso");

    // Fechar modal
    await page.click("#modal-noticia-close");
    await page.waitForTimeout(300);
    const isModalClosed = await page.evaluate(() => {
      const modal = document.getElementById("noticias-modal");
      return !modal || (!modal.open && !modal.hasAttribute("open"));
    });
    check(isModalClosed, "Modal dialog de notícia fecha com sucesso");
  }

  // 6. Testar Seção Cursos & Workshops
  console.log("\n6. Testando Cursos e Oficinas...");
  await page.waitForSelector(".curso-card", { timeout: 5000 });
  const cursosCount = await page.$$eval(".curso-card", (els) => els.length);
  check(cursosCount >= 3, `Cursos e oficinas carregados: ${cursosCount} programas`);

  // 7. Testar Motor i18n Dinâmico em 4 Idiomas
  console.log("\n7. Testando Motor i18n Dinâmico (PT, EN, DE, FR)...");
  await page.click('[data-lang-btn="en"]');
  await page.waitForTimeout(400);
  const heroEn = await page.textContent(".hero-main-title");
  check(heroEn.includes("Signal Processing Laboratory"), `Tradução EN aplicada no Hero: "${heroEn.trim()}"`);

  await page.click('[data-lang-btn="de"]');
  await page.waitForTimeout(400);
  const heroDe = await page.textContent(".hero-main-title");
  check(heroDe.includes("Labor für Signalverarbeitung"), `Tradução DE aplicada no Hero: "${heroDe.trim()}"`);

  await page.click('[data-lang-btn="fr"]');
  await page.waitForTimeout(400);
  const heroFr = await page.textContent(".hero-main-title");
  check(heroFr.includes("Laboratoire de Traitement du Signal"), `Tradução FR aplicada no Hero: "${heroFr.trim()}"`);

  await page.click('[data-lang-btn="pt"]');
  await page.waitForTimeout(400);

  // 8. Testar Tema Escuro / Claro / Sistema (3-State)
  console.log("\n8. Testando Ciclo de Tema (3-State)...");
  await page.click("#theme-toggle-btn");
  await page.waitForTimeout(300);
  const themeDark = await page.getAttribute("html", "data-theme");
  check(themeDark === "dark", "Modo escuro ativado com sucesso");

  await page.click("#theme-toggle-btn");
  await page.waitForTimeout(300);
  const themeLight = await page.getAttribute("html", "data-theme");
  check(themeLight === "light", "Modo claro ativado com sucesso");

  // 9. Testar Reset de Escala de Fonte (A-, A0, A+)
  console.log("\n9. Testando Controles de Escala de Fonte...");
  await page.click("#a11y-font-plus");
  await page.waitForTimeout(200);
  const scalePlus = await page.evaluate(() => document.documentElement.style.getPropertyValue("--laps-font-scale"));
  check(parseFloat(scalePlus) > 1.0, `Fonte aumentada: ${scalePlus}`);

  await page.click("#a11y-font-reset");
  await page.waitForTimeout(200);
  const scaleReset = await page.evaluate(() => document.documentElement.style.getPropertyValue("--laps-font-scale"));
  check(parseFloat(scaleReset) === 1.0, `Fonte redefinida para 1.0 (A0): ${scaleReset}`);

  // 10. Testar Viewports Móveis e Breakpoint Intermediário (1024px)
  const viewports = [
    { name: "Mobile Compacto (320x568)", width: 320, height: 568 },
    { name: "Mobile Padrão (390x844)", width: 390, height: 844 },
    { name: "Tablet (768x1024)", width: 768, height: 1024 },
    { name: "Breakpoint Intermediário (1024x768 - former dead zone)", width: 1024, height: 768 },
    { name: "Desktop Padrão (1440x900)", width: 1440, height: 900 }
  ];

  console.log("\n10. Testando Viewports Móveis e Responsividade Estrita...");
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(300);

    const hasNoHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    check(hasNoHorizontalOverflow, `${vp.name}: Zero scroll horizontal (${vp.width}px)`);

    // No breakpoint de 1024px, verificar que a navegação mobile toggle ou desktop está acessível
    if (vp.width === 1024) {
      const toggleVisible = await page.$eval(".mobile-nav-toggle", (el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      check(toggleVisible, "Breakpoint 1024px: Botão de navegação móvel perfeitamente ativo (sem zona morta)");
    }
  }

  // 11. Checar Erros de Console
  console.log("\n11. Auditoria de Erros de Console e Rede...");
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
    console.log("Validação dinâmica do Critic concluída com 100% DE SUCESSO!");
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error("Erro fatal durante a verificação:", err);
  process.exit(1);
});
