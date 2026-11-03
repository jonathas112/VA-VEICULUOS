import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Printer, Copy, Check, FileText, 
  ShieldCheck, AlertTriangle, Lock
} from 'lucide-react';
import { Vehicle, FormerOwner, Sale, StoreProfile, ContractTemplate, UserRole } from '../../types';
import { renderTemplate } from '../../utils/templateEngine';
import { printA4Document } from '../../utils/printDocument';
import { LetterheadA4Sheet } from '../common/LetterheadA4Sheet';

interface ContractsAndReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ContractTemplate[];
  store: StoreProfile;
  vehicle: Vehicle;
  owner?: FormerOwner;
  sale?: Sale;
  userRole?: UserRole;
  defaultTemplateId?: string;
}

export const ContractsAndReceiptsModal: React.FC<ContractsAndReceiptsModalProps> = ({
  isOpen,
  onClose,
  templates,
  store,
  vehicle,
  owner,
  sale,
  userRole,
  defaultTemplateId
}) => {
  const effectiveRole: UserRole = userRole ?? 'vendedor';
  const isGestor = effectiveRole === 'gestor';

  // Filtra minutas por RBAC e por conformidade jurídica (impede emitir contrato contraditório à venda)
  const availableTemplates = useMemo(() => {
    return templates.filter(t => {
      if (!isGestor && t.tipo === 'recibo_compra') {
        return false;
      }
      if (sale) {
        if (sale.isRepasseSemGarantia && t.tipo === 'garantia') {
          return false;
        }
        if (!sale.isRepasseSemGarantia && t.tipo === 'repasse') {
          return false;
        }
      }
      return true;
    });
  }, [templates, isGestor, sale]);

  const preferredTemplateId = useMemo(() => {
    if (defaultTemplateId && availableTemplates.some(t => t.id === defaultTemplateId)) {
      return defaultTemplateId;
    }
    if (sale) {
      if (sale.tipoContratoId && availableTemplates.some(t => t.id === sale.tipoContratoId)) {
        return sale.tipoContratoId;
      }
      const targetKind = sale.isRepasseSemGarantia ? 'repasse' : 'garantia';
      return availableTemplates.find(t => t.tipo === targetKind)?.id || availableTemplates[0]?.id || '';
    }
    const stockKind = vehicle?.categoriaComercial === 'repasse' ? 'repasse' : 'garantia';
    return availableTemplates.find(t => t.tipo === stockKind)?.id || availableTemplates[0]?.id || '';
  }, [defaultTemplateId, availableTemplates, sale, vehicle?.categoriaComercial]);

  const [selectedTemplateId, setSelectedTemplateId] = useState(preferredTemplateId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedTemplateId(preferredTemplateId);
  }, [isOpen, preferredTemplateId, vehicle?.id, sale?.id]);

  if (!isOpen || !vehicle) return null;

  const currentTemplate = availableTemplates.find(t => t.id === selectedTemplateId) || availableTemplates[0];

  const renderedContent = renderTemplate(currentTemplate?.conteudo || '', {
    store,
    vehicle,
    owner,
    sale,
    userRole: effectiveRole
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    printA4Document({
      title: `${currentTemplate?.titulo || 'Documento Oficial'} - ${vehicle.placa}`,
      elementId: 'printable-document',
      paperConfig: store.papelTimbrado
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[16px] w-full max-w-4xl overflow-hidden shadow-2xl relative text-[#F5F5F5] my-6 flex flex-col max-h-[92vh]">
        
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-[#2D2D32] flex items-center justify-between bg-[#080809] no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-amber-500 flex items-center justify-center text-neutral-950 font-bold shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F5F5] font-display">
                Emissão de Contratos & Recibos Oficiais
              </h3>
              <p className="text-[11px] text-[#A7A7AB]">
                {vehicle.marca} {vehicle.modelo} ({vehicle.placa}) · VA Veículos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] border border-[#2D2D32] text-xs font-medium text-[#CAC9CA] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar texto"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-[8px] bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Folha A4
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] text-[#CAC9CA] hover:text-white flex items-center justify-center ml-2 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Template Selector Bar + Legal Regime Lock Indicator */}
        <div className="px-6 py-3 bg-neutral-950/60 border-b border-neutral-800 space-y-2 no-print">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">Modelo:</span>
            <div className="flex gap-1.5">
              {availableTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    currentTemplate?.id === t.id
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700'
                  }`}
                >
                  {t.tipo === 'garantia' && <ShieldCheck className="w-3.5 h-3.5" />}
                  {t.tipo === 'repasse' && <AlertTriangle className="w-3.5 h-3.5" />}
                  {t.tipo.includes('recibo') && <FileText className="w-3.5 h-3.5" />}
                  {t.titulo}
                </button>
              ))}
            </div>
          </div>

          {sale ? (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] ${
                sale.isRepasseSemGarantia
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                <strong>Trava de Conformidade Jurídica Ativa:</strong> Venda registrada sob regime de{' '}
                <strong>
                  {sale.isRepasseSemGarantia
                    ? 'Repasse Comercial (Sem Garantia / No Estado)'
                    : 'Garantia Legal de 90 Dias (CDC — Motor e Câmbio)'}
                </strong>
                . Minutas contraditórias estão bloqueadas para esta operação.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
              <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Minuta Pré-Venda (Veículo em Estoque):</strong> Campos do comprador são impressos com linhas formais de preenchimento manual sem tags residuais.
              </span>
            </div>
          )}
        </div>

        {/* Document Content View - Folha A4 Timbrada Paginada sem altura forçada de 297mm */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-neutral-950/95 flex justify-center items-start">
          <LetterheadA4Sheet
            id="printable-document"
            store={store}
            documentTitle={currentTemplate?.titulo}
            renderedContent={renderedContent}
            sale={sale}
            owner={owner}
          />
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 no-print">
          <span>* Documento oficial gerado e formatado no padrão A4 timbrado da {store.nomeFantasia || 'VA Veículos'}.</span>
          <span>{store.nomeFantasia || 'VA Veículos'} · {store.cidade} - {store.estado}</span>
        </div>

      </div>
    </div>
  );
};
