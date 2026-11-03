# Plano de Implementação: Conexão em Tempo Real com Firestore e Atualização Automática de Veículos

## 1. Diagnóstico do Problema Raiz

A auditoria da comunicação com o banco de dados identificou três fatores que explicam por que os veículos exibidos na tela ainda são os antigos:

1. **Coleção `vehicles_public` Vazia no Firestore:** A coleção `vehicles_public` na base `va-veiculos` possui atualmente zero documentos cadastrados na nuvem.
2. **Fallback Silencioso para Cache Local Antigo:** No método `syncFromFirestore()` (`src/services/storage.ts`), a verificação `if (remotePublicVehicles.length > 0)` não atualizava o armazenamento do navegador caso a nuvem estivesse vazia, mantendo congelados no `localStorage` do usuário os veículos gravados em sessões anteriores.
3. **Regras de Permissão de Leitura:** Em `firestore.rules`, a coleção `vehicles` completa exige `isStaff()` (`request.auth != null`), bloqueando visitantes anônimos ou usuários que ainda não autenticaram no provedor de nuvem, impedindo que a vitrine receba dados caso a coleção pública não esteja populada.

---

## 2. Solução Proposta

Implementar uma arquitetura onde o **Firestore é consultado prioritariamente**, garantindo que:
- A vitrine pública leia os veículos diretamente do Firestore sem depender de sessão ou login;
- Os dados remotos do Firestore atualizem automaticamente o estado da tela e sincronizem o cache local (`localStorage`);
- A base na nuvem seja populada com todos os 9 veículos da apresentação;
- Seja adicionada proteção contra dados obsoletos em cache no navegador.

---

## 3. Etapas de Execução

### Etapa 1: Ajuste de Permissões no `firestore.rules` e Deploy
- **Arquivo:** `/firestore.rules`
- **Ações:**
  - Garantir que a coleção `vehicles_public` tenha `allow read: if true;` irrestrito para vitrine pública.
  - Permitir que a vitrine também possa consultar os veículos com status `'em_estoque'` em caso de transição direta, ou permitir gravação administrativa/seeding inicial.
  - Executar o deploy imediato das regras via ferramenta `deploy_firebase`.

### Etapa 2: Povoamento Real no Firestore (`va-veiculos`)
- **Arquivo / Script:** `scripts/seed_firestore_live.ts`
- **Ações:**
  - Gravar diretamente no Firestore os 9 veículos na coleção `vehicles_public` (sem dados confidenciais de aquisição) e na coleção `vehicles`.
  - Gravar os dados do perfil da loja (`store_config/main`).
  - Executar o script e validar que `getDocs(collection(db, 'vehicles_public'))` retorna os 9 veículos ativos.

### Etapa 3: Leitura em Tempo Real e Reconciliação no Frontend
- **Arquivos:** `src/services/firebase.ts`, `src/services/storage.ts` e `src/App.tsx`
- **Ações:**
  - Criar método de listener/busca em tempo real (`fetchLiveVehicles` / `subscribeToPublicVehicles`) no `firebase.ts`.
  - No `App.tsx`, priorizar a renderização imediata vinda do Firestore assim que o componente é montado.
  - No `storage.ts`, caso os dados do Firestore sejam recebidos com sucesso, atualizar imediatamente o estado de `publicVehicles` e reescrever o cache do `localStorage`, substituindo os dados defasados.
  - Adicionar controle de versão de dados (`DATA_VERSION = '2026.11.03.v2'`) para invalidar e limpar automaticamente caches locais legados quando o usuário abrir a página.

### Etapa 4: Indicador Visual e Botão de Atualização Manual
- **Arquivos:** `src/components/showroom/ShowroomView.tsx` e `src/components/navigation/Topbar.tsx`
- **Ações:**
  - Adicionar um botão discreto de "Atualizar Catálogo" na vitrine pública e no topo da gestão, permitindo ao usuário/apresentador forçar a releitura imediata do Firestore com 1 clique caso necessário.
  - Exibir badge sutil indicando "Catálogo Conectado à Nuvem".

---

## 4. Validação e Testes
1. Executar consulta ao Firestore via Node.js para garantir que `vehicles_public` retorna 9 registros.
2. Limpar o cache local e verificar se a vitrine renderiza instantaneamente os 9 veículos novos (incluindo BMW 320i, Hilux SRX, Jeep Compass, Fiat Pulse, MT-07, etc.).
3. Executar `lint_applet` e `compile_applet` para assegurar build sem erros.
