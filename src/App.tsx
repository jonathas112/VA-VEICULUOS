import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/navigation/Sidebar';
import { Topbar } from './components/navigation/Topbar';
import { GlobalSearchModal } from './components/navigation/GlobalSearchModal';
import { BrandLogo } from './components/common/BrandLogo';

import { ShowroomView } from './components/showroom/ShowroomView';
import { DashboardView } from './components/management/DashboardView';
import { InventoryView } from './components/management/InventoryView';
import { VehicleHistoryView } from './components/management/VehicleHistoryView';
import { PersonsView } from './components/management/PersonsView';
import { SalesHistoryView } from './components/management/SalesHistoryView';
import { PendingCommissionsView } from './components/management/PendingCommissionsView';
import { FinancialView } from './components/management/FinancialView';
import { SettingsView } from './components/management/SettingsView';
import { DocumentsView } from './components/management/DocumentsView';
import { AuditLogView } from './components/management/AuditLogView';

import { VehicleEntryModal } from './components/management/VehicleEntryModal';
import { VehicleCostsModal } from './components/management/VehicleCostsModal';
import { VehicleSaleModal } from './components/management/VehicleSaleModal';
import { ContractsAndReceiptsModal } from './components/management/ContractsAndReceiptsModal';
import { AuthModal } from './components/common/AuthModal';
import { LoginView } from './components/auth/LoginView';
import { UsersManagementView } from './components/management/UsersManagementView';

import { storageService } from './services/storage';
import { 
  Vehicle, FormerOwner, Sale, Financier, 
  ContractTemplate, Salesperson, StoreProfile, 
  UserRole, VehicleExpense, PostSaleCost, SystemUser 
} from './types';

export default function App() {
  // Authentication & Role State
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('vaveiculos_staff_session') === 'true';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [targetAuthRole, setTargetAuthRole] = useState<'gestor' | 'vendedor'>('gestor');

  // Navigation & Role State (Showroom is public entrance; Login is authentication screen; Management requires staff authentication)
  const [currentView, setCurrentView] = useState<'management' | 'showroom' | 'login'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('/login') || hash.includes('login')) {
        return 'login';
      }
    }
    return sessionStorage.getItem('vaveiculos_staff_session') === 'true' ? 'management' : 'showroom';
  });
  const [managementTab, setManagementTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('gestor');
  const [activeSeller, setActiveSeller] = useState<Salesperson | null>(null);

  // Sidebar retraction state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('va_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global search modal state
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Entities State from LocalStorage / Firestore
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [owners, setOwners] = useState<FormerOwner[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [financiers, setFinanciers] = useState<Financier[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [users, setUsers] = useState<SystemUser[]>(() => storageService.getUsers());
  const [store, setStore] = useState<StoreProfile>(storageService.getStoreProfile());

  // Search filter across tabs
  const [activeSearchFilter, setActiveSearchFilter] = useState<string>('');

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [vehicleForCosts, setVehicleForCosts] = useState<Vehicle | null>(null);
  const [vehicleForSale, setVehicleForSale] = useState<Vehicle | null>(null);

  // Contract & Receipt Viewer Modal
  const [contractModalData, setContractModalData] = useState<{
    isOpen: boolean;
    vehicle: Vehicle | null;
    owner?: FormerOwner;
    sale?: Sale;
    defaultTemplateId?: string;
  }>({
    isOpen: false,
    vehicle: null
  });

  // Toggle and persist sidebar collapse
  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('va_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut for Global Search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Redireciona caso o perfil atual não possua permissão de acesso à aba ativa
  useEffect(() => {
    if (userRole !== 'gestor' && (managementTab === 'audit_logs' || managementTab === 'users')) {
      setManagementTab('dashboard');
    }
  }, [userRole, managementTab]);

  const refreshData = () => {
    const v = storageService.getVehicles();
    const o = storageService.getOwners();
    const s = storageService.getSales();
    const f = storageService.getFinanciers();
    const t = storageService.getTemplates();
    const sp = storageService.getSalespeople();
    const st = storageService.getStoreProfile();
    const u = storageService.getUsers();

    setVehicles(v);
    setOwners(o);
    setSales(s);
    setFinanciers(f);
    setTemplates(t);
    setSalespeople(sp);
    setUsers(u);
    setStore(st);

    if (!activeSeller && sp.length > 0) {
      setActiveSeller(sp[0]);
    }
  };

  // Initial load & Firestore background sync (respecting authenticated staff status)
  useEffect(() => {
    refreshData();
    storageService.syncFromFirestore(isStaffAuthenticated).then(() => {
      refreshData();
    }).catch(err => {
      console.warn('Sincronização em segundo plano:', err);
    });
  }, [isStaffAuthenticated]);

  const activeUserName = userRole === 'gestor' ? 'Gestor Geral' : (activeSeller?.nome || 'Vendedor');

  // Pending commissions count for notifications
  const pendingCommissionsCount = sales.filter(s => s.comissaoPendente).length;

  // Handlers
  const handleSaveVehicle = (newVehicle: Vehicle) => {
    storageService.saveVehicle(newVehicle, activeUserName);
    refreshData();
  };

  const handleSaveOwner = (newOwner: FormerOwner): FormerOwner => {
    const saved = storageService.saveOwner(newOwner, activeUserName);
    refreshData();
    return saved;
  };

  const handleOpenCostsModal = (v: Vehicle) => {
    setVehicleForCosts(v);
  };

  const handleAddPatioExpense = (vehicleId: string, expense: VehicleExpense) => {
    storageService.addVehicleExpense(vehicleId, expense, activeUserName);
    refreshData();
    const updated = storageService.getVehicles().find(v => v.id === vehicleId);
    if (updated) setVehicleForCosts(updated);
  };

  const handleOpenSaleModal = (v: Vehicle) => {
    setVehicleForSale(v);
  };

  const handleCompleteSale = (newSale: Sale, vehicle: Vehicle) => {
    storageService.saveSale(newSale, activeUserName);
    const updatedVehicle: Vehicle = {
      ...vehicle,
      status: 'vendido',
      dataVenda: newSale.dataVenda
    };
    storageService.saveVehicle(updatedVehicle, activeUserName);
    refreshData();

    // Auto open Contract/Receipt modal for this sale!
    const owner = owners.find(o => o.id === vehicle.antigoDonoId);
    setContractModalData({
      isOpen: true,
      vehicle: updatedVehicle,
      owner,
      sale: newSale,
      defaultTemplateId: newSale.tipoContratoId
    });
  };

  const handleAddPostSaleCost = (saleId: string, cost: PostSaleCost) => {
    storageService.addPostSaleCost(saleId, cost);
    refreshData();
  };

  const handleAssignCommission = (saleId: string, amount: number) => {
    if (userRole !== 'gestor') {
      alert('Operação negada: Apenas o Gestor Geral possui autorização para homologar comissões.');
      return;
    }
    storageService.assignCommission(saleId, amount, activeUserName);
    refreshData();
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (userRole !== 'gestor') {
      alert('Operação negada: Apenas o Gestor Geral possui permissão para remover veículos do estoque.');
      return;
    }
    storageService.deleteVehicle(vehicleId, activeUserName);
    refreshData();
  };

  // Staff Authentication & Role Elevation Handlers
  const handleEnterManagement = () => {
    if (isStaffAuthenticated) {
      setCurrentView('management');
    } else {
      setCurrentView('login');
      if (typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', '/login');
      }
    }
  };

  const handleOpenShowroom = () => {
    setCurrentView('showroom');
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleRequestElevateToGestor = () => {
    setTargetAuthRole('gestor');
    setIsAuthModalOpen(true);
  };

  // Autenticação a partir da Tela de Login Completa
  const handleFullLoginSuccess = (user: SystemUser) => {
    sessionStorage.setItem('vaveiculos_staff_session', 'true');
    setIsStaffAuthenticated(true);
    setUserRole(user.papel);

    if (user.papel === 'vendedor') {
      const matchSeller = salespeople.find(s => s.id === user.id || s.email === user.email);
      if (matchSeller) {
        setActiveSeller(matchSeller);
      } else {
        const tempSeller: Salesperson = {
          id: user.id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone || '',
          metaMensal: user.metaMensal || 5,
          ativo: true
        };
        setActiveSeller(tempSeller);
      }
    }

    setCurrentView('management');
    setManagementTab('dashboard');

    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/');
    }

    storageService.addAuditLog(
      'LOGIN_SISTEMA',
      'sistema',
      `Login efetuado com sucesso por ${user.nome} (${user.papel.toUpperCase()})`,
      user.nome
    );

    // Sync protected collections after staff authentication
    storageService.syncFromFirestore(true).then(() => {
      refreshData();
    }).catch(err => {
      console.warn('Sync após login:', err);
    });
  };

  const handleAuthSuccess = (role: UserRole, seller?: Salesperson) => {
    sessionStorage.setItem('vaveiculos_staff_session', 'true');
    setIsStaffAuthenticated(true);
    setUserRole(role);
    if (seller) {
      setActiveSeller(seller);
    }
    setCurrentView('management');
    setIsAuthModalOpen(false);

    const actorName = role === 'gestor' ? 'Gestor Geral' : (seller?.nome || 'Vendedor');
    storageService.addAuditLog(
      'LOGIN_SISTEMA',
      'sistema',
      `Autenticação bem-sucedida como ${role.toUpperCase()}${seller ? ` (${seller.nome})` : ''}`,
      actorName
    );

    // Sync protected collections after staff authentication
    storageService.syncFromFirestore(true).then(() => {
      refreshData();
    }).catch(err => {
      console.warn('Sync após login:', err);
    });
  };

  const handleLogout = () => {
    const actorName = userRole === 'gestor' ? 'Gestor Geral' : (activeSeller?.nome || 'Vendedor');
    storageService.addAuditLog(
      'LOGOUT_SISTEMA',
      'sistema',
      'Sessão administrativa encerrada pelo usuário',
      actorName
    );
    sessionStorage.removeItem('vaveiculos_staff_session');
    setIsStaffAuthenticated(false);
    setCurrentView('login');
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/login');
    }
  };

  const handleOpenPurchaseReceipt = (veh: Vehicle, ownerObj?: FormerOwner) => {
    const owner = ownerObj || owners.find(o => o.id === veh.antigoDonoId);
    const receiptTemplate = templates.find(t => t.tipo === 'recibo_compra') || templates[0];
    setContractModalData({
      isOpen: true,
      vehicle: veh,
      owner,
      defaultTemplateId: receiptTemplate.id
    });
  };

  const handleOpenSaleContract = (veh: Vehicle, saleObj?: Sale) => {
    const owner = owners.find(o => o.id === veh.antigoDonoId);
    const targetSale = saleObj || sales.find(s => s.veiculoId === veh.id);
    setContractModalData({
      isOpen: true,
      vehicle: veh,
      owner,
      sale: targetSale,
      defaultTemplateId: targetSale?.tipoContratoId || templates.find(t => t.tipo === 'garantia')?.id
    });
  };

  const handleNavigateFromSearch = (tab: string, _entityId?: string, queryText?: string) => {
    setCurrentView('management');
    setManagementTab(tab);
    if (queryText) {
      setActiveSearchFilter(queryText);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#D4130D] selection:text-white">
      
      {/* 0. DEDICATED FULLSCREEN LOGIN VIEW */}
      {currentView === 'login' ? (
        <LoginView
          store={store}
          onLoginSuccess={handleFullLoginSuccess}
          onOpenShowroom={handleOpenShowroom}
        />
      ) : currentView === 'showroom' ? (
        /* 1. SHOWROOM PUBLIC VIEW (If selected) */
        <div className="min-h-screen flex flex-col">
          {/* Showroom Top Return Header */}
          <div className="h-14 bg-[#080809] border-b border-[#2D2D32] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <BrandLogo store={store} size="sm" />
            </div>

            <button
              onClick={handleEnterManagement}
              className="px-3.5 py-1.5 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#D4130D] text-xs font-semibold text-[#CAC9CA] hover:text-white transition-colors cursor-pointer"
            >
              Acessar Painel Administrativo →
            </button>
          </div>

          <ShowroomView
            vehicles={vehicles}
            store={store}
            onEnterManagement={handleEnterManagement}
          />
        </div>
      ) : (
        /* 2. MANAGEMENT VIEW WITH SIDEBAR & TOPBAR */
        <div className="min-h-screen flex bg-[#0D0D0F] text-[#F5F5F5]">
          
          {/* Sidebar */}
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
            currentTab={managementTab}
            onSelectTab={(tab) => setManagementTab(tab)}
            onOpenShowroom={handleOpenShowroom}
            userRole={userRole}
            setUserRole={setUserRole}
            onRequestElevateToGestor={handleRequestElevateToGestor}
            onLogout={handleLogout}
            activeSeller={activeSeller}
            setActiveSeller={setActiveSeller}
            salespeople={salespeople}
            pendingCommissionsCount={pendingCommissionsCount}
            store={store}
          />

          {/* Main Area with dynamic left margin matching fixed desktop sidebar */}
          <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-200 ease-in-out ${
            isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
          }`}>
            
            <Topbar
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
              onOpenShowroom={handleOpenShowroom}
              userRole={userRole}
              setUserRole={setUserRole}
              onRequestElevateToGestor={handleRequestElevateToGestor}
              onLogout={handleLogout}
              activeSeller={activeSeller}
              pendingCommissionsCount={pendingCommissionsCount}
              onNavigateToCommissions={() => setManagementTab('commissions')}
              store={store}
            />

            {/* Dynamic Content View */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
              
              {managementTab === 'dashboard' && (
                <DashboardView
                  vehicles={vehicles}
                  sales={sales}
                  salespeople={salespeople}
                  store={store}
                  userRole={userRole}
                  onNavigateTab={(tab) => setManagementTab(tab)}
                  onNavigateToTab={(tab) => setManagementTab(tab)}
                  onOpenEntryModal={() => setIsEntryModalOpen(true)}
                />
              )}

              {managementTab === 'inventory' && (
                <InventoryView
                  vehicles={vehicles}
                  owners={owners}
                  userRole={userRole}
                  initialSearchTerm={managementTab === 'inventory' ? activeSearchFilter : ''}
                  onOpenEntryModal={() => setIsEntryModalOpen(true)}
                  onOpenCostsModal={handleOpenCostsModal}
                  onOpenSaleModal={handleOpenSaleModal}
                  onOpenReceiptModal={handleOpenPurchaseReceipt}
                  onDeleteVehicle={handleDeleteVehicle}
                />
              )}

              {managementTab === 'vehicle_history' && (
                <VehicleHistoryView
                  vehicles={vehicles}
                  owners={owners}
                  sales={sales}
                  store={store}
                  onOpenContractModal={(veh, type) => {
                    if (type === 'compra') {
                      handleOpenPurchaseReceipt(veh);
                    } else {
                      handleOpenSaleContract(veh);
                    }
                  }}
                  onSelectOwner={() => setManagementTab('persons')}
                />
              )}

              {(managementTab === 'persons' || managementTab === 'owners') && (
                <PersonsView
                  owners={owners}
                  vehicles={vehicles}
                  sales={sales}
                  store={store}
                  initialSearchTerm={(managementTab === 'persons' || managementTab === 'owners') ? activeSearchFilter : ''}
                  onSaveOwner={handleSaveOwner}
                  onSelectVehicleHistory={() => setManagementTab('vehicle_history')}
                />
              )}

              {managementTab === 'sales' && (
                <SalesHistoryView
                  key="sales-view"
                  sales={sales}
                  vehicles={vehicles}
                  userRole={userRole}
                  templates={templates}
                  store={store}
                  initialTab="vendas"
                  initialSearchTerm={managementTab === 'sales' ? activeSearchFilter : ''}
                  onAddPostSaleCost={handleAddPostSaleCost}
                  onOpenContract={handleOpenSaleContract}
                />
              )}

              {(managementTab === 'pos-venda' || managementTab === 'post-sale') && (
                <SalesHistoryView
                  key="pos-venda-view"
                  sales={sales}
                  vehicles={vehicles}
                  userRole={userRole}
                  templates={templates}
                  store={store}
                  initialTab="pos-venda"
                  initialSearchTerm={(managementTab === 'pos-venda' || managementTab === 'post-sale') ? activeSearchFilter : ''}
                  onAddPostSaleCost={handleAddPostSaleCost}
                  onOpenContract={handleOpenSaleContract}
                />
              )}

              {managementTab === 'documents' && (
                <DocumentsView
                  templates={templates}
                  store={store}
                  vehicles={vehicles}
                  owners={owners}
                  sales={sales}
                  onOpenContractModal={handleOpenSaleContract}
                  onUpdateTemplate={(t) => {
                    storageService.saveTemplate(t, activeUserName);
                    refreshData();
                  }}
                />
              )}

              {managementTab === 'commissions' && (
                <PendingCommissionsView
                  sales={sales}
                  vehicles={vehicles}
                  userRole={userRole}
                  onAssignCommission={handleAssignCommission}
                />
              )}

              {managementTab === 'financial' && (
                <FinancialView
                  sales={sales}
                  vehicles={vehicles}
                  salespeople={salespeople}
                  store={store}
                />
              )}

              {managementTab === 'audit_logs' && userRole === 'gestor' && (
                <AuditLogView />
              )}

              {managementTab === 'users' && userRole === 'gestor' && (
                <UsersManagementView
                  currentUserRole={userRole}
                  store={store}
                  initialSearchTerm={managementTab === 'users' ? activeSearchFilter : ''}
                  onRefreshData={refreshData}
                />
              )}

              {managementTab === 'settings' && (
                <SettingsView
                  store={store}
                  financiers={financiers}
                  templates={templates}
                  salespeople={salespeople}
                  onSaveStore={(st) => {
                    storageService.saveStoreProfile(st, activeUserName);
                    refreshData();
                  }}
                  onAddFinancier={(f) => {
                    storageService.addFinancier(f, activeUserName);
                    refreshData();
                  }}
                  onToggleFinancier={(id) => {
                    storageService.toggleFinancierStatus(id, activeUserName);
                    refreshData();
                  }}
                  onDeleteFinancier={(id) => {
                    storageService.deleteFinancier(id, activeUserName);
                    refreshData();
                  }}
                  onUpdateFinancier={(f) => {
                    storageService.saveFinancier(f, activeUserName);
                    refreshData();
                  }}
                  onSaveTemplate={(t) => {
                    storageService.saveTemplate(t, activeUserName);
                    refreshData();
                  }}
                  onAddSalesperson={(sp) => {
                    storageService.addSalesperson(sp, activeUserName);
                    refreshData();
                  }}
                  onToggleSalesperson={(id) => {
                    storageService.toggleSalespersonStatus(id, activeUserName);
                    refreshData();
                  }}
                  onDeleteSalesperson={(id) => {
                    storageService.deleteSalesperson(id, activeUserName);
                    refreshData();
                  }}
                  onUpdateSalesperson={(sp) => {
                    storageService.saveSalesperson(sp, activeUserName);
                    refreshData();
                  }}
                />
              )}
            </main>

            {/* Standard Footer */}
            <footer className="border-t border-[#2D2D32] bg-[#080809] py-5 text-center text-xs text-[#68686E] no-print">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>
                  VA VEÍCULOS • Areial - PB • CNPJ: {store.cnpj}
                </span>
                <span className="text-[#A7A7AB]">
                  Controle de pátio, auditoria centralizada & contratos em papel timbrado oficial
                </span>
              </div>
            </footer>
          </div>

        </div>
      )}

      {/* Global Search Modal */}
      {isGlobalSearchOpen && (
        <GlobalSearchModal
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
          vehicles={vehicles}
          owners={owners}
          sales={sales}
          salespeople={salespeople}
          users={users}
          financiers={financiers}
          templates={templates}
          onNavigateToTab={handleNavigateFromSearch}
        />
      )}

      {/* MODAL 1: Intake Wizard (Vehicle Entry & Former Owner) */}
      {isEntryModalOpen && (
        <VehicleEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          owners={owners}
          onSaveOwner={handleSaveOwner}
          onSaveVehicle={handleSaveVehicle}
          templates={templates}
          store={store}
          onOpenReceipt={handleOpenPurchaseReceipt}
          vehicles={vehicles}
        />
      )}

      {/* MODAL 2: Patio Costs & Sale Margin Simulator */}
      {vehicleForCosts && (
        <VehicleCostsModal
          isOpen={!!vehicleForCosts}
          vehicle={vehicleForCosts}
          onClose={() => setVehicleForCosts(null)}
          onAddExpense={handleAddPatioExpense}
        />
      )}

      {/* MODAL 3: Car Sale Wizard */}
      {vehicleForSale && (
        <VehicleSaleModal
          isOpen={!!vehicleForSale}
          vehicle={vehicleForSale}
          onClose={() => setVehicleForSale(null)}
          financiers={financiers}
          salespeople={salespeople}
          templates={templates}
          userRole={userRole}
          activeSeller={activeSeller}
          store={store}
          onCompleteSale={handleCompleteSale}
        />
      )}

      {/* MODAL 4: Visualizador de Contratos e Recibos com variáveis dinâmicas */}
      {contractModalData.isOpen && contractModalData.vehicle && (
        <ContractsAndReceiptsModal
          isOpen={contractModalData.isOpen}
          vehicle={contractModalData.vehicle}
          owner={contractModalData.owner}
          sale={contractModalData.sale}
          templates={templates}
          store={store}
          defaultTemplateId={contractModalData.defaultTemplateId}
          onClose={() => setContractModalData({ isOpen: false, vehicle: null })}
        />
      )}

      {/* MODAL 5: Authentication & Role Gate Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          salespeople={salespeople}
          store={store}
          onSuccess={handleAuthSuccess}
          onLoginSuccess={handleAuthSuccess}
          defaultRole={targetAuthRole}
        />
      )}

    </div>
  );
}
