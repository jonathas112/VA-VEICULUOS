import React, { useState, useEffect } from 'react';
import { 
  X, ShoppingCart, UserCheck, ShieldCheck, AlertTriangle, 
  DollarSign, FileText, Check, AlertCircle, Building2
} from 'lucide-react';
import { 
  Vehicle, Sale, Financier, Salesperson, ContractTemplate, 
  UserRole, StoreProfile, PaymentMethod 
} from '../../types';
import { 
  formatCurrency, computeAcquisitionCost, 
  computePatioExpenses, computePreSaleTotalCost, computeMarginPercent,
  maskCPF, maskPhone, isValidCPF, isValidPhone,
  toCents, fromCents, roundCurrency, clampNumber, validateSaleFinancials
} from '../../utils/formatters';
import { sanitizeInputText } from '../../utils/security';

interface VehicleSaleModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  financiers: Financier[];
  salespeople: Salesperson[];
  templates: ContractTemplate[];
  userRole: UserRole;
  activeSeller: Salesperson | null;
  store?: StoreProfile;
  onCompleteSale: (sale: Sale, vehicle: Vehicle) => boolean | void;
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
  onCompleteSale
}) => {
  const totalVehicleCost = vehicle ? computePreSaleTotalCost(vehicle) : 0;
  const firstActiveFinancierId =
    financiers.find(f => f.ativa !== false && f.ativo !== false)?.id || financiers[0]?.id || '';
  const firstActiveSellerId =
    salespeople.find(s => s.ativo !== false)?.id || salespeople[0]?.id || '';

  // Buyer state
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCpf, setClienteCpf] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEndereco, setClienteEndereco] = useState('');

  // Seller state
  const [vendedorId, setVendedorId] = useState<string>(
    userRole === 'vendedor' && activeSeller ? activeSeller.id : firstActiveSellerId
  );

  // Financials
  const initialPrice = roundCurrency(vehicle?.valorAnunciado || totalVehicleCost * 1.15);
  const initialDownPayment = roundCurrency(Math.round(initialPrice * 0.3));
  const [valorVenda, setValorVenda] = useState<number>(initialPrice);
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>('financiamento');
  const [financiadoraId, setFinanciadoraId] = useState<string>(firstActiveFinancierId);
  const [valorEntrada, setValorEntrada] = useState<number>(initialDownPayment);
  const [valorFinanciado, setValorFinanciado] = useState<number>(
    fromCents(Math.max(0, toCents(initialPrice) - toCents(initialDownPayment)))
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

  // Carro na Troca / Trade-in & Taxas
  const [veiculoTrocaDescricao, setVeiculoTrocaDescricao] = useState('');
  const [veiculoTrocaValor, setVeiculoTrocaValor] = useState<number>(0);
  const [taxaCartaoPercentual, setTaxaCartaoPercentual] = useState<number>(3.99);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reinicializa estado contábil sempre que um novo veículo é aberto no modal
  useEffect(() => {
    if (!isOpen || !vehicle) return;
    const baseCost = computePreSaleTotalCost(vehicle);
    const price = roundCurrency(vehicle.valorAnunciado || baseCost * 1.15);
    const down = roundCurrency(Math.round(price * 0.3));
    const repasseFlag = vehicle.categoriaComercial === 'repasse';

    setClienteNome('');
    setClienteCpf('');
    setClienteTelefone('');
    setClienteEndereco('');
    setVendedorId(userRole === 'vendedor' && activeSeller ? activeSeller.id : firstActiveSellerId);
    setValorVenda(price);
    setFormaPagamento('financiamento');
    setFinanciadoraId(firstActiveFinancierId);
    setValorEntrada(down);
    setValorFinanciado(fromCents(Math.max(0, toCents(price) - toCents(down))));
    setNumeroParcelas(48);
    setVeiculoTrocaDescricao('');
    setVeiculoTrocaValor(0);
    setTaxaCartaoPercentual(3.99);
    setIsRepasse(repasseFlag);
    setComissaoValor(1500);
    setObservacoes('');
    setIsSubmitting(false);
  }, [isOpen, vehicle?.id]);

  // Update contract model if repasse changes
  useEffect(() => {
    const matchingTemplate = templates.find(t => 
      isRepasse ? t.tipo === 'repasse' : t.tipo === 'garantia'
    );
    if (matchingTemplate) {
      setTipoContratoId(matchingTemplate.id);
    }
  }, [isRepasse, templates]);

  // Adjust financed/card balance automatically in exact centavos when price, down payment, trade-in or method changes
  useEffect(() => {
    const vendaCents = toCents(valorVenda);
    if (formaPagamento === 'troca') {
      const entradaCents = toCents(valorEntrada);
      const trocaCents = toCents(veiculoTrocaValor);
      setValorFinanciado(fromCents(Math.max(0, vendaCents - entradaCents - trocaCents)));
    } else if (formaPagamento === 'financiamento' || formaPagamento === 'misto' || formaPagamento === 'cartao_credito') {
      const entradaCents = toCents(valorEntrada);
      setValorFinanciado(fromCents(Math.max(0, vendaCents - entradaCents)));
    } else {
      setValorFinanciado(0);
    }
  }, [valorVenda, valorEntrada, veiculoTrocaValor, formaPagamento]);

  const handlePaymentMethodChange = (nextMethod: PaymentMethod) => {
    setFormaPagamento(nextMethod);
    const vendaCents = toCents(valorVenda);
    if (nextMethod === 'cartao_credito') {
      setValorEntrada(0);
      setVeiculoTrocaValor(0);
      setValorFinanciado(fromCents(vendaCents));
      setNumeroParcelas(12);
    } else if (nextMethod === 'troca') {
      const suggestedTroca = roundCurrency(Math.round(fromCents(vendaCents) * 0.4));
      setVeiculoTrocaValor(suggestedTroca);
      setValorEntrada(0);
      setValorFinanciado(fromCents(Math.max(0, vendaCents - toCents(suggestedTroca))));
      setNumeroParcelas(36);
    } else if (nextMethod === 'financiamento' || nextMethod === 'misto') {
      setVeiculoTrocaValor(0);
      const suggestedDown =
        toCents(valorEntrada) > 0 && toCents(valorEntrada) < vendaCents
          ? roundCurrency(valorEntrada)
          : roundCurrency(Math.round(fromCents(vendaCents) * 0.3));
      setValorEntrada(suggestedDown);
      setValorFinanciado(fromCents(Math.max(0, vendaCents - toCents(suggestedDown))));
      if (numeroParcelas < 12) setNumeroParcelas(48);
    } else {
      setValorEntrada(0);
      setVeiculoTrocaValor(0);
      setValorFinanciado(0);
    }
  };

  if (!isOpen || !vehicle) return null;

  // Live Margins (exact centavos)
  const margemBruta = fromCents(toCents(valorVenda) - toCents(totalVehicleCost));
  const comissaoFinal = userRole === 'gestor' ? roundCurrency(comissaoValor) : 0;
  const margemLiquidaInicial = fromCents(toCents(margemBruta) - toCents(comissaoFinal));
  const margemPercentual = computeMarginPercent(
    roundCurrency(valorVenda),
    fromCents(toCents(totalVehicleCost) + toCents(comissaoFinal))
  );

  // Live Financial Equilibrium check (Entrada + Financiamento/Cartão/Troca === Valor Venda)
  const effectiveAllocatedCents =
    formaPagamento === 'a_vista_pix'
      ? toCents(valorVenda)
      : formaPagamento === 'troca'
        ? toCents(veiculoTrocaValor) + toCents(valorEntrada) + toCents(valorFinanciado)
        : toCents(valorEntrada) + toCents(valorFinanciado);
  const equilibriumDiffCents = toCents(valorVenda) - effectiveAllocatedCents;
  const isEquilibriumBalanced =
    toCents(valorVenda) > 0 &&
    equilibriumDiffCents === 0 &&
    (formaPagamento === 'a_vista_pix' ||
      (formaPagamento === 'troca' && toCents(veiculoTrocaValor) > 0) ||
      (formaPagamento === 'cartao_credito' && toCents(valorFinanciado) > 0) ||
      (formaPagamento === 'financiamento' && toCents(valorFinanciado) > 0) ||
      (formaPagamento === 'misto' && toCents(valorEntrada) > 0 && toCents(valorFinanciado) > 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (vehicle.status !== 'em_estoque' && vehicle.status !== 'reservado') {
      alert('Este veículo já consta como vendido ou indisponível no sistema.');
      return;
    }

    if (!clienteNome.trim() || !clienteCpf.trim() || !clienteEndereco.trim()) {
      alert('Por favor, preencha os dados cadastrais do cliente comprador (Nome, CPF e Endereço).');
      return;
    }

    if (clienteNome.trim().length < 3) {
      alert('Informe o nome completo válido do cliente comprador (mínimo de 3 caracteres).');
      return;
    }

    if (!isValidCPF(clienteCpf)) {
      alert('Por favor, informe um CPF válido com 11 dígitos para o cliente comprador.');
      return;
    }

    if (!clienteTelefone.trim() || !isValidPhone(clienteTelefone)) {
      alert('Por favor, informe um número de WhatsApp válido com DDD (10 ou 11 dígitos) para o comprador.');
      return;
    }

    if (clienteEndereco.trim().length < 5) {
      alert('Informe o endereço residencial completo do comprador (rua, número, bairro e cidade).');
      return;
    }

    if (isNaN(valorVenda) || !Number.isFinite(valorVenda) || toCents(valorVenda) < 10000 || valorVenda > 50_000_000) {
      alert('Informe um valor de venda válido (mínimo de R$ 100,00).');
      return;
    }

    if (formaPagamento === 'troca') {
      if (!veiculoTrocaDescricao.trim() || veiculoTrocaDescricao.trim().length < 4) {
        alert('Informe a descrição do veículo recebido na troca (Ex: Fiat Uno 2017 Branco - Placa QFA1234).');
        return;
      }
      if (toCents(veiculoTrocaValor) <= 0) {
        alert('Informe um valor de avaliação válido para o veículo recebido na troca.');
        return;
      }
    }

    if (userRole === 'gestor') {
      if (isNaN(comissaoValor) || !Number.isFinite(comissaoValor) || toCents(comissaoValor) < 0) {
        alert('O valor da comissão não pode ser negativo.');
        return;
      }
      if (toCents(comissaoValor) > toCents(valorVenda)) {
        alert('O valor da comissão não pode ser superior ao valor total da venda.');
        return;
      }
    }

    const usesFinancier = formaPagamento === 'financiamento' || formaPagamento === 'misto' || (formaPagamento === 'troca' && toCents(valorFinanciado) > 0);
    const financierObj = financiers.find(f => f.id === financiadoraId);

    if (usesFinancier) {
      if (!financierObj || financierObj.ativa === false || financierObj.ativo === false) {
        alert('Selecione uma instituição financeira credenciada e ativa para concluir o financiamento.');
        return;
      }
      if (isNaN(valorEntrada) || toCents(valorEntrada) < 0) {
        alert('Informe um valor de entrada válido.');
        return;
      }
      if (toCents(valorEntrada) > toCents(valorVenda)) {
        alert('O valor da entrada não pode ser superior ao valor da venda.');
        return;
      }
    }

    const sellerObj =
      userRole === 'vendedor' && activeSeller
        ? activeSeller
        : salespeople.find(s => s.id === vendedorId) || salespeople[0];
    const contractObj = templates.find(t => t.id === tipoContratoId) || defaultContractTemplate;

    if (
      (isRepasse && contractObj?.tipo === 'garantia') ||
      (!isRepasse && contractObj?.tipo === 'repasse')
    ) {
      alert(
        'Conflito Jurídico: A minuta contratual selecionada não corresponde à modalidade de garantia acordada (Garantia Legal 90D vs Repasse Sem Garantia).'
      );
      return;
    }

    const isPendingCommission = userRole !== 'gestor';
    const safeClienteNome = sanitizeInputText(clienteNome);
    const safeClienteCpf = sanitizeInputText(maskCPF(clienteCpf));
    const safeClienteTelefone = sanitizeInputText(maskPhone(clienteTelefone));
    const safeClienteEndereco = sanitizeInputText(clienteEndereco);
    const safeObservacoes = sanitizeInputText(observacoes, true);

    const taxaCartaoValor =
      formaPagamento === 'cartao_credito' && taxaCartaoPercentual > 0
        ? roundCurrency((Number(valorFinanciado) * taxaCartaoPercentual) / 100)
        : undefined;

    const candidateSale: Sale = {
      id: 'sale_' + Date.now(),
      veiculoId: vehicle.id,
      dataVenda: new Date().toISOString(),
      clienteNome: safeClienteNome,
      clienteCpf: safeClienteCpf,
      clienteTelefone: safeClienteTelefone,
      clienteEndereco: safeClienteEndereco,
      vendedorId: sellerObj.id,
      vendedorNome: sellerObj.nome,
      valorVenda: roundCurrency(valorVenda),
      formaPagamento,
      financiadoraId: usesFinancier ? financierObj?.id : undefined,
      financiadoraNome: usesFinancier ? financierObj?.nome : undefined,
      valorEntrada:
        usesFinancier || formaPagamento === 'troca'
          ? roundCurrency(valorEntrada)
          : formaPagamento === 'cartao_credito' && toCents(valorEntrada) > 0
            ? roundCurrency(valorEntrada)
            : undefined,
      valorFinanciado:
        usesFinancier || formaPagamento === 'troca'
          ? roundCurrency(valorFinanciado)
          : formaPagamento === 'cartao_credito' && toCents(valorEntrada) > 0
            ? roundCurrency(valorFinanciado)
            : undefined,
      numeroParcelas:
        usesFinancier || formaPagamento === 'cartao_credito' || formaPagamento === 'troca' ? Number(numeroParcelas) : undefined,
      veiculoTrocaDescricao: formaPagamento === 'troca' ? sanitizeInputText(veiculoTrocaDescricao) : undefined,
      veiculoTrocaValor: formaPagamento === 'troca' ? roundCurrency(veiculoTrocaValor) : undefined,
      taxaCartaoPercentual: formaPagamento === 'cartao_credito' ? Number(taxaCartaoPercentual) : undefined,
      taxaCartaoValor,
      statusVenda: 'concluida',
      tipoContratoId: contractObj.id,
      tipoContratoNome: contractObj.titulo,
      isRepasseSemGarantia: isRepasse,
      comissaoValor: isPendingCommission ? 0 : roundCurrency(Math.max(0, Number(comissaoValor) || 0)),
      comissaoPendente: isPendingCommission,
      comissaoDefinidaPor: isPendingCommission ? undefined : 'Gestor Geral',
      dataDefinicaoComissao: isPendingCommission ? undefined : new Date().toISOString(),
      custosPosVenda: [],
      observacoes: safeObservacoes
    };

    const validation = validateSaleFinancials(candidateSale);
    if (!validation.valid) {
      alert(validation.error || 'Verifique o equilíbrio financeiro entre Entrada, Parcelamento e Valor Total.');
      return;
    }

    setIsSubmitting(true);
    const completed = onCompleteSale(candidateSale, vehicle);
    if (completed !== false) {
      onClose();
    } else {
      setIsSubmitting(false);
    }
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto space-y-6 flex-1">
          
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

              {/* Exact Cost Breakdown (Exclusivo Gestor) ou Preço de Tabela (Vendedor) */}
              {userRole === 'gestor' ? (
                <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 text-right">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Custo Total Loja</span>
                  <span className="text-base font-bold text-amber-400 font-display">
                    {formatCurrency(totalVehicleCost)}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">
                    Compra ({formatCurrency(computeAcquisitionCost(vehicle))}) + Pátio ({formatCurrency(computePatioExpenses(vehicle))})
                  </span>
                </div>
              ) : (
                <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 text-right">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Preço Anunciado</span>
                  <span className="text-base font-bold text-emerald-400 font-display">
                    {formatCurrency(vehicle.valorAnunciado)}
                  </span>
                  <span className="text-[10px] text-neutral-500 block">
                    Valor sugerido de vitrine
                  </span>
                </div>
              )}
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
                  maxLength={120}
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
                  maxLength={14}
                  value={clienteCpf}
                  onChange={(e) => setClienteCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">WhatsApp *</label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={clienteTelefone}
                  onChange={(e) => setClienteTelefone(maskPhone(e.target.value))}
                  placeholder="(83) 98765-4321"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs text-neutral-400 block mb-1">Endereço Residencial Completo *</label>
                <input
                  type="text"
                  required
                  maxLength={220}
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
                  min={0.01}
                  max={50000000}
                  step="0.01"
                  value={valorVenda || ''}
                  onChange={(e) => setValorVenda(roundCurrency(clampNumber(e.target.value, 0, 50_000_000, 0)))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-emerald-400 focus:border-amber-500 focus:outline-none tabular-nums"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Forma de Pagamento</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethod)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="financiamento">Financiamento Bancário</option>
                  <option value="a_vista_pix">À Vista (Pix)</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="misto">Misto (Entrada + Financiamento)</option>
                  <option value="troca">Troca com Torna (Carro na Troca + Saldo)</option>
                </select>
              </div>
            </div>

            {/* If Financiamento or Misto */}
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
                  <label className="text-xs text-neutral-400 block mb-1">
                    Valor de Entrada (R$){formaPagamento === 'misto' ? ' *' : ''}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50000000}
                    step="0.01"
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(roundCurrency(clampNumber(e.target.value, 0, 50_000_000, 0)))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none tabular-nums"
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

                <div className="sm:col-span-4 text-[11px] text-neutral-400 bg-neutral-950 p-2 rounded-lg border border-neutral-800 flex flex-wrap justify-between items-center gap-2">
                  <span>
                    Entrada: <strong className="text-white">{formatCurrency(valorEntrada)}</strong> + Valor Financiado:{' '}
                    <strong className="text-amber-400">{formatCurrency(valorFinanciado)}</strong>
                  </span>
                  <span>{numeroParcelas}x fixas ({formatCurrency(roundCurrency(valorFinanciado / Math.max(1, numeroParcelas)))}/mês s/ juros)</span>
                </div>
              </div>
            )}

            {/* If Cartão de Crédito */}
            {formaPagamento === 'cartao_credito' && (
              <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Entrada à Vista Opcional (R$)</label>
                  <input
                    type="number"
                    min={0}
                    max={50000000}
                    step="0.01"
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(roundCurrency(clampNumber(e.target.value, 0, 50_000_000, 0)))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Saldo no Cartão</label>
                  <div className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-bold text-amber-400 tabular-nums">
                    {formatCurrency(valorFinanciado)}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Parcelas no Cartão</label>
                  <select
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 6, 8, 10, 12, 18].map(p => (
                      <option key={p} value={p}>
                        {p}x ({formatCurrency(roundCurrency(valorFinanciado / p))}/parc)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Taxa Maquininha (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step="0.01"
                    value={taxaCartaoPercentual || ''}
                    placeholder="Ex: 2.99"
                    onChange={(e) => setTaxaCartaoPercentual(clampNumber(e.target.value, 0, 30, 0))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none tabular-nums"
                  />
                </div>

                {taxaCartaoPercentual > 0 && (
                  <div className="sm:col-span-4 text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded-lg border border-amber-800/40 flex justify-between items-center">
                    <span>
                      Custo Maquininha/MDR ({taxaCartaoPercentual}%): <strong>-{formatCurrency(roundCurrency((valorFinanciado * taxaCartaoPercentual) / 100))}</strong>
                    </span>
                    <span>
                      Repasse Líquido à Loja: <strong className="text-emerald-400">{formatCurrency(roundCurrency(valorFinanciado * (1 - taxaCartaoPercentual / 100)))}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* If Troca com Torna */}
            {formaPagamento === 'troca' && (
              <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">
                      Veículo Recebido na Troca (Descrição / Modelo / Placa) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Fiat Uno 1.0 Fire 2017 - Placa QFA1234"
                      value={veiculoTrocaDescricao}
                      onChange={(e) => setVeiculoTrocaDescricao(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">
                      Valor de Avaliação do Carro na Troca (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0.01}
                      max={50000000}
                      step="0.01"
                      value={veiculoTrocaValor || ''}
                      onChange={(e) => {
                        const val = roundCurrency(clampNumber(e.target.value, 0, 50_000_000, 0));
                        setVeiculoTrocaValor(val);
                        const rest = Math.max(0, toCents(valorVenda) - toCents(val) - toCents(valorEntrada));
                        setValorFinanciado(fromCents(rest));
                      }}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-amber-400 focus:border-amber-500 focus:outline-none tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">
                      Entrada Complementar (Pix/Dinheiro) (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50000000}
                      step="0.01"
                      value={valorEntrada}
                      onChange={(e) => {
                        const val = roundCurrency(clampNumber(e.target.value, 0, 50_000_000, 0));
                        setValorEntrada(val);
                        const rest = Math.max(0, toCents(valorVenda) - toCents(veiculoTrocaValor) - toCents(val));
                        setValorFinanciado(fromCents(rest));
                      }}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">
                      Saldo Financiado / Parcelado (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50000000}
                      step="0.01"
                      value={valorFinanciado}
                      onChange={(e) => setValorFinanciado(roundCurrency(clampNumber(e.target.value, 0, 50_000_000, 0)))}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Financiadora (se houver saldo)</label>
                    <select
                      value={financiadoraId}
                      onChange={(e) => setFinanciadoraId(e.target.value)}
                      disabled={toCents(valorFinanciado) <= 0}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none disabled:opacity-50"
                    >
                      {financiers.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2 rounded-lg border border-neutral-800 flex flex-wrap justify-between items-center gap-2">
                  <span>
                    Carro Troca: <strong className="text-amber-400">{formatCurrency(veiculoTrocaValor)}</strong> + Entrada: <strong className="text-white">{formatCurrency(valorEntrada)}</strong> + Financiado: <strong className="text-blue-400">{formatCurrency(valorFinanciado)}</strong>
                  </span>
                  <span>Total Coberto: <strong>{formatCurrency(roundCurrency(veiculoTrocaValor + valorEntrada + valorFinanciado))}</strong></span>
                </div>
              </div>
            )}

            {/* INDICADOR DE EQUILÍBRIO FINANCEIRO DA VENDA */}
            <div
              className={`p-2.5 rounded-lg border text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                isEquilibriumBalanced
                  ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                  : 'bg-red-950/40 border-red-800/60 text-red-300'
              }`}
            >
              <span className="font-semibold">
                {isEquilibriumBalanced
                  ? 'Equilíbrio Contábil Verificado (Sem Sobras Órfãs):'
                  : 'Atenção: Desequilíbrio na Composição de Pagamento:'}
              </span>
              <span className="font-mono">
                {formaPagamento === 'a_vista_pix' ? (
                  <>À Vista Integral = {formatCurrency(valorVenda)} (Diferença: R$ 0,00)</>
                ) : formaPagamento === 'troca' ? (
                  <>
                    Carro Troca ({formatCurrency(veiculoTrocaValor)}) + Entrada ({formatCurrency(valorEntrada)}) + Saldo ({formatCurrency(valorFinanciado)}) ={' '}
                    <strong>{formatCurrency(fromCents(effectiveAllocatedCents))}</strong>
                    {equilibriumDiffCents !== 0 && ` (Diferença: ${formatCurrency(fromCents(Math.abs(equilibriumDiffCents)))})`}
                  </>
                ) : (
                  <>
                    Entrada ({formatCurrency(valorEntrada)}) +{' '}
                    {formaPagamento === 'cartao_credito' ? 'Cartão' : 'Financiado'} ({formatCurrency(valorFinanciado)}) ={' '}
                    <strong>{formatCurrency(fromCents(effectiveAllocatedCents))}</strong>
                    {equilibriumDiffCents !== 0 && ` (Diferença: ${formatCurrency(fromCents(Math.abs(equilibriumDiffCents)))})`}
                  </>
                )}
              </span>
            </div>

            {/* LIVE MARGIN AUDIT (Exclusivo Gestor — oculta custo de aquisição e margem real para Vendedor) */}
            {userRole === 'gestor' && (
              <div className="bg-neutral-900/90 p-4 rounded-xl border border-neutral-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Margem Real da Transação (Contando todos os custos)
                  </span>
                  <span className={`text-xs font-bold ${margemLiquidaInicial >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    Margem Líquida Prevista: {formatCurrency(margemLiquidaInicial)} ({margemPercentual.toFixed(1)}%)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-neutral-800 text-neutral-400">
                  <div>
                    <span className="text-[10px] block">Valor da Venda</span>
                    <span className="text-white font-bold tabular-nums">{formatCurrency(valorVenda)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] block">(-) Custo Total Veículo</span>
                    <span className="text-red-400 font-semibold tabular-nums">{formatCurrency(totalVehicleCost)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] block">(=) Margem Bruta</span>
                    <span className={`font-bold tabular-nums ${margemBruta >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                      {formatCurrency(margemBruta)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] block">(-) Comissão Loja</span>
                    <span className="text-neutral-300 font-semibold tabular-nums">{formatCurrency(comissaoFinal)}</span>
                  </div>
                </div>

                {margemLiquidaInicial < 0 && (
                  <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-[11px] text-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>
                      <strong>Alerta de Venda com Prejuízo (Liquidação):</strong> O preço fechado está abaixo do custo investido somado à comissão, resultando em margem negativa de{' '}
                      <strong>{formatCurrency(margemLiquidaInicial)} ({margemPercentual.toFixed(1)}%)</strong>.
                    </span>
                  </div>
                )}
              </div>
            )}
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
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setTipoContratoId(nextId);
                    const chosen = templates.find(t => t.id === nextId);
                    if (chosen?.tipo === 'repasse') setIsRepasse(true);
                    else if (chosen?.tipo === 'garantia') setIsRepasse(false);
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  {(templates.some(t => t.tipo === (isRepasse ? 'repasse' : 'garantia'))
                    ? templates.filter(t => t.tipo === (isRepasse ? 'repasse' : 'garantia'))
                    : templates.filter(t => t.tipo === 'garantia' || t.tipo === 'repasse')
                  ).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <div
                  className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
                    isRepasse
                      ? 'bg-amber-950/35 border-amber-800/60 text-amber-200'
                      : 'bg-emerald-950/35 border-emerald-800/60 text-emerald-200'
                  }`}
                >
                  {isRepasse ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {isRepasse ? (
                      <>
                        <strong>Regime Jurídico — Repasse Comercial (Sem Garantia / No Estado):</strong> Conforme Arts. 24 e 51, I do CDC, a isenção de garantia mecânica possui eficácia jurídica comprovada em operações comerciais/B2B ou com expressa ciência respaldada em Laudo Cautelar prévio detalhando avarias e deságio proporcional do preço. É fundamental emitir o contrato de repasse específico e anexar laudo cautelar.
                      </>
                    ) : (
                      <>
                        <strong>Regime Jurídico — Garantia Legal de 90 Dias (Art. 26, II CDC):</strong> Cobertura legal de 90 dias restrita a componentes internos de <strong>motor e câmbio</strong>, excluídos itens de desgaste natural ou mau uso comprovado.
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Observações da Venda</label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Notas adicionais sobre a negociação comercial, garantia, etc."
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none resize-none"
                />
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
                      max={1000000}
                      step="0.01"
                      value={comissaoValor}
                      onChange={(e) => setComissaoValor(roundCurrency(clampNumber(e.target.value, 0, 1_000_000, 0)))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-amber-400 focus:border-amber-500 focus:outline-none tabular-nums"
                    />
                  </div>
                  <div className="text-xs text-neutral-400 bg-neutral-900 p-2.5 rounded-lg border border-neutral-800 flex items-center">
                    <span>
                      Lucro Líquido final da loja após dedução da comissão:{' '}
                      <strong className={`tabular-nums ${margemLiquidaInicial >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(margemLiquidaInicial)}
                      </strong>
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
              disabled={isSubmitting}
              className="px-4 py-2 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] border border-[#2D2D32] text-xs font-semibold text-[#CAC9CA] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isEquilibriumBalanced}
              className="px-5 py-2.5 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:border-neutral-700 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              {isSubmitting ? 'Processando Venda...' : 'Concluir Venda & Gerar Contrato'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
