import { Vehicle, FormerOwner, Sale, StoreProfile, UserRole } from '../types';
import { formatCurrency, formatDateLong, numberToWordsPtBr, toCents } from './formatters';
import { sanitizeContractText, sanitizeInputText } from './security';

export interface MergeContext {
  store: StoreProfile;
  vehicle: Vehicle;
  owner?: FormerOwner;
  sale?: Sale;
  userRole?: UserRole;
}

export interface MergeTagInfo {
  tag: string;
  label: string;
  exemplo: string;
}

export const AVAILABLE_MERGE_TAGS: MergeTagInfo[] = [
  // Loja
  { tag: '{LOJA_NOME_FANTASIA}', label: 'Nome Fantasia da Loja', exemplo: 'VA Veículos' },
  { tag: '{LOJA_RAZAO_SOCIAL}', label: 'Razão Social da Loja', exemplo: 'VA Veículos Multimarcas Ltda' },
  { tag: '{LOJA_CNPJ}', label: 'CNPJ da Loja', exemplo: '45.123.890/0001-72' },
  { tag: '{LOJA_ENDERECO}', label: 'Endereço Completo da Loja', exemplo: 'Rua São José, 120 - Centro, Areial - PB' },
  { tag: '{CIDADE_LOJA}', label: 'Cidade da Loja', exemplo: 'Areial' },
  { tag: '{ESTADO_LOJA}', label: 'UF da Loja', exemplo: 'PB' },
  { tag: '{LOJA_TELEFONE}', label: 'Telefone da Loja', exemplo: '(83) 3381-1234' },
  { tag: '{LOJA_WHATSAPP}', label: 'WhatsApp da Loja', exemplo: '(83) 98765-4321' },

  // Veículo
  { tag: '{VEICULO_MARCA}', label: 'Marca do Veículo', exemplo: 'Toyota' },
  { tag: '{VEICULO_MODELO}', label: 'Modelo do Veículo', exemplo: 'Corolla' },
  { tag: '{VEICULO_VERSAO}', label: 'Versão do Veículo', exemplo: 'XEi 2.0 Flex' },
  { tag: '{VEICULO_ANO}', label: 'Ano Fab./Modelo', exemplo: '2023/2024' },
  { tag: '{VEICULO_COR}', label: 'Cor do Veículo', exemplo: 'Prata' },
  { tag: '{VEICULO_PLACA}', label: 'Placa do Veículo', exemplo: 'BRA2E19' },
  { tag: '{VEICULO_CHASSI}', label: 'Chassi do Veículo', exemplo: '9BRBL42E0P0123456' },
  { tag: '{VEICULO_RENAVAM}', label: 'RENAVAM do Veículo', exemplo: '01234567890' },
  { tag: '{VEICULO_KM}', label: 'KM do Veículo', exemplo: '35.000' },
  { tag: '{VEICULO_COMBUSTIVEL}', label: 'Combustível', exemplo: 'Flex' },
  { tag: '{VEICULO_CAMBIO}', label: 'Câmbio', exemplo: 'Automático' },

  // Antigo Dono / Aquisição
  { tag: '{DONO_NOME}', label: 'Nome do Antigo Dono', exemplo: 'João Pereira da Silva' },
  { tag: '{DONO_CPF}', label: 'CPF do Antigo Dono', exemplo: '123.456.789-00' },
  { tag: '{DONO_RG}', label: 'RG do Antigo Dono', exemplo: '1.234.567 SSP-PB' },
  { tag: '{DONO_TELEFONE}', label: 'Telefone do Antigo Dono', exemplo: '(83) 99123-4567' },
  { tag: '{DONO_ENDERECO}', label: 'Endereço do Antigo Dono', exemplo: 'Rua Central, 50 - Areial - PB' },
  { tag: '{VALOR_PAGO}', label: 'Valor Pago pela Loja (R$)', exemplo: 'R$ 85.000,00' },
  { tag: '{VALOR_PAGO_EXTENSO}', label: 'Valor Pago por Extenso', exemplo: 'oitenta e cinco mil reais' },
  { tag: '{DESCRICAO_DEBITO}', label: 'Descrição de Débito DETRAN', exemplo: 'Licenciamento anual' },

  // Comprador / Venda
  { tag: '{CLIENTE_NOME}', label: 'Nome do Comprador', exemplo: 'Maria Fernandes de Lima' },
  { tag: '{CLIENTE_CPF}', label: 'CPF do Comprador', exemplo: '987.654.321-99' },
  { tag: '{CLIENTE_RG}', label: 'RG do Comprador', exemplo: '3.456.789 SSP-PB' },
  { tag: '{CLIENTE_TELEFONE}', label: 'Telefone do Comprador', exemplo: '(83) 99876-5432' },
  { tag: '{CLIENTE_ENDERECO}', label: 'Endereço do Comprador', exemplo: 'Av. Brasil, 200 - Esperança - PB' },
  { tag: '{VALOR_VENDA}', label: 'Valor da Venda (R$)', exemplo: 'R$ 95.000,00' },
  { tag: '{VALOR_VENDA_EXTENSO}', label: 'Valor da Venda por Extenso', exemplo: 'noventa e cinco mil reais' },
  { tag: '{VALOR_ENTRADA}', label: 'Valor da Entrada (R$)', exemplo: 'R$ 20.000,00' },
  { tag: '{VALOR_FINANCIADO}', label: 'Valor Financiado / Parcelado (R$)', exemplo: 'R$ 75.000,00' },
  { tag: '{VALOR_TROCA}', label: 'Valor do Veículo na Troca (R$)', exemplo: 'R$ 35.000,00' },
  { tag: '{DESCRICAO_TROCA}', label: 'Descrição do Veículo na Troca', exemplo: 'Fiat Uno 2017 Branco - Placa QFA1234' },
  { tag: '{TAXA_CARTAO}', label: 'Taxa Maquininha MDR Cartão', exemplo: '2.99% (R$ 598,00)' },
  { tag: '{FORMA_PAGAMENTO}', label: 'Forma de Pagamento', exemplo: 'À vista via Pix' },
  { tag: '{DETALHES_FINANCIAMENTO}', label: 'Composição Entrada/Parcelas', exemplo: 'Entrada: R$ 30.000,00 | Financiado: R$ 65.000,00 em 48x' },
  { tag: '{MODALIDADE_GARANTIA}', label: 'Regime de Garantia/Repasse', exemplo: 'Venda com garantia legal de 90 dias (motor e câmbio)' },
  { tag: '{VENDEDOR_NOME}', label: 'Consultor Responsável', exemplo: 'Carlos Ramos' },

  // Datas
  { tag: '{DATA_ATUAL}', label: 'Data Atual (DD/MM/AAAA)', exemplo: '02/11/2026' },
  { tag: '{DATA_EXTENSO}', label: 'Data Atual por Extenso', exemplo: '2 de novembro de 2026' }
];

// Lista consolidada de todas as tags e sinônimos reconhecidos oficialmente pelo motor
const KNOWN_MERGE_TAGS_LOWER = new Set<string>([
  '{loja_nome_fantasia}', '{nome_loja}', '{loja_nome}',
  '{loja_razao_social}', '{razao_social_loja}', '{razao_social}',
  '{loja_cnpj}', '{cnpj_loja}', '{cnpj}',
  '{loja_endereco}', '{endereco_loja}',
  '{loja_telefone}', '{telefone_loja}',
  '{loja_whatsapp}', '{whatsapp_loja}',
  '{cidade_loja}', '{loja_cidade}',
  '{estado_loja}', '{loja_estado}', '{loja_uf}', '{uf_loja}',
  '{loja_cep}', '{cep_loja}',
  '{loja_pix}', '{chave_pix}', '{pix_loja}',
  '{veiculo_marca}', '{marca}',
  '{veiculo_modelo}', '{modelo}',
  '{veiculo_versao}', '{versao}',
  '{veiculo_ano}', '{ano}', '{ano_veiculo}',
  '{veiculo_cor}', '{cor}',
  '{veiculo_placa}', '{placa}',
  '{veiculo_chassi}', '{chassi}',
  '{veiculo_renavam}', '{renavam}',
  '{veiculo_km}', '{km}', '{quilometragem}',
  '{veiculo_combustivel}', '{combustivel}',
  '{veiculo_cambio}', '{cambio}',
  '{categoria_comercial}',
  '{valor_anunciado}', '{valor_anunciado_extenso}',
  '{dono_nome}', '{proprietario_nome}', '{antigo_dono_nome}',
  '{dono_cpf}', '{proprietario_cpf}', '{antigo_dono_cpf}',
  '{dono_rg}', '{proprietario_rg}', '{antigo_dono_rg}',
  '{dono_endereco}', '{proprietario_endereco}', '{antigo_dono_endereco}',
  '{dono_telefone}', '{proprietario_telefone}', '{antigo_dono_telefone}',
  '{valor_pago}', '{valor_compra}',
  '{valor_pago_extenso}', '{valor_compra_extenso}',
  '{data_entrada}',
  '{tem_debito}',
  '{valor_debito}',
  '{descricao_debito}',
  '{quem_arca_debito}',
  '{cliente_nome}', '{nome_cliente}', '{comprador_nome}',
  '{cliente_cpf}', '{cpf_cliente}', '{comprador_cpf}',
  '{cliente_rg}', '{rg_cliente}', '{comprador_rg}',
  '{cliente_endereco}', '{endereco_cliente}', '{comprador_endereco}',
  '{cliente_telefone}', '{telefone_cliente}', '{comprador_telefone}',
  '{valor_venda}',
  '{valor_venda_extenso}',
  '{valor_entrada}',
  '{valor_financiado}',
  '{valor_troca}',
  '{descricao_troca}',
  '{taxa_cartao}',
  '{vendedor_nome}', '{vendedor_responsavel}',
  '{data_venda}',
  '{modalidade_garantia}',
  '{forma_pagamento}',
  '{detalhes_financiamento}',
  '{observacoes_venda}',
  '{data_extenso}',
  '{data_atual}'
]);

/**
 * Inspeciona um modelo bruto e retorna quaisquer tags {TAG} desconhecidas/inválidas
 * para alertar o gestor no editor de minutas antes da impressão.
 */
export function findUnknownTemplateTags(templateContent: string): string[] {
  if (!templateContent) return [];
  const matches = templateContent.match(/\{[A-Za-z0-9_]+\}/g) || [];
  const unknown = new Set<string>();
  for (const raw of matches) {
    if (!KNOWN_MERGE_TAGS_LOWER.has(raw.toLowerCase())) {
      unknown.add(raw);
    }
  }
  return Array.from(unknown);
}

/**
 * Verifica se o texto final renderizado ainda contém alguma merge tag crua ({TAG}).
 */
export function hasUnresolvedMergeTags(renderedText: string): boolean {
  if (!renderedText) return false;
  return /\{[A-Za-z0-9_]+\}/.test(renderedText);
}

export function renderTemplate(templateContent: string, context: MergeContext): string {
  const { store, vehicle, owner, sale, userRole } = context;

  const todayIso = new Date().toISOString();
  const todayStr = formatDateLong(todayIso);
  const todayShort = new Date().toLocaleDateString('pt-BR');

  // Sanitiza o corpo do modelo contra tags HTML/scripts maliciosos preservando quebras de linha
  let rendered = sanitizeContractText(templateContent || '');

  const replaceTag = (tags: string[], val: string) => {
    const safeVal = sanitizeInputText(val);
    for (const tag of tags) {
      const escaped = tag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      // Callback evita interpretação de padrões especiais de regex ($&, $$, $') no valor do comprador/veículo
      rendered = rendered.replace(new RegExp(escaped, 'gi'), () => safeVal);
    }
  };

  const cidadeLoja = store.cidade || 'Areial';
  const estadoLoja = store.estado || 'PB';

  // 1. LOJA (incluindo sinônimos curtos usados em editores de minutas)
  replaceTag(['{LOJA_NOME_FANTASIA}', '{nome_loja}', '{LOJA_NOME}'], store.nomeFantasia || 'VA Veículos');
  replaceTag(['{LOJA_RAZAO_SOCIAL}', '{razao_social_loja}', '{RAZAO_SOCIAL}'], store.razaoSocial || store.nomeFantasia || 'VA Veículos');
  replaceTag(['{LOJA_CNPJ}', '{cnpj_loja}', '{CNPJ}'], store.cnpj || 'Não informado');
  replaceTag(['{LOJA_ENDERECO}', '{endereco_loja}'], `${store.endereco || 'Centro'}, ${cidadeLoja} - ${estadoLoja}`);
  replaceTag(['{LOJA_TELEFONE}', '{telefone_loja}'], store.telefone || store.whatsapp || 'Não informado');
  replaceTag(['{LOJA_WHATSAPP}', '{whatsapp_loja}'], store.whatsapp || store.telefone || 'Não informado');
  replaceTag(['{CIDADE_LOJA}', '{cidade_loja}', '{LOJA_CIDADE}'], cidadeLoja);
  replaceTag(['{ESTADO_LOJA}', '{estado_loja}', '{LOJA_ESTADO}', '{LOJA_UF}', '{UF_LOJA}'], estadoLoja);
  replaceTag(['{LOJA_CEP}', '{cep_loja}'], store.cep || '58140-000');
  replaceTag(['{LOJA_PIX}', '{chave_pix}', '{PIX_LOJA}'], store.chavePix || store.cnpj || 'Não informado');

  // 2. VEÍCULO
  replaceTag(['{VEICULO_MARCA}', '{veiculo_marca}', '{MARCA}'], vehicle.marca || '');
  replaceTag(['{VEICULO_MODELO}', '{veiculo_modelo}', '{MODELO}'], vehicle.modelo || '');
  replaceTag(['{VEICULO_VERSAO}', '{veiculo_versao}', '{VERSAO}'], vehicle.versao || '');
  replaceTag(['{VEICULO_ANO}', '{veiculo_ano}', '{ANO}', '{ANO_VEICULO}'], `${vehicle.anoFabricacao}/${vehicle.anoModelo}`);
  replaceTag(['{VEICULO_COR}', '{veiculo_cor}', '{COR}'], vehicle.cor || 'Não informada');
  replaceTag(['{VEICULO_PLACA}', '{veiculo_placa}', '{PLACA}'], vehicle.placa || '');
  replaceTag(['{VEICULO_CHASSI}', '{veiculo_chassi}', '{CHASSI}'], vehicle.chassi || 'Não informado');
  replaceTag(['{VEICULO_RENAVAM}', '{veiculo_renavam}', '{RENAVAM}'], vehicle.renavam || 'Não informado');
  replaceTag(
    ['{VEICULO_KM}', '{veiculo_km}', '{KM}', '{QUILOMETRAGEM}'],
    typeof vehicle.quilometragem === 'number' ? new Intl.NumberFormat('pt-BR').format(vehicle.quilometragem) : '0'
  );
  replaceTag(['{VEICULO_COMBUSTIVEL}', '{veiculo_combustivel}', '{COMBUSTIVEL}'], vehicle.combustivel || 'Flex');
  replaceTag(['{VEICULO_CAMBIO}', '{veiculo_cambio}', '{CAMBIO}'], vehicle.cambio || 'Manual');
  replaceTag(
    ['{CATEGORIA_COMERCIAL}', '{categoria_comercial}'],
    vehicle.categoriaComercial === 'repasse' ? 'REPASSE COMERCIAL (Sem Garantia / No Estado)' : 'VENDA COM GARANTIA LEGAL (90 Dias CDC)'
  );
  replaceTag(['{VALOR_ANUNCIADO}', '{valor_anunciado}'], formatCurrency(vehicle.valorAnunciado || 0));
  replaceTag(['{VALOR_ANUNCIADO_EXTENSO}', '{valor_anunciado_extenso}'], numberToWordsPtBr(vehicle.valorAnunciado || 0));

  // 3. ANTIGO DONO (sempre resolvido — usa linha de preenchimento formal se não houver vínculo)
  replaceTag(
    ['{DONO_NOME}', '{proprietario_nome}', '{ANTIGO_DONO_NOME}'],
    owner?.nome?.trim() ? owner.nome : '________________________________________'
  );
  replaceTag(
    ['{DONO_CPF}', '{proprietario_cpf}', '{ANTIGO_DONO_CPF}'],
    owner?.cpf?.trim() ? owner.cpf : '___.___.___-__'
  );
  replaceTag(
    ['{DONO_RG}', '{proprietario_rg}', '{ANTIGO_DONO_RG}'],
    owner?.rg?.trim() ? owner.rg : 'Não informado'
  );
  replaceTag(
    ['{DONO_ENDERECO}', '{proprietario_endereco}', '{ANTIGO_DONO_ENDERECO}'],
    owner?.endereco?.trim()
      ? `${owner.endereco}, ${owner.cidade || cidadeLoja} - ${owner.estado || estadoLoja}`
      : '________________________________________'
  );
  replaceTag(
    ['{DONO_TELEFONE}', '{proprietario_telefone}', '{ANTIGO_DONO_TELEFONE}'],
    owner?.telefone?.trim() ? owner.telefone : '(__) _____-____'
  );

  // 4. DADOS DE COMPRA E DÉBITOS DETRAN (mascarados para perfil não-gestor)
  const canViewAcquisitionCost = !userRole || userRole === 'gestor';
  replaceTag(
    ['{VALOR_PAGO}', '{valor_compra}'],
    canViewAcquisitionCost ? formatCurrency(vehicle.valorPago || 0) : '[RESTRITO À GERÊNCIA]'
  );
  replaceTag(
    ['{VALOR_PAGO_EXTENSO}', '{valor_compra_extenso}'],
    canViewAcquisitionCost ? numberToWordsPtBr(vehicle.valorPago || 0) : 'valor restrito à gerência'
  );
  replaceTag(['{DATA_ENTRADA}', '{data_entrada}'], vehicle.dataEntrada ? formatDateLong(vehicle.dataEntrada) : todayStr);
  replaceTag(['{TEM_DEBITO}', '{tem_debito}'], vehicle.debitoDetran?.temDebito ? 'SIM' : 'NÃO');
  replaceTag(['{VALOR_DEBITO}', '{valor_debito}'], formatCurrency(vehicle.debitoDetran?.temDebito ? (vehicle.debitoDetran.valor || 0) : 0));
  replaceTag(
    ['{DESCRICAO_DEBITO}', '{descricao_debito}'],
    vehicle.debitoDetran?.temDebito && vehicle.debitoDetran.descricao?.trim()
      ? vehicle.debitoDetran.descricao
      : 'Nenhum débito pendente apontado na consulta DETRAN'
  );

  let quemArcaTexto = 'Não há débitos pendentes';
  if (vehicle.debitoDetran?.temDebito) {
    quemArcaTexto =
      vehicle.debitoDetran.quemArca === 'loja'
        ? 'A LOJA assumiu o débito e arcará integralmente com a quitação perante o DETRAN'
        : 'O ANTIGO PROPRIETÁRIO assumiu a responsabilidade pela quitação/abatimento integral do débito';
  }
  replaceTag(['{QUEM_ARCA_DEBITO}', '{quem_arca_debito}'], quemArcaTexto);

  // 5. DADOS DE VENDA E COMPRADOR (sempre resolvidos — mesmo em prévia/minuta de veículo em estoque)
  const effectiveSalePrice = sale ? (sale.valorVenda || 0) : (vehicle.valorAnunciado || 0);
  const effectiveIsRepasse = sale ? Boolean(sale.isRepasseSemGarantia) : vehicle.categoriaComercial === 'repasse';

  replaceTag(
    ['{CLIENTE_NOME}', '{NOME_CLIENTE}', '{comprador_nome}'],
    sale?.clienteNome?.trim() ? sale.clienteNome : '________________________________________'
  );
  replaceTag(
    ['{CLIENTE_CPF}', '{CPF_CLIENTE}', '{comprador_cpf}'],
    sale?.clienteCpf?.trim() ? sale.clienteCpf : '___.___.___-__'
  );
  replaceTag(
    ['{CLIENTE_RG}', '{RG_CLIENTE}', '{comprador_rg}'],
    sale?.clienteRg?.trim() ? sale.clienteRg : 'Não informado'
  );
  replaceTag(
    ['{CLIENTE_ENDERECO}', '{ENDERECO_CLIENTE}', '{comprador_endereco}'],
    sale?.clienteEndereco?.trim() ? sale.clienteEndereco : '________________________________________'
  );
  replaceTag(
    ['{CLIENTE_TELEFONE}', '{TELEFONE_CLIENTE}', '{comprador_telefone}'],
    sale?.clienteTelefone?.trim() ? sale.clienteTelefone : '(__) _____-____'
  );
  replaceTag(['{VALOR_VENDA}', '{valor_venda}'], formatCurrency(effectiveSalePrice));
  replaceTag(['{VALOR_VENDA_EXTENSO}', '{valor_venda_extenso}'], numberToWordsPtBr(effectiveSalePrice));
  replaceTag(
    ['{VENDEDOR_NOME}', '{vendedor_responsavel}'],
    sale?.vendedorNome?.trim() ? sale.vendedorNome : `${store.nomeFantasia || 'VA Veículos'} — Equipe Comercial`
  );
  replaceTag(['{DATA_VENDA}', '{data_venda}'], sale?.dataVenda ? formatDateLong(sale.dataVenda) : todayStr);
  replaceTag(
    ['{MODALIDADE_GARANTIA}', '{modalidade_garantia}'],
    effectiveIsRepasse
      ? 'Repasse Comercial sem garantia mecânica (vendido no estado em que se encontra)'
      : 'Venda com Garantia Legal de 90 dias para motor e câmbio (Art. 26, II do CDC)'
  );
  replaceTag(
    ['{OBSERVACOES_VENDA}', '{observacoes_venda}'],
    sale?.observacoes?.trim() ? sale.observacoes : 'Sem observações adicionais.'
  );

  let formaPagtoTexto = 'A definir no ato do fechamento';
  let detalhesFinanc = '';

  if (sale) {
    if (sale.formaPagamento === 'financiamento') {
      formaPagtoTexto = `Financiamento Bancário através da instituição ${sale.financiadoraNome || 'Financeira Credenciada'}`;
      detalhesFinanc = `Composição: Entrada de ${formatCurrency(sale.valorEntrada || 0)} + Saldo Financiado de ${formatCurrency(sale.valorFinanciado || 0)} em ${sale.numeroParcelas || 1}x pela instituição ${sale.financiadoraNome || 'Financeira Credenciada'}.`;
    } else if (sale.formaPagamento === 'misto') {
      formaPagtoTexto = `Pagamento Misto (Entrada à Vista + Financiamento pela instituição ${sale.financiadoraNome || 'Financeira Credenciada'})`;
      detalhesFinanc = `Composição: Entrada à Vista de ${formatCurrency(sale.valorEntrada || 0)} + Saldo Financiado de ${formatCurrency(sale.valorFinanciado || 0)} em ${sale.numeroParcelas || 1}x pela instituição ${sale.financiadoraNome || 'Financeira Credenciada'}.`;
    } else if (sale.formaPagamento === 'cartao_credito') {
      formaPagtoTexto =
        sale.numeroParcelas && sale.numeroParcelas > 1
          ? `Cartão de Crédito em ${sale.numeroParcelas}x`
          : 'Cartão de Crédito à vista (1x)';
      if (sale.valorEntrada && sale.valorEntrada > 0) {
        detalhesFinanc = `Composição: Entrada à Vista de ${formatCurrency(sale.valorEntrada)} + Saldo no Cartão de Crédito de ${formatCurrency(sale.valorFinanciado || 0)} parcelado em ${sale.numeroParcelas || 1}x.`;
      } else {
        detalhesFinanc = `Composição: Pagamento integral no Cartão de Crédito no valor de ${formatCurrency(sale.valorVenda || 0)} em ${sale.numeroParcelas || 1}x.`;
      }
    } else if (sale.formaPagamento === 'troca') {
      formaPagtoTexto = `Troca com Torna (Veículo Usado Dado em Troca + Quitação de Saldo)`;
      detalhesFinanc = `Composição: Veículo Usado na Troca (${sale.veiculoTrocaDescricao || 'Descrição a fixar'}) avaliado em ${formatCurrency(sale.veiculoTrocaValor || 0)}${toCents(sale.valorEntrada || 0) > 0 ? ` + Entrada Complementar de ${formatCurrency(sale.valorEntrada || 0)}` : ''}${toCents(sale.valorFinanciado || 0) > 0 ? ` + Saldo Financiado de ${formatCurrency(sale.valorFinanciado || 0)} em ${sale.numeroParcelas || 1}x por ${sale.financiadoraNome || 'Instituição Bancária'}` : ''}.`;
    } else {
      formaPagtoTexto = 'À vista via Pix / Transferência Bancária';
      detalhesFinanc = '';
    }
  }

  replaceTag(['{VALOR_ENTRADA}', '{valor_entrada}'], formatCurrency(sale?.valorEntrada || 0));
  replaceTag(['{VALOR_FINANCIADO}', '{valor_financiado}'], formatCurrency(sale?.valorFinanciado || 0));
  replaceTag(['{VALOR_TROCA}', '{valor_troca}'], formatCurrency(sale?.veiculoTrocaValor || 0));
  replaceTag(['{DESCRICAO_TROCA}', '{descricao_troca}'], sale?.veiculoTrocaDescricao || 'Nenhum veículo recebido na troca');
  replaceTag(
    ['{TAXA_CARTAO}', '{taxa_cartao}'],
    sale?.taxaCartaoPercentual
      ? `${sale.taxaCartaoPercentual}% (${formatCurrency(sale.taxaCartaoValor || 0)})`
      : 'Não aplicável'
  );
  replaceTag(['{FORMA_PAGAMENTO}', '{forma_pagamento}'], formaPagtoTexto);
  replaceTag(['{DETALHES_FINANCIAMENTO}', '{detalhes_financiamento}'], detalhesFinanc);

  // 6. DATAS GERAIS
  replaceTag(['{DATA_EXTENSO}', '{data_extenso}'], todayStr);
  replaceTag(['{DATA_ATUAL}', '{data_atual}'], todayShort);

  // 7. BLINDAGEM FINAL ANTI-TAG-CRUA & HIGIENIZAÇÃO TIPOGRÁFICA
  // Caso o usuário tenha digitado alguma tag customizada inexistente {TAG_QUALQUER}, substitui por traço formal de preenchimento
  rendered = rendered.replace(/\{[A-Za-z0-9_]+\}/g, '________________________');

  // Remove duplicação acidental de prefixo monetário (ex: "R$ R$ 85.000,00" -> "R$ 85.000,00")
  while (/R\$[\s\u00A0]*R\$/i.test(rendered)) {
    rendered = rendered.replace(/R\$[\s\u00A0]*R\$/gi, 'R$');
  }
  rendered = rendered.replace(/R\$[\s\u00A0]{2,}/g, 'R$ ');

  // Remove linhas em branco excedentes deixadas por tags opcionais vazias (ex: {DETALHES_FINANCIAMENTO} em venda Pix)
  rendered = rendered
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return rendered;
}
