import React from 'react';
import { 
  Car, ShieldCheck, LayoutDashboard, ShoppingCart, 
  Users, DollarSign, Settings, Clock, Sparkles, UserCheck, 
  History, ShieldAlert, FileText
} from 'lucide-react';
import { UserRole, Salesperson, StoreProfile } from '../types';
import { BrandLogo } from './common/BrandLogo';

interface NavbarProps {
  currentView: 'showroom' | 'management';
  setCurrentView: (view: 'showroom' | 'management') => void;
  managementTab: string;
  setManagementTab: (tab: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  activeSeller: Salesperson | null;
  setActiveSeller: (seller: Salesperson) => void;
  salespeople: Salesperson[];
  pendingCommissionsCount: number;
  store?: StoreProfile;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  managementTab,
  setManagementTab,
  userRole,
  setUserRole,
  activeSeller,
  setActiveSeller,
  salespeople,
  pendingCommissionsCount,
  store
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 text-white">
      {/* Top Bar: Brand, Showroom toggle, Role Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentView('showroom')}
              className="flex items-center text-left group focus:outline-none cursor-pointer"
              id="brand-logo-btn"
            >
              <BrandLogo store={store} size="md" />
            </button>
          </div>

          {/* Mode Switcher: Showroom vs Management */}
          <div className="hidden md:flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setCurrentView('showroom')}
              id="nav-btn-showroom"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                currentView === 'showroom'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Vitrine de Veículos
            </button>
            <button
              onClick={() => setCurrentView('management')}
              id="nav-btn-management"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all relative cursor-pointer ${
                currentView === 'management'
                  ? 'bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" />
              Painel Administrativo
              {pendingCommissionsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-neutral-950 rounded-full animate-pulse">
                  {pendingCommissionsCount}
                </span>
              )}
            </button>
          </div>

          {/* User Role & Profile Switcher */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-neutral-950/80 border border-neutral-800 rounded-xl p-1 text-xs">
              <span className="text-neutral-400 text-[11px] px-2 font-medium hidden sm:inline">Perfil:</span>
              <button
                onClick={() => setUserRole('gestor')}
                id="role-switch-gestor"
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  userRole === 'gestor'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Acesso total, define comissões e visualiza margens e balanço"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Gestor
              </button>
              <button
                onClick={() => {
                  setUserRole('vendedor');
                  if (!activeSeller && salespeople.length > 0) {
                    setActiveSeller(salespeople[0]);
                  }
                }}
                id="role-switch-vendedor"
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  userRole === 'vendedor'
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Vendedor: cadastra vendas com comissão enviada para aprovação"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Vendedor
              </button>
            </div>

            {/* If Vendedor is selected, show which seller is active */}
            {userRole === 'vendedor' && salespeople.length > 0 && (
              <div className="hidden lg:flex items-center gap-1 text-xs text-neutral-300 bg-neutral-800/80 px-2.5 py-1.5 rounded-lg border border-neutral-700">
                <span className="text-neutral-400">Atuando:</span>
                <select
                  value={activeSeller?.id || salespeople[0].id}
                  onChange={(e) => {
                    const sel = salespeople.find(s => s.id === e.target.value);
                    if (sel) setActiveSeller(sel);
                  }}
                  className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer"
                >
                  {salespeople.map(s => (
                    <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                      {s.nome.split(' ')[0]} ({s.nome})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile view toggle */}
      <div className="flex md:hidden border-t border-neutral-800 bg-neutral-950 px-3 py-2 justify-center gap-2">
        <button
          onClick={() => setCurrentView('showroom')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center cursor-pointer ${
            currentView === 'showroom' ? 'bg-amber-500 text-black' : 'text-neutral-400'
          }`}
        >
          Vitrine Clientes
        </button>
        <button
          onClick={() => setCurrentView('management')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg text-center relative cursor-pointer ${
            currentView === 'management' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
        >
          Gestão Loja {pendingCommissionsCount > 0 ? `(${pendingCommissionsCount})` : ''}
        </button>
      </div>

      {/* Sub-bar for ERP Management Tabs */}
      {currentView === 'management' && (
        <div className="bg-neutral-950/95 border-t border-neutral-800/80 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 sm:space-x-1.5 py-2 min-w-max">
              <button
                onClick={() => setManagementTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  managementTab === 'dashboard'
                    ? 'bg-neutral-800 text-amber-400 border border-neutral-700 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Painel
              </button>

              <button
                onClick={() => setManagementTab('inventory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  managementTab === 'inventory'
                    ? 'bg-neutral-800 text-amber-400 border border-neutral-700 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                Estoque
              </button>

              <button
                onClick={() => setManagementTab('vehicle_history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  managementTab === 'vehicle_history'
                    ? 'bg-neutral-800 text-amber-400 border border-neutral-700 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <History className="w-3.5 h-3.5 text-amber-500" />
                Histórico de Veículos
              </button>

              <button
                onClick={() => setManagementTab('persons')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  managementTab === 'persons'
                    ? 'bg-neutral-800 text-amber-400 border border-neutral-700 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                Pessoas & Clientes
              </button>

              <button
                onClick={() => setManagementTab('sales')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  managementTab === 'sales'
                    ? 'bg-neutral-800 text-amber-400 border border-neutral-700 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Vendas & Saídas
              </button>

              {userRole === 'gestor' && (
                <button
                  onClick={() => setManagementTab('commissions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer relative ${
                    managementTab === 'commissions'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Comissões
                  {pendingCommissionsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-neutral-950 rounded-full">
                      {pendingCommissionsCount}
                    </span>
                  )}
                </button>
              )}

              {userRole === 'gestor' && (
                <button
                  onClick={() => setManagementTab('financial')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    managementTab === 'financial'
                      ? 'bg-neutral-800 text-amber-400 border border-neutral-700 font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Financeiro & Balanço
                </button>
              )}

              <button
                onClick={() => setManagementTab('audit_logs')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  managementTab === 'audit_logs'
                    ? 'bg-neutral-800 text-amber-400 border border-neutral-700 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Log Geral
              </button>

              <button
                onClick={() => setManagementTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  managementTab === 'settings'
                    ? 'bg-neutral-800 text-amber-400 border border-neutral-700 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Configurações & Contratos
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
