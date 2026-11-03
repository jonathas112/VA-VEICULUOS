import { 
  StoreProfile, Financier, Salesperson, ContractTemplate, 
  FormerOwner, Vehicle, Sale, VehicleExpense, PostSaleCost,
  AuditActionType, SystemUser, UserRole 
} from '../types';
import { 
  SEED_STORE, SEED_FINANCIERS, SEED_SALESPEOPLE, 
  SEED_OWNERS, SEED_VEHICLES, SEED_SALES, SEED_USERS 
} from '../data/seedData';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { auditLogger } from './auditLogger';
import { firebaseDb, ConcurrencyConflictError } from './firebase';
import {
  hashPassword,
  isHashedPassword,
  verifyPassword,
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  sanitizeInputText,
  sanitizeContractText,
  sanitizePublicVehicle
} from '../utils/security';
import {
  roundCurrency,
  normalizePlate,
  validateSaleFinancials,
  toCents,
  isValidPlate,
  isValidVehicleYears
} from '../utils/formatters';

export { ConcurrencyConflictError };

export type SyncCollectionName =
  | 'store'
  | 'financiers'
  | 'salespeople'
  | 'users'
  | 'templates'
  | 'owners'
  | 'vehicles'
  | 'sales';

export interface PendingSyncOperation {
  key: string;
  collection: SyncCollectionName;
  action: 'upsert' | 'delete';
  entityId: string;
  payload?: any;
  queuedAt: string;
}

export interface CommissionAssignOptions {
  expectedVersion?: number;
  requirePending?: boolean;
}

const STORAGE_KEYS = {
  STORE: 'vaveiculos_store_v2',
  FINANCIERS: 'vaveiculos_financiers_v2',
  SALESPEOPLE: 'vaveiculos_salespeople_v2',
  USERS: 'vaveiculos_users_v2',
  TEMPLATES: 'vaveiculos_templates_v2',
  OWNERS: 'vaveiculos_owners_v2',
  VEHICLES: 'vaveiculos_vehicles_v2',
  PUBLIC_VEHICLES: 'vaveiculos_public_vehicles_v2',
  SALES: 'vaveiculos_sales_v2',
  ACTIVE_ROLE: 'vaveiculos_active_role_v2',
  ACTIVE_SELLER_ID: 'vaveiculos_active_seller_id_v2',
  PENDING_SYNC: 'vaveiculos_pending_sync_v1'
};

const AUDIT_STORAGE_KEY = 'vaveiculos_audit_logs_v1';

// Fallback resiliente em memória caso o navegador atinja QuotaExceededError (~5 MB) ou bloqueie Web Storage
const memoryFallbackStore = new Map<string, string>();

function reclaimStorageQuota(): void {
  try {
    const rawLogs = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (rawLogs) {
      const parsedLogs = JSON.parse(rawLogs);
      if (Array.isArray(parsedLogs) && parsedLogs.length > 50) {
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(parsedLogs.slice(0, 50)));
      }
    }
  } catch {
    // Ignora falha durante limpeza preventiva de logs
  }

  try {
    const rawPublic = localStorage.getItem(STORAGE_KEYS.PUBLIC_VEHICLES);
    if (rawPublic) {
      const parsedPublic: Vehicle[] = JSON.parse(rawPublic);
      if (Array.isArray(parsedPublic)) {
        const compacted = parsedPublic.map(v => ({
          ...v,
          fotos: Array.isArray(v.fotos) ? v.fotos.slice(0, 1) : []
        }));
        localStorage.setItem(STORAGE_KEYS.PUBLIC_VEHICLES, JSON.stringify(compacted));
      }
    }
  } catch {
    // Ignora falha durante compactação de miniaturas públicas
  }
}

function safeGetItem(key: string): string | null {
  if (memoryFallbackStore.has(key)) {
    return memoryFallbackStore.get(key) ?? null;
  }
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function hasExplicitLocalKey(key: string): boolean {
  return safeGetItem(key) !== null;
}

function safeSetItem(key: string, value: string): 'localStorage' | 'memory' {
  if (typeof localStorage === 'undefined') {
    memoryFallbackStore.set(key, value);
    return 'memory';
  }
  try {
    localStorage.setItem(key, value);
    memoryFallbackStore.delete(key);
    return 'localStorage';
  } catch {
    reclaimStorageQuota();
    try {
      localStorage.setItem(key, value);
      memoryFallbackStore.delete(key);
      return 'localStorage';
    } catch (quotaErr) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignora caso storage esteja em modo somente leitura / bloqueado
      }
      memoryFallbackStore.set(key, value);
      console.warn(`Cota de localStorage excedida na chave "${key}"; persistência em memória ativada sem perda de dados.`, quotaErr);
      return 'memory';
    }
  }
}

const CURRENT_DATA_VERSION = 'vaveiculos_presentation_2026_11_v3';
const DATA_VERSION_KEY = 'vaveiculos_cache_data_version';

function checkAndInvalidateLegacyCache(): void {
  try {
    const existingVer = safeGetItem(DATA_VERSION_KEY);
    if (existingVer !== CURRENT_DATA_VERSION) {
      safeSetItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
      safeSetItem(STORAGE_KEYS.VEHICLES, JSON.stringify(SEED_VEHICLES));
      safeSetItem(STORAGE_KEYS.PUBLIC_VEHICLES, JSON.stringify(SEED_VEHICLES.map(sanitizePublicVehicle)));
      safeSetItem(STORAGE_KEYS.STORE, JSON.stringify(SEED_STORE));
      safeSetItem(STORAGE_KEYS.FINANCIERS, JSON.stringify(SEED_FINANCIERS));
      safeSetItem(STORAGE_KEYS.SALESPEOPLE, JSON.stringify(SEED_SALESPEOPLE));
      safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      safeSetItem(STORAGE_KEYS.OWNERS, JSON.stringify(SEED_OWNERS));
      safeSetItem(STORAGE_KEYS.SALES, JSON.stringify(SEED_SALES));
    }
  } catch {
    // Silencioso em caso de restrição de storage
  }
}
checkAndInvalidateLegacyCache();

function assertNoVersionConflict(
  entityLabel: string,
  existing: { version?: number; atualizadoEm?: string },
  incoming: { version?: number; atualizadoEm?: string }
): void {
  const hasVersionConflict =
    typeof incoming.version === 'number' &&
    typeof existing.version === 'number' &&
    incoming.version < existing.version;

  const hasTimestampConflict =
    incoming.version === undefined &&
    existing.version !== undefined &&
    Boolean(incoming.atualizadoEm) &&
    Boolean(existing.atualizadoEm) &&
    String(incoming.atualizadoEm) < String(existing.atualizadoEm);

  if (hasVersionConflict || hasTimestampConflict) {
    const msg =
      `Conflito de Concorrência: O registro "${entityLabel}" já foi alterado simultaneamente por outro usuário ` +
      `(versão atual: v${existing.version ?? 1}, sua versão: v${incoming.version ?? 0}). ` +
      `Os dados foram recarregados para evitar sobrescrita acidental.`;
    console.warn(msg);
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(msg);
    }
    throw new ConcurrencyConflictError(msg, incoming.version, existing.version);
  }
}

function getPendingSyncQueue(): PendingSyncOperation[] {
  try {
    const raw = safeGetItem(STORAGE_KEYS.PENDING_SYNC);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingSyncQueue(ops: PendingSyncOperation[]): void {
  safeSetItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(ops));
}

function enqueuePendingSync(op: Omit<PendingSyncOperation, 'key' | 'queuedAt'>): PendingSyncOperation {
  const key = `${op.collection}:${op.entityId}`;
  const queuedAt = new Date().toISOString();
  const nextEntry: PendingSyncOperation = {
    ...op,
    key,
    queuedAt
  };
  const queue = getPendingSyncQueue().filter(item => item.key !== key);
  queue.push(nextEntry);
  savePendingSyncQueue(queue);
  return nextEntry;
}

function dequeuePendingSync(key: string, expectedQueuedAt?: string): void {
  const current = getPendingSyncQueue();
  const filtered = current.filter(item => {
    if (item.key !== key) return true;
    if (expectedQueuedAt && item.queuedAt !== expectedQueuedAt) return true;
    return false;
  });
  if (filtered.length !== current.length) {
    savePendingSyncQueue(filtered);
  }
}

function dispatchCloudSync(
  op: Omit<PendingSyncOperation, 'key' | 'queuedAt'>,
  executor: () => Promise<boolean>
): void {
  const queued = enqueuePendingSync(op);
  executor()
    .then(ok => {
      if (ok) {
        dequeuePendingSync(queued.key, queued.queuedAt);
      }
    })
    .catch(err => {
      if (err instanceof ConcurrencyConflictError) {
        console.warn('Conflito de concorrência remoto bloqueado pelo Firestore:', err.message);
        dequeuePendingSync(queued.key, queued.queuedAt);
      } else {
        console.warn(`Operação mantida na fila de sincronização offline (${op.collection}/${op.entityId}):`, err);
      }
    });
}

function isLocalEntityNewer<T extends { version?: number; atualizadoEm?: string }>(
  localItem: T,
  remoteItem: T,
  hasPendingLocalUpsert: boolean
): boolean {
  const localVer = typeof localItem.version === 'number' ? localItem.version : 0;
  const remoteVer = typeof remoteItem.version === 'number' ? remoteItem.version : 0;
  if (localVer !== remoteVer) {
    return localVer > remoteVer;
  }

  const localTs = localItem.atualizadoEm ? Date.parse(localItem.atualizadoEm) : 0;
  const remoteTs = remoteItem.atualizadoEm ? Date.parse(remoteItem.atualizadoEm) : 0;
  if (Number.isFinite(localTs) && Number.isFinite(remoteTs) && localTs !== remoteTs) {
    return localTs > remoteTs;
  }

  return hasPendingLocalUpsert;
}

function mergeEntitiesByFreshness<T extends { id: string; version?: number; atualizadoEm?: string }>(
  storageKey: string,
  localList: T[],
  remoteList: T[],
  collection: SyncCollectionName
): T[] {
  const pendingOps = getPendingSyncQueue().filter(op => op.collection === collection);
  const pendingDeleteIds = new Set(
    pendingOps.filter(op => op.action === 'delete').map(op => op.entityId)
  );
  const pendingUpsertIds = new Set(
    pendingOps.filter(op => op.action === 'upsert').map(op => op.entityId)
  );

  if (remoteList.length === 0) {
    return localList.filter(item => !pendingDeleteIds.has(item.id));
  }

  if (!hasExplicitLocalKey(storageKey)) {
    return remoteList.filter(item => !pendingDeleteIds.has(item.id));
  }

  const remoteById = new Map<string, T>();
  for (const r of remoteList) {
    if (!pendingDeleteIds.has(r.id)) {
      remoteById.set(r.id, r);
    }
  }

  const merged: T[] = [];
  const seenIds = new Set<string>();

  for (const localItem of localList) {
    if (pendingDeleteIds.has(localItem.id)) continue;

    const remoteItem = remoteById.get(localItem.id);
    if (!remoteItem) {
      if (pendingUpsertIds.has(localItem.id)) {
        merged.push(localItem);
        seenIds.add(localItem.id);
      }
      continue;
    }

    const keepLocal = isLocalEntityNewer(
      localItem,
      remoteItem,
      pendingUpsertIds.has(localItem.id)
    );
    const chosen = keepLocal ? { ...localItem } : { ...remoteItem };
    if (collection === 'vehicles') {
      const locV = localItem as unknown as Vehicle;
      const remV = remoteItem as unknown as Vehicle;
      const chosenV = chosen as unknown as Vehicle;
      const seenExpenseIds = new Set((chosenV.custosPatio || []).map(e => e.id));
      const allExpenses = [...(chosenV.custosPatio || [])];
      for (const exp of [...(locV.custosPatio || []), ...(remV.custosPatio || [])]) {
        if (exp && exp.id && !seenExpenseIds.has(exp.id)) {
          allExpenses.push(exp);
          seenExpenseIds.add(exp.id);
        }
      }
      chosenV.custosPatio = allExpenses;
    }
    merged.push(chosen);
    seenIds.add(localItem.id);
  }

  for (const remoteItem of remoteList) {
    if (!seenIds.has(remoteItem.id) && !pendingDeleteIds.has(remoteItem.id)) {
      merged.push(remoteItem);
      seenIds.add(remoteItem.id);
    }
  }

  return merged;
}

function validateVehicleIntegrity(vehicle: Vehicle): void {
  if (!vehicle.marca?.trim() || !vehicle.modelo?.trim()) {
    const msg = 'Marca e modelo do veículo são obrigatórios.';
    if (typeof window !== 'undefined' && window.alert) window.alert(msg);
    throw new Error(msg);
  }
  if (!isValidPlate(vehicle.placa || '')) {
    const msg = 'Placa inválida. Utilize o padrão Mercosul (ABC1D23) ou tradicional (ABC-1234).';
    if (typeof window !== 'undefined' && window.alert) window.alert(msg);
    throw new Error(msg);
  }
  const yearCheck = isValidVehicleYears(vehicle.anoFabricacao, vehicle.anoModelo);
  if (!yearCheck.valid) {
    const msg = yearCheck.error || 'Ano de fabricação ou modelo inválido.';
    if (typeof window !== 'undefined' && window.alert) window.alert(msg);
    throw new Error(msg);
  }
  const rawKm = Number(vehicle.quilometragem);
  if (!Number.isFinite(rawKm) || rawKm < 0 || rawKm > 2_000_000) {
    const msg = 'A quilometragem do veículo não pode ser negativa ou superior a 2.000.000 km.';
    if (typeof window !== 'undefined' && window.alert) window.alert(msg);
    throw new Error(msg);
  }
  if (!Number.isFinite(Number(vehicle.valorPago)) || toCents(vehicle.valorPago) <= 0) {
    const msg = 'O valor pago na aquisição do veículo deve ser maior que zero.';
    if (typeof window !== 'undefined' && window.alert) window.alert(msg);
    throw new Error(msg);
  }
  if (!Number.isFinite(Number(vehicle.valorAnunciado)) || toCents(vehicle.valorAnunciado) <= 0) {
    const msg = 'O valor anunciado do veículo deve ser maior que zero.';
    if (typeof window !== 'undefined' && window.alert) window.alert(msg);
    throw new Error(msg);
  }
  if (vehicle.debitoDetran?.temDebito && (!Number.isFinite(Number(vehicle.debitoDetran.valor)) || toCents(vehicle.debitoDetran.valor) <= 0)) {
    const msg = 'Informe um valor positivo válido para o débito do DETRAN.';
    if (typeof window !== 'undefined' && window.alert) window.alert(msg);
    throw new Error(msg);
  }
}

function normalizeVehicleRecord(vehicle: Vehicle): Vehicle {
  const hasDebt = Boolean(vehicle.debitoDetran && vehicle.debitoDetran.temDebito);
  return {
    ...vehicle,
    marca: sanitizeInputText(vehicle.marca),
    modelo: sanitizeInputText(vehicle.modelo),
    versao: sanitizeInputText(vehicle.versao || ''),
    cor: sanitizeInputText(vehicle.cor || ''),
    placa: sanitizeInputText(vehicle.placa),
    chassi: sanitizeInputText(vehicle.chassi || ''),
    renavam: sanitizeInputText(vehicle.renavam || ''),
    valorPago: roundCurrency(Math.max(0, Number(vehicle.valorPago) || 0)),
    valorAnunciado: roundCurrency(Math.max(0, Number(vehicle.valorAnunciado) || 0)),
    quilometragem: Math.max(0, Math.round(Number(vehicle.quilometragem) || 0)),
    debitoDetran: vehicle.debitoDetran
      ? {
          ...vehicle.debitoDetran,
          temDebito: hasDebt,
          valor: hasDebt ? roundCurrency(Math.max(0, Number(vehicle.debitoDetran.valor) || 0)) : 0,
          quemArca: hasDebt ? vehicle.debitoDetran.quemArca : 'nenhum',
          descricao: vehicle.debitoDetran.descricao ? sanitizeInputText(vehicle.debitoDetran.descricao) : undefined
        }
      : { temDebito: false, valor: 0, quemArca: 'nenhum' },
    custosPatio: Array.isArray(vehicle.custosPatio)
      ? vehicle.custosPatio.map(c => ({
          ...c,
          descricao: sanitizeInputText(c.descricao),
          responsavel: c.responsavel ? sanitizeInputText(c.responsavel) : undefined,
          valor: roundCurrency(Math.max(0, Number(c.valor) || 0))
        }))
      : []
  };
}

export const storageService = {
  isUsingMemoryFallback(): boolean {
    return memoryFallbackStore.size > 0;
  },
  clearMemoryFallback(): void {
    memoryFallbackStore.clear();
  },
  getPendingSyncOperations(): PendingSyncOperation[] {
    return getPendingSyncQueue();
  },
  clearPendingSyncQueue(): void {
    savePendingSyncQueue([]);
  },

  // Store Profile
  getStoreProfile(): StoreProfile {
    try {
      const data = safeGetItem(STORAGE_KEYS.STORE);
      if (!data) return SEED_STORE;
      const profile: StoreProfile = JSON.parse(data);
      if (profile.nomeFantasia && /\bteste\b/i.test(profile.nomeFantasia)) {
        profile.nomeFantasia = profile.nomeFantasia.replace(/\s*\bteste\b\s*/gi, ' ').trim();
        safeSetItem(STORAGE_KEYS.STORE, JSON.stringify(profile));
      }
      return profile;
    } catch {
      return SEED_STORE;
    }
  },
  saveStoreProfile(profile: StoreProfile, user = 'Gestor Geral'): void {
    const existing = this.getStoreProfile();
    const nowIso = new Date().toISOString();
    const safeProfile: StoreProfile = {
      ...profile,
      nomeFantasia: sanitizeInputText(profile.nomeFantasia).replace(/\s*\bteste\b\s*/gi, ' ').trim(),
      razaoSocial: sanitizeInputText(profile.razaoSocial),
      cnpj: sanitizeInputText(profile.cnpj),
      endereco: sanitizeInputText(profile.endereco),
      cidade: sanitizeInputText(profile.cidade),
      estado: sanitizeInputText(profile.estado),
      cep: profile.cep ? sanitizeInputText(profile.cep) : undefined,
      telefone: sanitizeInputText(profile.telefone),
      whatsapp: sanitizeInputText(profile.whatsapp),
      chavePix: sanitizeInputText(profile.chavePix),
      site: sanitizeInputText(profile.site),
      papelTimbrado: profile.papelTimbrado
        ? {
            ...profile.papelTimbrado,
            textoRodape: profile.papelTimbrado.textoRodape
              ? sanitizeInputText(profile.papelTimbrado.textoRodape)
              : undefined
          }
        : undefined,
      version: (existing.version ?? 0) + 1,
      atualizadoEm: nowIso
    };
    safeSetItem(STORAGE_KEYS.STORE, JSON.stringify(safeProfile));
    
    // Audit log
    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'sistema',
      usuarioNome: user,
      descricao: `Atualizou as configurações da loja VA Veículos (Endereço: ${safeProfile.endereco}, ${safeProfile.cidade}-${safeProfile.estado}).`,
      detalhes: { cnpj: safeProfile.cnpj, whatsapp: safeProfile.whatsapp, cidade: safeProfile.cidade }
    });

    // Sync to Firestore with offline outbox
    dispatchCloudSync(
      { collection: 'store', action: 'upsert', entityId: 'main', payload: safeProfile },
      () => firebaseDb.saveStoreProfile(safeProfile)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
  },

  // Financiers
  getFinanciers(): Financier[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.FINANCIERS);
      return data ? JSON.parse(data) : SEED_FINANCIERS;
    } catch {
      return SEED_FINANCIERS;
    }
  },
  saveFinanciers(financiers: Financier[]): void {
    safeSetItem(STORAGE_KEYS.FINANCIERS, JSON.stringify(financiers));
  },
  addFinancier(financier: Financier, user = 'Gestor Geral'): void {
    const stamped: Financier = {
      ...financier,
      version: financier.version ?? 1,
      atualizadoEm: new Date().toISOString()
    };
    const list = this.getFinanciers();
    list.push(stamped);
    this.saveFinanciers(list);

    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'financeiro',
      usuarioNome: user,
      descricao: `Cadastrou a financeira: "${stamped.nome}" (Taxa: ${stamped.taxaMedia || 1.49}% a.m.).`,
      detalhes: { id: stamped.id, nome: stamped.nome, taxaMedia: stamped.taxaMedia }
    });

    dispatchCloudSync(
      { collection: 'financiers', action: 'upsert', entityId: stamped.id, payload: stamped },
      () => firebaseDb.saveFinancier(stamped)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  saveFinancier(financier: Financier, user = 'Gestor Geral'): void {
    const list = this.getFinanciers();
    const idx = list.findIndex(f => f.id === financier.id);
    const nowIso = new Date().toISOString();
    let stamped: Financier;
    if (idx >= 0) {
      const existing = list[idx];
      stamped = {
        ...existing,
        ...financier,
        version: (existing.version ?? 1) + 1,
        atualizadoEm: nowIso
      };
      list[idx] = stamped;
    } else {
      stamped = {
        ...financier,
        version: financier.version ?? 1,
        atualizadoEm: nowIso
      };
      list.push(stamped);
    }
    this.saveFinanciers(list);

    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'financeiro',
      usuarioNome: user,
      descricao: `Atualizou os dados da financeira: "${stamped.nome}".`,
      detalhes: { id: stamped.id, nome: stamped.nome, status: stamped.ativa ?? stamped.ativo }
    });

    dispatchCloudSync(
      { collection: 'financiers', action: 'upsert', entityId: stamped.id, payload: stamped },
      () => firebaseDb.saveFinancier(stamped)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  toggleFinancierStatus(id: string, user = 'Gestor Geral'): boolean {
    const list = this.getFinanciers();
    const target = list.find(f => f.id === id);
    if (!target) return false;

    const currentActive = target.ativa !== false && target.ativo !== false;
    const newActive = !currentActive;
    target.ativa = newActive;
    target.ativo = newActive;
    target.version = (target.version ?? 1) + 1;
    target.atualizadoEm = new Date().toISOString();
    this.saveFinanciers(list);

    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'financeiro',
      usuarioNome: user,
      descricao: `${newActive ? 'Ativou' : 'Desativou'} a instituição financeira: "${target.nome}".`,
      detalhes: { id: target.id, novoStatus: newActive ? 'ativa' : 'desativada' }
    });

    dispatchCloudSync(
      { collection: 'financiers', action: 'upsert', entityId: target.id, payload: { ...target } },
      () => firebaseDb.saveFinancier(target)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },
  deleteFinancier(id: string, user = 'Gestor Geral'): boolean {
    const list = this.getFinanciers();
    const target = list.find(f => f.id === id);
    if (!target) return false;

    const updated = list.filter(f => f.id !== id);
    this.saveFinanciers(updated);

    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'financeiro',
      usuarioNome: user,
      descricao: `Removeu a instituição financeira: "${target.nome}".`,
      detalhes: { id: target.id, nome: target.nome }
    });

    dispatchCloudSync(
      { collection: 'financiers', action: 'delete', entityId: id },
      () => firebaseDb.deleteFinancier(id)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },

  // Salespeople (sem armazenamento de senhas em texto plano ou hashes)
  getSalespeople(): Salesperson[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.SALESPEOPLE);
      const rawList: Salesperson[] = data ? JSON.parse(data) : SEED_SALESPEOPLE;
      return rawList.map(({ senha: _omitted, ...safe }) => safe);
    } catch {
      return SEED_SALESPEOPLE;
    }
  },
  saveSalespeople(list: Salesperson[]): void {
    const safeList = list.map(({ senha: _omitted, ...safe }) => safe);
    safeSetItem(STORAGE_KEYS.SALESPEOPLE, JSON.stringify(safeList));
  },
  addSalesperson(salesperson: Salesperson, user = 'Gestor Geral'): void {
    const { senha: _omitted, ...rest } = salesperson;
    const safeSalesperson: Salesperson = {
      ...rest,
      version: rest.version ?? 1,
      atualizadoEm: new Date().toISOString()
    };
    const list = this.getSalespeople();
    list.push(safeSalesperson);
    this.saveSalespeople(list);

    const log = auditLogger.log({
      acao: 'CADASTRO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `Cadastrou o vendedor: "${safeSalesperson.nome}".`,
      detalhes: { id: safeSalesperson.id, nome: safeSalesperson.nome, email: safeSalesperson.email }
    });

    dispatchCloudSync(
      { collection: 'salespeople', action: 'upsert', entityId: safeSalesperson.id, payload: safeSalesperson },
      () => firebaseDb.saveSalesperson(safeSalesperson)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  saveSalesperson(salesperson: Salesperson, user = 'Gestor Geral'): void {
    const { senha: _omitted, ...safeSalesperson } = salesperson;
    const list = this.getSalespeople();
    const idx = list.findIndex(s => s.id === safeSalesperson.id);
    const nowIso = new Date().toISOString();
    let stamped: Salesperson;
    if (idx >= 0) {
      const existing = list[idx];
      stamped = {
        ...existing,
        ...safeSalesperson,
        version: (existing.version ?? 1) + 1,
        atualizadoEm: nowIso
      };
      list[idx] = stamped;
    } else {
      stamped = {
        ...safeSalesperson,
        version: safeSalesperson.version ?? 1,
        atualizadoEm: nowIso
      };
      list.push(stamped);
    }
    this.saveSalespeople(list);

    const log = auditLogger.log({
      acao: 'EDICAO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `Atualizou os dados do membro da equipe: "${stamped.nome}".`,
      detalhes: { id: stamped.id, nome: stamped.nome, ativo: stamped.ativo }
    });

    dispatchCloudSync(
      { collection: 'salespeople', action: 'upsert', entityId: stamped.id, payload: stamped },
      () => firebaseDb.saveSalesperson(stamped)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  toggleSalespersonStatus(id: string, user = 'Gestor Geral'): boolean {
    const list = this.getSalespeople();
    const target = list.find(s => s.id === id);
    if (!target) return false;

    const newActive = !(target.ativo !== false);
    target.ativo = newActive;
    target.version = (target.version ?? 1) + 1;
    target.atualizadoEm = new Date().toISOString();
    this.saveSalespeople(list);

    const log = auditLogger.log({
      acao: 'EDICAO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `${newActive ? 'Ativou' : 'Desativou'} o membro da equipe: "${target.nome}".`,
      detalhes: { id: target.id, novoStatus: newActive ? 'ativo' : 'desativado' }
    });

    dispatchCloudSync(
      { collection: 'salespeople', action: 'upsert', entityId: target.id, payload: { ...target } },
      () => firebaseDb.saveSalesperson(target)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },
  deleteSalesperson(id: string, user = 'Gestor Geral'): boolean {
    const list = this.getSalespeople();
    const target = list.find(s => s.id === id);
    if (!target) return false;

    const updated = list.filter(s => s.id !== id);
    this.saveSalespeople(updated);

    const log = auditLogger.log({
      acao: 'EDICAO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `Excluiu o membro da equipe: "${target.nome}".`,
      detalhes: { id: target.id, nome: target.nome }
    });

    dispatchCloudSync(
      { collection: 'salespeople', action: 'delete', entityId: id },
      () => firebaseDb.deleteSalesperson(id)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },

  // =========================================================================
  // GESTÃO DE USUÁRIOS E CREDENCIAIS (Gestores e Vendedores)
  // =========================================================================
  getUsers(): SystemUser[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.USERS);
      if (data) {
        const parsed: SystemUser[] = JSON.parse(data);
        let migrated = false;
        const normalized = parsed.map(u => {
          if (!isHashedPassword(u.senha)) {
            migrated = true;
            return {
              ...u,
              senha: hashPassword(u.senha || 'Va@2026!', u.email)
            };
          }
          return u;
        });
        if (migrated) {
          safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(normalized));
        }
        return normalized;
      }
      safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    } catch {
      return SEED_USERS;
    }
  },

  saveUsers(list: SystemUser[]): void {
    const safeList = list.map(u => ({
      ...u,
      senha: isHashedPassword(u.senha) ? u.senha : hashPassword(u.senha, u.email)
    }));
    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(safeList));
  },

  saveUser(user: SystemUser, currentUser = 'Gestor Geral'): SystemUser {
    const normalizedEmail = sanitizeInputText(user.email).toLowerCase();
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === user.id);
    const isNew = idx === -1;
    const nowIso = new Date().toISOString();

    const safeUser: SystemUser = {
      ...user,
      nome: sanitizeInputText(user.nome),
      email: normalizedEmail,
      telefone: user.telefone ? sanitizeInputText(user.telefone) : '',
      senha: isHashedPassword(user.senha) ? user.senha : hashPassword(user.senha, normalizedEmail),
      version: isNew ? (user.version ?? 1) : ((list[idx].version ?? 1) + 1),
      atualizadoEm: nowIso
    };

    if (isNew) {
      list.push(safeUser);
    } else {
      list[idx] = { ...list[idx], ...safeUser };
    }
    this.saveUsers(list);

    // Se o usuário for um vendedor, sincronizar automaticamente com a lista de salespeople (sem senha!)
    if (safeUser.papel === 'vendedor') {
      const spList = this.getSalespeople();
      const spIdx = spList.findIndex(s => s.id === safeUser.id);
      const spObj: Salesperson = {
        id: safeUser.id,
        nome: safeUser.nome,
        email: safeUser.email,
        telefone: safeUser.telefone || '',
        metaMensal: safeUser.metaMensal || 5,
        ativo: safeUser.ativo,
        version: spIdx >= 0 ? ((spList[spIdx].version ?? 1) + 1) : 1,
        atualizadoEm: nowIso
      };
      if (spIdx >= 0) {
        spList[spIdx] = spObj;
      } else {
        spList.push(spObj);
      }
      this.saveSalespeople(spList);
      dispatchCloudSync(
        { collection: 'salespeople', action: 'upsert', entityId: spObj.id, payload: spObj },
        () => firebaseDb.saveSalesperson(spObj)
      );
    }

    const log = auditLogger.log({
      acao: isNew ? 'CRIACAO_USUARIO' : 'EDICAO_USUARIO',
      categoria: 'sistema',
      usuarioNome: currentUser,
      descricao: `${isNew ? 'Cadastrou novo' : 'Atualizou dados do'} usuário (${safeUser.papel.toUpperCase()}): "${safeUser.nome}".`,
      detalhes: { id: safeUser.id, nome: safeUser.nome, email: safeUser.email, papel: safeUser.papel, ativo: safeUser.ativo }
    });

    dispatchCloudSync(
      { collection: 'users', action: 'upsert', entityId: safeUser.id, payload: safeUser },
      () => firebaseDb.saveUser(safeUser)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return safeUser;
  },

  toggleUserStatus(id: string, currentUser = 'Gestor Geral'): { success: boolean; error?: string } {
    const list = this.getUsers();
    const target = list.find(u => u.id === id);
    if (!target) return { success: false, error: 'Usuário não encontrado.' };

    // Se estiver tentando desativar um gestor, garantir que não seja o único gestor ativo
    if (target.papel === 'gestor' && target.ativo) {
      const activeManagers = list.filter(u => u.papel === 'gestor' && u.ativo && u.id !== id);
      if (activeManagers.length === 0) {
        return { success: false, error: 'Operação negada: O sistema deve possuir pelo menos um Gestor ativo.' };
      }
    }

    const nowIso = new Date().toISOString();
    const newActive = !target.ativo;
    target.ativo = newActive;
    target.version = (target.version ?? 1) + 1;
    target.atualizadoEm = nowIso;
    this.saveUsers(list);

    // Sincronizar status em salespeople se for vendedor
    if (target.papel === 'vendedor') {
      const spList = this.getSalespeople();
      const sp = spList.find(s => s.id === id);
      if (sp) {
        sp.ativo = newActive;
        sp.version = (sp.version ?? 1) + 1;
        sp.atualizadoEm = nowIso;
        this.saveSalespeople(spList);
        dispatchCloudSync(
          { collection: 'salespeople', action: 'upsert', entityId: sp.id, payload: { ...sp } },
          () => firebaseDb.saveSalesperson(sp)
        );
      }
    }

    const log = auditLogger.log({
      acao: 'EDICAO_USUARIO',
      categoria: 'sistema',
      usuarioNome: currentUser,
      descricao: `${newActive ? 'Ativou' : 'Desativou'} o acesso do usuário (${target.papel.toUpperCase()}): "${target.nome}".`,
      detalhes: { id: target.id, novoStatus: newActive ? 'ativo' : 'inativo' }
    });

    dispatchCloudSync(
      { collection: 'users', action: 'upsert', entityId: target.id, payload: { ...target } },
      () => firebaseDb.saveUser(target)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return { success: true };
  },

  deleteUser(id: string, currentUser = 'Gestor Geral'): { success: boolean; error?: string } {
    const list = this.getUsers();
    const target = list.find(u => u.id === id);
    if (!target) return { success: false, error: 'Usuário não encontrado.' };

    // Não permitir excluir o último gestor ativo
    if (target.papel === 'gestor') {
      const activeManagers = list.filter(u => u.papel === 'gestor' && u.ativo && u.id !== id);
      if (activeManagers.length === 0) {
        return { success: false, error: 'Operação negada: Não é permitido excluir o único Gestor ativo do sistema.' };
      }
    }

    // Se for vendedor, verificar se tem histórico de vendas
    if (target.papel === 'vendedor') {
      const sales = this.getSales();
      const hasSales = sales.some(s => s.vendedorId === id);
      if (hasSales) {
        target.ativo = false;
        target.version = (target.version ?? 1) + 1;
        target.atualizadoEm = new Date().toISOString();
        this.saveUsers(list);
        dispatchCloudSync(
          { collection: 'users', action: 'upsert', entityId: target.id, payload: { ...target } },
          () => firebaseDb.saveUser(target)
        );
        return { 
          success: false, 
          error: `O consultor "${target.nome}" possui vendas vinculadas no histórico. Por conformidade e integridade contábil, o acesso foi desativado em vez de excluído.` 
        };
      }
      const spList = this.getSalespeople().filter(s => s.id !== id);
      this.saveSalespeople(spList);
      dispatchCloudSync(
        { collection: 'salespeople', action: 'delete', entityId: id },
        () => firebaseDb.deleteSalesperson(id)
      );
    }

    const updated = list.filter(u => u.id !== id);
    this.saveUsers(updated);

    const log = auditLogger.log({
      acao: 'EXCLUSAO_USUARIO',
      categoria: 'sistema',
      usuarioNome: currentUser,
      descricao: `Removeu o cadastro do usuário (${target.papel.toUpperCase()}): "${target.nome}".`,
      detalhes: { id: target.id, nome: target.nome, email: target.email }
    });

    dispatchCloudSync(
      { collection: 'users', action: 'delete', entityId: id },
      () => firebaseDb.deleteUser(id)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return { success: true };
  },

  authenticateUser(loginOrEmail: string, passOrPin: string): { success: boolean; user?: SystemUser; error?: string } {
    const rate = checkLoginRateLimit();
    if (!rate.allowed) {
      return {
        success: false,
        error: `Muitas tentativas falhas consecutivas. Aguarde ${rate.remainingSeconds}s para tentar novamente.`
      };
    }

    const cleanLogin = loginOrEmail.trim().toLowerCase();
    const cleanPass = passOrPin.trim();

    if (!cleanLogin) {
      return { success: false, error: 'Informe seu e-mail corporativo.' };
    }
    if (!cleanPass) {
      return { success: false, error: 'Informe sua senha de acesso.' };
    }

    const users = this.getUsers();

    // Correspondência estrita por e-mail exato ou nome completo exato (sem correspondência parcial .includes e sem senhas mestras)
    const found = users.find(u =>
      u.email.trim().toLowerCase() === cleanLogin ||
      u.nome.trim().toLowerCase() === cleanLogin
    );

    if (!found) {
      const attempt = recordFailedLoginAttempt();
      return {
        success: false,
        error: attempt.locked
          ? `Acesso temporariamente bloqueado por segurança. Aguarde ${attempt.remainingSeconds}s.`
          : 'Credenciais inválidas. Verifique seu e-mail e senha.'
      };
    }

    if (!found.ativo) {
      return { success: false, error: 'Acesso bloqueado: Este usuário foi desativado pela diretoria da loja.' };
    }

    if (!verifyPassword(cleanPass, found.senha, found.email)) {
      const attempt = recordFailedLoginAttempt();
      return {
        success: false,
        error: attempt.locked
          ? `Acesso temporariamente bloqueado por segurança. Aguarde ${attempt.remainingSeconds}s.`
          : 'Credenciais inválidas. Verifique seu e-mail e senha.'
      };
    }

    resetLoginAttempts();
    found.ultimoAcesso = new Date().toISOString();
    this.saveUsers(users);
    return { success: true, user: found };
  },

  // Templates
  getTemplates(): ContractTemplate[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.TEMPLATES);
      const list: ContractTemplate[] = data ? JSON.parse(data) : DEFAULT_TEMPLATES;
      return list.map(t => ({
        ...t,
        titulo: sanitizeInputText(t.titulo),
        descricao: sanitizeInputText(t.descricao),
        conteudo: sanitizeContractText(t.conteudo).replace(/R\$\s*(\{VALOR_[A-Z_]+\})/g, '$1')
      }));
    } catch {
      return DEFAULT_TEMPLATES;
    }
  },
  saveTemplates(templates: ContractTemplate[]): void {
    safeSetItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  },
  saveTemplate(template: ContractTemplate, user = 'Gestor Geral'): void {
    const list = this.getTemplates();
    const idx = list.findIndex(t => t.id === template.id);
    const nowIso = new Date().toISOString();
    if (idx >= 0) {
      assertNoVersionConflict(list[idx].titulo, list[idx], template);
    }

    const safeTemplate: ContractTemplate = {
      ...template,
      titulo: sanitizeInputText(template.titulo),
      descricao: sanitizeInputText(template.descricao),
      conteudo: sanitizeContractText(template.conteudo),
      version: idx >= 0 ? ((list[idx].version ?? 1) + 1) : (template.version ?? 1),
      atualizadoEm: nowIso
    };
    if (idx >= 0) {
      list[idx] = safeTemplate;
    } else {
      list.push(safeTemplate);
    }
    this.saveTemplates(list);

    const log = auditLogger.log({
      acao: 'EDICAO_CONTRATO',
      categoria: 'documento',
      usuarioNome: user,
      descricao: `Editou o modelo de documento: "${safeTemplate.titulo}".`,
      detalhes: { templateId: safeTemplate.id, tipo: safeTemplate.tipo }
    });

    dispatchCloudSync(
      { collection: 'templates', action: 'upsert', entityId: safeTemplate.id, payload: safeTemplate },
      () => firebaseDb.saveTemplate(safeTemplate)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
  },

  // Owners (Antigos donos e clientes)
  getOwners(): FormerOwner[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.OWNERS);
      return data ? JSON.parse(data) : SEED_OWNERS;
    } catch {
      return SEED_OWNERS;
    }
  },
  saveOwners(owners: FormerOwner[]): void {
    safeSetItem(STORAGE_KEYS.OWNERS, JSON.stringify(owners));
  },
  addOwner(owner: FormerOwner, user = 'Gestor Geral'): FormerOwner {
    const nowIso = new Date().toISOString();
    const safeOwner: FormerOwner = {
      ...owner,
      nome: sanitizeInputText(owner.nome),
      rg: owner.rg ? sanitizeInputText(owner.rg) : undefined,
      cpf: sanitizeInputText(owner.cpf),
      telefone: sanitizeInputText(owner.telefone),
      endereco: sanitizeInputText(owner.endereco),
      cidade: owner.cidade ? sanitizeInputText(owner.cidade) : undefined,
      estado: owner.estado ? sanitizeInputText(owner.estado) : undefined,
      cep: owner.cep ? sanitizeInputText(owner.cep) : undefined,
      observacoes: owner.observacoes ? sanitizeInputText(owner.observacoes, true) : undefined,
      version: typeof owner.version === 'number' && owner.version >= 1 ? owner.version : 1,
      atualizadoEm: nowIso
    };
    const list = this.getOwners();
    list.unshift(safeOwner);
    this.saveOwners(list);

    const log = auditLogger.log({
      acao: 'CADASTRO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `Cadastrou novo cliente: ${safeOwner.nome} (CPF: ${safeOwner.cpf}).`,
      detalhes: { ownerId: safeOwner.id, nome: safeOwner.nome, cpf: safeOwner.cpf, telefone: safeOwner.telefone }
    });

    dispatchCloudSync(
      { collection: 'owners', action: 'upsert', entityId: safeOwner.id, payload: safeOwner },
      () => firebaseDb.saveOwner(safeOwner)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return safeOwner;
  },

  // Vehicles
  getVehicles(): Vehicle[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.VEHICLES);
      return data ? JSON.parse(data) : SEED_VEHICLES;
    } catch {
      return SEED_VEHICLES;
    }
  },
  getPublicVehicles(): Vehicle[] {
    try {
      const localInternal = safeGetItem(STORAGE_KEYS.VEHICLES);
      if (localInternal) {
        const parsed: Vehicle[] = JSON.parse(localInternal);
        return parsed.map(sanitizePublicVehicle);
      }
      const cachedPublic = safeGetItem(STORAGE_KEYS.PUBLIC_VEHICLES);
      if (cachedPublic) {
        const parsedPublic: Vehicle[] = JSON.parse(cachedPublic);
        return parsedPublic.map(sanitizePublicVehicle);
      }
      return SEED_VEHICLES.map(sanitizePublicVehicle);
    } catch {
      return SEED_VEHICLES.map(sanitizePublicVehicle);
    }
  },
  saveVehicles(vehicles: Vehicle[]): void {
    safeSetItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
    safeSetItem(STORAGE_KEYS.PUBLIC_VEHICLES, JSON.stringify(vehicles.map(sanitizePublicVehicle)));
  },
  savePublicVehicles(vehicles: Vehicle[]): void {
    const sanitized = vehicles.map(sanitizePublicVehicle);
    safeSetItem(STORAGE_KEYS.PUBLIC_VEHICLES, JSON.stringify(sanitized));
  },
  addVehicle(vehicle: Vehicle, user = 'Gestor Geral'): void {
    validateVehicleIntegrity(vehicle);
    const list = this.getVehicles();
    const nowIso = new Date().toISOString();
    const normalized: Vehicle = {
      ...normalizeVehicleRecord(vehicle),
      version: typeof vehicle.version === 'number' && vehicle.version >= 1 ? vehicle.version : 1,
      atualizadoEm: nowIso
    };

    // Bloqueia duplicidade de placa em estoque ativo
    const cleanPlate = normalizePlate(normalized.placa);
    if (normalized.status === 'em_estoque' && cleanPlate) {
      const duplicate = list.find(
        v => v.id !== normalized.id && v.status === 'em_estoque' && normalizePlate(v.placa) === cleanPlate
      );
      if (duplicate) {
        const msg = `Já existe um veículo em estoque cadastrado com a placa ${normalized.placa}.`;
        console.warn(msg);
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(msg);
        }
        throw new Error(msg);
      }
    }

    list.unshift(normalized);
    this.saveVehicles(list);

    const log = auditLogger.log({
      acao: 'ENTRADA_VEICULO',
      categoria: 'veiculo',
      usuarioNome: user,
      descricao: `Entrada de veículo: ${normalized.marca} ${normalized.modelo} ${normalized.anoModelo} (Placa: ${normalized.placa}).`,
      detalhes: { 
        veiculoId: normalized.id, 
        placa: normalized.placa, 
        valorPago: normalized.valorPago, 
        valorAnunciado: normalized.valorAnunciado,
        totalFotos: normalized.fotos.length,
        version: normalized.version
      }
    });

    dispatchCloudSync(
      { collection: 'vehicles', action: 'upsert', entityId: normalized.id, payload: normalized },
      () => firebaseDb.saveVehicle(normalized)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  updateVehicle(vehicle: Vehicle, user = 'Gestor Geral'): void {
    validateVehicleIntegrity(vehicle);
    const list = this.getVehicles();
    const idx = list.findIndex(v => v.id === vehicle.id);
    if (idx >= 0) {
      const existing = list[idx];

      // Controle de Concorrência Otimista (OCC): bloqueia sobrescrita de snapshot desatualizado
      assertNoVersionConflict(`${existing.marca} ${existing.modelo} (${existing.placa})`, existing, vehicle);

      const normalized: Vehicle = {
        ...normalizeVehicleRecord(vehicle),
        version: (existing.version ?? 1) + 1,
        atualizadoEm: new Date().toISOString()
      };

      // Impede retorno indevido ao estoque ativo de veículo com venda ativa concretizada
      const hasLinkedActiveSale = this.getSales().some(s => s.veiculoId === normalized.id && s.statusVenda !== 'cancelada');
      if ((existing.status === 'vendido' || hasLinkedActiveSale) && normalized.status !== 'vendido') {
        const msg = `O veículo ${existing.marca} ${existing.modelo} (${existing.placa}) possui venda ativa concretizada. Para reabri-lo no estoque, realize formalmente o distrato/cancelamento da venda.`;
        console.warn(msg);
        if (typeof window !== 'undefined' && window.alert) {
          window.alert(msg);
        }
        throw new Error(msg);
      }

      // Bloqueia duplicidade de placa ao editar veículo em estoque ativo
      const cleanPlate = normalizePlate(normalized.placa);
      if (normalized.status === 'em_estoque' && cleanPlate) {
        const duplicate = list.find(
          v => v.id !== normalized.id && v.status === 'em_estoque' && normalizePlate(v.placa) === cleanPlate
        );
        if (duplicate) {
          const msg = `Já existe outro veículo em estoque ativo cadastrado com a placa ${normalized.placa}.`;
          console.warn(msg);
          if (typeof window !== 'undefined' && window.alert) {
            window.alert(msg);
          }
          throw new Error(msg);
        }
      }

      list[idx] = normalized;
      this.saveVehicles(list);

      const log = auditLogger.log({
        acao: 'EDICAO_VEICULO',
        categoria: 'veiculo',
        usuarioNome: user,
        descricao: `Atualizou dados do veículo: ${normalized.marca} ${normalized.modelo} (Placa: ${normalized.placa}).`,
        detalhes: {
          veiculoId: normalized.id,
          status: normalized.status,
          valorAnunciado: normalized.valorAnunciado,
          version: normalized.version
        }
      });

      dispatchCloudSync(
        { collection: 'vehicles', action: 'upsert', entityId: normalized.id, payload: normalized },
        () => firebaseDb.saveVehicle(normalized)
      );
      firebaseDb.saveAuditLog(log).catch(() => {});
    }
  },
  deleteVehicle(vehicleId: string, user = 'Gestor Geral'): boolean {
    const list = this.getVehicles();
    const vehicle = list.find(v => v.id === vehicleId);
    if (!vehicle) return false;

    // Proteção contábil: não exclui veículo vendido ou com venda vinculada ativa
    const hasActiveSales = this.getSales().some(s => s.veiculoId === vehicleId && s.statusVenda !== 'cancelada');
    if (hasActiveSales || vehicle.status === 'vendido') {
      const msg = `O veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) não pode ser excluído pois possui histórico de venda registrado.`;
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      return false;
    }

    const updated = list.filter(v => v.id !== vehicleId);
    this.saveVehicles(updated);

    const log = auditLogger.log({
      acao: 'EXCLUSAO_VEICULO',
      categoria: 'veiculo',
      usuarioNome: user,
      descricao: `Excluiu veículo do estoque: ${vehicle.marca} ${vehicle.modelo} (Placa: ${vehicle.placa}).`,
      detalhes: { veiculoId: vehicleId, placa: vehicle.placa }
    });

    dispatchCloudSync(
      { collection: 'vehicles', action: 'delete', entityId: vehicleId },
      () => firebaseDb.deleteVehicle(vehicleId)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },

  reserveVehicle(
    vehicleId: string,
    reserveData: { reservadoPara: string; reservadoAte?: string; valorSinal?: number },
    user = 'Gestor Geral'
  ): { success: boolean; error?: string } {
    if (!reserveData.reservadoPara?.trim()) {
      return { success: false, error: 'Informe o nome do cliente para a reserva do veículo.' };
    }
    const vehicles = this.getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return { success: false, error: 'Veículo não encontrado.' };
    if (vehicle.status !== 'em_estoque') {
      return { success: false, error: `Apenas veículos disponíveis em estoque podem ser reservados (status atual: ${vehicle.status}).` };
    }

    const nowIso = new Date().toISOString();
    vehicle.status = 'reservado';
    vehicle.dataReserva = nowIso;
    vehicle.reservadoPara = sanitizeInputText(reserveData.reservadoPara);
    vehicle.reservadoAte = reserveData.reservadoAte ? sanitizeInputText(reserveData.reservadoAte) : undefined;
    vehicle.valorSinalReserva = reserveData.valorSinal !== undefined ? roundCurrency(Math.max(0, Number(reserveData.valorSinal))) : undefined;
    vehicle.version = (vehicle.version ?? 1) + 1;
    vehicle.atualizadoEm = nowIso;
    this.saveVehicles(vehicles);

    const log = auditLogger.log({
      acao: 'RESERVA_VEICULO',
      categoria: 'veiculo',
      usuarioNome: user,
      descricao: `Reservou o veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) para ${vehicle.reservadoPara}. Sinal: R$ ${(vehicle.valorSinalReserva || 0).toFixed(2)}.`,
      detalhes: { veiculoId: vehicle.id, reservadoPara: vehicle.reservadoPara, valorSinal: vehicle.valorSinalReserva }
    });

    dispatchCloudSync(
      { collection: 'vehicles', action: 'upsert', entityId: vehicle.id, payload: vehicle },
      () => firebaseDb.saveVehicle(vehicle)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return { success: true };
  },

  cancelReservation(vehicleId: string, user = 'Gestor Geral'): { success: boolean; error?: string } {
    const vehicles = this.getVehicles();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return { success: false, error: 'Veículo não encontrado.' };
    if (vehicle.status !== 'reservado') {
      return { success: false, error: 'O veículo não está reservado.' };
    }

    const nowIso = new Date().toISOString();
    const anteriorCliente = vehicle.reservadoPara;
    vehicle.status = 'em_estoque';
    vehicle.dataReserva = undefined;
    vehicle.reservadoPara = undefined;
    vehicle.reservadoAte = undefined;
    vehicle.valorSinalReserva = undefined;
    vehicle.version = (vehicle.version ?? 1) + 1;
    vehicle.atualizadoEm = nowIso;
    this.saveVehicles(vehicles);

    const log = auditLogger.log({
      acao: 'CANCELAMENTO_RESERVA',
      categoria: 'veiculo',
      usuarioNome: user,
      descricao: `Cancelou a reserva do veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}), anteriormente reservado para ${anteriorCliente || 'cliente'}. Veículo liberado para o estoque ativo.`,
      detalhes: { veiculoId: vehicle.id }
    });

    dispatchCloudSync(
      { collection: 'vehicles', action: 'upsert', entityId: vehicle.id, payload: vehicle },
      () => firebaseDb.saveVehicle(vehicle)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
    return { success: true };
  },
  addVehiclePatioExpense(vehicleId: string, expense: VehicleExpense, user = 'Gestor Geral'): void {
    if (!expense || !expense.descricao?.trim() || !Number.isFinite(Number(expense.valor)) || toCents(expense.valor) <= 0) {
      const msg = 'Informe uma descrição e um valor positivo válido para a despesa de pátio.';
      if (typeof window !== 'undefined' && window.alert) window.alert(msg);
      throw new Error(msg);
    }

    const list = this.getVehicles();
    const vehicle = list.find(v => v.id === vehicleId);
    if (vehicle) {
      if (vehicle.status === 'vendido') {
        const msg = `O veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) já foi vendido. Lance despesas subsequentes como Custo Pós-Venda / Garantia.`;
        if (typeof window !== 'undefined' && window.alert) window.alert(msg);
        throw new Error(msg);
      }

      const safeExpense: VehicleExpense = {
        ...expense,
        descricao: sanitizeInputText(expense.descricao),
        responsavel: expense.responsavel ? sanitizeInputText(expense.responsavel) : undefined,
        valor: roundCurrency(expense.valor)
      };

      if (!vehicle.custosPatio) vehicle.custosPatio = [];
      vehicle.custosPatio.push(safeExpense);
      vehicle.version = (vehicle.version ?? 1) + 1;
      vehicle.atualizadoEm = new Date().toISOString();
      this.saveVehicles(list);

      const log = auditLogger.log({
        acao: 'DESPESA_PATIO',
        categoria: 'financeiro',
        usuarioNome: user,
        descricao: `Lançou despesa de pátio (${safeExpense.categoria}): R$ ${safeExpense.valor.toFixed(2)} no veículo ${vehicle.modelo} (${vehicle.placa}).`,
        detalhes: { veiculoId: vehicleId, expense: safeExpense, version: vehicle.version }
      });

      const snapshot = { ...vehicle, custosPatio: [...vehicle.custosPatio] };
      dispatchCloudSync(
        { collection: 'vehicles', action: 'upsert', entityId: snapshot.id, payload: snapshot },
        () => firebaseDb.saveVehicle(snapshot)
      );
      firebaseDb.saveAuditLog(log).catch(() => {});
    }
  },

  // Sales
  getSales(): Sale[] {
    try {
      const data = safeGetItem(STORAGE_KEYS.SALES);
      return data ? JSON.parse(data) : SEED_SALES;
    } catch {
      return SEED_SALES;
    }
  },
  saveSales(sales: Sale[]): void {
    safeSetItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  },
  addSale(sale: Sale, user = 'Gestor Geral'): void {
    const vehicles = this.getVehicles();
    const vehicle = vehicles.find(v => v.id === sale.veiculoId);
    if (!vehicle) {
      const msg = 'Veículo não encontrado no estoque para concretização da venda.';
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    const sales = this.getSales();
    const hasActiveSale = sales.some(s => s.veiculoId === sale.veiculoId && s.statusVenda !== 'cancelada');
    if (vehicle.status === 'vendido' || hasActiveSale) {
      const msg = `O veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) já consta com venda ativa no sistema.`;
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    if (vehicle.status !== 'em_estoque' && vehicle.status !== 'reservado') {
      const msg = `O veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) não está disponível para venda (status atual: ${vehicle.status}).`;
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    const finValidation = validateSaleFinancials(sale);
    if (!finValidation.valid) {
      const msg = finValidation.error || 'Falha no equilíbrio financeiro da venda.';
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    // Trava Jurídica: garante coerência estrita entre modalidade (Garantia 90D vs Repasse) e a minuta contratual vinculada
    const templatesList = this.getTemplates();
    const matchedTemplate = templatesList.find(t => t.id === sale.tipoContratoId);
    const inferredContractKind =
      matchedTemplate?.tipo ||
      (sale.tipoContratoId?.toLowerCase().includes('repasse')
        ? 'repasse'
        : sale.tipoContratoId?.toLowerCase().includes('garantia')
          ? 'garantia'
          : undefined);

    if (sale.isRepasseSemGarantia && inferredContractKind === 'garantia') {
      const msg =
        'Conflito Jurídico Bloqueado: Uma venda na modalidade Repasse Comercial (Sem Garantia) não pode ser emitida com minuta de Garantia Legal de 90 Dias.';
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    if (!sale.isRepasseSemGarantia && inferredContractKind === 'repasse') {
      const msg =
        'Conflito Jurídico Bloqueado: Uma venda com Garantia Legal de 90 Dias (CDC) não pode ser emitida com minuta de Repasse Comercial (Sem Garantia).';
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    const usesFinancier = sale.formaPagamento === 'financiamento' || sale.formaPagamento === 'misto' || sale.formaPagamento === 'troca';
    const nowIso = new Date().toISOString();

    const safeSale: Sale = {
      ...sale,
      clienteNome: sanitizeInputText(sale.clienteNome),
      clienteCpf: sanitizeInputText(sale.clienteCpf),
      clienteRg: sale.clienteRg ? sanitizeInputText(sale.clienteRg) : undefined,
      clienteTelefone: sanitizeInputText(sale.clienteTelefone),
      clienteEndereco: sanitizeInputText(sale.clienteEndereco),
      clienteCidade: sale.clienteCidade ? sanitizeInputText(sale.clienteCidade) : undefined,
      clienteEstado: sale.clienteEstado ? sanitizeInputText(sale.clienteEstado) : undefined,
      clienteCep: sale.clienteCep ? sanitizeInputText(sale.clienteCep) : undefined,
      vendedorNome: sanitizeInputText(sale.vendedorNome),
      valorVenda: finValidation.normalizedVenda,
      valorEntrada: finValidation.normalizedEntrada,
      valorFinanciado: finValidation.normalizedFinanciado,
      numeroParcelas: finValidation.normalizedParcelas,
      veiculoTrocaDescricao: sale.veiculoTrocaDescricao ? sanitizeInputText(sale.veiculoTrocaDescricao) : undefined,
      veiculoTrocaValor: finValidation.normalizedTroca,
      taxaCartaoPercentual: sale.taxaCartaoPercentual ? Number(sale.taxaCartaoPercentual) : undefined,
      taxaCartaoValor: finValidation.normalizedTaxaCartaoValor,
      statusVenda: 'concluida',
      financiadoraId: usesFinancier ? sale.financiadoraId : undefined,
      financiadoraNome: usesFinancier && sale.financiadoraNome ? sanitizeInputText(sale.financiadoraNome) : undefined,
      comissaoValor: finValidation.normalizedComissao,
      tipoContratoNome: sanitizeInputText(sale.tipoContratoNome),
      observacoes: sale.observacoes ? sanitizeInputText(sale.observacoes, true) : undefined,
      custosPosVenda: Array.isArray(sale.custosPosVenda)
        ? sale.custosPosVenda.map(c => ({
            ...c,
            descricao: sanitizeInputText(c.descricao),
            oficinaParceira: c.oficinaParceira ? sanitizeInputText(c.oficinaParceira) : undefined,
            valor: roundCurrency(Math.max(0, Number(c.valor) || 0))
          }))
        : [],
      version: typeof sale.version === 'number' && sale.version >= 1 ? sale.version : 1,
      atualizadoEm: nowIso
    };

    sales.unshift(safeSale);
    this.saveSales(sales);

    // Marca o veículo como vendido atomicamente e incrementa sua versão OCC
    vehicle.status = 'vendido';
    vehicle.dataVenda = safeSale.dataVenda;
    vehicle.dataReserva = undefined;
    vehicle.reservadoPara = undefined;
    vehicle.reservadoAte = undefined;
    vehicle.valorSinalReserva = undefined;
    vehicle.version = (vehicle.version ?? 1) + 1;
    vehicle.atualizadoEm = nowIso;
    this.saveVehicles(vehicles);

    const updatedVehicleSnapshot = { ...vehicle };
    dispatchCloudSync(
      { collection: 'vehicles', action: 'upsert', entityId: updatedVehicleSnapshot.id, payload: updatedVehicleSnapshot },
      () => firebaseDb.saveVehicle(updatedVehicleSnapshot)
    );

    const log = auditLogger.log({
      acao: 'VENDA_VEICULO',
      categoria: 'venda',
      usuarioNome: user,
      descricao: `Concluiu venda do veículo ${vehicle.modelo} para ${safeSale.clienteNome} por R$ ${safeSale.valorVenda.toFixed(2)}.`,
      detalhes: { 
        saleId: safeSale.id, 
        veiculoId: safeSale.veiculoId, 
        clienteNome: safeSale.clienteNome, 
        vendedorNome: safeSale.vendedorNome,
        valorVenda: safeSale.valorVenda,
        version: safeSale.version
      }
    });

    dispatchCloudSync(
      { collection: 'sales', action: 'upsert', entityId: safeSale.id, payload: safeSale },
      () => firebaseDb.saveSale(safeSale)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  updateSale(sale: Sale): void {
    const finValidation = validateSaleFinancials(sale);
    if (!finValidation.valid) {
      const msg = finValidation.error || 'Falha no equilíbrio financeiro da venda.';
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    // Trava Jurídica: garante coerência estrita entre modalidade (Garantia 90D vs Repasse) e a minuta contratual vinculada
    const templatesList = this.getTemplates();
    const matchedTemplate = templatesList.find(t => t.id === sale.tipoContratoId);
    const inferredContractKind =
      matchedTemplate?.tipo ||
      (sale.tipoContratoId?.toLowerCase().includes('repasse')
        ? 'repasse'
        : sale.tipoContratoId?.toLowerCase().includes('garantia')
          ? 'garantia'
          : undefined);

    if (sale.isRepasseSemGarantia && inferredContractKind === 'garantia') {
      const msg =
        'Conflito Jurídico Bloqueado: Uma venda na modalidade Repasse Comercial (Sem Garantia) não pode ser emitida com minuta de Garantia Legal de 90 Dias.';
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    if (!sale.isRepasseSemGarantia && inferredContractKind === 'repasse') {
      const msg =
        'Conflito Jurídico Bloqueado: Uma venda com Garantia Legal de 90 Dias (CDC) não pode ser emitida com minuta de Repasse Comercial (Sem Garantia).';
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    const sales = this.getSales();
    const idx = sales.findIndex(s => s.id === sale.id);
    if (idx >= 0) {
      const existing = sales[idx];
      assertNoVersionConflict(`Venda ${existing.id}`, existing, sale);

      const usesFinancier = sale.formaPagamento === 'financiamento' || sale.formaPagamento === 'misto';
      const safeSale: Sale = {
        ...sale,
        clienteNome: sanitizeInputText(sale.clienteNome),
        clienteCpf: sanitizeInputText(sale.clienteCpf),
        clienteRg: sale.clienteRg ? sanitizeInputText(sale.clienteRg) : undefined,
        clienteTelefone: sanitizeInputText(sale.clienteTelefone),
        clienteEndereco: sanitizeInputText(sale.clienteEndereco),
        clienteCidade: sale.clienteCidade ? sanitizeInputText(sale.clienteCidade) : undefined,
        clienteEstado: sale.clienteEstado ? sanitizeInputText(sale.clienteEstado) : undefined,
        clienteCep: sale.clienteCep ? sanitizeInputText(sale.clienteCep) : undefined,
        vendedorNome: sanitizeInputText(sale.vendedorNome),
        valorVenda: finValidation.normalizedVenda,
        valorEntrada: finValidation.normalizedEntrada,
        valorFinanciado: finValidation.normalizedFinanciado,
        numeroParcelas: finValidation.normalizedParcelas,
        financiadoraId: usesFinancier ? sale.financiadoraId : undefined,
        financiadoraNome: usesFinancier && sale.financiadoraNome ? sanitizeInputText(sale.financiadoraNome) : undefined,
        comissaoValor: finValidation.normalizedComissao,
        tipoContratoNome: sanitizeInputText(sale.tipoContratoNome),
        observacoes: sale.observacoes ? sanitizeInputText(sale.observacoes, true) : undefined,
        custosPosVenda: Array.isArray(sale.custosPosVenda)
          ? sale.custosPosVenda.map(c => ({
              ...c,
              descricao: sanitizeInputText(c.descricao),
              oficinaParceira: c.oficinaParceira ? sanitizeInputText(c.oficinaParceira) : undefined,
              valor: roundCurrency(Math.max(0, Number(c.valor) || 0))
            }))
          : [],
        version: (existing.version ?? 1) + 1,
        atualizadoEm: new Date().toISOString()
      };

      sales[idx] = safeSale;
      this.saveSales(sales);
      dispatchCloudSync(
        { collection: 'sales', action: 'upsert', entityId: safeSale.id, payload: safeSale },
        () => firebaseDb.saveSale(safeSale)
      );
    }
  },
  cancelSale(saleId: string, motivo: string, user = 'Gestor Geral'): { success: boolean; error?: string } {
    if (!motivo || !motivo.trim()) {
      const msg = 'Informe a justificativa/motivo do cancelamento/distrato da venda.';
      if (typeof window !== 'undefined' && window.alert) window.alert(msg);
      return { success: false, error: msg };
    }
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) {
      const msg = 'Venda não localizada no sistema.';
      if (typeof window !== 'undefined' && window.alert) window.alert(msg);
      return { success: false, error: msg };
    }
    if (sale.statusVenda === 'cancelada') {
      const msg = 'Esta venda já consta como cancelada/distratada.';
      if (typeof window !== 'undefined' && window.alert) window.alert(msg);
      return { success: false, error: msg };
    }

    const nowIso = new Date().toISOString();
    sale.statusVenda = 'cancelada';
    sale.motivoCancelamento = sanitizeInputText(motivo);
    sale.dataCancelamento = nowIso;
    sale.canceladoPor = user;
    sale.comissaoPendente = false;
    sale.version = (sale.version ?? 1) + 1;
    sale.atualizadoEm = nowIso;
    this.saveSales(sales);

    // Reverte o veículo ao estoque ativo preservando integralmente os custos de aquisição originais
    const vehicles = this.getVehicles();
    const vehicle = vehicles.find(v => v.id === sale.veiculoId);
    if (vehicle) {
      vehicle.status = 'em_estoque';
      vehicle.dataVenda = undefined;
      vehicle.version = (vehicle.version ?? 1) + 1;
      vehicle.atualizadoEm = nowIso;
      this.saveVehicles(vehicles);

      dispatchCloudSync(
        { collection: 'vehicles', action: 'upsert', entityId: vehicle.id, payload: vehicle },
        () => firebaseDb.saveVehicle(vehicle)
      );
    }

    const log = auditLogger.log({
      acao: 'CANCELAMENTO_VENDA',
      categoria: 'venda',
      usuarioNome: user,
      descricao: `Cancelamento/distrato da venda ${sale.id} do veículo ${vehicle?.modelo || ''} (${vehicle?.placa || ''}). Motivo: ${sale.motivoCancelamento}`,
      detalhes: { saleId, veiculoId: sale.veiculoId, motivo: sale.motivoCancelamento, canceladoPor: user }
    });

    dispatchCloudSync(
      { collection: 'sales', action: 'upsert', entityId: sale.id, payload: sale },
      () => firebaseDb.saveSale(sale)
    );
    firebaseDb.saveAuditLog(log).catch(() => {});

    return { success: true };
  },
  addPostSaleCost(saleId: string, cost: PostSaleCost): void {
    if (!cost || !cost.descricao?.trim() || !Number.isFinite(Number(cost.valor)) || toCents(cost.valor) <= 0) {
      const msg = 'Informe uma descrição e um valor positivo válido para o custo pós-venda.';
      if (typeof window !== 'undefined' && window.alert) window.alert(msg);
      throw new Error(msg);
    }

    const safeCost: PostSaleCost = {
      ...cost,
      descricao: sanitizeInputText(cost.descricao),
      oficinaParceira: cost.oficinaParceira ? sanitizeInputText(cost.oficinaParceira) : undefined,
      valor: roundCurrency(cost.valor)
    };
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      if (!sale.custosPosVenda) sale.custosPosVenda = [];
      sale.custosPosVenda.push(safeCost);
      sale.version = (sale.version ?? 1) + 1;
      sale.atualizadoEm = new Date().toISOString();
      this.saveSales(sales);

      const snapshot = { ...sale, custosPosVenda: [...sale.custosPosVenda] };
      dispatchCloudSync(
        { collection: 'sales', action: 'upsert', entityId: snapshot.id, payload: snapshot },
        () => firebaseDb.saveSale(snapshot)
      );
    }
  },
  assignSaleCommission(
    saleId: string,
    commissionAmount: number,
    managerName: string = 'Gestor Geral',
    options?: CommissionAssignOptions
  ): void {
    if (typeof commissionAmount !== 'number' || !Number.isFinite(commissionAmount) || toCents(commissionAmount) < 0) {
      const msg = 'Informe um valor de comissão válido (zero ou positivo).';
      if (typeof window !== 'undefined' && window.alert) window.alert(msg);
      throw new Error(msg);
    }

    const normalizedAmount = roundCurrency(commissionAmount);
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      // Controle de Concorrência Otimista (OCC): bloqueia dupla aprovação ou sobrescrita de comissão simultânea
      if (options?.requirePending && !sale.comissaoPendente) {
        const msg =
          `Conflito de Concorrência: A comissão desta venda (${sale.id}) já foi homologada anteriormente ` +
          `por ${sale.comissaoDefinidaPor || 'outro gestor'}. A tela foi atualizada.`;
        console.warn(msg);
        if (typeof window !== 'undefined' && window.alert) window.alert(msg);
        throw new ConcurrencyConflictError(msg, options.expectedVersion, sale.version);
      }

      if (
        typeof options?.expectedVersion === 'number' &&
        typeof sale.version === 'number' &&
        options.expectedVersion < sale.version
      ) {
        const msg =
          `Conflito de Concorrência: A venda (${sale.id}) sofreu alteração simultânea ` +
          `(versão atual: v${sale.version}, sua versão: v${options.expectedVersion}). Revise os dados atualizados antes de fixar a comissão.`;
        console.warn(msg);
        if (typeof window !== 'undefined' && window.alert) window.alert(msg);
        throw new ConcurrencyConflictError(msg, options.expectedVersion, sale.version);
      }

      if (toCents(normalizedAmount) > toCents(sale.valorVenda)) {
        const msg = 'O valor da comissão não pode ultrapassar o valor total da venda.';
        if (typeof window !== 'undefined' && window.alert) window.alert(msg);
        throw new Error(msg);
      }

      const nowIso = new Date().toISOString();
      sale.comissaoValor = normalizedAmount;
      sale.comissaoPendente = false;
      sale.comissaoDefinidaPor = managerName;
      sale.dataDefinicaoComissao = nowIso;
      sale.version = (sale.version ?? 1) + 1;
      sale.atualizadoEm = nowIso;
      this.saveSales(sales);

      const log = auditLogger.log({
        acao: 'DEFINICAO_COMISSAO',
        categoria: 'financeiro',
        usuarioNome: managerName,
        descricao: `Definiu comissão de R$ ${normalizedAmount.toFixed(2)} para o vendedor ${sale.vendedorNome} na venda ${sale.id}.`,
        detalhes: { saleId, commissionAmount: normalizedAmount, vendedorNome: sale.vendedorNome, version: sale.version }
      });

      const snapshot = { ...sale };
      dispatchCloudSync(
        { collection: 'sales', action: 'upsert', entityId: snapshot.id, payload: snapshot },
        () => firebaseDb.saveSale(snapshot)
      );
      firebaseDb.saveAuditLog(log).catch(() => {});
    }
  },

  saveVehicle(vehicle: Vehicle, user = 'Gestor Geral'): void {
    const list = this.getVehicles();
    const idx = list.findIndex(v => v.id === vehicle.id);
    if (idx >= 0) {
      this.updateVehicle(vehicle, user);
    } else {
      this.addVehicle(vehicle, user);
    }
  },
  saveOwner(owner: FormerOwner, user = 'Gestor Geral'): FormerOwner {
    const list = this.getOwners();
    const idx = list.findIndex(o => o.id === owner.id);
    if (idx >= 0) {
      const existing = list[idx];
      assertNoVersionConflict(existing.nome, existing, owner);

      const safeOwner: FormerOwner = {
        ...owner,
        nome: sanitizeInputText(owner.nome),
        rg: owner.rg ? sanitizeInputText(owner.rg) : undefined,
        cpf: sanitizeInputText(owner.cpf),
        telefone: sanitizeInputText(owner.telefone),
        endereco: sanitizeInputText(owner.endereco),
        cidade: owner.cidade ? sanitizeInputText(owner.cidade) : undefined,
        estado: owner.estado ? sanitizeInputText(owner.estado) : undefined,
        cep: owner.cep ? sanitizeInputText(owner.cep) : undefined,
        observacoes: owner.observacoes ? sanitizeInputText(owner.observacoes, true) : undefined,
        version: (existing.version ?? 1) + 1,
        atualizadoEm: new Date().toISOString()
      };

      list[idx] = safeOwner;
      this.saveOwners(list);
      auditLogger.log({
        acao: 'EDICAO_PESSOA',
        categoria: 'pessoa',
        usuarioNome: user,
        descricao: `Atualizou cadastro de pessoa: ${safeOwner.nome} (${safeOwner.cpf}).`,
        detalhes: { ownerId: safeOwner.id, nome: safeOwner.nome, version: safeOwner.version }
      });
      dispatchCloudSync(
        { collection: 'owners', action: 'upsert', entityId: safeOwner.id, payload: safeOwner },
        () => firebaseDb.saveOwner(safeOwner)
      );
      return safeOwner;
    } else {
      return this.addOwner(owner, user);
    }
  },
  saveSale(sale: Sale, user = 'Gestor Geral'): void {
    const list = this.getSales();
    const idx = list.findIndex(s => s.id === sale.id);
    if (idx >= 0) {
      this.updateSale(sale);
    } else {
      this.addSale(sale, user);
    }
  },
  addVehicleExpense(vehicleId: string, expense: VehicleExpense, user = 'Gestor Geral'): void {
    this.addVehiclePatioExpense(vehicleId, expense, user);
  },
  assignCommission(
    saleId: string,
    commissionAmount: number,
    managerName: string = 'Gestor Geral',
    options?: CommissionAssignOptions
  ): void {
    this.assignSaleCommission(saleId, commissionAmount, managerName, options);
  },
  resetToSeed(): void {
    this.resetAll();
  },

  // Drena fila offline (outbox) pendente quando a conexão com o Firestore é restabelecida
  async flushPendingSyncQueue(userRole: UserRole = 'vendedor'): Promise<number> {
    const queue = getPendingSyncQueue();
    if (queue.length === 0) return 0;

    let flushedCount = 0;
    for (const op of queue) {
      if (op.collection === 'users' && userRole !== 'gestor') {
        continue;
      }

      try {
        let ok = false;
        switch (op.collection) {
          case 'store':
            if (op.action === 'upsert' && op.payload) {
              ok = await firebaseDb.saveStoreProfile(op.payload);
            }
            break;
          case 'financiers':
            ok = op.action === 'delete'
              ? await firebaseDb.deleteFinancier(op.entityId)
              : await firebaseDb.saveFinancier(op.payload);
            break;
          case 'salespeople':
            ok = op.action === 'delete'
              ? await firebaseDb.deleteSalesperson(op.entityId)
              : await firebaseDb.saveSalesperson(op.payload);
            break;
          case 'users':
            ok = op.action === 'delete'
              ? await firebaseDb.deleteUser(op.entityId)
              : await firebaseDb.saveUser(op.payload);
            break;
          case 'templates':
            if (op.action === 'upsert' && op.payload) {
              ok = await firebaseDb.saveTemplate(op.payload);
            }
            break;
          case 'owners':
            if (op.action === 'upsert' && op.payload) {
              ok = await firebaseDb.saveOwner(op.payload);
            }
            break;
          case 'vehicles':
            ok = op.action === 'delete'
              ? await firebaseDb.deleteVehicle(op.entityId)
              : await firebaseDb.saveVehicle(op.payload);
            break;
          case 'sales':
            if (op.action === 'upsert' && op.payload) {
              ok = await firebaseDb.saveSale(op.payload);
            }
            break;
        }

        if (ok) {
          dequeuePendingSync(op.key, op.queuedAt);
          flushedCount++;
        }
      } catch (err) {
        if (err instanceof ConcurrencyConflictError) {
          // Se for veículo com despesas de pátio adicionadas offline, preserva as despesas mesclando com a versão remota
          if (op.collection === 'vehicles' && op.action === 'upsert' && op.payload) {
            try {
              const remoteVehicles = await firebaseDb.getVehicles();
              const latestRemote = remoteVehicles.find(v => v.id === op.entityId);
              if (latestRemote) {
                const existingExpenseIds = new Set((latestRemote.custosPatio || []).map(e => e.id));
                const localExpenses = (op.payload.custosPatio || []) as VehicleExpense[];
                const mergedExpenses = [...(latestRemote.custosPatio || [])];
                let hasNewExpense = false;
                for (const exp of localExpenses) {
                  if (exp && exp.id && !existingExpenseIds.has(exp.id)) {
                    mergedExpenses.push(exp);
                    hasNewExpense = true;
                  }
                }
                if (hasNewExpense) {
                  latestRemote.custosPatio = mergedExpenses;
                  latestRemote.version = (latestRemote.version ?? 1) + 1;
                  latestRemote.atualizadoEm = new Date().toISOString();
                  await firebaseDb.saveVehicle(latestRemote);
                  const localVehicles = this.getVehicles();
                  const locIdx = localVehicles.findIndex(v => v.id === latestRemote.id);
                  if (locIdx >= 0) {
                    localVehicles[locIdx] = latestRemote;
                    this.saveVehicles(localVehicles);
                  }
                }
              }
            } catch (mergeErr) {
              console.warn('Erro ao auto-mesclar despesas de pátio pós-conflito:', mergeErr);
            }
          }
          // Descarta escrita offline após a recuperação/merge
          dequeuePendingSync(op.key, op.queuedAt);
        } else {
          // Permanece na fila para tentativa futura
          break;
        }
      }
    }

    return flushedCount;
  },

  // Sincronização híbrida resiliente com Firebase Firestore (preserva edições offline via OCC / merge por versão)
  async syncFromFirestore(isStaffAuthenticated: boolean = false, userRole: UserRole = 'vendedor'): Promise<{ vehicles: number; owners: number; sales: number }> {
    try {
      // Visitante anônimo da Vitrine Pública: baixa vehicles_public (ou fallback de vehicles) e perfil público
      if (!isStaffAuthenticated) {
        const [remotePublicVehicles, remoteVehiclesFallback, remoteStore] = await Promise.all([
          firebaseDb.getPublicVehicles(),
          firebaseDb.getVehicles(),
          firebaseDb.getStoreProfile()
        ]);

        const bestVehicles = remotePublicVehicles.length > 0
          ? remotePublicVehicles
          : (remoteVehiclesFallback.length > 0 ? remoteVehiclesFallback.map(sanitizePublicVehicle) : []);

        if (bestVehicles.length > 0) {
          safeSetItem(STORAGE_KEYS.PUBLIC_VEHICLES, JSON.stringify(bestVehicles));
          safeSetItem(STORAGE_KEYS.VEHICLES, JSON.stringify(bestVehicles));
        }
        if (remoteStore) {
          const hasPendingLocalStore = getPendingSyncQueue().some(
            op => op.collection === 'store' && op.action === 'upsert'
          );
          if (!hasPendingLocalStore) {
            safeSetItem(STORAGE_KEYS.STORE, JSON.stringify(remoteStore));
          }
        }

        return {
          vehicles: bestVehicles.length,
          owners: 0,
          sales: 0
        };
      }

      // 1. Drena primeiro todas as mutações locais pendentes feitas offline (Write-Ahead Outbox)
      await this.flushPendingSyncQueue(userRole);

      // 2. Equipe autenticada: consulta coleções operacionais; users completo apenas se userRole === 'gestor'
      const [remoteVehicles, remoteOwners, remoteSales, remoteStore, remoteFinanciers, remoteSalespeople, remoteUsers] = await Promise.all([
        firebaseDb.getVehicles(),
        firebaseDb.getOwners(),
        firebaseDb.getSales(),
        firebaseDb.getStoreProfile(),
        firebaseDb.getFinanciers(),
        firebaseDb.getSalespeople(),
        userRole === 'gestor' ? firebaseDb.getUsers() : Promise.resolve([] as SystemUser[])
      ]);

      // 3. Reconciliação inteligente por versão OCC e timestamp (impede sobrescrita de edições locais mais novas)
      if (remoteVehicles.length > 0) {
        const mergedVehicles = mergeEntitiesByFreshness(
          STORAGE_KEYS.VEHICLES,
          this.getVehicles(),
          remoteVehicles,
          'vehicles'
        );
        this.saveVehicles(mergedVehicles);
      }
      if (remoteOwners.length > 0) {
        const mergedOwners = mergeEntitiesByFreshness(
          STORAGE_KEYS.OWNERS,
          this.getOwners(),
          remoteOwners,
          'owners'
        );
        this.saveOwners(mergedOwners);
      }
      if (remoteSales.length > 0) {
        const mergedSales = mergeEntitiesByFreshness(
          STORAGE_KEYS.SALES,
          this.getSales(),
          remoteSales,
          'sales'
        );
        this.saveSales(mergedSales);
      }
      if (remoteStore) {
        const hasPendingStore = getPendingSyncQueue().some(
          op => op.collection === 'store' && op.action === 'upsert'
        );
        if (!hasExplicitLocalKey(STORAGE_KEYS.STORE)) {
          safeSetItem(STORAGE_KEYS.STORE, JSON.stringify(remoteStore));
        } else {
          const localStore = this.getStoreProfile();
          if (!isLocalEntityNewer(localStore, remoteStore, hasPendingStore)) {
            safeSetItem(STORAGE_KEYS.STORE, JSON.stringify(remoteStore));
          }
        }
      }
      if (remoteFinanciers.length > 0) {
        const mergedFinanciers = mergeEntitiesByFreshness(
          STORAGE_KEYS.FINANCIERS,
          this.getFinanciers(),
          remoteFinanciers,
          'financiers'
        );
        this.saveFinanciers(mergedFinanciers);
      }
      if (remoteSalespeople.length > 0) {
        const mergedSalespeople = mergeEntitiesByFreshness(
          STORAGE_KEYS.SALESPEOPLE,
          this.getSalespeople(),
          remoteSalespeople,
          'salespeople'
        );
        this.saveSalespeople(mergedSalespeople);
      }
      if (userRole === 'gestor' && remoteUsers.length > 0) {
        const mergedUsers = mergeEntitiesByFreshness(
          STORAGE_KEYS.USERS,
          this.getUsers(),
          remoteUsers,
          'users'
        );
        this.saveUsers(mergedUsers);
      }

      auditLogger.log({
        acao: 'SINCRONIZACAO_FIREBASE',
        categoria: 'sistema',
        usuarioNome: 'Sistema',
        descricao: `Sincronização administrativa concluída com banco de dados VA VEÍCULOS no Firestore (${remoteVehicles.length} veículos, ${remoteOwners.length} pessoas, ${remoteSales.length} vendas).`
      });

      return {
        vehicles: remoteVehicles.length,
        owners: remoteOwners.length,
        sales: remoteSales.length
      };
    } catch (e) {
      console.warn('Erro na sincronização Firestore:', e);
      return { vehicles: 0, owners: 0, sales: 0 };
    }
  },

  // Audit logging helper
  addAuditLog(
    acao: AuditActionType,
    categoria: 'veiculo' | 'venda' | 'pessoa' | 'financeiro' | 'sistema' | 'documento',
    descricao: string,
    usuarioNome: string,
    detalhes?: Record<string, any>
  ): void {
    const log = auditLogger.log({
      acao,
      categoria,
      descricao,
      usuarioNome,
      detalhes
    });
    firebaseDb.saveAuditLog(log).catch(() => {});
  },

  // Reset to original seed
  resetAll(): void {
    memoryFallbackStore.clear();
    safeSetItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify([]));
    safeSetItem(STORAGE_KEYS.STORE, JSON.stringify(SEED_STORE));
    safeSetItem(STORAGE_KEYS.FINANCIERS, JSON.stringify(SEED_FINANCIERS));
    safeSetItem(STORAGE_KEYS.SALESPEOPLE, JSON.stringify(SEED_SALESPEOPLE));
    safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    safeSetItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
    safeSetItem(STORAGE_KEYS.OWNERS, JSON.stringify(SEED_OWNERS));
    safeSetItem(STORAGE_KEYS.VEHICLES, JSON.stringify(SEED_VEHICLES));
    safeSetItem(STORAGE_KEYS.PUBLIC_VEHICLES, JSON.stringify(SEED_VEHICLES.map(sanitizePublicVehicle)));
    safeSetItem(STORAGE_KEYS.SALES, JSON.stringify(SEED_SALES));
  }
};
