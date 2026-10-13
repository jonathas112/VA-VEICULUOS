import React, { useState } from 'react';
import { 
  PanelLeftClose, PanelLeft, Search, Bell, Sparkles, 
  ShieldCheck, UserCheck, ChevronDown, Check, User
} from 'lucide-react';
import { UserRole, Salesperson, StoreProfile } from '../../types';
import { BrandLogo } from '../common/BrandLogo';

interface TopbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  onOpenGlobalSearch: () => void;
  onOpenShowroom: () => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  activeSeller: Salesperson | null;
  pendingCommissionsCount: number;
  onNavigateToCommissions: () => void;
  store?: StoreProfile;
}

export const Topbar: React.FC<TopbarProps> = ({
  isSidebarCollapsed,
  onToggleSidebar,
  onOpenMobileSidebar,
  onOpenGlobalSearch,
  onOpenShowroom,
  userRole,
  setUserRole,
  activeSeller,
  pendingCommissionsCount,
  onNavigateToCommissions,
  store
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const userName = userRole === 'gestor' ? 'Gestor Geral' : (activeSeller?.nome || 'Vendedor');

  return (
    <header className="h-16 bg-[#0D0D0F] border-b border-[#2D2D32] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      
      {/* Left section: Sidebar toggle & Global Search bar */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
        
        {/* Toggle button for desktop */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden md:flex p-2 rounded-[8px] text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#17171A] border border-transparent hover:border-[#2D2D32] transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-5 h-5 text-[#CAC9CA]" />
          ) : (
            <PanelLeftClose className="w-5 h-5 text-[#CAC9CA]" />
          )}
        </button>

        {/* Toggle button for mobile */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-[8px] text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#17171A] border border-[#2D2D32]"
        >
          <PanelLeft className="w-5 h-5" />
        </button>

        {/* Mobile / Collapsed Institutional Logo in Topbar */}
        <div className="flex md:hidden items-center shrink-0 pr-1 border-r border-[#2D2D32]/60">
          <BrandLogo store={store} size="sm" showText={false} />
        </div>
        {isSidebarCollapsed && (
          <div className="hidden md:flex items-center shrink-0 pr-2 border-r border-[#2D2D32]/60">
            <BrandLogo store={store} size="sm" showText={false} />
          </div>
        )}

        {/* Global Search trigger */}
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

      {/* Right section: Vitrine link, Notifications, Profile menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Quick link to Showroom */}
        <button
          type="button"
          onClick={onOpenShowroom}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#D4130D]/50 text-[#CAC9CA] hover:text-white transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D4130D]" />
          <span>Vitrine Clientes</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsUserMenuOpen(false);
            }}
            className="relative p-2 rounded-[8px] text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#17171A] border border-transparent hover:border-[#2D2D32] transition-colors cursor-pointer"
            title="Notificações do Sistema"
          >
            <Bell className="w-5 h-5" />
            {pendingCommissionsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4130D] animate-pulse" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#17171A] border border-[#2D2D32] rounded-[10px] shadow-2xl p-3 z-40 animate-in fade-in-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#2D2D32]">
                <span className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider font-display">
                  Notificações
                </span>
                {pendingCommissionsCount > 0 && (
                  <span className="text-[10px] font-bold bg-[#D4130D] text-white px-1.5 py-0.2 rounded-full">
                    {pendingCommissionsCount} pendente(s)
                  </span>
                )}
              </div>

              <div className="py-2 space-y-2">
                {pendingCommissionsCount > 0 ? (
                  <button
                    onClick={() => {
                      onNavigateToCommissions();
                      setIsNotificationsOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] transition-colors cursor-pointer border-l-2 border-[#D4130D]"
                  >
                    <div className="text-xs font-semibold text-[#F5F5F5]">
                      Comissões aguardando definição
                    </div>
                    <div className="text-[11px] text-[#A7A7AB] mt-0.5">
                      Existem {pendingCommissionsCount} venda(s) registrada(s) por vendedores aguardando aprovação de comissão pelo Gestor.
                    </div>
                  </button>
                ) : (
                  <div className="py-6 text-center text-xs text-[#68686E]">
                    Nenhuma notificação pendente no momento.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account & Role Menu */}
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

          {/* Account Dropdown Menu */}
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

              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[#68686E] uppercase tracking-wider px-2 py-1">
                  Mudar Perfil
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUserRole('gestor');
                    setIsUserMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs transition-colors ${
                    userRole === 'gestor'
                      ? 'bg-[#D4130D]/10 text-[#D4130D] font-bold'
                      : 'text-[#CAC9CA] hover:bg-[#202024] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Gestor
                  </span>
                  {userRole === 'gestor' && <Check className="w-3.5 h-3.5 text-[#D4130D]" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserRole('vendedor');
                    setIsUserMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs transition-colors ${
                    userRole === 'vendedor'
                      ? 'bg-[#3B82F6]/10 text-[#3B82F6] font-bold'
                      : 'text-[#CAC9CA] hover:bg-[#202024] hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4" /> Vendedor
                  </span>
                  {userRole === 'vendedor' && <Check className="w-3.5 h-3.5 text-[#3B82F6]" />}
                </button>
              </div>

              <div className="pt-2 mt-2 border-t border-[#2D2D32]">
                <button
                  type="button"
                  onClick={() => {
                    onOpenShowroom();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-xs text-[#CAC9CA] hover:bg-[#202024] hover:text-white transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[#D4130D]" />
                  <span>Ver Vitrine Pública</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
