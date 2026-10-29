import React, { useState } from 'react';
import { 
  X, Printer, Copy, Check, FileText, Download, 
  Eye, RefreshCw, ShieldCheck, AlertTriangle 
} from 'lucide-react';
import { Vehicle, FormerOwner, Sale, StoreProfile, ContractTemplate } from '../../types';
import { renderTemplate } from '../../utils/templateEngine';
import { printA4Document } from '../../utils/printDocument';

interface ContractsAndReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ContractTemplate[];
  store: StoreProfile;
  vehicle: Vehicle;
  owner?: FormerOwner;
  sale?: Sale;
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
  defaultTemplateId
}) => {
  const availableTemplates = templates.filter(t => {
    if (!sale && (t.tipo === 'garantia' || t.tipo === 'repasse' || t.tipo === 'recibo_venda')) {
      return true;
    }
    return true;
  });

  const initialTemplateId = defaultTemplateId || availableTemplates[0]?.id || templates[0]?.id;
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !vehicle) return null;

  const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  const renderedContent = renderTemplate(currentTemplate?.conteudo || '', {
    store,
    vehicle,
    owner,
    sale
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    printA4Document({
      title: `${currentTemplate?.titulo || 'Documento Oficial'} - ${vehicle.placa}`,
      elementId: 'printable-document'
    });
  };

  const paperConfig = store.papelTimbrado;

  const headerAlignClass = paperConfig?.headerAlignment === 'left' 
    ? 'text-left' 
    : paperConfig?.headerAlignment === 'right' 
      ? 'text-right' 
      : 'text-center';

  const headerJustifyClass = paperConfig?.headerAlignment === 'left' 
    ? 'justify-start' 
    : paperConfig?.headerAlignment === 'right' 
      ? 'justify-end' 
      : 'justify-center';

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

        {/* Template Selector Bar */}
        <div className="px-6 py-3 bg-neutral-950/60 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto no-print">
          <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">Modelo:</span>
          <div className="flex gap-1.5">
            {availableTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  selectedTemplateId === t.id
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

        {/* Document Content View - Folha A4 Timbrada */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-neutral-950/95 flex justify-center items-start">
          
          <div 
            id="printable-document"
            className="bg-white text-neutral-900 p-8 sm:p-14 rounded-xl shadow-2xl max-w-3xl w-full text-xs sm:text-sm leading-relaxed border border-neutral-300 relative min-h-[297mm] h-auto my-2"
            style={{
              fontFamily: paperConfig?.fontFamily || 'Inter, sans-serif'
            }}
          >
            {/* Cabeçalho Oficial Timbrado */}
            <div className={`border-b-2 border-neutral-800 pb-4 mb-6 ${headerAlignClass}`}>
              {store.logoUrl ? (
                <div className={`flex ${headerJustifyClass} mb-2`}>
                  <img 
                    src={store.logoUrl} 
                    alt={store.nomeFantasia} 
                    style={{ height: `${paperConfig?.logoHeightPx || 55}px` }}
                    className="object-contain" 
                  />
                </div>
              ) : (
                <h1 className="text-lg font-black tracking-widest text-neutral-950 uppercase font-display">
                  {store.nomeFantasia || 'VA VEÍCULOS'}
                </h1>
              )}

              <div className="text-[10px] text-neutral-600 space-y-0.5 leading-tight">
                <p className="font-semibold text-neutral-800">{store.razaoSocial}</p>
                {paperConfig?.mostrarCnpj !== false && (
                  <p>CNPJ: {store.cnpj}</p>
                )}
                {paperConfig?.mostrarEndereco !== false && (
                  <p>{store.endereco}, {store.cidade} - {store.estado} · CEP: {store.cep}</p>
                )}
                {paperConfig?.mostrarTelefones !== false && (
                  <p>Telefone: {store.telefone} · WhatsApp: {store.whatsapp}</p>
                )}
              </div>
            </div>

            {/* Título do Documento */}
            <div className="text-center mb-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider border-b-2 border-neutral-900 pb-1.5 inline-block text-neutral-950">
                {currentTemplate?.titulo}
              </h2>
            </div>

            {/* Conteúdo Renderizado */}
            <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-justify text-neutral-900 font-normal">
              {renderedContent}
            </div>

            {/* Linhas de Assinatura */}
            {paperConfig?.mostrarLinhasAssinatura !== false && !renderedContent.includes('______') && (
              <div className="mt-12 pt-6 border-t border-neutral-300 grid grid-cols-2 gap-8 text-center text-xs text-neutral-900 signature-block">
                <div>
                  <div className="border-t border-neutral-700 pt-1 mt-8 font-semibold">
                    {store.nomeFantasia}
                  </div>
                  <p className="text-[10px] text-neutral-500">Representante Legal</p>
                </div>
                <div>
                  <div className="border-t border-neutral-700 pt-1 mt-8 font-semibold">
                    {sale ? sale.clienteNome : (owner ? owner.nome : 'Cliente')}
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    CPF: {sale ? sale.clienteCpf : (owner ? owner.cpf : '000.000.000-00')}
                  </p>
                </div>
              </div>
            )}

            {/* Rodapé Oficial Timbrado */}
            <div className="mt-10 pt-3 border-t border-neutral-200 text-center text-[9px] text-neutral-500 footer-block">
              {paperConfig?.textoRodape || `${store.nomeFantasia} · ${store.cidade} - ${store.estado} · WhatsApp: ${store.whatsapp}`}
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 no-print">
          <span>* Documento oficial gerado e formatado no padrão timbrado da VA Veículos.</span>
          <span>VA Veículos · Areial - PB</span>
        </div>

      </div>
    </div>
  );
};
