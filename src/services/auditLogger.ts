import { AuditLog, AuditActionType } from '../types';

const AUDIT_STORAGE_KEY = 'vaveiculos_audit_logs_v1';

export const auditLogger = {
  getLogs(): AuditLog[] {
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

    try {
      const logs = this.getLogs();
      logs.unshift(newLog);
      // Mantém últimos 500 registros para alta performance
      const trimmed = logs.slice(0, 500);
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Erro ao salvar log local:', e);
    }

    return newLog;
  },

  clearLogs(): void {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
  }
};
