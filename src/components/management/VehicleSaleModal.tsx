import React, { useState, useEffect } from 'react';
import { 
  X, ShoppingCart, UserCheck, ShieldCheck, AlertTriangle, 
  DollarSign, FileText, Check, AlertCircle, Building2, CreditCard
} from 'lucide-react';
import { 
  Vehicle, Sale, Financier, Salesperson, ContractTemplate, 
  UserRole, StoreProfile, PaymentMethod 
} from '../../types';
import { 
  formatCurrency, computeAcquisitionCost, 
  computePatioExpenses, computePreSaleTotalCost, computeMarginPercent 
} from '../../utils/formatters';

interface VehicleSaleModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  financiers: Financier[];
  salespeople: Salesperson[];
  templates: ContractTemplate[];
  userRole: UserRole;
  activeSeller: Salesperson | null;
  store: StoreProfile;
  onCompleteSale: (sale: Sale, vehicle: Vehicle) => void;
}

export const VehicleSaleModal: React.FC<VehicleSaleModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  financiers,
  salespeople,
  templates,
  userRole,
  activeSeller,
  store,
  onCompleteSale
}) => {
  const totalVehicleCost = vehicle ? computePreSaleTotalCost(vehicle) : 0;

  // Buyer state
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCpf, setClienteCpf] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEndereco, setClienteEndereco] = useState('');

  // Seller state
  const [vendedorId, setVendedorId] = useState<string>(
    userRole === 'vendedor' && activeSeller ? activeSeller.id : salespeople[0]?.id || ''
  );

  // Financials
  const [valorVenda, setValorVenda] = useState<number>(vehicle?.valorAnunciado || totalVehicleCost * 1.15);
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>('financiamento');
  const [financiadoraId, setFinanciadoraId] = useState<string>(financiers[0]?.id || '');
  const [valorEntrada, setValorEntrada] = useState<number>(Math.round((vehicle?.valorAnunciado || totalVehicleCost) * 0.3));
  const [valorFinanciado, setValorFinanciado] = useState<number>(
    Math.max(0, (vehicle?.valorAnunciado || totalVehicleCost) - Math.round((vehicle?.valorAnunciado || totalVehicleCost) * 0.3))
  );
  const [numeroParcelas, setNumeroParcelas] = useState<number>(48);

  // Guarantee & Contract
  const isDefaultRepasse = vehicle?.categoriaComercial === 'repasse';
  const [isRepasse, setIsRepasse] = useState(isDefaultRepasse);
  
  const defaultContractTemplate = templates.find(t => 
    isDefaultRepasse ? t.tipo === 'repasse' : t.tipo === 'garantia'
  ) || templates[0];
  const [tipoContratoId, setTipoContratoId] = useState<string>(defaultContractTemplate?.id || '');

  // Commission
  const [comissaoValor, setComissaoValor] = useState<number>(1500);
  const [observacoes, setObservacoes] = useState('');

  // Update contract model if repasse changes
  useEffect(() => {
    const matchingTemplate = templates.find(t => 
      isRepasse ? t.tipo === 'repasse' : t.tipo === 'garantia'
    );
    if (matchingTemplate) {
      setTipoContratoId(matchingTemplate.id);
    }
  }, [isRepasse, templates]);

  // Adjust financed amount when price or down payment changes
  useEffect(() => {
    if (formaPagamento === 'financiamento' || formaPagamento === 'misto') {
      setValorFinanciado(Math.max(0, valorVenda - valorEntrada));
    }
  }, [valorVenda, valorEntrada, formaPagamento]);

  if (!isOpen || !vehicle) return null;

  // Live Margins
  const margemBruta = valorVenda - totalVehicleCost;
  const comissaoFinal = userRole === 'gestor' ? comissaoValor : 0;
  const margemLiquidaInicial = margemBruta - comissaoFinal;
  const margemPercentual = computeMarginPercent(valorVenda, totalVehicleCost + comissaoFinal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (vehicle.status === 'vendido') {
      alert('Este veículo já consta como vendido no sistema.');
      return;
    }

    if (!clienteNome || !clienteCpf || !clienteEndereco) {
      alert('Por favor, preencha os dados cadastrais do cliente comprador (Nome, CPF e Endereço).');
      return;
    }

    if (isNaN(valorVenda) || valorVenda <= 0) {
      alert('Informe um valor de venda válido.');
      return;
    }

    if (formaPagamento === 'financiamento' || formaPagamento === 'misto') {
      if (isNaN(valorEntrada) || valorEntrada < 0) {
        alert('Informe um valor de entrada válido.');
        return;
      }
      if (valorEntrada > valorVenda) {
        alert('O valor da entrada não pode ser superior ao valor da venda.');
        return;
      }
    }

    const sellerObj = salespeople.find(s => s.id === vendedorId) || salespeople[0];
    const contractObj = templates.find(t => t.id === tipoContratoId) || defaultContractTemplate;
    const financierObj = financiers.find(f => f.id === financiadoraId);

    const isPendingCommission = userRole === 'vendedor';

    const newSale: Sale = {
      id: 'sale_' + Date.now(),
      veiculoId: vehicle.id,
      dataVenda: new Date().toISOString(),
      clienteNome,
      clienteCpf,
      clienteTelefone: clienteTelefone || '(11) 90000-0000',
      clienteEndereco,
      vendedorId: sellerObj.id,
      vendedorNome: sellerObj.nome,
      valorVenda: Number(valorVenda),
      formaPagamento,
      financiadoraId: formaPagamento === 'financiamento' ? financierObj?.id : undefined,
      financiadoraNome: formaPagamento === 'financiamento' ? financierObj?.nome : undefined,
      valorEntrada: (formaPagamento === 'financiamento' || formaPagamento === 'misto') ? Number(valorEntrada) : undefined,
      valorFinanciado: (formaPagamento === 'financiamento' || formaPagamento === 'misto') ? Number(valorFinanciado) : undefined,
      numeroParcelas: (formaPagamento === 'financiamento') ? Number(numeroParcelas) : undefined,
      tipoContratoId: contractObj.id,
      tipoContratoNome: contractObj.titulo,
      isRepasseSemGarantia: isRepasse,
      comissaoValor: isPendingCommission ? 0 : Number(comissaoValor),
      comissaoPendente: isPendingCommission,
      comissaoDefinidaPor: isPendingCommission ? undefined : 'Gestor Geral',
      dataDefinicaoComissao: isPendingCommission ? undefined : new Date().toISOString(),
      custosPosVenda: [],
      observacoes
    };

    onCompleteSale(newSale, vehicle);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[16px] w-full max-w-4xl overflow-hidden shadow-2xl relative text-[#F5F5F5] my-8 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2D2D32] flex items-center justify-between bg-[#080809]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#D4130D] flex items-center justify-center text-white font-bold shadow-sm">
              <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F5F5] font-display">
                Concretizar Venda do Veículo
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

        <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto space-y-6 flex-1">
          
          {/* VEHICLE SUMMARY & EXACT COST AUDIT */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">Veículo Selecionado</span>
                <span className="text-sm font-bold text-white font-display">
                  {vehicle.marca} {vehicle.modelo} {vehicle.versao} ({vehicle.anoModelo})
                </span>
                <span className="text-neutral-400 block">
                  Placa: {vehicle.placa} • Renavam: {vehicle.renavam} • {vehicle.quilometragem} km
                </span>
              </div>

              {/* Exact Cost Breakdown */}
              <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 text-right">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Custo Total Loja</span>
                <span className="text-base font-bold text-amber-400 font-display">
                  {formatCurrency(totalVehicleCost)}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  Compra ({formatCurrency(computeAcquisitionCost(vehicle))}) + Pátio ({formatCurrency(computePatioExpenses(vehicle))})
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: DADOS DO COMPRADOR */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              1. Dados do Cliente Comprador
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Nome Completo do Cliente *</label>
                <input
                  type="text"
                  required
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Ex: Dr. Roberto Guimarães"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">CPF do Comprador *</label>
                <input
                  type="text"
                  required
                  value={clienteCpf}
                  onChange={(e) => setClienteCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(e.target.value)}
                  placeholder="(11) 98888-7777"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs text-neutral-400 block mb-1">Endereço Residencial Completo *</label>
                <input
                  type="text"
                  required
                  value={clienteEndereco}
                  onChange={(e) => setClienteEndereco(e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: VENDEDOR RESPONSÁVEL & VALOR DA VENDA */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              2. Condições Comerciais e Pagamento
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Vendedor Responsável</label>
                <select
                  value={vendedorId}
                  onChange={(e) => setVendedorId(e.target.value)}
                  disabled={userRole === 'vendedor'}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none disabled:opacity-75"
                >
                  {salespeople.map(s => (
                    <option key={s.id} value={s.id} disabled={s.ativo === false}>
                      {s.nome}{s.ativo === false ? ' (Desativado)' : ''}
                    </option>
                  ))}
                </select>
                {userRole === 'vendedor' && (
                  <span className="text-[10px] text-neutral-500 block mt-0.5">
                    Vinculado automaticamente ao seu perfil de vendedor.
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Valor da Venda Fechado (R$) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  step={500}
                  value={valorVenda}
                  onChange={(e) => setValorVenda(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-emerald-400 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Forma de Pagamento</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value as PaymentMethod)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="financiamento">Financiamento Bancário</option>
                  <option value="a_vista_pix">À Vista (Pix / TED)</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="misto">Misto (Entrada + Financiamento / Cartão)</option>
                </select>
              </div>
            </div>

            {/* If Financiamento */}
            {(formaPagamento === 'financiamento' || formaPagamento === 'misto') && (
              <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-neutral-400 block mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    Financiadora Bancária Credenciada
                  </label>
                  <select
                    value={financiadoraId}
                    onChange={(e) => setFinanciadoraId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    {financiers.map(f => {
                      const isAtiva = f.ativa !== false && f.ativo !== false;
                      return (
                        <option key={f.id} value={f.id} disabled={!isAtiva}>
                          {f.nome} (Taxa: {f.taxaMedia || 1.49}% a.m.){!isAtiva ? ' - [Desativada]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Valor de Entrada (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Parcelas</label>
                  <select
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value={12}>12x</option>
                    <option value={24}>24x</option>
                    <option value={36}>36x</option>
                    <option value={48}>48x</option>
                    <option value={60}>60x</option>
                  </select>
                </div>

                <div className="sm:col-span-4 text-[11px] text-neutral-400 bg-neutral-950 p-2 rounded-lg border border-neutral-800 flex justify-between items-center">
                  <span>Valor Financiado pela Instituição: <strong className="text-amber-400">{formatCurrency(valorFinanciado)}</strong></span>
                  <span>{numeroParcelas}x fixas</span>
                </div>
              </div>
            )}

            {/* LIVE MARGIN AUDIT (Vendedor and Gestor view) */}
            <div className="bg-neutral-900/90 p-4 rounded-xl border border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Margem Real da Transação (Contando todos os custos)
                </span>
                <span className="text-xs text-emerald-400 font-bold">
                  Margem Líquida Prevista: {formatCurrency(margemLiquidaInicial)} ({margemPercentual.toFixed(1)}%)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-neutral-800 text-neutral-400">
                <div>
                  <span className="text-[10px] block">Valor da Venda</span>
                  <span className="text-white font-bold">{formatCurrency(valorVenda)}</span>
                </div>
                <div>
                  <span className="text-[10px] block">(-) Custo Total Veículo</span>
                  <span className="text-red-400 font-semibold">{formatCurrency(totalVehicleCost)}</span>
                </div>
                <div>
                  <span className="text-[10px] block">(=) Margem Bruta</span>
                  <span className="text-amber-400 font-bold">{formatCurrency(margemBruta)}</span>
                </div>
                <div>
                  <span className="text-[10px] block">(-) Comissão Loja</span>
                  <span className="text-neutral-300 font-semibold">{formatCurrency(comissaoFinal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: REPASSE VS GARANTIA & SELEÇÃO DE CONTRATO */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4" />
              3. Modalidade de Garantia & Modelo de Contrato Automático
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Garantia Comercial Acordada:</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRepasse(false)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      !isRepasse
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-700'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Com Garantia 90D
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRepasse(true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isRepasse
                        ? 'bg-amber-600 text-neutral-950 shadow-md'
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-700'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Repasse (No Estado)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Modelo de Contrato a ser Gerado:</label>
                <select
                  value={tipoContratoId}
                  onChange={(e) => setTipoContratoId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  {templates.filter(t => t.tipo === 'garantia' || t.tipo === 'repasse').map(t => (
                    <option key={t.id} value={t.id}>
                      {t.titulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: COMISSÃO DO VENDEDOR (CRITICAL PROMPT LOGIC) */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              4. Atribuição de Comissão do Vendedor
            </h4>

            {userRole === 'gestor' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-300">
                    Definição Manual de Comissão pelo <strong>Gestor</strong>:
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    (Vendedor: {salespeople.find(s => s.id === vendedorId)?.nome})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Valor da Comissão (R$):</label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={comissaoValor}
                      onChange={(e) => setComissaoValor(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-xs text-neutral-400 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 flex items-center">
                    <span>
                      Lucro Líquido final da loja após dedução da comissão: <strong className="text-emerald-400">{formatCurrency(margemLiquidaInicial)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* VENDEDOR LOGIN VIEW: AVISO OBRIGATÓRIO CONFORME PROMPT DO USUÁRIO */
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-200 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-white text-sm">
                    Aviso ao Vendedor: Definição de Comissão Pendente
                  </p>
                  <p className="text-neutral-300 text-[11px] leading-relaxed">
                    Você está registrando esta venda logado como <strong>Vendedor</strong>. O gestor avaliará a margem líquida total e definirá sua comissão manualmente posteriormente. Esta venda será encaminhada diretamente para a aba <strong className="text-amber-400">"Comissões Pendentes"</strong> do Gestor.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] border border-[#2D2D32] text-xs font-semibold text-[#CAC9CA] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Concluir Venda & Gerar Contrato
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
