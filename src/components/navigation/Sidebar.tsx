import React, { useState } from 'react';
import { 
  LayoutDashboard, Car, Users, ShoppingCart, ShieldAlert,
  DollarSign, Clock, FileText, Settings,
  UserCheck, ShieldCheck,
  X, History, LogOut
} from 'lucide-react';
import { UserRole, Salesperson, StoreProfile } from '../../types';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onToggleCollapse?: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenShowroom: () => void;
  userRole: UserRole;
  authenticatedRole?: UserRole;
  setUserRole: (role: UserRole) => void;
  onRequestElevateToGestor?: () => void;
  onLogout?: () => void;
  activeSeller: Salesperson | null;
  setActiveSeller: (seller: Salesperson) => void;
  salespeople: Salesperson[];
  pendingCommissionsCount: number;
  store?: StoreProfile;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  onToggleCollapse,
  isMobileOpen,
  setIsMobileOpen,
  currentTab,
  onSelectTab,
  onOpenShowroom,
  userRole,
  authenticatedRole = 'vendedor',
  setUserRole,
  onRequestElevateToGestor,
  onLogout,
  activeSeller,
  setActiveSeller,
  salespeople,
  pendingCommissionsCount,
  store
}) => {
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const navSections: NavSection[] = [
    {
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'OPERAÇÃO',
      items: [
        { id: 'inventory', label: 'Estoque', icon: Car },
        { id: 'vehicle_history', label: 'Histórico Veículos', icon: History },
        { id: 'persons', label: 'Pessoas & Clientes', icon: Users },
        { id: 'sales', label: 'Vendas', icon: ShoppingCart },
        { id: 'pos-venda', label: 'Pós-venda', icon: ShieldAlert }
      ]
    },
    {
      title: userRole === 'gestor' ? 'FINANCEIRO & AUDITORIA' : 'COMISSÕES',
      items: [
        ...(userRole === 'gestor' ? [
          { id: 'financial', label: 'Financeiro', icon: DollarSign }
        ] : []),
        { 
          id: 'commissions', 
          label: 'Comissões', 
          icon: Clock,
          badge: pendingCommissionsCount > 0 ? pendingCommissionsCount : undefined
        },
        ...(userRole === 'gestor' ? [
          { id: 'audit_logs', label: 'Log Geral', icon: ShieldAlert }
        ] : [])
      ]
    },
    {
      title: 'DOCUMENTOS',
      items: [
        { id: 'documents', label: 'Documentos', icon: FileText }
      ]
    },
    ...(userRole === 'gestor' ? [{
      title: 'GESTÃO & EQUIPE',
      items: [
        { id: 'users', label: 'Usuários & Equipe', icon: UserCheck },
        { id: 'settings', label: 'Configurações', icon: Settings }
      ]
    }] : [])
  ];

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#080809] border-r border-[#2D2D32] select-none">
      
      {/* Brand Header */}
      <div className={`h-16 flex items-center border-b border-[#2D2D32] px-4 transition-all duration-200 ${
        isCollapsed ? 'justify-center' : 'justify-between'
      }`}>
        <button
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center text-left focus:outline-none cursor-pointer group overflow-hidden"
          title="Ir para o Painel"
        >
          <BrandLogo store={store} size="md" isCollapsed={isCollapsed} />
        </button>

        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1.5 text-[#A7A7AB] hover:text-[#F5F5F5] rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-5 no-scrollbar">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {section.title && !isCollapsed && (
              <div className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-[#68686E] uppercase font-display">
                {section.title}
              </div>
            )}
            {section.title && isCollapsed && (
              <div className="w-6 mx-auto my-2 border-t border-[#2D2D32]" />
            )}

            {section.items.map((item) => {
              const isActive = currentTab === item.id || (item.id === 'pos-venda' && currentTab === 'post-sale');
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => isCollapsed && setHoveredTooltip(item.label)}
                  onMouseLeave={() => setHoveredTooltip(null)}
                >
                  <button
                    id={`sidebar-item-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm font-medium transition-colors cursor-pointer group relative ${
                      isActive
                        ? 'bg-[#17171A] text-[#F5F5F5] font-semibold'
                        : 'text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#17171A]/60'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    {/* Active vertical red indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#D4130D] rounded-r" />
                    )}

                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-[#D4130D]' : 'text-[#A7A7AB] group-hover:text-[#F5F5F5]'
                      }`}
                    />

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}

                    {!isCollapsed && typeof item.badge === 'number' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#D4130D] text-white rounded-full leading-none">
                        {item.badge}
                      </span>
                    )}

                    {isCollapsed && typeof item.badge === 'number' && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4130D]" />
                    )}
                  </button>

                  {/* Tooltip on hover when collapsed */}
                  {isCollapsed && hoveredTooltip === item.label && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2.5 py-1 text-xs font-medium text-[#F5F5F5] bg-[#202024] border border-[#2D2D32] rounded-[6px] shadow-lg whitespace-nowrap pointer-events-none">
                      {item.label}
                      {typeof item.badge === 'number' && ` (${item.badge})`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Profile & Session */}
      <div className="p-3 border-t border-[#2D2D32] space-y-2 bg-[#080809]">
        {/* Connected User Profile Card */}
        {!isCollapsed ? (
          <div className="p-2.5 rounded-[8px] bg-[#17171A] border border-[#2D2D32] text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#A7A7AB] font-bold uppercase tracking-wider">
                Sessão Ativa
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                userRole === 'gestor' 
                  ? 'bg-[#D4130D]/20 text-[#D4130D] border border-[#D4130D]/30' 
                  : 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30'
              }`}>
                {userRole === 'gestor' ? 'Gestor' : 'Vendedor'}
              </span>
            </div>
            <div className="text-xs font-semibold text-[#F5F5F5] truncate">
              {userRole === 'gestor' ? 'Gestor Geral' : (activeSeller?.nome || 'Consultor de Vendas')}
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title={`Perfil: ${userRole === 'gestor' ? 'Gestor Geral' : (activeSeller?.nome || 'Vendedor')}`}>
            <div className="w-8 h-8 rounded-full bg-[#17171A] border border-[#2D2D32] flex items-center justify-center">
              {userRole === 'gestor' ? (
                <ShieldCheck className="w-4 h-4 text-[#D4130D]" />
              ) : (
                <UserCheck className="w-4 h-4 text-[#3B82F6]" />
              )}
            </div>
          </div>
        )}

        {/* Botão Encerrar Sessão */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs font-medium text-[#F43F5E] hover:text-white bg-[#17171A] hover:bg-[#F43F5E]/20 border border-[#2D2D32] hover:border-[#F43F5E]/40 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="Encerrar Sessão do Sistema"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span>Encerrar Sessão</span>}
          </button>
        )}
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar with 200ms smooth transition */}
      <aside
        className={`hidden md:block fixed top-0 left-0 bottom-0 z-30 transition-all duration-200 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop and Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-[280px] max-w-[85vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
