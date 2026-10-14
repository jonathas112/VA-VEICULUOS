# Plano de Correção e Blindagem Sistêmica (VA Veículos)

Plano de ação para correção individual e sequencial de cada uma das falhas técnicas e conflitos de integridade detectados no laudo de auditoria do sistema VA Veículos.

---

### Decisões e Diretrizes de Engenharia

> [!IMPORTANT]
> - Cada correção será realizada em sua respectiva camada (utilitários, componentes e camada de persistência), sem alterar os fluxos aprovados no laudo.
> - Nenhum dado existente em estoque, vendas ou histórico será perdido.
> - Ao término das correções, o script de auditoria automatizada (`scripts/run_system_audit.ts`) será reexecutado para validar o atestado de 100% de aprovação (zero FAIL).

---

## 1. Visão Geral das Etapas de Correção

O plano está estruturado para corrigir as pendências em ordem de prioridade de integridade:

```
┌────────────────────────────────────────────────────────┐
│ ETAPA 1: Utilitário de Extenso Monetário              │
│ - Correção de negativos e centavos em numberToWords    │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ ETAPA 2: Blindagem contra NaN nos Formulários          │
│ - Checagem estrita de isNaN() em custos e vendas       │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ ETAPA 3: Bloqueio de Placas Duplicadas                 │
│ - Validação no VehicleEntryModal e storageService      │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ ETAPA 4: Trava contra Re-venda de Veículo Vendido      │
│ - Verificação no VehicleSaleModal e storageService     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ ETAPA 5: Proteção Contábil de Vendas Órfãs             │
│ - Preservação de custos ao excluir veículos            │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ ETAPA 6: Validação de Consistência Entrada/Venda       │
│ - Trava para valorEntrada <= valorVenda no modal       │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ ETAPA 7: Re-auditoria Automatizada & Certificação      │
│ - Execução do script com 100% PASS                     │
└────────────────────────────────────────────────────────┘
```

---

## 2. Detalhamento de Cada Correção

### Etapa 1: Correção do Conversor de Valores por Extenso (`numberToWordsPtBr`)
* **Problema identificado**: Valores negativos retornavam `" reais"` e centavos isolados (ex.: R$ 0,75) retornavam `" reais e setenta e cinco centavos"` com espaço inicial vazio.
* **Ação**:
  * Adicionar tratamento no início da função para números negativos: se `num < 0`, calcular o extenso de `Math.abs(num)` e prefixar com `"menos "`.
  * Se a parte inteira for `0` e houver centavos (`num < 1`), retornar apenas os centavos por extenso (ex.: `"setenta e cinco centavos"`).
  * Garantir compatibilidade com contratos, notas e recibos de compra e venda.

### Etapa 2: Blindagem Estrita contra Valores `NaN` nos Formulários
* **Problema identificado**: Validações como `valor <= 0` avaliam como `false` quando o valor é `NaN` no JavaScript, permitindo gravar despesas e vendas corrompidas.
* **Ação**:
  * Em `src/components/management/VehicleCostsModal.tsx`: substituir `if (!descricao || valor <= 0)` por `if (!descricao.trim() || isNaN(valor) || valor <= 0)`.
  * Em `src/components/management/VehicleSaleModal.tsx`: substituir `if (valorVenda <= 0)` por `if (isNaN(valorVenda) || valorVenda <= 0)` e validar também `isNaN(valorEntrada) || valorEntrada < 0`.
  * Em `src/components/management/PendingCommissionsView.tsx`: substituir `if (amount < 0)` por `if (isNaN(amount) || amount < 0)`.

### Etapa 3: Validação e Bloqueio de Placas Duplicadas no Estoque
* **Problema identificado**: O `VehicleEntryModal` não recebia os veículos existentes e o `storageService.addVehicle` permitia cadastrar dois veículos diferentes com a mesma placa.
* **Ação**:
  * Em `src/components/management/VehicleEntryModal.tsx`: passar prop `vehicles: Vehicle[]` e adicionar checagem de duplicidade:
    * Se `vehicles.some(v => v.status === 'em_estoque' && normalizePlate(v.placa) === normalizePlate(placa))`, emitir alerta impeditivo informando que a placa já está cadastrada no estoque da loja.
  * Em `src/services/storage.ts`: no método `addVehicle`, incluir salvaguarda para não duplicar veículo ativo de mesma placa.

### Etapa 4: Trava contra Re-venda de Veículo Já Vendido
* **Problema identificado**: O `VehicleSaleModal` não validava o status atual do veículo, abrindo brecha para sobrescrever vendas.
* **Ação**:
  * Em `src/components/management/VehicleSaleModal.tsx`: no início do `handleSubmit`, verificar se `vehicle.status === 'vendido'`. Caso positivo, alertar e cancelar o envio.
  * Em `src/services/storage.ts`: no método `addSale`, verificar se o veículo em questão já consta como vendido antes de registrar duplicidade.

### Etapa 5: Proteção Contábil contra Vendas Órfãs e Exclusão Indevida
* **Problema identificado**: A exclusão de um veículo que já possui histórico de venda zera seus custos de aquisição e pátio no `FinancialView`, inflando artificialmente o lucro líquido do período.
* **Ação**:
  * No `storageService.deleteVehicle`: verificar se o veículo possui vendas associadas em `getSales()`. Se possuir, bloquear a exclusão direta com aviso de que veículos vendidos devem ser mantidos para integridade fiscal e contábil da loja (ou preservar o snapshot de custo na própria venda).
  * No `FinancialView.tsx`: adicionar fallback contábil seguro para caso um veículo antigo não seja localizado, garantindo que o lucro não seja distorcido.

### Etapa 6: Consistência nos Valores de Financiamento e Entrada
* **Problema identificado**: Permitir `valorEntrada > valorVenda` sem aviso de inconsistência contábil.
* **Ação**:
  * No `VehicleSaleModal.tsx`: adicionar validação no `handleSubmit` impedindo que a entrada informada seja estritamente superior ao valor de venda negociado, orientando o usuário a ajustar o valor.

### Etapa 7: Re-execução da Auditoria e Atestado Final
* **Ação**:
  * Atualizar o script de auditoria `scripts/run_system_audit.ts` com as novas proteções.
  * Executar os testes via `npx tsx` e certificar que todos os 80+ testes atinjam status `PASS` com 0 erros e 0 conflitos.
