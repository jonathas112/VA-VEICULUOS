import React, { useState, useMemo } from 'react';
import { 
  PanelLeftClose, PanelLeft, Search, Bell, ExternalLink,
  ShieldCheck, UserCheck, ChevronDown, Check, User, LogOut,
  Clock, AlertTriangle, Car, CheckCheck, CheckCircle2, ShoppingCart, ShieldAlert
} from 'lucide-react';
import { UserRole, Salesperson, StoreProfile, Vehicle, Sale } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import { formatCurrency } from '../../utils/formatters';

interface TopbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  onOpenGlobalSearch: () => void;
  onOpenShowroom: () => void;
  userRole: UserRole;
  authenticatedRole?: UserRole;
  setUserRole: (role: UserRole) => void;
  onRequestElevateToGestor?: () => void;
  onLogout?: () => void;
  activeSeller: Salesperson | null;
  pendingCommissionsCount: number;
  onNavigateToCommissions: () => void;
  onNavigateTab?: (tab: string, filter?: string) => void;
  vehicles?: Vehicle[];
  sales?: Sale[];
  store?: StoreProfile;
}

interface NotificationItem {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'comissao' | 'estoque' | 'detran' | 'pos_venda' | 'venda';
  tab: string;
  filter?: string;
  urgente?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
  onOpenGlobalSearch,
  onOpenShowroom,
  userRole,
  authenticatedRole = 'vendedor',
  onLogout,
  activeSeller,
  pendingCommissionsCount,
  onNavigateToCommissions,
  onNavigateTab,
  vehicles = [],
  sales = [],
  store
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'todas' | 'pendentes'>('todas');

  // Persistência de notificações lidas
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vaveiculos_read_notifications_v1') || '[]');
    } catch {
      return [];
    }
  });

  const userName = userRole === 'gestor' ? 'Gestor Geral' : (activeSeller?.nome || 'Consultor');

  // 1. Motor de Notificações 100% Funcional e Reativo
  const notifications: NotificationItem[] = useMemo(() => {
    const list: NotificationItem[] = [];
    const now = Date.now();

    // A. Comissões Pendentes (Prioridade Alta)
    if (userRole === 'gestor') {
      const pendingSales = sales.filter(s => s.comissaoPendente);
      pendingSales.forEach(s => {
        list.push({
          id: `comm_${s.id}`,
          titulo: `Comissão a Fixar: ${s.veiculoModelo || 'Veículo'}`,
          mensagem: `Venda de ${formatCurrency(s.valorVenda)} por ${s.vendedorNome || 'vendedor'} aguarda aprovação de comissão.`,
          tipo: 'comissao',
          tab: 'commissions',
          urgente: true
        });
      });
    } else if (userRole === 'vendedor' && activeSeller) {
      const myPending = sales.filter(s => s.comissaoPendente && s.vendedorId === activeSeller.id);
      myPending.forEach(s => {
        list.push({
          id: `comm_pend_${s.id}`,
          titulo: `Comissão em Análise: ${s.veiculoModelo || 'Veículo'}`,
          mensagem: `Venda de ${formatCurrency(s.valorVenda)} aguarda homologação do Gestor.`,
          tipo: 'comissao',
          tab: 'commissions',
          urgente: false
        });
      });
    }

    // B. Alerta de Giro de Estoque (Veículos em pátio há mais de 30 dias sem venda)
    vehicles
      .filter(v => v.status === 'em_estoque' && v.dataEntrada)
      .forEach(v => {
        const days = Math.floor((now - new Date(v.dataEntrada).getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 30) {
          list.push({
            id: `patio_${v.id}`,
            titulo: `Alerta de Giro: ${v.marca} ${v.modelo}`,
            mensagem: `Veículo em pátio há ${days} dias sem venda (Placa: ${v.placa}). Avalie anúncio ou revisão de preço.`,
            tipo: 'estoque',
            tab: 'inventory',
            filter: v.placa,
            urgente: days >= 60
          });
        }
      });

    // C. Débitos DETRAN Pendentes Assumidos pela Loja
    vehicles
      .filter(v => v.status === 'em_estoque' && v.debitoDetran?.temDebito && v.debitoDetran?.quemArca === 'loja' && (v.debitoDetran?.valor || 0) > 0)
      .forEach(v => {
        list.push({
          id: `detran_${v.id}`,
          titulo: `Débito DETRAN a Quitar: ${v.placa}`,
          mensagem: `${v.marca} ${v.modelo} possui ${formatCurrency(v.debitoDetran!.valor)} (${v.debitoDetran!.descricao || 'Débitos DETRAN'}) assumido pela loja.`,
          tipo: 'detran',
          tab: 'inventory',
          filter: v.placa
        });
      });

    // D. Pós-Venda Recente (Custo de garantia lançado)
    sales
      .filter(s => s.custosPosVenda && s.custosPosVenda.length > 0)
      .slice(0, 3)
      .forEach(s => {
        const total = s.custosPosVenda!.reduce((acc, c) => acc + (c.valor || 0), 0);
        list.push({
          id: `pos_${s.id}`,
          titulo: `Pós-Venda: ${s.veiculoModelo || 'Veículo'}`,
          mensagem: `Despesa de assistência de ${formatCurrency(total)} lançada para ${s.clienteNome}.`,
          tipo: 'pos_venda',
          tab: 'pos-venda'
        });
      });

    // E. Vendas Concretizadas Recentes
    sales.slice(0, 3).forEach(s => {
      list.push({
        id: `sale_${s.id}`,
        titulo: `Venda Realizada: ${s.veiculoModelo || 'Veículo'}`,
        mensagem: `Concretizada por ${formatCurrency(s.valorVenda)} para ${s.clienteNome}.`,
        tipo: 'venda',
        tab: 'sales'
      });
    });

    return list;
  }, [vehicles, sales, userRole, activeSeller]);

  // Contagem de não lidas
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  const displayedNotifications = useMemo(() => {
    if (activeFilter === 'pendentes') {
      return notifications.filter(n => !readIds.includes(n.id));
    }
    return notifications;
  }, [notifications, activeFilter, readIds]);

  const handleMarkAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('vaveiculos_read_notifications_v1', JSON.stringify(allIds));
    } catch {}
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!readIds.includes(item.id)) {
      const updated = [...readIds, item.id];
      setReadIds(updated);
      try {
        localStorage.setItem('vaveiculos_read_notifications_v1', JSON.stringify(updated));
      } catch {}
    }
    setIsNotificationsOpen(false);

    if (onNavigateTab) {
      onNavigateTab(item.tab, item.filter);
    } else if (item.tab === 'commissions') {
      onNavigateToCommissions();
    }
  };

  return (
    <header className="h-16 bg-[#0D0D0F] border-b border-[#2D2D32] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      
      {/* Seção Esquerda: Alternância da barra lateral & Barra de Pesquisa Global */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
        
        {/* Botão canônico de recolher/expandir o menu para desktop */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden md:flex p-2 rounded-[8px] text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#17171A] border border-transparent hover:border-[#2D2D32] transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-5 h-5 text-[#CAC9CA]" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-[#CAC9CA]" />
          )}
        </button>

        {/* Botão para abrir gaveta mobile */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-[8px] text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#17171A] border border-[#2D2D32]"
          title="Abrir Menu"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Logotipo mobile ou quando menu está recolhido */}
        <div className="flex md:hidden items-center shrink-0 pr-1 border-r border-[#2D2D32]/60">
          <BrandLogo store={store} size="sm" showText={false} />
        </div>
        {isSidebarCollapsed && (
          <div className="hidden md:flex items-center shrink-0 pr-2 border-r border-[#2D2D32]/60">
            <BrandLogo store={store} size="sm" showText={false} />
          </div>
        )}

        {/* Disparador de Busca Global */}
        <button
          type="button"
          onClick={onOpenGlobalSearch}
          className="flex items-center gap-2.5 w-full max-w-md bg-[#202024] hover:bg-[#202024]/80 border border-[#343439] hover:border-[#D4130D]/50 text-left px-3 py-2 rounded-[8px] text-xs sm:text-sm text-[#68686E] hover:text-[#CAC9CA] transition-colors cursor-pointer group"
        >
          <Search className="w-4 h-4 text-[#A7A7AB] group-hover:text-[#D4130D] transition-colors shrink-0" />
          <span className="truncate">Pesquisar veículo, placa, CPF, cliente...</span>
          <kbd className="hidden sm:inline-block ml-auto text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-[#17171A] border border-[#2D2D32] text-[#A7A7AB]">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Seção Direita: Link Único da Vitrine, Notificações e Menu de Perfil */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* ÚNICO BOTÃO DA VITRINE: Menor, discreto, sem emoji de brilho */}
        <button
          type="button"
          onClick={onOpenShowroom}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-[6px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#D4130D]/40 text-[#CAC9CA] hover:text-white transition-all cursor-pointer group"
          title="Abrir página de acesso para os clientes"
        >
          <ExternalLink className="w-3 h-3 text-[#A7A7AB] group-hover:text-white transition-colors" />
          <span>Página de Acesso dos Clientes</span>
        </button>

        {/* Central de Notificações 100% Funcional */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsUserMenuOpen(false);
            }}
            className="relative p-2 rounded-[8px] text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#17171A] border border-transparent hover:border-[#2D2D32] transition-colors cursor-pointer"
            title={unreadCount > 0 ? `${unreadCount} notificação(ões) pendente(s)` : 'Nenhuma notificação nova'}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4130D] text-white text-[10px] font-extrabold flex items-center justify-center leading-none shadow-md ring-2 ring-[#0D0D0F] animate-in zoom-in duration-200">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown de Notificações */}
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#17171A] border border-[#2D2D32] rounded-[12px] shadow-2xl p-3.5 z-40 animate-in fade-in-50">
              
              {/* Cabeçalho */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#2D2D32]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider font-display">
                    Notificações
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold bg-[#D4130D] text-white px-1.5 py-0.5 rounded-full">
                      {unreadCount} nova(s)
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#A7A7AB] hover:text-white transition-colors cursor-pointer"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                    <span>Marcar lidas</span>
                  </button>
                )}
              </div>

              {/* Filtro Rápido */}
              <div className="flex items-center gap-1.5 pt-2 pb-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveFilter('todas')}
                  className={`px-2 py-0.5 rounded-[5px] transition-colors ${
                    activeFilter === 'todas'
                      ? 'bg-[#202024] text-white font-semibold'
                      : 'text-[#A7A7AB] hover:text-white'
                  }`}
                >
                  Todas ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('pendentes')}
                  className={`px-2 py-0.5 rounded-[5px] transition-colors ${
                    activeFilter === 'pendentes'
                      ? 'bg-[#202024] text-white font-semibold'
                      : 'text-[#A7A7AB] hover:text-white'
                  }`}
                >
                  Não lidas ({unreadCount})
                </button>
              </div>

              {/* Lista de Notificações */}
              <div className="py-1.5 max-h-80 overflow-y-auto space-y-2 no-scrollbar">
                {displayedNotifications.length > 0 ? (
                  displayedNotifications.map(item => {
                    const isRead = readIds.includes(item.id);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNotificationClick(item)}
                        className={`w-full text-left p-2.5 rounded-[8px] transition-all cursor-pointer border flex items-start gap-2.5 ${
                          isRead
                            ? 'bg-[#121214]/60 border-[#222226] text-[#A7A7AB] hover:bg-[#1A1A1E]'
                            : 'bg-[#1C1C20] border-[#343439] text-[#F5F5F5] hover:bg-[#232328] hover:border-[#D4130D]/50 shadow-sm'
                        }`}
                      >
                        {/* Ícone por tipo */}
                        <div className={`w-7 h-7 rounded-[6px] shrink-0 flex items-center justify-center mt-0.5 ${
                          item.tipo === 'comissao'
                            ? 'bg-[#D4130D]/15 text-[#D4130D]'
                            : item.tipo === 'estoque'
                            ? 'bg-amber-500/15 text-amber-400'
                            : item.tipo === 'detran'
                            ? 'bg-orange-500/15 text-orange-400'
                            : item.tipo === 'pos_venda'
                            ? 'bg-purple-500/15 text-purple-400'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {item.tipo === 'comissao' && <Clock className="w-3.5 h-3.5" />}
                          {item.tipo === 'estoque' && <Car className="w-3.5 h-3.5" />}
                          {item.tipo === 'detran' && <AlertTriangle className="w-3.5 h-3.5" />}
                          {item.tipo === 'pos_venda' && <ShieldAlert className="w-3.5 h-3.5" />}
                          {item.tipo === 'venda' && <ShoppingCart className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs truncate ${!isRead ? 'font-bold text-white' : 'font-medium text-[#CAC9CA]'}`}>
                              {item.titulo}
                            </span>
                            {!isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D4130D] shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#A7A7AB] leading-snug mt-0.5 line-clamp-2">
                            {item.mensagem}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-[#22C55E]/60 mx-auto" />
                    <p className="text-xs font-semibold text-[#CAC9CA]">
                      Tudo em dia!
                    </p>
                    <p className="text-[11px] text-[#68686E] max-w-[220px] mx-auto">
                      {activeFilter === 'pendentes'
                        ? 'Todas as notificações foram marcadas como lidas.'
                        : 'Nenhuma pendência operacional registrada no momento.'}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Menu do Perfil do Usuário Conectado */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-[8px] hover:bg-[#17171A] border border-transparent hover:border-[#2D2D32] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#202024] border border-[#2D2D32] flex items-center justify-center text-[#CAC9CA] text-xs font-bold shrink-0">
              {userRole === 'gestor' ? (
                <ShieldCheck className="w-4 h-4 text-[#D4130D]" />
              ) : (
                <User className="w-4 h-4 text-[#3B82F6]" />
              )}
            </div>
            
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#F5F5F5] leading-tight">
                {userName}
              </span>
              <span className="text-[11px] text-[#A7A7AB] leading-tight capitalize">
                {userRole === 'gestor' ? 'Gestor Geral' : 'Vendedor'}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-[#A7A7AB] hidden sm:block" />
          </button>

          {/* Dropdown da Conta (Sem botão duplicado de Vitrine) */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#17171A] border border-[#2D2D32] rounded-[10px] shadow-2xl p-3 z-40 animate-in fade-in-50">
              <div className="pb-2 mb-2 border-b border-[#2D2D32]">
                <div className="text-xs font-bold text-[#F5F5F5]">
                  {userName}
                </div>
                <div className="text-[11px] text-[#A7A7AB]">
                  {userRole === 'gestor' ? 'Acesso administrativo completo' : 'Perfil operacional de vendas'}
                </div>
              </div>

              <div className="pt-1">
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[6px] text-xs text-[#F43F5E] hover:bg-[#F43F5E]/20 hover:text-white transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Encerrar Sessão</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
