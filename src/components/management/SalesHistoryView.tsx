import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, Search, ShieldCheck, ShieldAlert,
  DollarSign, Plus, Wrench, FileText, 
  ChevronDown, ChevronUp, TrendingUp
} from 'lucide-react';
import { Sale, Vehicle, PostSaleCost, UserRole, ContractTemplate, StoreProfile } from '../../types';
import { 
  formatCurrency, formatDate, 
  computePostSaleCosts, computeNetProfit, computeMarginPercent 
} from '../../utils/formatters';
import { PageHeader, KpiCard, StatusBadge, UnderlineTabs, formStyles } from '../common/DesignSystem';
import { PaginationControls } from '../common/PaginationControls';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface SalesHistoryViewProps {
  sales: Sale[];
  vehicles: Vehicle[];
  userRole: UserRole;
  templates?: ContractTemplate[];
  store?: StoreProfile;
  initialTab?: 'vendas' | 'pos-venda';
  onAddPostSaleCost: (saleId: string, cost: PostSaleCost) => void;
  onOpenContract: (vehicle: Vehicle, sale: Sale) => void;
  initialSearchTerm?: string;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales,
  vehicles,
  userRole,
  initialTab = 'vendas',
  onAddPostSaleCost,
  onOpenContract,
  initialSearchTerm = ''
}) => {
  const [currentTab, setCurrentTab] = useState<'vendas' | 'pos-venda'>(initialTab);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);
  const [categoryFilter, setCategoryFilter] = useState<'todos' | 'garantia' | 'repasse' | 'com_custos'>('todos');
  
  // Expand/collapse post-sale cost details
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [collapsedInPosVenda, setCollapsedInPosVenda] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  // New post-sale cost form state
  const [isAddingPostCostForSaleId, setIsAddingPostCostForSaleId] = useState<string | null>(null);
  const [postCostData, setPostCostData] = useState({
    tipo: 'garantia_motor_cambio' as PostSaleCost['tipo'],
    descricao: '',
    valor: 450,
    oficinaParceira: ''
  });

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const vehicle = vehicles.find(v => v.id === sale.veiculoId);
      const query = searchTerm.toLowerCase();

      const matchesSearch = 
        sale.clienteNome.toLowerCase().includes(query) ||
        sale.vendedorNome.toLowerCase().includes(query) ||
        sale.id.toLowerCase().includes(query) ||
        (vehicle && (
          vehicle.marca.toLowerCase().includes(query) ||
          vehicle.modelo.toLowerCase().includes(query) ||
          vehicle.placa.toLowerCase().includes(query)
        ));

      let matchesCategory = true;
      if (categoryFilter === 'garantia') matchesCategory = !sale.isRepasseSemGarantia;
      else if (categoryFilter === 'repasse') matchesCategory = sale.isRepasseSemGarantia;
      else if (categoryFilter === 'com_custos') matchesCategory = (sale.custosPosVenda?.length || 0) > 0;

      let matchesTab = true;
      if (currentTab === 'pos-venda') {
        // Na aba de pós-venda, permite ver todas as vendas ou filtrar
        matchesTab = true;
      }

      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [sales, vehicles, searchTerm, categoryFilter, currentTab]);

  // Paginação com cache sob demanda
  const pagination = usePaginatedList<Sale>({
    items: filteredSales,
    initialPageSize: 10,
    dependencies: [searchTerm, categoryFilter, currentTab, filteredSales.length]
  });

  // Financial Metrics
  const summary = useMemo(() => {
    const totalRevenue = sales.reduce((acc, s) => acc + s.valorVenda, 0);
    const totalPostSale = sales.reduce((acc, s) => acc + computePostSaleCosts(s), 0);
    const totalProfit = sales.reduce((acc, s) => {
      const v = vehicles.find(veh => veh.id === s.veiculoId);
      return acc + (v ? computeNetProfit(v, s) : 0);
    }, 0);
    const warrantySales = sales.filter(s => !s.isRepasseSemGarantia).length;
    const repasseSales = sales.filter(s => s.isRepasseSemGarantia).length;

    return {
      totalRevenue,
      totalPostSale,
      totalProfit,
      warrantySales,
      repasseSales
    };
  }, [sales, vehicles]);

  const handleSavePostCost = (saleId: string) => {
    if (!postCostData.descricao || postCostData.valor <= 0) {
      alert('Preencha a descrição e um valor válido para o custo de pós-venda.');
      return;
    }

    const newCost: PostSaleCost = {
      id: 'cost_' + Date.now(),
      data: new Date().toISOString().split('T')[0],
      tipo: postCostData.tipo,
      descricao: postCostData.descricao,
      valor: Number(postCostData.valor),
      oficinaParceira: postCostData.oficinaParceira
    };

    onAddPostSaleCost(saleId, newCost);
    setIsAddingPostCostForSaleId(null);
    setPostCostData({
      tipo: 'garantia_motor_cambio',
      descricao: '',
      valor: 450,
      oficinaParceira: ''
    });
  };

  const getPostCostTypeLabel = (tipo: PostSaleCost['tipo']) => {
    switch (tipo) {
      case 'garantia_motor_cambio': return 'Garantia Motor & Câmbio (90D)';
      case 'garantia_eletrica': return 'Garantia Elétrica';
      case 'guincho': return 'Guincho 24h';
      case 'cortesia': return 'Cortesia de Venda';
      default: return 'Outro Custo Pós-Venda';
    }
  };

  const tabs = [
    { id: 'vendas', label: 'Vendas Concluídas', count: sales.length },
    { 
      id: 'pos-venda', 
      label: 'Auditoria de Pós-Venda & Garantias', 
      count: sales.filter(s => (s.custosPosVenda?.length || 0) > 0).length 
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumb="Operação • Gestão Comercial"
        title={currentTab === 'vendas' ? "Histórico de Vendas" : "Pós-Venda & Garantias"}
        subtitle="Auditoria contábil completa de vendas, margens líquidas, emissão de contratos e controle de acionamentos de garantia."
      />

      {/* 2. KPIs de Vendas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Faturamento Total"
          value={formatCurrency(summary.totalRevenue)}
          icon={DollarSign}
          subtext={`${sales.length} vendas registradas`}
        />
        <KpiCard
          title="Lucro Líquido Real"
          value={formatCurrency(summary.totalProfit)}
          icon={TrendingUp}
          trend={summary.totalProfit >= 0 ? 'up' : 'down'}
          comparison="+ Consolidado"
          subtext="Deduz pátio, comissão & pós-venda"
          isRedHighlight={true}
        />
        <KpiCard
          title="Gastos em Garantia"
          value={formatCurrency(summary.totalPostSale)}
          icon={Wrench}
          subtext="Total despendido em pós-venda"
        />
        <KpiCard
          title="Modalidades"
          value={`${summary.warrantySales} / ${summary.repasseSales}`}
          icon={ShieldCheck}
          subtext="Garantia 90D vs Repasse"
        />
      </div>

      {/* 3. Underline Tabs */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab as any)}
      />

      {/* 4. Barra de Filtros */}
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[10px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-[#A7A7AB] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por cliente, vendedor, modelo ou placa..."
            className="w-full bg-[#202024] border border-[#343439] rounded-[8px] pl-9 pr-4 py-2 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#68686E] focus:outline-none focus:border-[#D4130D]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-[#202024] border border-[#343439] rounded-[8px] px-3 py-2 text-xs font-medium text-[#CAC9CA] focus:outline-none focus:border-[#D4130D]"
          >
            <option value="todos">Todas as Vendas</option>
            <option value="com_custos">Com Custos de Pós-Venda</option>
            <option value="garantia">Apenas Garantia Legal 90 Dias</option>
            <option value="repasse">Apenas Repasse (Sem Garantia)</option>
          </select>
        </div>
      </div>

      {/* Informative Banner for Post-Sale tab */}
      {currentTab === 'pos-venda' && (
        <div className="bg-[#17171A] border border-[#2D2D32] rounded-[10px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-[#D4130D]/20 border border-[#D4130D]/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-[#D4130D]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#F5F5F5] font-display">
                Auditoria de Pós-Venda & Garantia Legal CDC
              </h4>
              <p className="text-xs text-[#A7A7AB]">
                Controle de acionamentos durante os 90 dias de garantia legal (Art. 26 CDC), gastos mecânicos e elétricos em oficinas parceiras e contratos de repasse no estado.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-[#202024] border border-[#2D2D32] text-[#CAC9CA]">
              {summary.warrantySales} com Garantia 90D
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#202024] border border-[#2D2D32] text-[#A7A7AB]">
              {summary.repasseSales} Repasse
            </span>
          </div>
        </div>
      )}

      {/* 5. Lista de Vendas */}
      {pagination.totalItems === 0 ? (
        <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-12 text-center">
          <ShoppingCart className="w-10 h-10 text-[#68686E] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#F5F5F5] font-display">
            Nenhuma venda localizada
          </h3>
          <p className="text-xs text-[#A7A7AB] max-w-sm mx-auto mt-1">
            Não há registros de venda correspondentes aos critérios de busca selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pagination.paginatedItems.map((sale) => {
            const vehicle = vehicles.find(v => v.id === sale.veiculoId);
            const netProfit = vehicle ? computeNetProfit(vehicle, sale) : 0;
            const marginPercent = vehicle ? computeMarginPercent(vehicle, sale) : '0';
            const isExpanded = currentTab === 'pos-venda'
              ? !collapsedInPosVenda[sale.id]
              : expandedSaleId === sale.id;
            const isAddingCost = isAddingPostCostForSaleId === sale.id;

            const toggleExpand = () => {
              if (currentTab === 'pos-venda') {
                setCollapsedInPosVenda(prev => ({ ...prev, [sale.id]: !prev[sale.id] }));
              } else {
                setExpandedSaleId(isExpanded ? null : sale.id);
              }
            };

            return (
              <div
                key={sale.id}
                className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] overflow-hidden transition-colors"
              >
                {/* Sale Header Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Vehicle & Client */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-[8px] bg-[#202024] border border-[#2D2D32] overflow-hidden shrink-0 flex items-center justify-center">
                      {vehicle?.fotos?.[0] ? (
                        <img src={vehicle.fotos[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingCart className="w-5 h-5 text-[#CAC9CA]" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-[#F5F5F5] font-display">
                          {vehicle ? `${vehicle.marca} ${vehicle.modelo}` : 'Veículo Registrado'}
                        </h3>
                        <span className="text-xs font-mono text-[#A7A7AB] font-medium">
                          {vehicle?.placa}
                        </span>
                        <StatusBadge
                          status={sale.isRepasseSemGarantia ? 'repasse' : 'garantia'}
                        />
                      </div>

                      <div className="text-xs text-[#A7A7AB] mt-1 space-x-2">
                        <span>Cliente: <strong className="text-[#F5F5F5]">{sale.clienteNome}</strong></span>
                        <span>•</span>
                        <span>Vendedor: <strong className="text-[#CAC9CA]">{sale.vendedorNome}</strong></span>
                        <span>•</span>
                        <span>Data: {formatDate(sale.dataVenda)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Numbers and actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#2D2D32]">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-[#A7A7AB] uppercase block">Valor da Venda</span>
                      <span className="text-base font-bold text-[#F5F5F5] font-num">
                        {formatCurrency(sale.valorVenda)}
                      </span>
                    </div>

                    {userRole === 'gestor' && (
                      <div className="text-right">
                        <span className="text-[10px] text-[#A7A7AB] uppercase block">Lucro Líquido Real</span>
                        <span className={`text-base font-bold font-num ${netProfit >= 0 ? 'text-[#22C55E]' : 'text-[#D4130D]'}`}>
                          {formatCurrency(netProfit)}
                        </span>
                        <span className="block text-[10px] text-[#A7A7AB]">
                          Margem: {marginPercent}%
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Contract modal */}
                      {vehicle && (
                        <button
                          onClick={() => onOpenContract(vehicle, sale)}
                          className="p-2 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] border border-[#2D2D32] text-[#CAC9CA] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                          title="Visualizar Contrato de Venda e Garantia"
                        >
                          <FileText className="w-4 h-4 text-[#A7A7AB]" />
                        </button>
                      )}

                      {/* Expand post-sale */}
                      <button
                        onClick={toggleExpand}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-semibold border transition-colors cursor-pointer ${
                          (sale.custosPosVenda?.length || 0) > 0
                            ? 'bg-[#D4130D]/10 text-[#D4130D] border-[#D4130D]/30'
                            : 'bg-[#202024] text-[#CAC9CA] border-[#2D2D32] hover:bg-[#2D2D32]'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Pós-Venda ({sale.custosPosVenda?.length || 0})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Expanded Post-Sale Area */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-[#202024] border-t border-[#2D2D32] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#2D2D32]">
                      <div>
                        <h4 className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider font-display">
                          Acionamentos de Garantia & Despesas Pós-Venda
                        </h4>
                        <p className="text-[11px] text-[#A7A7AB]">
                          Gastos em oficina, guincho ou peças que deduzem diretamente do lucro líquido contábil.
                        </p>
                      </div>

                      {!isAddingCost && (
                        <button
                          onClick={() => setIsAddingPostCostForSaleId(sale.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-semibold cursor-pointer shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Lançar Custo
                        </button>
                      )}
                    </div>

                    {/* Form to add post sale cost */}
                    {isAddingCost && (
                      <div className="p-4 rounded-[8px] bg-[#17171A] border border-[#2D2D32] space-y-3">
                        <div className="text-xs font-bold text-[#F5F5F5]">
                          Novo Lançamento de Pós-Venda
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div>
                            <label className={formStyles.label}>Tipo de Custo</label>
                            <select
                              value={postCostData.tipo}
                              onChange={(e) => setPostCostData({ ...postCostData, tipo: e.target.value as any })}
                              className={formStyles.select}
                            >
                              <option value="garantia_motor_cambio">Garantia Motor & Câmbio</option>
                              <option value="garantia_eletrica">Garantia Elétrica</option>
                              <option value="guincho">Guincho 24h</option>
                              <option value="cortesia">Cortesia para o Cliente</option>
                              <option value="outro">Outro Custo</option>
                            </select>
                          </div>

                          <div>
                            <label className={formStyles.label}>Valor (R$)</label>
                            <input
                              type="number"
                              value={postCostData.valor}
                              onChange={(e) => setPostCostData({ ...postCostData, valor: Number(e.target.value) })}
                              className={formStyles.input}
                            />
                          </div>

                          <div>
                            <label className={formStyles.label}>Oficina Parceira</label>
                            <input
                              type="text"
                              value={postCostData.oficinaParceira}
                              onChange={(e) => setPostCostData({ ...postCostData, oficinaParceira: e.target.value })}
                              placeholder="Ex: Auto Mecânica Central"
                              className={formStyles.input}
                            />
                          </div>

                          <div>
                            <label className={formStyles.label}>Descrição</label>
                            <input
                              type="text"
                              value={postCostData.descricao}
                              onChange={(e) => setPostCostData({ ...postCostData, descricao: e.target.value })}
                              placeholder="Ex: Troca de bomba d'água"
                              className={formStyles.input}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingPostCostForSaleId(null)}
                            className="px-3 py-1.5 rounded-[6px] bg-[#202024] hover:bg-[#2D2D32] text-xs font-semibold text-[#CAC9CA]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSavePostCost(sale.id)}
                            className="px-4 py-1.5 rounded-[6px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-semibold cursor-pointer"
                          >
                            Salvar Custo
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Table of existing post-sale expenses */}
                    {(!sale.custosPosVenda || sale.custosPosVenda.length === 0) ? (
                      <div className="py-4 text-center text-xs text-[#68686E]">
                        Nenhum custo pós-venda registrado para este veículo até o momento.
                      </div>
                    ) : (
                      <div className="border border-[#2D2D32] rounded-[8px] overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#17171A] text-[#CAC9CA] border-b border-[#2D2D32]">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Data</th>
                              <th className="py-2.5 px-3 font-semibold">Tipo</th>
                              <th className="py-2.5 px-3 font-semibold">Descrição</th>
                              <th className="py-2.5 px-3 font-semibold">Oficina</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#2D2D32] bg-[#17171A]/40">
                            {sale.custosPosVenda.map((c) => (
                              <tr key={c.id}>
                                <td className="py-2 px-3 text-[#A7A7AB]">{c.data}</td>
                                <td className="py-2 px-3 font-medium text-[#F5F5F5]">{getPostCostTypeLabel(c.tipo)}</td>
                                <td className="py-2 px-3 text-[#CAC9CA]">{c.descricao}</td>
                                <td className="py-2 px-3 text-[#A7A7AB]">{c.oficinaParceira || '-'}</td>
                                <td className="py-2 px-3 text-right font-bold text-[#D4130D] font-num">
                                  {formatCurrency(c.valor)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Paginação de Vendas com Cache */}
      {pagination.totalItems > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.goToPage}
          onPageSizeChange={pagination.changePageSize}
          pageSizeOptions={[5, 10, 20, 50]}
          isCached={pagination.isCurrentPageCached}
          isLoading={pagination.isLoading}
          itemLabel="vendas realizadas"
        />
      )}

    </div>
  );
};
