import React, { useState, useMemo } from 'react';
import { 
  Clock, CheckCircle2, DollarSign, 
  UserCheck, Car, AlertCircle
} from 'lucide-react';
import { Sale, Vehicle, UserRole } from '../../types';
import { 
  formatCurrency, computePreSaleTotalCost, 
  computePostSaleCosts, computeMarginPercent, formatDate,
  sumCurrency, roundCurrency, toCents, fromCents, clampNumber
} from '../../utils/formatters';
import { PageHeader, KpiCard, StatusBadge, formStyles } from '../common/DesignSystem';
import { PaginationControls } from '../common/PaginationControls';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface PendingCommissionsViewProps {
  sales: Sale[];
  vehicles: Vehicle[];
  userRole: UserRole;
  activeSellerId?: string;
  onAssignCommission: (saleId: string, amount: number, expectedVersion?: number) => void;
}

export const PendingCommissionsView: React.FC<PendingCommissionsViewProps> = ({
  sales,
  vehicles,
  userRole,
  activeSellerId,
  onAssignCommission
}) => {
  const isGestor = userRole === 'gestor';
  const pendingSales = useMemo(() => {
    return sales.filter(
      s => s.comissaoPendente && s.statusVenda !== 'cancelada' && (isGestor || !activeSellerId || s.vendedorId === activeSellerId)
    );
  }, [sales, isGestor, activeSellerId]);

  // Pre-index O(1) de veículos para visualização instantânea sem loops aninhados
  const vehiclesById = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach(v => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // Paginação sob demanda com cache
  const pagination = usePaginatedList<Sale>({
    items: pendingSales,
    initialPageSize: 5,
    dependencies: [pendingSales.length]
  });

  // Local state for commission inputs per sale
  const [commissionInputs, setCommissionInputs] = useState<Record<string, number>>({});

  const handleInputChange = (saleId: string, value: string | number) => {
    const safeVal = roundCurrency(clampNumber(value, 0, 1_000_000, 0));
    setCommissionInputs(prev => ({ ...prev, [saleId]: safeVal }));
  };

  const handleApprove = (saleId: string) => {
    if (userRole !== 'gestor') {
      alert('Operação negada: apenas o Gestor tem permissão para aprovar e fixar comissões.');
      return;
    }
    const rawAmount = commissionInputs[saleId] !== undefined ? commissionInputs[saleId] : 1200;
    if (isNaN(rawAmount) || !Number.isFinite(rawAmount) || toCents(rawAmount) < 0) {
      alert('Informe um valor de comissão válido.');
      return;
    }
    const targetSale = sales.find(s => s.id === saleId);
    if (!targetSale) {
      alert('Venda não localizada no sistema.');
      return;
    }
    if (toCents(rawAmount) > toCents(targetSale.valorVenda)) {
      alert('O valor da comissão não pode ultrapassar o valor total negociado da venda.');
      return;
    }
    onAssignCommission(saleId, roundCurrency(rawAmount), targetSale.version);
  };

  const totalPendingVolume = useMemo(() => sumCurrency(pendingSales.map(s => s.valorVenda)), [pendingSales]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumb="Financeiro • Controle de Comissões"
        title="Comissões Pendentes de Aprovação"
        subtitle="Vendas registradas pela equipe de vendedores aguardando fixação manual e deliberação da diretoria."
      />

      {/* 2. Mini-KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Vendas Pendentes"
          value={pendingSales.length}
          icon={Clock}
          subtext="Aguardando liberação"
          isRedHighlight={pendingSales.length > 0}
        />
        <KpiCard
          title="Volume em Vendas"
          value={formatCurrency(totalPendingVolume)}
          icon={DollarSign}
          subtext="Total faturado nestes negócios"
        />
        <KpiCard
          title="Acesso Atual"
          value={userRole === 'gestor' ? 'Gestor (Aprovador)' : 'Vendedor (Somente Leitura)'}
          icon={UserCheck}
          subtext={userRole === 'gestor' ? 'Permissão total para fixar valores' : 'Aguarde deliberação do gestor'}
        />
      </div>

      {/* Aviso de perfil vendedor se aplicável */}
      {userRole === 'vendedor' && (
        <div className="p-4 rounded-[12px] bg-[#17171A] border border-[#3B82F6]/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
          <div className="text-xs text-[#CAC9CA]">
            <strong className="text-[#F5F5F5] font-semibold block mb-0.5">Visualização de Vendedor</strong>
            Você pode acompanhar o status das suas vendas. A fixação dos valores monetários de comissão é realizada exclusivamente pelo perfil Gestor da VA Veículos.
          </div>
        </div>
      )}

      {/* 3. Lista de Vendas Pendentes */}
      {pagination.totalItems === 0 ? (
        <div className="p-12 text-center bg-[#17171A] border border-[#2D2D32] rounded-[12px]">
          <CheckCircle2 className="w-12 h-12 text-[#22C55E] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#F5F5F5] font-display">
            Todas as comissões estão em dia
          </h3>
          <p className="text-xs text-[#A7A7AB] max-w-sm mx-auto mt-1">
            Não há nenhuma comissão pendente de avaliação no sistema.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pagination.paginatedItems.map((sale) => {
            const vehicle = vehiclesById.get(sale.veiculoId);
            const preSaleCost = vehicle ? computePreSaleTotalCost(vehicle) : 0;
            const postSaleCosts = computePostSaleCosts(sale);

            // Simulação de lucro da loja com o valor inserido (em centavos exatos)
            const currentInputValue =
              commissionInputs[sale.id] !== undefined ? commissionInputs[sale.id] : 1200;
            const safeComm = roundCurrency(Math.max(0, Number(currentInputValue) || 0));
            const totalCostSimulated = sumCurrency([preSaleCost, postSaleCosts, safeComm]);
            const netProfitSimulated = fromCents(toCents(sale.valorVenda) - toCents(totalCostSimulated));
            const marginValueSimulated = computeMarginPercent(sale.valorVenda, totalCostSimulated);
            const marginPercentSimulated = marginValueSimulated.toFixed(1);

            return (
              <div
                key={sale.id}
                className="p-5 bg-[#17171A] border border-[#D4130D]/30 rounded-[12px] space-y-4"
              >
                {/* Header info */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#2D2D32]">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-[#202024] border border-[#2D2D32] flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-[#CAC9CA]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-bold text-[#F5F5F5] font-display">
                          {vehicle ? `${vehicle.marca} ${vehicle.modelo}` : 'Veículo'}
                        </h4>
                        <span className="font-mono text-xs text-[#A7A7AB] font-medium">{vehicle?.placa}</span>
                        <StatusBadge status="pendente" label="COMISSÃO PENDENTE" />
                      </div>
                      <div className="text-xs text-[#A7A7AB] mt-1">
                        Vendido por: <strong className="text-[#F5F5F5]">{sale.vendedorNome}</strong> para o cliente: <strong className="text-[#CAC9CA]">{sale.clienteNome}</strong> em {formatDate(sale.dataVenda)}
                      </div>
                    </div>
                  </div>

                  <div className="text-left lg:text-right">
                    <span className="text-[10px] text-[#A7A7AB] uppercase block">Valor Negociado da Venda</span>
                    <span className="text-lg font-bold text-[#F5F5F5] font-num">
                      {formatCurrency(sale.valorVenda)}
                    </span>
                  </div>
                </div>

                {/* Costs breakdown and live simulator (Exclusivo Gestor — protege margem confidencial da loja) */}
                {isGestor && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-[8px] bg-[#202024] border border-[#2D2D32] text-xs">
                    <div>
                      <span className="text-[#A7A7AB] uppercase text-[10px] block">Custo Total de Aquisição</span>
                      <span className="font-semibold text-[#F5F5F5] font-num">{formatCurrency(preSaleCost)}</span>
                    </div>
                    <div>
                      <span className="text-[#A7A7AB] uppercase text-[10px] block">Custos Pós-Venda</span>
                      <span className="font-semibold text-[#CAC9CA] font-num">{formatCurrency(postSaleCosts)}</span>
                    </div>
                    <div>
                      <span className="text-[#A7A7AB] uppercase text-[10px] block">Lucro Líquido Previsto Loja</span>
                      <span className={`font-bold font-num ${netProfitSimulated >= 0 ? 'text-[#22C55E]' : 'text-[#D4130D]'}`}>
                        {formatCurrency(netProfitSimulated)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#A7A7AB] uppercase text-[10px] block">Margem Líquida da Loja</span>
                      <span className={`font-bold font-num ${marginValueSimulated >= 0 ? 'text-[#F5F5F5]' : 'text-[#D4130D]'}`}>
                        {marginPercentSimulated}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Manager action section */}
                {userRole === 'gestor' ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 pt-2">
                    <div className="max-w-xs flex-1">
                      <label className={formStyles.label}>
                        Definir Valor da Comissão do Vendedor (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#A7A7AB] font-bold">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1000000"
                          value={currentInputValue}
                          onChange={(e) => handleInputChange(sale.id, e.target.value)}
                          className={`${formStyles.input} pl-9 font-num font-bold text-sm text-[#F5F5F5]`}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleApprove(sale.id)}
                      className="px-5 py-2.5 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Aprovar & Fixar Comissão ({formatCurrency(currentInputValue)})
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-[#A7A7AB] italic">
                    Aguardando análise e aprovação de valor por um Gestor da loja.
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Paginação de Comissões Pendentes */}
      {pagination.totalItems > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.goToPage}
          onPageSizeChange={pagination.changePageSize}
          pageSizeOptions={[5, 10, 20]}
          isCached={pagination.isCurrentPageCached}
          isLoading={pagination.isLoading}
          itemLabel="comissões pendentes"
        />
      )}

    </div>
  );
};
