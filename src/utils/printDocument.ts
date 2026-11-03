/**
 * Utilitário de Impressão Oficial de Documentos A4 para VA Veículos.
 * - Blindado contra DOM XSS (escapeHtml no <title> + sanitizeDomTree em todos os nós importados).
 * - Paginação A4 limpa sem páginas em branco extras:
 *   * Respeita margens e tipografia configuradas em store.papelTimbrado
 *   * Isola o documento A4 das folhas de estilo dark-mode da aplicação principal
 *   * Aplica orphans/widows, break-after: avoid em títulos de cláusulas e break-inside: avoid
 *     no bloco de assinaturas, testemunhas e rodapé institucional.
 */

import { LetterheadConfig } from '../types';
import { clampNumber } from './formatters';
import { escapeHtml, sanitizeDomTree } from './security';

export interface PrintA4Options {
  title?: string;
  elementId?: string;
  htmlContent?: string;
  paperConfig?: LetterheadConfig;
}

export function buildA4PrintStylesheet(paperConfig?: LetterheadConfig): string {
  const marginTop = Math.round(clampNumber(paperConfig?.marginTopMm, 8, 30, 14));
  const marginBottom = Math.round(clampNumber(paperConfig?.marginBottomMm, 8, 30, 14));
  const marginLeft = Math.round(clampNumber(paperConfig?.marginLeftMm, 10, 30, 16));
  const marginRight = Math.round(clampNumber(paperConfig?.marginRightMm, 10, 30, 16));
  const fontSizePt = clampNumber(paperConfig?.fontSizePt, 8, 12.5, 9.8);
  const rawFont = (paperConfig?.fontFamily || 'Inter, sans-serif').replace(/[<>"';{}]/g, '');

  return `
    @page {
      size: A4 portrait;
      margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
      font-family: ${rawFont}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: ${fontSizePt}pt;
      line-height: 1.48;
      overflow: visible !important;
    }
    .printable-wrapper {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      min-height: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
    }
    .printable-wrapper > *:last-child {
      margin-bottom: 0 !important;
      padding-bottom: 0 !important;
    }
    /* Estrutura do Papel Timbrado A4 */
    .a4-header {
      border-bottom: 2px solid #111827;
      padding-bottom: 8px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .a4-header-logo-row {
      display: flex;
      margin-bottom: 5px;
    }
    .a4-store-title {
      font-size: 14pt;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #09090b;
      margin: 0 0 3px 0;
    }
    .a4-store-meta {
      font-size: 8.2pt;
      color: #374151;
      line-height: 1.35;
    }
    .a4-store-meta p {
      margin: 1px 0;
    }
    .a4-doc-title-wrap {
      text-align: center;
      margin: 0 0 12px 0;
      page-break-after: avoid;
      break-after: avoid;
    }
    .a4-doc-title {
      display: inline-block;
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #09090b;
      border-bottom: 1.5px solid #111827;
      padding-bottom: 3px;
      margin: 0;
    }
    .a4-body {
      color: #111827;
      text-align: justify;
    }
    .a4-clause-group {
      margin: 0 0 8px 0;
      orphans: 3;
      widows: 3;
    }
    .a4-clause-heading {
      font-weight: 700;
      color: #09090b;
      margin: 0 0 2px 0;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .a4-clause-paragraph {
      margin: 0;
      white-space: pre-wrap;
      orphans: 3;
      widows: 3;
    }
    .signature-keep-together {
      margin-top: 14px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .a4-text-signatures {
      white-space: pre-wrap;
      font-size: 9pt;
      line-height: 1.45;
      color: #111827;
      margin-top: 8px;
    }
    .signature-block {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #d1d5db;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      text-align: center;
      font-size: 8.8pt;
    }
    .signature-line {
      border-top: 1px solid #374151;
      padding-top: 4px;
      margin-top: 22px;
      font-weight: 600;
      color: #111827;
    }
    .signature-sub {
      font-size: 7.8pt;
      color: #4b5563;
      margin: 1px 0 0 0;
    }
    .footer-block {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-top: 14px;
      margin-bottom: 0 !important;
      padding-top: 6px;
      padding-bottom: 0 !important;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 7.5pt;
      color: #6b7280;
    }
    /* Utilitários compatíveis */
    .whitespace-pre-wrap { white-space: pre-wrap !important; }
    .text-justify { text-align: justify !important; }
    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .text-right { text-align: right !important; }
    .justify-start { justify-content: flex-start !important; }
    .justify-center { justify-content: center !important; }
    .justify-end { justify-content: flex-end !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-bold { font-weight: 700 !important; }
    .font-extrabold { font-weight: 800 !important; }
    .uppercase { text-transform: uppercase !important; }
    .no-print { display: none !important; }
    img {
      max-width: 100% !important;
      object-fit: contain;
    }
  `;
}

export function printA4Document(options: PrintA4Options): void {
  const { title = 'Documento Oficial - VA Veículos', elementId, htmlContent, paperConfig } = options;

  const sourceEl = elementId ? document.getElementById(elementId) : null;

  if (!sourceEl && !htmlContent) {
    window.print();
    return;
  }

  // Cria um iframe invisível totalmente isolado do DOM e do CSS dark-mode principal
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-same-origin allow-modals');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute(
    'style',
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;opacity:0;pointer-events:none;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
    window.print();
    return;
  }

  const safeTitle = escapeHtml(title);
  const stylesheet = buildA4PrintStylesheet(paperConfig);

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>${stylesheet}</style>
</head>
<body>
  <div id="print-mount" class="printable-wrapper"></div>
</body>
</html>`);
  doc.close();

  const mountNode = doc.getElementById('print-mount');
  if (mountNode) {
    if (sourceEl) {
      const fragment = doc.createDocumentFragment();
      Array.from(sourceEl.childNodes).forEach(child => {
        fragment.appendChild(doc.importNode(child, true));
      });
      sanitizeDomTree(fragment);
      mountNode.appendChild(fragment);
    } else if (htmlContent) {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(htmlContent, 'text/html');
      sanitizeDomTree(parsed.body);
      Array.from(parsed.body.childNodes).forEach(child => {
        mountNode.appendChild(doc.importNode(child, true));
      });
    }
  }

  let hasPrinted = false;
  const triggerPrintOnce = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  };

  // Aguarda carregamento de eventual logotipo base64/URL com fallback rápido offline (200ms)
  const images = Array.from(doc.images || []);
  if (images.length === 0 || images.every(img => img.complete)) {
    setTimeout(triggerPrintOnce, 120);
  } else {
    let remaining = images.length;
    const onImgDone = () => {
      remaining -= 1;
      if (remaining <= 0) setTimeout(triggerPrintOnce, 80);
    };
    images.forEach(img => {
      img.addEventListener('load', onImgDone, { once: true });
      img.addEventListener('error', onImgDone, { once: true });
    });
    setTimeout(triggerPrintOnce, 400);
  }
}
