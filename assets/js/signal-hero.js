/**
 * LaPS — Signal & Image Processing Interactive Engine
 * Módulo 1: Canvas de Fourier + Topologia Neural no Hero
 * Módulo 2: Laboratório Interativo de Visão Computacional & DSP (Convolução 2D e Histograma)
 */

(function () {
  'use strict';

  /* ==============================================================
     1. HERO CANVAS: ONDAS DE FOURIER & TOPOLOGIA NEURAL
     ============================================================== */
  function initHeroCanvas() {
    const canvas = document.getElementById('signal-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId = null;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let time = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Nós neurais interativos
    const nodes = [];
    const NODE_COUNT = 32;
    let mouse = { x: -9999, y: -9999, radius: 140 };

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = Math.max(rect.height, 420);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Reposicionar nós
      if (nodes.length === 0) {
        for (let i = 0; i < NODE_COUNT; i++) {
          nodes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.45,
            vy: (Math.random() - 0.5) * 0.45,
            radius: Math.random() * 2.2 + 1.2,
            pulseOffset: Math.random() * Math.PI * 2
          });
        }
      }
    }

    function drawFourierWave(harmonic, amplitude, freq, speed, color, lineWidth) {
      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;

      const baseLine = height * 0.65;
      const step = 4;

      for (let x = 0; x <= width + step; x += step) {
        // Série de Fourier simplificada f(x) = sum(A_k * sin(k*w*x + phi_k))
        const distFromCenter = Math.abs(x - width * 0.5) / (width * 0.5);
        const envelope = Math.max(0, 1 - distFromCenter * 0.85);

        let yOffset = 0;
        yOffset += Math.sin(x * freq + time * speed) * amplitude;
        yOffset += Math.sin(x * freq * 2.1 + time * speed * 1.3) * (amplitude * 0.35);
        yOffset += Math.cos(x * freq * 0.5 - time * speed * 0.7) * (amplitude * 0.25);

        // Influência suave do mouse
        const dx = x - mouse.x;
        const dy = baseLine - mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < mouse.radius) {
          const factor = (1 - d / mouse.radius) * 25;
          yOffset += Math.sin(d * 0.1 - time * 3) * factor;
        }

        const y = baseLine + yOffset * envelope;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    function render() {
      if (!isVisible) return;

      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Fundo escuro/translúcido de alta precisão
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

      // 1. Ondas harmônicas de Fourier
      const waveAlpha = isDark ? 0.35 : 0.25;
      drawFourierWave(1, 38, 0.007, 1.0, `rgba(56, 189, 248, ${waveAlpha})`, 2.5); // Ciano
      drawFourierWave(2, 24, 0.012, 1.4, `rgba(129, 140, 248, ${waveAlpha * 0.8})`, 1.75); // Índigo
      drawFourierWave(3, 14, 0.022, 1.8, `rgba(236, 72, 153, ${waveAlpha * 0.6})`, 1.25); // Magenta espectral

      // 2. Nós e tensores neurais conectados
      const nodeColor = isDark ? 'rgba(56, 189, 248, 0.8)' : 'rgba(30, 58, 138, 0.75)';
      const lineColor = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(30, 58, 138, 0.1)';

      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        if (!prefersReducedMotion) {
          n1.x += n1.vx;
          n1.y += n1.vy;

          if (n1.x < 0 || n1.x > width) n1.vx *= -1;
          if (n1.y < 0 || n1.y > height) n1.vy *= -1;
        }

        // Conectar vizinhos próximos
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.lineWidth = (1 - dist / 110) * 1.2;
            ctx.strokeStyle = lineColor;
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Desenhar nó com pulso de fase
        const pulse = Math.sin(time * 2 + n1.pulseOffset) * 0.5 + 0.5;
        const radius = n1.radius + pulse * 1.2;

        ctx.beginPath();
        ctx.arc(n1.x, n1.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animFrameId = requestAnimationFrame(render);
      }
    }

    // Otimização: Pausar com IntersectionObserver quando sair da viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible && !prefersReducedMotion) {
            cancelAnimationFrame(animFrameId);
            render();
          } else {
            cancelAnimationFrame(animFrameId);
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas.parentElement || canvas);

    window.addEventListener('resize', () => {
      resize();
      if (prefersReducedMotion) render();
    }, { passive: true });

    canvas.parentElement.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }, { passive: true });

    canvas.parentElement.addEventListener('pointerleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    }, { passive: true });

    resize();
    render();
  }

  /* ==============================================================
     2. LABORATÓRIO INTERATIVO: VISÃO COMPUTACIONAL & DSP
     ============================================================== */
  function initDspShowcase() {
    const container = document.getElementById('dsp-showcase');
    if (!container) return;

    const originalCanvas = document.getElementById('dsp-canvas-original');
    const processedCanvas = document.getElementById('dsp-canvas-processed');
    const histCanvas = document.getElementById('dsp-histogram-canvas');
    const sliderDivider = document.getElementById('dsp-slider-divider');
    const sliderContainer = document.getElementById('dsp-comparison-container');
    const kernelMatrixDisplay = document.getElementById('dsp-kernel-matrix');
    const buttons = document.querySelectorAll('[data-dsp-filter]');

    if (!originalCanvas || !processedCanvas || !histCanvas) return;

    const origCtx = originalCanvas.getContext('2d');
    const procCtx = processedCanvas.getContext('2d');
    const histCtx = histCanvas.getContext('2d');

    const KERNELS = {
      original: {
        name: 'Original (Identidade)',
        matrix: [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0]
        ],
        divisor: 1,
        offset: 0
      },
      sobel: {
        name: 'Sobel (Magnitude de Gradiente ∇I)',
        matrix: [
          [-1, 0, 1],
          [-2, 0, 2],
          [-1, 0, 1]
        ],
        divisor: 1,
        offset: 0,
        isSobel: true
      },
      laplace: {
        name: 'Laplaciano / Nitidez (High-Pass)',
        matrix: [
          [ 0, -1,  0],
          [-1,  5, -1],
          [ 0, -1,  0]
        ],
        divisor: 1,
        offset: 0
      },
      gaussian: {
        name: 'Filtro Passa-Baixas Gaussiano 3×3',
        matrix: [
          [1, 2, 1],
          [2, 4, 2],
          [1, 2, 1]
        ],
        divisor: 16,
        offset: 0
      },
      threshold: {
        name: 'Limiarização Binária (Otsu Threshold)',
        matrix: [
          [0, 0, 0],
          [0, 1, 0],
          [0, 0, 0]
        ],
        divisor: 1,
        offset: 0,
        isThreshold: true
      }
    };

    let activeFilter = 'sobel';
    let splitPercent = 50;
    let sourceImage = new Image();
    let isDragging = false;

    // Gerar imagem padrão sintética de teste caso a imagem local falhe
    function createSyntheticSignalPattern() {
      const w = 480;
      const h = 320;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tCtx = tempCanvas.getContext('2d');

      // Gradiente suave de fundo
      const grad = tCtx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      tCtx.fillStyle = grad;
      tCtx.fillRect(0, 0, w, h);

      // Grid cartesiano de sinal
      tCtx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      tCtx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        tCtx.beginPath();
        tCtx.moveTo(x, 0);
        tCtx.lineTo(x, h);
        tCtx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        tCtx.beginPath();
        tCtx.moveTo(0, y);
        tCtx.lineTo(w, y);
        tCtx.stroke();
      }

      // Alvo circular de alta frequência (anel de resolução espacial)
      tCtx.strokeStyle = '#f8fafc';
      for (let r = 15; r < 90; r += 12) {
        tCtx.beginPath();
        tCtx.arc(w * 0.35, h * 0.5, r, 0, Math.PI * 2);
        tCtx.stroke();
      }

      // Onda senoidal de intensidade
      tCtx.beginPath();
      tCtx.lineWidth = 3;
      tCtx.strokeStyle = '#38bdf8';
      for (let x = 0; x < w; x++) {
        const y = h * 0.5 + Math.sin(x * 0.05) * 45;
        if (x === 0) tCtx.moveTo(x, y);
        else tCtx.lineTo(x, y);
      }
      tCtx.stroke();

      // Rótulo técnico
      tCtx.font = 'bold 16px "JetBrains Mono", monospace';
      tCtx.fillStyle = '#ffffff';
      tCtx.fillText('LaPS — PADRÃO DE SINAL 2D', w * 0.42, 45);

      return tempCanvas;
    }

    function renderKernelMatrix(filterKey) {
      if (!kernelMatrixDisplay) return;
      const k = KERNELS[filterKey] || KERNELS.original;
      let html = '<div class="matrix-grid">';
      for (let r = 0; r < 3; r++) {
        html += '<div class="matrix-row">';
        for (let c = 0; c < 3; c++) {
          const val = k.matrix[r][c];
          html += `<span class="matrix-cell">${val >= 0 ? ' ' + val : val}</span>`;
        }
        html += '</div>';
      }
      html += '</div>';
      if (k.divisor > 1) {
        html += `<div class="matrix-scale">× 1/${k.divisor}</div>`;
      }
      kernelMatrixDisplay.innerHTML = html;
    }

    function applyConvolution(srcData, filterKey) {
      const w = srcData.width;
      const h = srcData.height;
      const src = srcData.data;
      const out = procCtx.createImageData(w, h);
      const dst = out.data;

      const k = KERNELS[filterKey] || KERNELS.original;

      if (filterKey === 'original') {
        dst.set(src);
        return out;
      }

      if (k.isThreshold) {
        // Cálculo do limiar médio de Otsu simplificado
        let sum = 0;
        const totalPixels = w * h;
        for (let i = 0; i < src.length; i += 4) {
          sum += (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);
        }
        const threshold = sum / totalPixels;

        for (let i = 0; i < src.length; i += 4) {
          const lum = src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114;
          const val = lum >= threshold ? 255 : 0;
          dst[i] = val;
          dst[i + 1] = val;
          dst[i + 2] = val;
          dst[i + 3] = 255;
        }
        return out;
      }

      if (k.isSobel) {
        const gxKernel = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const gyKernel = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            let gx = 0;
            let gy = 0;

            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const idx = ((y + ky) * w + (x + kx)) * 4;
                const gray = src[idx] * 0.299 + src[idx + 1] * 0.587 + src[idx + 2] * 0.114;
                gx += gray * gxKernel[ky + 1][kx + 1];
                gy += gray * gyKernel[ky + 1][kx + 1];
              }
            }

            const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy));
            const outIdx = (y * w + x) * 4;
            dst[outIdx] = mag;
            dst[outIdx + 1] = mag;
            dst[outIdx + 2] = mag;
            dst[outIdx + 3] = 255;
          }
        }
        return out;
      }

      // Convolução 2D padrão 3x3
      const m = k.matrix;
      const div = k.divisor || 1;
      const off = k.offset || 0;

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let r = 0, g = 0, b = 0;

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * w + (x + kx)) * 4;
              const weight = m[ky + 1][kx + 1];
              r += src[idx] * weight;
              g += src[idx + 1] * weight;
              b += src[idx + 2] * weight;
            }
          }

          const outIdx = (y * w + x) * 4;
          dst[outIdx] = Math.min(255, Math.max(0, r / div + off));
          dst[outIdx + 1] = Math.min(255, Math.max(0, g / div + off));
          dst[outIdx + 2] = Math.min(255, Math.max(0, b / div + off));
          dst[outIdx + 3] = 255;
        }
      }

      return out;
    }

    function drawHistogram(imageData) {
      const bins = new Uint32Array(256);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const lum = Math.floor(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        bins[lum]++;
      }

      let maxCount = 1;
      for (let i = 0; i < 256; i++) {
        if (bins[i] > maxCount) maxCount = bins[i];
      }

      const hw = histCanvas.width;
      const hh = histCanvas.height;
      histCtx.clearRect(0, 0, hw, hh);

      // Fundo escuro elegante para o histograma
      histCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      histCtx.fillRect(0, 0, hw, hh);

      // Linhas de grade
      histCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      histCtx.lineWidth = 1;
      for (let y = 0; y < hh; y += hh / 4) {
        histCtx.beginPath();
        histCtx.moveTo(0, y);
        histCtx.lineTo(hw, y);
        histCtx.stroke();
      }

      // Curva e barras do histograma
      const barWidth = hw / 256;
      const grad = histCtx.createLinearGradient(0, hh, 0, 0);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.85)');

      histCtx.fillStyle = grad;
      histCtx.beginPath();
      histCtx.moveTo(0, hh);

      for (let i = 0; i < 256; i++) {
        const barHeight = (bins[i] / maxCount) * (hh - 12);
        const x = i * barWidth;
        const y = hh - barHeight;
        histCtx.lineTo(x, y);
      }
      histCtx.lineTo(hw, hh);
      histCtx.closePath();
      histCtx.fill();

      // Traço de contorno
      histCtx.strokeStyle = '#38bdf8';
      histCtx.lineWidth = 1.5;
      histCtx.beginPath();
      for (let i = 0; i < 256; i++) {
        const barHeight = (bins[i] / maxCount) * (hh - 12);
        const x = i * barWidth;
        const y = hh - barHeight;
        if (i === 0) histCtx.moveTo(x, y);
        else histCtx.lineTo(x, y);
      }
      histCtx.stroke();
    }

    function updateSplitView() {
      if (!sliderDivider || !sliderContainer) return;
      sliderDivider.style.left = splitPercent + '%';
      if (processedCanvas) {
        processedCanvas.style.clipPath = `polygon(${splitPercent}% 0, 100% 0, 100% 100%, ${splitPercent}% 100%)`;
      }
    }

    function processCurrentFilter() {
      const w = originalCanvas.width;
      const h = originalCanvas.height;
      if (w === 0 || h === 0) return;

      const srcData = origCtx.getImageData(0, 0, w, h);
      const filtered = applyConvolution(srcData, activeFilter);
      procCtx.putImageData(filtered, 0, 0);
      drawHistogram(filtered);
      renderKernelMatrix(activeFilter);
      updateSplitView();
    }

    function loadSource(imgElement) {
      const maxWidth = 560;
      const aspect = imgElement.height > 0 ? imgElement.width / imgElement.height : 1.5;
      const renderW = Math.min(maxWidth, imgElement.width || 480);
      const renderH = Math.round(renderW / aspect);

      [originalCanvas, processedCanvas].forEach((c) => {
        c.width = renderW;
        c.height = renderH;
      });

      histCanvas.width = renderW;
      histCanvas.height = 110;

      origCtx.drawImage(imgElement, 0, 0, renderW, renderH);
      processCurrentFilter();
    }

    // Carregar imagem de laboratório
    sourceImage.crossOrigin = 'anonymous';
    sourceImage.onload = () => loadSource(sourceImage);
    sourceImage.onerror = () => {
      const synthetic = createSyntheticSignalPattern();
      loadSource(synthetic);
    };
    sourceImage.src = 'assets/img/open-image-processing.png';

    // Interatividade com os botões de filtro
    buttons.forEach((btn) => {
      btn.addEventListener('click', function () {
        buttons.forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
        activeFilter = this.getAttribute('data-dsp-filter') || 'original';
        processCurrentFilter();
      });
    });

    // Slider Before / After usando PointerEvents (unificado mouse + toque suave)
    if (sliderContainer) {
      function onPointerMove(e) {
        if (!isDragging) return;
        const rect = sliderContainer.getBoundingClientRect();
        const clientX = e.clientX;
        let p = ((clientX - rect.left) / rect.width) * 100;
        p = Math.max(0, Math.min(100, p));
        splitPercent = p;
        updateSplitView();
      }

      function onPointerUp(e) {
        if (!isDragging) return;
        isDragging = false;
        try {
          sliderContainer.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      sliderContainer.addEventListener('pointerdown', (e) => {
        isDragging = true;
        try {
          sliderContainer.setPointerCapture(e.pointerId);
        } catch (_) {}
        onPointerMove(e);
      });

      sliderContainer.addEventListener('pointermove', onPointerMove);
      sliderContainer.addEventListener('pointerup', onPointerUp);
      sliderContainer.addEventListener('pointercancel', onPointerUp);
    }
  }

  // Inicialização no DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initHeroCanvas();
      initDspShowcase();
    });
  } else {
    initHeroCanvas();
    initDspShowcase();
  }
})();
