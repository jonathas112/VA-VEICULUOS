import { ContractTemplate } from '../types';

export const DEFAULT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'contrato_garantia_padrao',
    titulo: 'Contrato de Compra e Venda com Garantia Legal (90 Dias)',
    tipo: 'garantia',
    descricao: 'Modelo oficial para venda de veículos revisados com garantia legal de 90 dias (motor e câmbio) nos termos do Art. 26 do CDC.',
    conteudo: `INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR COM GARANTIA LEGAL (CDC)

1. VENDEDORA:
{LOJA_RAZAO_SOCIAL} ({LOJA_NOME_FANTASIA}), pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {LOJA_CNPJ}, estabelecida em {LOJA_ENDERECO}, telefone {LOJA_TELEFONE} e WhatsApp {LOJA_WHATSAPP}.

2. COMPRADOR(A):
Nome: {CLIENTE_NOME} | CPF: {CLIENTE_CPF} | RG: {CLIENTE_RG}
Endereço: {CLIENTE_ENDERECO} | Telefone/WhatsApp: {CLIENTE_TELEFONE}

3. DO OBJETO:
Pelo presente instrumento, a VENDEDORA vende e entrega ao(à) COMPRADOR(A) o veículo automotor seminovo/usado abaixo especificado:
Veículo: {VEICULO_MARCA} {VEICULO_MODELO} {VEICULO_VERSAO}
Ano Fab./Mod.: {VEICULO_ANO} | Cor: {VEICULO_COR} | Combustível: {VEICULO_COMBUSTIVEL} | Câmbio: {VEICULO_CAMBIO}
Placa: {VEICULO_PLACA} | RENAVAM: {VEICULO_RENAVAM} | Chassi: {VEICULO_CHASSI}
Quilometragem registrada no hodômetro na entrega: {VEICULO_KM} km

4. DO PREÇO E DA FORMA DE PAGAMENTO:
O preço certo e ajustado para a presente compra e venda é de {VALOR_VENDA} ({VALOR_VENDA_EXTENSO}), liquidado mediante a seguinte condição:
Forma de Pagamento: {FORMA_PAGAMENTO}
{DETALHES_FINANCIAMENTO}

5. DA GARANTIA LEGAL DE 90 DIAS (ART. 26, II DO CDC — MOTOR E CÂMBIO):
A VENDEDORA assegura ao(à) COMPRADOR(A) a garantia legal pelo prazo improrrogável de 90 (noventa) dias corridos, contados da data efetiva de entrega do veículo ({DATA_VENDA}), restrita aos componentes internos lubrificados de MOTOR e CAIXA DE CÂMBIO, em conformidade com o Art. 26, inciso II e § 1º da Lei nº 8.078/1990 (Código de Defesa do Consumidor).
5.1. Tratando-se de veículo usado, não se enquadram como vício coberto itens sujeitos a desgaste natural pelo uso e quilometragem ({VEICULO_KM} km), tais como: pneus, pastilhas e discos de freio, kit de embreagem, suspensão, amortecedores, buchas, bateria, correias, filtros, fluidos, velas, lâmpadas, estofamento e pintura.
5.2. Cessa imediatamente a garantia em caso de superaquecimento por falta de líquido de arrefecimento ou óleo lubrificante, mau uso, sinistro, competição, alagamento ou desmontagem/reparo por terceiros sem prévia vistoria técnica e autorização formal da VENDEDORA.

6. DA TRANSFERÊNCIA JUNTO AO DETRAN E RESPONSABILIDADE (ARTS. 123 E 134 DO CTB):
O(A) COMPRADOR(A) obriga-se a efetivar a transferência de propriedade perante o DETRAN no prazo legal de 30 (trinta) dias (Art. 123, § 1º da Lei nº 9.503/1997), assumindo a partir da tradição das chaves integral responsabilidade civil, criminal, administrativa, tributária, multas e pontuação de trânsito incidentes sobre o veículo.

7. DO FORO E TÍTULO EXECUTIVO:
As partes elegem o Foro da Comarca de {CIDADE_LOJA} - {ESTADO_LOJA} para dirimir quaisquer dúvidas oriundas deste contrato, que constitui título executivo extrajudicial nos termos do Art. 784, III do CPC.

{CIDADE_LOJA} - {ESTADO_LOJA}, {DATA_EXTENSO}.

_____________________________________          _____________________________________
{LOJA_NOME_FANTASIA}                          {CLIENTE_NOME}
VENDEDORA (CNPJ: {LOJA_CNPJ})                  COMPRADOR(A) (CPF: {CLIENTE_CPF})

Consultor Responsável: {VENDEDOR_NOME}
Testemunha 1: ________________________ CPF: _______________   Testemunha 2: ________________________ CPF: _______________`
  },
  {
    id: 'contrato_repasse_sem_garantia',
    titulo: 'Contrato de Repasse Comercial de Veículo (No Estado / Sem Garantia)',
    tipo: 'repasse',
    descricao: 'Modelo jurídico específico para operação de Repasse Comercial no estado em que se encontra, com deságio comercial e vistoria prévia.',
    conteudo: `INSTRUMENTO PARTICULAR DE COMPRA E VENDA NA MODALIDADE REPASSE COMERCIAL (NO ESTADO / SEM GARANTIA)

1. VENDEDORA:
{LOJA_RAZAO_SOCIAL} ({LOJA_NOME_FANTASIA}), inscrita no CNPJ sob o nº {LOJA_CNPJ}, sediada em {LOJA_ENDERECO}, telefone {LOJA_TELEFONE} e WhatsApp {LOJA_WHATSAPP}.

2. COMPRADOR(A) ADQUIRENTE DE REPASSE:
Nome: {CLIENTE_NOME} | CPF: {CLIENTE_CPF} | RG: {CLIENTE_RG}
Endereço: {CLIENTE_ENDERECO} | Telefone/WhatsApp: {CLIENTE_TELEFONE}

3. DO OBJETO E CARACTERIZAÇÃO TÉCNICA:
Veículo: {VEICULO_MARCA} {VEICULO_MODELO} {VEICULO_VERSAO}
Ano Fab./Mod.: {VEICULO_ANO} | Cor: {VEICULO_COR} | Combustível: {VEICULO_COMBUSTIVEL} | Câmbio: {VEICULO_CAMBIO}
Placa: {VEICULO_PLACA} | RENAVAM: {VEICULO_RENAVAM} | Chassi: {VEICULO_CHASSI}
Quilometragem acumulada declarada: {VEICULO_KM} km

4. DO PREÇO DIFERENCIADO DE REPASSE E PAGAMENTO:
Preço especial de repasse ajustado: {VALOR_VENDA} ({VALOR_VENDA_EXTENSO}), já contemplando deságio comercial expresso para assunção de revisões e reparos pelo(a) COMPRADOR(A).
Forma de Pagamento: {FORMA_PAGAMENTO}
{DETALHES_FINANCIAMENTO}

5. CLÁUSULA EXPRESSA DE REPASSE COMERCIAL, VISTORIA PRÉVIA E ISENÇÃO DE GARANTIA:
O(A) COMPRADOR(A) DECLARA EXPRESSAMENTE TER PLENA CIÊNCIA DE QUE ESTE NEGÓCIO É FIRMADO NA MODALIDADE "REPASSE COMERCIAL — VENDA NO ESTADO FÍSICO E MECÂNICO EM QUE SE ENCONTRA", DISTINTA DA VENDA DE VAREJO REVISADA, ADQUIRINDO O VEÍCULO COM DESÁGIO FINANCEIRO ABAIXO DO VALOR DE MERCADO/TABELA FIPE.
5.1. O(A) COMPRADOR(A) declara que lhe foi franqueada ampla vistoria técnica prévia do veículo — realizada pessoalmente ou acompanhada por mecânico/perito de sua estrita confiança — tendo verificado motor, câmbio, parte elétrica, suspensão, estrutura, funilaria e histórico compatíveis com o ano ({VEICULO_ANO}) e quilometragem ({VEICULO_KM} km).
5.2. Em contrapartida direta ao abatimento concedido no preço, o(a) COMPRADOR(A) assume integralmente a álea técnica e os custos de quaisquer manutenções preventivas ou corretivas imediatas ou futuras, não havendo cobertura de garantia mecânica, elétrica, estética ou reserva técnica por parte da VENDEDORA.
5.3. As partes reconhecem que a presente avença tem respaldo nos arts. 421 e 421-A do Código Civil, e para fins de estrita conformidade com os arts. 24 e 51, I do CDC, o(a) COMPRADOR(A) atesta que a aquisição destina-se a fins de revenda comercial (B2B) ou que teve acesso ao laudo de vistoria cautelar prévia detalhando os vícios e avarias aparentes, concordando com o deságio proporcional do preço.

6. DA TRANSFERÊNCIA DETRAN E RESPONSABILIDADE (ARTS. 123 E 134 DO CTB):
O(A) COMPRADOR(A) obriga-se a transferir o veículo junto ao DETRAN no prazo improrrogável de 30 (trinta) dias (Art. 123, § 1º do CTB), respondendo integralmente por multas, tributos e ocorrências civis ou criminais a partir desta data.

7. DO FORO:
Fica eleito o Foro da Comarca de {CIDADE_LOJA} - {ESTADO_LOJA}, constituindo este instrumento título executivo extrajudicial (Art. 784, III do CPC).

{CIDADE_LOJA} - {ESTADO_LOJA}, {DATA_EXTENSO}.

_____________________________________          _____________________________________
{LOJA_NOME_FANTASIA}                          {CLIENTE_NOME}
VENDEDORA (CNPJ: {LOJA_CNPJ})                  COMPRADOR(A) — CIENTE DO REPASSE NO ESTADO

Consultor Responsável: {VENDEDOR_NOME}
Testemunha 1: ________________________ CPF: _______________   Testemunha 2: ________________________ CPF: _______________`
  },
  {
    id: 'recibo_compra_veiculo',
    titulo: 'Recibo de Compra de Veículo (Aquisição da Loja)',
    tipo: 'recibo_compra',
    descricao: 'Emitido pela loja no momento da compra do veículo do antigo proprietário, discriminando quitação e débitos DETRAN.',
    conteudo: `RECIBO DE COMPRA, QUITAÇÃO E AQUISIÇÃO DE VEÍCULO AUTOMOTOR

A empresa {LOJA_RAZAO_SOCIAL} ({LOJA_NOME_FANTASIA}), inscrita no CNPJ sob o nº {LOJA_CNPJ}, sediada em {LOJA_ENDERECO}, declara ter adquirido do(a) proprietário(a) abaixo qualificado(a):

1. ANTIGO PROPRIETÁRIO (VENDEDOR):
Nome: {DONO_NOME} | CPF: {DONO_CPF} | RG: {DONO_RG}
Endereço: {DONO_ENDERECO} | Telefone: {DONO_TELEFONE}

2. VEÍCULO OBJETO DA AQUISIÇÃO:
Veículo: {VEICULO_MARCA} {VEICULO_MODELO} {VEICULO_VERSAO}
Ano Fab./Mod.: {VEICULO_ANO} | Cor: {VEICULO_COR} | Combustível: {VEICULO_COMBUSTIVEL}
Placa: {VEICULO_PLACA} | RENAVAM: {VEICULO_RENAVAM} | Chassi: {VEICULO_CHASSI} | KM na entrada: {VEICULO_KM} km

3. CONDIÇÕES FINANCEIRAS E QUITAÇÃO:
Valor Pago pela Loja: {VALOR_PAGO} ({VALOR_PAGO_EXTENSO})
Data de Entrada no Estoque: {DATA_ENTRADA} | Destinação Comercial: {CATEGORIA_COMERCIAL}

4. APURAÇÃO DE DÉBITOS DETRAN (MULTAS, IPVA E LICENCIAMENTO):
Constam Débitos Apurados: {TEM_DEBITO} | Montante Apurado: {VALOR_DEBITO}
Discriminação: {DESCRICAO_DEBITO}
Responsabilidade de Quitação: {QUEM_ARCA_DEBITO}

5. DECLARAÇÃO DE PROCEDÊNCIA E DESEMBARAÇO:
O(A) ANTIGO(A) PROPRIETÁRIO(A) dá plena, rasa e irrevogável quitação do valor recebido e declara, sob as penas da lei civil e penal, que o veículo é de sua legítima propriedade, livre de alienação fiduciária não baixada, penhoras, restrições RENAJUD ou sinistros ocultos, responsabilizando-se por eventuais multas ou débitos cujo fato gerador seja anterior a esta data (exceto aqueles expressamente assumidos pela loja no item 4) e obrigando-se à imediata assinatura da ATPV-e.

{CIDADE_LOJA} - {ESTADO_LOJA}, {DATA_EXTENSO}.

_____________________________________          _____________________________________
{LOJA_RAZAO_SOCIAL}                           {DONO_NOME}
COMPRADORA (LOJA)                              ANTIGO PROPRIETÁRIO (CPF: {DONO_CPF})`
  },
  {
    id: 'recibo_venda_entrega',
    titulo: 'Recibo de Venda e Termo de Entrega Técnica de Chaves',
    tipo: 'recibo_venda',
    descricao: 'Comprovante de recebimento financeiro e tradição oficial das chaves emitido na entrega do veículo ao comprador.',
    conteudo: `RECIBO DE VENDA E TERMO DE TRADIÇÃO / ENTREGA DE CHAVES

A {LOJA_RAZAO_SOCIAL} ({LOJA_NOME_FANTASIA}), CNPJ {LOJA_CNPJ}, certifica que recebeu de {CLIENTE_NOME}, inscrito(a) no CPF sob o nº {CLIENTE_CPF}, a importância total de {VALOR_VENDA} ({VALOR_VENDA_EXTENSO}), via {FORMA_PAGAMENTO}, referente à aquisição do veículo:

IDENTIFICAÇÃO DO VEÍCULO ENTREGUE:
Veículo: {VEICULO_MARCA} {VEICULO_MODELO} {VEICULO_VERSAO} | Ano: {VEICULO_ANO} | Cor: {VEICULO_COR}
Placa: {VEICULO_PLACA} | RENAVAM: {VEICULO_RENAVAM} | Chassi: {VEICULO_CHASSI}

TERMO DE VISTORIA DE ENTREGA E TRADIÇÃO:
O(A) COMPRADOR(A) declara estar recebendo neste ato a posse direta, domínio e chaves do veículo acima descrito nas seguintes condições conferidas:
- Quilometragem exata no ato da entrega: {VEICULO_KM} km
- Chave principal, documentação digital de rodagem (CRLV-e) e orientações para emissão de ATPV-e
- Regime Jurídico da Negociação: {MODALIDADE_GARANTIA}
- Ciência expressa da responsabilidade integral por infrações de trânsito, pedágios, IPVA vincendo e danos a terceiros a partir deste ato de retirada, bem como do prazo legal de 30 dias para transferência junto ao DETRAN (Art. 123, § 1º do CTB).

{CIDADE_LOJA} - {ESTADO_LOJA}, {DATA_EXTENSO}.

_____________________________________          _____________________________________
{LOJA_NOME_FANTASIA}                          {CLIENTE_NOME}
Entregue por: {VENDEDOR_NOME}                  Recebido por: COMPRADOR(A) ({CLIENTE_CPF})`
  }
];
