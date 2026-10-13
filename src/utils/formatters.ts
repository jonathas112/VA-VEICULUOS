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

/**
 * Máscara dinâmica de entrada monetária brasileira (digitação centesimal suave)
 * Exemplo de digitação: '100' -> 'R$ 1,00', '4500000' -> 'R$ 45.000,00'
 */
export function maskCurrency(val: string | number): string {
  if (typeof val === 'number') {
    return formatCurrency(val);
  }
  const cleanDigits = String(val).replace(/\D/g, '');
  if (!cleanDigits) return 'R$ 0,00';
  const numericValue = parseInt(cleanDigits, 10) / 100;
  return formatCurrency(numericValue);
}

/**
 * Converte valor mascarado ou string em número puro
 */
export function unmaskCurrency(maskedValue: string | number): number {
  if (typeof maskedValue === 'number') return maskedValue;
  if (!maskedValue) return 0;
  const cleanDigits = String(maskedValue).replace(/\D/g, '');
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

export function getMonthYearKey(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}`;
}

export function getMonthName(monthIndex: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[monthIndex] || '';
}

// Helper to convert number to Portuguese written words (para contratos e recibos)
export function numberToWordsPtBr(num: number): string {
  if (num === 0) return 'zero reais';
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

  const integerPart = Math.floor(num);
  const cents = Math.round((num - integerPart) * 100);

  const parts: string[] = [];

  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const rest = integerPart % 1000;

  if (millions > 0) {
    parts.push(convertGroup(millions) + (millions === 1 ? ' milhão' : ' milhões'));
  }
  if (thousands > 0) {
    if (thousands === 1 && parts.length === 0) {
      parts.push('mil');
    } else {
      parts.push(convertGroup(thousands) + ' mil');
    }
  }
  if (rest > 0) {
    parts.push(convertGroup(rest));
  }

  let finalStr = parts.join(' e ') + (integerPart === 1 ? ' real' : ' reais');

  if (cents > 0) {
    finalStr += ' e ' + convertGroup(cents) + (cents === 1 ? ' centavo' : ' centavos');
  }

  return finalStr;
}

// CÁLCULOS EXATOS DE CUSTOS E MARGEM
export function computeAcquisitionCost(vehicle: Vehicle): number {
  const detranCost = vehicle.debitoDetran?.quemArca === 'loja' ? (vehicle.debitoDetran.valor || 0) : 0;
  return (vehicle.valorPago || 0) + detranCost;
}

export function computePatioExpenses(vehicle: Vehicle): number {
  if (!vehicle.custosPatio || !Array.isArray(vehicle.custosPatio)) return 0;
  return vehicle.custosPatio.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
}

export function computePreSaleTotalCost(vehicle: Vehicle): number {
  return computeAcquisitionCost(vehicle) + computePatioExpenses(vehicle);
}

export function computePostSaleCosts(sale: Sale): number {
  if (!sale.custosPosVenda || !Array.isArray(sale.custosPosVenda)) return 0;
  return sale.custosPosVenda.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
}

export function computeTotalSaleCost(vehicle: Vehicle, sale: Sale): number {
  const preCost = computePreSaleTotalCost(vehicle);
  const postCost = computePostSaleCosts(sale);
  const comissao = Number(sale.comissaoValor) || 0;
  return preCost + postCost + comissao;
}

export function computeNetProfit(vehicle: Vehicle, sale: Sale): number {
  const totalCost = computeTotalSaleCost(vehicle, sale);
  return (sale.valorVenda || 0) - totalCost;
}

export function computeGrossProfit(vehicle: Vehicle, sale: Sale): number {
  const preCost = computePreSaleTotalCost(vehicle);
  return (sale.valorVenda || 0) - preCost;
}

export function computeMarginPercent(revenue: number, cost: number): number {
  if (!revenue || revenue <= 0) return 0;
  const profit = revenue - cost;
  return (profit / revenue) * 100;
}
