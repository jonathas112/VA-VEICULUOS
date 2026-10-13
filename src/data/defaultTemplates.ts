import { ContractTemplate } from '../types';

export const DEFAULT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'contrato_garantia_padrao',
    titulo: 'Contrato de Compra e Venda com Garantia Legal (90 Dias)',
    tipo: 'garantia',
    descricao: 'Modelo padrão para venda de veículos revisados com garantia de motor e câmbio conforme CDC.',
    conteudo: `INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR COM GARANTIA LEGAL

1. VENDEDORA:
{LOJA_RAZAO_SOCIAL}, CNPJ: {LOJA_CNPJ}, com sede em {LOJA_ENDERECO}, telefone {LOJA_TELEFONE}.

2. COMPRADOR(A):
Nome: {CLIENTE_NOME}
CPF: {CLIENTE_CPF}
Endereço: {CLIENTE_ENDERECO}
Telefone: {CLIENTE_TELEFONE}

3. DO OBJETO:
A VENDEDORA vende ao COMPRADOR o seguinte veículo automotor:
Veículo: {VEICULO_MARCA} {VEICULO_MODELO} {VEICULO_VERSAO}
Ano Fab./Mod.: {VEICULO_ANO} | Cor: {VEICULO_COR} | Combustível: {VEICULO_COMBUSTIVEL}
Placa: {VEICULO_PLACA} | Renavam: {VEICULO_RENAVAM} | Chassi: {VEICULO_CHASSI}
KM no ato da entrega: {VEICULO_KM} km

4. DO PREÇO E FORMA DE PAGAMENTO:
O preço certo e ajustado para a presente transação é de R$ {VALOR_VENDA} ({VALOR_VENDA_EXTENSO}), a ser pago da seguinte forma:
Condição: {FORMA_PAGAMENTO}
{DETALHES_FINANCIAMENTO}

5. DA GARANTIA LEGAL:
A VENDEDORA concede ao COMPRADOR a garantia legal de 90 (noventa) dias para MOTOR e CÂMBIO, nos termos do Artigo 26 do Código de Defesa do Consumidor (Lei 8.078/90), contados a partir da data de assinatura deste contrato.
5.1. A garantia não cobre desgaste natural de componentes como pneus, pastilhas de freio, suspensão, embreagem, lâmpadas ou danos decorrentes de mau uso, imperícia ou adulteração mecânica sem prévia autorização da VENDEDORA.

6. DA TRANSFERÊNCIA:
O COMPRADOR compromete-se a efetuar a transferência do veículo perante o DETRAN no prazo legal improrrogável de 30 (trinta) dias.

{CIDADE_LOJA}, {DATA_EXTENSO}.

_____________________________________          _____________________________________
{LOJA_NOME_FANTASIA}                          {CLIENTE_NOME}
VENDEDORA                                      COMPRADOR(A)

Vendedor Responsável: {VENDEDOR_NOME}`
  },
  {
    id: 'contrato_repasse_sem_garantia',
    titulo: 'Contrato de Repasse de Veículo (Vendido no Estado / Sem Garantia)',
    tipo: 'repasse',
    descricao: 'Para veículos negociados na modalidade Repasse, com valor de oportunidade, sem garantia mecânica.',
    conteudo: `INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE VEÍCULO AUTOMOTOR NA MODALIDADE REPASSE (SEM GARANTIA)

1. VENDEDORA:
{LOJA_RAZAO_SOCIAL}, CNPJ: {LOJA_CNPJ}, situada em {LOJA_ENDERECO}.

2. COMPRADOR(A):
Nome: {CLIENTE_NOME}
CPF: {CLIENTE_CPF}
Endereço: {CLIENTE_ENDERECO}
Telefone: {CLIENTE_TELEFONE}

3. DO OBJETO E CARACTERIZAÇÃO DE REPASSE:
Veículo: {VEICULO_MARCA} {VEICULO_MODELO} {VEICULO_VERSAO}
Ano: {VEICULO_ANO} | Placa: {VEICULO_PLACA} | Renavam: {VEICULO_RENAVAM} | Chassi: {VEICULO_CHASSI}
KM: {VEICULO_KM} km

4. DO PREÇO DE ATACADO/REPASSE:
Valor acordado: R$ {VALOR_VENDA} ({VALOR_VENDA_EXTENSO}).
Forma de Pagamento: {FORMA_PAGAMENTO}.

5. DA CLÁUSULA EXPRESSA DE ISENÇÃO DE GARANTIA:
O COMPRADOR declara expressamente estar ciente de que o presente veículo é vendido na modalidade REPASSE COMERCIAL (VENDA NO ESTADO EM QUE SE ENCONTRA), adquirindo-o por valor significativamente abaixo do preço de mercado/tabela FIPE.
5.1. O COMPRADOR vistoriou o veículo pessoalmente ou por intermédio de profissional mecânico e funileiro de sua estrita confiança, aceitando o estado mecânico, estrutural, de funilaria, elétrico e estético em que se encontra, renunciando expressamente a quaisquer reclamações posteriores ou garantia por vícios aparentes ou ocultos.
5.2. As despesas de eventuais reparos imediatos ou futuros correm por conta exclusiva do COMPRADOR.

6. DA TRANSFERÊNCIA DE PROPRIEDADE:
O COMPRADOR assume total responsabilidade pela transferência do veículo junto ao DETRAN no prazo de 30 dias.

{CIDADE_LOJA}, {DATA_EXTENSO}.

_____________________________________          _____________________________________
{LOJA_NOME_FANTASIA}                          {CLIENTE_NOME}
VENDEDORA                                      COMPRADOR(A)`
  },
  {
    id: 'recibo_compra_veiculo',
    titulo: 'Recibo de Compra de Veículo (Aquisição da Loja)',
    tipo: 'recibo_compra',
    descricao: 'Emitido pela loja no momento da compra do veículo do antigo proprietário.',
    conteudo: `RECIBO DE COMPRA E AQUISIÇÃO DE VEÍCULO AUTOMOTOR

A empresa {LOJA_RAZAO_SOCIAL}, inscrita no CNPJ sob o nº {LOJA_CNPJ}, declara para os devidos fins que comprou do(a) Sr.(a):

VENDEDOR(A) / ANTIGO DONO:
Nome: {DONO_NOME}
CPF: {DONO_CPF}
Endereço: {DONO_ENDERECO}
Telefone: {DONO_TELEFONE}

O VEÍCULO ABAIXO DESCRITO:
Marca/Modelo: {VEICULO_MARCA} {VEICULO_MODELO} {VEICULO_VERSAO}
Ano Fab/Mod: {VEICULO_ANO} | Placa: {VEICULO_PLACA} | Cor: {VEICULO_COR}
Renavam: {VEICULO_RENAVAM} | Chassi: {VEICULO_CHASSI} | KM: {VEICULO_KM} km

CONDIÇÕES DA TRANSAÇÃO:
Valor Pago pela Loja: R$ {VALOR_PAGO} ({VALOR_PAGO_EXTENSO})
Data da Operação: {DATA_ENTRADA}
Modalidade: {CATEGORIA_COMERCIAL}

SITUAÇÃO DE DÉBITOS DETRAN (Multas, IPVA, Licenciamento):
Possui Débito: {TEM_DEBITO}
Valor dos Débitos: R$ {VALOR_DEBITO}
Responsável pelo Pagamento do Débito: {QUEM_ARCA_DEBITO}

O VENDEDOR declara sob as penas da lei que o veículo se encontra livre e desembaraçado de quaisquer outros ônus judiciais ou extrajudiciais, salvo os débitos acima discriminados, autorizando a transferência imediata de titularidade.

{CIDADE_LOJA}, {DATA_EXTENSO}.

_____________________________________          _____________________________________
{LOJA_RAZAO_SOCIAL}                           {DONO_NOME}
Compradora (Loja)                              Vendedor(a) / Antigo Dono`
  },
  {
    id: 'recibo_venda_entrega',
    titulo: 'Recibo de Venda e Termo de Entrega de Chaves',
    tipo: 'recibo_venda',
    descricao: 'Comprovante emitido na entrega do veículo ao cliente comprador.',
    conteudo: `RECIBO DE VENDA E TERMO DE ENTREGA DE VEÍCULO

Recebemos de {CLIENTE_NOME}, CPF {CLIENTE_CPF}, o valor total de R$ {VALOR_VENDA} referente à aquisição do veículo:
{VEICULO_MARCA} {VEICULO_MODELO} {VEICULO_VERSAO} - Ano {VEICULO_ANO}
Placa: {VEICULO_PLACA} | Renavam: {VEICULO_RENAVAM} | Chassi: {VEICULO_CHASSI}

O COMPRADOR declara ter recebido o veículo nas seguintes condições:
- Quilometragem no ato da entrega: {VEICULO_KM} km
- Chave principal e cópia reserva (quando disponível)
- Manual do proprietário e documento de rodagem (CRLV-e)
- Modalidade da venda: {MODALIDADE_GARANTIA}

{CIDADE_LOJA}, {DATA_EXTENSO}.

_____________________________________          _____________________________________
{LOJA_NOME_FANTASIA}                          {CLIENTE_NOME}
Entregue por: {VENDEDOR_NOME}                  Comprador(a)`
  }
];
