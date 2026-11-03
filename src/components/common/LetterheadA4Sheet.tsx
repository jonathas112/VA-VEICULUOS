import React, { useMemo } from 'react';
import { FormerOwner, Sale, StoreProfile } from '../../types';

interface LetterheadA4SheetProps {
  id: string;
  store: StoreProfile;
  documentTitle?: string;
  renderedContent: string;
  sale?: Sale;
  owner?: FormerOwner;
  compactPreview?: boolean;
}

interface ParsedContractBlocks {
  clauseBlocks: Array<{ heading?: string; body: string }>;
  trailingSignatureText: string | null;
}

/**
 * Divide o texto renderizado em blocos de cláusulas semânticas e isola o bloco final
 * de local/data + assinaturas/testemunhas para aplicar `break-inside: avoid` na folha A4,
 * evitando assinaturas órfãs ou páginas extras em branco.
 */
export function parseContractForPagination(renderedContent: string): ParsedContractBlocks {
  const normalized = (renderedContent || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { clauseBlocks: [], trailingSignatureText: null };
  }

  const rawParagraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

  // Localiza onde começa o bloco final de assinaturas (ou a linha de Local/Data imediatamente anterior a ele)
  let sigStartIdx = rawParagraphs.findIndex(p => /_{5,}/.test(p));
  if (sigStartIdx > 0) {
    const prev = rawParagraphs[sigStartIdx - 1];
    // Se o parágrafo imediatamente anterior é curto (ex: "Areial - PB, 2 de novembro de 2026."), mantém junto às assinaturas
    if (prev.length <= 120 && !/^\d+\./.test(prev)) {
      sigStartIdx -= 1;
    }
  }

  const bodyParagraphs = sigStartIdx >= 0 ? rawParagraphs.slice(0, sigStartIdx) : rawParagraphs;
  const trailingSignatureText = sigStartIdx >= 0 ? rawParagraphs.slice(sigStartIdx).join('\n\n') : null;

  const clauseBlocks = bodyParagraphs.map(paragraph => {
    const lines = paragraph.split('\n');
    const firstLine = lines[0]?.trim() || '';
    const isHeading =
      lines.length > 1 &&
      (/^(\d+\.|INSTRUMENTO\b|RECIBO\b|TERMO\b|IDENTIFICAÇÃO\b|CONDIÇÕES\b|SITUAÇÃO\b|ANTIGO\b|O VEÍCULO\b)/i.test(firstLine) ||
        (firstLine === firstLine.toUpperCase() && firstLine.endsWith(':')));

    if (isHeading) {
      return {
        heading: firstLine,
        body: lines.slice(1).join('\n')
      };
    }
    return { body: paragraph };
  });

  return { clauseBlocks, trailingSignatureText };
}

export const LetterheadA4Sheet: React.FC<LetterheadA4SheetProps> = ({
  id,
  store,
  documentTitle,
  renderedContent,
  sale,
  owner,
  compactPreview = false
}) => {
  const paperConfig = store.papelTimbrado;
  const alignment = paperConfig?.headerAlignment || 'center';

  const headerAlignClass =
    alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center';
  const headerJustifyClass =
    alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';

  const { clauseBlocks, trailingSignatureText } = useMemo(
    () => parseContractForPagination(renderedContent),
    [renderedContent]
  );

  const hasEmbeddedSignatureLines = Boolean(trailingSignatureText && /_{5,}/.test(trailingSignatureText));
  const showFallbackSignatureGrid =
    paperConfig?.mostrarLinhasAssinatura !== false && !hasEmbeddedSignatureLines;

  const counterPartyName = sale?.clienteNome?.trim()
    ? sale.clienteNome
    : owner?.nome?.trim()
      ? owner.nome
      : 'Comprador(a) / Contratante';

  const counterPartyCpf = sale?.clienteCpf?.trim()
    ? sale.clienteCpf
    : owner?.cpf?.trim()
      ? owner.cpf
      : '___.___.___-__';

  return (
    <div
      id={id}
      className={`a4-print-target bg-white text-neutral-900 rounded-xl shadow-2xl border border-neutral-300 w-full ${
        compactPreview ? 'p-6 max-h-[580px] overflow-y-auto' : 'p-6 sm:p-11 max-w-3xl'
      }`}
      style={{
        fontFamily: paperConfig?.fontFamily || 'Inter, sans-serif',
        fontSize: compactPreview
          ? `${Math.max(8, (paperConfig?.fontSizePt || 10) - 0.8)}pt`
          : `${paperConfig?.fontSizePt || 10}pt`,
        lineHeight: 1.5
      }}
    >
      {/* 1. Cabeçalho Oficial Timbrado */}
      <div className={`a4-header border-b-2 border-neutral-900 pb-3 mb-4 ${headerAlignClass}`}>
        {store.logoUrl ? (
          <div className={`a4-header-logo-row flex ${headerJustifyClass} mb-2`}>
            <img
              src={store.logoUrl}
              alt={store.nomeFantasia || 'VA Veículos'}
              style={{ height: `${paperConfig?.logoHeightPx || 56}px` }}
              className="object-contain"
            />
          </div>
        ) : (
          <h1 className="a4-store-title text-base sm:text-lg font-black tracking-widest text-neutral-950 uppercase font-display">
            {store.nomeFantasia || 'VA VEÍCULOS'}
          </h1>
        )}

        <div className="a4-store-meta text-[10px] text-neutral-600 space-y-0.5 leading-tight">
          <p className="font-semibold text-neutral-800">{store.razaoSocial}</p>
          {paperConfig?.mostrarCnpj !== false && <p>CNPJ: {store.cnpj}</p>}
          {paperConfig?.mostrarEndereco !== false && (
            <p>
              {store.endereco}, {store.cidade} - {store.estado}
              {store.cep ? ` · CEP: ${store.cep}` : ''}
            </p>
          )}
          {paperConfig?.mostrarTelefones !== false && (
            <p>
              {store.telefone ? `Telefone: ${store.telefone} · ` : ''}
              WhatsApp: {store.whatsapp}
            </p>
          )}
        </div>
      </div>

      {/* 2. Título Oficial da Minuta */}
      {documentTitle && (
        <div className="a4-doc-title-wrap text-center mb-4">
          <h2 className="a4-doc-title text-xs sm:text-sm font-extrabold uppercase tracking-wider border-b-2 border-neutral-900 pb-1 inline-block text-neutral-950">
            {documentTitle}
          </h2>
        </div>
      )}

      {/* 3. Corpo Contratual Paginado por Cláusulas */}
      <div className="a4-body text-justify text-neutral-900 font-normal space-y-2.5">
        {clauseBlocks.map((block, idx) => (
          <div key={idx} className="a4-clause-group">
            {block.heading && (
              <div className="a4-clause-heading font-bold text-neutral-950 mb-0.5">
                {block.heading}
              </div>
            )}
            <p className="a4-clause-paragraph whitespace-pre-wrap leading-relaxed m-0">
              {block.body}
            </p>
          </div>
        ))}
      </div>

      {/* 4. Bloco Final Indivisível: Local/Data + Assinaturas + Testemunhas + Rodapé */}
      <div className="signature-keep-together mt-5">
        {trailingSignatureText && (
          <div className="a4-text-signatures whitespace-pre-wrap text-left font-normal text-neutral-900 pt-2">
            {trailingSignatureText}
          </div>
        )}

        {showFallbackSignatureGrid && (
          <div className="signature-block mt-8 pt-4 border-t border-neutral-300 grid grid-cols-2 gap-8 text-center text-xs text-neutral-900">
            <div>
              <div className="signature-line border-t border-neutral-700 pt-1 mt-6 font-semibold">
                {store.nomeFantasia || 'VA Veículos'}
              </div>
              <p className="signature-sub text-[10px] text-neutral-500">
                Representante Legal · CNPJ: {store.cnpj}
              </p>
            </div>
            <div>
              <div className="signature-line border-t border-neutral-700 pt-1 mt-6 font-semibold">
                {counterPartyName}
              </div>
              <p className="signature-sub text-[10px] text-neutral-500">CPF: {counterPartyCpf}</p>
            </div>
          </div>
        )}

        <div className="footer-block mt-6 pt-2.5 border-t border-neutral-200 text-center text-[9px] text-neutral-500">
          {paperConfig?.textoRodape ||
            `${store.nomeFantasia || 'VA Veículos'} · Documento Oficial · ${store.cidade} - ${store.estado} · WhatsApp: ${store.whatsapp}`}
        </div>
      </div>
    </div>
  );
};

