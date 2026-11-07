import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, mkdirSync, rmSync, statSync } from "node:fs";
import { resolve, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT_DIR = resolve(fileURLToPath(import.meta.url), "../..");

async function getPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const npxDir = "C:/Users/joaod/AppData/Local/npm-cache/_npx";
    if (existsSync(npxDir)) {
      for (const d of readdirSync(npxDir)) {
        const p = `file:///${npxDir}/${d}/node_modules/playwright/index.mjs`;
        try {
          return await import(p);
        } catch {}
      }
    }
    throw new Error("Playwright não encontrado.");
  }
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function startServer(port = 8089) {
  return new Promise((res, rej) => {
    const server = createServer((req, resHttp) => {
      let reqPath = req.url.split("?")[0];
      if (reqPath === "/") reqPath = "/index.html";
      const filePath = resolve(ROOT_DIR, "." + reqPath);

      if (!existsSync(filePath)) {
        resHttp.writeHead(404);
        resHttp.end("Not Found");
        return;
      }

      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath).toLowerCase();
        resHttp.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        resHttp.end(content);
      } catch (e) {
        resHttp.writeHead(500);
        resHttp.end(String(e));
      }
    });

    server.listen(port, () => res(server));
    server.on("error", rej);
  });
}

function runFfmpeg(videoPath, gifPath) {
  return new Promise((res, rej) => {
    // 640x360, 8 fps, 80 cores com dithering para GIF leve e fluido (< 3.2 MB)
    const args = [
      "-y",
      "-i", videoPath,
      "-vf", "fps=8,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=80[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
      gifPath
    ];

    const proc = spawn("ffmpeg", args, { stdio: "inherit" });
    proc.on("close", (code) => {
      if (code === 0) res();
      else rej(new Error(`ffmpeg exited with code ${code}`));
    });
    proc.on("error", rej);
  });
}

export async function recordDemo() {
  console.log("Iniciando gravação do GIF de demonstração do novo site LaPS (v3.0 LASSE)...");
  const PORT = 8092;
  const server = await startServer(PORT);
  console.log(`Servidor local ativo na porta ${PORT}`);

  const tmpDir = resolve(ROOT_DIR, "tmp_record");
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const { chromium } = await getPlaywright();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 800, height: 450 },
    permissions: ["clipboard-read", "clipboard-write"],
    recordVideo: {
      dir: tmpDir,
      size: { width: 800, height: 450 }
    }
  });

  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Mostrar o novo Hero técnico com canvas e KPIs
  console.log("1. Gravando Hero com Canvas de Sinais...");
  await page.waitForTimeout(800);

  // 2. Alternar idioma para EN e DE
  console.log("2. Alternando Idiomas (EN / DE)...");
  await page.click('[data-lang-btn="en"]');
  await page.waitForTimeout(600);
  await page.click('[data-lang-btn="pt"]');
  await page.waitForTimeout(500);

  // 3. Alternar para Modo Escuro
  console.log("3. Alternando Tema Escuro (Dark Mode)...");
  await page.click("#theme-toggle-btn");
  await page.waitForTimeout(700);

  // 4. Rolar para a Equipe e mostrar Grafo Interativo e Filtros
  console.log("4. Rolando para Equipe (Grade, Lista e Grafo)...");
  await page.evaluate(() => {
    const el = document.getElementById("integrantes");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
  await page.waitForTimeout(800);

  // Clicar em Doutorandos
  await page.click('[data-category="doutorandos"]');
  await page.waitForTimeout(500);
  await page.click('[data-category="all"]');
  await page.waitForTimeout(400);

  // Alternar para Grafo Interativo
  await page.click('[data-view="graph"]');
  await page.waitForTimeout(900);

  // Alternar de volta para Grade
  await page.click('[data-view="grid"]');
  await page.waitForTimeout(500);

  // 5. Rolar para o Laboratório Interativo de DSP
  console.log("5. Rolando para o Laboratório Interativo de DSP...");
  await page.evaluate(() => {
    const el = document.getElementById("dsp-showcase");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
  await page.waitForTimeout(700);

  await page.click('[data-dsp-filter="sobel"]');
  await page.waitForTimeout(600);

  // 6. Rolar para Datasets e Open Source
  console.log("6. Rolando para Datasets e Softwares...");
  await page.evaluate(() => {
    const el = document.getElementById("datasets");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    const el = document.getElementById("open-source");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
  await page.waitForTimeout(700);

  // Clicar na aba Patentes
  await page.click('[role="tab"]:has-text("Patentes")');
  await page.waitForTimeout(700);

  // Voltar para Light mode
  await page.click("#theme-toggle-btn");
  await page.waitForTimeout(500);

  // Finalizar sessão do navegador
  await page.close();
  await context.close();
  await browser.close();
  server.close();

  // Encontrar o arquivo de vídeo gerado (.webm)
  const videoFiles = readdirSync(tmpDir).filter(f => f.endsWith(".webm") || f.endsWith(".mp4"));
  if (videoFiles.length === 0) {
    throw new Error("Nenhum vídeo foi gravado pelo Playwright.");
  }

  const rawVideoPath = join(tmpDir, videoFiles[0]);
  const outGifPath = resolve(ROOT_DIR, "assets/img/demo.gif");

  console.log(`Convertendo vídeo para GIF otimizado: ${outGifPath}...`);
  await runFfmpeg(rawVideoPath, outGifPath);

  // Limpar diretório temporário
  rmSync(tmpDir, { recursive: true, force: true });

  const stats = statSync(outGifPath);
  console.log(`GIF institucional demo.gif gerado com sucesso! Tamanho: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  recordDemo().catch(console.error);
}
