import { AuditLog, AuditActionType } from '../types';

const AUDIT_STORAGE_KEY = 'vaveiculos_audit_logs_v1';
let memoryAuditFallback: AuditLog[] | null = null;

export const auditLogger = {
  getLogs(): AuditLog[] {
    if (memoryAuditFallback !== null) {
      return [...memoryAuditFallback];
    }
    try {
      const data = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Erro ao carregar logs locais:', e);
    }
    return [];
  },

  log(entry: {
    acao: AuditActionType;
    categoria: AuditLog['categoria'];
    descricao: string;
    usuarioNome?: string;
    usuarioPapel?: string;
    usuarioId?: string;
    detalhes?: Record<string, any>;
  }): AuditLog {
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      usuarioId: entry.usuarioId || 'admin_1',
      usuarioNome: entry.usuarioNome || 'Gestor Geral',
      usuarioPapel: entry.usuarioPapel || 'gestor',
      acao: entry.acao,
      categoria: entry.categoria,
      descricao: entry.descricao,
      detalhes: entry.detalhes
    };

    const logs = this.getLogs();
    logs.unshift(newLog);
    const trimmed = logs.slice(0, 500);

    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
      memoryAuditFallback = null;
    } catch {
      // Auto-recuperação de cota: tenta reter os 100 logs mais recentes; se ainda sem cota, mantém em memória
      try {
        const emergencyTrimmed = trimmed.slice(0, 100);
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(emergencyTrimmed));
        memoryAuditFallback = null;
      } catch (e2) {
        try {
          localStorage.removeItem(AUDIT_STORAGE_KEY);
        } catch {
          // Ignora falha se storage estiver completamente bloqueado
        }
        memoryAuditFallback = trimmed;
        console.warn('Cota do navegador atingida para logs locais; fallback em memória ativado:', e2);
      }
    }

    return newLog;
  },

  clearLogs(): void {
    memoryAuditFallback = null;
    try {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch {
      // Ignora caso localStorage esteja indisponível
    }
  }
};
