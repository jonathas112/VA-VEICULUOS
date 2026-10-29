import { Vehicle, FormerOwner, Sale, StoreProfile } from '../types';
import { formatCurrency, formatDateLong, numberToWordsPtBr } from './formatters';

interface MergeContext {
  store: StoreProfile;
  vehicle: Vehicle;
  owner?: FormerOwner;
  sale?: Sale;
}

export interface MergeTagInfo {
  tag: string;
  label: string;
  exemplo: string;
}

export const AVAILABLE_MERGE_TAGS: MergeTagInfo[] = [
  // Loja
  { tag: '{nome_loja}', label: 'Nome da Loja', exemplo: 'VA Veículos' },
  { tag: '{razao_social_loja}', label: 'Razão Social', exemplo: 'VA Veículos Ltda' },
  { tag: '{cnpj_loja}', label: 'CNPJ da Loja', exemplo: '45.123.890/0001-72' },
  { tag: '{endereco_loja}', label: 'Endereço da Loja', exemplo: 'Rua São José, 120 - Centro, Areial - PB' },
  { tag: '{cidade_loja}', label: 'Cidade da Loja', exemplo: 'Areial' },
  { tag: '{telefone_loja}', label: 'Telefone da Loja', exemplo: '(83) 3381-1234' },
  { tag: '{whatsapp_loja}', label: 'WhatsApp da Loja', exemplo: '(83) 98765-4321' },
  
  // Veículo
  { tag: '{veiculo_marca}', label: 'Marca do Veículo', exemplo: 'Toyota' },
  { tag: '{veiculo_modelo}', label: 'Modelo do Veículo', exemplo: 'Corolla' },
  { tag: '{veiculo_versao}', label: 'Versão do Veículo', exemplo: 'XEi 2.0 Flex' },
  { tag: '{veiculo_ano}', label: 'Ano Modelo', exemplo: '2023/2024' },
  { tag: '{veiculo_cor}', label: 'Cor do Veículo', exemplo: 'Prata' },
  { tag: '{veiculo_placa}', label: 'Placa do Veículo', exemplo: 'ABC1D23' },
  { tag: '{veiculo_chassi}', label: 'Chassi do Veículo', exemplo: '9BRBL42E0P0123456' },
  { tag: '{veiculo_renavam}', label: 'RENAVAM do Veículo', exemplo: '01234567890' },
  { tag: '{veiculo_km}', label: 'KM do Veículo', exemplo: '35.000' },
  { tag: '{veiculo_combustivel}', label: 'Combustível', exemplo: 'Flex' },
  
  // Antigo Dono / Vendedor para a Loja
  { tag: '{proprietario_nome}', label: 'Nome do Antigo Dono', exemplo: 'João Pereira da Silva' },
  { tag: '{proprietario_cpf}', label: 'CPF do Antigo Dono', exemplo: '123.456.789-00' },
  { tag: '{proprietario_rg}', label: 'RG do Antigo Dono', exemplo: '1.234.567 SSP-PB' },
  { tag: '{proprietario_telefone}', label: 'Telefone do Antigo Dono', exemplo: '(83) 99123-4567' },
  { tag: '{proprietario_endereco}', label: 'Endereço do Antigo Dono', exemplo: 'Rua Central, 50 - Areial - PB' },
  { tag: '{valor_compra}', label: 'Valor Pago pela Loja (R$)', exemplo: 'R$ 85.000,00' },
  { tag: '{valor_compra_extenso}', label: 'Valor Pago por Extenso', exemplo: 'oitenta e cinco mil reais' },
  
  // Comprador
  { tag: '{comprador_nome}', label: 'Nome do Comprador', exemplo: 'Maria Fernandes de Lima' },
  { tag: '{comprador_cpf}', label: 'CPF do Comprador', exemplo: '987.654.321-99' },
  { tag: '{comprador_rg}', label: 'RG do Comprador', exemplo: '3.456.789 SSP-PB' },
  { tag: '{comprador_telefone}', label: 'Telefone do Comprador', exemplo: '(83) 99876-5432' },
  { tag: '{comprador_endereco}', label: 'Endereço do Comprador', exemplo: 'Av. Brasil, 200 - Esperança - PB' },
  { tag: '{valor_venda}', label: 'Valor da Venda (R$)', exemplo: 'R$ 95.000,00' },
  { tag: '{valor_venda_extenso}', label: 'Valor da Venda por Extenso', exemplo: 'noventa e cinco mil reais' },
  { tag: '{forma_pagamento}', label: 'Forma de Pagamento', exemplo: 'À vista via Pix' },
  { tag: '{vendedor_responsavel}', label: 'Vendedor Responsável', exemplo: 'Carlos Ramos' },
  
  // Datas e Geral
  { tag: '{data_atual}', label: 'Data Atual (DD/MM/AAAA)', exemplo: '13/10/2026' },
  { tag: '{data_extenso}', label: 'Data Atual por Extenso', exemplo: '13 de outubro de 2026' }
];

export function renderTemplate(templateContent: string, context: MergeContext): string {
  const { store, vehicle, owner, sale } = context;

  const todayStr = formatDateLong(new Date().toISOString());
  const todayShort = new Date().toLocaleDateString('pt-BR');

  let rendered = templateContent;

  const replaceTag = (tags: string[], val: string) => {
    for (const tag of tags) {
      const escaped = tag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      rendered = rendered.replace(new RegExp(escaped, 'gi'), val);
    }
  };

  // LOJA
  replaceTag(['{LOJA_NOME_FANTASIA}', '{nome_loja}'], store.nomeFantasia || 'VA Veículos');
  replaceTag(['{LOJA_RAZAO_SOCIAL}', '{razao_social_loja}'], store.razaoSocial || store.nomeFantasia);
  replaceTag(['{LOJA_CNPJ}', '{cnpj_loja}'], store.cnpj || '');
  replaceTag(['{LOJA_ENDERECO}', '{endereco_loja}'], `${store.endereco}, ${store.cidade} - ${store.estado}`);
  replaceTag(['{LOJA_TELEFONE}', '{telefone_loja}'], store.telefone || '');
  replaceTag(['{LOJA_WHATSAPP}', '{whatsapp_loja}'], store.whatsapp || '');
  replaceTag(['{CIDADE_LOJA}', '{cidade_loja}'], store.cidade || 'Areial');

  // VEICULO
  replaceTag(['{VEICULO_MARCA}', '{veiculo_marca}'], vehicle.marca || '');
  replaceTag(['{VEICULO_MODELO}', '{veiculo_modelo}'], vehicle.modelo || '');
  replaceTag(['{VEICULO_VERSAO}', '{veiculo_versao}'], vehicle.versao || '');
  replaceTag(['{VEICULO_ANO}', '{veiculo_ano}'], `${vehicle.anoFabricacao}/${vehicle.anoModelo}`);
  replaceTag(['{VEICULO_COR}', '{veiculo_cor}'], vehicle.cor || '');
  replaceTag(['{VEICULO_PLACA}', '{veiculo_placa}'], vehicle.placa || '');
  replaceTag(['{VEICULO_CHASSI}', '{veiculo_chassi}'], vehicle.chassi || '');
  replaceTag(['{VEICULO_RENAVAM}', '{veiculo_renavam}'], vehicle.renavam || '');
  replaceTag(['{VEICULO_KM}', '{veiculo_km}'], vehicle.quilometragem ? new Intl.NumberFormat('pt-BR').format(vehicle.quilometragem) : '0');
  replaceTag(['{VEICULO_COMBUSTIVEL}', '{veiculo_combustivel}'], vehicle.combustivel || 'Flex');
  replaceTag(['{CATEGORIA_COMERCIAL}', '{categoria_comercial}'], vehicle.categoriaComercial === 'repasse' ? 'REPASSE (Sem Garantia)' : 'VENDA (Com Garantia Legal)');

  // ANTIGO DONO
  if (owner) {
    replaceTag(['{DONO_NOME}', '{proprietario_nome}'], owner.nome || '');
    replaceTag(['{DONO_CPF}', '{proprietario_cpf}'], owner.cpf || '');
    replaceTag(['{DONO_RG}', '{proprietario_rg}'], owner.rg || 'Não informado');
    replaceTag(['{DONO_ENDERECO}', '{proprietario_endereco}'], `${owner.endereco}, ${owner.cidade || 'Areial'} - ${owner.estado || 'PB'}`);
    replaceTag(['{DONO_TELEFONE}', '{proprietario_telefone}'], owner.telefone || '');
  }

  // DADOS DE COMPRA
  replaceTag(['{VALOR_PAGO}', '{valor_compra}'], formatCurrency(vehicle.valorPago || 0));
  replaceTag(['{VALOR_PAGO_EXTENSO}', '{valor_compra_extenso}'], numberToWordsPtBr(vehicle.valorPago || 0));
  replaceTag(['{DATA_ENTRADA}', '{data_entrada}'], formatDateLong(vehicle.dataEntrada));
  replaceTag(['{TEM_DEBITO}', '{tem_debito}'], vehicle.debitoDetran?.temDebito ? 'SIM' : 'NÃO');
  replaceTag(['{VALOR_DEBITO}', '{valor_debito}'], formatCurrency(vehicle.debitoDetran?.valor || 0));
  
  let quemArcaTexto = 'Não há débitos';
  if (vehicle.debitoDetran?.temDebito) {
    quemArcaTexto = vehicle.debitoDetran.quemArca === 'loja' 
      ? 'A LOJA assumiu o débito e arcará com o pagamento perante o DETRAN'
      : 'O ANTIGO PROPRIETÁRIO assume a responsabilidade e quitou o débito';
  }
  replaceTag(['{QUEM_ARCA_DEBITO}'], quemArcaTexto);

  // DADOS DE VENDA
  if (sale) {
    replaceTag(['{CLIENTE_NOME}', '{comprador_nome}'], sale.clienteNome || '');
    replaceTag(['{CLIENTE_CPF}', '{comprador_cpf}'], sale.clienteCpf || '');
    replaceTag(['{CLIENTE_RG}', '{comprador_rg}'], sale.clienteRg || 'Não informado');
    replaceTag(['{CLIENTE_ENDERECO}', '{comprador_endereco}'], sale.clienteEndereco || '');
    replaceTag(['{CLIENTE_TELEFONE}', '{comprador_telefone}'], sale.clienteTelefone || '');
    replaceTag(['{VALOR_VENDA}', '{valor_venda}'], formatCurrency(sale.valorVenda || 0));
    replaceTag(['{VALOR_VENDA_EXTENSO}', '{valor_venda_extenso}'], numberToWordsPtBr(sale.valorVenda || 0));
    replaceTag(['{VENDEDOR_NOME}', '{vendedor_responsavel}'], sale.vendedorNome || '');
    replaceTag(['{DATA_VENDA}', '{data_venda}'], formatDateLong(sale.dataVenda));
    replaceTag(['{MODALIDADE_GARANTIA}'], sale.isRepasseSemGarantia ? 'Repasse sem garantia mecânica (no estado)' : 'Venda com garantia legal de 90 dias (motor e câmbio)');

    let formaPagtoTexto = 'À vista via Pix';
    if (sale.formaPagamento === 'financiamento') {
      formaPagtoTexto = `Financiamento Bancário através da instituição ${sale.financiadoraNome || 'Bancária'}`;
    } else if (sale.formaPagamento === 'cartao_credito') {
      formaPagtoTexto = 'Cartão de Crédito';
    } else if (sale.formaPagamento === 'misto') {
      formaPagtoTexto = 'Pagamento Misto (Entrada + Financiamento)';
    }
    replaceTag(['{FORMA_PAGAMENTO}', '{forma_pagamento}'], formaPagtoTexto);

    let detalhesFinanc = '';
    if (sale.formaPagamento === 'financiamento' || sale.valorFinanciado) {
      detalhesFinanc = `Entrada: ${formatCurrency(sale.valorEntrada || 0)} | Valor Financiado: ${formatCurrency(sale.valorFinanciado || 0)} em ${sale.numeroParcelas || 0} parcelas pela instituição ${sale.financiadoraNome || ''}.`;
    }
    replaceTag(['{DETALHES_FINANCIAMENTO}'], detalhesFinanc);
  }

  replaceTag(['{DATA_EXTENSO}', '{data_extenso}'], todayStr);
  replaceTag(['{DATA_ATUAL}', '{data_atual}'], todayShort);

  // Normalização e Limpeza Pós-Interpolação
  // 1. Remove qualquer duplicação de prefixo monetário (ex: "R$ R$ 85.000,00" -> "R$ 85.000,00")
  while (/R\$[\s\u00A0]*R\$/i.test(rendered)) {
    rendered = rendered.replace(/R\$[\s\u00A0]*R\$/gi, 'R$');
  }

  // 2. Normaliza espaçamentos após o símbolo monetário
  rendered = rendered.replace(/R\$[\s\u00A0]{2,}/g, 'R$ ');

  return rendered;
}
