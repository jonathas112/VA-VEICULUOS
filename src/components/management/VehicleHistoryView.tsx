import React, { useState, useMemo } from 'react';
import { 
  History, Search, 
  Car, CheckCircle, FileText, X, Clock, Eye
} from 'lucide-react';
import { Vehicle, FormerOwner, Sale, StoreProfile } from '../../types';
import { 
  formatCurrency, formatDate, formatNumber, 
  computeAcquisitionCost, computePatioExpenses, 
  computePreSaleTotalCost, computeNetProfit, computeMarginPercent 
} from '../../utils/formatters';
import { PaginationControls } from '../common/PaginationControls';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface VehicleHistoryViewProps {
  vehicles: Vehicle[];
  owners: FormerOwner[];
  sales: Sale[];
  store?: StoreProfile;
  onOpenContractModal?: (vehicle: Vehicle, type: 'compra' | 'venda') => void;
  onSelectOwner?: (ownerId: string) => void;
}

export const VehicleHistoryView: React.FC<VehicleHistoryViewProps> = ({
  vehicles,
  owners,
  sales,
  onOpenContractModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'em_estoque' | 'vendido'>('todos');
  
  // Modal de Ficha / Dossiê Completo
  const [selectedVehicleForDossier, setSelectedVehicleForDossier] = useState<Vehicle | null>(null);

  // Mapeamento rápido de donos e vendas
  const ownersMap = useMemo(() => {
    const map = new Map<string, FormerOwner>();
    owners.forEach(o => map.set(o.id, o));
    return map;
  }, [owners]);

  const salesMap = useMemo(() => {
    const map = new Map<string, Sale>();
    sales.forEach(s => map.set(s.veiculoId, s));
    return map;
  }, [sales]);

  // Filtragem multi-critério
  const filteredVehicles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return vehicles.filter(v => {
      // Filtro de status
      if (statusFilter !== 'todos' && v.status !== statusFilter) {
        return false;
      }

      if (!term) return true;

      const owner = ownersMap.get(v.antigoDonoId);
      const sale = salesMap.get(v.id);

      const matchesPlate = v.placa.toLowerCase().includes(term);
      const matchesRenavam = v.renavam.toLowerCase().includes(term);
      const matchesChassis = v.chassi.toLowerCase().includes(term);
      const matchesModel = v.modelo.toLowerCase().includes(term) || v.marca.toLowerCase().includes(term) || v.versao.toLowerCase().includes(term);
      const matchesColor = v.cor.toLowerCase().includes(term);
      const matchesOwnerName = owner ? owner.nome.toLowerCase().includes(term) : false;
      const matchesOwnerCpf = owner ? owner.cpf.toLowerCase().replace(/\D/g, '').includes(term.replace(/\D/g, '')) : false;
      const matchesBuyerName = sale ? sale.clienteNome.toLowerCase().includes(term) : false;
      const matchesBuyerCpf = sale ? sale.clienteCpf.toLowerCase().replace(/\D/g, '').includes(term.replace(/\D/g, '')) : false;

      return (
        matchesPlate ||
        matchesRenavam ||
        matchesChassis ||
        matchesModel ||
        matchesColor ||
        matchesOwnerName ||
        matchesOwnerCpf ||
        matchesBuyerName ||
        matchesBuyerCpf
      );
    });
  }, [vehicles, searchTerm, statusFilter, ownersMap, salesMap]);

  // Paginação com cache inteligente de páginas anteriores
  const pagination = usePaginatedList<Vehicle>({
    items: filteredVehicles,
    initialPageSize: 10,
    dependencies: [searchTerm, statusFilter, filteredVehicles.length]
  });

  // Obter dados do dossiê selecionado
  const selectedVehicleOwner = selectedVehicleForDossier ? ownersMap.get(selectedVehicleForDossier.antigoDonoId) : null;
  const selectedVehicleSale = selectedVehicleForDossier ? salesMap.get(selectedVehicleForDossier.id) : null;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Histórico Geral de Movimentação</h1>
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Rastreabilidade completa de cada veículo: entrada, antigo dono, custos de pátio, vendas e compradores (10 por página).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-xl">
          <span>Total cadastrado:</span>
          <strong className="text-white tabular-nums">{vehicles.length} veículos</strong>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por Placa, Antigo Dono, CPF, Modelo, Cor, RENAVAM ou Comprador..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs self-start md:self-auto">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'todos' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todos ({vehicles.length})
          </button>
          <button
            onClick={() => setStatusFilter('em_estoque')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'em_estoque' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Em Estoque ({vehicles.filter(v => v.status === 'em_estoque').length})
          </button>
          <button
            onClick={() => setStatusFilter('vendido')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              statusFilter === 'vendido' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Vendidos ({vehicles.filter(v => v.status === 'vendido').length})
          </button>
        </div>
      </div>

      {/* Tabela Paginada */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Veículo</th>
                <th className="py-3 px-4">Entrada & Origem</th>
                <th className="py-3 px-4">Antigo Proprietário</th>
                <th className="py-3 px-4">Custos de Pátio</th>
                <th className="py-3 px-4">Situação do Veículo</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {pagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-neutral-500">
                    <Car className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nenhum veículo encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((vehicle) => {
                  const owner = ownersMap.get(vehicle.antigoDonoId);
                  const sale = salesMap.get(vehicle.id);
                  const patioCosts = computePatioExpenses(vehicle);
                  const totalPreCost = computePreSaleTotalCost(vehicle);

                  return (
                    <tr key={vehicle.id} className="hover:bg-neutral-800/40 transition-colors group">
                      {/* Veículo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-10 rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800 flex-shrink-0">
                            <img
                              src={vehicle.fotos[0] || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80'}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {vehicle.marca} {vehicle.modelo}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {vehicle.versao} · {vehicle.cor} · {vehicle.anoModelo}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-500 font-mono">
                              <span>Placa: <strong className="text-neutral-300">{vehicle.placa}</strong></span>
                              <span>•</span>
                              <span>RENAVAM: {vehicle.renavam || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Entrada & Origem */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{formatDate(vehicle.dataEntrada)}</span>
                          <span className="text-[11px] text-neutral-400">
                            Pago: <strong className="text-amber-400 tabular-nums">{formatCurrency(vehicle.valorPago)}</strong>
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            Entrada por: {vehicle.cadastradoPor || 'Gestor'}
                          </span>
                        </div>
                      </td>

                      {/* Antigo Proprietário */}
                      <td className="py-3 px-4">
                        {owner ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-white line-clamp-1">{owner.nome}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">CPF: {owner.cpf}</span>
                            <span className="text-[10px] text-neutral-500">{owner.telefone}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic">Não vinculado</span>
                        )}
                      </td>

                      {/* Custos de Pátio */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-200 tabular-nums">
                            {formatCurrency(patioCosts)}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {vehicle.custosPatio?.length || 0} despesa(s)
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            Custo Total: {formatCurrency(totalPreCost)}
                          </span>
                        </div>
                      </td>

                      {/* Situação do Veículo */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {vehicle.status === 'vendido' && sale ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                              <CheckCircle className="w-3 h-3" />
                              Vendido em {formatDate(sale.dataVenda)}
                            </span>
                            <span className="text-[11px] text-white font-medium">
                              Comprador: {sale.clienteNome}
                            </span>
                            <span className="text-[10px] text-amber-400 tabular-nums font-semibold">
                              Por: {formatCurrency(sale.valorVenda)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                              <Clock className="w-3 h-3" />
                              Em Estoque
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              Anunciado: {formatCurrency(vehicle.valorAnunciado)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedVehicleForDossier(vehicle)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação com Cache */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.changePageSize}
            pageSizeOptions={[10, 20, 50]}
            isCached={pagination.isCurrentPageCached}
            isLoading={pagination.isLoading}
            itemLabel="veículos no histórico"
          />
        </div>
      </div>

      {/* MODAL DE FICHA COMPLETA DO VEÍCULO */}
      {selectedVehicleForDossier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative text-white my-8 max-h-[92vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Ficha Técnica & Dossiê Completo
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {selectedVehicleForDossier.marca} {selectedVehicleForDossier.modelo} {selectedVehicleForDossier.versao} · Placa {selectedVehicleForDossier.placa}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVehicleForDossier(null)}
                className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Resumo Rápido Topo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Ano Fabricação e Modelo</span>
                  <strong className="text-white text-sm">{selectedVehicleForDossier.anoFabricacao}/{selectedVehicleForDossier.anoModelo}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Cor</span>
                  <strong className="text-white text-sm">{selectedVehicleForDossier.cor}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Quilometragem</span>
                  <strong className="text-white text-sm tabular-nums">{formatNumber(selectedVehicleForDossier.quilometragem)} km</strong>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Situação</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold mt-0.5 ${
                    selectedVehicleForDossier.status === 'vendido' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {selectedVehicleForDossier.status === 'vendido' ? 'Vendido' : 'Em Estoque'}
                  </span>
                </div>
              </div>

              {/* TIMELINE DO CICLO DE VIDA */}
              <div>
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Linha do Tempo de Ciclo de Vida na Loja
                </h4>

                <div className="relative border-l-2 border-neutral-800 ml-4 space-y-6 pb-2">
                  
                  {/* Evento 1: Entrada do Veículo */}
                  <div className="relative pl-6">
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-neutral-900" />
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">1. Entrada & Aquisição pela Loja</span>
                        <span className="text-neutral-400">{formatDate(selectedVehicleForDossier.dataEntrada)}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-300">
                        <div>
                          <p><strong className="text-neutral-400">Antigo Dono:</strong> {selectedVehicleOwner?.nome || 'Não especificado'}</p>
                          <p><strong className="text-neutral-400">CPF:</strong> {selectedVehicleOwner?.cpf || '-'}</p>
                          <p><strong className="text-neutral-400">Telefone:</strong> {selectedVehicleOwner?.telefone || '-'}</p>
                          <p><strong className="text-neutral-400">Endereço:</strong> {selectedVehicleOwner?.endereco || '-'}</p>
                        </div>
                        <div>
                          <p><strong className="text-neutral-400">Valor Pago ao Dono:</strong> <span className="text-amber-400 font-bold">{formatCurrency(selectedVehicleForDossier.valorPago)}</span></p>
                          <p><strong className="text-neutral-400">Débito Detran:</strong> {selectedVehicleForDossier.debitoDetran?.temDebito ? `${formatCurrency(selectedVehicleForDossier.debitoDetran.valor)} (Arcado por: ${selectedVehicleForDossier.debitoDetran.quemArca})` : 'Sem débitos'}</p>
                          <p><strong className="text-neutral-400">Cadastrado por:</strong> {selectedVehicleForDossier.cadastradoPor || 'Gestor'}</p>
                          <p><strong className="text-neutral-400">Custo Total de Aquisição:</strong> {formatCurrency(computeAcquisitionCost(selectedVehicleForDossier))}</p>
                        </div>
                      </div>

                      {onOpenContractModal && (
                        <div className="mt-3 pt-3 border-t border-neutral-800/80">
                          <button
                            onClick={() => onOpenContractModal(selectedVehicleForDossier, 'compra')}
                            className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Visualizar Recibo de Compra Timbrado
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evento 2: Preparação & Pátio */}
                  <div className="relative pl-6">
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-neutral-900" />
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">2. Preparação de Pátio & Manutenções</span>
                        <span className="text-blue-400 font-bold">
                          Total: {formatCurrency(computePatioExpenses(selectedVehicleForDossier))}
                        </span>
                      </div>

                      {selectedVehicleForDossier.custosPatio && selectedVehicleForDossier.custosPatio.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {selectedVehicleForDossier.custosPatio.map((exp, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-800">
                              <div>
                                <span className="font-medium text-white">{exp.descricao}</span>
                                <span className="text-[10px] text-neutral-400 block">
                                  Categoria: {exp.categoria} · Data: {formatDate(exp.data)}
                                </span>
                              </div>
                              <span className="font-bold text-neutral-200 tabular-nums">
                                {formatCurrency(exp.valor)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-neutral-500 italic">Nenhum custo adicional lançado para este veículo.</p>
                      )}
                    </div>
                  </div>

                  {/* Evento 3: Venda Concluída (Se houver) */}
                  {selectedVehicleSale ? (
                    <div className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-900" />
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-emerald-400 text-sm">3. Venda Concluída & Saída</span>
                          <span className="text-neutral-400">{formatDate(selectedVehicleSale.dataVenda)}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-300">
                          <div>
                            <p><strong className="text-neutral-400">Comprador:</strong> {selectedVehicleSale.clienteNome}</p>
                            <p><strong className="text-neutral-400">CPF Comprador:</strong> {selectedVehicleSale.clienteCpf}</p>
                            <p><strong className="text-neutral-400">Telefone:</strong> {selectedVehicleSale.clienteTelefone}</p>
                            <p><strong className="text-neutral-400">Endereço:</strong> {selectedVehicleSale.clienteEndereco}</p>
                          </div>
                          <div>
                            <p><strong className="text-neutral-400">Valor Final de Venda:</strong> <span className="text-emerald-400 font-bold">{formatCurrency(selectedVehicleSale.valorVenda)}</span></p>
                            <p><strong className="text-neutral-400">Forma de Pagamento:</strong> {selectedVehicleSale.formaPagamento}</p>
                            <p><strong className="text-neutral-400">Vendedor:</strong> {selectedVehicleSale.vendedorNome}</p>
                            <p><strong className="text-neutral-400">Comissão do Vendedor:</strong> {formatCurrency(selectedVehicleSale.comissaoValor)}</p>
                          </div>
                        </div>

                        {/* Balanço DRE do Carro */}
                        <div className="mt-4 p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-neutral-400 block uppercase">Lucro Líquido Real</span>
                            <span className="text-lg font-extrabold text-emerald-400 tabular-nums">
                              {formatCurrency(computeNetProfit(selectedVehicleForDossier, selectedVehicleSale))}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block uppercase">Margem Líquida</span>
                            <span className="text-sm font-bold text-white tabular-nums">
                              {computeMarginPercent(
                                selectedVehicleSale.valorVenda,
                                computePreSaleTotalCost(selectedVehicleForDossier) + (selectedVehicleSale.comissaoValor || 0)
                              ).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {onOpenContractModal && (
                          <div className="mt-3 pt-3 border-t border-neutral-800/80">
                            <button
                              onClick={() => onOpenContractModal(selectedVehicleForDossier, 'venda')}
                              className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Visualizar Contrato de Venda Timbrado
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-neutral-600 border-2 border-neutral-900" />
                      <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 text-neutral-400">
                        <span className="font-bold text-white block mb-1">3. Status Atual: Em Estoque no Pátio</span>
                        <p>O veículo está disponível para visitação e venda por {formatCurrency(selectedVehicleForDossier.valorAnunciado)}.</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
              <button
                onClick={() => setSelectedVehicleForDossier(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Fechar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
