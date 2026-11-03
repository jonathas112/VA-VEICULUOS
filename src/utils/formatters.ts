import { Vehicle, Sale } from '../types';

/**
 * Formatação de moeda brasileira oficial
 */
export function formatCurrency(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

const MAX_CURRENCY_DIGITS = 11; // Teto seguro: R$ 999.999.999,99 (bloqueia spam infinito de dígitos)
const MAX_CURRENCY_VALUE = 999_999_999.99;

/**
 * Máscara dinâmica de entrada monetária brasileira (digitação centesimal suave)
 * Exemplo de digitação: '100' -> 'R$ 1,00', '4500000' -> 'R$ 45.000,00'
 * Blindada contra spam infinito de dígitos (máx. 11 dígitos / R$ 999.999.999,99).
 */
export function maskCurrency(val: string | number): string {
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return 'R$ 0,00';
    const clamped = Math.max(-MAX_CURRENCY_VALUE, Math.min(MAX_CURRENCY_VALUE, val));
    return formatCurrency(clamped);
  }
  const cleanDigits = String(val).replace(/\D/g, '').slice(0, MAX_CURRENCY_DIGITS);
  if (!cleanDigits) return 'R$ 0,00';
  const numericValue = parseInt(cleanDigits, 10) / 100;
  return formatCurrency(numericValue);
}

/**
 * Converte valor mascarado ou string em número puro não-negativo com teto seguro
 */
export function unmaskCurrency(maskedValue: string | number): number {
  if (typeof maskedValue === 'number') {
    if (!Number.isFinite(maskedValue)) return 0;
    return Math.max(0, Math.min(MAX_CURRENCY_VALUE, maskedValue));
  }
  if (!maskedValue) return 0;
  const cleanDigits = String(maskedValue).replace(/\D/g, '').slice(0, MAX_CURRENCY_DIGITS);
  if (!cleanDigits) return 0;
  return parseInt(cleanDigits, 10) / 100;
}

/**
 * Máscara de CPF: 000.000.000-00
 */
export function maskCPF(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/**
 * Validação rigorosa dos dígitos verificadores do CPF
 */
export function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  // Bloqueia CPFs com dígitos todos repetidos
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean.substring(10, 11), 10)) return false;

  return true;
}

/**
 * Máscara de CNPJ: 00.000.000/0001-00
 */
export function maskCNPJ(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Validação dos dígitos verificadores do CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let length = clean.length - 2;
  let numbers = clean.substring(0, length);
  const digits = clean.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  length = length + 1;
  numbers = clean.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1), 10)) return false;

  return true;
}

/**
 * Máscara de Telefone / WhatsApp com suporte a fixo (10 dígitos) e celular (11 dígitos)
 * Ex: (83) 98765-4321
 */
export function maskPhone(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/**
 * Máscara de CEP: 58140-000 (Padrão Areial-PB e nacional)
 */
export function maskCEP(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
}

/**
 * Máscara de Placa Veicular (compatível com Mercosul ABC1D23 e padrão tradicional ABC-1234)
 */
export function maskPlate(value: string): string {
  if (!value) return '';
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (clean.length > 3) {
    // Se o 5º caractere for letra (Mercosul), exibe sem hífen: ABC1D23
    // Se for número (tradicional), pode formatar como ABC-1234
    const isMercosul = /^[A-Z]{3}[0-9][A-Z]/.test(clean);
    if (isMercosul) {
      return clean;
    }
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

/**
 * Máscara de RENAVAM: 11 dígitos numéricos
 */
export function maskRenavam(value: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 11);
}

/**
 * Validação de Telefone / Celular brasileiro (10 dígitos fixo ou 11 dígitos celular)
 * Suporta formatos com DDD nacional (11 a 99)
 */
export function isValidPhone(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10 && digits.length !== 11) return false;
  // Rejeita sequências de dígitos repetidos como 11111111111 ou 0000000000
  if (/^(\d)\1+$/.test(digits)) return false;
  const ddd = parseInt(digits.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  // Celulares no Brasil (11 dígitos) iniciam com o dígito 9 após o DDD
  if (digits.length === 11 && digits.charAt(2) !== '9') return false;
  return true;
}

/**
 * Validação de CEP brasileiro (exatamente 8 dígitos numéricos)
 */
export function isValidCEP(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return false;
  if (/^(\d)\1{7}$/.test(digits)) return false;
  return true;
}

/**
 * Validação de Placa Veicular (Mercosul ABC1D23 ou Tradicional ABC1234 / ABC-1234)
 */
export function isValidPlate(value: string): boolean {
  if (!value) return false;
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 7) return false;
  const isTraditional = /^[A-Z]{3}[0-9]{4}$/.test(clean);
  const isMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(clean);
  return isTraditional || isMercosul;
}

/**
 * Validação de RENAVAM (9 a 11 dígitos numéricos, padrão DENATRAN legado e atual)
 */
export function isValidRenavam(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  return true;
}

/**
 * Validação de Ano de Fabricação / Modelo (4 dígitos, entre 1900 e ano atual + 2)
 */
export function isValidYear(year: number | string): boolean {
  const cleanStr = String(year ?? '').trim();
  if (!/^\d{4}$/.test(cleanStr)) return false;
  const num = parseInt(cleanStr, 10);
  const maxYear = new Date().getFullYear() + 2;
  return !isNaN(num) && num >= 1900 && num <= maxYear;
}

/**
 * Valida a consistência automotiva entre Ano de Fabricação e Ano Modelo (regra DENATRAN: modelo = fabricação ou fabricação + 1)
 */
export function isValidVehicleYears(
  anoFabricacao: number | string,
  anoModelo: number | string
): { valid: boolean; error?: string } {
  const currentYear = new Date().getFullYear();
  if (!isValidYear(anoFabricacao) || Number(anoFabricacao) > currentYear + 1) {
    return {
      valid: false,
      error: `Informe um Ano de Fabricação válido de 4 dígitos (entre 1900 e ${currentYear + 1}).`
    };
  }
  if (!isValidYear(anoModelo)) {
    return {
      valid: false,
      error: `Informe um Ano Modelo válido de 4 dígitos (entre 1900 e ${currentYear + 2}).`
    };
  }
  const fab = Number(anoFabricacao);
  const mod = Number(anoModelo);
  if (mod < fab) {
    return {
      valid: false,
      error: `Inconsistência automotiva: o Ano Modelo (${mod}) não pode ser anterior ao Ano de Fabricação (${fab}).`
    };
  }
  if (mod > fab + 1) {
    return {
      valid: false,
      error: `Inconsistência automotiva: o Ano Modelo (${mod}) não pode ultrapassar 1 ano além do Ano de Fabricação (${fab}).`
    };
  }
  return { valid: true };
}

const BRAZILIAN_UFS = new Set<string>([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

/**
 * Máscara de UF (Estado brasileiro: 2 letras maiúsculas A-Z)
 */
export function maskUF(value: string): string {
  if (!value) return '';
  return String(value).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
}

/**
 * Validação das 27 Unidades Federativas oficiais do Brasil
 */
export function isValidUF(value: string): boolean {
  if (!value) return false;
  return BRAZILIAN_UFS.has(String(value).trim().toUpperCase());
}

/**
 * Máscara de Chassi / VIN (ISO 3779 / CONTRAN: até 17 caracteres alfanuméricos sem I, O ou Q)
 */
export function maskChassi(value: string): string {
  if (!value) return '';
  return String(value).toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
}

/**
 * Validação de Chassi / VIN (exatamente 17 caracteres alfanuméricos válidos conforme ISO 3779)
 */
export function isValidChassi(value: string): boolean {
  if (!value) return false;
  const clean = String(value).trim().toUpperCase();
  if (clean.length !== 17) return false;
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(clean)) return false;
  if (/^([A-Z0-9])\1{16}$/.test(clean)) return false;
  return true;
}

/**
 * Validação estrita de endereço de e-mail corporativo/pessoal
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const clean = String(email).trim();
  if (clean.length < 5 || clean.length > 120) return false;
  if (clean.includes('..')) return false;
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(clean);
}

/**
 * Máscara de dígitos inteiros não-negativos com limite estrito de comprimento
 */
export function maskDigits(value: string | number, maxDigits: number): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, Math.max(1, maxDigits));
}

/**
 * Restringe um valor numérico finito dentro do intervalo [min, max], bloqueando NaN, Infinity e negativos indevidos
 */
export function clampNumber(value: unknown, min: number, max: number, fallback = min): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

export function formatNumber(value: number): string {
  if (isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR').format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateLong(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Aritmética monetária exata em centavos inteiros (elimina desvios IEEE-754 de ponto flutuante)
 */
export function toCents(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return 0;
  const result = Math.round(cents) / 100;
  return Object.is(result, -0) ? 0 : result;
}

export function roundCurrency(value: number | null | undefined): number {
  return fromCents(toCents(value));
}

export function sumCurrency(values: Array<number | null | undefined>): number {
  const totalCents = values.reduce<number>((acc, val) => acc + toCents(val), 0);
  return fromCents(totalCents);
}

/**
 * Normaliza placa veicular removendo hífens/espaços para comparação unívoca de duplicidade
 */
export function normalizePlate(value: string | null | undefined): string {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function getMonthYearKey(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}`;
}

export function getMonthName(monthOrKey: number | string): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  if (typeof monthOrKey === 'number') {
    return months[monthOrKey] || '';
  }
  const raw = String(monthOrKey || '').trim();
  if (!raw) return '';
  if (raw === 'all') return 'Todo o Histórico';
  const match = /^(\d{4})-(\d{2})$/.exec(raw);
  if (match) {
    const year = match[1];
    const idx = parseInt(match[2], 10) - 1;
    const monthLabel = months[idx];
    return monthLabel ? `${monthLabel} de ${year}` : raw;
  }
  const numericIdx = Number(raw);
  if (Number.isInteger(numericIdx) && numericIdx >= 0 && numericIdx < 12) {
    return months[numericIdx];
  }
  return raw;
}

export function numberToWordsPtBr(num: number): string {
  if (typeof num !== 'number' || !Number.isFinite(num) || num === null || num === undefined) {
    return 'zero reais';
  }
  if (num < 0) {
    return 'menos ' + numberToWordsPtBr(Math.abs(num));
  }

  const totalCents = Math.round(num * 100);
  if (totalCents === 0) return 'zero reais';

  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function convertGroup(n: number): string {
    if (n === 100) return 'cem';
    let output = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    const t = Math.floor(remainder / 10);
    const u = remainder % 10;

    if (h > 0) output += hundreds[h];
    if (h > 0 && remainder > 0) output += ' e ';

    if (remainder >= 10 && remainder < 20) {
      output += teens[remainder - 10];
    } else {
      if (t > 0) output += tens[t];
      if (t > 0 && u > 0) output += ' e ';
      if (u > 0) output += units[u];
    }
    return output;
  }

  const integerPart = Math.floor(totalCents / 100);
  const cents = totalCents % 100;

  // Se for apenas centavos (menos de 1 real)
  if (integerPart === 0 && cents > 0) {
    return convertGroup(cents) + (cents === 1 ? ' centavo' : ' centavos');
  }

  const parts: string[] = [];

  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const rest = integerPart % 1000;

  if (millions > 0) {
    parts.push(convertGroup(millions) + (millions === 1 ? ' milhão' : ' milhões'));
  }
  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('mil');
    } else {
      parts.push(convertGroup(thousands) + ' mil');
    }
  }
  if (rest > 0) {
    parts.push(convertGroup(rest));
  }

  const hasLowerUnits = thousands > 0 || rest > 0;
  let currencySuffix = ' reais';
  if (integerPart === 1) {
    currencySuffix = ' real';
  } else if (millions > 0 && !hasLowerUnits) {
    currencySuffix = ' de reais';
  }

  let finalStr = parts.join(' e ') + currencySuffix;

  if (cents > 0) {
    finalStr += ' e ' + convertGroup(cents) + (cents === 1 ? ' centavo' : ' centavos');
  }

  return finalStr;
}

// CÁLCULOS EXATOS DE CUSTOS E MARGEM (EM CENTAVOS INTEIROS)

/**
 * Débito DETRAN efetivamente assumido pela loja.
 * Ignora valores residuais caso `temDebito === false` ou `quemArca !== 'loja'`.
 */
export function computeStoreDetranDebt(vehicle: Vehicle): number {
  if (!vehicle?.debitoDetran) return 0;
  if (vehicle.debitoDetran.temDebito === false) return 0;
  if (vehicle.debitoDetran.quemArca !== 'loja') return 0;
  return fromCents(Math.max(0, toCents(vehicle.debitoDetran.valor)));
}

export function computeAcquisitionCost(vehicle: Vehicle): number {
  const paidCents = toCents(vehicle?.valorPago);
  const detranCents = toCents(computeStoreDetranDebt(vehicle));
  return fromCents(paidCents + detranCents);
}

export function computePatioExpenses(vehicle: Vehicle): number {
  if (!vehicle?.custosPatio || !Array.isArray(vehicle.custosPatio)) return 0;
  const totalCents = vehicle.custosPatio.reduce(
    (acc, curr) => acc + toCents(Number(curr?.valor) || 0),
    0
  );
  return fromCents(totalCents);
}

export function computePreSaleTotalCost(vehicle: Vehicle): number {
  return fromCents(toCents(computeAcquisitionCost(vehicle)) + toCents(computePatioExpenses(vehicle)));
}

export function computePostSaleCosts(sale: Sale): number {
  if (!sale?.custosPosVenda || !Array.isArray(sale.custosPosVenda)) return 0;
  const totalCents = sale.custosPosVenda.reduce(
    (acc, curr) => acc + toCents(Number(curr?.valor) || 0),
    0
  );
  return fromCents(totalCents);
}

export function computeTotalSaleCost(vehicle: Vehicle, sale: Sale): number {
  const preCostCents = toCents(computePreSaleTotalCost(vehicle));
  const postCostCents = toCents(computePostSaleCosts(sale));
  const comissaoCents = toCents(Number(sale?.comissaoValor) || 0);
  const taxaCartaoCents = toCents(Number(sale?.taxaCartaoValor) || 0);
  return fromCents(preCostCents + postCostCents + comissaoCents + taxaCartaoCents);
}

export function computeNetProfit(vehicle: Vehicle, sale: Sale): number {
  const saleCents = toCents(sale?.valorVenda);
  const totalCostCents = toCents(computeTotalSaleCost(vehicle, sale));
  return fromCents(saleCents - totalCostCents);
}

export function computeGrossProfit(vehicle: Vehicle, sale: Sale): number {
  const saleCents = toCents(sale?.valorVenda);
  const preCostCents = toCents(computePreSaleTotalCost(vehicle));
  return fromCents(saleCents - preCostCents);
}

export function computeSaleMarginPercent(vehicle: Vehicle, sale: Sale): number {
  const revenueCents = toCents(sale?.valorVenda);
  if (revenueCents <= 0) return 0;
  const netProfitCents = toCents(computeNetProfit(vehicle, sale));
  const pct = (netProfitCents / revenueCents) * 100;
  return Number.isFinite(pct) ? pct : 0;
}

export function computeMarginPercent(revenue: number, cost: number): number;
export function computeMarginPercent(vehicle: Vehicle, sale: Sale): number;
export function computeMarginPercent(
  revenueOrVehicle: number | Vehicle,
  costOrSale: number | Sale
): number {
  if (
    typeof revenueOrVehicle === 'object' &&
    revenueOrVehicle !== null &&
    typeof costOrSale === 'object' &&
    costOrSale !== null
  ) {
    return computeSaleMarginPercent(revenueOrVehicle, costOrSale);
  }
  const revenueCents = toCents(
    typeof revenueOrVehicle === 'number' ? revenueOrVehicle : Number(revenueOrVehicle)
  );
  if (revenueCents <= 0) return 0;
  const costCents = toCents(
    typeof costOrSale === 'number' ? costOrSale : Number(costOrSale)
  );
  const profitCents = revenueCents - costCents;
  const pct = (profitCents / revenueCents) * 100;
  return Number.isFinite(pct) ? pct : 0;
}

export interface SaleFinancialValidationResult {
  valid: boolean;
  error?: string;
  normalizedVenda: number;
  normalizedEntrada?: number;
  normalizedFinanciado?: number;
  normalizedComissao: number;
  normalizedParcelas?: number;
  normalizedTroca?: number;
  normalizedTaxaCartaoValor?: number;
}

/**
 * Valida o equilíbrio financeiro contábil da venda em centavos inteiros:
 * Garante que (Entrada + Financiamento/Parcelamento + Carro na Troca) === Valor Total de Venda sem sobras órfãs.
 */
export function validateSaleFinancials(sale: Partial<Sale>): SaleFinancialValidationResult {
  const rawVenda = sale.valorVenda;
  if (typeof rawVenda !== 'number' || !Number.isFinite(rawVenda) || toCents(rawVenda) <= 0) {
    return {
      valid: false,
      error: 'Informe um valor de venda válido e superior a zero.',
      normalizedVenda: 0,
      normalizedComissao: 0
    };
  }

  const vendaCents = toCents(rawVenda);
  if (vendaCents < 10000) {
    return {
      valid: false,
      error: 'O valor da venda deve ser de no mínimo R$ 100,00.',
      normalizedVenda: fromCents(vendaCents),
      normalizedComissao: 0
    };
  }

  const rawComissao = sale.comissaoValor ?? 0;
  if (typeof rawComissao !== 'number' || !Number.isFinite(rawComissao) || toCents(rawComissao) < 0) {
    return {
      valid: false,
      error: 'O valor da comissão não pode ser negativo.',
      normalizedVenda: fromCents(vendaCents),
      normalizedComissao: 0
    };
  }
  const comissaoCents = toCents(rawComissao);
  const method = sale.formaPagamento || 'a_vista_pix';

  // Modalidade Troca / Trade-in
  if (method === 'troca') {
    const rawTroca = sale.veiculoTrocaValor ?? 0;
    const trocaCents = toCents(rawTroca);
    if (trocaCents <= 0) {
      return {
        valid: false,
        error: 'Na modalidade Troca (Trade-In), informe o valor de avaliação do veículo recebido na troca.',
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }
    if (trocaCents > vendaCents) {
      return {
        valid: false,
        error: 'O valor de avaliação do veículo na troca não pode ser superior ao valor total da venda.',
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }
    const rawEntrada = sale.valorEntrada ?? 0;
    const entradaCents = toCents(rawEntrada);
    const rawFinanciado = sale.valorFinanciado ?? 0;
    const financiadoCents = toCents(rawFinanciado);

    if (trocaCents + entradaCents + financiadoCents !== vendaCents) {
      const soma = trocaCents + entradaCents + financiadoCents;
      const diff = fromCents(Math.abs(vendaCents - soma));
      return {
        valid: false,
        error: `Desequilíbrio na modalidade Troca: Carro na Troca (${formatCurrency(fromCents(trocaCents))}) + Entrada (${formatCurrency(fromCents(entradaCents))}) + Financiamento (${formatCurrency(fromCents(financiadoCents))}) difere do Valor da Venda em ${formatCurrency(diff)}.`,
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }

    return {
      valid: true,
      normalizedVenda: fromCents(vendaCents),
      normalizedEntrada: entradaCents > 0 ? fromCents(entradaCents) : undefined,
      normalizedFinanciado: financiadoCents > 0 ? fromCents(financiadoCents) : undefined,
      normalizedTroca: fromCents(trocaCents),
      normalizedComissao: fromCents(comissaoCents),
      normalizedParcelas: sale.numeroParcelas ? Math.max(1, Math.round(Number(sale.numeroParcelas) || 1)) : undefined
    };
  }

  if (method === 'financiamento' || method === 'misto') {
    const rawEntrada = sale.valorEntrada ?? 0;
    if (typeof rawEntrada !== 'number' || !Number.isFinite(rawEntrada) || toCents(rawEntrada) < 0) {
      return {
        valid: false,
        error: 'Informe um valor de entrada válido (zero ou positivo).',
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }

    const entradaCents = toCents(rawEntrada);
    if (entradaCents > vendaCents) {
      return {
        valid: false,
        error: 'O valor da entrada não pode ser superior ao valor da venda.',
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }

    if (method === 'misto' && entradaCents <= 0) {
      return {
        valid: false,
        error: 'Na modalidade Pagamento Misto (Entrada + Financiamento), o valor de entrada deve ser maior que zero.',
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }

    const financiadoCents =
      sale.valorFinanciado !== undefined && sale.valorFinanciado !== null
        ? toCents(sale.valorFinanciado)
        : vendaCents - entradaCents;

    if (financiadoCents <= 0) {
      return {
        valid: false,
        error: 'O saldo financiado deve ser maior que zero. Para pagamento integral à vista, selecione "À Vista (Pix)".',
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }

    if (entradaCents + financiadoCents !== vendaCents) {
      const diff = fromCents(Math.abs(vendaCents - (entradaCents + financiadoCents)));
      return {
        valid: false,
        error: `Desequilíbrio financeiro na venda: Entrada (${formatCurrency(fromCents(entradaCents))}) + Financiamento (${formatCurrency(fromCents(financiadoCents))}) difere do Valor Total de Venda (${formatCurrency(fromCents(vendaCents))}) em ${formatCurrency(diff)}.`,
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }

    const parcelas = sale.numeroParcelas !== undefined ? Math.max(1, Math.round(Number(sale.numeroParcelas) || 1)) : 48;
    return {
      valid: true,
      normalizedVenda: fromCents(vendaCents),
      normalizedEntrada: fromCents(entradaCents),
      normalizedFinanciado: fromCents(financiadoCents),
      normalizedComissao: fromCents(comissaoCents),
      normalizedParcelas: parcelas
    };
  }

  if (method === 'cartao_credito') {
    const hasSplit = sale.valorEntrada !== undefined || sale.valorFinanciado !== undefined;
    const entradaCents = sale.valorEntrada !== undefined ? toCents(sale.valorEntrada) : 0;
    if (entradaCents < 0 || entradaCents > vendaCents) {
      return {
        valid: false,
        error: 'O valor de entrada no Cartão de Crédito deve estar entre R$ 0,00 e o Valor Total da Venda.',
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }
    const cartaoCents =
      sale.valorFinanciado !== undefined ? toCents(sale.valorFinanciado) : vendaCents - entradaCents;

    if (cartaoCents <= 0 && hasSplit) {
      return {
        valid: false,
        error: 'O saldo parcelado no Cartão de Crédito deve ser maior que zero.',
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }

    if (entradaCents + cartaoCents !== vendaCents) {
      const diff = fromCents(Math.abs(vendaCents - (entradaCents + cartaoCents)));
      return {
        valid: false,
        error: `Desequilíbrio financeiro na venda: Entrada (${formatCurrency(fromCents(entradaCents))}) + Cartão (${formatCurrency(fromCents(cartaoCents))}) difere do Valor Total de Venda em ${formatCurrency(diff)}.`,
        normalizedVenda: fromCents(vendaCents),
        normalizedComissao: fromCents(comissaoCents)
      };
    }

    const parcelas = sale.numeroParcelas !== undefined ? Math.max(1, Math.round(Number(sale.numeroParcelas) || 1)) : 1;
    
    // Taxa da maquininha (MDR)
    let taxaCartaoValor: number | undefined = undefined;
    if (sale.taxaCartaoValor !== undefined && Number.isFinite(Number(sale.taxaCartaoValor))) {
      taxaCartaoValor = roundCurrency(Math.max(0, Number(sale.taxaCartaoValor)));
    } else if (sale.taxaCartaoPercentual !== undefined && Number.isFinite(Number(sale.taxaCartaoPercentual))) {
      taxaCartaoValor = roundCurrency((fromCents(cartaoCents) * Math.max(0, Number(sale.taxaCartaoPercentual))) / 100);
    }

    return {
      valid: true,
      normalizedVenda: fromCents(vendaCents),
      normalizedEntrada: entradaCents > 0 ? fromCents(entradaCents) : undefined,
      normalizedFinanciado: entradaCents > 0 ? fromCents(cartaoCents) : undefined,
      normalizedComissao: fromCents(comissaoCents),
      normalizedParcelas: parcelas,
      normalizedTaxaCartaoValor: taxaCartaoValor
    };
  }

  // Modalidade À Vista / Pix: proíbe sobras órfãs de financiamento
  if (sale.valorFinanciado !== undefined && toCents(sale.valorFinanciado) !== 0) {
    return {
      valid: false,
      error: 'Venda À Vista (Pix) não pode possuir saldo financiado pendente.',
      normalizedVenda: fromCents(vendaCents),
      normalizedComissao: fromCents(comissaoCents)
    };
  }
  if (
    sale.valorEntrada !== undefined &&
    toCents(sale.valorEntrada) !== 0 &&
    toCents(sale.valorEntrada) !== vendaCents
  ) {
    return {
      valid: false,
      error: 'Em venda À Vista (Pix), não é permitido valor parcial divergente do Valor Total de Venda.',
      normalizedVenda: fromCents(vendaCents),
      normalizedComissao: fromCents(comissaoCents)
    };
  }

  return {
    valid: true,
    normalizedVenda: fromCents(vendaCents),
    normalizedEntrada: undefined,
    normalizedFinanciado: undefined,
    normalizedComissao: fromCents(comissaoCents),
    normalizedParcelas: undefined
  };
}
