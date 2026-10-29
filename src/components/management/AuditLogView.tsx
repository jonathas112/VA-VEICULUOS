import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldAlert, Search, Filter, RefreshCw, Trash2, 
  Calendar, User, Clock, Eye, X, CheckCircle, AlertTriangle, 
  Car, ShoppingCart, DollarSign, FileText, Settings, Database, ShieldCheck
} from 'lucide-react';
import { AuditLog, AuditActionType } from '../../types';
import { auditLogger } from '../../services/auditLogger';
import { formatDateTime } from '../../utils/formatters';
import { firebaseDb } from '../../services/firebase';
import { PaginationControls } from '../common/PaginationControls';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface AuditLogViewProps {
  logs?: AuditLog[];
  onRefresh?: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = () => {
  const [logsList, setLogsList] = useState<AuditLog[]>(() => auditLogger.getLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [selectedPeriod, setSelectedPeriod] = useState<'todos' | 'hoje' | '7dias'>('todos');
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<AuditLog | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const remoteLogs = await firebaseDb.getAuditLogs();
      if (remoteLogs && remoteLogs.length > 0) {
        // Unifica logs locais e remotos por ID
        const local = auditLogger.getLogs();
        const map = new Map<string, AuditLog>();
        remoteLogs.forEach(l => map.set(l.id, l));
        local.forEach(l => map.set(l.id, l));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLogsList(merged);
      } else {
        setLogsList(auditLogger.getLogs());
      }
    } catch {
      setLogsList(auditLogger.getLogs());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const now = new Date();

    return logsList.filter(log => {
      // Filtro categoria
      if (selectedCategory !== 'todas' && log.categoria !== selectedCategory) {
        return false;
      }

      // Filtro período
      if (selectedPeriod !== 'todos') {
        const logDate = new Date(log.timestamp);
        const diffMs = now.getTime() - logDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (selectedPeriod === 'hoje' && diffDays > 1) return false;
        if (selectedPeriod === '7dias' && diffDays > 7) return false;
      }

      // Busca texto
      if (!term) return true;

      const matchDesc = log.descricao.toLowerCase().includes(term);
      const matchUser = log.usuarioNome.toLowerCase().includes(term);
      const matchAction = log.acao.toLowerCase().includes(term);
      const matchDetails = log.detalhes ? JSON.stringify(log.detalhes).toLowerCase().includes(term) : false;

      return matchDesc || matchUser || matchAction || matchDetails;
    });
  }, [logsList, searchTerm, selectedCategory, selectedPeriod]);

  // Paginação sob demanda com cache de páginas anteriores
  const pagination = usePaginatedList<AuditLog>({
    items: filteredLogs,
    initialPageSize: 10,
    dependencies: [searchTerm, selectedCategory, selectedPeriod, logsList.length]
  });

  const getActionIcon = (categoria: string) => {
    switch (categoria) {
      case 'veiculo':
        return <Car className="w-4 h-4 text-amber-400" />;
      case 'venda':
        return <ShoppingCart className="w-4 h-4 text-emerald-400" />;
      case 'financeiro':
        return <DollarSign className="w-4 h-4 text-blue-400" />;
      case 'pessoa':
        return <User className="w-4 h-4 text-purple-400" />;
      case 'documento':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'sistema':
        return <Database className="w-4 h-4 text-rose-400" />;
      default:
        return <Settings className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getActionBadgeColor = (acao: AuditActionType) => {
    switch (acao) {
      case 'ENTRADA_VEICULO':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'VENDA_VEICULO':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'EXCLUSAO_VEICULO':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'DESPESA_PATIO':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'CADASTRO_PESSOA':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'EDICAO_CONFIGURACOES':
      case 'EDICAO_CONTRATO':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'SINCRONIZACAO_FIREBASE':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Log Geral de Auditoria do Sistema</h1>
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Rastreabilidade imutável de todas as ações executadas no sistema VA Veículos (entradas, edições, despesas, vendas e contratos).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5" title="Conformidade LGPD: Logs imutáveis protegidos contra exclusão ou adulteração">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Trilha Imutável (Append-Only)</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Sincronizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por descrição, usuário, placa, ID ou payload..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Categoria */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="todas">Todas Categorias</option>
            <option value="veiculo">Veículos & Pátio</option>
            <option value="venda">Vendas & Comissões</option>
            <option value="pessoa">Pessoas & Clientes</option>
            <option value="financeiro">Financeiro & Despesas</option>
            <option value="documento">Documentos & Modelos</option>
            <option value="sistema">Sistema & Configurações</option>
          </select>

          {/* Período */}
          <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
            <button
              onClick={() => setSelectedPeriod('todos')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedPeriod === 'todos' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedPeriod('hoje')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedPeriod === 'hoje' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setSelectedPeriod('7dias')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedPeriod === '7dias' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              7 Dias
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Logs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3 px-4">Data & Horário</th>
                <th className="py-3 px-4">Categoria da Ação</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Descrição da Ocorrência</th>
                <th className="py-3 px-4 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
              {pagination.totalItems === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-neutral-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nenhum registro de log encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/40 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap text-neutral-400 font-mono text-[11px]">
                      {formatDateTime(log.timestamp)}
                    </td>

                    {/* Ação & Categoria */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.categoria)}
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getActionBadgeColor(log.acao)}`}>
                          {log.acao}
                        </span>
                      </div>
                    </td>

                    {/* Responsável */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{log.usuarioNome}</span>
                        <span className="text-[10px] text-neutral-500 capitalize">{log.usuarioPapel}</span>
                      </div>
                    </td>

                    {/* Descrição */}
                    <td className="py-3 px-4">
                      <p className="text-neutral-200 line-clamp-2 max-w-xl">
                        {log.descricao}
                      </p>
                    </td>

                    {/* Detalhes */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {log.detalhes ? (
                        <button
                          onClick={() => setSelectedLogForDetails(log)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-medium text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Payload
                        </button>
                      ) : (
                        <span className="text-neutral-600 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação com cache inteligente de páginas anteriores */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            onPageSizeChange={pagination.changePageSize}
            pageSizeOptions={[10, 20, 50]}
            isCached={pagination.isCurrentPageCached}
            isLoading={pagination.isLoading || isRefreshing}
            itemLabel="eventos de auditoria"
          />
        </div>
      </div>

      {/* MODAL DE DETALHES DO PAYLOAD */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative text-white my-8">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-white text-base">
                  Detalhes do Evento de Auditoria
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-neutral-500 block uppercase text-[10px] font-semibold">Descrição</span>
                <p className="text-sm font-medium text-white mt-0.5">{selectedLogForDetails.descricao}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-neutral-500 block uppercase text-[10px]">Data e Hora</span>
                  <span className="font-mono text-neutral-300">{formatDateTime(selectedLogForDetails.timestamp)}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block uppercase text-[10px]">Responsável</span>
                  <span className="text-neutral-300 font-semibold">{selectedLogForDetails.usuarioNome} ({selectedLogForDetails.usuarioPapel})</span>
                </div>
              </div>

              <div>
                <span className="text-neutral-500 block uppercase text-[10px] font-semibold mb-1">Metadados da Ocorrência (JSON)</span>
                <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-amber-300/90 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLogForDetails.detalhes, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
              <button
                onClick={() => setSelectedLogForDetails(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuditLogView;
