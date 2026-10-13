import { FormerOwner, Vehicle, Sale, Financier, Salesperson, StoreProfile } from '../types';

export const SEED_STORE: StoreProfile = {
  nomeFantasia: 'VA Veículos',
  razaoSocial: 'VA Veículos Comércio de Veículos Ltda',
  cnpj: '45.123.890/0001-72',
  telefone: '(83) 3381-1234',
  whatsapp: '(83) 98765-4321',
  endereco: 'Rua São José, 120 - Centro',
  cidade: 'Areial',
  estado: 'PB',
  cep: '58140-000',
  chavePix: 'financeiro@vaveiculos.com.br',
  site: 'www.vaveiculos.com.br',
  logoUrl: '',
  papelTimbrado: {
    logoHeightPx: 64,
    logoAlignment: 'center',
    headerAlignment: 'center',
    marginTopMm: 15,
    marginBottomMm: 15,
    marginLeftMm: 20,
    marginRightMm: 20,
    fontSizePt: 10,
    fontFamily: 'Inter, sans-serif',
    mostrarCnpj: true,
    mostrarEndereco: true,
    mostrarTelefones: true,
    mostrarLinhasAssinatura: true,
    textoRodape: 'VA Veículos · Areial - PB · Rua São José, 120 - Centro · WhatsApp: (83) 98765-4321'
  }
};

export const SEED_FINANCIERS: Financier[] = [
  { id: 'fin_santander', nome: 'Santander Financiamentos', contatoGerente: 'Patrícia Rocha', telefone: '(83) 99812-3456', taxaMedia: 1.49, ativa: true },
  { id: 'fin_bv', nome: 'BV Financeira (Banco Votorantim)', contatoGerente: 'Marcelo Vieira', telefone: '(83) 98723-4567', taxaMedia: 1.55, ativa: true },
  { id: 'fin_itau', nome: 'Itaú Veículos', contatoGerente: 'Clara Meirelles', telefone: '(83) 97634-5678', taxaMedia: 1.45, ativa: true },
  { id: 'fin_pan', nome: 'Banco PAN Financiamentos', contatoGerente: 'Felipe Dantas', telefone: '(83) 96545-6789', taxaMedia: 1.62, ativa: true },
  { id: 'fin_bradesco', nome: 'Bradesco Financiamentos', contatoGerente: 'Renata Lins', telefone: '(83) 95456-7890', taxaMedia: 1.50, ativa: true },
  { id: 'fin_safra', nome: 'Banco Safra Auto', contatoGerente: 'Eduardo Guimarães', telefone: '(83) 94367-8901', taxaMedia: 1.39, ativa: true }
];

export const SEED_SALESPEOPLE: Salesperson[] = [
  { id: 'vend_carlos', nome: 'Carlos Eduardo Ramos', email: 'carlos@vaveiculos.com.br', telefone: '(83) 98111-2233', metaMensal: 5, ativo: true },
  { id: 'vend_juliana', nome: 'Juliana Mendes Costa', email: 'juliana@vaveiculos.com.br', telefone: '(83) 98222-3344', metaMensal: 6, ativo: true },
  { id: 'vend_roberto', nome: 'Roberto Silveira Neto', email: 'roberto@vaveiculos.com.br', telefone: '(83) 98333-4455', metaMensal: 4, ativo: true }
];

export const SEED_OWNERS: FormerOwner[] = [
  {
    id: 'owner_marcos',
    nome: 'Marcos Vinícius Fagundes',
    cpf: '284.910.438-12',
    telefone: '(11) 97123-8899',
    endereco: 'Rua Bela Cintra, 1420, Apto 82 - Consolação',
    cidade: 'São Paulo',
    estado: 'SP',
    observacoes: 'Cliente frotista, sempre troca de veículo a cada 2 anos.',
    criadoEm: '2026-06-10T10:30:00Z'
  },
  {
    id: 'owner_alessandra',
    nome: 'Alessandra Monteiro Prado',
    cpf: '159.348.720-94',
    telefone: '(11) 98987-1122',
    endereco: 'Av. Rouxinol, 560, Casa 3 - Moema',
    cidade: 'São Paulo',
    estado: 'SP',
    observacoes: 'Vendeu o Corolla para aquisição de imóvel.',
    criadoEm: '2026-07-05T14:15:00Z'
  },
  {
    id: 'owner_lucas',
    nome: 'Lucas Penteado Nogueira',
    cpf: '334.821.902-61',
    telefone: '(11) 99456-3344',
    endereco: 'Rua Harmonia, 890 - Vila Madalena',
    cidade: 'São Paulo',
    estado: 'SP',
    observacoes: 'Proprietário original de moto de alta cilindrada.',
    criadoEm: '2026-08-01T11:00:00Z'
  },
  {
    id: 'owner_renata',
    nome: 'Renata Guimarães Fontes',
    cpf: '412.783.560-88',
    telefone: '(11) 97788-9900',
    endereco: 'Alameda Lorena, 1850 - Jardins',
    cidade: 'São Paulo',
    estado: 'SP',
    observacoes: 'Médica, cuidava muito bem dos carros em garagem coberta.',
    criadoEm: '2026-08-15T16:20:00Z'
  }
];

export const SEED_VEHICLES: Vehicle[] = [
  {
    id: 'veh_bmw320i',
    tipo: 'carro',
    marca: 'BMW',
    modelo: '320i',
    versao: 'M Sport 2.0 Turbo ActiveFlex Aut.',
    anoFabricacao: 2022,
    anoModelo: 2023,
    cor: 'Branco Alpino',
    combustivel: 'Flex',
    cambio: 'Automático',
    quilometragem: 28500,
    placa: 'BRA-3E20',
    chassi: 'WBA5R1109NFP89234',
    renavam: '01293847561',
    categoriaComercial: 'venda',
    status: 'em_estoque',
    fotos: [
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'
    ],
    antigoDonoId: 'owner_marcos',
    dataEntrada: '2026-08-20T10:00:00Z',
    valorPago: 245000,
    debitoDetran: {
      temDebito: true,
      valor: 3200,
      quemArca: 'loja',
      descricao: 'IPVA proporcional e taxa de licenciamento 2026'
    },
    reciboCompraGerado: true,
    modeloReciboCompraId: 'recibo_compra_veiculo',
    valorAnunciado: 278900,
    descricaoDestaques: [
      'Pacote M Sport Completo',
      'Teto solar elétrico',
      'Sistema de som Harman Kardon',
      'Faróis Full LED Laser',
      'Laudo Cautelar 100% Aprovado'
    ],
    custosPatio: [
      { id: 'exp_bmw_1', data: '2026-08-22', categoria: 'lavagem_estetica', descricao: 'Polimento técnico e vitrificação cerâmica', valor: 1400 },
      { id: 'exp_bmw_2', data: '2026-08-25', categoria: 'despachante_doc', descricao: 'Emissão de ATPV-e e taxa de vistoria', valor: 450 }
    ]
  },
  {
    id: 'veh_compass',
    tipo: 'carro',
    marca: 'Jeep',
    modelo: 'Compass',
    versao: 'Longitude 1.3 T270 Turbo Flex Aut.',
    anoFabricacao: 2023,
    anoModelo: 2023,
    cor: 'Cinza Granite',
    combustivel: 'Flex',
    cambio: 'Automático',
    quilometragem: 34000,
    placa: 'JEP-7F89',
    chassi: '988651239PJD78120',
    renavam: '00987654321',
    categoriaComercial: 'venda',
    status: 'em_estoque',
    fotos: [
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'
    ],
    antigoDonoId: 'owner_renata',
    dataEntrada: '2026-08-28T14:30:00Z',
    valorPago: 132000,
    debitoDetran: {
      temDebito: false,
      valor: 0,
      quemArca: 'nenhum'
    },
    reciboCompraGerado: true,
    modeloReciboCompraId: 'recibo_compra_veiculo',
    valorAnunciado: 149900,
    descricaoDestaques: [
      'Central multimídia 10.1 com Apple CarPlay sem fio',
      'Bancos em couro marrom caramelo',
      'Painel 100% digital',
      'Única dona, revisões preventivas em dia'
    ],
    custosPatio: [
      { id: 'exp_cmp_1', data: '2026-08-30', categoria: 'mecanica', descricao: 'Revisão preventiva: troca de óleo e filtros', valor: 680 },
      { id: 'exp_cmp_2', data: '2026-09-01', categoria: 'lavagem_estetica', descricao: 'Higienização de interiores e couro', valor: 350 }
    ]
  },
  {
    id: 'veh_corolla_repasse',
    tipo: 'carro',
    marca: 'Toyota',
    modelo: 'Corolla',
    versao: 'GLi 1.8 16V Aut. (Veículo de Repasse)',
    anoFabricacao: 2017,
    anoModelo: 2018,
    cor: 'Prata Metálico',
    combustivel: 'Flex',
    cambio: 'CVT',
    quilometragem: 142000,
    placa: 'FGH-4190',
    chassi: '9BRBL42E0J8034512',
    renavam: '00765432189',
    categoriaComercial: 'repasse',
    status: 'em_estoque',
    fotos: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1200&q=80'
    ],
    antigoDonoId: 'owner_alessandra',
    dataEntrada: '2026-09-02T11:00:00Z',
    valorPago: 68000,
    debitoDetran: {
      temDebito: true,
      valor: 1800,
      quemArca: 'antigo_dono',
      descricao: '2 multas municipais de velocidade (descontadas do antigo dono)'
    },
    reciboCompraGerado: true,
    modeloReciboCompraId: 'recibo_compra_veiculo',
    valorAnunciado: 74900,
    descricaoDestaques: [
      'OPORTUNIDADE DE REPASSE (Vendido no estado)',
      'Preço abaixo da FIPE (FIPE: R$ 83.500)',
      'Mecânica funcionando perfeitamente',
      'Pequenos detalhes estéticos na porta traseira'
    ],
    custosPatio: [
      { id: 'exp_cor_1', data: '2026-09-03', categoria: 'lavagem_estetica', descricao: 'Lavagem simples e aspiração', valor: 120 }
    ]
  },
  {
    id: 'veh_yamaha_mt07',
    tipo: 'moto',
    marca: 'Yamaha',
    modelo: 'MT-07',
    versao: 'ABS 689cc DOHC',
    anoFabricacao: 2023,
    anoModelo: 2024,
    cor: 'Ice Fluo (Cinza Fosco c/ Vermelho)',
    combustivel: 'Gasolina',
    cambio: 'Manual',
    quilometragem: 8900,
    placa: 'MTO-7A24',
    chassi: '9C6RJ2730P0019283',
    renavam: '01384719283',
    categoriaComercial: 'venda',
    status: 'em_estoque',
    fotos: [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80'
    ],
    antigoDonoId: 'owner_lucas',
    dataEntrada: '2026-09-04T09:15:00Z',
    valorPago: 39500,
    debitoDetran: {
      temDebito: false,
      valor: 0,
      quemArca: 'nenhum'
    },
    reciboCompraGerado: true,
    modeloReciboCompraId: 'recibo_compra_veiculo',
    valorAnunciado: 44900,
    descricaoDestaques: [
      'Escapamento original + esportivo Jeskap guardado',
      'Slider lateral de proteção',
      'Pneus Pirelli Diablo Rosso novos',
      'Manual e chave vermelha codificada'
    ],
    custosPatio: [
      { id: 'exp_mt_1', data: '2026-09-05', categoria: 'lavagem_estetica', descricao: 'Detalhamento moto e lubrificação de corrente', valor: 200 }
    ]
  },
  {
    id: 'veh_civic_touring',
    tipo: 'carro',
    marca: 'Honda',
    modelo: 'Civic',
    versao: 'Touring 1.5 Turbo 16V Aut.',
    anoFabricacao: 2021,
    anoModelo: 2021,
    cor: 'Preto Cristal',
    combustivel: 'Gasolina',
    cambio: 'CVT',
    quilometragem: 46000,
    placa: 'HND-5T21',
    chassi: '93HFC1640MZ102938',
    renavam: '00654321908',
    categoriaComercial: 'venda',
    status: 'vendido',
    fotos: [
      'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1200&q=80'
    ],
    antigoDonoId: 'owner_marcos',
    dataEntrada: '2026-07-10T11:00:00Z',
    valorPago: 130000,
    debitoDetran: {
      temDebito: true,
      valor: 1500,
      quemArca: 'loja',
      descricao: 'Licenciamento anual'
    },
    reciboCompraGerado: true,
    modeloReciboCompraId: 'recibo_compra_veiculo',
    valorAnunciado: 147000,
    custosPatio: [
      { id: 'exp_civ_1', data: '2026-07-12', categoria: 'mecanica', descricao: 'Alinhamento, balanceamento e pastilhas de freio', valor: 900 },
      { id: 'exp_civ_2', data: '2026-07-15', categoria: 'lavagem_estetica', descricao: 'Higienização e polimento', valor: 450 }
    ]
  },
  {
    id: 'veh_tcross',
    tipo: 'carro',
    marca: 'Volkswagen',
    modelo: 'T-Cross',
    versao: 'Highline 250 TSI 1.4 Flex Aut.',
    anoFabricacao: 2022,
    anoModelo: 2022,
    cor: 'Azul Norway',
    combustivel: 'Flex',
    cambio: 'Automático',
    quilometragem: 38000,
    placa: 'TCX-9G22',
    chassi: '9BWDB4BF8NP038291',
    renavam: '00891234567',
    categoriaComercial: 'venda',
    status: 'vendido',
    fotos: [
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80'
    ],
    antigoDonoId: 'owner_renata',
    dataEntrada: '2026-08-01T08:30:00Z',
    valorPago: 108000,
    debitoDetran: {
      temDebito: false,
      valor: 0,
      quemArca: 'nenhum'
    },
    reciboCompraGerado: true,
    valorAnunciado: 124900,
    custosPatio: [
      { id: 'exp_tc_1', data: '2026-08-03', categoria: 'lavagem_estetica', descricao: 'Lavagem completa', valor: 180 }
    ]
  },
  {
    id: 'veh_onix_repasse',
    tipo: 'carro',
    marca: 'Chevrolet',
    modelo: 'Onix Plus',
    versao: 'Premier 1.0 Turbo Flex Aut.',
    anoFabricacao: 2021,
    anoModelo: 2021,
    cor: 'Vermelho Carmim',
    combustivel: 'Flex',
    cambio: 'Automático',
    quilometragem: 79000,
    placa: 'ONX-1P21',
    chassi: '9BGKS69L0MG129482',
    renavam: '00781293845',
    categoriaComercial: 'repasse',
    status: 'vendido',
    fotos: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80'
    ],
    antigoDonoId: 'owner_alessandra',
    dataEntrada: '2026-08-10T14:00:00Z',
    valorPago: 62000,
    debitoDetran: {
      temDebito: false,
      valor: 0,
      quemArca: 'nenhum'
    },
    reciboCompraGerado: true,
    valorAnunciado: 69900,
    custosPatio: [
      { id: 'exp_onx_1', data: '2026-08-11', categoria: 'lavagem_estetica', descricao: 'Lavagem de pátio', valor: 100 }
    ]
  }
];

export const SEED_SALES: Sale[] = [
  {
    id: 'sale_civic_01',
    veiculoId: 'veh_civic_touring',
    dataVenda: '2026-07-28T16:00:00Z',
    clienteNome: 'Dr. Fernando Siqueira Gomes',
    clienteCpf: '312.456.789-01',
    clienteTelefone: '(11) 98123-4567',
    clienteEndereco: 'Rua Oscar Freire, 920 - Cerqueira César, São Paulo - SP',
    vendedorId: 'vend_carlos',
    vendedorNome: 'Carlos Eduardo Ramos',
    valorVenda: 145000,
    formaPagamento: 'financiamento',
    financiadoraId: 'fin_santander',
    financiadoraNome: 'Santander Financiamentos',
    valorEntrada: 45000,
    valorFinanciado: 100000,
    numeroParcelas: 48,
    tipoContratoId: 'contrato_garantia_padrao',
    tipoContratoNome: 'Contrato de Compra e Venda com Garantia Legal (90 Dias)',
    isRepasseSemGarantia: false,
    comissaoValor: 1800,
    comissaoPendente: false,
    comissaoDefinidaPor: 'Gestor Geral',
    dataDefinicaoComissao: '2026-07-28T17:00:00Z',
    custosPosVenda: [
      {
        id: 'post_civ_1',
        data: '2026-08-14',
        tipo: 'garantia_eletrica',
        descricao: 'Acionamento de garantia: sensor de estacionamento dianteiro apresentou falha e foi substituído',
        valor: 650,
        oficinaParceira: 'AutoCenter Paulista'
      }
    ],
    observacoes: 'Cliente financiou 100 mil pelo Santander com taxa de 1.49% a.m.'
  },
  {
    id: 'sale_onix_02',
    veiculoId: 'veh_onix_repasse',
    dataVenda: '2026-08-25T11:30:00Z',
    clienteNome: 'Thiago de Carvalho Meira',
    clienteCpf: '409.812.394-55',
    clienteTelefone: '(11) 99345-6789',
    clienteEndereco: 'Av. Paulista, 1754 - Bela Vista, São Paulo - SP',
    vendedorId: 'vend_juliana',
    vendedorNome: 'Juliana Mendes Costa',
    valorVenda: 68500,
    formaPagamento: 'a_vista_pix',
    tipoContratoId: 'contrato_repasse_sem_garantia',
    tipoContratoNome: 'Contrato de Repasse de Veículo (Vendido no Estado / Sem Garantia)',
    isRepasseSemGarantia: true,
    comissaoValor: 1200,
    comissaoPendente: false,
    comissaoDefinidaPor: 'Gestor Geral',
    dataDefinicaoComissao: '2026-08-25T14:00:00Z',
    custosPosVenda: [],
    observacoes: 'Veículo vendido como repasse no estado, sem garantia legal de acordo com contrato firmado.'
  },
  {
    id: 'sale_tcross_03',
    veiculoId: 'veh_tcross',
    dataVenda: '2026-09-08T15:00:00Z',
    clienteNome: 'Mariana Duarte Vianna',
    clienteCpf: '221.789.340-99',
    clienteTelefone: '(11) 97456-1234',
    clienteEndereco: 'Rua Haddock Lobo, 400 - Cerqueira César, São Paulo - SP',
    vendedorId: 'vend_roberto',
    vendedorNome: 'Roberto Silveira Neto',
    valorVenda: 122000,
    formaPagamento: 'financiamento',
    financiadoraId: 'fin_itau',
    financiadoraNome: 'Itaú Veículos',
    valorEntrada: 50000,
    valorFinanciado: 72000,
    numeroParcelas: 36,
    tipoContratoId: 'contrato_garantia_padrao',
    tipoContratoNome: 'Contrato de Compra e Venda com Garantia Legal (90 Dias)',
    isRepasseSemGarantia: false,
    comissaoValor: 0,
    comissaoPendente: true, // PENDENTE DE APROVAÇÃO DO GESTOR!
    custosPosVenda: [],
    observacoes: 'Venda realizada pelo vendedor Roberto. Aguardando definição de comissão pelo Gestor.'
  }
];
