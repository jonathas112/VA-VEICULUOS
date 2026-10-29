/**
 * Utilitário de Impressão Oficial de Documentos A4 para VA Veículos.
 * Evita bugs clássicos de impressão do Chromium (folhas em branco, overflow cortado,
 * quebras de página inadequadas em modais com overflow e fixed).
 */

export interface PrintA4Options {
  title?: string;
  elementId?: string;
  htmlContent?: string;
}

export function printA4Document(options: PrintA4Options): void {
  const { title = 'Documento Oficial - VA Veículos', elementId, htmlContent } = options;

  let contentToPrint = htmlContent;

  if (!contentToPrint && elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      contentToPrint = el.innerHTML;
    }
  }

  if (!contentToPrint) {
    window.print();
    return;
  }

  // Cria um iframe invisível isolado do DOM principal
  const iframe = document.createElement('iframe');
  iframe.setAttribute(
    'style',
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;opacity:0;pointer-events:none;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 18mm 15mm 18mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #111827 !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 10.5pt;
          line-height: 1.55;
        }
        .printable-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          background: #ffffff !important;
          color: #111827 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .whitespace-pre-wrap {
          white-space: pre-wrap !important;
        }
        .text-justify {
          text-align: justify !important;
        }
        .text-center {
          text-align: center !important;
        }
        .text-left {
          text-align: left !important;
        }
        .text-right {
          text-align: right !important;
        }
        .font-bold {
          font-weight: 700 !important;
        }
        .font-extrabold {
          font-weight: 800 !important;
        }
        .font-semibold {
          font-weight: 600 !important;
        }
        .uppercase {
          text-transform: uppercase !important;
        }
        .border-b-2 {
          border-bottom: 2px solid #111827 !important;
        }
        .border-b {
          border-bottom: 1px solid #d1d5db !important;
        }
        .border-t {
          border-top: 1px solid #d1d5db !important;
        }
        .grid {
          display: grid !important;
        }
        .grid-cols-2 {
          grid-template-columns: 1fr 1fr !important;
        }
        .gap-4 { gap: 1rem !important; }
        .gap-6 { gap: 1.5rem !important; }
        .gap-8 { gap: 2rem !important; }
        .mt-4 { margin-top: 1rem !important; }
        .mt-6 { margin-top: 1.5rem !important; }
        .mt-8 { margin-top: 2rem !important; }
        .mt-10 { margin-top: 2.5rem !important; }
        .mt-12 { margin-top: 3rem !important; }
        .mb-2 { margin-bottom: 0.5rem !important; }
        .mb-4 { margin-bottom: 1rem !important; }
        .mb-6 { margin-bottom: 1.5rem !important; }
        .pt-1 { padding-top: 0.25rem !important; }
        .pt-2 { padding-top: 0.5rem !important; }
        .pt-3 { padding-top: 0.75rem !important; }
        .pt-4 { padding-top: 1rem !important; }
        .pt-6 { padding-top: 1.5rem !important; }
        .pb-1 { padding-bottom: 0.25rem !important; }
        .pb-1\\.5 { padding-bottom: 0.375rem !important; }
        .pb-2 { padding-bottom: 0.5rem !important; }
        .pb-4 { padding-bottom: 1rem !important; }
        .signature-block {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-top: 2.5rem !important;
        }
        .footer-block {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-top: 2rem !important;
        }
        img {
          max-width: 100% !important;
          height: auto !important;
        }
      </style>
    </head>
    <body>
      <div class="printable-wrapper">
        ${contentToPrint}
      </div>
    </body>
    </html>
  `);
  doc.close();

  // Clona os estilos da página atual para suportar Tailwind sem perdas
  try {
    const headStyles = document.querySelectorAll('link[rel="stylesheet"], style');
    headStyles.forEach(styleNode => {
      doc.head.appendChild(styleNode.cloneNode(true));
    });
  } catch (e) {
    // Tratamento seguro caso alguma folha externa seja restrita por CORS
  }

  // Executa impressão assim que os elementos renderizarem
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Remove o iframe do DOM após a impressão
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2500);
  }, 350);
}

