import React, { useState, useMemo } from 'react';
import { 
  FileText, Printer, Copy, Check, 
  ShieldCheck, FileSignature, Layers, Lock, AlertTriangle
} from 'lucide-react';
import { ContractTemplate, StoreProfile, Vehicle, FormerOwner, Sale, UserRole } from '../../types';
import { PageHeader, KpiCard, UnderlineTabs, formStyles } from '../common/DesignSystem';
import {
  AVAILABLE_MERGE_TAGS,
  renderTemplate,
  findUnknownTemplateTags
} from '../../utils/templateEngine';
import { printA4Document } from '../../utils/printDocument';
import { sanitizeInputText, sanitizeContractText } from '../../utils/security';
import { LetterheadA4Sheet } from '../common/LetterheadA4Sheet';

interface DocumentsViewProps {
  templates: ContractTemplate[];
  store: StoreProfile;
  vehicles: Vehicle[];
  owners: FormerOwner[];
  sales: Sale[];
  userRole?: UserRole;
  onOpenContractModal?: (vehicle: Vehicle, sale?: Sale, templateId?: string) => void;
  onUpdateTemplate: (template: ContractTemplate) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  templates,
  store,
  vehicles,
  owners,
  sales,
  userRole,
  onUpdateTemplate
}) => {
  const effectiveRole: UserRole = userRole ?? 'vendedor';
  const isGestor = effectiveRole === 'gestor';
  const visibleTemplates = React.useMemo(
    () => (isGestor ? templates : templates.filter(t => t.tipo !== 'recibo_compra')),
    [templates, isGestor]
  );

  const initialVehicle = vehicles[0];
  const initialMatchingSale = initialVehicle
    ? sales.find(s => s.veiculoId === initialVehicle.id)
    : undefined;

  const [activeTab, setActiveTab] = useState<'gerador' | 'modelos'>('gerador');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(visibleTemplates[0]?.id || '');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(initialVehicle?.id || '');
  const [selectedSaleId, setSelectedSaleId] = useState<string>(initialMatchingSale?.id || '');
  
  // Model editor state
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate>(templates[0] || {} as ContractTemplate);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!isGestor && activeTab === 'modelos') {
      setActiveTab('gerador');
    }
  }, [isGestor, activeTab]);

  React.useEffect(() => {
    if (visibleTemplates.length > 0 && (!selectedTemplateId || !visibleTemplates.some(t => t.id === selectedTemplateId))) {
      setSelectedTemplateId(visibleTemplates[0].id);
    }
    if (isGestor && !editingTemplate?.id && templates.length > 0) {
      setEditingTemplate(templates[0]);
    }
  }, [visibleTemplates, templates, selectedTemplateId, isGestor, editingTemplate?.id]);

  React.useEffect(() => {
    if (!selectedVehicleId && vehicles.length > 0) {
      const firstVeh = vehicles[0];
      setSelectedVehicleId(firstVeh.id);
      const matchingSale = sales.find(s => s.veiculoId === firstVeh.id);
      setSelectedSaleId(matchingSale ? matchingSale.id : '');
    }
  }, [vehicles, sales, selectedVehicleId]);

  // Derive objects with strict vehicle <-> sale integrity (never cross-bind another vehicle's buyer)
  const currentVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
  const candidateSale = selectedSaleId ? sales.find(s => s.id === selectedSaleId) : undefined;
  const currentSale =
    candidateSale && currentVehicle && candidateSale.veiculoId === currentVehicle.id
      ? candidateSale
      : undefined;
  const currentOwner = currentVehicle ? owners.find(o => o.id === currentVehicle.antigoDonoId) : undefined;

  // Enforce legal modality coherence whenever a finalized sale is linked
  const isTemplateBlockedForSale = React.useCallback(
    (tmpl: ContractTemplate, activeSale?: Sale): boolean => {
      if (!activeSale) return false;
      if (activeSale.isRepasseSemGarantia && tmpl.tipo === 'garantia') return true;
      if (!activeSale.isRepasseSemGarantia && tmpl.tipo === 'repasse') return true;
      return false;
    },
    []
  );

  React.useEffect(() => {
    if (!currentSale) return;
    const activeTmpl = visibleTemplates.find(t => t.id === selectedTemplateId);
    if (activeTmpl && isTemplateBlockedForSale(activeTmpl, currentSale)) {
      const fallback =
        visibleTemplates.find(t => t.id === currentSale.tipoContratoId && !isTemplateBlockedForSale(t, currentSale)) ||
        visibleTemplates.find(t => t.tipo === (currentSale.isRepasseSemGarantia ? 'repasse' : 'garantia')) ||
        visibleTemplates.find(t => !isTemplateBlockedForSale(t, currentSale));
      if (fallback) {
        setSelectedTemplateId(fallback.id);
      }
    }
  }, [currentSale, visibleTemplates, selectedTemplateId, isTemplateBlockedForSale]);

  const currentTemplate =
    visibleTemplates.find(t => t.id === selectedTemplateId && !isTemplateBlockedForSale(t, currentSale)) ||
    visibleTemplates.find(t => !isTemplateBlockedForSale(t, currentSale)) ||
    visibleTemplates[0];

  // Live preview text
  const renderedContent = (currentTemplate && currentVehicle)
    ? renderTemplate(currentTemplate.conteudo || '', {
        store,
        vehicle: currentVehicle,
        owner: currentOwner,
        sale: currentSale,
        userRole: effectiveRole
      })
    : 'Selecione um documento e um veículo cadastrado para gerar o termo.';

  const unknownEditingTags = useMemo(
    () => findUnknownTemplateTags(editingTemplate?.conteudo || ''),
    [editingTemplate?.conteudo]
  );

  const handleVehicleChange = (nextVehicleId: string) => {
    setSelectedVehicleId(nextVehicleId);
    const nextVeh = vehicles.find(v => v.id === nextVehicleId);
    const matchingSale = sales.find(s => s.veiculoId === nextVehicleId);
    setSelectedSaleId(matchingSale ? matchingSale.id : '');

    if (matchingSale) {
      const targetKind = matchingSale.isRepasseSemGarantia ? 'repasse' : 'garantia';
      const preferred =
        visibleTemplates.find(t => t.id === matchingSale.tipoContratoId) ||
        visibleTemplates.find(t => t.tipo === targetKind);
      if (preferred) setSelectedTemplateId(preferred.id);
    } else if (nextVeh) {
      const currentTmpl = visibleTemplates.find(t => t.id === selectedTemplateId);
      if (currentTmpl && (currentTmpl.tipo === 'garantia' || currentTmpl.tipo === 'repasse')) {
        const stockKind = nextVeh.categoriaComercial === 'repasse' ? 'repasse' : 'garantia';
        const preferred = visibleTemplates.find(t => t.tipo === stockKind);
        if (preferred) setSelectedTemplateId(preferred.id);
      }
    }
  };

  const handleSaleChange = (nextSaleId: string) => {
    setSelectedSaleId(nextSaleId);
    if (!nextSaleId) return;
    const chosenSale = sales.find(s => s.id === nextSaleId);
    if (chosenSale) {
      setSelectedVehicleId(chosenSale.veiculoId);
      const targetKind = chosenSale.isRepasseSemGarantia ? 'repasse' : 'garantia';
      const preferred =
        visibleTemplates.find(t => t.id === chosenSale.tipoContratoId) ||
        visibleTemplates.find(t => t.tipo === targetKind);
      if (preferred) setSelectedTemplateId(preferred.id);
    }
  };

  const handleInsertEditingTag = (tag: string) => {
    setEditingTemplate(prev => ({
      ...prev,
      conteudo: `${prev.conteudo || ''}${prev.conteudo && !prev.conteudo.endsWith(' ') ? ' ' : ''}${tag}`
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(renderedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    printA4Document({
      title: `${currentTemplate?.titulo || 'Documento Oficial'} - ${currentVehicle?.placa || currentVehicle?.modelo || ''}`,
      elementId: 'documents-view-sheet',
      paperConfig: store.papelTimbrado
    });
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGestor) return;
    if (!editingTemplate.titulo?.trim() || !editingTemplate.descricao?.trim() || !editingTemplate.conteudo?.trim()) {
      alert('Preencha o título, a finalidade e o texto da minuta jurídica antes de salvar.');
      return;
    }
    const sanitizedTemplate: ContractTemplate = {
      ...editingTemplate,
      titulo: sanitizeInputText(editingTemplate.titulo),
      descricao: sanitizeInputText(editingTemplate.descricao),
      conteudo: sanitizeContractText(editingTemplate.conteudo)
    };
    setEditingTemplate(sanitizedTemplate);
    onUpdateTemplate(sanitizedTemplate);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const tabs = isGestor
    ? [
        { id: 'gerador', label: 'Central de Emissão & Impressão', count: visibleTemplates.length },
        { id: 'modelos', label: 'Editor de Minutas Jurídicas', count: templates.length }
      ]
    : [
        { id: 'gerador', label: 'Central de Emissão & Impressão', count: visibleTemplates.length }
      ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header */}
      <div className="no-print">
        <PageHeader
          breadcrumb="Gestão • Documentação Legal"
          title="Documentos & Contratos Oficiais"
          subtitle="Emissão instantânea de recibos de compra, contratos de garantia legal de 90 dias e termos de repasse no estado."
        />
      </div>

      {/* 2. KPIs de Documentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <KpiCard
          title="Minutas Prontas"
          value={visibleTemplates.length}
          icon={FileText}
          subtext={isGestor ? 'Contratos, recibos e termos' : 'Contratos e termos de venda'}
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
      <div className="no-print">
        <UnderlineTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as any)}
        />
      </div>

      {/* 4. Tab 1: Emissão e Impressão de Documentos */}
      {activeTab === 'gerador' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Coluna Esquerda: Seletor de parâmetros */}
          <div className="lg:col-span-4 space-y-4 no-print">
            
            {/* Escolha do Modelo */}
            <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#2D2D32]">
                <FileText className="w-4 h-4 text-[#D4130D]" />
                <h3 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider font-display">
                  1. Selecione o Tipo de Documento
                </h3>
              </div>

              <div className="space-y-2">
                {visibleTemplates.map(tmpl => {
                  const isBlocked = isTemplateBlockedForSale(tmpl, currentSale);
                  const isSelected = currentTemplate?.id === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => {
                        if (!isBlocked) setSelectedTemplateId(tmpl.id);
                      }}
                      className={`w-full text-left p-3 rounded-[8px] border transition-all ${
                        isBlocked
                          ? 'bg-neutral-950/60 border-neutral-800/60 text-neutral-600 cursor-not-allowed opacity-65'
                          : isSelected
                            ? 'bg-[#202024] border-[#D4130D] text-[#F5F5F5] shadow-sm cursor-pointer'
                            : 'bg-transparent border-[#2D2D32]/60 hover:bg-[#202024]/50 text-[#A7A7AB] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">{tmpl.titulo}</span>
                        {isBlocked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          isSelected && <Check className="w-3.5 h-3.5 text-[#D4130D] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-[#68686E] line-clamp-1 mt-0.5">
                        {isBlocked
                          ? currentSale?.isRepasseSemGarantia
                            ? 'Bloqueado: esta venda foi firmada como Repasse (Sem Garantia).'
                            : 'Bloqueado: esta venda foi firmada com Garantia Legal de 90 Dias.'
                          : tmpl.descricao}
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
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className={formStyles.select}
                  >
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.marca} {v.modelo} ({v.placa}) - {v.status === 'vendido' ? '[Vendido]' : v.categoriaComercial === 'repasse' ? '[Estoque • Repasse]' : '[Estoque • Garantia]'}
                      </option>
                    ))}
                  </select>
                </div>

                {sales.length > 0 && (
                  <div>
                    <label className={formStyles.label}>Registro de Venda (Comprador)</label>
                    <select
                      value={currentSale?.id || ''}
                      onChange={(e) => handleSaleChange(e.target.value)}
                      className={formStyles.select}
                    >
                      <option value="">— Sem venda vinculada (Minuta Pré-Venda / Estoque) —</option>
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
                <div className="pt-3 border-t border-[#2D2D32] text-xs space-y-1.5 text-[#A7A7AB]">
                  <div><strong className="text-[#CAC9CA]">Chassi:</strong> {currentVehicle.chassi}</div>
                  <div><strong className="text-[#CAC9CA]">Renavam:</strong> {currentVehicle.renavam}</div>
                  {currentOwner && (
                    <div><strong className="text-[#CAC9CA]">Antigo Dono:</strong> {currentOwner.nome}</div>
                  )}
                  {currentSale ? (
                    <>
                      <div><strong className="text-[#CAC9CA]">Comprador Vinculado:</strong> {currentSale.clienteNome}</div>
                      <div>
                        <strong className="text-[#CAC9CA]">Regime Jurídico:</strong>{' '}
                        <span className={currentSale.isRepasseSemGarantia ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                          {currentSale.isRepasseSemGarantia ? 'Repasse Comercial (Sem Garantia)' : 'Garantia Legal 90 Dias (CDC)'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-amber-400/90 pt-1">
                      Modo Minuta em Estoque: dados do comprador saem prontos com linhas de preenchimento.
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Coluna Direita: Pré-visualização do Documento e Impressão */}
          <div className="lg:col-span-8 bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-6 flex flex-col min-h-[600px]">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#2D2D32] no-print">
              <div>
                <h3 className="text-sm font-bold text-[#F5F5F5] font-display">
                  {currentTemplate?.titulo}
                </h3>
                <p className="text-[11px] text-[#A7A7AB]">
                  Folha A4 timbrada paginada com proteção contra tags cruas e quebras órfãs de assinatura.
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
            <div className="flex-1 mt-5 overflow-y-auto max-h-[72vh] flex justify-center items-start bg-neutral-950/60 p-3 sm:p-5 rounded-xl border border-[#2D2D32]">
              <LetterheadA4Sheet
                id="documents-view-sheet"
                store={store}
                documentTitle={currentTemplate?.titulo}
                renderedContent={renderedContent}
                sale={currentSale}
                owner={currentOwner}
              />
            </div>

            {/* Document Notice Footer */}
            <div className="mt-4 pt-3 border-t border-[#2D2D32] flex items-center justify-between text-[11px] text-[#A7A7AB] no-print">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                <span>Minuta validada juridicamente para revendas automotivas (CDC & CTB)</span>
              </div>
              <span>{store.nomeFantasia} • Sistema VA Veículos</span>
            </div>

          </div>

        </div>
      )}

      {/* 5. Tab 2: Editor de Minutas Jurídicas — exclusivo do Gestor */}
      {activeTab === 'modelos' && isGestor && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
          
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
                  Clique nas variáveis oficiais abaixo para inseri-las na minuta com preenchimento automático na folha A4.
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
                  maxLength={140}
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
                  maxLength={220}
                  value={editingTemplate.descricao}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, descricao: e.target.value })}
                  className={formStyles.input}
                  required
                />
              </div>

              {/* Variáveis Dinâmicas Clicáveis */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider">
                    Merge Tags Oficiais (Clique para Inserir)
                  </span>
                  <span className="text-[10px] text-amber-400">Resolução 100% Garantida</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 bg-[#0D0D0F] rounded-[8px] border border-[#2D2D32]">
                  {AVAILABLE_MERGE_TAGS.map(item => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => handleInsertEditingTag(item.tag)}
                      title={`${item.label} (Ex: ${item.exemplo})`}
                      className="px-2 py-1 rounded bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] text-[10px] text-amber-400 font-mono transition-colors cursor-pointer"
                    >
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>

              {unknownEditingTags.length > 0 && (
                <div className="p-3 rounded-[8px] bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Atenção — Tag(s) não reconhecida(s):</strong>{' '}
                    <span className="font-mono text-amber-300">{unknownEditingTags.join(', ')}</span>.
                    <p className="text-[11px] text-amber-300/80 mt-0.5">
                      Para evitar tags cruas na impressão A4, variáveis desconhecidas são convertidas automaticamente em linha de preenchimento. Prefira utilizar as tags oficiais acima.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className={formStyles.label}>Texto da Minuta Jurídica</label>
                <textarea
                  rows={14}
                  maxLength={40000}
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
