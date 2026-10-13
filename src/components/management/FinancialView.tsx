import React, { useState, useMemo } from 'react';
import { 
  DollarSign, TrendingUp, Calendar, Award, UserCheck, 
  Wrench, Search, Printer, ShieldCheck, AlertTriangle, 
  ChevronRight, ArrowUpRight, Percent, Filter, ShoppingCart
} from 'lucide-react';
import { Sale, Vehicle, Salesperson, StoreProfile } from '../../types';
import { 
  formatCurrency, formatDate, computePreSaleTotalCost, 
  computePostSaleCosts, computeNetProfit, computeMarginPercent,
  getMonthYearKey, getMonthName 
} from '../../utils/formatters';
import { PageHeader, KpiCard, StatusBadge, formStyles } from '../common/DesignSystem';

interface FinancialViewProps {
  sales: Sale[];
  vehicles: Vehicle[];
  salespeople: Salesperson[];
  store: StoreProfile;
}

export const FinancialView: React.FC<FinancialViewProps> = ({
  sales,
  vehicles,
  salespeople,
  store
}) => {
  const currentMonthKey = getMonthYearKey(new Date().toISOString());
  const [selectedPeriodMode, setSelectedPeriodMode] = useState<'month' | 'all' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey || '2026-09');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Available months list
  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.add(getMonthYearKey(d.toISOString()));
    }
    sales.forEach(s => {
      const key = getMonthYearKey(s.dataVenda);
      if (key) keys.add(key);
    });
    return Array.from(keys).sort().reverse();
  }, [sales]);

  // Filter sales based on period selection
  const periodFilteredSales = useMemo(() => {
    return sales.filter(s => {
      if (selectedPeriodMode === 'month') {
        return getMonthYearKey(s.dataVenda) === selectedMonth;
      }
      if (selectedPeriodMode === 'custom') {
        let match = true;
        if (customStart) match = match && s.dataVenda >= customStart;
        if (customEnd) match = match && s.dataVenda <= customEnd + 'T23:59:59';
        return match;
      }
      return true; // 'all'
    });
  }, [sales, selectedPeriodMode, selectedMonth, customStart, customEnd]);

  // Text search filter
  const displayedSales = useMemo(() => {
    if (!searchTerm.trim()) return periodFilteredSales;
    const q = searchTerm.toLowerCase();
    return periodFilteredSales.filter(s => {
      const v = vehicles.find(veh => veh.id === s.veiculoId);
      return (
        s.clienteNome.toLowerCase().includes(q) ||
        s.vendedorNome.toLowerCase().includes(q) ||
        (v && (
          v.marca.toLowerCase().includes(q) ||
          v.modelo.toLowerCase().includes(q) ||
          v.placa.toLowerCase().includes(q)
        ))
      );
    });
  }, [periodFilteredSales, searchTerm, vehicles]);

  // Financial Consolidation Calculations
  const metrics = useMemo(() => {
    let grossRevenue = 0;
    let acquisitionTotal = 0;
    let detranTotal = 0;
    let patioTotal = 0;
    let postSaleTotal = 0;
    let commissionTotal = 0;

    periodFilteredSales.forEach(sale => {
      grossRevenue += sale.valorVenda;
      commissionTotal += sale.comissaoValor;
      postSaleTotal += computePostSaleCosts(sale);

      const vehicle = vehicles.find(v => v.id === sale.veiculoId);
      if (vehicle) {
        acquisitionTotal += vehicle.valorPago;
        if (vehicle.debitoDetran?.temDebito && vehicle.debitoDetran.quemArca === 'loja') {
          detranTotal += vehicle.debitoDetran.valor;
        }
        patioTotal += (vehicle.custosPatio || []).reduce((acc, c) => acc + c.valor, 0);
      }
    });

    const totalCosts = acquisitionTotal + detranTotal + patioTotal + postSaleTotal + commissionTotal;
    const netProfit = grossRevenue - totalCosts;
    const marginPercent = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : '0';

    return {
      grossRevenue,
      acquisitionTotal,
      detranTotal,
      patioTotal,
      postSaleTotal,
      commissionTotal,
      totalCosts,
      netProfit,
      marginPercent,
      salesCount: periodFilteredSales.length
    };
  }, [periodFilteredSales, vehicles]);

  // Most Profitable Sale in the period
  const mostProfitableSale = useMemo(() => {
    if (periodFilteredSales.length === 0) return null;
    let best = periodFilteredSales[0];
    let bestProfit = -Infinity;

    periodFilteredSales.forEach(s => {
      const v = vehicles.find(veh => veh.id === s.veiculoId);
      if (v) {
        const p = computeNetProfit(v, s);
        if (p > bestProfit) {
          bestProfit = p;
          best = s;
        }
      }
    });

    const v = vehicles.find(veh => veh.id === best.veiculoId);
    return {
      sale: best,
      vehicle: v,
      profit: bestProfit,
      margin: v ? computeMarginPercent(v, best) : '0'
    };
  }, [periodFilteredSales, vehicles]);

  // Salesperson ranking
  const sellerStats = useMemo(() => {
    return salespeople.map(sp => {
      const sellerSales = periodFilteredSales.filter(s => s.vendedorId === sp.id);
      const revenue = sellerSales.reduce((acc, s) => acc + s.valorVenda, 0);
      const commission = sellerSales.reduce((acc, s) => acc + s.comissaoValor, 0);
      const profitContribution = sellerSales.reduce((acc, s) => {
        const v = vehicles.find(veh => veh.id === s.veiculoId);
        return acc + (v ? computeNetProfit(v, s) : 0);
      }, 0);

      return {
        ...sp,
        salesCount: sellerSales.length,
        revenue,
        commission,
        profitContribution
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [salespeople, periodFilteredSales, vehicles]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumb="Controladoria • Financeiro"
        title="Balanço Mensal & DRE Contábil"
        subtitle="Auditoria contábil rigorosa de custos de aquisição, despesas de pátio, comissões de corretores e lucro líquido real."
        primaryAction={{
          label: "Imprimir Relatório",
          icon: Printer,
          onClick: () => window.print(),
          id: "financial-btn-print"
        }}
      />

      {/* 2. Barra de Filtro de Período */}
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[10px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#D4130D]" />
          <span className="text-xs font-semibold text-[#CAC9CA] uppercase tracking-wider">
            Período Contábil:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#202024] p-0.5 rounded-[8px] border border-[#343439] flex items-center">
            <button
              onClick={() => setSelectedPeriodMode('month')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${
                selectedPeriodMode === 'month' ? 'bg-[#17171A] text-white shadow-xs' : 'text-[#A7A7AB] hover:text-[#F5F5F5]'
              }`}
            >
              Por Mês
            </button>
            <button
              onClick={() => setSelectedPeriodMode('all')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${
                selectedPeriodMode === 'all' ? 'bg-[#17171A] text-white shadow-xs' : 'text-[#A7A7AB] hover:text-[#F5F5F5]'
              }`}
            >
              Todo o Histórico
            </button>
            <button
              onClick={() => setSelectedPeriodMode('custom')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${
                selectedPeriodMode === 'custom' ? 'bg-[#17171A] text-white shadow-xs' : 'text-[#A7A7AB] hover:text-[#F5F5F5]'
              }`}
            >
              Personalizado
            </button>
          </div>

          {selectedPeriodMode === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#202024] border border-[#343439] rounded-[8px] px-3 py-1.5 text-xs font-medium text-[#F5F5F5] focus:outline-none focus:border-[#D4130D]"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {getMonthName(m)} {m === currentMonthKey ? '(Mês Atual)' : ''}
                </option>
              ))}
            </select>
          )}

          {selectedPeriodMode === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-[#202024] border border-[#343439] rounded-[8px] px-2.5 py-1 text-xs text-[#F5F5F5]"
              />
              <span className="text-xs text-[#A7A7AB]">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-[#202024] border border-[#343439] rounded-[8px] px-2.5 py-1 text-xs text-[#F5F5F5]"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Grade Principal de Indicadores DRE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Faturamento */}
        <KpiCard
          title="Faturamento Bruto"
          value={formatCurrency(metrics.grossRevenue)}
          icon={DollarSign}
          subtext={`${metrics.salesCount} vendas no período`}
        />

        {/* Aquisição */}
        <KpiCard
          title="Custo de Aquisição"
          value={formatCurrency(metrics.acquisitionTotal + metrics.detranTotal)}
          icon={ShoppingCart}
          subtext={metrics.detranTotal > 0 ? `Inclui ${formatCurrency(metrics.detranTotal)} DETRAN` : 'Valor pago aos donos'}
        />

        {/* Pátio */}
        <KpiCard
          title="Custos de Pátio"
          value={formatCurrency(metrics.patioTotal)}
          icon={Wrench}
          subtext="Manutenção & preparação"
        />

        {/* Pós-Venda */}
        <KpiCard
          title="Pós-Venda / Garantia"
          value={formatCurrency(metrics.postSaleTotal)}
          icon={ShieldCheck}
          subtext="Oficina & socorro 24h"
        />

        {/* Comissões */}
        <KpiCard
          title="Comissões Vendas"
          value={formatCurrency(metrics.commissionTotal)}
          icon={UserCheck}
          subtext="Remuneração da equipe"
        />

        {/* Lucro Líquido Real */}
        <KpiCard
          title="Lucro Líquido Real"
          value={formatCurrency(metrics.netProfit)}
          icon={TrendingUp}
          trend={metrics.netProfit >= 0 ? 'up' : 'down'}
          comparison={`${metrics.marginPercent}%`}
          subtext="Margem líquida real da loja"
          isRedHighlight={true}
        />

      </div>

      {/* 4. Destaque: Venda Mais Lucrativa do Período */}
      {mostProfitableSale && mostProfitableSale.vehicle && mostProfitableSale.profit > 0 && (
        <div className="p-5 rounded-[12px] bg-[#17171A] border border-[#2D2D32] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[10px] bg-[#D4130D]/10 border border-[#D4130D]/30 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-[#D4130D]" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#D4130D] uppercase tracking-wider">
                Venda Mais Lucrativa do Período
              </div>
              <h3 className="text-base font-bold text-[#F5F5F5] font-display">
                {mostProfitableSale.vehicle.marca} {mostProfitableSale.vehicle.modelo} ({mostProfitableSale.vehicle.placa})
              </h3>
              <p className="text-xs text-[#A7A7AB] mt-0.5">
                Vendido por <strong className="text-[#CAC9CA]">{mostProfitableSale.sale.vendedorNome}</strong> para <strong className="text-[#CAC9CA]">{mostProfitableSale.sale.clienteNome}</strong> em {formatDate(mostProfitableSale.sale.dataVenda)}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-end md:self-auto">
            <div className="text-right">
              <span className="text-[10px] text-[#A7A7AB] uppercase block">Valor Venda</span>
              <span className="text-sm font-bold text-[#F5F5F5] font-num">{formatCurrency(mostProfitableSale.sale.valorVenda)}</span>
            </div>
            <div className="text-right pl-4 border-l border-[#2D2D32]">
              <span className="text-[10px] text-[#A7A7AB] uppercase block">Lucro Líquido Gerado</span>
              <span className="text-base font-bold text-[#22C55E] font-num">{formatCurrency(mostProfitableSale.profit)}</span>
              <span className="block text-[10px] text-[#22C55E] font-bold">Margem {mostProfitableSale.margin}%</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tabela de Desempenho e Comissões por Vendedor */}
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2D2D32]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#D4130D]" />
            <h3 className="text-sm font-bold text-[#F5F5F5] font-display uppercase tracking-wider">
              Desempenho e Comissões por Vendedor
            </h3>
          </div>
          <span className="text-xs text-[#A7A7AB]">
            Total Comissões: <strong className="text-[#22C55E] font-num">{formatCurrency(metrics.commissionTotal)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#2D2D32] text-[#CAC9CA]">
                <th className="py-2.5 px-3 font-semibold">Vendedor</th>
                <th className="py-2.5 px-3 font-semibold text-center">Vendas Fechadas</th>
                <th className="py-2.5 px-3 font-semibold text-right">Faturamento Total</th>
                <th className="py-2.5 px-3 font-semibold text-right">Contribuição Líquida</th>
                <th className="py-2.5 px-3 font-semibold text-right">Comissão a Pagar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2D32]">
              {sellerStats.map(s => (
                <tr key={s.id} className="hover:bg-[#202024]/40 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#F5F5F5]">{s.nome}</div>
                    <div className="text-[11px] text-[#A7A7AB]">{s.email}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-[#F5F5F5]">
                    {s.salesCount}
                  </td>
                  <td className="py-3 px-3 text-right font-num font-semibold text-[#CAC9CA]">
                    {formatCurrency(s.revenue)}
                  </td>
                  <td className="py-3 px-3 text-right font-num font-bold text-[#22C55E]">
                    {formatCurrency(s.profitContribution)}
                  </td>
                  <td className="py-3 px-3 text-right font-num font-bold text-[#F5F5F5]">
                    {formatCurrency(s.commission)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Demonstrativo Individual por Veículo Vendido */}
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#2D2D32]">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#22C55E]" />
            <h3 className="text-sm font-bold text-[#F5F5F5] font-display uppercase tracking-wider">
              Demonstrativo de Resultado por Veículo (DRE Individual)
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#A7A7AB] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa, cliente ou modelo..."
              className="w-full bg-[#202024] border border-[#343439] rounded-[6px] pl-8 pr-3 py-1.5 text-xs text-[#F5F5F5] placeholder-[#68686E] focus:outline-none focus:border-[#D4130D]"
            />
          </div>
        </div>

        {displayedSales.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#68686E]">
            Nenhuma venda localizada para o período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2D2D32] text-[#CAC9CA]">
                  <th className="py-2.5 px-3 font-semibold">Data / Veículo</th>
                  <th className="py-2.5 px-3 font-semibold">Vendedor / Cliente</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Venda (Bruta)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aquisição</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Pátio</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Pós-Venda</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Comissão</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Lucro Líquido</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Margem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D2D32]">
                {displayedSales.map(sale => {
                  const vehicle = vehicles.find(v => v.id === sale.veiculoId);
                  const acquisition = vehicle ? vehicle.valorPago + (vehicle.debitoDetran?.quemArca === 'loja' ? vehicle.debitoDetran.valor : 0) : 0;
                  const patio = vehicle ? (vehicle.custosPatio || []).reduce((acc, c) => acc + c.valor, 0) : 0;
                  const postSale = computePostSaleCosts(sale);
                  const netProfit = vehicle ? computeNetProfit(vehicle, sale) : 0;
                  const margin = vehicle ? computeMarginPercent(vehicle, sale) : '0';

                  return (
                    <tr key={sale.id} className="hover:bg-[#202024]/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#F5F5F5]">
                          {vehicle ? `${vehicle.marca} ${vehicle.modelo}` : 'Veículo'}
                        </div>
                        <div className="text-[11px] text-[#A7A7AB] font-mono">
                          {vehicle?.placa} • {formatDate(sale.dataVenda)}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="text-[#CAC9CA]">{sale.clienteNome}</div>
                        <div className="text-[11px] text-[#A7A7AB]">Vend.: {sale.vendedorNome}</div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-num font-bold text-[#F5F5F5]">
                        {formatCurrency(sale.valorVenda)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-num text-[#CAC9CA]">
                        {formatCurrency(acquisition)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-num text-[#A7A7AB]">
                        {formatCurrency(patio)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-num text-[#A7A7AB]">
                        {formatCurrency(postSale)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-num text-[#A7A7AB]">
                        {formatCurrency(sale.comissaoValor)}
                      </td>

                      <td className={`py-2.5 px-3 text-right font-num font-bold ${netProfit >= 0 ? 'text-[#22C55E]' : 'text-[#D4130D]'}`}>
                        {formatCurrency(netProfit)}
                      </td>

                      <td className="py-2.5 px-3 text-center font-num font-semibold text-[#CAC9CA]">
                        {margin}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
