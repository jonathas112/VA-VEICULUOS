export type VehicleType = 'carro' | 'moto';

export type CommercialCategory = 'venda' | 'repasse'; // repasse = sem garantia / no estado

export type VehicleStatus = 'em_estoque' | 'vendido' | 'reservado';

export interface FormerOwner {
  id: string;
  nome: string;
  cpf: string;
  rg?: string;
  telefone: string;
  endereco: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
  criadoEm?: string;
  dataCadastro?: string;
}

export interface DetranDebt {
  temDebito: boolean;
  valor: number;
  quemArca: 'loja' | 'antigo_dono' | 'nenhum';
  descricao?: string;
}

export interface VehicleExpense {
  id: string;
  data: string;
  categoria: 'mecanica' | 'funilaria_pintura' | 'lavagem_estetica' | 'despachante_doc' | 'pneus' | 'pecas' | 'outro';
  descricao: string;
  valor: number;
  responsavel?: string;
}

export interface PostSaleCost {
  id: string;
  data: string;
  tipo: 'garantia_motor_cambio' | 'garantia_eletrica' | 'guincho' | 'cortesia' | 'outro';
  descricao: string;
  valor: number;
  oficinaParceira?: string;
}

export interface Vehicle {
  id: string;
  tipo: VehicleType;
  marca: string;
  modelo: string;
  versao: string;
  anoFabricacao: number;
  anoModelo: number;
  cor: string;
  combustivel: 'Flex' | 'Gasolina' | 'Etanol' | 'Diesel' | 'Híbrido' | 'Elétrico';
  cambio: 'Automático' | 'Manual' | 'CVT' | 'Automatizado';
  quilometragem: number;
  placa: string;
  chassi: string;
  renavam: string;
  categoriaComercial: CommercialCategory;
  status: VehicleStatus;
  
  // Imagens (até 10 fotos)
  fotos: string[];
  
  // Aquisição
  antigoDonoId: string;
  dataEntrada: string;
  cadastradoPor?: string; // Vendedor ou gestor que deu entrada
  valorPago: number; // Preço pago pela loja ao antigo dono
  debitoDetran: DetranDebt;
  reciboCompraGerado: boolean;
  modeloReciboCompraId?: string;
  
  // Preço Anunciado
  valorAnunciado: number;
  descricaoDestaques?: string[];
  dataVenda?: string;
  
  // Custos acumulados de pátio / preparação
  custosPatio: VehicleExpense[];
}

export type PaymentMethod = 'a_vista_pix' | 'financiamento' | 'cartao_credito' | 'misto';

export interface Sale {
  id: string;
  veiculoId: string;
  dataVenda: string;
  
  // Comprador
  clienteNome: string;
  clienteCpf: string;
  clienteRg?: string;
  clienteTelefone: string;
  clienteEndereco: string;
  clienteCidade?: string;
  clienteEstado?: string;
  clienteCep?: string;
  
  // Vendedor
  vendedorId: string;
  vendedorNome: string;
  
  // Condições financeiras
  valorVenda: number;
  formaPagamento: PaymentMethod;
  
  // Financiamento (se houver)
  financiadoraId?: string;
  financiadoraNome?: string;
  valorEntrada?: number;
  valorFinanciado?: number;
  numeroParcelas?: number;
  
  // Garantia e Contrato
  tipoContratoId: string;
  tipoContratoNome: string;
  isRepasseSemGarantia: boolean;
  
  // Comissão
  comissaoValor: number;
  comissaoPendente: boolean;
  comissaoDefinidaPor?: string;
  dataDefinicaoComissao?: string;
  
  // Custos pós-venda
  custosPosVenda: PostSaleCost[];
  
  observacoes?: string;
}

export interface Financier {
  id: string;
  nome: string;
  contatoGerente?: string;
  contato?: string;
  telefone?: string;
  taxaMedia?: number;
  ativa?: boolean;
  ativo?: boolean;
}

export interface ContractTemplate {
  id: string;
  titulo: string;
  tipo: 'garantia' | 'repasse' | 'financiamento' | 'recibo_compra' | 'recibo_venda';
  conteudo: string;
  descricao: string;
  cabecalhoPersonalizado?: string;
  rodapePersonalizado?: string;
}

export interface Salesperson {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  metaMensal?: number;
  ativo: boolean;
  dataContratacao?: string;
  senha?: string;
}

export type UserRole = 'gestor' | 'vendedor';

export interface SystemUser {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  papel: UserRole;
  senha: string; // PIN ou senha
  ativo: boolean;
  metaMensal?: number;
  dataCriacao: string;
  ultimoAcesso?: string;
}

export interface LetterheadConfig {
  logoUrl?: string;
  logoHeightPx: number;
  logoAlignment: 'left' | 'center' | 'right';
  headerAlignment: 'left' | 'center' | 'right';
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  fontSizePt: number;
  fontFamily: string;
  mostrarCnpj: boolean;
  mostrarEndereco: boolean;
  mostrarTelefones: boolean;
  mostrarLinhasAssinatura: boolean;
  textoRodape?: string;
}

export interface StoreProfile {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  telefone: string;
  whatsapp: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep?: string;
  chavePix: string;
  site: string;
  logoUrl?: string;
  papelTimbrado?: LetterheadConfig;
}

export interface FinancialSummary {
  faturamentoBruto: number;
  custoAquisicaoTotal: number;
  debitosDetranLojaTotal: number;
  custosPatioTotal: number;
  custosPosVendaTotal: number;
  comissoesTotal: number;
  custoGeralTotal: number;
  lucroLiquidoTotal: number;
  margemLucroMedia: number;
  quantidadeVendas: number;
  ticketMedio: number;
}

// AUDIT TRAIL / LOG GERAL
export type AuditActionType =
  | 'ENTRADA_VEICULO'
  | 'EDICAO_VEICULO'
  | 'DESPESA_PATIO'
  | 'VENDA_VEICULO'
  | 'DEFINICAO_COMISSAO'
  | 'CADASTRO_PESSOA'
  | 'EDICAO_PESSOA'
  | 'EDICAO_CONFIGURACOES'
  | 'EDICAO_CONTRATO'
  | 'EXCLUSAO_VEICULO'
  | 'CRIACAO_USUARIO'
  | 'EDICAO_USUARIO'
  | 'EXCLUSAO_USUARIO'
  | 'LOGIN_SISTEMA'
  | 'LOGOUT_SISTEMA'
  | 'SINCRONIZACAO_FIREBASE';

export interface AuditLog {
  id: string;
  timestamp: string;
  usuarioId?: string;
  usuarioNome: string;
  usuarioPapel: string;
  acao: AuditActionType;
  categoria: 'veiculo' | 'venda' | 'pessoa' | 'financeiro' | 'sistema' | 'documento';
  descricao: string;
  detalhes?: Record<string, any>;
}
