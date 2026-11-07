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
    // 800x450, 10 fps, 128 cores com dithering para GIF leve e fluido
    const args = [
      "-y",
      "-i", videoPath,
      "-vf", "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
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
  console.log("Iniciando gravação do GIF de demonstração do site LaPS...");
  const PORT = 8092;
  const server = await startServer(PORT);
  console.log(`Servidor local ativo na porta ${PORT}`);

  const tmpDir = resolve(ROOT_DIR, "tmp_record");
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const { chromium } = await getPlaywright();
  const browser = await chromium.launch({ channel: "msedge" });
  const context = await browser.newContext({
    viewport: { width: 800, height: 450 },
    recordVideo: {
      dir: tmpDir,
      size: { width: 800, height: 450 }
    }
  });

  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Mostrar o Hero e interagir suavemente com o carrossel
  console.log("1. Gravando Hero Carousel...");
  await page.waitForTimeout(1500);
  const nextBtn = page.locator("#heroCarousel .carousel-control-next");
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(1500);
  }

  // 2. Rolar suavemente para a seção de Projetos
  console.log("2. Rolando para Projetos...");
  await page.evaluate(() => {
    const el = document.getElementById("projetos");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
  await page.waitForTimeout(2000);

  // 3. Rolar suavemente para a seção de Produções
  console.log("3. Rolando para Produções...");
  await page.evaluate(() => {
    const el = document.getElementById("producoes");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  });
  await page.waitForTimeout(1500);

  // 4. Interagir com o botão 'Ver mais produções'
  console.log("4. Expandindo timeline de produções...");
  const btnVerMais = page.locator("#btn-ver-mais-producao");
  if (await btnVerMais.isVisible()) {
    await btnVerMais.click();
    await page.waitForTimeout(2000);
  }

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
