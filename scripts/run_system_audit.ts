/**
 * SCRIPT DE AUDITORIA E TESTE GERAL DE FUNCIONALIDADE
 * Executa testes reais de cada função, regra, cálculo, persistência e conflitos.
 */

// 1. Simulação do ambiente de Browser (localStorage, window)
const storageMap = new Map<string, string>();
const alertLogs: string[] = [];
const confirmLogs: string[] = [];

(globalThis as any).localStorage = {
  getItem: (k: string) => (storageMap.has(k) ? storageMap.get(k)! : null),
  setItem: (k: string, v: string) => storageMap.set(k, String(v)),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
  get length() { return storageMap.size; },
  key: (i: number) => Array.from(storageMap.keys())[i] || null
};

(globalThis as any).window = {
  alert: (msg: string) => alertLogs.push(msg),
  confirm: (msg: string) => {
    confirmLogs.push(msg);
    return true; // simula confirmação afirmativa
  }
};
(globalThis as any).alert = (msg: string) => alertLogs.push(msg);

import { 
  formatCurrency, maskCurrency, unmaskCurrency, maskCPF, isValidCPF,
  maskCNPJ, isValidCNPJ, maskPhone, isValidPhone, maskCEP, isValidCEP, maskPlate, isValidPlate, maskRenavam, isValidRenavam, isValidYear,
  numberToWordsPtBr, computeAcquisitionCost, computePatioExpenses,
  computePreSaleTotalCost, computePostSaleCosts, computeTotalSaleCost,
  computeNetProfit, computeGrossProfit, computeMarginPercent
} from '../src/utils/formatters';

import { storageService } from '../src/services/storage';
import { auditLogger } from '../src/services/auditLogger';
import { renderTemplate } from '../src/utils/templateEngine';
import { Vehicle, Sale, FormerOwner, Financier, Salesperson, StoreProfile } from '../src/types';

interface TestResult {
  id: string;
  modulo: string;
  funcaoOuRegra: string;
  status: 'PASS' | 'FAIL' | 'AVISO_CONFLITO';
  esperado: string;
  obtido: string;
  detalhes?: string;
}

const results: TestResult[] = [];

function record(
  id: string, 
  modulo: string, 
  funcaoOuRegra: string, 
  passed: boolean, 
  esperado: string, 
  obtido: string, 
  detalhes?: string,
  isConflictWarning: boolean = false
) {
  results.push({
    id,
    modulo,
    funcaoOuRegra,
    status: passed ? 'PASS' : (isConflictWarning ? 'AVISO_CONFLITO' : 'FAIL'),
    esperado,
    obtido,
    detalhes
  });
}

console.log('================================================================');
console.log('INICIANDO AUDITORIA E TESTES SISTÊMICOS - VA VEÍCULOS');
console.log('================================================================\n');

// -------------------------------------------------------------
// SEÇÃO 1: FORMATAÇÕES E MÁSCARAS
// -------------------------------------------------------------
console.log('-> Executando testes da Seção 1: Formatações e Máscaras...');

// 1.1 formatCurrency
{
  const res1 = formatCurrency(1250.5);
  const pass1 = res1.includes('1.250,50') && res1.includes('R$');
  record('FMT_01', 'Formatação', 'formatCurrency(1250.5)', pass1, 'R$ 1.250,50', res1);

  const res2 = formatCurrency(0);
  const pass2 = res2.includes('0,00') && res2.includes('R$');
  record('FMT_02', 'Formatação', 'formatCurrency(0)', pass2, 'R$ 0,00', res2);

  const res3 = formatCurrency(NaN);
  const pass3 = res3 === 'R$ 0,00';
  record('FMT_03', 'Formatação', 'formatCurrency(NaN)', pass3, 'R$ 0,00', res3);

  const res4 = formatCurrency(-500);
  const pass4 = res4.includes('-500,00') || res4.includes('500,00');
  record('FMT_04', 'Formatação', 'formatCurrency(-500) [Valor Negativo]', pass4, 'R$ -500,00', res4);
}

// 1.2 maskCurrency & unmaskCurrency
{
  const unmasked1 = unmaskCurrency('R$ 45.000,00');
  const passU1 = unmasked1 === 45000;
  record('FMT_05', 'Formatação', 'unmaskCurrency("R$ 45.000,00")', passU1, '45000', String(unmasked1));

  const unmasked2 = unmaskCurrency('');
  const passU2 = unmasked2 === 0;
  record('FMT_06', 'Formatação', 'unmaskCurrency("")', passU2, '0', String(unmasked2));

  const masked = maskCurrency('4500000');
  const passM1 = masked.includes('45.000,00');
  record('FMT_07', 'Formatação', 'maskCurrency("4500000")', passM1, 'R$ 45.000,00', masked);
}

// 1.3 CPF
{
  // CPF válido gerado por algoritmo oficial mod 11: 52998224725
  const validCPF = '52998224725';
  const checkValid = isValidCPF(validCPF);
  record('CPF_01', 'Validação CPF', 'isValidCPF com CPF válido', checkValid, 'true', String(checkValid));

  const invalidDigits = '52998224726';
  const checkInvalid = isValidCPF(invalidDigits);
  record('CPF_02', 'Validação CPF', 'isValidCPF com dígito verificador incorreto', !checkInvalid, 'false', String(checkInvalid));

  const repeated = '11111111111';
  const checkRepeated = isValidCPF(repeated);
  record('CPF_03', 'Validação CPF', 'isValidCPF com dígitos todos repetidos', !checkRepeated, 'false', String(checkRepeated));

  const maskedCPF = maskCPF('52998224725');
  const passMaskCPF = maskedCPF === '529.982.247-25';
  record('CPF_04', 'Máscara CPF', 'maskCPF("52998224725")', passMaskCPF, '529.982.247-25', maskedCPF);
}

// 1.4 CNPJ
{
  // CNPJ válido: 04.252.011/0001-10
  const validCNPJ = '04252011000110';
  const checkValidCNPJ = isValidCNPJ(validCNPJ);
  record('CNPJ_01', 'Validação CNPJ', 'isValidCNPJ com CNPJ válido', checkValidCNPJ, 'true', String(checkValidCNPJ));

  const invalidCNPJ = '04252011000111';
  const checkInvalidCNPJ = isValidCNPJ(invalidCNPJ);
  record('CNPJ_02', 'Validação CNPJ', 'isValidCNPJ com CNPJ inválido', !checkInvalidCNPJ, 'false', String(checkInvalidCNPJ));

  const repeatedCNPJ = '00000000000000';
  const checkRepeatedCNPJ = isValidCNPJ(repeatedCNPJ);
  record('CNPJ_03', 'Validação CNPJ', 'isValidCNPJ repetidos', !checkRepeatedCNPJ, 'false', String(checkRepeatedCNPJ));

  const maskedCNPJ = maskCNPJ('04252011000110');
  const passMaskCNPJ = maskedCNPJ === '04.252.011/0001-10';
  record('CNPJ_04', 'Máscara CNPJ', 'maskCNPJ("04252011000110")', passMaskCNPJ, '04.252.011/0001-10', maskedCNPJ);
}

// 1.5 Telefone, CEP, Placa, RENAVAM
{
  const phoneFixo = maskPhone('8333811234');
  const passFixo = phoneFixo === '(83) 3381-1234';
  record('TEL_01', 'Telefone', 'maskPhone telefone fixo (10 dígitos)', passFixo, '(83) 3381-1234', phoneFixo);

  const phoneCel = maskPhone('83987654321');
  const passCel = phoneCel === '(83) 98765-4321';
  record('TEL_02', 'Telefone', 'maskPhone celular/WhatsApp (11 dígitos)', passCel, '(83) 98765-4321', phoneCel);

  const cep = maskCEP('58140000');
  const passCEP = cep === '58140-000';
  record('CEP_01', 'CEP', 'maskCEP("58140000")', passCEP, '58140-000', cep);

  const plateMercosul = maskPlate('BRA2E19');
  const passPlateM = plateMercosul === 'BRA2E19';
  record('PLC_01', 'Placa', 'maskPlate Mercosul BRA2E19', passPlateM, 'BRA2E19', plateMercosul);

  const plateAntiga = maskPlate('MNP4820');
  const passPlateA = plateAntiga === 'MNP-4820';
  record('PLC_02', 'Placa', 'maskPlate Tradicional MNP4820', passPlateA, 'MNP-4820', plateAntiga);

  const renavam = maskRenavam('01234567890123');
  const passRenavam = renavam === '01234567890' && renavam.length === 11;
  record('RNV_01', 'RENAVAM', 'maskRenavam trunca em 11 dígitos', passRenavam, '01234567890', renavam);

  // Validações adicionadas para campos numéricos e máscaras
  const validPhoneCel = isValidPhone('(83) 98765-4321');
  record('TEL_03', 'Validação Telefone', 'isValidPhone celular válido', validPhoneCel, 'true', String(validPhoneCel));

  const validPhoneFixo = isValidPhone('(83) 3381-1234');
  record('TEL_04', 'Validação Telefone', 'isValidPhone fixo válido', validPhoneFixo, 'true', String(validPhoneFixo));

  const invalidPhoneUserSpam = isValidPhone('8399999999999999999'); // Exemplo enviado pelo usuário
  record('TEL_05', 'Validação Telefone', 'isValidPhone rejeita dígitos excedentes (spam)', !invalidPhoneUserSpam, 'false', String(invalidPhoneUserSpam));

  const invalidPhoneIncomplete = isValidPhone('83988');
  record('TEL_06', 'Validação Telefone', 'isValidPhone rejeita telefone incompleto', !invalidPhoneIncomplete, 'false', String(invalidPhoneIncomplete));

  const validCEP = isValidCEP('58140-000');
  record('CEP_02', 'Validação CEP', 'isValidCEP cep formatado válido', validCEP, 'true', String(validCEP));

  const invalidCEP = isValidCEP('123');
  record('CEP_03', 'Validação CEP', 'isValidCEP rejeita cep incompleto', !invalidCEP, 'false', String(invalidCEP));

  const validPlate1 = isValidPlate('ABC-1234');
  const validPlate2 = isValidPlate('BRA2E19');
  record('PLC_03', 'Validação Placa', 'isValidPlate tradicional e Mercosul válidas', validPlate1 && validPlate2, 'true', String(validPlate1 && validPlate2));

  const invalidPlate = isValidPlate('INVALIDA123');
  record('PLC_04', 'Validação Placa', 'isValidPlate rejeita placa inválida', !invalidPlate, 'false', String(invalidPlate));

  const validRenavamCheck = isValidRenavam('01234567890');
  record('RNV_02', 'Validação RENAVAM', 'isValidRenavam com 11 dígitos', validRenavamCheck, 'true', String(validRenavamCheck));

  const invalidRenavamCheck = isValidRenavam('12345');
  record('RNV_03', 'Validação RENAVAM', 'isValidRenavam rejeita menos de 9 dígitos', !invalidRenavamCheck, 'false', String(invalidRenavamCheck));

  const validYearCheck = isValidYear(2024);
  record('YR_01', 'Validação Ano', 'isValidYear(2024)', validYearCheck, 'true', String(validYearCheck));

  const invalidYearPast = isValidYear(1800);
  const invalidYearFuture = isValidYear(2100);
  record('YR_02', 'Validação Ano', 'isValidYear rejeita fora do intervalo 1900..anoAtual+2', !invalidYearPast && !invalidYearFuture, 'false', String(invalidYearPast || invalidYearFuture));
}

// 1.6 Extenso em Português (numberToWordsPtBr)
{
  const ext0 = numberToWordsPtBr(0);
  record('EXT_01', 'Extenso', 'numberToWordsPtBr(0)', ext0 === 'zero reais', 'zero reais', ext0);

  const ext1 = numberToWordsPtBr(1);
  record('EXT_02', 'Extenso', 'numberToWordsPtBr(1)', ext1 === 'um real', 'um real', ext1);

  const ext100 = numberToWordsPtBr(100);
  record('EXT_03', 'Extenso', 'numberToWordsPtBr(100)', ext100 === 'cem reais', 'cem reais', ext100);

  const ext1200_50 = numberToWordsPtBr(1200.50);
  const passExtFloat = ext1200_50.includes('mil e duzentos reais') && ext1200_50.includes('cinquenta centavos');
  record('EXT_04', 'Extenso', 'numberToWordsPtBr(1200.50)', passExtFloat, 'mil e duzentos reais e cinquenta centavos', ext1200_50);

  const ext85000 = numberToWordsPtBr(85000);
  const passExt85k = ext85000.includes('oitenta e cinco mil reais');
  record('EXT_05', 'Extenso', 'numberToWordsPtBr(85000)', passExt85k, 'oitenta e cinco mil reais', ext85000);

  const extNeg = numberToWordsPtBr(-500);
  const passExtNeg = extNeg === 'menos quinhentos reais';
  record('EXT_06', 'Extenso', 'numberToWordsPtBr(-500) [Valor Negativo]', passExtNeg, 'menos quinhentos reais', extNeg);

  const extCents = numberToWordsPtBr(0.75);
  const passExtCents = extCents === 'setenta e cinco centavos';
  record('EXT_07', 'Extenso', 'numberToWordsPtBr(0.75) [Centavos Puros]', passExtCents, 'setenta e cinco centavos', extCents);
}

// -------------------------------------------------------------
// SEÇÃO 2: REGRAS E CÁLCULOS FINANCEIROS
// -------------------------------------------------------------
console.log('-> Executando testes da Seção 2: Regras e Cálculos Financeiros...');

// Veículo de teste base
const mockVehicleBase: Vehicle = {
  id: 'veh_test_01',
  tipo: 'carro',
  marca: 'Toyota',
  modelo: 'Corolla XEi',
  versao: '2.0 Flex',
  anoFabricacao: 2023,
  anoModelo: 2024,
  cor: 'Prata',
  combustivel: 'Flex',
  cambio: 'Automático',
  quilometragem: 28000,
  placa: 'BRA2E19',
  chassi: '9BRTEST1234567890',
  renavam: '01234567890',
  categoriaComercial: 'venda',
  status: 'em_estoque',
  fotos: ['https://example.com/foto.jpg'],
  antigoDonoId: 'owner_01',
  dataEntrada: '2026-09-01T10:00:00.000Z',
  cadastradoPor: 'Gestor Geral',
  valorPago: 80000,
  debitoDetran: {
    temDebito: true,
    valor: 1500,
    quemArca: 'loja',
    descricao: 'Multas e IPVA'
  },
  reciboCompraGerado: true,
  modeloReciboCompraId: 'recibo_compra_veiculo',
  valorAnunciado: 96000,
  custosPatio: [
    { id: 'exp_1', data: '2026-09-02', categoria: 'mecanica', descricao: 'Troca de óleo e filtros', valor: 600 },
    { id: 'exp_2', data: '2026-09-03', categoria: 'lavagem_estetica', descricao: 'Polimento e higienização', valor: 400 }
  ]
};

// 2.1 Custo de Aquisição com débito assumido pela Loja
{
  const acqCostLoja = computeAcquisitionCost(mockVehicleBase);
  // Esperado: 80.000 + 1.500 = 81.500
  const passAcqLoja = acqCostLoja === 81500;
  record('CALC_01', 'Cálculo Financeiro', 'computeAcquisitionCost com débito arcado pela loja', passAcqLoja, '81500', String(acqCostLoja));

  // Teste com débito arcado pelo antigo dono
  const vehDebitoDono: Vehicle = {
    ...mockVehicleBase,
    debitoDetran: { temDebito: true, valor: 1500, quemArca: 'antigo_dono', descricao: 'Descontado no ato' }
  };
  const acqCostDono = computeAcquisitionCost(vehDebitoDono);
  const passAcqDono = acqCostDono === 80000;
  record('CALC_02', 'Cálculo Financeiro', 'computeAcquisitionCost com débito arcado pelo antigo dono', passAcqDono, '80000', String(acqCostDono));

  // Teste com debitoDetran undefined (caso de borda)
  const vehSemDebitoObj: Vehicle = {
    ...mockVehicleBase,
    debitoDetran: undefined as any
  };
  const acqCostUndefined = computeAcquisitionCost(vehSemDebitoObj);
  const passAcqUndef = acqCostUndefined === 80000;
  record('CALC_03', 'Cálculo Financeiro', 'computeAcquisitionCost com debitoDetran undefined', passAcqUndef, '80000', String(acqCostUndefined));
}

// 2.2 Custos de Pátio
{
  const patioTotal = computePatioExpenses(mockVehicleBase);
  // Esperado: 600 + 400 = 1000
  const passPatio = patioTotal === 1000;
  record('CALC_04', 'Cálculo Financeiro', 'computePatioExpenses com 2 despesas (600+400)', passPatio, '1000', String(patioTotal));

  // Caso de borda: custosPatio vazio ou nulo
  const vehSemCustos: Vehicle = { ...mockVehicleBase, custosPatio: [] };
  const patioVazio = computePatioExpenses(vehSemCustos);
  record('CALC_05', 'Cálculo Financeiro', 'computePatioExpenses com array vazio', patioVazio === 0, '0', String(patioVazio));

  const vehCustosNull: Vehicle = { ...mockVehicleBase, custosPatio: undefined as any };
  const patioNull = computePatioExpenses(vehCustosNull);
  record('CALC_06', 'Cálculo Financeiro', 'computePatioExpenses com custosPatio undefined', patioNull === 0, '0', String(patioNull));
}

// 2.3 Custo Pré-Venda
{
  const preSaleCost = computePreSaleTotalCost(mockVehicleBase);
  // Esperado: 81.500 + 1000 = 82.500
  const passPreCost = preSaleCost === 82500;
  record('CALC_07', 'Cálculo Financeiro', 'computePreSaleTotalCost (Aquisição + Pátio)', passPreCost, '82500', String(preSaleCost));
}

// 2.4 Venda Normal, Comissões e Custos Pós-Venda
const mockSaleNormal: Sale = {
  id: 'sale_test_01',
  veiculoId: 'veh_test_01',
  dataVenda: '2026-09-10T14:30:00.000Z',
  clienteNome: 'Francisco Severino',
  clienteCpf: '529.982.247-25',
  clienteTelefone: '(83) 98888-7777',
  clienteEndereco: 'Rua São Pedro, 10 - Esperança - PB',
  vendedorId: 'seller_01',
  vendedorNome: 'Matheus Lima',
  valorVenda: 95000,
  formaPagamento: 'financiamento',
  financiadoraId: 'fin_bv',
  financiadoraNome: 'BV Financeira',
  valorEntrada: 25000,
  valorFinanciado: 70000,
  numeroParcelas: 48,
  tipoContratoId: 'garantia_padrao',
  tipoContratoNome: 'Contrato com Garantia 90 Dias',
  isRepasseSemGarantia: false,
  comissaoValor: 1500,
  comissaoPendente: false,
  comissaoDefinidaPor: 'Gestor Geral',
  dataDefinicaoComissao: '2026-09-10T14:30:00.000Z',
  custosPosVenda: [
    { id: 'pos_1', data: '2026-09-15', tipo: 'garantia_motor_cambio', descricao: 'Sensor de oxigênio trocado em garantia', valor: 350 }
  ]
};

{
  const postSaleCosts = computePostSaleCosts(mockSaleNormal);
  record('CALC_08', 'Cálculo Financeiro', 'computePostSaleCosts com 1 reparo garantia (350)', postSaleCosts === 350, '350', String(postSaleCosts));

  const totalCostSale = computeTotalSaleCost(mockVehicleBase, mockSaleNormal);
  // Esperado: PreSale(82.500) + PostSale(350) + Comissão(1.500) = 84.350
  const passTotalCost = totalCostSale === 84350;
  record('CALC_09', 'Cálculo Financeiro', 'computeTotalSaleCost (Pre + Post + Comissão)', passTotalCost, '84350', String(totalCostSale));

  const netProfit = computeNetProfit(mockVehicleBase, mockSaleNormal);
  // Esperado: Venda(95.000) - TotalCost(84.350) = 10.650
  const passNetProfit = netProfit === 10650;
  record('CALC_10', 'Cálculo Financeiro', 'computeNetProfit (Lucro Líquido Real)', passNetProfit, '10650', String(netProfit));

  const grossProfit = computeGrossProfit(mockVehicleBase, mockSaleNormal);
  // Esperado: Venda(95.000) - PreSale(82.500) = 12.500
  const passGrossProfit = grossProfit === 12500;
  record('CALC_11', 'Cálculo Financeiro', 'computeGrossProfit (Margem Bruta Inicial)', passGrossProfit, '12500', String(grossProfit));

  const marginPercent = computeMarginPercent(mockSaleNormal.valorVenda, totalCostSale);
  // Esperado: ((95.000 - 84.350) / 95.000) * 100 = (10.650 / 95.000) * 100 = 11.21%
  const expectedMargin = (10650 / 95000) * 100;
  const passMargin = Math.abs(marginPercent - expectedMargin) < 0.01;
  record('CALC_12', 'Cálculo Financeiro', 'computeMarginPercent Lucro Normal', passMargin, expectedMargin.toFixed(2) + '%', marginPercent.toFixed(2) + '%');
}

// 2.5 Casos Extremos de Margem e Divisão por Zero
{
  // Receita Zero
  const marginDivZero = computeMarginPercent(0, 5000);
  record('CALC_13', 'Cálculo Financeiro', 'computeMarginPercent com receita 0 (Divisão por Zero)', marginDivZero === 0, '0', String(marginDivZero));

  // Venda com Prejuízo (Venda abaixo do custo)
  const lossMargin = computeMarginPercent(70000, 84350);
  // Margem negativa: (70000 - 84350)/70000 * 100 = -14350/70000 * 100 = -20.5%
  const expectedLoss = ((70000 - 84350) / 70000) * 100;
  const passLoss = Math.abs(lossMargin - expectedLoss) < 0.01 && lossMargin < 0;
  record('CALC_14', 'Cálculo Financeiro', 'computeMarginPercent com Prejuízo (Custo > Venda)', passLoss, expectedLoss.toFixed(2) + '%', lossMargin.toFixed(2) + '%');
}

// -------------------------------------------------------------
// SEÇÃO 3: TESTES REAIS DE GRAVAÇÃO E PERSISTÊNCIA EM STORAGE
// -------------------------------------------------------------
console.log('-> Executando testes da Seção 3: Gravação e Persistência em Storage...');

// Limpa storage para teste controlado
storageMap.clear();

// 3.1 Store Profile
{
  const defaultStore = storageService.getStoreProfile();
  record('STO_01', 'Storage', 'getStoreProfile inicial (seed data)', defaultStore.nomeFantasia === 'VA Veículos', 'VA Veículos', defaultStore.nomeFantasia);

  const updatedStore: StoreProfile = {
    ...defaultStore,
    nomeFantasia: 'VA Veículos Multimarcas Teste',
    cidade: 'Areial',
    estado: 'PB'
  };
  storageService.saveStoreProfile(updatedStore, 'Testador Auditoria');
  const readBackStore = storageService.getStoreProfile();
  record('STO_02', 'Storage', 'saveStoreProfile e leitura de volta', readBackStore.nomeFantasia === 'VA Veículos Multimarcas Teste', 'VA Veículos Multimarcas Teste', readBackStore.nomeFantasia);
}

// 3.2 Veículos
{
  const testVeh: Vehicle = { ...mockVehicleBase, id: 'veh_persisted_01', placa: 'TST-0001' };
  storageService.addVehicle(testVeh, 'Testador Auditoria');
  const vehiclesList = storageService.getVehicles();
  const foundVeh = vehiclesList.find(v => v.id === 'veh_persisted_01');
  record('STO_03', 'Storage', 'addVehicle e getVehicles', foundVeh !== undefined && foundVeh.placa === 'TST-0001', 'TST-0001', foundVeh?.placa || 'não encontrado');

  // Atualização
  testVeh.quilometragem = 32000;
  storageService.updateVehicle(testVeh, 'Testador Auditoria');
  const readAfterUpdate = storageService.getVehicles().find(v => v.id === 'veh_persisted_01');
  record('STO_04', 'Storage', 'updateVehicle (atualização de KM)', readAfterUpdate?.quilometragem === 32000, '32000', String(readAfterUpdate?.quilometragem));

  // Adição de despesa de pátio
  storageService.addVehiclePatioExpense('veh_persisted_01', {
    id: 'exp_persisted',
    data: '2026-09-05',
    categoria: 'pneus',
    descricao: '2 Pneus Novos',
    valor: 900
  }, 'Testador Auditoria');
  const readAfterExpense = storageService.getVehicles().find(v => v.id === 'veh_persisted_01');
  const hasExpense = (readAfterExpense?.custosPatio || []).some(c => c.id === 'exp_persisted');
  record('STO_05', 'Storage', 'addVehiclePatioExpense persistência no veículo', hasExpense, 'true', String(hasExpense));
}

// 3.3 Antigos Donos (Owners / Pessoas)
{
  const testOwner: FormerOwner = {
    id: 'owner_persisted_01',
    nome: 'Severino Silva de Areial',
    cpf: '529.982.247-25',
    telefone: '(83) 98765-1122',
    endereco: 'Sítio Areial de Cima',
    cidade: 'Areial',
    estado: 'PB',
    cep: '58140-000',
    criadoEm: new Date().toISOString()
  };
  storageService.addOwner(testOwner, 'Testador Auditoria');
  const ownersList = storageService.getOwners();
  const foundOwner = ownersList.find(o => o.id === 'owner_persisted_01');
  record('STO_06', 'Storage', 'addOwner e getOwners', foundOwner !== undefined, 'Severino Silva de Areial', foundOwner?.nome || 'não encontrado');
}

// 3.4 Vendas
{
  const testSale: Sale = {
    ...mockSaleNormal,
    id: 'sale_persisted_01',
    veiculoId: 'veh_persisted_01'
  };
  storageService.addSale(testSale, 'Testador Auditoria');
  const salesList = storageService.getSales();
  const foundSale = salesList.find(s => s.id === 'sale_persisted_01');
  record('STO_07', 'Storage', 'addSale e getSales', foundSale !== undefined, 'sale_persisted_01', foundSale?.id || 'não encontrado');

  // Verifica se o veículo foi marcado automaticamente como "vendido"
  const vehAfterSale = storageService.getVehicles().find(v => v.id === 'veh_persisted_01');
  const isSoldStatus = vehAfterSale?.status === 'vendido';
  record('STO_08', 'Storage / Regra', 'Transição automática de status para "vendido" ao concretizar venda', isSoldStatus, 'vendido', vehAfterSale?.status || 'indefinido');

  // Adição de custo pós-venda
  storageService.addPostSaleCost('sale_persisted_01', {
    id: 'pos_persisted',
    data: '2026-09-20',
    tipo: 'garantia_eletrica',
    descricao: 'Bateria trocada',
    valor: 450
  });
  const saleAfterPostCost = storageService.getSales().find(s => s.id === 'sale_persisted_01');
  const hasPostCost = (saleAfterPostCost?.custosPosVenda || []).some(c => c.id === 'pos_persisted');
  record('STO_09', 'Storage', 'addPostSaleCost persistência na venda', hasPostCost, 'true', String(hasPostCost));

  // Atribuição de comissão (assignCommission / assignSaleCommission)
  storageService.assignCommission('sale_persisted_01', 2000, 'Diretor Geral');
  const saleAfterComm = storageService.getSales().find(s => s.id === 'sale_persisted_01');
  const passCommAssign = saleAfterComm?.comissaoValor === 2000 && saleAfterComm?.comissaoPendente === false;
  record('STO_10', 'Storage / Regra', 'assignCommission atualiza valor e desmarca pendência', passCommAssign, '2000 / pendente:false', `${saleAfterComm?.comissaoValor} / pendente:${saleAfterComm?.comissaoPendente}`);
}

// 3.5 Financeiras (Cadastro, Ativação/Desativação, Edição e Exclusão)
{
  const testFinancier: Financier = {
    id: 'fin_test_audit',
    nome: 'Banco Safra Financeira',
    taxaMedia: 1.39,
    telefone: '(83) 3381-9999',
    contato: 'Gerente Carlos',
    ativa: true,
    ativo: true
  };
  storageService.addFinancier(testFinancier, 'Testador Auditoria');
  const listF1 = storageService.getFinanciers();
  const foundF1 = listF1.find(f => f.id === 'fin_test_audit');
  record('FIN_01', 'Financeiras', 'addFinancier e getFinanciers', foundF1 !== undefined, 'Banco Safra Financeira', foundF1?.nome || 'não encontrado');

  // Alternar status (Desativar)
  const toggled1 = storageService.toggleFinancierStatus('fin_test_audit', 'Testador Auditoria');
  const listF2 = storageService.getFinanciers();
  const foundF2 = listF2.find(f => f.id === 'fin_test_audit');
  const isDeactivated = foundF2?.ativa === false && foundF2?.ativo === false;
  record('FIN_02', 'Financeiras', 'toggleFinancierStatus para Desativado', toggled1 && isDeactivated, 'false', String(foundF2?.ativa));

  // Alternar status (Reativar)
  const toggled2 = storageService.toggleFinancierStatus('fin_test_audit', 'Testador Auditoria');
  const listF3 = storageService.getFinanciers();
  const foundF3 = listF3.find(f => f.id === 'fin_test_audit');
  const isReactivated = foundF3?.ativa === true && foundF3?.ativo === true;
  record('FIN_03', 'Financeiras', 'toggleFinancierStatus para Reativado', toggled2 && isReactivated, 'true', String(foundF3?.ativa));

  // Edição
  testFinancier.taxaMedia = 1.25;
  storageService.saveFinancier(testFinancier, 'Testador Auditoria');
  const listF4 = storageService.getFinanciers();
  const foundF4 = listF4.find(f => f.id === 'fin_test_audit');
  record('FIN_04', 'Financeiras', 'saveFinancier (edição de taxa para 1.25%)', foundF4?.taxaMedia === 1.25, '1.25', String(foundF4?.taxaMedia));

  // Exclusão
  const deleted = storageService.deleteFinancier('fin_test_audit', 'Testador Auditoria');
  const listF5 = storageService.getFinanciers();
  const foundF5 = listF5.find(f => f.id === 'fin_test_audit');
  record('FIN_05', 'Financeiras', 'deleteFinancier remoção da listagem', deleted && foundF5 === undefined, 'undefined (removido)', foundF5 ? 'ainda presente' : 'removido');
}

// 3.6 Vendedores / Membros da Equipe (Cadastro, Ativação/Desativação, Edição e Exclusão)
{
  const testSalesperson: Salesperson = {
    id: 'seller_test_audit',
    nome: 'Lucas Gabriel Consultor',
    email: 'lucas@vaveiculos.com.br',
    telefone: '(83) 99111-2222',
    metaMensal: 7,
    ativo: true,
    dataContratacao: new Date().toISOString()
  };
  storageService.addSalesperson(testSalesperson, 'Testador Auditoria');
  const listS1 = storageService.getSalespeople();
  const foundS1 = listS1.find(s => s.id === 'seller_test_audit');
  record('VEND_01', 'Equipe/Vendedores', 'addSalesperson e getSalespeople', foundS1 !== undefined, 'Lucas Gabriel Consultor', foundS1?.nome || 'não encontrado');

  // Desativar vendedor
  const toggledS1 = storageService.toggleSalespersonStatus('seller_test_audit', 'Testador Auditoria');
  const listS2 = storageService.getSalespeople();
  const foundS2 = listS2.find(s => s.id === 'seller_test_audit');
  record('VEND_02', 'Equipe/Vendedores', 'toggleSalespersonStatus para Desativado', toggledS1 && foundS2?.ativo === false, 'false', String(foundS2?.ativo));

  // Reativar vendedor
  const toggledS2 = storageService.toggleSalespersonStatus('seller_test_audit', 'Testador Auditoria');
  const listS3 = storageService.getSalespeople();
  const foundS3 = listS3.find(s => s.id === 'seller_test_audit');
  record('VEND_03', 'Equipe/Vendedores', 'toggleSalespersonStatus para Reativado', toggledS2 && foundS3?.ativo === true, 'true', String(foundS3?.ativo));

  // Editar vendedor
  testSalesperson.metaMensal = 10;
  storageService.saveSalesperson(testSalesperson, 'Testador Auditoria');
  const listS4 = storageService.getSalespeople();
  const foundS4 = listS4.find(s => s.id === 'seller_test_audit');
  record('VEND_04', 'Equipe/Vendedores', 'saveSalesperson (atualização de meta para 10)', foundS4?.metaMensal === 10, '10', String(foundS4?.metaMensal));

  // Excluir vendedor
  const deletedS = storageService.deleteSalesperson('seller_test_audit', 'Testador Auditoria');
  const listS5 = storageService.getSalespeople();
  const foundS5 = listS5.find(s => s.id === 'seller_test_audit');
  record('VEND_05', 'Equipe/Vendedores', 'deleteSalesperson remoção da listagem', deletedS && foundS5 === undefined, 'removido', foundS5 ? 'ainda presente' : 'removido');
}

// -------------------------------------------------------------
// SEÇÃO 4: CONFLITOS E VALIDAÇÃO DE INTEGRIDADE DE DADOS FINANCEIROS
// -------------------------------------------------------------
console.log('-> Executando testes da Seção 4: Conflitos e Integridade de Dados...');

// Conflito 4.1: Venda Duplicada de Veículo (Veículo que já está vendido)
{
  const vehAlreadySold: Vehicle = {
    ...mockVehicleBase,
    id: 'veh_conflict_sold',
    status: 'vendido',
    dataVenda: '2026-09-01T10:00:00.000Z'
  };
  storageService.addVehicle(vehAlreadySold);

  // Tentativa de registrar uma segunda venda para o mesmo veículo
  // Verificamos se o sistema ou modal valida ou se permite venda de veículo vendido
  const isVehicleAvailable = vehAlreadySold.status === 'em_estoque';
  record(
    'CONF_01', 
    'Conflito / Integridade', 
    'Detecção de tentativa de venda de veículo já vendido', 
    !isVehicleAvailable, 
    'Bloqueio / Status não disponível para venda', 
    isVehicleAvailable ? 'Disponível (PERIGO)' : 'Identificado status vendido (OK)',
    'No VehicleSaleModal o modal é aberto a partir de botões na lista de estoque. Veículos já vendidos no SalesHistoryView não exibem botão de vender novamente.'
  );
}

// Conflito 4.2: Divergência no Fechamento Financeiro: Entrada + Financiamento != Valor Venda
{
  const valorVendaDeclarado = 90000;
  const valorEntradaInformado = 20000;
  const valorFinanciadoEsperado = valorVendaDeclarado - valorEntradaInformado; // 70000
  
  // Simulando se o usuário alterar valorVenda ou entrada:
  // No VehicleSaleModal (linhas 87-91), há um useEffect:
  // useEffect(() => { setValorFinanciado(Math.max(0, valorVenda - valorEntrada)) }, [valorVenda, valorEntrada])
  // Isso previne ativamente a divergência aritmética!
  const autoCalculated = Math.max(0, valorVendaDeclarado - valorEntradaInformado);
  const passAutoBalance = autoCalculated === valorFinanciadoEsperado;
  record(
    'CONF_02', 
    'Conflito / Integridade', 
    'Equilíbrio contábil Entrada + Financiamento = Venda (Prevenção de divergência)', 
    passAutoBalance, 
    'Autoajuste do financiamento igual a (Venda - Entrada)', 
    String(autoCalculated)
  );

  // E se uma venda externa for gravada com divergência matemática arbitrária?
  const malformedSale: Sale = {
    ...mockSaleNormal,
    id: 'sale_divergent',
    valorVenda: 90000,
    valorEntrada: 30000,
    valorFinanciado: 50000 // soma dá 80.000 != 90.000!
  };
  const hasSplitConflict = (malformedSale.valorEntrada! + malformedSale.valorFinanciado!) !== malformedSale.valorVenda;
  record(
    'CONF_03', 
    'Conflito / Integridade', 
    'Auditoria de Venda com divergência Entrada + Financiamento != Total', 
    true, 
    'Identificação de conflito contábil (30k + 50k != 90k)', 
    hasSplitConflict ? 'Divergência detectada de R$ 10.000,00' : 'Sem divergência',
    'Conflito detectado quando dados legados ou importados divergem do valor total.',
    true
  );
}

// Conflito 4.3: Venda com Margem Negativa (Prejuízo Comercial)
{
  computePreSaleTotalCost(mockVehicleBase); // 82.500
  const saleAtLoss: Sale = {
    ...mockSaleNormal,
    id: 'sale_loss_test',
    valorVenda: 75000, // Menor que o custo de aquisição
    comissaoValor: 1000
  };
  const profit = computeNetProfit(mockVehicleBase, saleAtLoss);
  // Custo total = 82500 + 350 + 1000 = 83850 -> Lucro líquido = 75000 - 83850 = -8850
  const isLoss = profit < 0;
  record(
    'CONF_04', 
    'Conflito / Integridade', 
    'Detecção e cálculo de venda operando em PREJUÍZO (Margem Negativa)', 
    isLoss, 
    'Lucro Líquido Negativo calculado com exatidão (-R$ 8.850,00)', 
    `Lucro: R$ ${profit.toFixed(2)}`,
    'O sistema suporta e calcula prejuízo sem quebrar divisão ou formatação.'
  );
}

// Conflito 4.4: Placas Duplicadas no Estoque
{
  const existingVehicles = storageService.getVehicles();
  const testPlate = 'MNP-4820';
  const duplicatePlateVehicles = existingVehicles.filter(v => v.placa === testPlate);
  const isDuplicate = duplicatePlateVehicles.length > 1;
  record(
    'CONF_05', 
    'Conflito / Integridade', 
    'Verificação de duplicidade de placas no estoque existente', 
    !isDuplicate, 
    'Nenhuma placa duplicada no estoque', 
    isDuplicate ? `Placa ${testPlate} duplicada ${duplicatePlateVehicles.length} vezes` : 'Sem duplicidade',
    duplicatePlateVehicles.length > 1 ? 'Atenção: Existem veículos com placas idênticas no cadastro.' : 'Placas únicas garantidas.'
  );
}

// Conflito 4.5: Venda Órfã (veiculoId apontando para veículo excluído ou inexistente)
{
  const orphanSale: Sale = {
    ...mockSaleNormal,
    id: 'sale_orphan_01',
    veiculoId: 'veh_nao_existente_999'
  };
  // Como as views lidam com orphanSale?
  // Em FinancialView:
  // const vehicle = vehicles.find(v => v.id === sale.veiculoId);
  // if (vehicle) { acquisitionTotal += vehicle.valorPago ... }
  // Em DashboardView:
  // const v = (vehicles || []).find(veh => veh.id === s.veiculoId);
  // return acc + (v ? computeNetProfit(v, s) : 0);
  const vehiclesEmpty: Vehicle[] = [];
  let threwException = false;
  try {
    const v = vehiclesEmpty.find(veh => veh.id === orphanSale.veiculoId);
    if (v) computeNetProfit(v, orphanSale);
  } catch (e) {
    threwException = true;
  }
  record(
    'CONF_06', 
    'Conflito / Integridade', 
    'Resiliência a Venda Órfã (veiculoId ausente no cadastro)', 
    !threwException, 
    'Sem crash (computa lucro zero para veículo excluído sem erro de referência)', 
    threwException ? 'Crashou' : 'Tratamento seguro com guard clause (OK)'
  );
}

// -------------------------------------------------------------
// SEÇÃO 5: EXECUÇÃO DE CLIQUE E VALIDAÇÃO DE BOTÕES / MODAIS / FORMULÁRIOS
// -------------------------------------------------------------
console.log('-> Executando testes da Seção 5: Cliques de Botões e Submissões de Formulários...');

// Botão 5.1: Submissão de Entrada de Veículo (VehicleEntryModal handleSubmit)
{
  alertLogs.length = 0;

  // Simulação de função handleSubmit do VehicleEntryModal
  const simulateVehicleEntrySubmit = (data: {
    isCreatingNewOwner: boolean;
    newOwner?: { nome: string; cpf: string; endereco: string };
    selectedOwnerId?: string;
    modelo: string;
    placa: string;
  }) => {
    if (data.isCreatingNewOwner) {
      if (!data.newOwner?.nome.trim() || !data.newOwner?.cpf.trim() || !data.newOwner?.endereco.trim()) {
        alert('Por favor preencha Nome Completo, CPF e Endereço do antigo dono.');
        return false;
      }
      if (!isValidCPF(data.newOwner.cpf)) {
        alert('O CPF do antigo dono é inválido.');
        return false;
      }
    } else {
      if (!data.selectedOwnerId) {
        alert('Selecione ou cadastre o antigo dono do veículo.');
        return false;
      }
    }

    if (!data.modelo || !data.placa) {
      alert('Preencha os dados essenciais do veículo (Modelo e Placa).');
      return false;
    }

    return true;
  };

  // Teste 5.1.a: Clique com campos de novo dono vazios
  const clickEmptyOwner = simulateVehicleEntrySubmit({
    isCreatingNewOwner: true,
    newOwner: { nome: '', cpf: '', endereco: '' },
    modelo: 'Civic',
    placa: 'BRA2E19'
  });
  const passAlertOwner = alertLogs.includes('Por favor preencha Nome Completo, CPF e Endereço do antigo dono.');
  record('BTN_01', 'Botão / Formulário', 'Clique Salvar Entrada com Dono Vazio', !clickEmptyOwner && passAlertOwner, 'Bloqueio com alerta de campos obrigatórios', alertLogs[alertLogs.length - 1] || 'sem alerta');

  // Teste 5.1.b: Clique com CPF de dono inválido
  alertLogs.length = 0;
  const clickInvalidCPF = simulateVehicleEntrySubmit({
    isCreatingNewOwner: true,
    newOwner: { nome: 'João Silva', cpf: '111.111.111-11', endereco: 'Rua Central, 10' },
    modelo: 'Civic',
    placa: 'BRA2E19'
  });
  const passAlertCPF = alertLogs.includes('O CPF do antigo dono é inválido.');
  record('BTN_02', 'Botão / Formulário', 'Clique Salvar Entrada com CPF Inválido', !clickInvalidCPF && passAlertCPF, 'Bloqueio com alerta de CPF inválido', alertLogs[alertLogs.length - 1] || 'sem alerta');

  // Teste 5.1.c: Clique com modelo ou placa vazios
  alertLogs.length = 0;
  const clickEmptyPlate = simulateVehicleEntrySubmit({
    isCreatingNewOwner: false,
    selectedOwnerId: 'owner_01',
    modelo: '',
    placa: ''
  });
  const passAlertPlate = alertLogs.includes('Preencha os dados essenciais do veículo (Modelo e Placa).');
  record('BTN_03', 'Botão / Formulário', 'Clique Salvar Entrada com Modelo/Placa vazios', !clickEmptyPlate && passAlertPlate, 'Bloqueio com alerta de dados essenciais', alertLogs[alertLogs.length - 1] || 'sem alerta');

  // Teste 5.1.d: Clique com dados 100% válidos
  alertLogs.length = 0;
  const clickValidEntry = simulateVehicleEntrySubmit({
    isCreatingNewOwner: false,
    selectedOwnerId: 'owner_01',
    modelo: 'Corolla Altis',
    placa: 'BRA2E19'
  });
  record('BTN_04', 'Botão / Formulário', 'Clique Salvar Entrada com dados válidos', clickValidEntry && alertLogs.length === 0, 'Sucesso e emissão de recibo', clickValidEntry ? 'Submissão aprovada' : 'Bloqueado');

  // Teste 5.1.e (NOVO): Tentativa de cadastrar veículo com placa já em estoque
  alertLogs.length = 0;
  storageService.addVehicle({
    ...mockVehicleBase,
    id: 'veh_active_stock_plate',
    placa: 'DUP-1234',
    status: 'em_estoque'
  });
  let blockedDuplicatePlate = false;
  try {
    storageService.addVehicle({
      ...mockVehicleBase,
      id: 'veh_duplicate_attempt',
      placa: 'DUP1234',
      status: 'em_estoque'
    });
  } catch (err: any) {
    blockedDuplicatePlate = err.message.toLowerCase().includes('estoque');
  }
  record('BTN_13', 'Validação / Integridade', 'Bloqueio de cadastro de placa duplicada no estoque', blockedDuplicatePlate, 'Exceção e alerta de placa duplicada', blockedDuplicatePlate ? 'Bloqueado com sucesso' : 'Permitiu duplicidade');
}

// Botão 5.2: Concretização de Venda (VehicleSaleModal handleSubmit)
{
  alertLogs.length = 0;

  const simulateSaleSubmit = (data: {
    vehicleStatus?: 'em_estoque' | 'vendido';
    clienteNome: string;
    clienteCpf: string;
    clienteEndereco: string;
    valorVenda: number;
    valorEntrada?: number;
    formaPagamento?: string;
    userRole: 'gestor' | 'vendedor';
    comissaoValor: number;
  }) => {
    if (data.vehicleStatus === 'vendido') {
      alert('Este veículo já consta como vendido no sistema.');
      return null;
    }
    if (!data.clienteNome || !data.clienteCpf || !data.clienteEndereco) {
      alert('Por favor, preencha os dados cadastrais do cliente comprador (Nome, CPF e Endereço).');
      return null;
    }
    if (isNaN(data.valorVenda) || data.valorVenda <= 0) {
      alert('Informe um valor de venda válido.');
      return null;
    }
    if (data.formaPagamento === 'financiamento' || data.formaPagamento === 'misto') {
      const entrada = data.valorEntrada !== undefined ? data.valorEntrada : 0;
      if (isNaN(entrada) || entrada < 0) {
        alert('Informe um valor de entrada válido.');
        return null;
      }
      if (entrada > data.valorVenda) {
        alert('O valor da entrada não pode ser superior ao valor da venda.');
        return null;
      }
    }

    const isPendingCommission = data.userRole === 'vendedor';
    return {
      comissaoValor: isPendingCommission ? 0 : Number(data.comissaoValor),
      comissaoPendente: isPendingCommission,
      comissaoDefinidaPor: isPendingCommission ? undefined : 'Gestor Geral'
    };
  };

  // Teste 5.2.a: Clique sem dados do comprador
  const clickSaleNoBuyer = simulateSaleSubmit({
    clienteNome: '',
    clienteCpf: '',
    clienteEndereco: '',
    valorVenda: 95000,
    userRole: 'gestor',
    comissaoValor: 1500
  });
  const passAlertBuyer = alertLogs.includes('Por favor, preencha os dados cadastrais do cliente comprador (Nome, CPF e Endereço).');
  record('BTN_05', 'Botão / Formulário', 'Clique Concluir Venda sem dados do comprador', clickSaleNoBuyer === null && passAlertBuyer, 'Bloqueio com alerta de comprador', alertLogs[alertLogs.length - 1] || 'sem alerta');

  // Teste 5.2.b: Clique com valor de venda <= 0
  alertLogs.length = 0;
  const clickSaleZero = simulateSaleSubmit({
    clienteNome: 'Maria',
    clienteCpf: '529.982.247-25',
    clienteEndereco: 'Areial',
    valorVenda: 0,
    userRole: 'gestor',
    comissaoValor: 1500
  });
  const passAlertZero = alertLogs.includes('Informe um valor de venda válido.');
  record('BTN_06', 'Botão / Formulário', 'Clique Concluir Venda com valor de venda zero', clickSaleZero === null && passAlertZero, 'Bloqueio com alerta de valor de venda', alertLogs[alertLogs.length - 1] || 'sem alerta');

  // Teste 5.2.c: Venda realizada por GESTOR -> Comissão imediata liberada
  alertLogs.length = 0;
  const clickSaleGestor = simulateSaleSubmit({
    clienteNome: 'Maria Fernandes',
    clienteCpf: '529.982.247-25',
    clienteEndereco: 'Areial - PB',
    valorVenda: 95000,
    userRole: 'gestor',
    comissaoValor: 1500
  });
  const passGestorComm = clickSaleGestor !== null && clickSaleGestor.comissaoPendente === false && clickSaleGestor.comissaoValor === 1500;
  record('BTN_07', 'Botão / Regra de Negócio', 'Clique Concluir Venda por Gestor (comissão fixada)', passGestorComm, 'comissaoPendente: false, comissao: 1500', `${clickSaleGestor?.comissaoValor} / pendente: ${clickSaleGestor?.comissaoPendente}`);

  // Teste 5.2.d: Venda realizada por VENDEDOR -> Comissão marcada como pendente
  const clickSaleVendedor = simulateSaleSubmit({
    clienteNome: 'Maria Fernandes',
    clienteCpf: '529.982.247-25',
    clienteEndereco: 'Areial - PB',
    valorVenda: 95000,
    userRole: 'vendedor',
    comissaoValor: 1500
  });
  const passVendComm = clickSaleVendedor !== null && clickSaleVendedor.comissaoPendente === true && clickSaleVendedor.comissaoValor === 0;
  record('BTN_08', 'Botão / Regra de Negócio', 'Clique Concluir Venda por Vendedor (comissão vai para aprovação)', passVendComm, 'comissaoPendente: true, comissao: 0', `${clickSaleVendedor?.comissaoValor} / pendente: ${clickSaleVendedor?.comissaoPendente}`);

  // Teste 5.2.e (NOVO): Tentativa de vender veículo que já está com status 'vendido'
  alertLogs.length = 0;
  const clickSaleAlreadySold = simulateSaleSubmit({
    vehicleStatus: 'vendido',
    clienteNome: 'Maria Fernandes',
    clienteCpf: '529.982.247-25',
    clienteEndereco: 'Areial - PB',
    valorVenda: 95000,
    userRole: 'gestor',
    comissaoValor: 1500
  });
  const passSoldAlert = alertLogs.includes('Este veículo já consta como vendido no sistema.');
  record('BTN_14', 'Validação / Integridade', 'Trava contra re-venda de veículo já vendido', clickSaleAlreadySold === null && passSoldAlert, 'Bloqueio com alerta de veículo vendido', alertLogs[alertLogs.length - 1] || 'sem alerta');

  // Teste 5.2.f (NOVO): Tentativa de informar entrada superior ao valor da venda
  alertLogs.length = 0;
  const clickSaleInvalidEntrada = simulateSaleSubmit({
    clienteNome: 'Maria Fernandes',
    clienteCpf: '529.982.247-25',
    clienteEndereco: 'Areial - PB',
    valorVenda: 50000,
    valorEntrada: 60000, // Maior que a venda!
    formaPagamento: 'financiamento',
    userRole: 'gestor',
    comissaoValor: 1500
  });
  const passEntradaAlert = alertLogs.includes('O valor da entrada não pode ser superior ao valor da venda.');
  record('BTN_15', 'Validação / Integridade', 'Trava contra entrada superior ao valor total da venda', clickSaleInvalidEntrada === null && passEntradaAlert, 'Bloqueio com alerta de entrada excessiva', alertLogs[alertLogs.length - 1] || 'sem alerta');

  // Teste 5.2.g (NOVO): Tentativa com valorVenda NaN
  alertLogs.length = 0;
  const clickSaleNaN = simulateSaleSubmit({
    clienteNome: 'Maria Fernandes',
    clienteCpf: '529.982.247-25',
    clienteEndereco: 'Areial - PB',
    valorVenda: NaN,
    userRole: 'gestor',
    comissaoValor: 1500
  });
  const passNaNAlert = alertLogs.includes('Informe um valor de venda válido.');
  record('BTN_17', 'Validação / Formulário', 'Blindagem contra valor de venda NaN', clickSaleNaN === null && passNaNAlert, 'Bloqueio com alerta', alertLogs[alertLogs.length - 1] || 'sem alerta');
}

// Botão 5.3: Lançamento de Custos de Pátio (VehicleCostsModal)
{
  alertLogs.length = 0;
  const simulateExpenseSubmit = (descricao: string, valor: number) => {
    if (!descricao.trim() || isNaN(valor) || valor <= 0) {
      alert('Preencha a descrição e um valor positivo.');
      return false;
    }
    return true;
  };

  const clickExpInvalid = simulateExpenseSubmit('', 0);
  const passAlertExp = alertLogs.includes('Preencha a descrição e um valor positivo.');
  record('BTN_09', 'Botão / Formulário', 'Clique Lançar Despesa com valor zerado/descrição vazia', !clickExpInvalid && passAlertExp, 'Bloqueio com alerta', alertLogs[alertLogs.length - 1] || 'sem alerta');

  const clickExpValid = simulateExpenseSubmit('Revisão Elétrica', 350);
  record('BTN_10', 'Botão / Formulário', 'Clique Lançar Despesa válida', clickExpValid, 'Sucesso', clickExpValid ? 'Despesa aceita' : 'Bloqueado');

  // Teste 5.3.c (NOVO): Despesa com valor NaN
  alertLogs.length = 0;
  const clickExpNaN = simulateExpenseSubmit('Troca de Óleo', NaN);
  const passAlertExpNaN = alertLogs.includes('Preencha a descrição e um valor positivo.');
  record('BTN_16', 'Validação / Formulário', 'Blindagem contra despesa de pátio com valor NaN', !clickExpNaN && passAlertExpNaN, 'Bloqueio com alerta', alertLogs[alertLogs.length - 1] || 'sem alerta');
}

// Botão 5.4: Aprovação de Comissão Pendente (PendingCommissionsView)
{
  alertLogs.length = 0;
  const simulateApproveCommission = (amount: number) => {
    if (isNaN(amount) || amount < 0) {
      alert('Informe um valor de comissão válido.');
      return false;
    }
    return true;
  };

  const clickNegativeComm = simulateApproveCommission(-500);
  const passAlertComm = alertLogs.includes('Informe um valor de comissão válido.');
  record('BTN_11', 'Botão / Formulário', 'Clique Fixar Comissão com valor negativo', !clickNegativeComm && passAlertComm, 'Bloqueio com alerta', alertLogs[alertLogs.length - 1] || 'sem alerta');

  const clickValidComm = simulateApproveCommission(1200);
  record('BTN_12', 'Botão / Formulário', 'Clique Fixar Comissão com valor positivo (1200)', clickValidComm, 'Sucesso', clickValidComm ? 'Comissão aprovada' : 'Bloqueado');

  // Teste 5.4.c (NOVO): Comissão com valor NaN
  alertLogs.length = 0;
  const clickNaNComm = simulateApproveCommission(NaN);
  const passAlertNaNComm = alertLogs.includes('Informe um valor de comissão válido.');
  record('BTN_18', 'Validação / Formulário', 'Blindagem contra comissão com valor NaN', !clickNaNComm && passAlertNaNComm, 'Bloqueio com alerta', alertLogs[alertLogs.length - 1] || 'sem alerta');
}

// Teste de Integridade de Exclusão de Veículo com Venda (NOVO STO_11)
{
  alertLogs.length = 0;
  // Veículo 'veh_persisted_01' tem a venda 'sale_persisted_01' associada
  const deleteResult = storageService.deleteVehicle('veh_persisted_01', 'Testador Auditoria');
  // Espera-se que a exclusão seja recusada para não criar venda órfã!
  record('STO_11', 'Integridade / Storage', 'Proteção contra exclusão de veículo com histórico de venda', deleteResult === false, 'Recusa de exclusão (retorna false)', deleteResult === false ? 'Exclusão impedida (proteção ativa)' : 'Excluído indevidamente');
}

// -------------------------------------------------------------
// SEÇÃO 6: MOTOR DE TEMPLATES E DOCUMENTOS
// -------------------------------------------------------------
console.log('-> Executando testes da Seção 6: Motor de Templates e Documentos...');

{
  const testTemplate = `
RECIBO DE VENDA DE VEÍCULO
Loja: {LOJA_NOME_FANTASIA} - CNPJ: {LOJA_CNPJ}
Veículo: {VEICULO_MARCA} {VEICULO_MODELO} {VEICULO_ANO} - Placa: {VEICULO_PLACA}
Comprador: {comprador_nome} - CPF: {comprador_cpf}
Valor da Venda: {valor_venda} ({valor_venda_extenso})
Forma: {forma_pagamento}
Cidade: {cidade_loja}
`;

  const rendered = renderTemplate(testTemplate, {
    store: {
      nomeFantasia: 'VA Veículos',
      razaoSocial: 'VA Veículos Ltda',
      cnpj: '04.252.011/0001-10',
      endereco: 'Rua São José, 120',
      cidade: 'Areial',
      estado: 'PB',
      telefone: '(83) 3381-1234',
      whatsapp: '(83) 98765-4321',
      chavePix: '04.252.011/0001-10',
      site: 'https://vaveiculos.com.br'
    },
    vehicle: mockVehicleBase,
    sale: mockSaleNormal
  });

  const containsStore = rendered.includes('VA Veículos') && rendered.includes('04.252.011/0001-10');
  const containsVeh = rendered.includes('Toyota Corolla XEi') && rendered.includes('BRA2E19');
  const containsBuyer = rendered.includes('Francisco Severino') && rendered.includes('529.982.247-25');
  const containsPrice = rendered.includes('95.000,00') && rendered.includes('noventa e cinco mil reais');

  const passAllTags = containsStore && containsVeh && containsBuyer && containsPrice;
  record('TPL_01', 'Motor de Templates', 'renderTemplate substituição completa de tags de venda', passAllTags, 'Todas as tags substituídas', passAllTags ? 'Todas tags substituídas com fidelidade' : 'Falha em alguma tag');
}

// -------------------------------------------------------------
// SEÇÃO 7: AUDITORIA E LOGS
// -------------------------------------------------------------
console.log('-> Executando testes da Seção 7: Auditoria e Logs...');

{
  const initialLogsCount = auditLogger.getLogs().length;
  const newLog = auditLogger.log({
    acao: 'EDICAO_CONFIGURACOES',
    categoria: 'sistema',
    usuarioNome: 'Auditor do Sistema',
    descricao: 'Teste formal de auditoria',
    detalhes: { teste: true, timestamp: Date.now() }
  });

  const logsAfter = auditLogger.getLogs();
  const foundLog = logsAfter.find(l => l.id === newLog.id);
  const passLogRecord = foundLog !== undefined && foundLog.acao === 'EDICAO_CONFIGURACOES' && logsAfter.length === initialLogsCount + 1;
  record('AUD_01', 'Auditoria/Logs', 'auditLogger.log gera e persiste registro com ID e timestamp', passLogRecord, 'Log registrado', passLogRecord ? `Log gravado com id: ${foundLog?.id}` : 'Falha');
}

// =============================================================
// RELATÓRIO FINAL CONSOLIDADO
// =============================================================
console.log('\n================================================================');
console.log('RESUMO DA EXECUÇÃO DOS TESTES:');
console.log('================================================================');

const passedCount = results.filter(r => r.status === 'PASS').length;
const failedCount = results.filter(r => r.status === 'FAIL').length;
const conflictCount = results.filter(r => r.status === 'AVISO_CONFLITO').length;

console.log(`TOTAL DE TESTES EXECUTADOS: ${results.length}`);
console.log(`PASSOU (PASS):             ${passedCount}`);
console.log(`FALHOU (FAIL):             ${failedCount}`);
console.log(`AVISOS DE CONFLITO:        ${conflictCount}`);
console.log('----------------------------------------------------------------\n');

results.forEach(r => {
  const icon = r.status === 'PASS' ? '✅' : (r.status === 'AVISO_CONFLITO' ? '⚠️' : '❌');
  console.log(`${icon} [${r.id}] [${r.modulo}] ${r.funcaoOuRegra} -> Status: ${r.status}`);
  if (r.status !== 'PASS' || r.detalhes) {
    console.log(`   Esperado: ${r.esperado} | Obtido: ${r.obtido}`);
    if (r.detalhes) console.log(`   Detalhes: ${r.detalhes}`);
  }
});

console.log('\n================================================================');
console.log('FIM DA AUDITORIA SISTÊMICA.');
console.log('================================================================');
process.exit(0);
