import React, { useState } from 'react';
import { 
  FileText, Printer, Copy, Check, 
  ShieldCheck, FileSignature, Layers
} from 'lucide-react';
import { ContractTemplate, StoreProfile, Vehicle, FormerOwner, Sale } from '../../types';
import { PageHeader, KpiCard, UnderlineTabs, formStyles } from '../common/DesignSystem';
import { renderTemplate } from '../../utils/templateEngine';
import { printA4Document } from '../../utils/printDocument';

interface DocumentsViewProps {
  templates: ContractTemplate[];
  store: StoreProfile;
  vehicles: Vehicle[];
  owners: FormerOwner[];
  sales: Sale[];
  onOpenContractModal?: (vehicle: Vehicle, sale?: Sale, templateId?: string) => void;
  onUpdateTemplate: (template: ContractTemplate) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  templates,
  store,
  vehicles,
  owners,
  sales,
  onUpdateTemplate
}) => {
  const [activeTab, setActiveTab] = useState<'gerador' | 'modelos'>('gerador');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [selectedSaleId, setSelectedSaleId] = useState<string>(sales[0]?.id || '');
  
  // Model editor state
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate>(templates[0] || {} as ContractTemplate);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
      setEditingTemplate(templates[0]);
    }
  }, [templates, selectedTemplateId]);

  React.useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  // Derive objects
  const currentTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
  const currentSale = sales.find(s => s.id === selectedSaleId) || (currentVehicle ? sales.find(s => s.veiculoId === currentVehicle.id) : undefined);
  const currentOwner = currentVehicle ? owners.find(o => o.id === currentVehicle.antigoDonoId) : undefined;

  // Live preview text
  const renderedContent = (currentTemplate && currentVehicle)
    ? renderTemplate(currentTemplate.conteudo || '', {
        store,
        vehicle: currentVehicle,
        owner: currentOwner,
        sale: currentSale
      })
    : 'Selecione um documento e um veículo cadastrado para gerar o termo.';

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    printA4Document({
      title: `${currentTemplate?.titulo || 'Documento Oficial'} - ${currentVehicle?.modelo || ''}`,
      elementId: 'documents-view-sheet'
    });
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTemplate(editingTemplate);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const tabs = [
    { id: 'gerador', label: 'Central de Emissão & Impressão', count: templates.length },
    { id: 'modelos', label: 'Editor de Minutas Jurídicas', count: templates.length }
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header */}
      <PageHeader
        breadcrumb="Gestão • Documentação Legal"
        title="Documentos & Contratos Oficiais"
        subtitle="Emissão instantânea de recibos de compra, contratos de garantia legal de 90 dias e termos de repasse no estado."
      />

      {/* 2. KPIs de Documentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Minutas Prontas"
          value={templates.length}
          icon={FileText}
          subtext="Contratos, recibos e termos"
        />
        <KpiCard
          title="Veículos Disponíveis"
          value={vehicles.length}
          icon={Layers}
          subtext="Prontos para vínculo documental"
        />
        <KpiCard
          title="Vendas Registradas"
          value={sales.length}
          icon={FileSignature}
          subtext="Contratos gerados e arquivados"
          isRedHighlight={true}
        />
        <KpiCard
          title="Validade Jurídica"
          value="100% CDC"
          icon={ShieldCheck}
          subtext="Conforme Código Defesa Consumidor"
        />
      </div>

      {/* 3. Underline Tabs */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
      />

      {/* 4. Tab 1: Emissão e Impressão de Documentos */}
      {activeTab === 'gerador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Coluna Esquerda: Seletor de parâmetros */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Escolha do Modelo */}
            <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#2D2D32]">
                <FileText className="w-4 h-4 text-[#D4130D]" />
                <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider font-display">
                  1. Selecione o Tipo de Documento
                </h3>
              </div>

              <div className="space-y-2">
                {templates.map(tmpl => {
                  const isSelected = tmpl.id === selectedTemplateId;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`w-full text-left p-3 rounded-[8px] border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#202024] border-[#D4130D] text-[#F5F5F5] shadow-sm'
                          : 'bg-transparent border-[#2D2D32]/60 hover:bg-[#202024]/50 text-[#A7A7AB]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{tmpl.titulo}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#D4130D]" />}
                      </div>
                      <p className="text-[11px] text-[#68686E] line-clamp-1 mt-0.5">
                        {tmpl.descricao}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Escolha do Veículo e Dados */}
            <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#2D2D32]">
                <FileSignature className="w-4 h-4 text-[#D4130D]" />
                <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider font-display">
                  2. Dados do Veículo & Vínculo
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={formStyles.label}>Veículo Associado</label>
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      setSelectedVehicleId(e.target.value);
                      const matchingSale = sales.find(s => s.veiculoId === e.target.value);
                      if (matchingSale) setSelectedSaleId(matchingSale.id);
                    }}
                    className={formStyles.select}
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.marca} {v.modelo} ({v.placa}) - {v.status === 'vendido' ? '[Vendido]' : '[Estoque]'}
                      </option>
                    ))}
                  </select>
                </div>

                {sales.length > 0 && (
                  <div>
                    <label className={formStyles.label}>Registro de Venda (Comprador)</label>
                    <select
                      value={selectedSaleId}
                      onChange={(e) => setSelectedSaleId(e.target.value)}
                      className={formStyles.select}
                    >
                      {sales.map(s => {
                        const veh = vehicles.find(v => v.id === s.veiculoId);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.clienteNome} • {veh?.modelo} ({veh?.placa})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {currentVehicle && (
                <div className="pt-3 border-t border-[#2D2D32] text-xs space-y-1 text-[#A7A7AB]">
                  <div><strong className="text-[#CAC9CA]">Chassi:</strong> {currentVehicle.chassi}</div>
                  <div><strong className="text-[#CAC9CA]">Renavam:</strong> {currentVehicle.renavam}</div>
                  {currentOwner && (
                    <div><strong className="text-[#CAC9CA]">Antigo Dono:</strong> {currentOwner.nome}</div>
                  )}
                  {currentSale && (
                    <div><strong className="text-[#CAC9CA]">Comprador:</strong> {currentSale.clienteNome}</div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Coluna Direita: Pré-visualização do Documento e Impressão */}
          <div className="lg:col-span-8 bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-6 flex flex-col min-h-[600px]">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#2D2D32]">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] font-display">
                  {currentTemplate?.titulo}
                </h3>
                <p className="text-[11px] text-[#A7A7AB]">
                  Documento pronto para impressão ou cópia de texto com assinaturas.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] border border-[#2D2D32] text-xs font-medium text-[#CAC9CA] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir PDF</span>
                </button>
              </div>
            </div>

            {/* Document Sheet Simulation */}
            <div 
              id="documents-view-sheet" 
              className="flex-1 mt-5 bg-white text-neutral-900 rounded-[8px] p-6 sm:p-10 shadow-lg border border-neutral-300 leading-relaxed text-xs sm:text-sm select-text max-h-[70vh] overflow-y-auto"
            >
              {/* Cabeçalho Oficial Timbrado */}
              <div className="border-b-2 border-neutral-800 pb-3 mb-4 text-center">
                <h2 className="text-base font-extrabold text-neutral-900 uppercase font-display">
                  {store.nomeFantasia || 'VA VEÍCULOS'}
                </h2>
                <p className="text-[10px] text-neutral-600 font-medium">
                  {store.razaoSocial} • CNPJ: {store.cnpj}
                </p>
                <p className="text-[10px] text-neutral-500">
                  {store.endereco}, {store.cidade} - {store.estado} • WhatsApp: {store.whatsapp}
                </p>
              </div>

              {/* Título do Modelo */}
              <div className="text-center mb-4">
                <h3 className="font-bold text-xs uppercase tracking-wide border-b-2 border-neutral-900 pb-1 inline-block text-neutral-900">
                  {currentTemplate?.titulo}
                </h3>
              </div>

              {/* Conteúdo Renderizado */}
              <div className="whitespace-pre-wrap text-justify text-neutral-900 font-normal">
                {renderedContent}
              </div>

              {/* Rodapé Timbrado */}
              <div className="mt-8 pt-3 border-t border-neutral-200 text-center text-[9px] text-neutral-500 footer-block">
                {store.nomeFantasia} • Documento Oficial • {store.cidade} - {store.estado} • WhatsApp: {store.whatsapp}
              </div>
            </div>

            {/* Document Notice Footer */}
            <div className="mt-4 pt-3 border-t border-[#2D2D32] flex items-center justify-between text-[11px] text-[#A7A7AB]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                <span>Minuta validada juridicamente para revendas automotivas</span>
              </div>
              <span>{store.nomeFantasia} • Sistema VA Veículos</span>
            </div>

          </div>

        </div>
      )}

      {/* 5. Tab 2: Editor de Minutas Jurídicas */}
      {activeTab === 'modelos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Lista de Modelos */}
          <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-4 space-y-2 h-fit">
            <h3 className="text-xs font-bold text-[#A7A7AB] uppercase tracking-wider px-2 py-1">
              Selecione o Modelo para Editar
            </h3>
            {templates.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditingTemplate({ ...t })}
                className={`w-full text-left p-3 rounded-[8px] transition-colors cursor-pointer border ${
                  editingTemplate.id === t.id
                    ? 'bg-[#202024] border-[#D4130D] text-[#F5F5F5]'
                    : 'bg-transparent border-transparent hover:bg-[#202024]/60 text-[#A7A7AB]'
                }`}
              >
                <div className="text-xs font-bold">{t.titulo}</div>
                <div className="text-[11px] text-[#68686E] truncate mt-0.5">{t.descricao}</div>
              </button>
            ))}
          </div>

          {/* Editor da Minuta */}
          <div className="lg:col-span-2 bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D2D32]">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] font-display">
                  Editor de Minuta: {editingTemplate.titulo}
                </h3>
                <p className="text-[11px] text-[#A7A7AB]">
                  As variáveis como {'{NOME_CLIENTE}'}, {'{PLACA}'}, {'{VALOR_VENDA}'} são preenchidas dinamicamente na impressão.
                </p>
              </div>

              {savedSuccess && (
                <span className="text-xs text-[#22C55E] flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Salvo com Sucesso!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className={formStyles.label}>Título do Documento</label>
                <input
                  type="text"
                  value={editingTemplate.titulo}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, titulo: e.target.value })}
                  className={formStyles.input}
                  required
                />
              </div>

              <div>
                <label className={formStyles.label}>Finalidade do Documento</label>
                <input
                  type="text"
                  value={editingTemplate.descricao}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, descricao: e.target.value })}
                  className={formStyles.input}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={formStyles.label}>Texto da Minuta Jurídica</label>
                  <span className="text-[10px] text-[#A7A7AB]">
                    Tags: {'{NOME_LOJA}'}, {'{CNPJ}'}, {'{PLACA}'}, {'{MARCA}'}, {'{MODELO}'}, {'{NOME_CLIENTE}'}, {'{VALOR_VENDA}'}
                  </span>
                </div>
                <textarea
                  rows={14}
                  value={editingTemplate.conteudo}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, conteudo: e.target.value })}
                  className={`${formStyles.input} font-mono text-xs leading-relaxed`}
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#2D2D32] flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Salvar Alterações da Minuta
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

    </div>
  );
};
