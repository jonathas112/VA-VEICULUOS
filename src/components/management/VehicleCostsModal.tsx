import React, { useState } from 'react';
import { 
  X, Plus, DollarSign, Calculator, Trash2, ShieldCheck, 
  AlertTriangle, Wrench, Sparkles, FileText, CheckCircle2, TrendingUp, AlertCircle
} from 'lucide-react';
import { Vehicle, VehicleExpense } from '../../types';
import { 
  formatCurrency, computeAcquisitionCost, 
  computePatioExpenses, computePreSaleTotalCost, computeMarginPercent 
} from '../../utils/formatters';

interface VehicleCostsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (vehicleId: string, expense: VehicleExpense) => void;
}

export const VehicleCostsModal: React.FC<VehicleCostsModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onAddExpense
}) => {
  // New expense form
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState<VehicleExpense['categoria']>('mecanica');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState<number>(350);
  const [responsavel, setResponsavel] = useState('');

  // Simulator
  const [simulatedPrice, setSimulatedPrice] = useState<number>(vehicle?.valorAnunciado || 100000);

  if (!isOpen || !vehicle) return null;

  const acquisitionCost = computeAcquisitionCost(vehicle);
  const patioExpensesTotal = computePatioExpenses(vehicle);
  const totalCostBeforeSale = acquisitionCost + patioExpensesTotal;

  // Simulation math
  const simulatedMarginR$ = simulatedPrice - totalCostBeforeSale;
  const simulatedMarginPercent = computeMarginPercent(simulatedPrice, totalCostBeforeSale);

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || valor <= 0) {
      alert('Preencha a descrição e um valor positivo.');
      return;
    }

    const newExpense: VehicleExpense = {
      id: 'exp_' + Date.now(),
      data,
      categoria,
      descricao,
      valor: Number(valor),
      responsavel: responsavel || undefined
    };

    onAddExpense(vehicle.id, newExpense);
    setDescricao('');
    setValor(200);
  };

  const getCategoryLabel = (cat: VehicleExpense['categoria']) => {
    const labels: Record<string, string> = {
      mecanica: 'Mecânica / Motor',
      funilaria_pintura: 'Funilaria e Pintura',
      lavagem_estetica: 'Lavagem & Estética',
      despachante_doc: 'Despachante & Doc',
      pneus: 'Pneus & Alinhamento',
      pecas: 'Peças & Acessórios',
      outro: 'Outro Custo'
    };
    return labels[cat] || cat;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[16px] w-full max-w-4xl overflow-hidden shadow-2xl relative text-[#F5F5F5] my-8 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2D2D32] flex items-center justify-between bg-[#080809]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#D4130D] flex items-center justify-center text-white shadow-sm">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F5F5] font-display">
                Custos de Pátio & Simulador de Venda
              </h3>
              <p className="text-xs text-[#A7A7AB]">
                {vehicle.marca} {vehicle.modelo} {vehicle.versao} • Placa: {vehicle.placa}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] flex items-center justify-center text-[#CAC9CA] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Top summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 block">Aquisição + Débito Loja</span>
              <span className="text-lg font-bold text-white font-display">
                {formatCurrency(acquisitionCost)}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Pago: {formatCurrency(vehicle.valorPago)} {vehicle.debitoDetran?.quemArca === 'loja' ? `+ ${formatCurrency(vehicle.debitoDetran.valor)} (DETRAN)` : ''}
              </span>
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 block">Custos de Pátio Acumulados</span>
              <span className="text-lg font-bold text-amber-400 font-display">
                {formatCurrency(patioExpensesTotal)}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                {vehicle.custosPatio?.length || 0} lançamento(s)
              </span>
            </div>

            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 block">Custo Total Investido</span>
              <span className="text-lg font-bold text-blue-400 font-display">
                {formatCurrency(totalCostBeforeSale)}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Base mínima para cálculo de lucro
              </span>
            </div>
          </div>

          {/* SIMULADOR DE VENDA EM TEMPO REAL (Key requirement) */}
          <div className="bg-gradient-to-br from-neutral-950 to-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Simulador de Venda & Margem em Tempo Real
                </h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                vehicle.categoriaComercial === 'repasse'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {vehicle.categoriaComercial === 'repasse' ? 'Repasse (Sem Garantia)' : 'Venda Normal (Com Garantia 90D)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-6 space-y-2">
                <label className="text-xs text-neutral-400 block">
                  Simular Preço de Venda (R$):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={500}
                    value={simulatedPrice}
                    onChange={(e) => setSimulatedPrice(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-2.5 text-base font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <input
                  type="range"
                  min={Math.round(totalCostBeforeSale * 0.9)}
                  max={Math.round(totalCostBeforeSale * 1.6)}
                  step={500}
                  value={simulatedPrice}
                  onChange={(e) => setSimulatedPrice(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                />
              </div>

              <div className="sm:col-span-6 grid grid-cols-2 gap-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Margem Bruta (R$)</span>
                  <span className={`text-xl font-black font-display block ${
                    simulatedMarginR$ >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(simulatedMarginR$)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Margem Bruta (%)</span>
                  <span className={`text-xl font-black font-display block ${
                    simulatedMarginPercent >= 10 ? 'text-emerald-400' : simulatedMarginPercent >= 0 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {simulatedMarginPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-neutral-800/80 text-[11px] flex items-center gap-1.5">
                  {vehicle.categoriaComercial === 'repasse' ? (
                    <span className="text-amber-300">
                      ℹ️ Veículo de repasse: vendido sem garantia. Essa margem bruta não sofrerá retenção para reserva técnica de garantia mecânica.
                    </span>
                  ) : (
                    <span className="text-neutral-300">
                      ℹ️ Venda com garantia de 90 dias: recomenda-se margem mínima de 10% para absorver comissão de vendedor e eventuais acionamentos pós-venda.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form: Add new Patio Cost */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Lançar Novo Custo no Carro (Manutenção, Lavagem, etc.)
            </h4>

            <form onSubmit={handleAddExpenseSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="mecanica">Mecânica / Motor</option>
                  <option value="funilaria_pintura">Funilaria e Pintura</option>
                  <option value="lavagem_estetica">Lavagem & Estética</option>
                  <option value="despachante_doc">Despachante & Documentação</option>
                  <option value="pneus">Pneus & Alinhamento</option>
                  <option value="pecas">Peças & Acessórios</option>
                  <option value="outro">Outro Gasto</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Valor (R$) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  step={10}
                  value={valor}
                  onChange={(e) => setValor(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Oficina / Responsável</label>
                <input
                  type="text"
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  placeholder="Ex: Auto Mecânica Ramos"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs text-neutral-400 block mb-1">Descrição do Serviço / Peça *</label>
                <input
                  type="text"
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Troca de óleo, pastilhas de freio e filtro de ar condicionado"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  Adicionar Custo
                </button>
              </div>
            </form>
          </div>

          {/* Table of existing patio expenses */}
          <div>
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              Histórico de Custos no Pátio ({vehicle.custosPatio?.length || 0})
            </h4>

            {(!vehicle.custosPatio || vehicle.custosPatio.length === 0) ? (
              <div className="text-center py-6 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-500">
                Nenhum custo extra foi lançado para este veículo até o momento.
              </div>
            ) : (
              <div className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-neutral-900/60 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Oficina / Prestador</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {vehicle.custosPatio.map((exp) => (
                      <tr key={exp.id} className="hover:bg-neutral-900/30">
                        <td className="py-2.5 px-3 text-neutral-400 whitespace-nowrap">{exp.data}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px]">
                            {getCategoryLabel(exp.categoria)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-white font-medium">{exp.descricao}</td>
                        <td className="py-2.5 px-3 text-neutral-400">{exp.responsavel || '-'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                          {formatCurrency(exp.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
