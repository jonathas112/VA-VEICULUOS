# PLAYBOOK ARQUITETURAL, SEMÂNTICO E OPERACIONAL DO SISTEMA
# VA VEÍCULOS — GESTÃO AUTOMOTIVA, FINANCEIRA & SHOWROOM
Versão: 2.0 | Atualizado: Outubro/2026 | Ambiente: React 19 + TypeScript + Vite + Firestore

Este documento é a **Bíblia Técnica e Operacional** do sistema VA Veículos. Ele foi estruturado para ser lido e interpretado por qualquer Engenheiro de Software ou Modelo de Inteligência Artificial (Gemini, Claude, GPT, etc.), capacitando o agente a entender a semântica de cada módulo, diagnosticar falhas, manter invariantes de integridade e resolver qualquer problema sem quebrar a consistência contábil e negocial do sistema.

---

## ÍNDICE GERAL
1. [Visão Geral, Arquitetura & Stack Técnica](#1-visão-geral-arquitetura--stack-técnica)
2. [Dicionário Semântico de Negócio](#2-dicionário-semântico-de-negócio)
3. [Setor 1: Estoque & Gestão de Veículos](#setor-1-estoque--gestão-de-veículos)
4. [Setor 2: Vendas & Negociação Comercial](#setor-2-vendas--negociação-comercial)
5. [Setor 3: Financeiro, Margens & Comissões](#setor-3-financeiro-margens--comissões)
6. [Setor 4: Documentos, Contratos & Papel Timbrado](#setor-4-documentos-contratos--papel-timbrado)
7. [Setor 5: Configurações, Instituições Financeiras & Equipe](#setor-5-configurações-instituições-financeiras--equipe)
8. [Setor 6: Persistência Híbrida, Firestore & Auditoria](#setor-6-persistência-híbrida-firestore--auditoria)
9. [Setor 7: Showroom Público & Vitrine de Clientes](#setor-7-showroom-público--vitrine-de-clientes)
10. [Matriz Geral de Resolução de Problemas (Troubleshooting Runbook)](#10-matriz-geral-de-resolução-de-problemas-troubleshooting-runbook)
11. [Prompt Mestre de Acionamento para Inteligências Artificiais](#11-prompt-mestre-de-acionamento-para-inteligências-artificiais)

---

## 1. VISÃO GERAL, ARQUITETURA & STACK TÉCNICA

O sistema **VA Veículos** é uma solução completa para concessionárias e lojas de automóveis multimarcas, com sede padrão em Areial - PB. A aplicação opera com dois modos principais:
- **Modo Gestão (Administrativo)**: Painel fechado para controle de estoque, compras, custos de pátio, vendas, comissões, financeiras, equipe e contratos.
- **Modo Showroom (Público)**: Vitrine digital para clientes finais, com catálogo de veículos, filtros, fotos em alta resolução e integração direta com WhatsApp.

### Stack Técnica
* **Frontend**: React 19, TypeScript (~5.8), Vite 6.
* **Estilização**: Tailwind CSS v4, Lucide React (ícones), Motion (animações).
* **Persistência**: Arquitetura Híbrida Offline-First:
  - Cache local primário em `localStorage` com chaves versionadas (`vaveiculos_*_v2`).
  - Sincronização em nuvem via **Google Firebase Firestore** (banco `va-veiculos`).
* **Regras de Segurança**: `firestore.rules` com trilha de auditoria append-only imutável (`audit_logs`).
* **Validação de Tipos**: `tsc --noEmit` rigoroso, sem uso de `any` frouxo em modelos principais.

---

## 2. DICIONÁRIO SEMÂNTICO DE NEGÓCIO

Para manter a integridade, qualquer IA ou desenvolvedor deve respeitar os seguintes termos:
* **Entrada de Veículo**: Ação de aquisição de um automóvel comprado de um **Antigo Dono** (pessoa física ou jurídica).
* **Débito DETRAN**: Multas, IPVA ou licenciamento pendentes na entrada. Podem ser assumidos pela **Loja** (somados ao custo de aquisição) ou pelo **Antigo Dono** (descontados da compra).
* **Custos de Pátio / Pré-Venda**: Despesas investidas na preparação do carro antes de vendê-lo (mecânica, funilaria, pintura, lavagem, estética, pneus, despachante).
* **Custos Pós-Venda**: Despesas de garantia contratual ou legal ocorridas após a entrega do veículo ao comprador.
* **Preço Anunciado**: Valor de tabela exibido no showroom público.
* **Preço de Venda**: Valor real fechado na negociação.
* **Margem Bruta**: `Preço de Venda - Custos Pré-Venda`.
* **Margem Líquida Real**: `Preço de Venda - (Custos Pré-Venda + Custos Pós-Venda + Comissão)`.
* **Garantia Legal 90 Dias**: Venda convencional com cobertura de motor e câmbio.
* **Repasse Comercial (No Estado)**: Venda com margem reduzida para lojistas/revendedores, sem garantia mecânica.
* **Comissão Pendente**: Venda efetuada por **Vendedor**, cuja comissão fica zerada até que um **Gestor** delibere e aprove o montante final.

---

## SETOR 1: ESTOQUE & GESTÃO DE VEÍCULOS

### 1.1 Objetivo & Responsabilidade
Gerenciar o ciclo de vida dos veículos da concessionária: entrada, vistoria, histórico do antigo proprietário, documentação, galeria de fotos, precificação e acompanhamento de custos de pátio.

### 1.2 Arquivos-Chave
* `src/components/management/InventoryView.tsx`: Tabela visual de estoque, busca, filtros de status e botões de ação rápida.
* `src/components/management/VehicleEntryModal.tsx`: Formulário assistido de cadastro/entrada de veículo e antigo dono.
* `src/components/management/VehicleCostsModal.tsx`: Lançamento de despesas de oficina/pátio e simulador de margem.
* `src/components/management/VehicleHistoryView.tsx`: Linha do tempo completa do carro (compra, reformas, venda).
* `src/services/storage.ts`: Métodos `getVehicles()`, `addVehicle()`, `updateVehicle()`, `deleteVehicle()`, `addVehiclePatioExpense()`.

### 1.3 Entidades e Estrutura de Dados
```typescript
interface Vehicle {
  id: string;                      // Prefixo "veh_" + timestamp
  tipo: 'carro' | 'moto' | 'utilitario' | 'caminhao';
  marca: string;
  modelo: string;
  versao: string;
  anoFabricacao: number;
  anoModelo: number;
  cor: string;
  combustivel: 'Flex' | 'Gasolina' | 'Etanol' | 'Diesel' | 'Híbrido' | 'Elétrico';
  cambio: 'Automático' | 'Manual' | 'CVT' | 'Automatizado';
  quilometragem: number;
  placa: string;                   // Formatada (ABC1D23 ou ABC-1234)
  chassi: string;
  renavam: string;
  categoriaComercial: 'venda' | 'repasse';
  status: 'em_estoque' | 'vendido' | 'reservado';
  fotos: string[];                 // Base64 comprimido ou URLs (máx. 10)
  antigoDonoId: string;            // Vínculo obrigatório com FormerOwner
  valorPago: number;               // Valor de compra pago pela loja
  debitoDetran: {
    temDebito: boolean;
    valor: number;
    quemArca: 'loja' | 'antigo_dono' | 'nenhum';
    descricao?: string;
  };
  valorAnunciado: number;
  custosPatio: VehicleExpense[];
}
```

### 1.4 Invariantes & Regras Críticas
1. **Unicidade de Placa em Estoque**: É proibido ter dois veículos simultâneos com status `em_estoque` que possuam a mesma placa alfanumérica normalizada. Tanto o modal quanto `storageService.addVehicle()` bloqueiam a ação.
2. **Proteção de Veículo Vendido**: Um veículo com status `vendido` ou que possua registros no histórico de vendas **nunca pode ser excluído** via `deleteVehicle()`, sob pena de distorcer o cálculo de custos no relatório contábil (`FinancialView`).
3. **Custo de Aquisição**:
   $$\text{Custo de Aquisição} = \text{valorPago} + (\text{quemArca} == \text{'loja'} \ ? \ \text{debitoDetran.valor} : 0)$$
4. **Compressão de Imagens**: Toda foto carregada passa por `compressMultipleImages()` em WebP/JPEG mantendo dimensão máxima de 1280px e qualidade 0.75, prevenindo estouro de cota do `localStorage`.

---

## SETOR 2: VENDAS & NEGOCIAÇÃO COMERCIAL

### 2.1 Objetivo & Responsabilidade
Processar a negociação final do automóvel, registrar dados do comprador, estruturar formas de pagamento (Financiamento, À Vista, Cartão, Misto), vincular instituições financeiras, definir modalidade de garantia e disparar recibos/contratos.

### 2.2 Arquivos-Chave
* `src/components/management/VehicleSaleModal.tsx`: Modal operacional de conclusão da venda e checagem de margem em tempo real.
* `src/components/management/SalesHistoryView.tsx`: Histórico completo de negócios realizados, recibos e pós-venda.
* `src/services/storage.ts`: Métodos `addSale()`, `updateSale()`, `addPostSaleCost()`.

### 2.3 Entidades e Estrutura de Dados
```typescript
interface Sale {
  id: string;                      // Prefixo "sale_" + timestamp
  veiculoId: string;               // Vínculo obrigatório com Vehicle
  dataVenda: string;               // ISO 8601
  clienteNome: string;
  clienteCpf: string;              // Validado matematicamente
  clienteTelefone: string;
  clienteEndereco: string;
  vendedorId: string;
  vendedorNome: string;
  valorVenda: number;
  formaPagamento: 'a_vista_pix' | 'financiamento' | 'cartao_credito' | 'misto';
  financiadoraId?: string;
  financiadoraNome?: string;
  valorEntrada?: number;
  valorFinanciado?: number;
  numeroParcelas?: number;
  tipoContratoId: string;
  isRepasseSemGarantia: boolean;
  comissaoValor: number;
  comissaoPendente: boolean;       // True quando originado por Vendedor
  comissaoDefinidaPor?: string;
  custosPosVenda: PostSaleCost[];
}
```

### 2.4 Invariantes & Regras Críticas
1. **Bloqueio de Re-Venda**: Um veículo já vendido não pode ser vendido novamente. O modal valida `if (vehicle.status === 'vendido')` e `storageService.addSale()` lança erro impeditivo.
2. **Transição Automática**: Ao salvar a venda, o veículo associado é imediatamente atualizado para `status: 'vendido'` e `dataVenda: sale.dataVenda`.
3. **Equilíbrio Financeiro**:
   $$\text{valorEntrada} \le \text{valorVenda}$$
   Em financiamentos ou pagamentos mistos, o valor financiado é calculado como:
   $$\text{valorFinanciado} = \max(0, \text{valorVenda} - \text{valorEntrada})$$
4. **Validações contra NaN**: Campos monetários (`valorVenda`, `valorEntrada`) são estritamente validados com `isNaN()` e devem ser positivos.
5. **Automação de Recibo**: Imediatamente após a venda, o sistema invoca `ContractsAndReceiptsModal` com os dados da transação já preenchidos para impressão instantânea.

---

## SETOR 3: FINANCEIRO, MARGENS & COMISSÕES

### 3.1 Objetivo & Responsabilidade
Apurar a lucratividade real da loja, custos globais, ticket médio, fluxo de recebíveis, comissões dos vendedores e saúde financeira por período.

### 3.2 Arquivos-Chave
* `src/components/management/FinancialView.tsx`: DRE e consolidação financeira mensal, anual e personalizada.
* `src/components/management/DashboardView.tsx`: KPIs executivos, giro de estoque e ranking comercial.
* `src/components/management/PendingCommissionsView.tsx`: Fila de liberação e fixação de comissões pela gerência.
* `src/utils/formatters.ts`: Fórmulas matemáticas de custos e margem.

### 3.3 Fórmulas Matemáticas Canônicas
$$\text{Custo Total da Venda} = \text{Custo Aquisição} + \sum \text{Custos Pátio} + \sum \text{Custos Pós-Venda} + \text{Comissão}$$

$$\text{Lucro Líquido Real} = \text{Valor da Venda} - \text{Custo Total da Venda}$$

$$\text{Margem Líquida (\%)} = \begin{cases} \left(\frac{\text{Lucro Líquido}}{\text{Valor da Venda}}\right) \times 100, & \text{se } \text{Valor da Venda} > 0 \\ 0, & \text{se } \text{Valor da Venda} \le 0 \end{cases}$$

### 3.4 Invariantes & Regras Críticas
1. **Regra de Comissões por Perfil**:
   - Venda realizada pelo perfil **Gestor**: define a comissão no ato; `comissaoPendente = false`.
   - Venda realizada pelo perfil **Vendedor**: comissão inicial é salva como `0` com `comissaoPendente = true`. Apenas um Gestor pode aprová-la no `PendingCommissionsView` chamando `storageService.assignCommission()`.
2. **Suporte a Prejuízo Comercial**: Se o carro for vendido abaixo do custo global, o sistema deve registrar a margem negativa fielmente (ex.: `-15.4%`), sem quebrar divisões ou omitir valores.
3. **Resiliência a Dados Órfãos**: Se uma venda legada referenciar um veículo cujo ID não esteja no array ativo, o `FinancialView` contabiliza a receita normalmente sem crashar com `undefined`.

---

## SETOR 4: DOCUMENTOS, CONTRATOS & PAPEL TIMBRADO

### 4.1 Objetivo & Responsabilidade
Gerar minutas jurídicas, recibos de compra e venda, termos de repasse no estado e contratos com garantia de 90 dias, substituindo tags dinâmicas e convertendo valores por extenso.

### 4.2 Arquivos-Chave
* `src/utils/templateEngine.ts`: Motor de substituição de tags (`renderTemplate`).
* `src/utils/formatters.ts`: Função `numberToWordsPtBr(num)` (conversor oficial por extenso).
* `src/components/management/ContractsAndReceiptsModal.tsx`: Visualizador e impressor de minutas.
* `src/data/defaultTemplates.ts`: Modelos canônicos de documentos.

### 4.3 Merge Tags Disponíveis
| Tag | Descrição | Exemplo Gerado |
| :--- | :--- | :--- |
| `{LOJA_NOME_FANTASIA}` / `{nome_loja}` | Nome da Loja | VA Veículos |
| `{LOJA_CNPJ}` / `{cnpj_loja}` | CNPJ formatado | 04.252.011/0001-10 |
| `{VEICULO_MARCA}` / `{VEICULO_MODELO}` | Dados do carro | Toyota Corolla XEi |
| `{VEICULO_PLACA}` | Placa oficial | BRA2E19 |
| `{proprietario_nome}` / `{DONO_NOME}` | Nome do antigo dono | João Pereira da Silva |
| `{comprador_nome}` / `{CLIENTE_NOME}` | Nome do comprador | Francisco Severino |
| `{valor_venda}` | Valor monetário | R$ 95.000,00 |
| `{valor_venda_extenso}` | Valor por extenso | noventa e cinco mil reais |
| `{FORMA_PAGAMENTO}` | Modalidade | Financiamento Bancário (BV) |
| `{data_extenso}` | Data de emissão | 14 de outubro de 2026 |

### 4.4 Invariantes & Regras Críticas
1. **Regras do Conversor por Extenso**:
   - `num == 0` $\rightarrow$ `"zero reais"`.
   - `num < 0` $\rightarrow$ `"menos " + numberToWordsPtBr(|num|)`.
   - `num < 1` $\rightarrow$ Converte apenas os centavos (ex.: `0.75` $\rightarrow$ `"setenta e cinco centavos"`).
   - Sem espaços vazios no início da string.
2. **Substituição Segura**: A função `replaceTag()` utiliza expressões regulares com escape de caracteres especiais e flag `gi` (case-insensitive).

---

## SETOR 5: CONFIGURAÇÕES, INSTITUIÇÕES FINANCEIRAS & EQUIPE

### 5.1 Objetivo & Responsabilidade
Parametrizar a identidade da empresa (endereço em Areial-PB, CNPJ, WhatsApp, logotipo), bancos e financeiras credenciados, modelo de papel timbrado e equipe de consultores de vendas.

### 5.2 Arquivos-Chave
* `src/components/management/SettingsView.tsx`: Painel central de configurações dividido em abas.
* `src/components/common/BrandLogo.tsx`: Componente visual inteligente da logo institucional.
* `src/components/navigation/Sidebar.tsx` e `Topbar.tsx`: Menus com logotipo dinâmico e controle de perfil.

### 5.3 Invariantes & Regras Críticas
1. **Ativação / Desativação de Financeiras**:
   - O método `storageService.toggleFinancierStatus(id)` inverte o status (`ativa = !ativa` e `ativo = !ativo`).
   - No `VehicleSaleModal`, financeiras desativadas aparecem desabilitadas com o sufixo `[Desativada]`.
2. **Ativação / Desativação de Membros da Equipe**:
   - O método `storageService.toggleSalespersonStatus(id)` gerencia o status do vendedor.
3. **Logotipo Institucional**:
   - Se `store.logoUrl` estiver preenchido, o sistema exibe a imagem customizada com suporte a proporção.
   - Se `store.logoUrl` estiver vazio ou for removido via `handleRemoveLogo()`, o sistema aciona fallback automático para o emblema metálico automotivo da **VA Veículos** (`BrandLogo`).

---

## SETOR 6: PERSISTÊNCIA HÍBRIDA, FIRESTORE & AUDITORIA

### 6.1 Objetivo & Responsabilidade
Garantir persistência imediata local (sem travar a UI) com sincronização em nuvem e histórico de auditoria imutável contra fraudes ou exclusões acidentais.

### 6.2 Estrutura de Armazenamento
* **Local Storage Keys**:
  - `vaveiculos_vehicles_v2`
  - `vaveiculos_sales_v2`
  - `vaveiculos_owners_v2`
  - `vaveiculos_financiers_v2`
  - `vaveiculos_salespeople_v2`
  - `vaveiculos_store_v2`
  - `vaveiculos_templates_v2`
* **Coleções Cloud Firestore**:
  - `vehicles`, `sales`, `former_owners`, `financiers`, `salespeople`, `contract_templates`, `store_profile`, `audit_logs`.

### 6.3 Invariantes & Regras de Segurança
1. **Imutabilidade de Auditoria**: Em `firestore.rules`, a coleção `audit_logs` possui regra estrita:
   ```
   match /audit_logs/{logId} {
     allow read, create: if true;
     allow update, delete: if false; // NUNCA permitir edição ou exclusão de logs
   }
   ```
2. **Toda Ação Gera Log**: Cada entrada de carro, venda, alteração de comissão, lançamento de despesa ou mudança de status invoca `auditLogger.log()` gravando categoria, autor, timestamp e detalhes técnicos em JSON.

---

## SETOR 7: SHOWROOM PÚBLICO & VITRINE DE CLIENTES

### 7.1 Objetivo & Responsabilidade
Apresentar o estoque disponível para compradores externos, permitindo busca por marca, ano, faixa de preço, tipo de câmbio e contato direto com o WhatsApp da loja.

### 7.2 Arquivos-Chave
* `src/components/showroom/ShowroomView.tsx`: Página pública do showroom com grid responsivo de veículos.
* `src/components/showroom/VehicleDetailModal.tsx`: Ficha técnica detalhada do veículo com galeria de imagens.

### 7.3 Invariantes & Regras Críticas
1. **Filtro de Exibição**: O showroom só exibe veículos com status estritamente igual a `em_estoque`. Veículos vendidos não aparecem no catálogo público.
2. **Sigilo Comercial**: Valores de compra (`valorPago`), débitos do antigo dono e custos de reforma **jamais são expostos** no showroom ou no modal de detalhes do cliente.
3. **Link WhatsApp**: O botão "Tenho Interesse" monta o link no formato:
   `https://wa.me/5583987654321?text=Olá, tenho interesse no veículo: Toyota Corolla XEi 2024 (Placa BRA2E19)`

---

## 10. MATRIZ GERAL DE RESOLUÇÃO DE PROBLEMAS (TROUBLESHOOTING RUNBOOK)

| Sintoma / Problema | Causa Raiz Provável | Arquivo Responsável | Ação Corretiva Recomendada |
| :--- | :--- | :--- | :--- |
| **Erro "Cannot read properties of undefined (reading 'map')"** | Tentativa de iterar sobre array nulo em carregamento inicial. | `DashboardView.tsx` ou `FinancialView.tsx` | Aplicar guard clause: `(sales \|\| []).map(...)` ou `Array.isArray(salespeople) ? salespeople : []`. |
| **Lucro líquido da loja muito acima da realidade** | Um veículo vendido foi excluído do estoque, gerando uma venda órfã. | `src/services/storage.ts` e `FinancialView.tsx` | Garantir que `deleteVehicle` bloqueie exclusão de veículos com histórico em `getSales()`. |
| **Valor por extenso retorna "reais" sem o número** | Número negativo ou valor menor que 1 real enviado para o conversor. | `src/utils/formatters.ts` | Utilizar `numberToWordsPtBr` corrigido com suporte a `num < 0` e centavos puros. |
| **Total de custos ou lucro exibindo "NaN"** | Input monetário submetido vazio ou com caractere inválido. | `VehicleCostsModal.tsx`, `VehicleSaleModal.tsx` | Adicionar trava estrita `if (isNaN(valor) \|\| valor <= 0)`. |
| **Veículo aparece duplicado no estoque** | Duplo clique ou inserção manual com mesma placa. | `VehicleEntryModal.tsx` e `storage.ts` | Verificar se `cleanPlate` já existe em veículos com `status === 'em_estoque'` antes de gravar. |
| **Veículo já vendido recebe uma segunda venda** | Venda realizada via atalho ou modal sem validação de status. | `VehicleSaleModal.tsx` | Adicionar verificação `if (vehicle.status === 'vendido')` no `handleSubmit` e em `addSale`. |
| **Financeira desativada continua aparecendo em vendas** | Falta de filtro na listagem de financeiras no modal de venda. | `VehicleSaleModal.tsx` | No select de financeiras, desabilitar itens onde `f.ativa === false`. |
| **Comissão do vendedor já aparece aprovada no fechamento** | Modal de venda executado sem checar o `userRole`. | `VehicleSaleModal.tsx` | Forçar `comissaoPendente = true` e `comissaoValor = 0` sempre que `userRole === 'vendedor'`. |

---

## 11. PROMPT MESTRE DE ACIONAMENTO PARA INTELIGÊNCIAS ARTIFICIAIS

Copie e cole o prompt abaixo no início da conversa com qualquer IA que for trabalhar neste repositório:

```text
Você é o Engenheiro Especialista do sistema VA Veículos (Gestão Automotiva, Financeira e Showroom Multimarcas).
Antes de realizar qualquer alteração no código ou responder a dúvidas técnicas, leia e assimile integralmente o arquivo SYSTEM_PLAYBOOK.md localizado na raiz do projeto.

Suas diretrizes obrigatórias de atuação são:
1. Obedecer estritamente às regras de integridade e fórmulas matemáticas canônicas descritas no SYSTEM_PLAYBOOK.md (Custo de Aquisição, Custos de Pátio, Custo Pós-Venda, Lucro Líquido Real e Margem Líquida).
2. Manter a blindagem contra valores NaN em formulários monetários e travas contra duplicidade de placas no estoque ativo.
3. Nunca permitir a exclusão de veículos que possuam vendas registradas no histórico contábil nem autorizar re-venda de veículos já vendidos.
4. Preservar a imutabilidade da trilha de auditoria (audit_logs) e as regras de segurança do Firestore.
5. Sempre que realizar alterações no código, valide o projeto executando o script de auditoria: npx tsx scripts/run_system_audit.ts e confirme que todos os testes atinjam status PASS.

Confirme que você assimilou o SYSTEM_PLAYBOOK.md informando os 7 setores do sistema e aguarde as instruções do operador.
```
