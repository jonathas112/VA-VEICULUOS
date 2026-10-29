import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, X, Car, User, ShoppingCart, ArrowRight, ShieldCheck, 
  Users, DollarSign, FileText, Settings, Sparkles, Building2, 
  Clock, Phone, Mail, Award, CheckCircle2, ChevronRight, Hash
} from 'lucide-react';
import { 
  Vehicle, FormerOwner, Sale, Salesperson, 
  SystemUser, Financier, ContractTemplate 
} from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  owners: FormerOwner[];
  sales: Sale[];
  salespeople: Salesperson[];
  users?: SystemUser[];
  financiers?: Financier[];
  templates?: ContractTemplate[];
  onNavigateToTab: (tab: string, entityId?: string, queryText?: string) => void;
}

type SearchCategory = 'todos' | 'vehicles' | 'users' | 'owners' | 'sales' | 'other';

function normalizeText(text?: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function cleanAlphanumeric(text?: string): string {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  owners,
  sales,
  salespeople,
  users = [],
  financiers = [],
  templates = [],
  onNavigateToTab
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('todos');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
      setActiveCategory('todos');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Combine users and salespeople into a unified team list
  const unifiedUsers = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; email: string; telefone?: string; papel: 'gestor' | 'vendedor'; metaMensal?: number; ativo: boolean }>();

    users.forEach(u => {
      map.set(u.id, {
        id: u.id,
        nome: u.nome,
        email: u.email,
        telefone: u.telefone,
        papel: u.papel,
        metaMensal: u.metaMensal,
        ativo: u.ativo
      });
    });

    salespeople.forEach(sp => {
      if (!map.has(sp.id)) {
        map.set(sp.id, {
          id: sp.id,
          nome: sp.nome,
          email: sp.email,
          telefone: sp.telefone,
          papel: 'vendedor',
          metaMensal: sp.metaMensal,
          ativo: sp.ativo
        });
      }
    });

    return Array.from(map.values());
  }, [users, salespeople]);

  // System navigation shortcuts
  const systemShortcuts = useMemo(() => [
    { id: 'nav_inventory', label: 'Estoque de Veículos', tab: 'inventory', keywords: 'estoque carros patio veiculos', icon: Car, hint: 'Acessar inventário de carros' },
    { id: 'nav_users', label: 'Gestão de Usuários & Equipe', tab: 'users', keywords: 'usuarios equipe gestores vendedores logins acesso', icon: Users, hint: 'Cadastrar e gerenciar gestores e vendedores' },
    { id: 'nav_sales', label: 'Histórico de Vendas', tab: 'sales', keywords: 'vendas propostas negocios vendidos', icon: ShoppingCart, hint: 'Consultar relatórios e vendas realizadas' },
    { id: 'nav_commissions', label: 'Controle de Comissões', tab: 'commissions', keywords: 'comissoes pendentes aprovacao valores', icon: Clock, hint: 'Definir e aprovar comissões de vendedores' },
    { id: 'nav_financial', label: 'Painel Financeiro & Balanço', tab: 'financial', keywords: 'financeiro fluxo lucro despesas receitas', icon: DollarSign, hint: 'Balanço financeiro e lucros' },
    { id: 'nav_documents', label: 'Documentos & Contratos', tab: 'documents', keywords: 'documentos contratos recibos garantias repasses', icon: FileText, hint: 'Emitir contratos e recibos timbrados' },
    { id: 'nav_settings', label: 'Configurações da Loja', tab: 'settings', keywords: 'configuracoes papel timbrado loja cnpj bancos', icon: Settings, hint: 'Ajustes da loja, financeiras e configurações' }
  ], []);

  // Filtered Results
  const results = useMemo(() => {
    const rawQ = query.trim();
    if (!rawQ) {
      return {
        vehicles: [],
        users: [],
        owners: [],
        sales: [],
        financiers: [],
        templates: [],
        shortcuts: []
      };
    }

    const q = normalizeText(rawQ);
    const cleanQ = cleanAlphanumeric(rawQ);

    // 1. Matched Users & Team Members
    const matchedUsers = unifiedUsers.filter(u => {
      const nomeNorm = normalizeText(u.nome);
      const emailNorm = normalizeText(u.email);
      const telClean = cleanAlphanumeric(u.telefone);
      const papelNorm = normalizeText(u.papel);

      return (
        nomeNorm.includes(q) ||
        emailNorm.includes(q) ||
        papelNorm.includes(q) ||
        (cleanQ.length >= 3 && telClean.includes(cleanQ))
      );
    }).slice(0, 5);

    // 2. Matched Vehicles
    const matchedVehicles = vehicles.filter(v => {
      const marcaNorm = normalizeText(v.marca);
      const modeloNorm = normalizeText(v.modelo);
      const versaoNorm = normalizeText(v.versao);
      const placaClean = cleanAlphanumeric(v.placa);
      const corNorm = normalizeText(v.cor);
      const renavamClean = cleanAlphanumeric(v.renavam);
      const chassiClean = cleanAlphanumeric(v.chassi);
      const statusNorm = normalizeText(v.status);
      const anoStr = `${v.anoFabricacao}/${v.anoModelo}`;

      return (
        marcaNorm.includes(q) ||
        modeloNorm.includes(q) ||
        versaoNorm.includes(q) ||
        corNorm.includes(q) ||
        statusNorm.includes(q) ||
        anoStr.includes(q) ||
        (cleanQ.length >= 2 && (placaClean.includes(cleanQ) || renavamClean.includes(cleanQ) || chassiClean.includes(cleanQ)))
      );
    }).slice(0, 6);

    // 3. Matched Owners / Clients
    const matchedOwners = owners.filter(o => {
      const nomeNorm = normalizeText(o.nome);
      const cpfClean = cleanAlphanumeric(o.cpf);
      const telClean = cleanAlphanumeric(o.telefone);
      const cidadeNorm = normalizeText(o.cidade);

      return (
        nomeNorm.includes(q) ||
        cidadeNorm.includes(q) ||
        (cleanQ.length >= 3 && (cpfClean.includes(cleanQ) || telClean.includes(cleanQ)))
      );
    }).slice(0, 5);

    // 4. Matched Sales
    const matchedSales = sales.filter(s => {
      const clienteNorm = normalizeText(s.clienteNome);
      const clienteCpfClean = cleanAlphanumeric(s.clienteCpf);
      const vendedorNorm = normalizeText(s.vendedorNome);
      const idClean = cleanAlphanumeric(s.id);

      // Também busca no veículo associado à venda
      const vehicle = vehicles.find(v => v.id === s.veiculoId);
      const vehicleDesc = vehicle ? normalizeText(`${vehicle.marca} ${vehicle.modelo} ${vehicle.placa}`) : '';

      return (
        clienteNorm.includes(q) ||
        vendedorNorm.includes(q) ||
        vehicleDesc.includes(q) ||
        (cleanQ.length >= 3 && (clienteCpfClean.includes(cleanQ) || idClean.includes(cleanQ)))
      );
    }).slice(0, 5);

    // 5. Matched Financiers
    const matchedFinanciers = financiers.filter(f => {
      const nomeNorm = normalizeText(f.nome);
      const contatoNorm = normalizeText(f.contatoGerente || f.contato);
      const telClean = cleanAlphanumeric(f.telefone);

      return (
        nomeNorm.includes(q) ||
        contatoNorm.includes(q) ||
        (cleanQ.length >= 3 && telClean.includes(cleanQ))
      );
    }).slice(0, 3);

    // 6. Matched Templates
    const matchedTemplates = templates.filter(t => {
      const tituloNorm = normalizeText(t.titulo);
      const descNorm = normalizeText(t.descricao);
      const tipoNorm = normalizeText(t.tipo);

      return (
        tituloNorm.includes(q) ||
        descNorm.includes(q) ||
        tipoNorm.includes(q)
      );
    }).slice(0, 3);

    // 7. System Shortcuts
    const matchedShortcuts = systemShortcuts.filter(s => {
      const labelNorm = normalizeText(s.label);
      const keyNorm = normalizeText(s.keywords);
      return labelNorm.includes(q) || keyNorm.includes(q);
    }).slice(0, 3);

    return {
      vehicles: matchedVehicles,
      users: matchedUsers,
      owners: matchedOwners,
      sales: matchedSales,
      financiers: matchedFinanciers,
      templates: matchedTemplates,
      shortcuts: matchedShortcuts
    };
  }, [query, vehicles, owners, sales, unifiedUsers, financiers, templates, systemShortcuts]);

  // Counters
  const totalCount = 
    results.vehicles.length + 
    results.users.length + 
    results.owners.length + 
    results.sales.length + 
    results.financiers.length + 
    results.templates.length + 
    results.shortcuts.length;

  // Flattened active items for keyboard navigation (Arrow Up / Down / Enter)
  const flattenedItems = useMemo(() => {
    const list: Array<{
      id: string;
      category: string;
      title: string;
      subtitle: string;
      tab: string;
      entityId?: string;
      queryText?: string;
    }> = [];

    if (activeCategory === 'todos' || activeCategory === 'users') {
      results.users.forEach(u => list.push({
        id: `u_${u.id}`,
        category: 'users',
        title: u.nome,
        subtitle: `${u.papel === 'gestor' ? 'Gestor Geral' : 'Consultor de Vendas'} • ${u.email}`,
        tab: 'users',
        entityId: u.id,
        queryText: u.nome
      }));
    }

    if (activeCategory === 'todos' || activeCategory === 'vehicles') {
      results.vehicles.forEach(v => list.push({
        id: `v_${v.id}`,
        category: 'vehicles',
        title: `${v.marca} ${v.modelo} ${v.versao}`,
        subtitle: `Placa: ${v.placa} • ${v.anoFabricacao}/${v.anoModelo} • ${v.status === 'em_estoque' ? 'Em Estoque' : 'Vendido'}`,
        tab: 'inventory',
        entityId: v.id,
        queryText: v.placa || v.modelo
      }));
    }

    if (activeCategory === 'todos' || activeCategory === 'owners') {
      results.owners.forEach(o => list.push({
        id: `o_${o.id}`,
        category: 'owners',
        title: o.nome,
        subtitle: `CPF: ${o.cpf} • Tel: ${o.telefone} • ${o.cidade}-${o.estado}`,
        tab: 'persons',
        entityId: o.id,
        queryText: o.nome
      }));
    }

    if (activeCategory === 'todos' || activeCategory === 'sales') {
      results.sales.forEach(s => list.push({
        id: `s_${s.id}`,
        category: 'sales',
        title: `Venda p/ ${s.clienteNome}`,
        subtitle: `Vendedor: ${s.vendedorNome} • Valor: ${formatCurrency(s.valorVenda)}`,
        tab: 'sales',
        entityId: s.id,
        queryText: s.clienteNome
      }));
    }

    if (activeCategory === 'todos' || activeCategory === 'other') {
      results.shortcuts.forEach(sc => list.push({
        id: `sc_${sc.id}`,
        category: 'shortcuts',
        title: sc.label,
        subtitle: sc.hint,
        tab: sc.tab
      }));
      results.financiers.forEach(f => list.push({
        id: `f_${f.id}`,
        category: 'financiers',
        title: f.nome,
        subtitle: `Gerente: ${f.contatoGerente || 'Geral'} • Tel: ${f.telefone || ''}`,
        tab: 'settings',
        entityId: f.id,
        queryText: f.nome
      }));
      results.templates.forEach(t => list.push({
        id: `t_${t.id}`,
        category: 'templates',
        title: t.titulo,
        subtitle: t.descricao,
        tab: 'documents',
        entityId: t.id,
        queryText: t.titulo
      }));
    }

    return list;
  }, [results, activeCategory]);

  // Reset selected index on results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flattenedItems.length, activeCategory]);

  // Keyboard navigation
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (flattenedItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < flattenedItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : flattenedItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flattenedItems[selectedIndex];
      if (item) {
        onNavigateToTab(item.tab, item.entityId, item.queryText);
        onClose();
      }
    }
  };

  const handleSelectItem = (tab: string, entityId?: string, queryText?: string) => {
    onNavigateToTab(tab, entityId, queryText);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#121214] border border-[#2D2D32] rounded-[16px] shadow-2xl overflow-hidden flex flex-col text-[#F5F5F5] my-2">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 sm:px-6 py-4 border-b border-[#2D2D32] bg-[#17171A]">
          <Search className="w-5 h-5 text-[#D4130D] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Pesquisar por carro, placa, Juliana, Carlos, CPF, cliente, venda ou menu..."
            className="w-full bg-transparent text-sm sm:text-base text-[#F5F5F5] placeholder-[#68686E] focus:outline-none"
          />

          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-[#A7A7AB] hover:text-[#F5F5F5] rounded transition-colors mr-1 cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-2 px-2 py-1 text-[11px] font-mono text-[#A7A7AB] hover:text-[#F5F5F5] bg-[#202024] hover:bg-[#2D2D32] border border-[#343439] rounded cursor-pointer transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Category Filters Bar */}
        {query.trim().length > 0 && totalCount > 0 && (
          <div className="flex items-center gap-1 px-4 py-2 bg-[#0D0D0F] border-b border-[#2D2D32] overflow-x-auto no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory('todos')}
              className={`px-2.5 py-1 rounded-[6px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === 'todos' ? 'bg-[#D4130D] text-white' : 'text-[#A7A7AB] hover:text-white hover:bg-[#17171A]'
              }`}
            >
              Todos ({totalCount})
            </button>

            {results.users.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory('users')}
                className={`px-2.5 py-1 rounded-[6px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeCategory === 'users' ? 'bg-[#D4130D] text-white' : 'text-[#A7A7AB] hover:text-white hover:bg-[#17171A]'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
                Equipe & Usuários ({results.users.length})
              </button>
            )}

            {results.vehicles.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory('vehicles')}
                className={`px-2.5 py-1 rounded-[6px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeCategory === 'vehicles' ? 'bg-[#D4130D] text-white' : 'text-[#A7A7AB] hover:text-white hover:bg-[#17171A]'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-[#D4130D]" />
                Veículos ({results.vehicles.length})
              </button>
            )}

            {results.owners.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory('owners')}
                className={`px-2.5 py-1 rounded-[6px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeCategory === 'owners' ? 'bg-[#D4130D] text-white' : 'text-[#A7A7AB] hover:text-white hover:bg-[#17171A]'
                }`}
              >
                <User className="w-3.5 h-3.5 text-[#22C55E]" />
                Pessoas & Donos ({results.owners.length})
              </button>
            )}

            {results.sales.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory('sales')}
                className={`px-2.5 py-1 rounded-[6px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeCategory === 'sales' ? 'bg-[#D4130D] text-white' : 'text-[#A7A7AB] hover:text-white hover:bg-[#17171A]'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[#F59E0B]" />
                Vendas ({results.sales.length})
              </button>
            )}
          </div>
        )}

        {/* Results Container */}
        <div ref={resultsContainerRef} className="max-h-[60vh] overflow-y-auto p-4 space-y-4 no-scrollbar">
          
          {/* EMPTY QUERY: Display Helpful Search Suggestions */}
          {!query.trim() && (
            <div className="py-4 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#68686E] block mb-2 px-1">
                  Atalhos Rápidos de Navegação
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {systemShortcuts.slice(0, 4).map(sc => {
                    const Icon = sc.icon;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => handleSelectItem(sc.tab)}
                        className="flex items-center justify-between p-3 rounded-[10px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] text-left transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-[8px] bg-[#202024] text-[#D4130D] group-hover:bg-[#D4130D] group-hover:text-white transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-[#F5F5F5] block group-hover:text-[#D4130D] transition-colors">
                              {sc.label}
                            </span>
                            <span className="text-[11px] text-[#A7A7AB] truncate block">
                              {sc.hint}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#68686E] group-hover:text-white" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#68686E] block mb-2 px-1">
                  Sugestões de Pesquisa (Clique para buscar)
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Juliana', 'Carlos', 'Corolla', 'Strada', 'admin@vaveiculos', 'Comissões', 'Recibo de Compra', 'Santander'].map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuery(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#D4130D]/50 text-xs text-[#CAC9CA] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Search className="w-3 h-3 text-[#D4130D]" />
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* QUERY TYPED BUT NO RESULTS */}
          {query.trim().length > 0 && totalCount === 0 && (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#17171A] border border-[#2D2D32] flex items-center justify-center mx-auto text-[#68686E]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#F5F5F5]">
                Nenhum resultado encontrado para &ldquo;<span className="text-[#D4130D]">{query}</span>&rdquo;
              </h3>
              <p className="text-xs text-[#A7A7AB] max-w-sm mx-auto">
                Verifique se o termo foi digitado corretamente ou tente pesquisar por placa, primeiro nome ou modelo do veículo.
              </p>
            </div>
          )}

          {/* 1. SEÇÃO: USUÁRIOS & EQUIPE (Gestores e Vendedores) */}
          {(activeCategory === 'todos' || activeCategory === 'users') && results.users.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
                <Users className="w-3.5 h-3.5 text-[#3B82F6]" /> 
                <span>Usuários & Equipe ({results.users.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.users.map((u) => {
                  const isGestor = u.papel === 'gestor';
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectItem('users', u.id, u.nome)}
                      className="w-full flex items-center justify-between p-3 rounded-[10px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#3B82F6]/50 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isGestor 
                            ? 'bg-[#D4130D]/20 text-[#D4130D] border border-[#D4130D]/40' 
                            : 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40'
                        }`}>
                          {u.nome.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#3B82F6] transition-colors truncate">
                              {u.nome}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isGestor 
                                ? 'bg-[#D4130D]/10 text-[#D4130D] border border-[#D4130D]/30' 
                                : 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30'
                            }`}>
                              {isGestor ? 'Gestor' : 'Vendedor'}
                            </span>
                          </div>
                          <div className="text-xs text-[#A7A7AB] truncate flex items-center gap-2 mt-0.5">
                            <span>{u.email}</span>
                            {u.telefone && <span>• {u.telefone}</span>}
                            {!isGestor && u.metaMensal && <span>• Meta: {u.metaMensal} carros</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[11px] text-[#A7A7AB] group-hover:text-white">Abrir Equipe</span>
                        <ArrowRight className="w-4 h-4 text-[#A7A7AB] group-hover:text-[#3B82F6] transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. SEÇÃO: VEÍCULOS */}
          {(activeCategory === 'todos' || activeCategory === 'vehicles') && results.vehicles.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
                <Car className="w-3.5 h-3.5 text-[#D4130D]" /> 
                <span>Veículos em Estoque ({results.vehicles.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.vehicles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectItem('inventory', v.id, v.placa || v.modelo)}
                    className="w-full flex items-center justify-between p-3 rounded-[10px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#D4130D]/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      {v.fotos && v.fotos.length > 0 ? (
                        <img 
                          src={v.fotos[0]} 
                          alt="" 
                          className="w-10 h-10 rounded-[6px] object-cover shrink-0 border border-[#2D2D32]" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-[6px] bg-[#202024] flex items-center justify-center text-[#D4130D] shrink-0 border border-[#2D2D32]">
                          <Car className="w-5 h-5" />
                        </div>
                      )}

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#D4130D] transition-colors truncate">
                            {v.marca} {v.modelo}
                          </span>
                          <span className="text-xs text-[#A7A7AB] font-normal truncate">
                            {v.versao}
                          </span>
                        </div>
                        <div className="text-xs text-[#A7A7AB] flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[#F5F5F5] bg-[#202024] px-1.5 py-0.2 rounded border border-[#343439]">
                            {v.placa}
                          </span>
                          <span>• {v.anoFabricacao}/{v.anoModelo}</span>
                          <span>• {v.cor}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            v.status === 'em_estoque' ? 'text-[#22C55E] bg-[#22C55E]/10' : 'text-[#A7A7AB] bg-[#202024]'
                          }`}>
                            {v.status === 'em_estoque' ? 'Em Estoque' : 'Vendido'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-sm font-bold text-[#F5F5F5] font-num">
                        {formatCurrency(v.valorAnunciado)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#A7A7AB] group-hover:text-[#D4130D] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. SEÇÃO: CLIENTES & ANTIGOS DONOS */}
          {(activeCategory === 'todos' || activeCategory === 'owners') && results.owners.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
                <User className="w-3.5 h-3.5 text-[#22C55E]" /> 
                <span>Pessoas & Clientes ({results.owners.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.owners.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => handleSelectItem('persons', o.id, o.nome)}
                    className="w-full flex items-center justify-between p-3 rounded-[10px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#22C55E]/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="truncate">
                      <div className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#22C55E] transition-colors truncate">
                        {o.nome}
                      </div>
                      <div className="text-xs text-[#A7A7AB] flex items-center gap-2 mt-0.5 truncate">
                        <span>CPF: <strong className="text-[#CAC9CA] font-mono">{o.cpf}</strong></span>
                        {o.telefone && <span>• Tel: {o.telefone}</span>}
                        {o.cidade && <span>• {o.cidade}-{o.estado}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[11px] text-[#A7A7AB] group-hover:text-white">Ver Ficha</span>
                      <ArrowRight className="w-4 h-4 text-[#A7A7AB] group-hover:text-[#22C55E] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. SEÇÃO: VENDAS REALIZADAS */}
          {(activeCategory === 'todos' || activeCategory === 'sales') && results.sales.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
                <ShoppingCart className="w-3.5 h-3.5 text-[#F59E0B]" /> 
                <span>Vendas Realizadas ({results.sales.length})</span>
              </div>
              <div className="space-y-1.5">
                {results.sales.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectItem('sales', s.id, s.clienteNome)}
                    className="w-full flex items-center justify-between p-3 rounded-[10px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#F59E0B]/50 text-left transition-all cursor-pointer group"
                  >
                    <div className="truncate">
                      <div className="text-sm font-bold text-[#F5F5F5] group-hover:text-[#F59E0B] transition-colors truncate">
                        Comprador: {s.clienteNome}
                      </div>
                      <div className="text-xs text-[#A7A7AB] flex items-center gap-2 mt-0.5 truncate">
                        <span>Vendedor: <strong className="text-[#CAC9CA]">{s.vendedorNome}</strong></span>
                        <span>• Data: {new Date(s.dataVenda).toLocaleDateString('pt-BR')}</span>
                        {s.comissaoPendente && (
                          <span className="text-[10px] text-[#D4130D] font-bold bg-[#D4130D]/10 px-1 rounded">
                            Comissão Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-sm font-bold text-[#22C55E] font-num">
                        {formatCurrency(s.valorVenda)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#A7A7AB] group-hover:text-[#F59E0B] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. SEÇÃO: OUTROS (Financeiras, Modelos & Atalhos) */}
          {(activeCategory === 'todos' || activeCategory === 'other') && (results.financiers.length > 0 || results.templates.length > 0 || results.shortcuts.length > 0) && (
            <div>
              <div className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> 
                <span>Financeiras, Modelos & Ações Rápidas</span>
              </div>
              <div className="space-y-1.5">
                {results.shortcuts.map((sc) => {
                  const Icon = sc.icon;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleSelectItem(sc.tab)}
                      className="w-full flex items-center justify-between p-2.5 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] text-left transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-[#D4130D]" />
                        <span className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#D4130D]">
                          {sc.label}
                        </span>
                        <span className="text-[11px] text-[#A7A7AB] hidden sm:inline">({sc.hint})</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#68686E] group-hover:text-white" />
                    </button>
                  );
                })}

                {results.financiers.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectItem('settings', f.id, f.nome)}
                    className="w-full flex items-center justify-between p-2.5 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 className="w-4 h-4 text-[#3B82F6]" />
                      <span className="text-xs font-semibold text-[#F5F5F5] group-hover:text-[#3B82F6]">
                        Financeira: {f.nome}
                      </span>
                      {f.taxaMedia && (
                        <span className="text-[10px] text-neutral-400 font-mono">
                          (Taxa: {f.taxaMedia}%)
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#68686E] group-hover:text-white" />
                  </button>
                ))}

                {results.templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectItem('documents', t.id, t.titulo)}
                    className="w-full flex items-center justify-between p-2.5 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] text-left transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-semibold text-[#F5F5F5] group-hover:text-amber-500">
                        Modelo: {t.titulo}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#68686E] group-hover:text-white" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#0D0D0F] border-t border-[#2D2D32] text-[11px] text-[#68686E] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span>↑↓ para navegar</span>
            <span>↵ para selecionar</span>
            <span>ESC para fechar</span>
          </div>
          <span>Busca Global Integrada • VA Veículos</span>
        </div>

      </div>
    </div>
  );
};
