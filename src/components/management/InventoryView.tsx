import React, { useState, useMemo } from 'react';
import { 
  Car, Plus, Search, Filter, ShieldCheck, AlertTriangle, 
  Wrench, Calculator, ShoppingCart, FileText, CheckCircle2, 
  Trash2, Eye, Fuel, Gauge, Calendar, DollarSign, LayoutGrid, List
} from 'lucide-react';
import { Vehicle, FormerOwner, CommercialCategory, VehicleStatus, VehicleType } from '../../types';
import { 
  formatCurrency, formatNumber, formatDate, 
  computeAcquisitionCost, computePatioExpenses, computePreSaleTotalCost 
} from '../../utils/formatters';
import { PageHeader, KpiCard, StatusBadge, UnderlineTabs, formStyles } from '../common/DesignSystem';

interface InventoryViewProps {
  vehicles: Vehicle[];
  owners: FormerOwner[];
  onOpenEntryModal: () => void;
  onOpenCostsModal: (vehicle: Vehicle) => void;
  onOpenSaleModal: (vehicle: Vehicle) => void;
  onOpenReceiptModal: (vehicle: Vehicle, owner?: FormerOwner) => void;
  onDeleteVehicle: (vehicleId: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  vehicles,
  owners,
  onOpenEntryModal,
  onOpenCostsModal,
  onOpenSaleModal,
  onOpenReceiptModal,
  onDeleteVehicle
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'todos' | 'em_estoque' | 'vendido' | 'repasse'>('em_estoque');
  const [typeFilter, setTypeFilter] = useState<'todos' | VehicleType>('todos');
  const [viewMode, setViewMode] = useState<'tabela' | 'cards'>('tabela');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        v.marca.toLowerCase().includes(q) ||
        v.modelo.toLowerCase().includes(q) ||
        v.versao.toLowerCase().includes(q) ||
        v.placa.toLowerCase().includes(q) ||
        v.cor.toLowerCase().includes(q);

      let matchesTab = true;
      if (activeTab === 'em_estoque') matchesTab = v.status === 'em_estoque';
      else if (activeTab === 'vendido') matchesTab = v.status === 'vendido';
      else if (activeTab === 'repasse') matchesTab = v.categoriaComercial === 'repasse';

      const matchesType = typeFilter === 'todos' || v.tipo === typeFilter;

      return matchesSearch && matchesTab && matchesType;
    });
  }, [vehicles, searchTerm, activeTab, typeFilter]);

  // Stock KPIs
  const stockMetrics = useMemo(() => {
    const inStock = vehicles.filter(v => v.status === 'em_estoque');
    const totalInvested = inStock.reduce((acc, v) => acc + computePreSaleTotalCost(v), 0);
    const totalCommercial = inStock.reduce((acc, v) => acc + v.valorAnunciado, 0);
    const potentialGrossMargin = totalCommercial - totalInvested;
    return {
      count: inStock.length,
      totalInvested,
      totalCommercial,
      potentialGrossMargin
    };
  }, [vehicles]);

  const tabs = [
    { id: 'em_estoque', label: 'Em Estoque', count: vehicles.filter(v => v.status === 'em_estoque').length },
    { id: 'todos', label: 'Todos os Registros', count: vehicles.length },
    { id: 'repasse', label: 'Repasse (No Estado)', count: vehicles.filter(v => v.categoriaComercial === 'repasse').length },
    { id: 'vendido', label: 'Histórico Vendidos', count: vehicles.filter(v => v.status === 'vendido').length },
  ];

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumb="Operação • Gestão de Frotas"
        title="Estoque de Veículos"
        subtitle="Controle contábil rigoroso de custos de aquisição, despesas de pátio e preparação para venda."
        primaryAction={{
          label: "Cadastrar Veículo",
          icon: Plus,
          onClick: onOpenEntryModal,
          id: "inventory-btn-add-vehicle"
        }}
      />

      {/* 2. KPIs de Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Veículos Ativos"
          value={stockMetrics.count}
          icon={Car}
          subtext="Unidades prontas no pátio"
        />
        <KpiCard
          title="Capital Imobilizado"
          value={formatCurrency(stockMetrics.totalInvested)}
          icon={Calculator}
          subtext="Compra + DETRAN + Pátio"
        />
        <KpiCard
          title="Valor FIPE / Anunciado"
          value={formatCurrency(stockMetrics.totalCommercial)}
          icon={DollarSign}
          subtext="Preço de tabela showroom"
        />
        <KpiCard
          title="Margem Bruta Estimada"
          value={formatCurrency(stockMetrics.potentialGrossMargin)}
          trend="up"
          comparison="+ Potencial"
          subtext="Se vendidos pelo valor anunciado"
          isRedHighlight={true}
        />
      </div>

      {/* 3. Abas Horizontais (Seção 10) */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
      />

      {/* 4. Barra de Filtros e Pesquisa */}
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[10px] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-[#A7A7AB] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por marca, modelo, versão, placa ou cor..."
            className="w-full bg-[#202024] border border-[#343439] rounded-[8px] pl-9 pr-4 py-2 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#68686E] focus:outline-none focus:border-[#D4130D]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-[#202024] border border-[#343439] rounded-[8px] px-3 py-2 text-xs font-medium text-[#CAC9CA] focus:outline-none focus:border-[#D4130D]"
          >
            <option value="todos">Todos os Tipos (Carros & Motos)</option>
            <option value="carro">Apenas Carros</option>
            <option value="moto">Apenas Motos</option>
          </select>

          <div className="flex items-center bg-[#202024] border border-[#343439] rounded-[8px] p-0.5">
            <button
              onClick={() => setViewMode('tabela')}
              className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                viewMode === 'tabela' ? 'bg-[#17171A] text-white shadow-xs' : 'text-[#A7A7AB] hover:text-[#F5F5F5]'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#17171A] text-white shadow-xs' : 'text-[#A7A7AB] hover:text-[#F5F5F5]'
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Lista / Tabela de Veículos */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-12 text-center">
          <Car className="w-10 h-10 text-[#68686E] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#F5F5F5] font-display">
            Nenhum veículo localizado
          </h3>
          <p className="text-xs text-[#A7A7AB] max-w-sm mx-auto mt-1 mb-4">
            Não encontramos veículos correspondentes aos filtros selecionados.
          </p>
          <button
            onClick={onOpenEntryModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cadastrar Novo Veículo
          </button>
        </div>
      ) : viewMode === 'tabela' ? (
        
        /* TABELA PADRONIZADA (Seção 11) */
        <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={formStyles.tableHeader}>Veículo / Identificação</th>
                  <th className={formStyles.tableHeader}>Categoria</th>
                  <th className={formStyles.tableHeader}>Status</th>
                  <th className={`${formStyles.tableHeader} text-right`}>Custo Aquisição</th>
                  <th className={`${formStyles.tableHeader} text-right`}>Despesas Pátio</th>
                  <th className={`${formStyles.tableHeader} text-right`}>Custo Total Investido</th>
                  <th className={`${formStyles.tableHeader} text-right`}>Preço Anunciado</th>
                  <th className={`${formStyles.tableHeader} text-center`}>Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D2D32]">
                {filteredVehicles.map(v => {
                  const acquisitionCost = computeAcquisitionCost(v);
                  const patioExpenses = computePatioExpenses(v);
                  const totalInvested = computePreSaleTotalCost(v);
                  const owner = owners.find(o => o.id === v.antigoDonoId);

                  return (
                    <tr key={v.id} className={formStyles.tableRow}>
                      
                      {/* Veículo info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={v.fotos[0] || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=200'}
                            alt={v.modelo}
                            className="w-10 h-10 rounded-[6px] object-cover bg-[#202024] shrink-0 border border-[#2D2D32]"
                          />
                          <div>
                            <div className="font-semibold text-[#F5F5F5]">
                              {v.marca} {v.modelo}
                            </div>
                            <div className="text-xs text-[#A7A7AB] flex items-center gap-2">
                              <span className="font-mono text-[#CAC9CA] font-medium">{v.placa}</span>
                              <span>•</span>
                              <span>{v.anoFabricacao}/{v.anoModelo}</span>
                              <span>•</span>
                              <span>{v.cor}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Categoria Comercial */}
                      <td className="py-3 px-4">
                        <StatusBadge
                          status={v.categoriaComercial === 'repasse' ? 'repasse' : 'garantia'}
                        />
                      </td>

                      {/* Status Atual */}
                      <td className="py-3 px-4">
                        <StatusBadge
                          status={v.status}
                        />
                      </td>

                      {/* Custo de Aquisição */}
                      <td className="py-3 px-4 text-right font-num text-xs text-[#CAC9CA]">
                        {formatCurrency(acquisitionCost)}
                        {v.debitoDetran?.temDebito && v.debitoDetran.quemArca === 'loja' && (
                          <span className="block text-[10px] text-[#D4130D]">
                            + DETRAN {formatCurrency(v.debitoDetran.valor)}
                          </span>
                        )}
                      </td>

                      {/* Despesas de Pátio */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onOpenCostsModal(v)}
                          className="font-num text-xs text-[#CAC9CA] hover:text-[#D4130D] underline decoration-dotted transition-colors cursor-pointer"
                          title="Clique para detalhar custos de oficina, funilaria e estética"
                        >
                          {formatCurrency(patioExpenses)}
                        </button>
                        <span className="block text-[10px] text-[#A7A7AB]">
                          {v.custosPatio?.length || 0} lançamento(s)
                        </span>
                      </td>

                      {/* Custo Total Investido */}
                      <td className="py-3 px-4 text-right font-num font-bold text-sm text-[#F5F5F5]">
                        {formatCurrency(totalInvested)}
                      </td>

                      {/* Preço Anunciado */}
                      <td className="py-3 px-4 text-right font-num font-bold text-sm text-[#22C55E]">
                        {formatCurrency(v.valorAnunciado)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Custos e Simulador */}
                          <button
                            onClick={() => onOpenCostsModal(v)}
                            className="p-1.5 rounded-[6px] bg-[#202024] hover:bg-[#2D2D32] text-[#CAC9CA] hover:text-white border border-[#2D2D32] transition-colors cursor-pointer"
                            title="Lançar Custos de Pátio & Simulador de Margem"
                          >
                            <Wrench className="w-4 h-4 text-[#A7A7AB]" />
                          </button>

                          {/* Recibo de Compra */}
                          <button
                            onClick={() => onOpenReceiptModal(v, owner)}
                            className="p-1.5 rounded-[6px] bg-[#202024] hover:bg-[#2D2D32] text-[#CAC9CA] hover:text-white border border-[#2D2D32] transition-colors cursor-pointer"
                            title="Imprimir Recibo de Compra do Antigo Dono"
                          >
                            <FileText className="w-4 h-4 text-[#A7A7AB]" />
                          </button>

                          {/* Vender Veículo */}
                          {v.status === 'em_estoque' && (
                            <button
                              onClick={() => onOpenSaleModal(v)}
                              className="px-2.5 py-1 rounded-[6px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Registrar Venda / Contrato"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> Vender
                            </button>
                          )}

                          {/* Excluir se em estoque */}
                          {v.status === 'em_estoque' && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Deseja excluir o veículo ${v.marca} ${v.modelo} (${v.placa})?`)) {
                                  onDeleteVehicle(v.id);
                                }
                              }}
                              className="p-1.5 rounded-[6px] hover:bg-[#D4130D]/20 text-[#68686E] hover:text-[#D4130D] transition-colors cursor-pointer"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* CARDS GRID */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map(v => {
            const acquisitionCost = computeAcquisitionCost(v);
            const patioExpenses = computePatioExpenses(v);
            const totalInvested = computePreSaleTotalCost(v);
            const owner = owners.find(o => o.id === v.antigoDonoId);

            return (
              <div
                key={v.id}
                className="rounded-[12px] bg-[#17171A] border border-[#2D2D32] overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 bg-[#202024] relative">
                    <img
                      src={v.fotos[0] || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600'}
                      alt={v.modelo}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <StatusBadge status={v.status} />
                      <StatusBadge status={v.categoriaComercial === 'repasse' ? 'repasse' : 'garantia'} />
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-[#F5F5F5] font-display">
                        {v.marca} {v.modelo}
                      </h3>
                      <p className="text-xs text-[#A7A7AB] font-mono">
                        {v.placa} • {v.anoFabricacao}/{v.anoModelo} • {v.cor}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-[#2D2D32]">
                      <div>
                        <span className="text-[#A7A7AB] block text-[10px] uppercase">Custo Total</span>
                        <span className="font-bold text-[#F5F5F5] font-num">{formatCurrency(totalInvested)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#A7A7AB] block text-[10px] uppercase">Preço Anúncio</span>
                        <span className="font-bold text-[#22C55E] font-num">{formatCurrency(v.valorAnunciado)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-[#202024] border-t border-[#2D2D32] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenCostsModal(v)}
                      className="p-1.5 rounded-[6px] bg-[#17171A] hover:bg-[#2D2D32] border border-[#2D2D32] text-[#CAC9CA]"
                      title="Custos & Simulador"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenReceiptModal(v, owner)}
                      className="p-1.5 rounded-[6px] bg-[#17171A] hover:bg-[#2D2D32] border border-[#2D2D32] text-[#CAC9CA]"
                      title="Recibo Compra"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {v.status === 'em_estoque' && (
                    <button
                      onClick={() => onOpenSaleModal(v)}
                      className="px-3 py-1.5 rounded-[6px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Vender
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
