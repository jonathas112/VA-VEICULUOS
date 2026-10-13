import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Vehicle, FormerOwner, Sale, StoreProfile, AuditLog, ContractTemplate, Financier, Salesperson } from '../types';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
    }
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Funções de sincronização do banco de dados VA VEÍCULOS
 */
export const firebaseDb = {
  // Salvar / atualizar perfil da loja e logo
  async saveStoreProfile(profile: StoreProfile): Promise<boolean> {
    try {
      await setDoc(doc(db, 'store_config', 'main'), {
        ...profile,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'store_config/main');
      return false;
    }
  },

  async getStoreProfile(): Promise<StoreProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'store_config', 'main'));
      if (snap.exists()) {
        return snap.data() as StoreProfile;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'store_config/main');
    }
    return null;
  },

  // Salvar / atualizar veículo (incluindo até 10 fotos comprimidas)
  async saveVehicle(vehicle: Vehicle): Promise<boolean> {
    try {
      await setDoc(doc(db, 'vehicles', vehicle.id), {
        ...vehicle,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `vehicles/${vehicle.id}`);
      return false;
    }
  },

  async deleteVehicle(vehicleId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `vehicles/${vehicleId}`);
      return false;
    }
  },

  async getVehicles(): Promise<Vehicle[]> {
    try {
      const snap = await getDocs(collection(db, 'vehicles'));
      return snap.docs.map(d => d.data() as Vehicle);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'vehicles');
      return [];
    }
  },

  // Salvar / atualizar pessoa / antigo dono
  async saveOwner(owner: FormerOwner): Promise<boolean> {
    try {
      await setDoc(doc(db, 'owners', owner.id), {
        ...owner,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `owners/${owner.id}`);
      return false;
    }
  },

  async getOwners(): Promise<FormerOwner[]> {
    try {
      const snap = await getDocs(collection(db, 'owners'));
      return snap.docs.map(d => d.data() as FormerOwner);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'owners');
      return [];
    }
  },

  // Salvar venda
  async saveSale(sale: Sale): Promise<boolean> {
    try {
      await setDoc(doc(db, 'sales', sale.id), {
        ...sale,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `sales/${sale.id}`);
      return false;
    }
  },

  async getSales(): Promise<Sale[]> {
    try {
      const snap = await getDocs(collection(db, 'sales'));
      return snap.docs.map(d => d.data() as Sale);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'sales');
      return [];
    }
  },

  // Salvar modelo de contrato / recibo
  async saveTemplate(template: ContractTemplate): Promise<boolean> {
    try {
      await setDoc(doc(db, 'templates', template.id), {
        ...template,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `templates/${template.id}`);
      return false;
    }
  },

  // Salvar entrada no log de auditoria
  async saveAuditLog(log: AuditLog): Promise<boolean> {
    try {
      await setDoc(doc(db, 'audit_logs', log.id), {
        ...log,
        serverTime: serverTimestamp()
      });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `audit_logs/${log.id}`);
      return false;
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const snap = await getDocs(collection(db, 'audit_logs'));
      return snap.docs.map(d => d.data() as AuditLog);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'audit_logs');
      return [];
    }
  },

  // Financeiras & Bancos credenciados
  async saveFinancier(financier: Financier): Promise<boolean> {
    try {
      await setDoc(doc(db, 'financiers', financier.id), {
        ...financier,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `financiers/${financier.id}`);
      return false;
    }
  },

  async deleteFinancier(financierId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'financiers', financierId));
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `financiers/${financierId}`);
      return false;
    }
  },

  async getFinanciers(): Promise<Financier[]> {
    try {
      const snap = await getDocs(collection(db, 'financiers'));
      return snap.docs.map(d => d.data() as Financier);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'financiers');
      return [];
    }
  },

  // Equipe de Vendedores / Consultores
  async saveSalesperson(salesperson: Salesperson): Promise<boolean> {
    try {
      await setDoc(doc(db, 'salespeople', salesperson.id), {
        ...salesperson,
        atualizadoEm: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `salespeople/${salesperson.id}`);
      return false;
    }
  },

  async deleteSalesperson(salespersonId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'salespeople', salespersonId));
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `salespeople/${salespersonId}`);
      return false;
    }
  },

  async getSalespeople(): Promise<Salesperson[]> {
    try {
      const snap = await getDocs(collection(db, 'salespeople'));
      return snap.docs.map(d => d.data() as Salesperson);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'salespeople');
      return [];
    }
  }
};
