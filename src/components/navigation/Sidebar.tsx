import React, { useState } from 'react';
import { 
  LayoutDashboard, Car, Users, ShoppingCart, ShieldAlert,
  DollarSign, Clock, FileText, Settings, ExternalLink,
  ChevronLeft, ChevronRight, UserCheck, ShieldCheck,
  X, History
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
  setUserRole: (role: UserRole) => void;
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
  setUserRole,
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
      title: 'FINANCEIRO & AUDITORIA',
      items: [
        { id: 'financial', label: 'Financeiro', icon: DollarSign },
        { 
          id: 'commissions', 
          label: 'Comissões', 
          icon: Clock,
          badge: pendingCommissionsCount > 0 ? pendingCommissionsCount : undefined
        },
        { id: 'audit_logs', label: 'Log Geral', icon: ShieldAlert }
      ]
    },
    {
      title: 'DOCUMENTOS',
      items: [
        { id: 'documents', label: 'Documentos', icon: FileText }
      ]
    },
    {
      items: [
        { id: 'settings', label: 'Configurações', icon: Settings }
      ]
    }
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

        {!isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex p-1.5 rounded-[6px] text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#17171A] border border-transparent hover:border-[#2D2D32] transition-colors cursor-pointer"
            title="Recolher barra lateral"
            aria-label="Recolher barra lateral"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

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

      {/* Footer Profile & Role & Vitrine link */}
      <div className="p-3 border-t border-[#2D2D32] space-y-2 bg-[#080809]">
        {/* Link to public showroom */}
        <button
          onClick={onOpenShowroom}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs font-medium text-[#CAC9CA] hover:text-white bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="Abrir Vitrine Pública de Veículos"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#D4130D]" />
          {!isCollapsed && <span>Vitrine Pública</span>}
        </button>

        {/* User Role Switcher */}
        {!isCollapsed ? (
          <div className="p-2 rounded-[8px] bg-[#17171A] border border-[#2D2D32] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#A7A7AB] font-semibold uppercase tracking-wider">
                Perfil de Acesso
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                userRole === 'gestor' ? 'bg-[#D4130D]/20 text-[#D4130D]' : 'bg-[#3B82F6]/20 text-[#3B82F6]'
              }`}>
                {userRole === 'gestor' ? 'Gestor' : 'Vendedor'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-[#202024] p-0.5 rounded-[6px]">
              <button
                type="button"
                onClick={() => setUserRole('gestor')}
                className={`py-1 text-[11px] font-medium rounded transition-colors ${
                  userRole === 'gestor' ? 'bg-[#D4130D] text-white font-bold shadow-sm' : 'text-[#A7A7AB] hover:text-[#F5F5F5]'
                }`}
              >
                Gestor
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserRole('vendedor');
                  if (!activeSeller && salespeople.length > 0) setActiveSeller(salespeople[0]);
                }}
                className={`py-1 text-[11px] font-medium rounded transition-colors ${
                  userRole === 'vendedor' ? 'bg-[#D4130D] text-white font-bold shadow-sm' : 'text-[#A7A7AB] hover:text-[#F5F5F5]'
                }`}
              >
                Vendedor
              </button>
            </div>

            {userRole === 'vendedor' && salespeople.length > 0 && (
              <div className="pt-1 border-t border-[#2D2D32]">
                <select
                  value={activeSeller?.id || salespeople[0].id}
                  onChange={(e) => {
                    const sel = salespeople.find(s => s.id === e.target.value);
                    if (sel) setActiveSeller(sel);
                  }}
                  className="w-full bg-[#202024] text-[#CAC9CA] text-[11px] rounded px-2 py-1 border border-[#343439] focus:outline-none focus:border-[#D4130D]"
                >
                  {salespeople.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => setUserRole(userRole === 'gestor' ? 'vendedor' : 'gestor')}
              className="w-8 h-8 rounded-full bg-[#17171A] border border-[#2D2D32] flex items-center justify-center text-[#CAC9CA] hover:text-[#F5F5F5]"
              title={`Perfil: ${userRole === 'gestor' ? 'Gestor' : 'Vendedor'}. Clique para alternar.`}
            >
              {userRole === 'gestor' ? (
                <ShieldCheck className="w-4 h-4 text-[#D4130D]" />
              ) : (
                <UserCheck className="w-4 h-4 text-[#3B82F6]" />
              )}
            </button>
          </div>
        )}

        {/* Desktop Quick Collapse/Expand Button */}
        <button
          type="button"
          onClick={toggleCollapse}
          className={`w-full hidden md:flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs font-medium text-[#A7A7AB] hover:text-[#F5F5F5] bg-[#17171A]/70 hover:bg-[#202024] border border-[#2D2D32] transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center' : 'justify-start'
          }`}
          title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-[#CAC9CA]" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-[#CAC9CA]" />
              <span>Recolher Menu</span>
            </>
          )}
        </button>
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

        {/* Floating edge toggle handle */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#17171A] border border-[#2D2D32] hover:border-[#D4130D] text-[#A7A7AB] hover:text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer z-40 group"
          title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          aria-label={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 group-hover:text-[#D4130D] transition-colors" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 group-hover:text-[#D4130D] transition-colors" />
          )}
        </button>
      </aside>

      {/* Mobile Drawer Backdrop and Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-[280px] h-full z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
