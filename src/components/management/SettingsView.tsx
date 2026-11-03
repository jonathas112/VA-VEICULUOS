import React, { useState, useMemo } from 'react';
import { 
  Landmark, Users, Check, 
  Upload, Eye, Printer, RotateCcw, 
  RefreshCw, Database, MapPin,
  Trash2, Power, PowerOff, Edit3, Search, X,
  AlertTriangle
} from 'lucide-react';
import { StoreProfile, Financier, ContractTemplate, Salesperson } from '../../types';
import { PageHeader, UnderlineTabs } from '../common/DesignSystem';
import { BrandLogo } from '../common/BrandLogo';
import { compressImageFile } from '../../utils/imageCompressor';
import {
  maskCNPJ, maskPhone, maskCEP, maskUF,
  isValidCNPJ, isValidPhone, isValidCEP, isValidUF, isValidEmail,
  clampNumber
} from '../../utils/formatters';
import { AVAILABLE_MERGE_TAGS, renderTemplate, findUnknownTemplateTags } from '../../utils/templateEngine';
import { DEFAULT_TEMPLATES } from '../../data/defaultTemplates';
import { storageService } from '../../services/storage';
import { printA4Document } from '../../utils/printDocument';
import { LetterheadA4Sheet } from '../common/LetterheadA4Sheet';
import { PaginationControls } from '../common/PaginationControls';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface SettingsViewProps {
  store: StoreProfile;
  financiers: Financier[];
  templates: ContractTemplate[];
  salespeople: Salesperson[];
  onSaveStore: (store: StoreProfile) => void;
  onSaveTemplate: (template: ContractTemplate) => void;
  onAddFinancier: (financier: Financier) => void;
  onAddSalesperson: (salesperson: Salesperson) => void;
  onToggleFinancier?: (id: string) => void;
  onDeleteFinancier?: (id: string) => void;
  onUpdateFinancier?: (financier: Financier) => void;
  onToggleSalesperson?: (id: string) => void;
  onDeleteSalesperson?: (id: string) => void;
  onUpdateSalesperson?: (salesperson: Salesperson) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  store,
  financiers,
  templates,
  salespeople,
  onSaveStore,
  onSaveTemplate,
  onAddFinancier,
  onAddSalesperson,
  onToggleFinancier,
  onDeleteFinancier,
  onUpdateFinancier,
  onToggleSalesperson,
  onDeleteSalesperson,
  onUpdateSalesperson
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

  // Formulário de Novas Financeiras
  const [newFinNome, setNewFinNome] = useState('');
  const [newFinTaxa, setNewFinTaxa] = useState<number>(1.49);
  const [newFinTelefone, setNewFinTelefone] = useState('');
  const [newFinContato, setNewFinContato] = useState('');
  const [financierFilter, setFinancierFilter] = useState<'todas' | 'ativas' | 'desativadas'>('todas');
  const [financierSearch, setFinancierSearch] = useState('');
  const [editingFinancier, setEditingFinancier] = useState<Financier | null>(null);
  const [deleteFinancierConfirm, setDeleteFinancierConfirm] = useState<Financier | null>(null);

  // Formulário de Novos Vendedores / Membros da Equipe
  const [newSellerNome, setNewSellerNome] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerTelefone, setNewSellerTelefone] = useState('');
  const [newSellerMeta, setNewSellerMeta] = useState<number>(5);
  const [salespersonFilter, setSalespersonFilter] = useState<'todos' | 'ativos' | 'desativados'>('todos');
  const [salespersonSearch, setSalespersonSearch] = useState('');
  const [editingSalesperson, setEditingSalesperson] = useState<Salesperson | null>(null);
  const [deleteSalespersonConfirm, setDeleteSalespersonConfirm] = useState<Salesperson | null>(null);

  // Sincronização Firebase
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Handlers da Loja
  const handleSaveStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.nomeFantasia.trim() || !storeForm.razaoSocial.trim() || !storeForm.endereco.trim() || !storeForm.cidade.trim()) {
      alert('Por favor, preencha Nome Fantasia, Razão Social, Logradouro e Cidade da loja.');
      return;
    }
    if (!isValidCNPJ(storeForm.cnpj)) {
      alert('Por favor, informe um CNPJ válido com 14 dígitos.');
      return;
    }
    if (!storeForm.whatsapp.trim() || !isValidPhone(storeForm.whatsapp)) {
      alert('Por favor, informe um WhatsApp oficial válido com DDD (10 ou 11 dígitos).');
      return;
    }
    if (storeForm.telefone.trim() && !isValidPhone(storeForm.telefone)) {
      alert('Por favor, informe um Telefone fixo válido com DDD (10 ou 11 dígitos).');
      return;
    }
    if (storeForm.cep.trim() && !isValidCEP(storeForm.cep)) {
      alert('Por favor, informe um CEP válido com 8 dígitos.');
      return;
    }
    if (!storeForm.estado.trim() || !isValidUF(storeForm.estado)) {
      alert('Por favor, informe uma UF (Estado) válida de 2 letras (ex: PB, PE, RN, SP).');
      return;
    }
    onSaveStore({
      ...storeForm,
      nomeFantasia: storeForm.nomeFantasia.trim(),
      razaoSocial: storeForm.razaoSocial.trim(),
      endereco: storeForm.endereco.trim(),
      cidade: storeForm.cidade.trim(),
      estado: maskUF(storeForm.estado),
      chavePix: storeForm.chavePix.trim(),
      site: storeForm.site.trim()
    });
    setStoreSavedNotice(true);
    setTimeout(() => setStoreSavedNotice(false), 3000);
  };

  const handleRemoveLogo = () => {
    if (window.confirm('Deseja remover o logotipo personalizado da loja e voltar ao emblema institucional padrão?')) {
      const updated = {
        ...storeForm,
        logoUrl: '',
        papelTimbrado: storeForm.papelTimbrado ? { ...storeForm.papelTimbrado, logoUrl: '' } : undefined
      };
      setStoreForm(updated);
      onSaveStore(updated);
      setStoreSavedNotice(true);
      setTimeout(() => setStoreSavedNotice(false), 3000);
    }
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
    if (!selectedTemplate.titulo.trim() || !selectedTemplate.conteudo.trim()) {
      alert('Informe o título oficial e o corpo do texto antes de salvar o modelo de documento.');
      return;
    }
    onSaveTemplate({
      ...selectedTemplate,
      titulo: selectedTemplate.titulo.trim(),
      conteudo: selectedTemplate.conteudo.trim()
    });
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
    if (!newFinNome.trim()) {
      alert('Informe o nome da instituição financeira.');
      return;
    }
    if (isNaN(newFinTaxa) || !Number.isFinite(newFinTaxa) || newFinTaxa < 0.01 || newFinTaxa > 50) {
      alert('Por favor, informe uma taxa média de juros válida (entre 0.01% e 50.0% a.m.).');
      return;
    }
    if (newFinTelefone.trim() && !isValidPhone(newFinTelefone)) {
      alert('Por favor, informe um telefone válido com DDD (10 ou 11 dígitos) para a financeira.');
      return;
    }
    const fin: Financier = {
      id: 'fin_' + Date.now(),
      nome: newFinNome.trim(),
      taxaMedia: Number(newFinTaxa),
      telefone: newFinTelefone.trim() ? maskPhone(newFinTelefone) : '',
      contato: newFinContato.trim() ? newFinContato.trim() : undefined,
      contatoGerente: newFinContato.trim() ? newFinContato.trim() : undefined,
      ativa: true,
      ativo: true
    };
    onAddFinancier(fin);
    setNewFinNome('');
    setNewFinTaxa(1.49);
    setNewFinTelefone('');
    setNewFinContato('');
  };

  const handleToggleFinancierClick = (id: string) => {
    if (onToggleFinancier) {
      onToggleFinancier(id);
    } else {
      storageService.toggleFinancierStatus(id);
    }
  };

  const handleDeleteFinancierExecute = (id: string) => {
    if (onDeleteFinancier) {
      onDeleteFinancier(id);
    } else {
      storageService.deleteFinancier(id);
    }
    setDeleteFinancierConfirm(null);
  };

  const handleSaveEditFinancierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFinancier) return;
    if (!editingFinancier.nome.trim()) {
      alert('Informe o nome da instituição financeira.');
      return;
    }
    const taxa = Number(editingFinancier.taxaMedia);
    if (isNaN(taxa) || !Number.isFinite(taxa) || taxa < 0.01 || taxa > 50) {
      alert('Por favor, informe uma taxa média de juros válida (entre 0.01% e 50.0% a.m.).');
      return;
    }
    if (editingFinancier.telefone && editingFinancier.telefone.trim() && !isValidPhone(editingFinancier.telefone)) {
      alert('Por favor, informe um telefone válido com DDD (10 ou 11 dígitos) para a financeira.');
      return;
    }
    const sanitizedFinancier: Financier = {
      ...editingFinancier,
      nome: editingFinancier.nome.trim(),
      taxaMedia: taxa,
      telefone: editingFinancier.telefone?.trim() ? maskPhone(editingFinancier.telefone) : '',
      contato: editingFinancier.contato?.trim() || undefined,
      contatoGerente: editingFinancier.contatoGerente?.trim() || editingFinancier.contato?.trim() || undefined
    };
    if (onUpdateFinancier) {
      onUpdateFinancier(sanitizedFinancier);
    } else {
      storageService.saveFinancier(sanitizedFinancier);
    }
    setEditingFinancier(null);
  };

  // Handlers de Vendedores / Membros da Equipe
  const handleAddSellerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerNome.trim()) {
      alert('Informe o nome completo do consultor de vendas.');
      return;
    }
    if (newSellerEmail.trim() && !isValidEmail(newSellerEmail)) {
      alert('Informe um endereço de e-mail válido para o vendedor.');
      return;
    }
    if (newSellerTelefone.trim() && !isValidPhone(newSellerTelefone)) {
      alert('Por favor, informe um WhatsApp válido com DDD (10 ou 11 dígitos) para o vendedor.');
      return;
    }
    if (isNaN(newSellerMeta) || !Number.isFinite(newSellerMeta) || newSellerMeta < 1 || newSellerMeta > 100) {
      alert('Informe uma meta mensal válida entre 1 e 100 veículos.');
      return;
    }
    const cleanGeneratedSlug = newSellerNome.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') || 'consultor';
    const seller: Salesperson = {
      id: 'vend_' + Date.now(),
      nome: newSellerNome.trim(),
      email: newSellerEmail.trim().toLowerCase() || `${cleanGeneratedSlug}@vaveiculos.com.br`,
      telefone: newSellerTelefone.trim() ? maskPhone(newSellerTelefone) : '',
      metaMensal: Math.round(Number(newSellerMeta)) || 5,
      ativo: true,
      dataContratacao: new Date().toISOString()
    };
    onAddSalesperson(seller);
    setNewSellerNome('');
    setNewSellerEmail('');
    setNewSellerTelefone('');
    setNewSellerMeta(5);
  };

  const handleToggleSalespersonClick = (id: string) => {
    if (onToggleSalesperson) {
      onToggleSalesperson(id);
    } else {
      storageService.toggleSalespersonStatus(id);
    }
  };

  const handleDeleteSalespersonExecute = (id: string) => {
    if (onDeleteSalesperson) {
      onDeleteSalesperson(id);
    } else {
      storageService.deleteSalesperson(id);
    }
    setDeleteSalespersonConfirm(null);
  };

  const handleSaveEditSalespersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalesperson) return;
    if (!editingSalesperson.nome.trim()) {
      alert('Informe o nome completo do consultor de vendas.');
      return;
    }
    if (!editingSalesperson.email.trim() || !isValidEmail(editingSalesperson.email)) {
      alert('Informe um endereço de e-mail válido para o vendedor.');
      return;
    }
    if (editingSalesperson.telefone && editingSalesperson.telefone.trim() && !isValidPhone(editingSalesperson.telefone)) {
      alert('Por favor, informe um WhatsApp válido com DDD (10 ou 11 dígitos) para o vendedor.');
      return;
    }
    const meta = Number(editingSalesperson.metaMensal);
    if (isNaN(meta) || !Number.isFinite(meta) || meta < 1 || meta > 100) {
      alert('Informe uma meta mensal válida entre 1 e 100 veículos.');
      return;
    }
    const sanitizedSeller: Salesperson = {
      ...editingSalesperson,
      nome: editingSalesperson.nome.trim(),
      email: editingSalesperson.email.trim().toLowerCase(),
      telefone: editingSalesperson.telefone?.trim() ? maskPhone(editingSalesperson.telefone) : '',
      metaMensal: Math.round(meta)
    };
    if (onUpdateSalesperson) {
      onUpdateSalesperson(sanitizedSeller);
    } else {
      storageService.saveSalesperson(sanitizedSeller);
    }
    setEditingSalesperson(null);
  };

  // Filtragem de Financeiras
  const filteredFinanciers = useMemo(() => {
    return financiers.filter(f => {
      const isAtiva = f.ativa !== false && f.ativo !== false;
      if (financierFilter === 'ativas' && !isAtiva) return false;
      if (financierFilter === 'desativadas' && isAtiva) return false;
      if (financierSearch.trim()) {
        const q = financierSearch.toLowerCase();
        const matchesName = f.nome.toLowerCase().includes(q);
        const matchesPhone = (f.telefone || '').toLowerCase().includes(q);
        const matchesContact = (f.contato || f.contatoGerente || '').toLowerCase().includes(q);
        return matchesName || matchesPhone || matchesContact;
      }
      return true;
    });
  }, [financiers, financierFilter, financierSearch]);

  const activeFinanciersCount = useMemo(() => {
    return financiers.filter(f => f.ativa !== false && f.ativo !== false).length;
  }, [financiers]);

  // Filtragem de Membros da Equipe
  const filteredSalespeople = useMemo(() => {
    return salespeople.filter(s => {
      const isAtivo = s.ativo !== false;
      if (salespersonFilter === 'ativos' && !isAtivo) return false;
      if (salespersonFilter === 'desativados' && isAtivo) return false;
      if (salespersonSearch.trim()) {
        const q = salespersonSearch.toLowerCase();
        const matchesName = s.nome.toLowerCase().includes(q);
        const matchesEmail = (s.email || '').toLowerCase().includes(q);
        const matchesPhone = (s.telefone || '').toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesPhone;
      }
      return true;
    });
  }, [salespeople, salespersonFilter, salespersonSearch]);

  const activeSalespeopleCount = useMemo(() => {
    return salespeople.filter(s => s.ativo !== false).length;
  }, [salespeople]);

  // Paginação sob demanda com cache
  const paginatedFinanciers = usePaginatedList<Financier>({
    items: filteredFinanciers,
    initialPageSize: 5,
    dependencies: [financierSearch, financierFilter, filteredFinanciers.length]
  });

  const paginatedSalespeople = usePaginatedList<Salesperson>({
    items: filteredSalespeople,
    initialPageSize: 5,
    dependencies: [salespersonSearch, salespersonFilter, filteredSalespeople.length]
  });

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
    { id: 'store', label: 'Perfil da Loja', count: undefined },
    { id: 'letterhead_contracts', label: 'Papel Timbrado & Contratos', count: templates.length },
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
      rg: '2.345.678 SSP-PB',
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
      clienteRg: '4.567.890 SSP-PB',
      clienteTelefone: '(83) 99123-4567',
      clienteEndereco: 'Av. Epitácio Pessoa, 1200 - Areial - PB',
      vendedorId: 'vend_carlos',
      vendedorNome: 'Carlos Ramos',
      valorVenda: 104000,
      formaPagamento: 'a_vista_pix' as const,
      tipoContratoId: selectedTemplate.id || 'contrato_garantia_padrao',
      tipoContratoNome: selectedTemplate.titulo || 'Contrato de Compra e Venda',
      isRepasseSemGarantia: selectedTemplate.tipo === 'repasse',
      comissaoValor: 1040,
      comissaoPendente: false,
      custosPosVenda: []
    }
  };

  const renderedPreviewText = renderTemplate(selectedTemplate.conteudo, previewSample);
  const unknownSelectedTags = useMemo(
    () => findUnknownTemplateTags(selectedTemplate.conteudo || ''),
    [selectedTemplate.conteudo]
  );

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
        <div className="bg-[#17171A] border border-[#2D2D32] rounded-[14px] p-6 w-full space-y-6">
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
                <div className="w-52 h-20 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center overflow-hidden p-2">
                  <BrandLogo store={storeForm} size="lg" />
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2">
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

                    {storeForm.logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 text-xs font-semibold border border-neutral-800 hover:border-red-800/50 transition-colors cursor-pointer"
                        title="Remover logotipo personalizado e voltar ao emblema padrão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover Logotipo Personalizado
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    O logotipo é aplicado automaticamente no menu lateral, na barra superior de navegação, no cabeçalho e rodapé do catálogo de veículos, e nas impressões de contratos e recibos.
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
                  maxLength={100}
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
                  maxLength={140}
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
                  maxLength={18}
                  value={storeForm.cnpj}
                  onChange={(e) => setStoreForm({ ...storeForm, cnpj: maskCNPJ(e.target.value) })}
                  className={`${formStyles.input} font-mono`}
                />
              </div>

              <div>
                <label className={formStyles.label}>Telefone Fixo da Loja</label>
                <input
                  type="text"
                  maxLength={15}
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
                  maxLength={15}
                  value={storeForm.whatsapp}
                  onChange={(e) => setStoreForm({ ...storeForm, whatsapp: maskPhone(e.target.value) })}
                  className={`${formStyles.input} font-mono`}
                />
              </div>

              <div>
                <label className={formStyles.label}>Chave Pix para Recebimentos</label>
                <input
                  type="text"
                  maxLength={120}
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
                  <label className={formStyles.label}>Logradouro & Número *</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={storeForm.endereco}
                    onChange={(e) => setStoreForm({ ...storeForm, endereco: e.target.value })}
                    className={formStyles.input}
                  />
                </div>

                <div>
                  <label className={formStyles.label}>CEP</label>
                  <input
                    type="text"
                    maxLength={9}
                    value={storeForm.cep}
                    onChange={(e) => setStoreForm({ ...storeForm, cep: maskCEP(e.target.value) })}
                    className={`${formStyles.input} font-mono`}
                  />
                </div>

                <div>
                  <label className={formStyles.label}>Cidade *</label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={storeForm.cidade}
                    onChange={(e) => setStoreForm({ ...storeForm, cidade: e.target.value })}
                    className={formStyles.input}
                  />
                </div>

                <div>
                  <label className={formStyles.label}>Estado (UF) *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={storeForm.estado}
                    onChange={(e) => setStoreForm({ ...storeForm, estado: maskUF(e.target.value) })}
                    className={`${formStyles.input} font-mono uppercase`}
                  />
                </div>

                <div>
                  <label className={formStyles.label}>Site Institucional</label>
                  <input
                    type="text"
                    maxLength={120}
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
                        logoHeightPx: Math.round(clampNumber(e.target.value, 30, 120, 64))
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
                        fontSizePt: clampNumber(e.target.value, 8, 14, 10)
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
                        marginTopMm: Math.round(clampNumber(e.target.value, 5, 40, 15))
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
                  maxLength={140}
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

              {unknownSelectedTags.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Tag(s) não reconhecida(s):</strong>{' '}
                    <span className="font-mono text-amber-300">{unknownSelectedTags.join(', ')}</span>.
                    <p className="text-[11px] text-amber-300/80 mt-0.5">
                      Tags não catalogadas são substituídas automaticamente por linha de preenchimento para nunca deixar códigos crus na folha A4.
                    </p>
                  </div>
                </div>
              )}

              {/* Editor de Conteúdo */}
              <div>
                <label className={formStyles.label}>Corpo do Texto & Cláusulas</label>
                <textarea
                  rows={14}
                  maxLength={40000}
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

                {/* Folha A4 Virtual Unificada (sem duplicidade de assinaturas) */}
                <LetterheadA4Sheet
                  id="letterhead-test-sheet"
                  store={storeForm}
                  documentTitle={selectedTemplate.titulo}
                  renderedContent={renderedPreviewText}
                  sale={previewSample.sale}
                  owner={previewSample.owner}
                  compactPreview={true}
                />
              </div>

              {/* Botão de Teste de Impressão */}
              <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    printA4Document({
                      title: 'Folha A4 Timbrada de Teste - VA Veículos',
                      elementId: 'letterhead-test-sheet',
                      paperConfig: storeForm.papelTimbrado
                    })
                  }
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
        <div className="space-y-6 w-full">
          {/* Formulário de Credenciamento */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                  Credenciar Nova Financeira Parceira
                </h3>
              </div>
              <span className="text-[11px] text-neutral-400">
                {activeFinanciersCount} ativas de {financiers.length} cadastradas
              </span>
            </div>

            <form onSubmit={handleAddFinancierSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={formStyles.label}>Nome da Financeira *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
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
                  min="0.01"
                  max="50"
                  required
                  value={newFinTaxa}
                  onChange={(e) => setNewFinTaxa(clampNumber(e.target.value, 0, 50, 0))}
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>Telefone da Mesa</label>
                <input
                  type="text"
                  maxLength={15}
                  value={newFinTelefone}
                  onChange={(e) => setNewFinTelefone(maskPhone(e.target.value))}
                  placeholder="(83) 99876-5432"
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>Gerente de Contas</label>
                <input
                  type="text"
                  maxLength={100}
                  value={newFinContato}
                  onChange={(e) => setNewFinContato(e.target.value)}
                  placeholder="Ex: Mesa de Crédito - Patrícia"
                  className={formStyles.input}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/10"
                >
                  <Landmark className="w-4 h-4" />
                  Credenciar Financeira
                </button>
              </div>
            </form>
          </div>

          {/* Lista e Controles de Gestão */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            {/* Header com Filtros e Busca */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-950/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFinancierFilter('todas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    financierFilter === 'todas'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
                  }`}
                >
                  Todas ({financiers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFinancierFilter('ativas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    financierFilter === 'ativas'
                      ? 'bg-emerald-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ativas ({activeFinanciersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFinancierFilter('desativadas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    financierFilter === 'desativadas'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Desativadas ({financiers.length - activeFinanciersCount})
                </button>
              </div>

              {/* Busca Rápida */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={100}
                  value={financierSearch}
                  onChange={(e) => setFinancierSearch(e.target.value)}
                  placeholder="Filtrar por nome ou fone..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Listagem */}
            {paginatedFinanciers.totalItems === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                Nenhuma instituição financeira encontrada com os filtros selecionados.
              </div>
            ) : (
              <div>
                <div className="divide-y divide-neutral-800">
                  {paginatedFinanciers.paginatedItems.map((f) => {
                    const isAtiva = f.ativa !== false && f.ativo !== false;
                    return (
                      <div 
                        key={f.id} 
                        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          isAtiva ? 'hover:bg-neutral-800/40' : 'bg-neutral-950/40 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isAtiva 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                          }`}>
                            <Landmark className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white">{f.nome}</span>
                              {isAtiva ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Ativa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  Desativada
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span>Mesa: <strong className="text-neutral-300">{f.contato || f.contatoGerente || 'Geral'}</strong></span>
                              {f.telefone && <span>• Tel: <strong className="text-neutral-300">{f.telefone}</strong></span>}
                              <span>• Taxa Média: <strong className="text-emerald-400 font-num">{f.taxaMedia || 1.49}% a.m.</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação: Alternar Status, Editar e Apagar */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleFinancierClick(f.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                              isAtiva
                                ? 'bg-neutral-800 hover:bg-amber-900/40 text-amber-300 hover:text-amber-200 border-neutral-700 hover:border-amber-700/50'
                                : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/50'
                            }`}
                            title={isAtiva ? 'Desativar financeira' : 'Ativar financeira'}
                          >
                            {isAtiva ? (
                              <>
                                <PowerOff className="w-3.5 h-3.5" />
                                <span>Desativar</span>
                              </>
                            ) : (
                              <>
                                <Power className="w-3.5 h-3.5" />
                                <span>Ativar</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingFinancier(f)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                            title="Editar informações da financeira"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteFinancierConfirm(f)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-neutral-700 hover:border-red-800/60 transition-colors cursor-pointer"
                            title="Apagar instituição financeira"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {paginatedFinanciers.totalItems > 0 && (
                  <div className="p-3 border-t border-neutral-800">
                    <PaginationControls
                      currentPage={paginatedFinanciers.currentPage}
                      totalPages={paginatedFinanciers.totalPages}
                      totalItems={paginatedFinanciers.totalItems}
                      pageSize={paginatedFinanciers.pageSize}
                      onPageChange={paginatedFinanciers.goToPage}
                      onPageSizeChange={paginatedFinanciers.changePageSize}
                      pageSizeOptions={[5, 10, 20]}
                      isCached={paginatedFinanciers.isCurrentPageCached}
                      isLoading={paginatedFinanciers.isLoading}
                      itemLabel="financeiras"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 4: Equipe de Vendedores & Consultores */}
      {activeTab === 'salespeople' && (
        <div className="space-y-6 w-full">
          {/* Formulário de Cadastro de Vendedor */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                  Cadastrar Novo Vendedor
                </h3>
              </div>
              <span className="text-[11px] text-neutral-400">
                {activeSalespeopleCount} ativos de {salespeople.length} cadastrados
              </span>
            </div>

            <form onSubmit={handleAddSellerSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={formStyles.label}>Nome Completo *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={newSellerNome}
                  onChange={(e) => setNewSellerNome(e.target.value)}
                  placeholder="Ex: Carlos Ramos"
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>E-mail da Loja</label>
                <input
                  type="email"
                  maxLength={120}
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
                  maxLength={15}
                  value={newSellerTelefone}
                  onChange={(e) => setNewSellerTelefone(maskPhone(e.target.value))}
                  placeholder="(83) 98111-2233"
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>Meta Mensal (Veículos)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newSellerMeta}
                  onChange={(e) => setNewSellerMeta(Math.trunc(clampNumber(e.target.value, 0, 100, 0)))}
                  placeholder="5"
                  className={formStyles.input}
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/10"
                >
                  <Users className="w-4 h-4" />
                  Salvar Consultor de Vendas
                </button>
              </div>
            </form>
          </div>

          {/* Lista e Controles de Gestão de Equipe */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            {/* Header com Filtros e Busca */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-950/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSalespersonFilter('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    salespersonFilter === 'todos'
                      ? 'bg-amber-500 text-neutral-950'
                      : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
                  }`}
                >
                  Todos ({salespeople.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSalespersonFilter('ativos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    salespersonFilter === 'ativos'
                      ? 'bg-emerald-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ativos ({activeSalespeopleCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSalespersonFilter('desativados')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    salespersonFilter === 'desativados'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Desativados ({salespeople.length - activeSalespeopleCount})
                </button>
              </div>

              {/* Busca Rápida */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={100}
                  value={salespersonSearch}
                  onChange={(e) => setSalespersonSearch(e.target.value)}
                  placeholder="Filtrar por nome, e-mail ou fone..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Listagem */}
            {paginatedSalespeople.totalItems === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-xs">
                Nenhum membro da equipe encontrado com os filtros selecionados.
              </div>
            ) : (
              <div>
                <div className="divide-y divide-neutral-800">
                  {paginatedSalespeople.paginatedItems.map((s) => {
                    const isAtivo = s.ativo !== false;
                    return (
                      <div 
                        key={s.id} 
                        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          isAtivo ? 'hover:bg-neutral-800/40' : 'bg-neutral-950/40 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border font-bold text-xs ${
                            isAtivo 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                              : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                          }`}>
                            {s.nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white">{s.nome}</span>
                              {isAtivo ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Ativo na Loja
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  Desativado
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-neutral-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span>E-mail: <strong className="text-neutral-300">{s.email}</strong></span>
                              {s.telefone && <span>• Fone: <strong className="text-neutral-300">{s.telefone}</strong></span>}
                              <span>• Meta: <strong className="text-amber-400 font-num">{s.metaMensal || 5} veículos por mês</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação: Alternar Status, Editar e Apagar */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSalespersonClick(s.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                              isAtivo
                                ? 'bg-neutral-800 hover:bg-amber-900/40 text-amber-300 hover:text-amber-200 border-neutral-700 hover:border-amber-700/50'
                                : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/50'
                            }`}
                            title={isAtivo ? 'Desativar vendedor' : 'Ativar vendedor'}
                          >
                            {isAtivo ? (
                              <>
                                <PowerOff className="w-3.5 h-3.5" />
                                <span>Desativar</span>
                              </>
                            ) : (
                              <>
                                <Power className="w-3.5 h-3.5" />
                                <span>Ativar</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingSalesperson(s)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                            title="Editar dados do vendedor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteSalespersonConfirm(s)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-neutral-700 hover:border-red-800/60 transition-colors cursor-pointer"
                            title="Apagar membro da equipe"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {paginatedSalespeople.totalItems > 0 && (
                  <div className="p-3 border-t border-neutral-800">
                    <PaginationControls
                      currentPage={paginatedSalespeople.currentPage}
                      totalPages={paginatedSalespeople.totalPages}
                      totalItems={paginatedSalespeople.totalItems}
                      pageSize={paginatedSalespeople.pageSize}
                      onPageChange={paginatedSalespeople.goToPage}
                      onPageSizeChange={paginatedSalespeople.changePageSize}
                      pageSizeOptions={[5, 10, 20]}
                      isCached={paginatedSalespeople.isCurrentPageCached}
                      isLoading={paginatedSalespeople.isLoading}
                      itemLabel="consultores"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Editar Instituição Financeira */}
      {editingFinancier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  Editar Instituição Financeira
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingFinancier(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditFinancierSubmit} className="space-y-4">
              <div>
                <label className={formStyles.label}>Nome do Banco *</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={editingFinancier.nome}
                  onChange={(e) => setEditingFinancier({ ...editingFinancier, nome: e.target.value })}
                  className={formStyles.input}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={formStyles.label}>Taxa Média a.m. (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="50"
                    required
                    value={editingFinancier.taxaMedia ?? 1.49}
                    onChange={(e) => setEditingFinancier({ ...editingFinancier, taxaMedia: clampNumber(e.target.value, 0, 50, 0) })}
                    className={formStyles.input}
                  />
                </div>
                <div>
                  <label className={formStyles.label}>Telefone</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editingFinancier.telefone || ''}
                    onChange={(e) => setEditingFinancier({ ...editingFinancier, telefone: maskPhone(e.target.value) })}
                    className={formStyles.input}
                  />
                </div>
              </div>

              <div>
                <label className={formStyles.label}>Contato do Gerente</label>
                <input
                  type="text"
                  maxLength={100}
                  value={editingFinancier.contato || editingFinancier.contatoGerente || ''}
                  onChange={(e) => setEditingFinancier({ 
                    ...editingFinancier, 
                    contato: e.target.value, 
                    contatoGerente: e.target.value 
                  })}
                  className={formStyles.input}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs text-neutral-300 font-medium">Status no Sistema</span>
                <button
                  type="button"
                  onClick={() => {
                    const isAtiva = editingFinancier.ativa !== false && editingFinancier.ativo !== false;
                    setEditingFinancier({
                      ...editingFinancier,
                      ativa: !isAtiva,
                      ativo: !isAtiva
                    });
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    editingFinancier.ativa !== false && editingFinancier.ativo !== false
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {editingFinancier.ativa !== false && editingFinancier.ativo !== false ? 'Ativa' : 'Desativada'}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingFinancier(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirmar Exclusão de Financeira */}
      {deleteFinancierConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Apagar Instituição Financeira?</h4>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Tem certeza que deseja apagar <strong className="text-white">"{deleteFinancierConfirm.nome}"</strong>? Esta instituição será removida do rol de parceiros da VA Veículos.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteFinancierConfirm(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFinancierExecute(deleteFinancierConfirm.id)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-red-600/20"
              >
                Sim, Apagar Financeira
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Editar Consultor de Vendas */}
      {editingSalesperson && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  Editar Consultor de Vendas
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingSalesperson(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSalespersonSubmit} className="space-y-4">
              <div>
                <label className={formStyles.label}>Nome Completo *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={editingSalesperson.nome}
                  onChange={(e) => setEditingSalesperson({ ...editingSalesperson, nome: e.target.value })}
                  className={formStyles.input}
                />
              </div>

              <div>
                <label className={formStyles.label}>E-mail *</label>
                <input
                  type="email"
                  required
                  maxLength={120}
                  value={editingSalesperson.email}
                  onChange={(e) => setEditingSalesperson({ ...editingSalesperson, email: e.target.value })}
                  className={formStyles.input}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={formStyles.label}>WhatsApp (DDD 83)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editingSalesperson.telefone}
                    onChange={(e) => setEditingSalesperson({ ...editingSalesperson, telefone: maskPhone(e.target.value) })}
                    className={formStyles.input}
                  />
                </div>
                <div>
                  <label className={formStyles.label}>Meta Mensal (Veículos)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editingSalesperson.metaMensal ?? 5}
                    onChange={(e) => setEditingSalesperson({ ...editingSalesperson, metaMensal: Math.trunc(clampNumber(e.target.value, 0, 100, 0)) })}
                    className={formStyles.input}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-xs text-neutral-300 font-medium">Status na Equipe</span>
                <button
                  type="button"
                  onClick={() => setEditingSalesperson({
                    ...editingSalesperson,
                    ativo: !(editingSalesperson.ativo !== false)
                  })}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    editingSalesperson.ativo !== false
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {editingSalesperson.ativo !== false ? 'Ativo na Loja' : 'Desativado'}
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingSalesperson(null)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Confirmar Exclusão de Membro da Equipe */}
      {deleteSalespersonConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Apagar Membro da Equipe?</h4>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                Tem certeza que deseja apagar <strong className="text-white">"{deleteSalespersonConfirm.nome}"</strong>? Este consultor deixará de constar na equipe comercial da VA Veículos.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteSalespersonConfirm(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSalespersonExecute(deleteSalespersonConfirm.id)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-lg shadow-red-600/20"
              >
                Sim, Apagar Membro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: Banco de Dados Firebase (VA VEÍCULOS) */}
      {activeTab === 'firebase' && (
        <div className="bg-[#17171A] border border-[#2D2D32] rounded-[14px] p-6 w-full space-y-6">
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
