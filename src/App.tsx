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
import { firebaseAuth, firebaseDb } from './services/firebase';
import {
  createStaffSession,
  loadVerifiedStaffSession,
  clearStaffSession
} from './utils/security';
import { 
  Vehicle, FormerOwner, Sale, Financier, 
  ContractTemplate, Salesperson, StoreProfile, 
  UserRole, VehicleExpense, PostSaleCost, SystemUser 
} from './types';

const GESTOR_ONLY_TABS = new Set(['financial', 'audit_logs', 'users', 'settings']);

function resolveSellerForUser(user: SystemUser | null, spList: Salesperson[]): Salesperson | null {
  if (!user) return null;
  if (user.papel === 'vendedor') {
    const match = spList.find(s => s.id === user.id || s.email.toLowerCase() === user.email.toLowerCase());
    if (match) return match;
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone || '',
      metaMensal: user.metaMensal || 5,
      ativo: true
    };
  }
  return spList[0] || null;
}

export default function App() {
  // Reidratação criptográfica da sessão autenticada (bloqueia bypass via sessionStorage / DevTools)
  const [authenticatedUser, setAuthenticatedUser] = useState<SystemUser | null>(() => {
    return loadVerifiedStaffSession(storageService.getUsers());
  });
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    return Boolean(loadVerifiedStaffSession(storageService.getUsers()));
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [targetAuthRole, setTargetAuthRole] = useState<'gestor' | 'vendedor'>('gestor');

  // Navigation & Role State (padrão de menor privilégio: 'vendedor' quando não for gestor autenticado)
  const [currentView, setCurrentView] = useState<'management' | 'showroom' | 'login'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('/login') || hash.includes('login')) {
        return 'login';
      }
    }
    return loadVerifiedStaffSession(storageService.getUsers()) ? 'management' : 'showroom';
  });
  const [managementTab, setManagementTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return loadVerifiedStaffSession(storageService.getUsers())?.papel ?? 'vendedor';
  });
  const [activeSeller, setActiveSeller] = useState<Salesperson | null>(() => {
    return resolveSellerForUser(
      loadVerifiedStaffSession(storageService.getUsers()),
      storageService.getSalespeople()
    );
  });

  // Sidebar retraction state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('va_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global search modal state
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Entities State from LocalStorage / Firestore
  const [publicVehicles, setPublicVehicles] = useState<Vehicle[]>(() => storageService.getPublicVehicles());
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [owners, setOwners] = useState<FormerOwner[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [financiers, setFinanciers] = useState<Financier[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
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

  // Keyboard shortcut for Global Search (Ctrl+K or Cmd+K) — restrito a equipe autenticada
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (!isStaffAuthenticated || currentView !== 'management') return;
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStaffAuthenticated, currentView]);

  // Monitora integridade criptográfica da sessão e sincronização cross-tab entre abas abertas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // 1. Verificação de sessão
      if (isStaffAuthenticated) {
        const verified = loadVerifiedStaffSession(storageService.getUsers());
        if (!verified) {
          clearStaffSession();
          setAuthenticatedUser(null);
          setIsStaffAuthenticated(false);
          setUserRole('vendedor');
          setActiveSeller(null);
          setIsGlobalSearchOpen(false);
          setCurrentView('login');
          return;
        }
      }

      // 2. Atualização em tempo real caso outra aba modifique entidades do sistema
      if (e.key && e.key.startsWith('vaveiculos_')) {
        refreshData(isStaffAuthenticated, userRole);
      }
    };

    const handleFocusCheck = () => {
      if (isStaffAuthenticated) {
        const verified = loadVerifiedStaffSession(storageService.getUsers());
        if (!verified) {
          clearStaffSession();
          setAuthenticatedUser(null);
          setIsStaffAuthenticated(false);
          setUserRole('vendedor');
          setActiveSeller(null);
          setIsGlobalSearchOpen(false);
          setCurrentView('login');
        } else {
          refreshData(isStaffAuthenticated, userRole);
        }
      }
    };

    const handleNetworkOnline = () => {
      storageService
        .syncFromFirestore(isStaffAuthenticated, userRole)
        .then(() => refreshData(isStaffAuthenticated, userRole))
        .catch(err => console.warn('Erro ao ressincronizar após reconexão online:', err));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocusCheck);
    window.addEventListener('online', handleNetworkOnline);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocusCheck);
      window.removeEventListener('online', handleNetworkOnline);
    };
  }, [isStaffAuthenticated, userRole]);

  // Redireciona imediatamente caso o perfil atual não possua permissão de acesso à aba ativa
  useEffect(() => {
    if (userRole !== 'gestor' && GESTOR_ONLY_TABS.has(managementTab)) {
      setManagementTab('dashboard');
    }
  }, [userRole, managementTab]);

  const refreshData = (forceAuthenticated?: boolean, effectiveRole?: UserRole) => {
    const st = storageService.getStoreProfile();
    const pubV = storageService.getPublicVehicles();
    setStore(st);
    setPublicVehicles(pubV);

    const authed = forceAuthenticated ?? isStaffAuthenticated;
    const roleToUse = effectiveRole ?? userRole;

    if (!authed) {
      setVehicles([]);
      setOwners([]);
      setSales([]);
      setFinanciers([]);
      setTemplates([]);
      setSalespeople([]);
      setUsers([]);
      return;
    }

    const v = storageService.getVehicles();
    const o = storageService.getOwners();
    const s = storageService.getSales();
    const f = storageService.getFinanciers();
    const t = storageService.getTemplates();
    const sp = storageService.getSalespeople();

    setVehicles(v);
    setOwners(o);
    setSales(s);
    setFinanciers(f);
    setTemplates(t);
    setSalespeople(sp);
    setUsers(roleToUse === 'gestor' ? storageService.getUsers() : []);

    if (!activeSeller && sp.length > 0) {
      const resolved = resolveSellerForUser(authenticatedUser, sp);
      if (resolved) setActiveSeller(resolved);
    }
  };

  // Initial load, Firestore background sync e escuta em tempo real da nuvem
  useEffect(() => {
    refreshData(isStaffAuthenticated, userRole);

    // 1. Escuta em tempo real para vitrine pública diretamente no Firestore
    const unsubPublic = firebaseDb.subscribeToPublicVehicles((liveList) => {
      if (liveList && liveList.length > 0) {
        setPublicVehicles(liveList);
        storageService.savePublicVehicles(liveList);
      }
    });

    // 2. Escuta em tempo real para equipe autenticada
    let unsubVehicles: (() => void) | undefined;
    if (isStaffAuthenticated) {
      unsubVehicles = firebaseDb.subscribeToVehicles((liveList) => {
        if (liveList && liveList.length > 0) {
          setVehicles(liveList);
          storageService.saveVehicles(liveList);
        }
      });
    }

    // 3. Sincronização completa inicial em segundo plano
    storageService.syncFromFirestore(isStaffAuthenticated, userRole).then(() => {
      refreshData(isStaffAuthenticated, userRole);
    }).catch(err => {
      console.warn('Sincronização em segundo plano:', err);
    });

    return () => {
      unsubPublic();
      if (unsubVehicles) unsubVehicles();
    };
  }, [isStaffAuthenticated, userRole]);

  const activeUserName = userRole === 'gestor'
    ? (authenticatedUser?.nome || 'Gestor Geral')
    : (activeSeller?.nome || authenticatedUser?.nome || 'Vendedor');

  // Pending commissions count for notifications (vendedor vê apenas as próprias pendências)
  const pendingCommissionsCount = userRole === 'gestor'
    ? sales.filter(s => s.comissaoPendente).length
    : sales.filter(s => s.comissaoPendente && activeSeller && s.vendedorId === activeSeller.id).length;

  // Safe role & seller setters (impedem elevação sem autenticação de Gestor ou personificação de colega)
  const handleSetUserRole = (nextRole: UserRole) => {
    if (nextRole === 'gestor' && authenticatedUser?.papel !== 'gestor') {
      handleRequestElevateToGestor();
      return;
    }
    setUserRole(nextRole);
  };

  const handleSetActiveSeller = (seller: Salesperson) => {
    if (authenticatedUser?.papel !== 'gestor') {
      return;
    }
    setActiveSeller(seller);
  };

  const handleSelectManagementTab = (tab: string) => {
    if (userRole !== 'gestor' && GESTOR_ONLY_TABS.has(tab)) {
      setManagementTab('dashboard');
      return;
    }
    setManagementTab(tab);
  };

  // Handlers com blindagem RBAC
  const handleOpenEntryModal = () => {
    if (userRole !== 'gestor') return;
    setIsEntryModalOpen(true);
  };

  const handleSaveVehicle = (newVehicle: Vehicle) => {
    if (userRole !== 'gestor') return;
    storageService.saveVehicle(newVehicle, activeUserName);
    refreshData(true, userRole);
  };

  const handleSaveOwner = (newOwner: FormerOwner): FormerOwner => {
    const saved = storageService.saveOwner(newOwner, activeUserName);
    refreshData(true, userRole);
    return saved;
  };

  const handleOpenCostsModal = (v: Vehicle) => {
    if (userRole !== 'gestor') return;
    const latest = storageService.getVehicles().find(item => item.id === v.id) || v;
    setVehicleForCosts(latest);
  };

  const handleAddPatioExpense = (vehicleId: string, expense: VehicleExpense) => {
    if (userRole !== 'gestor') return;
    try {
      storageService.addVehicleExpense(vehicleId, expense, activeUserName);
      refreshData(true, userRole);
      const updated = storageService.getVehicles().find(v => v.id === vehicleId);
      if (updated) setVehicleForCosts(updated);
    } catch (err) {
      console.warn('Bloqueio ao lançar despesa de pátio:', err);
    }
  };

  const handleOpenSaleModal = (v: Vehicle) => {
    if (!isStaffAuthenticated) return;
    const latestVehicle = storageService.getVehicles().find(item => item.id === v.id) || v;
    const hasExistingSale = storageService.getSales().some(s => s.veiculoId === latestVehicle.id);
    if (latestVehicle.status !== 'em_estoque' || hasExistingSale) {
      alert(
        `Operação bloqueada: O veículo ${latestVehicle.marca} ${latestVehicle.modelo} (${latestVehicle.placa}) já consta como vendido ou indisponível para nova venda.`
      );
      refreshData(true, userRole);
      return;
    }
    setVehicleForSale(latestVehicle);
  };

  const handleCompleteSale = (newSale: Sale, vehicle: Vehicle): boolean => {
    if (!isStaffAuthenticated) return false;

    // Defesa em profundidade: vendedor nunca pode aprovar a própria comissão nem vender em nome de outro colega
    const enforcedSale: Sale = userRole === 'gestor'
      ? newSale
      : {
          ...newSale,
          vendedorId: activeSeller?.id || authenticatedUser?.id || newSale.vendedorId,
          vendedorNome: activeSeller?.nome || authenticatedUser?.nome || newSale.vendedorNome,
          comissaoValor: 0,
          comissaoPendente: true,
          comissaoDefinidaPor: undefined,
          dataDefinicaoComissao: undefined
        };

    try {
      storageService.saveSale(enforcedSale, activeUserName);
    } catch (err) {
      console.warn('Venda recusada pelas travas de integridade:', err);
      refreshData(true, userRole);
      return false;
    }

    const updatedVehicle =
      storageService.getVehicles().find(v => v.id === vehicle.id) || {
        ...vehicle,
        status: 'vendido' as const,
        dataVenda: enforcedSale.dataVenda
      };
    const persistedSale =
      storageService.getSales().find(s => s.id === enforcedSale.id) || enforcedSale;

    refreshData(true, userRole);
    setVehicleForSale(null);

    // Auto open Contract/Receipt modal for this sale!
    const owner = owners.find(o => o.id === vehicle.antigoDonoId);
    setContractModalData({
      isOpen: true,
      vehicle: updatedVehicle,
      owner,
      sale: persistedSale,
      defaultTemplateId: persistedSale.tipoContratoId
    });
    return true;
  };

  const handleAddPostSaleCost = (saleId: string, cost: PostSaleCost) => {
    if (userRole !== 'gestor') return;
    try {
      storageService.addPostSaleCost(saleId, cost);
      refreshData(true, userRole);
    } catch (err) {
      console.warn('Bloqueio ao lançar custo pós-venda:', err);
    }
  };

  const handleAssignCommission = (saleId: string, amount: number, expectedVersion?: number) => {
    if (userRole !== 'gestor') {
      alert('Operação negada: Apenas o Gestor Geral possui autorização para homologar comissões.');
      return;
    }
    try {
      storageService.assignCommission(saleId, amount, activeUserName, {
        requirePending: true,
        expectedVersion
      });
      refreshData(true, userRole);
    } catch (err) {
      console.warn('Bloqueio ao fixar comissão:', err);
      refreshData(true, userRole);
    }
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (userRole !== 'gestor') {
      alert('Operação negada: Apenas o Gestor Geral possui permissão para remover veículos do estoque.');
      return;
    }
    storageService.deleteVehicle(vehicleId, activeUserName);
    refreshData(true, userRole);
  };

  const handleReserveVehicle = (vehicle: Vehicle, cliente: string, diasValidade: number, valorSinal?: number) => {
    if (userRole !== 'gestor') {
      alert('Operação negada: Apenas o Gestor Geral pode realizar reservas de veículos.');
      return;
    }
    const reservadoAte = new Date(Date.now() + diasValidade * 24 * 60 * 60 * 1000).toISOString();
    const res = storageService.reserveVehicle(
      vehicle.id,
      { reservadoPara: cliente, reservadoAte, valorSinal },
      activeUserName
    );
    if (res.success) {
      refreshData(true, userRole);
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleCancelReservation = (vehicleId: string) => {
    if (userRole !== 'gestor') {
      alert('Operação negada: Apenas o Gestor Geral pode cancelar reservas.');
      return;
    }
    const res = storageService.cancelReservation(vehicleId, activeUserName);
    if (res.success) {
      refreshData(true, userRole);
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleCancelSale = (saleId: string, motivo: string) => {
    if (userRole !== 'gestor') {
      alert('Operação negada: Apenas o Gestor Geral possui permissão para registrar distrato/cancelamento de vendas.');
      return;
    }
    const cancelled = storageService.cancelSale(saleId, motivo, activeUserName);
    if (cancelled) {
      refreshData(true, userRole);
    }
  };

  // Staff Authentication & Role Elevation Handlers
  const handleEnterManagement = () => {
    const verified = loadVerifiedStaffSession(storageService.getUsers());
    if (verified && isStaffAuthenticated) {
      setCurrentView('management');
    } else {
      clearStaffSession();
      setAuthenticatedUser(null);
      setIsStaffAuthenticated(false);
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

  // Autenticação completa (LoginView ou AuthModal) com emissão de sessão assinada HMAC-SHA256
  const establishAuthenticatedSession = (user: SystemUser, explicitSeller?: Salesperson, resetTab = false) => {
    createStaffSession(user);
    setAuthenticatedUser(user);
    setIsStaffAuthenticated(true);
    setUserRole(user.papel);

    const spList = storageService.getSalespeople();
    if (explicitSeller && user.papel === 'gestor') {
      setActiveSeller(explicitSeller);
    } else {
      setActiveSeller(resolveSellerForUser(user, spList));
    }

    setCurrentView('management');
    if (resetTab) {
      setManagementTab('dashboard');
    }
    setIsAuthModalOpen(false);

    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/');
    }

    storageService.addAuditLog(
      'LOGIN_SISTEMA',
      'sistema',
      `Login efetuado com sucesso por ${user.nome} (${user.papel.toUpperCase()})`,
      user.nome
    );

    refreshData(true, user.papel);
    storageService.syncFromFirestore(true, user.papel).then(() => {
      refreshData(true, user.papel);
    }).catch(err => {
      console.warn('Sync após login:', err);
    });
  };

  const handleFullLoginSuccess = (user: SystemUser) => {
    establishAuthenticatedSession(user, undefined, true);
  };

  const handleAuthenticatedUserFromModal = (user: SystemUser, seller?: Salesperson) => {
    establishAuthenticatedSession(user, seller, false);
  };

  const handleLogout = () => {
    const actorName = activeUserName;
    storageService.addAuditLog(
      'LOGOUT_SISTEMA',
      'sistema',
      'Sessão administrativa encerrada pelo usuário',
      actorName
    );
    clearStaffSession();
    firebaseAuth.signOutStaff().catch(() => {});
    setAuthenticatedUser(null);
    setIsStaffAuthenticated(false);
    setUserRole('vendedor');
    setActiveSeller(null);
    setIsGlobalSearchOpen(false);
    setIsEntryModalOpen(false);
    setVehicleForCosts(null);
    setVehicleForSale(null);
    setContractModalData({ isOpen: false, vehicle: null });
    setCurrentView('login');
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '/login');
    }
  };

  const handleOpenPurchaseReceipt = (veh: Vehicle, ownerObj?: FormerOwner) => {
    if (userRole !== 'gestor') return;
    const owner = ownerObj || owners.find(o => o.id === veh.antigoDonoId);
    const receiptTemplate = templates.find(t => t.tipo === 'recibo_compra') || templates[0];
    setContractModalData({
      isOpen: true,
      vehicle: veh,
      owner,
      defaultTemplateId: receiptTemplate?.id
    });
  };

  const handleOpenSaleContract = (veh: Vehicle, saleObj?: Sale) => {
    const owner = owners.find(o => o.id === veh.antigoDonoId);
    const targetSale = saleObj || sales.find(s => s.veiculoId === veh.id);
    const prefersRepasse = targetSale
      ? targetSale.isRepasseSemGarantia
      : veh.categoriaComercial === 'repasse';
    const defaultTemplate =
      targetSale?.tipoContratoId ||
      templates.find(t => t.tipo === (prefersRepasse ? 'repasse' : 'garantia'))?.id;
    setContractModalData({
      isOpen: true,
      vehicle: veh,
      owner,
      sale: targetSale,
      defaultTemplateId: defaultTemplate
    });
  };

  const handleNavigateFromSearch = (tab: string, _entityId?: string, queryText?: string) => {
    if (!isStaffAuthenticated) return;
    const safeTab = userRole !== 'gestor' && GESTOR_ONLY_TABS.has(tab) ? 'dashboard' : tab;
    setCurrentView('management');
    setManagementTab(safeTab);
    if (queryText) {
      setActiveSearchFilter(queryText);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#D4130D] selection:text-white">
      
      {/* 0. DEDICATED FULLSCREEN LOGIN VIEW (ou bloqueio automático caso tente acessar management sem sessão válida) */}
      {currentView === 'login' || (currentView === 'management' && !isStaffAuthenticated) ? (
        <LoginView
          store={store}
          onLoginSuccess={handleFullLoginSuccess}
          onOpenShowroom={handleOpenShowroom}
        />
      ) : currentView === 'showroom' ? (
        /* 1. SHOWROOM PUBLIC VIEW (recebe exclusivamente projeção pública sem valorPago/custos internos) */
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
            vehicles={publicVehicles}
            store={store}
            onEnterManagement={handleEnterManagement}
            onRefreshCatalog={async () => {
              try {
                const [pubList, fullList] = await Promise.all([
                  firebaseDb.getPublicVehicles(),
                  firebaseDb.getVehicles()
                ]);
                const best = pubList.length > 0 ? pubList : fullList;
                if (best.length > 0) {
                  setPublicVehicles(best);
                  storageService.savePublicVehicles(best);
                }
                await storageService.syncFromFirestore(isStaffAuthenticated, userRole);
                refreshData(isStaffAuthenticated, userRole);
              } catch (err) {
                console.warn('Erro ao atualizar catálogo via nuvem:', err);
              }
            }}
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
            onSelectTab={handleSelectManagementTab}
            onOpenShowroom={handleOpenShowroom}
            userRole={userRole}
            authenticatedRole={authenticatedUser?.papel || 'vendedor'}
            setUserRole={handleSetUserRole}
            onRequestElevateToGestor={handleRequestElevateToGestor}
            onLogout={handleLogout}
            activeSeller={activeSeller}
            setActiveSeller={handleSetActiveSeller}
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
              authenticatedRole={authenticatedUser?.papel || 'vendedor'}
              setUserRole={handleSetUserRole}
              onRequestElevateToGestor={handleRequestElevateToGestor}
              onLogout={handleLogout}
              activeSeller={activeSeller}
              pendingCommissionsCount={pendingCommissionsCount}
              onNavigateToCommissions={() => handleSelectManagementTab('commissions')}
              onNavigateTab={(tab, filter) => {
                if (filter) setActiveSearchFilter(filter);
                handleSelectManagementTab(tab);
              }}
              vehicles={vehicles}
              sales={sales}
              store={store}
            />

            {/* Dynamic Content View */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto overflow-x-hidden min-w-0">
              
              {managementTab === 'dashboard' && (
                <DashboardView
                  vehicles={vehicles}
                  sales={sales}
                  salespeople={salespeople}
                  store={store}
                  userRole={userRole}
                  onNavigateTab={handleSelectManagementTab}
                  onNavigateToTab={handleSelectManagementTab}
                  onOpenEntryModal={handleOpenEntryModal}
                />
              )}

              {managementTab === 'inventory' && (
                <InventoryView
                  vehicles={vehicles}
                  owners={owners}
                  userRole={userRole}
                  initialSearchTerm={managementTab === 'inventory' ? activeSearchFilter : ''}
                  onOpenEntryModal={handleOpenEntryModal}
                  onOpenCostsModal={handleOpenCostsModal}
                  onOpenSaleModal={handleOpenSaleModal}
                  onOpenReceiptModal={handleOpenPurchaseReceipt}
                  onDeleteVehicle={handleDeleteVehicle}
                  onReserveVehicle={handleReserveVehicle}
                  onCancelReservation={handleCancelReservation}
                />
              )}

              {managementTab === 'vehicle_history' && (
                <VehicleHistoryView
                  vehicles={vehicles}
                  owners={owners}
                  sales={sales}
                  store={store}
                  userRole={userRole}
                  onOpenContractModal={(veh, type) => {
                    if (type === 'compra') {
                      handleOpenPurchaseReceipt(veh);
                    } else {
                      handleOpenSaleContract(veh);
                    }
                  }}
                  onSelectOwner={() => handleSelectManagementTab('persons')}
                />
              )}

              {(managementTab === 'persons' || managementTab === 'owners') && (
                <PersonsView
                  owners={owners}
                  vehicles={vehicles}
                  sales={sales}
                  store={store}
                  userRole={userRole}
                  initialSearchTerm={(managementTab === 'persons' || managementTab === 'owners') ? activeSearchFilter : ''}
                  onSaveOwner={handleSaveOwner}
                  onSelectVehicleHistory={() => handleSelectManagementTab('vehicle_history')}
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
                  onCancelSale={handleCancelSale}
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
                  onCancelSale={handleCancelSale}
                />
              )}

              {managementTab === 'documents' && (
                <DocumentsView
                  templates={templates}
                  store={store}
                  vehicles={vehicles}
                  owners={owners}
                  sales={sales}
                  userRole={userRole}
                  onOpenContractModal={handleOpenSaleContract}
                  onUpdateTemplate={(t) => {
                    if (userRole !== 'gestor') return;
                    storageService.saveTemplate(t, activeUserName);
                    refreshData(true, userRole);
                  }}
                />
              )}

              {managementTab === 'commissions' && (
                <PendingCommissionsView
                  sales={sales}
                  vehicles={vehicles}
                  userRole={userRole}
                  activeSellerId={activeSeller?.id}
                  onAssignCommission={handleAssignCommission}
                />
              )}

              {managementTab === 'financial' && userRole === 'gestor' && (
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
                  onRefreshData={() => refreshData(true, userRole)}
                />
              )}

              {managementTab === 'settings' && userRole === 'gestor' && (
                <SettingsView
                  store={store}
                  financiers={financiers}
                  templates={templates}
                  salespeople={salespeople}
                  onSaveStore={(st) => {
                    if (userRole !== 'gestor') return;
                    storageService.saveStoreProfile(st, activeUserName);
                    refreshData(true, userRole);
                  }}
                  onAddFinancier={(f) => {
                    if (userRole !== 'gestor') return;
                    storageService.addFinancier(f, activeUserName);
                    refreshData(true, userRole);
                  }}
                  onToggleFinancier={(id) => {
                    if (userRole !== 'gestor') return;
                    storageService.toggleFinancierStatus(id, activeUserName);
                    refreshData(true, userRole);
                  }}
                  onDeleteFinancier={(id) => {
                    if (userRole !== 'gestor') return;
                    storageService.deleteFinancier(id, activeUserName);
                    refreshData(true, userRole);
                  }}
                  onUpdateFinancier={(f) => {
                    if (userRole !== 'gestor') return;
                    storageService.saveFinancier(f, activeUserName);
                    refreshData(true, userRole);
                  }}
                  onSaveTemplate={(t) => {
                    if (userRole !== 'gestor') return;
                    storageService.saveTemplate(t, activeUserName);
                    refreshData(true, userRole);
                  }}
                  onAddSalesperson={(sp) => {
                    if (userRole !== 'gestor') return;
                    storageService.addSalesperson(sp, activeUserName);
                    refreshData(true, userRole);
                  }}
                  onToggleSalesperson={(id) => {
                    if (userRole !== 'gestor') return;
                    storageService.toggleSalespersonStatus(id, activeUserName);
                    refreshData(true, userRole);
                  }}
                  onDeleteSalesperson={(id) => {
                    if (userRole !== 'gestor') return;
                    storageService.deleteSalesperson(id, activeUserName);
                    refreshData(true, userRole);
                  }}
                  onUpdateSalesperson={(sp) => {
                    if (userRole !== 'gestor') return;
                    storageService.saveSalesperson(sp, activeUserName);
                    refreshData(true, userRole);
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

      {/* Global Search Modal — somente acessível por equipe autenticada */}
      {isGlobalSearchOpen && isStaffAuthenticated && (
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
          userRole={userRole}
          onNavigateToTab={handleNavigateFromSearch}
        />
      )}

      {/* MODAL 1: Intake Wizard (Vehicle Entry & Former Owner) — exclusivo do Gestor */}
      {isEntryModalOpen && isStaffAuthenticated && userRole === 'gestor' && (
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

      {/* MODAL 2: Patio Costs & Sale Margin Simulator — exclusivo do Gestor */}
      {vehicleForCosts && isStaffAuthenticated && userRole === 'gestor' && (
        <VehicleCostsModal
          isOpen={!!vehicleForCosts}
          vehicle={vehicleForCosts}
          onClose={() => setVehicleForCosts(null)}
          onAddExpense={handleAddPatioExpense}
        />
      )}

      {/* MODAL 3: Car Sale Wizard */}
      {vehicleForSale && isStaffAuthenticated && (
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
      {contractModalData.isOpen && contractModalData.vehicle && isStaffAuthenticated && (
        <ContractsAndReceiptsModal
          isOpen={contractModalData.isOpen}
          vehicle={contractModalData.vehicle}
          owner={contractModalData.owner}
          sale={contractModalData.sale}
          templates={templates}
          store={store}
          userRole={userRole}
          defaultTemplateId={contractModalData.defaultTemplateId}
          onClose={() => setContractModalData({ isOpen: false, vehicle: null })}
        />
      )}

      {/* MODAL 5: Authentication & Role Gate Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          salespeople={salespeople.length > 0 ? salespeople : storageService.getSalespeople()}
          store={store}
          onAuthenticatedUser={handleAuthenticatedUserFromModal}
          defaultRole={targetAuthRole}
        />
      )}

    </div>
  );
}
