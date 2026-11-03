import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Vehicle, FormerOwner, Sale, StoreProfile, AuditLog, ContractTemplate, Financier, Salesperson, SystemUser } from '../types';
import { hashPassword, isHashedPassword, sanitizePublicVehicle } from '../utils/security';

export class ConcurrencyConflictError extends Error {
  public readonly code = 'CONCURRENCY_CONFLICT';
  public readonly localVersion?: number;
  public readonly remoteVersion?: number;

  constructor(message: string, localVersion?: number, remoteVersion?: number) {
    super(message);
    this.name = 'ConcurrencyConflictError';
    this.localVersion = localVersion;
    this.remoteVersion = remoteVersion;
  }
}

export type FirebaseSyncStatus = 'idle' | 'online' | 'offline';

let syncStatus: FirebaseSyncStatus = 'idle';
let lastSyncAt: string | null = null;
let lastErrorMessage: string | null = null;
let forcedOfflineMode = false;

function markSyncOnline() {
  syncStatus = 'online';
  lastSyncAt = new Date().toISOString();
  lastErrorMessage = null;
}

function markSyncOffline(errorMsg: string) {
  syncStatus = 'offline';
  lastErrorMessage = errorMsg;
}

export const firebaseConnection = {
  getStatus(): FirebaseSyncStatus {
    if (forcedOfflineMode) return 'offline';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
    return syncStatus;
  },
  getLastSyncAt(): string | null {
    return lastSyncAt;
  },
  getLastError(): string | null {
    return lastErrorMessage;
  },
  setSimulatedOffline(offline: boolean): void {
    forcedOfflineMode = offline;
    if (offline) {
      markSyncOffline('Modo offline simulado ativo.');
    } else {
      syncStatus = 'idle';
      lastErrorMessage = null;
    }
  },
  isSimulatedOffline(): boolean {
    return forcedOfflineMode;
  }
};

function ensureOnlineReady(path: string): void {
  if (forcedOfflineMode) {
    throw new Error(`Firebase offline (simulado) ao acessar ${path}`);
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(`Sem conexão de rede (navigator.onLine=false) ao acessar ${path}`);
  }
  if (!db) {
    throw new Error(`Instância Firestore indisponível ao acessar ${path}`);
  }
}

let initializedApp: FirebaseApp | null = null;
let initializedDb: Firestore | null = null;
let initializedAuth: Auth | null = null;

try {
  initializedApp = initializeApp(firebaseConfig);
  initializedDb = getFirestore(initializedApp, firebaseConfig.firestoreDatabaseId);
  initializedAuth = getAuth(initializedApp);
} catch (initErr) {
  markSyncOffline(initErr instanceof Error ? initErr.message : String(initErr));
  console.warn('Firebase inicializado em modo resiliente local-first:', initErr);
}

export const app = initializedApp as FirebaseApp;
export const db = initializedDb as Firestore;
export const auth = initializedAuth as Auth;

export const firebaseAuth = {
  async signInStaff(email: string, plainPassword: string): Promise<boolean> {
    try {
      if (forcedOfflineMode || !auth) return false;
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), plainPassword);
      return true;
    } catch {
      // Fallback híbrido seguro quando offline ou quando o provedor Cloud Auth não está provisionado para o usuário local
      return false;
    }
  },

  async signOutStaff(): Promise<void> {
    try {
      if (auth && auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // Ignora erro de rede no encerramento local
    }
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  markSyncOffline(errMsg);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
    }
  };
  if (!forcedOfflineMode) {
    console.warn('Firestore Fallback (modo híbrido local ativo): ', JSON.stringify(errInfo));
  }
  return errInfo;
}

/**
 * Remove recursivamente chaves com valor `undefined` em objetos planos,
 * preservando instâncias especiais do SDK (como `serverTimestamp()`).
 */
function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => stripUndefinedFields(item)) as unknown as T;
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefinedFields(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

/**
 * Funções de sincronização do banco de dados VA VEÍCULOS
 */
export const firebaseDb = {
  // Salvar / atualizar perfil da loja e logo
  async saveStoreProfile(profile: StoreProfile): Promise<boolean> {
    try {
      ensureOnlineReady('store_config/main');
      await setDoc(doc(db, 'store_config', 'main'), stripUndefinedFields({
        ...profile,
        atualizadoEm: profile.atualizadoEm || new Date().toISOString()
      }), { merge: true });
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'store_config/main');
      return false;
    }
  },

  async getStoreProfile(): Promise<StoreProfile | null> {
    try {
      ensureOnlineReady('store_config/main');
      const snap = await getDoc(doc(db, 'store_config', 'main'));
      markSyncOnline();
      if (snap.exists()) {
        return snap.data() as StoreProfile;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'store_config/main');
    }
    return null;
  },

  // Salvar / atualizar veículo com transação atômica e controle de concorrência otimista (OCC)
  async saveVehicle(vehicle: Vehicle): Promise<boolean> {
    try {
      ensureOnlineReady(`vehicles/${vehicle.id}`);
      const timestamp = vehicle.atualizadoEm || new Date().toISOString();
      const publicProjection = sanitizePublicVehicle(vehicle);
      const vehicleRef = doc(db, 'vehicles', vehicle.id);
      const publicRef = doc(db, 'vehicles_public', vehicle.id);

      await runTransaction(db, async (tx) => {
        const remoteSnap = await tx.get(vehicleRef);
        if (remoteSnap.exists()) {
          const remoteData = remoteSnap.data() as Partial<Vehicle>;
          if (
            typeof vehicle.version === 'number' &&
            typeof remoteData.version === 'number' &&
            vehicle.version < remoteData.version
          ) {
            throw new ConcurrencyConflictError(
              `Conflito de concorrência na nuvem para o veículo ${vehicle.placa} (remoto v${remoteData.version} > local v${vehicle.version}).`,
              vehicle.version,
              remoteData.version
            );
          }
        }

        tx.set(vehicleRef, stripUndefinedFields({
          ...vehicle,
          atualizadoEm: timestamp
        }), { merge: true });

        tx.set(publicRef, stripUndefinedFields({
          ...publicProjection,
          version: vehicle.version,
          atualizadoEm: timestamp
        }), { merge: true });
      });

      markSyncOnline();
      return true;
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        throw e;
      }
      handleFirestoreError(e, OperationType.WRITE, `vehicles/${vehicle.id}`);
      return false;
    }
  },

  async deleteVehicle(vehicleId: string): Promise<boolean> {
    try {
      ensureOnlineReady(`vehicles/${vehicleId}`);
      await Promise.all([
        deleteDoc(doc(db, 'vehicles', vehicleId)),
        deleteDoc(doc(db, 'vehicles_public', vehicleId))
      ]);
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `vehicles/${vehicleId}`);
      return false;
    }
  },

  async getVehicles(): Promise<Vehicle[]> {
    try {
      ensureOnlineReady('vehicles');
      const snap = await getDocs(collection(db, 'vehicles'));
      markSyncOnline();
      return snap.docs.map(d => d.data() as Vehicle);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'vehicles');
      return [];
    }
  },

  async getPublicVehicles(): Promise<Vehicle[]> {
    try {
      ensureOnlineReady('vehicles_public');
      const snap = await getDocs(collection(db, 'vehicles_public'));
      markSyncOnline();
      return snap.docs.map(d => sanitizePublicVehicle(d.data() as Vehicle));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'vehicles_public');
      return [];
    }
  },

  // Salvar / atualizar pessoa / antigo dono
  async saveOwner(owner: FormerOwner): Promise<boolean> {
    try {
      ensureOnlineReady(`owners/${owner.id}`);
      await setDoc(doc(db, 'owners', owner.id), stripUndefinedFields({
        ...owner,
        atualizadoEm: owner.atualizadoEm || new Date().toISOString()
      }), { merge: true });
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `owners/${owner.id}`);
      return false;
    }
  },

  async getOwners(): Promise<FormerOwner[]> {
    try {
      ensureOnlineReady('owners');
      const snap = await getDocs(collection(db, 'owners'));
      markSyncOnline();
      return snap.docs.map(d => d.data() as FormerOwner);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'owners');
      return [];
    }
  },

  // Salvar venda com transação atômica e controle de concorrência otimista (OCC)
  async saveSale(sale: Sale): Promise<boolean> {
    try {
      ensureOnlineReady(`sales/${sale.id}`);
      const timestamp = sale.atualizadoEm || new Date().toISOString();
      const saleRef = doc(db, 'sales', sale.id);

      await runTransaction(db, async (tx) => {
        const remoteSnap = await tx.get(saleRef);
        if (remoteSnap.exists()) {
          const remoteData = remoteSnap.data() as Partial<Sale>;
          if (
            typeof sale.version === 'number' &&
            typeof remoteData.version === 'number' &&
            sale.version < remoteData.version
          ) {
            throw new ConcurrencyConflictError(
              `Conflito de concorrência na nuvem para a venda ${sale.id} (remoto v${remoteData.version} > local v${sale.version}).`,
              sale.version,
              remoteData.version
            );
          }
        }

        tx.set(saleRef, stripUndefinedFields({
          ...sale,
          atualizadoEm: timestamp
        }), { merge: true });
      });

      markSyncOnline();
      return true;
    } catch (e) {
      if (e instanceof ConcurrencyConflictError) {
        throw e;
      }
      handleFirestoreError(e, OperationType.WRITE, `sales/${sale.id}`);
      return false;
    }
  },

  async getSales(): Promise<Sale[]> {
    try {
      ensureOnlineReady('sales');
      const snap = await getDocs(collection(db, 'sales'));
      markSyncOnline();
      return snap.docs.map(d => d.data() as Sale);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'sales');
      return [];
    }
  },

  // Salvar modelo de contrato / recibo
  async saveTemplate(template: ContractTemplate): Promise<boolean> {
    try {
      ensureOnlineReady(`templates/${template.id}`);
      await setDoc(doc(db, 'templates', template.id), stripUndefinedFields({
        ...template,
        atualizadoEm: template.atualizadoEm || new Date().toISOString()
      }), { merge: true });
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `templates/${template.id}`);
      return false;
    }
  },

  // Salvar entrada no log de auditoria
  async saveAuditLog(log: AuditLog): Promise<boolean> {
    try {
      ensureOnlineReady(`audit_logs/${log.id}`);
      await setDoc(doc(db, 'audit_logs', log.id), stripUndefinedFields({
        ...log,
        serverTime: serverTimestamp()
      }));
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `audit_logs/${log.id}`);
      return false;
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      ensureOnlineReady('audit_logs');
      const snap = await getDocs(collection(db, 'audit_logs'));
      markSyncOnline();
      return snap.docs.map(d => d.data() as AuditLog);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'audit_logs');
      return [];
    }
  },

  // Paginação sob demanda de logs de auditoria do banco
  async getPaginatedAuditLogs(pageSize: number = 10, pageNumber: number = 1): Promise<{ logs: AuditLog[]; totalCount: number }> {
    try {
      ensureOnlineReady('audit_logs');
      const snap = await getDocs(collection(db, 'audit_logs'));
      markSyncOnline();
      const allLogs = snap.docs.map(d => d.data() as AuditLog).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const totalCount = allLogs.length;
      const startIdx = (pageNumber - 1) * pageSize;
      const paginatedSlice = allLogs.slice(startIdx, startIdx + pageSize);
      return { logs: paginatedSlice, totalCount };
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'audit_logs');
      return { logs: [], totalCount: 0 };
    }
  },

  // Financeiras & Bancos credenciados
  async saveFinancier(financier: Financier): Promise<boolean> {
    try {
      ensureOnlineReady(`financiers/${financier.id}`);
      await setDoc(doc(db, 'financiers', financier.id), stripUndefinedFields({
        ...financier,
        atualizadoEm: financier.atualizadoEm || new Date().toISOString()
      }), { merge: true });
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `financiers/${financier.id}`);
      return false;
    }
  },

  async deleteFinancier(financierId: string): Promise<boolean> {
    try {
      ensureOnlineReady(`financiers/${financierId}`);
      await deleteDoc(doc(db, 'financiers', financierId));
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `financiers/${financierId}`);
      return false;
    }
  },

  async getFinanciers(): Promise<Financier[]> {
    try {
      ensureOnlineReady('financiers');
      const snap = await getDocs(collection(db, 'financiers'));
      markSyncOnline();
      return snap.docs.map(d => d.data() as Financier);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'financiers');
      return [];
    }
  },

  // Equipe de Vendedores / Consultores (sem armazenamento de senhas)
  async saveSalesperson(salesperson: Salesperson): Promise<boolean> {
    try {
      ensureOnlineReady(`salespeople/${salesperson.id}`);
      const { senha: _omittedPassword, ...safeSalesperson } = salesperson;
      await setDoc(doc(db, 'salespeople', salesperson.id), stripUndefinedFields({
        ...safeSalesperson,
        atualizadoEm: salesperson.atualizadoEm || new Date().toISOString()
      }), { merge: true });
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `salespeople/${salesperson.id}`);
      return false;
    }
  },

  async deleteSalesperson(salespersonId: string): Promise<boolean> {
    try {
      ensureOnlineReady(`salespeople/${salespersonId}`);
      await deleteDoc(doc(db, 'salespeople', salespersonId));
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `salespeople/${salespersonId}`);
      return false;
    }
  },

  async getSalespeople(): Promise<Salesperson[]> {
    try {
      ensureOnlineReady('salespeople');
      const snap = await getDocs(collection(db, 'salespeople'));
      markSyncOnline();
      return snap.docs.map(d => {
        const { senha: _omittedPassword, ...safeData } = d.data() as Salesperson;
        return safeData;
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'salespeople');
      return [];
    }
  },

  // Usuários do Sistema (Gestores e Vendedores) — senhas sempre com hash SHA-256 + salt
  async saveUser(user: SystemUser): Promise<boolean> {
    try {
      ensureOnlineReady(`users/${user.id}`);
      const hashedSecret = isHashedPassword(user.senha)
        ? user.senha
        : hashPassword(user.senha, user.email);
      await setDoc(doc(db, 'users', user.id), stripUndefinedFields({
        ...user,
        senha: hashedSecret,
        atualizadoEm: user.atualizadoEm || new Date().toISOString()
      }), { merge: true });
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.id}`);
      return false;
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      ensureOnlineReady(`users/${userId}`);
      await deleteDoc(doc(db, 'users', userId));
      markSyncOnline();
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${userId}`);
      return false;
    }
  },

  async getUsers(): Promise<SystemUser[]> {
    try {
      ensureOnlineReady('users');
      const snap = await getDocs(collection(db, 'users'));
      markSyncOnline();
      return snap.docs.map(d => d.data() as SystemUser);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'users');
      return [];
    }
  }
};
