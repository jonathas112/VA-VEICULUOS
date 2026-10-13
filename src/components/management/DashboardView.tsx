import React, { useState, useMemo } from 'react';
import { 
  Car, ShoppingCart, DollarSign, Clock, TrendingUp, 
  Plus, ArrowRight, UserCheck, CheckCircle2, 
  AlertTriangle, Filter, Calendar, Users, Percent, Award
} from 'lucide-react';
import { Vehicle, Sale, Salesperson, UserRole } from '../../types';
import { 
  formatCurrency, formatDate, computePreSaleTotalCost, 
  computeNetProfit, computeMarginPercent, getMonthYearKey, getMonthName 
} from '../../utils/formatters';
import { PageHeader, KpiCard, StatusBadge } from '../common/DesignSystem';

interface DashboardViewProps {
  vehicles?: Vehicle[];
  sales?: Sale[];
  salespeople?: Salesperson[];
  store?: any;
  userRole?: UserRole;
  onNavigateTab?: (tab: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenEntryModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  vehicles = [],
  sales = [],
  salespeople = [],
  store,
  userRole = 'gestor',
  onNavigateTab,
  onNavigateToTab,
  onOpenEntryModal
}) => {
  const handleNavigate = (tab: string) => {
    if (onNavigateTab) onNavigateTab(tab);
    else if (onNavigateToTab) onNavigateToTab(tab);
  };

  // Period filter state
  const currentMonthKey = getMonthYearKey(new Date().toISOString());
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthKey);

  // Month options from sales history + current
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthKey);
    (sales || []).forEach(s => set.add(getMonthYearKey(s.dataVenda)));
    return Array.from(set).sort().reverse();
  }, [sales, currentMonthKey]);

  // Filtered sales by selected period (or all)
  const filteredSales = useMemo(() => {
    const list = sales || [];
    if (selectedPeriod === 'all') return list;
    return list.filter(s => getMonthYearKey(s.dataVenda) === selectedPeriod);
  }, [sales, selectedPeriod]);

  // KPIs Calculations
  const inStockVehicles = useMemo(() => (vehicles || []).filter(v => v.status === 'em_estoque'), [vehicles]);
  const totalStockInvestment = useMemo(() => inStockVehicles.reduce((acc, v) => acc + computePreSaleTotalCost(v), 0), [inStockVehicles]);
  
  const totalPeriodRevenue = useMemo(() => filteredSales.reduce((acc, s) => acc + s.valorVenda, 0), [filteredSales]);
  
  const totalPeriodNetProfit = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      const v = (vehicles || []).find(veh => veh.id === s.veiculoId);
      return acc + (v ? computeNetProfit(v, s) : 0);
    }, 0);
  }, [filteredSales, vehicles]);

  const periodMargin = totalPeriodRevenue > 0 
    ? ((totalPeriodNetProfit / totalPeriodRevenue) * 100).toFixed(1)
    : '0.0';

  const pendingCommissions = useMemo(() => (sales || []).filter(s => s.comissaoPendente), [sales]);

  // Ranking of sales by salesperson
  const sellerRankings = useMemo(() => {
    const list = Array.isArray(salespeople) ? salespeople : [];
    return list.map(seller => {
      const sellerSales = filteredSales.filter(s => s.vendedorId === seller.id);
      const sellerRevenue = sellerSales.reduce((acc, s) => acc + s.valorVenda, 0);
      const sellerCommission = sellerSales.reduce((acc, s) => acc + s.comissaoValor, 0);
      return {
        ...seller,
        salesCount: sellerSales.length,
        revenue: sellerRevenue,
        commission: sellerCommission
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [salespeople, filteredSales]);

  // Recent sales (up to 4)
  const recentSales = useMemo(() => {
    return [...(sales || [])]
      .sort((a, b) => new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime())
      .slice(0, 4);
  }, [sales]);

  // Recent vehicles added
  const recentInStock = useMemo(() => {
    return [...inStockVehicles]
      .sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime())
      .slice(0, 4);
  }, [inStockVehicles]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumb="Visão Executiva"
        title="Dashboard da Loja"
        subtitle="Controle em tempo real de estoque, vendas, faturamento líquido e comissões da equipe."
        primaryAction={onOpenEntryModal ? {
          label: "Novo Veículo",
          icon: Plus,
          onClick: onOpenEntryModal,
          id: "dashboard-btn-add-vehicle"
        } : undefined}
        secondaryAction={{
          label: "Estoque Completo",
          icon: Car,
          onClick: () => handleNavigate('inventory')
        }}
      />

      {/* 2. Filtro de Período */}
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[10px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#D4130D]" />
          <span className="text-xs font-semibold text-[#CAC9CA] uppercase tracking-wider">
            Período de Análise:
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[#202024] border border-[#343439] rounded-[8px] px-3 py-1.5 text-xs font-medium text-[#F5F5F5] focus:outline-none focus:border-[#D4130D]"
          >
            <option value="all">Todo o Histórico Acumulado</option>
            {monthOptions.map(m => (
              <option key={m} value={m}>
                {getMonthName(m)} {m === currentMonthKey ? '(Mês Atual)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Principais KPIs (6 Metas Solicitadas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* KPI 1: Vendas */}
        <KpiCard
          title="Vendas Realizadas"
          value={filteredSales.length}
          icon={ShoppingCart}
          subtext={selectedPeriod === 'all' ? 'Total acumulado' : 'No período selecionado'}
        />

        {/* KPI 2: Faturamento Bruto */}
        <KpiCard
          title="Faturamento Bruto"
          value={formatCurrency(totalPeriodRevenue)}
          icon={DollarSign}
          subtext="Volume total transacionado"
        />

        {/* KPI 3: Lucro Líquido Real */}
        <KpiCard
          title="Lucro Líquido Real"
          value={formatCurrency(totalPeriodNetProfit)}
          icon={TrendingUp}
          trend={totalPeriodNetProfit >= 0 ? 'up' : 'down'}
          comparison={totalPeriodNetProfit >= 0 ? '+ Positivo' : '- Atenção'}
          subtext="Deduz custos & comissões"
          isRedHighlight={true}
        />

        {/* KPI 4: Margem Líquida */}
        <KpiCard
          title="Margem de Lucro"
          value={`${periodMargin}%`}
          icon={Percent}
          subtext="Retorno sobre receita bruta"
        />

        {/* KPI 5: Veículos em Estoque */}
        <KpiCard
          title="Estoque Ativo"
          value={inStockVehicles.length}
          icon={Car}
          subtext="Prontos para comercialização"
        />

        {/* KPI 6: Capital Investido */}
        <KpiCard
          title="Capital em Pátio"
          value={formatCurrency(totalStockInvestment)}
          icon={Clock}
          subtext="Aquisição + Pátio atual"
        />

      </div>

      {/* 4. Banner de Pendências de Comissão (Se houver) */}
      {pendingCommissions.length > 0 && userRole === 'gestor' && (
        <div className="p-4 rounded-[12px] bg-[#17171A] border border-[#D4130D]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-[#D4130D]/20 border border-[#D4130D]/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#D4130D]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#F5F5F5] font-display">
                {pendingCommissions.length} comissão(ões) aguardando sua aprovação
              </h4>
              <p className="text-xs text-[#A7A7AB]">
                Vendas registradas por vendedores que requerem fixação manual do valor de comissão pelo Gestor.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleNavigate('commissions')}
            className="flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            Avaliar Comissões Agora <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Seções de Trabalho: Desempenho dos Vendedores & Últimas Vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Desempenho dos Vendedores */}
        <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2D2D32]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#D4130D]" />
              <h3 className="text-sm font-bold text-[#F5F5F5] font-display uppercase tracking-wider">
                Desempenho da Equipe de Vendas
              </h3>
            </div>
            <span className="text-xs text-[#A7A7AB]">
              {getMonthName(selectedPeriod)}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {sellerRankings.map((seller, idx) => (
              <div
                key={seller.id}
                className="p-3 rounded-[8px] bg-[#202024] border border-[#2D2D32] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-[#D4130D] text-white' : 'bg-[#2D2D32] text-[#CAC9CA]'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F5F5F5] flex items-center gap-2">
                      {seller.nome}
                      {idx === 0 && <Award className="w-3.5 h-3.5 text-[#F59E0B]" />}
                    </div>
                    <div className="text-xs text-[#A7A7AB]">
                      {seller.salesCount} veículo(s) vendido(s)
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-[#F5F5F5] font-num">
                    {formatCurrency(seller.revenue)}
                  </div>
                  <div className="text-[11px] text-[#A7A7AB]">
                    Comissão: <span className="text-[#22C55E] font-medium font-num">{formatCurrency(seller.commission)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[#2D2D32] flex justify-end">
            <button
              onClick={() => handleNavigate('financial')}
              className="text-xs text-[#CAC9CA] hover:text-[#D4130D] flex items-center gap-1 font-medium transition-colors"
            >
              Ver relatório financeiro detalhado <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Últimas Vendas Concluídas */}
        <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2D2D32]">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-[#22C55E]" />
              <h3 className="text-sm font-bold text-[#F5F5F5] font-display uppercase tracking-wider">
                Últimas Vendas Concluídas
              </h3>
            </div>
            <button
              onClick={() => handleNavigate('sales')}
              className="text-xs text-[#CAC9CA] hover:text-[#D4130D] flex items-center gap-1 font-medium"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {recentSales.map(s => {
              const v = vehicles.find(veh => veh.id === s.veiculoId);
              const profit = v ? computeNetProfit(v, s) : 0;
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-[8px] bg-[#202024] border border-[#2D2D32] flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold text-[#F5F5F5]">
                      {v ? `${v.marca} ${v.modelo}` : 'Veículo'}
                      <span className="text-xs text-[#A7A7AB] font-normal ml-1.5 font-mono">{v?.placa}</span>
                    </div>
                    <div className="text-xs text-[#A7A7AB]">
                      Cliente: {s.clienteNome} • {formatDate(s.dataVenda)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-[#F5F5F5] font-num">
                      {formatCurrency(s.valorVenda)}
                    </div>
                    {userRole === 'gestor' && (
                      <div className={`text-[11px] font-bold font-num ${profit >= 0 ? 'text-[#22C55E]' : 'text-[#D4130D]'}`}>
                        Lucro: {formatCurrency(profit)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-[#2D2D32] flex justify-between items-center text-xs text-[#A7A7AB]">
            <span>Contratos com validade jurídica</span>
            <button
              onClick={() => handleNavigate('sales')}
              className="text-[#D4130D] hover:underline font-semibold"
            >
              Auditar Pós-Venda
            </button>
          </div>
        </div>

      </div>

      {/* 6. Entradas Recentes no Estoque */}
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2D2D32]">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-[#D4130D]" />
            <h3 className="text-sm font-bold text-[#F5F5F5] font-display uppercase tracking-wider">
              Veículos Recentes em Estoque ({inStockVehicles.length} totais)
            </h3>
          </div>
          <button
            onClick={() => handleNavigate('inventory')}
            className="text-xs text-[#CAC9CA] hover:text-[#D4130D] flex items-center gap-1 font-medium"
          >
            Gerenciar Estoque <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentInStock.map(v => {
            const totalCost = computePreSaleTotalCost(v);
            return (
              <div
                key={v.id}
                className="rounded-[10px] bg-[#202024] border border-[#2D2D32] overflow-hidden flex flex-col group hover:border-[#343439] transition-colors"
              >
                <div className="h-32 bg-[#17171A] relative overflow-hidden">
                  <img
                    src={v.fotos[0] || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800'}
                    alt={`${v.marca} ${v.modelo}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2">
                    <StatusBadge
                      status={v.categoriaComercial === 'repasse' ? 'repasse' : 'disponivel'}
                    />
                  </div>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4 className="text-sm font-bold text-[#F5F5F5] font-display truncate">
                      {v.marca} {v.modelo}
                    </h4>
                    <p className="text-xs text-[#A7A7AB] font-mono">
                      {v.placa} • {v.anoFabricacao}/{v.anoModelo} • {v.cor}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#2D2D32] flex items-end justify-between">
                    <div>
                      <span className="text-[10px] text-[#A7A7AB] uppercase block">Preço Anunciado</span>
                      <span className="text-sm font-bold text-[#F5F5F5] font-num">
                        {formatCurrency(v.valorAnunciado)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#A7A7AB] uppercase block">Custo Pátio</span>
                      <span className="text-xs text-[#CAC9CA] font-medium font-num">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
