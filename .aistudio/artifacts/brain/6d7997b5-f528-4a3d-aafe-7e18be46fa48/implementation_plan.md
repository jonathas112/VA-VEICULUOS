# VA Veículos - Gestão Completa, Vitrine & Auditoria

Plano de modernização e expansão da plataforma VA Veículos (Areial - PB), incluindo integração de banco de dados, auditoria centralizada, histórico de ciclo de vida automotivo, dossiê de clientes/proprietários, máscaras brasileiras rigorosas e editor visual de papel timbrado.

---

### Decisões do Usuário & Alinhamento Crítico

> [!IMPORTANT]
> Decisões confirmadas na etapa de alinhamento e aplicadas integralmente ao projeto:

- **Armazenamento de Fotos (Até 10 por veículo + Logo)**: Implementado com compressão otimizada em canvas no navegador (JPEG/WebP 85% com redimensionamento proporcional) para garantir sincronização rápida, alta fidelidade e persistência segura no Firestore e no cache local.
- **Navegação & Arquitetura**: Três abas dedicadas e proeminentes adicionadas na barra de navegação administrativa:
  1. **Histórico de Veículos** (paginado de 10 em 10, com busca por placa, CPF, antigo dono, comprador, cor, modelo, renavam).
  2. **Pessoas & Proprietários** (dossiê completo de compras, vendas, veículos vinculados e cadastro).
  3. **Log Geral de Auditoria** (registro imutável de todas as ações de entrada, despesa, venda, edição de contratos e configurações).
- **Editor de Contratos & Recibos**: Editor visual completo nas Configurações com personalização de papel timbrado (upload e posicionamento do logo da empresa, cabeçalho, margens, tipografia, rodapé, cláusulas e inserção de variáveis dinâmicas com preview em tempo real formato A4).
- **Terminologia Institucional**: Banimento total do termo "concessionária", adotando "Loja de Veículos", "Revendedora de Veículos" ou "VA Veículos".
- **Identidade e Endereço Padrão**: Sede padrão em Areial - PB com telefone de suporte DDD (83) e campos editáveis para endereço completo, CNPJ e WhatsApp oficial.

---

### 1. Visão Geral & Experiência do Produto

- **O que a solução entrega**: Uma suíte completa de gestão de estoque, vitrine de veículos e compliance documental, desenvolvida especificamente para o mercado brasileiro de revenda de veículos seminovos.
- **Público-Alvo**: Gestores, vendedores e clientes da VA Veículos em Areial - PB e região.
- **Valor Principal**: Transparência no ciclo de vida de cada automóvel (desde a entrada até a venda), controle rigoroso de margem e custos de pátio, emissão profissional de contratos timbrados e rastreabilidade total de operações.

---

### 2. Design Visual & Ajustes na Vitrine

- **Vitrine Limpa & Focada (Showroom)**:
  - Remoção de qualquer menção a "concessionária".
  - Remoção dos selos/"badges" de Repasse e Garantia nos cards de veículos da vitrine pública.
  - Remoção da calculadora de simulação de financiamento do modal de detalhes do veículo, priorizando a ficha técnica, galeria de até 10 fotos em alta resolução, valor à vista e canal direto de atendimento WhatsApp Areial-PB (DDD 83).
- **Diretrizes Visuais (Tailwind)**:
  - Fundo neutro sofisticado (`bg-neutral-900` / `bg-neutral-950` no dark mode e superfícies limpas), tipografia com números tabulares (`tabular-nums`) para todos os valores monetários e placas.
  - Zero pill enclosures estáticas: tags de metadados como Ano/Modelo, Câmbio e Combustível exibidas com separadores tipográficos limpos (`·`).
  - Botão de WhatsApp flutuante e CTAs com formato `(83) 9XXXX-XXXX` apontando para mensagens personalizadas com os dados do veículo.

---

### 3. Máscaras & Validações Padrão Brasil

Implementação de formatadores e máscaras de entrada em tempo real com validação algorítmica:
- **Moeda Brasileira (R$)**: Formatação monetária com digitação centesimal fluida (`R$ 45.000,00`).
- **CPF**: Formatação `000.000.000-00` com cálculo dos dígitos verificadores.
- **CNPJ**: Formatação `00.000.000/0001-00` com validação de dígitos verificadores.
- **CEP**: Formatação `58140-000` (padrão de Areial - PB e busca automática se necessário).
- **Telefone / WhatsApp**: Formatação `(83) 99999-9999` (DDD 83 por padrão).
- **Placa Veicular**: Compatibilidade simultânea com o padrão Mercosul (`ABC1D23`) e padrão antigo (`ABC-1234`).
- **RENAVAM**: Formatação e validação com 11 dígitos numéricos (`00000000000`).

---

### 4. Editor Visual de Contratos & Papel Timbrado

Localizado na aba **Configurações**:
- **Configurador de Papel Timbrado**:
  - Upload e preview do logotipo da VA Veículos.
  - Alinhamento de cabeçalho (esquerda, centro, direita), altura do logo e espaçamento de margens superiores/inferiores.
  - Dados cadastrais do cabeçalho: Razão Social, Nome Fantasia, CNPJ, Endereço completo em Areial-PB, Telefone/WhatsApp (83).
  - Rodapé customizável com dados da empresa, numeração de páginas e linha de assinatura para as partes.
- **Editor Visual dos Modelos**:
  - Seleção entre: Recibo de Compra, Contrato de Compra e Venda, Recibo de Venda, Termo de Entrega/Garantia.
  - Editor de texto estruturado com inserção com 1 clique de variáveis dinâmicas:
    - `{nome_loja}`, `{cnpj_loja}`, `{endereco_loja}`, `{cidade_loja}`, `{telefone_loja}`
    - `{proprietario_nome}`, `{proprietario_cpf}`, `{proprietario_rg}`, `{proprietario_endereco}`
    - `{comprador_nome}`, `{comprador_cpf}`, `{comprador_rg}`, `{comprador_endereco}`
    - `{veiculo_marca}`, `{veiculo_modelo}`, `{veiculo_ano}`, `{veiculo_placa}`, `{veiculo_chassi}`, `{veiculo_renavam}`, `{veiculo_cor}`, `{veiculo_km}`
    - `{valor_compra}`, `{valor_venda}`, `{forma_pagamento}`, `{data_atual}`
  - Modo visualização dividida (Split-View): editor de conteúdo à esquerda e visualização em tempo real de folha A4 timbrada à direita, com botão de impressão e restauração de modelos padrão.

---

### 5. Novas Abas Administrativas & Ciclo de Vida

#### A. Histórico de Movimentação dos Veículos
- Tabela paginada (10 itens por página) exibindo todo o histórico do veículo:
  - Data de entrada e usuário/vendedor que cadastrou.
  - Antigo proprietário vinculado.
  - Histórico de custos e despesas de pátio adicionadas.
  - Situação atual (Em Estoque / Vendido / Reservado).
  - Dados de saída: Data da venda, comprador, valor final e vendedor responsável.
- Barra de busca global rápida por: **Placa, Modelo, Antigo Dono, CPF do Dono, Cor, RENAVAM ou Comprador**.
- Modal de **Ficha Completa / Dossiê do Veículo** com linha do tempo visual de todos os acontecimentos desde o dia 1.

#### B. Pessoas & Proprietários (CRM / Dossiê de Clientes)
- Lista e busca detalhada por Nome, CPF, Telefone ou Cidade.
- Ficha individual de cada pessoa contendo:
  - Dados cadastrais completos (CPF, RG, Telefone, WhatsApp, Endereço).
  - Veículos que a pessoa **vendeu** para a loja (entradas).
  - Veículos que a pessoa **comprou** da loja (saídas).
  - Total financeiro movimentado com a empresa.
  - Contratos e recibos emitidos em que a pessoa participou.

#### C. Log Geral de Auditoria (Audit Trail)
- Registro imutável de todas as operações do sistema:
  - `ENTRADA_VEICULO`, `EDICAO_VEICULO`, `DESPESA_PATIO`, `VENDA_VEICULO`, `ALTERACAO_CONFIGURACOES`, `EDICAO_MODELO_CONTRATO`, `EXCLUSAO_REGISTRO`.
- Cada registro armazena:
  - Timestamp exato da ocorrência.
  - Usuário que realizou a ação (Nome e Papel).
  - Categoria e descrição clara em português.
  - Detalhes/metadados da alteração (ex: placa do carro, valor, campos alterados).
- Filtros por período, tipo de ação e usuário, com opção de busca textual e exportação/impressão.

---

### 6. Arquitetura Técnica & Banco de Dados Firebase

```
┌────────────────────────────────────────────────────────────────────────┐
│                             VA VEÍCULOS                                │
│                     (Areial - PB · DDD 83)                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌──────────────────┐    ┌───────────────────────┐    ┌──────────────────────┐
│  Vitrine Pública │    │ Painel Administrativo │    │  Central de Auditoria│
│  · Galeria (10x) │    │  · Estoque & Vendas   │    │  · Log Geral Global  │
│  · Sem Financiamento│  · Histórico (10 p/ pág)│    │  · Trilha Imutável   │
│  · Sem Badges Rep│    │  · Dossiê de Pessoas  │    │  · Rastreabilidade   │
│  · WhatsApp 83   │    │  · Editor de Contratos│    │  · Eventos do Sistema│
└────────┬─────────┘    └───────────┬───────────┘    └──────────┬───────────┘
         │                          │                           │
         └──────────────────────────┼───────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Camada de Serviços & Mascaras BR                     │
│    (formatters.ts · auditLogger.ts · contractEngine.ts · imageOpt.ts)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Sincronização & Persistência Firebase Firestore           │
│   · Coleções: store_config, vehicles, owners, sales, audit_logs        │
│   · Compressão de fotos (até 10 por veículo) + Logotipo da Loja        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 7. Plano de Verificação & Testes

1. **Testes de Máscaras e Formatação**:
   - Digitação de valores monetários no campo de compra/venda com verificação de formato R$ 0,00.
   - Digitação de CPFs, CNPJs e CEPs com preenchimento assistido e pontuação automática.
   - Digitação de telefones com prefixo (83) e validação de 9 dígitos.
2. **Testes da Vitrine e Detalhes**:
   - Garantir que nenhum termo "concessionária" é exibido.
   - Verificar ausência de bloco de simulação de financiamento e ausência de badges de repasse/garantia.
   - Confirmar link direto para WhatsApp com DDD 83 e endereço padrão "Areial - PB".
3. **Testes do Editor de Contratos e Papel Timbrado**:
   - Alterar cabeçalho, logo e rodapé nas configurações e conferir a pré-visualização em tempo real na folha A4.
   - Gerar um recibo/contrato e checar a substituição correta de todas as variáveis `{tags}`.
4. **Testes do Histórico e Dossiê de Pessoas**:
   - Filtrar 10 veículos por página e verificar paginação anterior/próxima.
   - Buscar por placa, CPF e antigo dono.
   - Abrir a página de uma pessoa e inspecionar suas vendas e compras vinculadas.
5. **Testes de Auditoria (Log Geral)**:
   - Realizar uma ação (ex: cadastrar despesa ou alterar veículo) e verificar a entrada imediata no Log Geral com data/hora e detalhes.
6. **Compilação e Linter**:
   - Executar `npm run lint` e `compile_applet` para assegurar integridade estrutural e tipagem TypeScript sem erros.
