import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export async function generateOgPreview() {
  console.log("Gerando banner social oficial og-preview.png (1200x630)...");
  const { chromium } = await getPlaywright();
  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

  let logoBase64 = "";
  const logoPath = resolve(ROOT_DIR, "assets/img/laps_logo.png");
  if (existsSync(logoPath)) {
    logoBase64 = readFileSync(logoPath).toString("base64");
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          width: 1200px; height: 630px; overflow: hidden;
          background: #0b0f19;
          background: radial-gradient(circle at 80% 30%, #1c1f3b 0%, #0b0f19 75%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          color: #ffffff;
          position: relative;
        }

        .grid-line {
          position: absolute;
          background: rgba(255, 255, 255, 0.03);
        }
        .grid-h { left: 0; right: 0; height: 1px; }
        .grid-v { top: 0; bottom: 0; width: 1px; }

        .container {
          display: flex;
          width: 1200px;
          height: 630px;
          padding: 60px 75px;
          position: relative;
          z-index: 2;
        }

        .left-col {
          flex: 1.2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-right: 40px;
        }

        .brand-header {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .brand-logo {
          height: 54px;
          filter: drop-shadow(0 2px 8px rgba(88, 70, 249, 0.3));
        }

        .inst-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(88, 70, 249, 0.15);
          border: 1px solid rgba(88, 70, 249, 0.35);
          color: #a59bfb;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 5px 14px;
          border-radius: 20px;
        }

        .main-title {
          margin-top: 24px;
          font-size: 46px;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.8px;
          color: #ffffff;
        }

        .main-title span {
          background: linear-gradient(135deg, #7b68ee 0%, #a59bfb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          margin-top: 16px;
          font-size: 19px;
          line-height: 1.5;
          color: #94a3b8;
          max-width: 600px;
        }

        .tags-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }

        .tag-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 12px;
        }

        .footer-info {
          display: flex;
          align-items: center;
          gap: 20px;
          font-size: 14px;
          color: #64748b;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .footer-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
        }

        .right-col {
          flex: 0.8;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-preview {
          width: 380px;
          background: rgba(18, 24, 40, 0.85);
          border: 1px solid rgba(88, 70, 249, 0.25);
          border-radius: 20px;
          padding: 30px;
          box-shadow:
            0 20px 50px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .card-stat {
          margin-bottom: 22px;
        }

        .stat-num {
          font-size: 38px;
          font-weight: 800;
          color: #a59bfb;
          line-height: 1;
        }

        .stat-label {
          font-size: 14px;
          color: #94a3b8;
          margin-top: 4px;
        }

        .stat-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 18px 0;
        }
      </style>
    </head>
    <body>
      <div class="grid-line grid-h" style="top: 100px;"></div>
      <div class="grid-line grid-h" style="top: 300px;"></div>
      <div class="grid-line grid-h" style="top: 500px;"></div>
      <div class="grid-line grid-v" style="left: 200px;"></div>
      <div class="grid-line grid-v" style="left: 700px;"></div>

      <div class="container">
        <div class="left-col">
          <div>
            <div class="brand-header">
              ${logoBase64 ? `<img class="brand-logo" src="data:image/png;base64,${logoBase64}" alt="LaPS">` : ''}
              <div class="inst-badge">UFPA • ITEC • FCT</div>
            </div>

            <h1 class="main-title">
              Laboratório de<br>
              <span>Processamento de Sinais</span>
            </h1>

            <p class="subtitle">
              Pesquisa acadêmica, inteligência artificial, visão computacional e engenharia biomédica na Amazônia.
            </p>

            <div class="tags-row">
              <span class="tag-pill">Inteligência Artificial</span>
              <span class="tag-pill">Visão Computacional</span>
              <span class="tag-pill">Neuroengenharia</span>
              <span class="tag-pill">Sinais Biomédicos</span>
              <span class="tag-pill">Telecomunicações</span>
            </div>
          </div>

          <div class="footer-info">
            <span class="footer-dot"></span>
            <span>laps.ufpa.br</span>
            <span>•</span>
            <span>Universidade Federal do Pará</span>
          </div>
        </div>

        <div class="right-col">
          <div class="card-preview">
            <div class="card-stat">
              <div class="stat-num">20+ Anos</div>
              <div class="stat-label">De Pesquisa Científica & Inovação</div>
            </div>
            <div class="stat-divider"></div>
            <div class="card-stat">
              <div class="stat-num">50+ Artigos</div>
              <div class="stat-label">Publicações Internacionais & Patentes</div>
            </div>
            <div class="stat-divider"></div>
            <div class="card-stat" style="margin-bottom: 0;">
              <div class="stat-num">4 Idiomas</div>
              <div class="stat-label">Português • English • Deutsch • Français</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  const outPath = resolve(ROOT_DIR, "assets/img/og-preview.png");
  await page.screenshot({ path: outPath, type: "png" });
  await browser.close();
  console.log(`Card social og-preview.png gerado com sucesso em ${outPath}!`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  generateOgPreview().catch(console.error);
}
