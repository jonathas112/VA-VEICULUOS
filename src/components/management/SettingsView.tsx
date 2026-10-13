import React, { useState } from 'react';
import { 
  Building, Landmark, FileText, Users, Check, AlertCircle, 
  Upload, Image as ImageIcon, Eye, Printer, RotateCcw, 
  Cloud, RefreshCw, Database, Sparkles, MapPin, Phone
} from 'lucide-react';
import { StoreProfile, Financier, ContractTemplate, Salesperson, LetterheadConfig } from '../../types';
import { PageHeader, UnderlineTabs } from '../common/DesignSystem';
import { compressImageFile } from '../../utils/imageCompressor';
import { maskCPF, maskCNPJ, maskPhone, maskCEP } from '../../utils/formatters';
import { AVAILABLE_MERGE_TAGS, renderTemplate } from '../../utils/templateEngine';
import { DEFAULT_TEMPLATES } from '../../data/defaultTemplates';
import { storageService } from '../../services/storage';

interface SettingsViewProps {
  store: StoreProfile;
  financiers: Financier[];
  templates: ContractTemplate[];
  salespeople: Salesperson[];
  onSaveStore: (store: StoreProfile) => void;
  onSaveTemplate: (template: ContractTemplate) => void;
  onAddFinancier: (financier: Financier) => void;
  onAddSalesperson: (salesperson: Salesperson) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  store,
  financiers,
  templates,
  salespeople,
  onSaveStore,
  onSaveTemplate,
  onAddFinancier,
  onAddSalesperson
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'letterhead_contracts' | 'financiers' | 'salespeople' | 'firebase'>('store');

  // Formulário da Loja
  const [storeForm, setStoreForm] = useState<StoreProfile>({
    ...store,
    cidade: store.cidade || 'Areial',
    estado: store.estado || 'PB',
    cep: store.cep || '58140-000',
    telefone: store.telefone || '(83) 3381-1234',
    whatsapp: store.whatsapp || '(83) 98765-4321',
    papelTimbrado: store.papelTimbrado || {
      logoHeightPx: 64,
      logoAlignment: 'center',
      headerAlignment: 'center',
      marginTopMm: 15,
      marginBottomMm: 15,
      marginLeftMm: 20,
      marginRightMm: 20,
      fontSizePt: 10,
      fontFamily: 'Inter, sans-serif',
      mostrarCnpj: true,
      mostrarEndereco: true,
      mostrarTelefones: true,
      mostrarLinhasAssinatura: true,
      textoRodape: 'VA Veículos · Areial - PB · Rua São José, 120 - Centro · WhatsApp: (83) 98765-4321'
    }
  });

  const [storeSavedNotice, setStoreSavedNotice] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Formulário de Papel Timbrado e Contratos
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate>(templates[0] || DEFAULT_TEMPLATES[0]);
  const [templateSavedNotice, setTemplateSavedNotice] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Formulário de Novas Financeiras
  const [newFinNome, setNewFinNome] = useState('');
  const [newFinTaxa, setNewFinTaxa] = useState<number>(1.49);
  const [newFinTelefone, setNewFinTelefone] = useState('(83) 9');

  // Formulário de Novos Vendedores
  const [newSellerNome, setNewSellerNome] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerTelefone, setNewSellerTelefone] = useState('(83) 9');

  // Sincronização Firebase
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Handlers da Loja
  const handleSaveStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveStore(storeForm);
    setStoreSavedNotice(true);
    setTimeout(() => setStoreSavedNotice(false), 3000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const compressedLogo = await compressImageFile(file, {
        maxWidth: 600,
        maxHeight: 250,
        quality: 0.88,
        mimeType: 'image/jpeg'
      });
      const updated = {
        ...storeForm,
        logoUrl: compressedLogo,
        papelTimbrado: {
          ...(storeForm.papelTimbrado || {
            logoHeightPx: 64,
            logoAlignment: 'center',
            headerAlignment: 'center',
            marginTopMm: 15,
            marginBottomMm: 15,
            marginLeftMm: 20,
            marginRightMm: 20,
            fontSizePt: 10,
            fontFamily: 'Inter, sans-serif',
            mostrarCnpj: true,
            mostrarEndereco: true,
            mostrarTelefones: true,
            mostrarLinhasAssinatura: true
          }),
          logoUrl: compressedLogo
        }
      };
      setStoreForm(updated);
      onSaveStore(updated);
      setStoreSavedNotice(true);
      setTimeout(() => setStoreSavedNotice(false), 3000);
    } catch (err) {
      console.error('Erro ao enviar logotipo:', err);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handlers de Modelos de Contratos
  const handleSaveTemplate = () => {
    onSaveTemplate(selectedTemplate);
    setTemplateSavedNotice(true);
    setTimeout(() => setTemplateSavedNotice(false), 3000);
  };

  const handleResetTemplate = () => {
    const defaultOne = DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate.id);
    if (defaultOne) {
      if (window.confirm('Deseja restaurar este modelo para o texto original padrão?')) {
        setSelectedTemplate({ ...defaultOne });
        onSaveTemplate({ ...defaultOne });
      }
    }
  };

  const handleInsertTag = (tag: string) => {
    setSelectedTemplate(prev => ({
      ...prev,
      conteudo: prev.conteudo + ' ' + tag
    }));
  };

  // Handlers de Financeiras
  const handleAddFinancierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFinNome) return;
    const fin: Financier = {
      id: 'fin_' + Date.now(),
      nome: newFinNome,
      taxaMedia: Number(newFinTaxa),
      telefone: maskPhone(newFinTelefone),
      ativa: true
    };
    onAddFinancier(fin);
    setNewFinNome('');
    setNewFinTaxa(1.49);
    setNewFinTelefone('(83) 9');
  };

  // Handlers de Vendedores
  const handleAddSellerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerNome) return;
    const seller: Salesperson = {
      id: 'vend_' + Date.now(),
      nome: newSellerNome,
      email: newSellerEmail || `${newSellerNome.toLowerCase().replace(/\s+/g, '')}@vaveiculos.com.br`,
      telefone: maskPhone(newSellerTelefone),
      ativo: true
    };
    onAddSalesperson(seller);
    setNewSellerNome('');
    setNewSellerEmail('');
    setNewSellerTelefone('(83) 9');
  };

  const handleSyncFirebase = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('Sincronizando com o banco de dados VA VEÍCULOS no Firestore...');
      const res = await storageService.syncFromFirestore();
      setSyncStatus(`Sincronização concluída com sucesso! Veículos: ${res.vehicles}, Pessoas: ${res.owners}, Vendas: ${res.sales}.`);
    } catch {
      setSyncStatus('Erro ao sincronizar com o Firestore. Verifique sua conexão.');
    } finally {
      setIsSyncing(false);
    }
  };

  const tabs = [
    { id: 'store', label: 'Perfil da Loja & Logotipo', count: undefined },
    { id: 'letterhead_contracts', label: 'Editor de Papel Timbrado & Contratos', count: templates.length },
    { id: 'financiers', label: 'Financeiras & Bancos', count: financiers.length },
    { id: 'salespeople', label: 'Equipe de Vendedores', count: salespeople.length },
    { id: 'firebase', label: 'Banco de Dados Firebase', count: undefined }
  ];

  const formStyles = {
    label: 'block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5',
    input: 'w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors',
    textarea: 'w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors'
  };

  // Mock de dados para pré-visualização da folha A4 timbrada
  const previewSample = {
    store: storeForm,
    vehicle: {
      id: 'mock_preview',
      tipo: 'carro' as const,
      marca: 'Toyota',
      modelo: 'Corolla',
      versao: '2.0 XEi Flex Automático',
      anoFabricacao: 2023,
      anoModelo: 2024,
      cor: 'Prata Metálico',
      combustivel: 'Flex' as const,
      cambio: 'Automático' as const,
      quilometragem: 28500,
      placa: 'BRA2E19',
      chassi: '9BRBL42E0P0123456',
      renavam: '01234567890',
      categoriaComercial: 'venda' as const,
      status: 'em_estoque' as const,
      fotos: [],
      antigoDonoId: 'mock_owner',
      dataEntrada: '2026-09-10',
      valorPago: 88000,
      debitoDetran: { temDebito: false, valor: 0, quemArca: 'nenhum' as const },
      reciboCompraGerado: true,
      valorAnunciado: 105900,
      custosPatio: []
    },
    owner: {
      id: 'mock_owner',
      nome: 'Carlos Eduardo Oliveira',
      cpf: '345.678.901-23',
      rg: '2.345.678 SSP/PB',
      telefone: '(83) 99876-5432',
      endereco: 'Rua São José, 45',
      cidade: 'Areial',
      estado: 'PB'
    },
    sale: {
      id: 'mock_sale',
      veiculoId: 'mock_preview',
      dataVenda: '2026-10-13',
      clienteNome: 'Mariana Guimarães Santos',
      clienteCpf: '987.654.321-00',
      clienteRg: '4.567.890 SSP/PB',
      clienteTelefone: '(83) 99123-4567',
      clienteEndereco: 'Av. Epitácio Pessoa, 1200 - Areial/PB',
      vendedorId: 'vend_carlos',
      vendedorNome: 'Carlos Ramos',
      valorVenda: 104000,
      formaPagamento: 'a_vista_pix' as const,
      tipoContratoId: 'garantia_padrao',
      tipoContratoNome: 'Contrato de Compra e Venda',
      isRepasseSemGarantia: false,
      comissaoValor: 1040,
      comissaoPendente: false,
      custosPosVenda: []
    }
  };

  const renderedPreviewText = renderTemplate(selectedTemplate.conteudo, previewSample);

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header */}
      <PageHeader
        breadcrumb="Sistema • Configurações"
        title="Preferências & Parâmetros"
        subtitle="Identidade da VA Veículos (Areial-PB), editor de papel timbrado, minutas contratuais e nuvem Firebase."
      />

      {/* 2. Abas */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
      />

      {/* ABA 1: Perfil da Loja & Logotipo */}
      {activeTab === 'store' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-4xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Dados Cadastrais da Loja & Identidade Visual
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Configurações da sede em Areial - PB. O logotipo e dados são aplicados no papel timbrado e nos contratos oficiais.
              </p>
            </div>
            {storeSavedNotice && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                <Check className="w-3.5 h-3.5" /> Salvo com sucesso!
              </div>
            )}
          </div>

          <form onSubmit={handleSaveStoreSubmit} className="space-y-6">
            
            {/* Upload de Logotipo da Loja */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <span className="block text-xs font-bold text-white uppercase tracking-wider">
                Logotipo da VA Veículos (Papel Timbrado & Vitrine)
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-48 h-20 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center overflow-hidden p-2">
                  {storeForm.logoUrl ? (
                    <img src={storeForm.logoUrl} alt="Logo da Loja" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-center text-neutral-500 text-[10px]">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-40" />
                      Sem logo anexado
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs cursor-pointer transition-colors border border-neutral-700">
                    <Upload className="w-4 h-4 text-amber-500" />
                    {isUploadingLogo ? 'Processando e comprimindo...' : 'Enviar Nova Imagem de Logotipo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-neutral-400">
                    Formatos recomendados: PNG ou JPEG com fundo transparente ou branco. Otimizado automaticamente para o papel timbrado.
                  </p>
                </div>
              </div>
            </div>

            {/* Informações Institucionais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={formStyles.label}>Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  value={storeForm.nomeFantasia}
                  onChange={(e) => setStoreForm({ ...storeForm, nomeFantasia: e.target.value })}
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>Razão Social *</label>
                <input
                  type="text"
                  required
                  value={storeForm.razaoSocial}
                  onChange={(e) => setStoreForm({ ...storeForm, razaoSocial: e.target.value })}
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>CNPJ *</label>
                <input
                  type="text"
                  required
                  value={storeForm.cnpj}
                  onChange={(e) => setStoreForm({ ...storeForm, cnpj: maskCNPJ(e.target.value) })}
                  className={`${formStyles.input} font-mono`}
                />
              </div>

              <div>
                <label className={formStyles.label}>Telefone Fixo da Loja</label>
                <input
                  type="text"
                  value={storeForm.telefone}
                  onChange={(e) => setStoreForm({ ...storeForm, telefone: maskPhone(e.target.value) })}
                  className={`${formStyles.input} font-mono`}
                />
              </div>

              <div>
                <label className={formStyles.label}>WhatsApp Oficial (DDD 83) *</label>
                <input
                  type="text"
                  required
                  value={storeForm.whatsapp}
                  onChange={(e) => setStoreForm({ ...storeForm, whatsapp: maskPhone(e.target.value) })}
                  className={`${formStyles.input} font-mono`}
                />
              </div>

              <div>
                <label className={formStyles.label}>Chave Pix para Recebimentos</label>
                <input
                  type="text"
                  value={storeForm.chavePix}
                  onChange={(e) => setStoreForm({ ...storeForm, chavePix: e.target.value })}
                  className={formStyles.input}
                />
              </div>
            </div>

            {/* Endereço em Areial - PB */}
            <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 space-y-3">
              <span className="block text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Endereço da Loja (Areial - PB por padrão)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={formStyles.label}>Logradouro & Número</label>
                  <input
                    type="text"
                    value={storeForm.endereco}
                    onChange={(e) => setStoreForm({ ...storeForm, endereco: e.target.value })}
                    className={formStyles.input}
                  />
                </div>

                <div>
                  <label className={formStyles.label}>CEP</label>
                  <input
                    type="text"
                    value={storeForm.cep}
                    onChange={(e) => setStoreForm({ ...storeForm, cep: maskCEP(e.target.value) })}
                    className={`${formStyles.input} font-mono`}
                  />
                </div>

                <div>
                  <label className={formStyles.label}>Cidade</label>
                  <input
                    type="text"
                    value={storeForm.cidade}
                    onChange={(e) => setStoreForm({ ...storeForm, cidade: e.target.value })}
                    className={formStyles.input}
                  />
                </div>

                <div>
                  <label className={formStyles.label}>Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={storeForm.estado}
                    onChange={(e) => setStoreForm({ ...storeForm, estado: e.target.value.toUpperCase() })}
                    className={`${formStyles.input} font-mono uppercase`}
                  />
                </div>

                <div>
                  <label className={formStyles.label}>Site Institucional</label>
                  <input
                    type="text"
                    value={storeForm.site}
                    onChange={(e) => setStoreForm({ ...storeForm, site: e.target.value })}
                    className={formStyles.input}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Salvar Configurações da Loja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 2: Editor Visual de Papel Timbrado & Contratos */}
      {activeTab === 'letterhead_contracts' && (
        <div className="space-y-6">
          
          {/* Sub-seção A: Configuração do Papel Timbrado */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Configuração de Papel Timbrado Oficial
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Personalize o cabeçalho, altura do logotipo, alinhamento, margens e rodapé para todos os contratos e recibos gerados.
                </p>
              </div>
              {storeSavedNotice && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Salvo!
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className={formStyles.label}>Alinhamento do Cabeçalho</label>
                <select
                  value={storeForm.papelTimbrado?.headerAlignment || 'center'}
                  onChange={(e) => {
                    const updated = {
                      ...storeForm,
                      papelTimbrado: {
                        ...(storeForm.papelTimbrado || {
                          logoHeightPx: 64,
                          logoAlignment: 'center',
                          marginTopMm: 15,
                          marginBottomMm: 15,
                          marginLeftMm: 20,
                          marginRightMm: 20,
                          fontSizePt: 10,
                          fontFamily: 'Inter, sans-serif',
                          mostrarCnpj: true,
                          mostrarEndereco: true,
                          mostrarTelefones: true,
                          mostrarLinhasAssinatura: true
                        }),
                        headerAlignment: e.target.value as any
                      }
                    };
                    setStoreForm(updated);
                    onSaveStore(updated);
                  }}
                  className={formStyles.input}
                >
                  <option value="center">Centralizado</option>
                  <option value="left">Alinhado à Esquerda</option>
                  <option value="right">Alinhado à Direita</option>
                </select>
              </div>

              <div>
                <label className={formStyles.label}>Altura do Logotipo (px)</label>
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={storeForm.papelTimbrado?.logoHeightPx || 64}
                  onChange={(e) => {
                    const updated = {
                      ...storeForm,
                      papelTimbrado: {
                        ...(storeForm.papelTimbrado || {
                          headerAlignment: 'center',
                          logoAlignment: 'center',
                          marginTopMm: 15,
                          marginBottomMm: 15,
                          marginLeftMm: 20,
                          marginRightMm: 20,
                          fontSizePt: 10,
                          fontFamily: 'Inter, sans-serif',
                          mostrarCnpj: true,
                          mostrarEndereco: true,
                          mostrarTelefones: true,
                          mostrarLinhasAssinatura: true
                        }),
                        logoHeightPx: Number(e.target.value)
                      }
                    };
                    setStoreForm(updated);
                    onSaveStore(updated);
                  }}
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>Tamanho da Fonte (pt)</label>
                <input
                  type="number"
                  min={8}
                  max={14}
                  value={storeForm.papelTimbrado?.fontSizePt || 10}
                  onChange={(e) => {
                    const updated = {
                      ...storeForm,
                      papelTimbrado: {
                        ...(storeForm.papelTimbrado || {
                          headerAlignment: 'center',
                          logoAlignment: 'center',
                          logoHeightPx: 64,
                          marginTopMm: 15,
                          marginBottomMm: 15,
                          marginLeftMm: 20,
                          marginRightMm: 20,
                          fontFamily: 'Inter, sans-serif',
                          mostrarCnpj: true,
                          mostrarEndereco: true,
                          mostrarTelefones: true,
                          mostrarLinhasAssinatura: true
                        }),
                        fontSizePt: Number(e.target.value)
                      }
                    };
                    setStoreForm(updated);
                    onSaveStore(updated);
                  }}
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>Margens Superiores (mm)</label>
                <input
                  type="number"
                  min={5}
                  max={40}
                  value={storeForm.papelTimbrado?.marginTopMm || 15}
                  onChange={(e) => {
                    const updated = {
                      ...storeForm,
                      papelTimbrado: {
                        ...(storeForm.papelTimbrado || {
                          headerAlignment: 'center',
                          logoAlignment: 'center',
                          logoHeightPx: 64,
                          marginBottomMm: 15,
                          marginLeftMm: 20,
                          marginRightMm: 20,
                          fontSizePt: 10,
                          fontFamily: 'Inter, sans-serif',
                          mostrarCnpj: true,
                          mostrarEndereco: true,
                          mostrarTelefones: true,
                          mostrarLinhasAssinatura: true
                        }),
                        marginTopMm: Number(e.target.value)
                      }
                    };
                    setStoreForm(updated);
                    onSaveStore(updated);
                  }}
                  className={formStyles.input}
                />
              </div>
            </div>

            {/* Checkboxes de Elementos do Papel Timbrado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 mt-3 border-t border-neutral-800 text-xs">
              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeForm.papelTimbrado?.mostrarCnpj ?? true}
                  onChange={(e) => {
                    const updated = {
                      ...storeForm,
                      papelTimbrado: {
                        ...(storeForm.papelTimbrado as any),
                        mostrarCnpj: e.target.checked
                      }
                    };
                    setStoreForm(updated);
                    onSaveStore(updated);
                  }}
                  className="rounded accent-amber-500"
                />
                <span>Exibir CNPJ</span>
              </label>

              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeForm.papelTimbrado?.mostrarEndereco ?? true}
                  onChange={(e) => {
                    const updated = {
                      ...storeForm,
                      papelTimbrado: {
                        ...(storeForm.papelTimbrado as any),
                        mostrarEndereco: e.target.checked
                      }
                    };
                    setStoreForm(updated);
                    onSaveStore(updated);
                  }}
                  className="rounded accent-amber-500"
                />
                <span>Exibir Areial - PB</span>
              </label>

              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeForm.papelTimbrado?.mostrarTelefones ?? true}
                  onChange={(e) => {
                    const updated = {
                      ...storeForm,
                      papelTimbrado: {
                        ...(storeForm.papelTimbrado as any),
                        mostrarTelefones: e.target.checked
                      }
                    };
                    setStoreForm(updated);
                    onSaveStore(updated);
                  }}
                  className="rounded accent-amber-500"
                />
                <span>Exibir Contatos (83)</span>
              </label>

              <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeForm.papelTimbrado?.mostrarLinhasAssinatura ?? true}
                  onChange={(e) => {
                    const updated = {
                      ...storeForm,
                      papelTimbrado: {
                        ...(storeForm.papelTimbrado as any),
                        mostrarLinhasAssinatura: e.target.checked
                      }
                    };
                    setStoreForm(updated);
                    onSaveStore(updated);
                  }}
                  className="rounded accent-amber-500"
                />
                <span>Linhas de Assinatura</span>
              </label>
            </div>
          </div>

          {/* Sub-seção B: Split-Screen Editor & Live A4 Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Coluna da Esquerda: Seletor de Modelo & Editor (7 cols) */}
            <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              
              {/* Seletor de Modelo */}
              <div>
                <label className={formStyles.label}>Selecione o Modelo para Edição</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        selectedTemplate.id === t.id
                          ? 'bg-neutral-800 border-amber-500 text-white shadow-md'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold truncate">{t.titulo}</div>
                      <div className="text-[10px] text-neutral-500 capitalize">{t.tipo.replace('_', ' ')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className={formStyles.label}>Título Oficial do Documento</label>
                <input
                  type="text"
                  value={selectedTemplate.titulo}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, titulo: e.target.value })}
                  className={formStyles.input}
                />
              </div>

              {/* Tags Dinâmicas (Chips clicáveis) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Variáveis Dinâmicas (Clique para Inserir no Texto)
                  </span>
                  <span className="text-[10px] text-amber-500 font-medium">Preenchimento Automático</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-neutral-950 rounded-xl border border-neutral-800">
                  {AVAILABLE_MERGE_TAGS.map(tagItem => (
                    <button
                      key={tagItem.tag}
                      type="button"
                      onClick={() => handleInsertTag(tagItem.tag)}
                      className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-amber-400 font-mono transition-colors cursor-pointer"
                      title={`${tagItem.label} (Ex: ${tagItem.exemplo})`}
                    >
                      {tagItem.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor de Conteúdo */}
              <div>
                <label className={formStyles.label}>Corpo do Texto & Cláusulas</label>
                <textarea
                  rows={14}
                  value={selectedTemplate.conteudo}
                  onChange={(e) => setSelectedTemplate({ ...selectedTemplate, conteudo: e.target.value })}
                  className={`${formStyles.textarea} font-mono text-xs leading-relaxed`}
                />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Padrão
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    Salvar Modelo de Documento
                  </button>
                </div>
              </div>

            </div>

            {/* Coluna da Direita: Live A4 Paper Sheet Preview (5 cols) */}
            <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3 text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-amber-500" />
                    Pré-visualização em Folha A4 Timbrada
                  </span>
                  <span className="text-[10px] text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                    Dados de Teste
                  </span>
                </div>

                {/* Folha A4 Virtual */}
                <div 
                  className="bg-white text-neutral-900 rounded-lg shadow-2xl p-6 overflow-y-auto max-h-[580px] text-left border border-neutral-300"
                  style={{
                    fontFamily: storeForm.papelTimbrado?.fontFamily || 'Inter, sans-serif',
                    fontSize: `${storeForm.papelTimbrado?.fontSizePt || 10}pt`
                  }}
                >
                  {/* Cabeçalho Timbrado */}
                  <div className={`border-b-2 border-neutral-800 pb-3 mb-4 text-${storeForm.papelTimbrado?.headerAlignment || 'center'}`}>
                    {storeForm.logoUrl ? (
                      <div className={`flex justify-${storeForm.papelTimbrado?.headerAlignment === 'left' ? 'start' : storeForm.papelTimbrado?.headerAlignment === 'right' ? 'end' : 'center'} mb-2`}>
                        <img 
                          src={storeForm.logoUrl} 
                          alt="Logo" 
                          style={{ height: `${storeForm.papelTimbrado?.logoHeightPx || 55}px` }}
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <h2 className="text-base font-black tracking-wider text-neutral-950 uppercase font-display">
                        {storeForm.nomeFantasia || 'VA VEÍCULOS'}
                      </h2>
                    )}

                    <div className="text-[9px] text-neutral-600 leading-tight space-y-0.5">
                      <p className="font-semibold">{storeForm.razaoSocial}</p>
                      {storeForm.papelTimbrado?.mostrarCnpj && (
                        <p>CNPJ: {storeForm.cnpj}</p>
                      )}
                      {storeForm.papelTimbrado?.mostrarEndereco && (
                        <p>{storeForm.endereco}, {storeForm.cidade} - {storeForm.estado} · CEP: {storeForm.cep}</p>
                      )}
                      {storeForm.papelTimbrado?.mostrarTelefones && (
                        <p>Telefone: {storeForm.telefone} · WhatsApp: {storeForm.whatsapp}</p>
                      )}
                    </div>
                  </div>

                  {/* Título do Documento */}
                  <div className="text-center mb-4">
                    <h3 className="font-extrabold text-xs uppercase tracking-wide border-b border-neutral-300 pb-1 inline-block">
                      {selectedTemplate.titulo}
                    </h3>
                  </div>

                  {/* Corpo do Texto Renderizado */}
                  <div className="text-[9.5px] leading-relaxed whitespace-pre-wrap text-justify text-neutral-800">
                    {renderedPreviewText}
                  </div>

                  {/* Linhas de Assinatura */}
                  {storeForm.papelTimbrado?.mostrarLinhasAssinatura && (
                    <div className="mt-8 pt-4 border-t border-neutral-300 grid grid-cols-2 gap-4 text-center text-[9px] text-neutral-700">
                      <div>
                        <div className="border-t border-neutral-400 pt-1 mt-6 font-semibold">
                          {storeForm.nomeFantasia}
                        </div>
                        <p className="text-[8px] text-neutral-500">Representante Legal</p>
                      </div>
                      <div>
                        <div className="border-t border-neutral-400 pt-1 mt-6 font-semibold">
                          Cliente / Adquirente
                        </div>
                        <p className="text-[8px] text-neutral-500">CPF: 000.000.000-00</p>
                      </div>
                    </div>
                  )}

                  {/* Rodapé Timbrado */}
                  <div className="mt-6 pt-2 border-t border-neutral-200 text-center text-[7.5px] text-neutral-500">
                    {storeForm.papelTimbrado?.textoRodape || `${storeForm.nomeFantasia} · ${storeForm.cidade} - ${storeForm.estado}`}
                  </div>
                </div>
              </div>

              {/* Botão de Teste de Impressão */}
              <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-500" />
                  Imprimir Folha A4 de Teste
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ABA 3: Financeiras & Bancos */}
      {activeTab === 'financiers' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
              <Landmark className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                Credenciar Nova Instituição Financeira / Banco Parceiro
              </h3>
            </div>

            <form onSubmit={handleAddFinancierSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className={formStyles.label}>Nome do Banco *</label>
                <input
                  type="text"
                  required
                  value={newFinNome}
                  onChange={(e) => setNewFinNome(e.target.value)}
                  placeholder="Ex: Santander Financiamentos"
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>Taxa Média a.m. (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newFinTaxa}
                  onChange={(e) => setNewFinTaxa(Number(e.target.value))}
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>Telefone da Mesa</label>
                <input
                  type="text"
                  value={newFinTelefone}
                  onChange={(e) => setNewFinTelefone(maskPhone(e.target.value))}
                  placeholder="(83) 99876-5432"
                  className={formStyles.input}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Adicionar Banco
                </button>
              </div>
            </form>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Bancos Credenciados para Aprovação de Crédito
            </div>
            <div className="divide-y divide-neutral-800">
              {financiers.map((f) => (
                <div key={f.id} className="p-4 flex items-center justify-between hover:bg-neutral-800/40 transition-colors">
                  <div>
                    <div className="font-semibold text-sm text-white">{f.nome}</div>
                    <div className="text-xs text-neutral-400">
                      Contato: {f.contato || f.contatoGerente || 'Mesa de Crédito'} · Tel: {f.telefone}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-neutral-500 uppercase block">Taxa Estimada</span>
                    <span className="text-sm font-bold text-emerald-400 font-num tabular-nums">{f.taxaMedia || 1.49}% a.m.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: Equipe de Vendedores */}
      {activeTab === 'salespeople' && (
        <div className="space-y-6 max-w-4xl">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
              <Users className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                Cadastrar Novo Vendedor / Consultor
              </h3>
            </div>

            <form onSubmit={handleAddSellerSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className={formStyles.label}>Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={newSellerNome}
                  onChange={(e) => setNewSellerNome(e.target.value)}
                  placeholder="Ex: Carlos Ramos"
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>E-mail</label>
                <input
                  type="email"
                  value={newSellerEmail}
                  onChange={(e) => setNewSellerEmail(e.target.value)}
                  placeholder="vendas@vaveiculos.com.br"
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>WhatsApp (DDD 83)</label>
                <input
                  type="text"
                  value={newSellerTelefone}
                  onChange={(e) => setNewSellerTelefone(maskPhone(e.target.value))}
                  placeholder="(83) 98111-2233"
                  className={formStyles.input}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Salvar Consultor
                </button>
              </div>
            </form>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Consultores de Vendas Ativos
            </div>
            <div className="divide-y divide-neutral-800">
              {salespeople.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between hover:bg-neutral-800/40 transition-colors">
                  <div>
                    <div className="font-semibold text-sm text-white">{s.nome}</div>
                    <div className="text-xs text-neutral-400">
                      {s.email} · {s.telefone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Ativo na Loja
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: Banco de Dados Firebase (VA VEÍCULOS) */}
      {activeTab === 'firebase' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-4xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-display">
                  Conexão com Banco de Dados Firestore (VA VEÍCULOS)
                </h3>
                <p className="text-xs text-neutral-400">
                  Instância na nuvem provisionada: <strong className="text-amber-400 font-mono">va-veiculos</strong>. Armazenamento de fotos, logo e dados cadastrais.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Conectado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Banco de Dados</span>
              <strong className="text-white text-sm font-mono mt-1 block">va-veiculos</strong>
              <span className="text-[11px] text-neutral-400 mt-1 block">Google Cloud Firestore</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Capacidade por Veículo</span>
              <strong className="text-amber-400 text-sm font-bold mt-1 block">Até 10 Fotos</strong>
              <span className="text-[11px] text-neutral-400 mt-1 block">Compressão automática</span>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] text-neutral-500 uppercase block font-semibold">Trilha de Auditoria</span>
              <strong className="text-emerald-400 text-sm font-bold mt-1 block">Log Geral Ativo</strong>
              <span className="text-[11px] text-neutral-400 mt-1 block">Sincronização instantânea</span>
            </div>
          </div>

          {syncStatus && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{syncStatus}</span>
            </div>
          )}

          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Os dados são sincronizados em tempo real a cada cadastro, edição de veículo, lançamento de custo ou venda.
            </span>

            <button
              onClick={handleSyncFirebase}
              disabled={isSyncing}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-amber-500 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem Agora'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
