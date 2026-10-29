import { 
  StoreProfile, Financier, Salesperson, ContractTemplate, 
  FormerOwner, Vehicle, Sale, VehicleExpense, PostSaleCost,
  AuditActionType, SystemUser, UserRole 
} from '../types';
import { 
  SEED_STORE, SEED_FINANCIERS, SEED_SALESPEOPLE, 
  SEED_OWNERS, SEED_VEHICLES, SEED_SALES, SEED_USERS 
} from '../data/seedData';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { auditLogger } from './auditLogger';
import { firebaseDb } from './firebase';

const STORAGE_KEYS = {
  STORE: 'vaveiculos_store_v2',
  FINANCIERS: 'vaveiculos_financiers_v2',
  SALESPEOPLE: 'vaveiculos_salespeople_v2',
  USERS: 'vaveiculos_users_v2',
  TEMPLATES: 'vaveiculos_templates_v2',
  OWNERS: 'vaveiculos_owners_v2',
  VEHICLES: 'vaveiculos_vehicles_v2',
  SALES: 'vaveiculos_sales_v2',
  ACTIVE_ROLE: 'vaveiculos_active_role_v2',
  ACTIVE_SELLER_ID: 'vaveiculos_active_seller_id_v2'
};

export const storageService = {
  // Store Profile
  getStoreProfile(): StoreProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORE);
      return data ? JSON.parse(data) : SEED_STORE;
    } catch {
      return SEED_STORE;
    }
  },
  saveStoreProfile(profile: StoreProfile, user = 'Gestor Geral'): void {
    localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(profile));
    
    // Audit log
    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'sistema',
      usuarioNome: user,
      descricao: `Atualizou as configurações da loja VA Veículos (Endereço: ${profile.endereco}, ${profile.cidade}-${profile.estado}).`,
      detalhes: { cnpj: profile.cnpj, whatsapp: profile.whatsapp, cidade: profile.cidade }
    });

    // Sync to Firestore
    firebaseDb.saveStoreProfile(profile).catch(err => console.warn('Firestore store sync err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
  },

  // Financiers
  getFinanciers(): Financier[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FINANCIERS);
      return data ? JSON.parse(data) : SEED_FINANCIERS;
    } catch {
      return SEED_FINANCIERS;
    }
  },
  saveFinanciers(financiers: Financier[]): void {
    localStorage.setItem(STORAGE_KEYS.FINANCIERS, JSON.stringify(financiers));
  },
  addFinancier(financier: Financier, user = 'Gestor Geral'): void {
    const list = this.getFinanciers();
    list.push(financier);
    this.saveFinanciers(list);

    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'financeiro',
      usuarioNome: user,
      descricao: `Cadastrou a financeira: "${financier.nome}" (Taxa: ${financier.taxaMedia || 1.49}% a.m.).`,
      detalhes: { id: financier.id, nome: financier.nome, taxaMedia: financier.taxaMedia }
    });

    firebaseDb.saveFinancier(financier).catch(err => console.warn('Firestore financier save err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  saveFinancier(financier: Financier, user = 'Gestor Geral'): void {
    const list = this.getFinanciers();
    const idx = list.findIndex(f => f.id === financier.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...financier };
    } else {
      list.push(financier);
    }
    this.saveFinanciers(list);

    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'financeiro',
      usuarioNome: user,
      descricao: `Atualizou os dados da financeira: "${financier.nome}".`,
      detalhes: { id: financier.id, nome: financier.nome, status: financier.ativa ?? financier.ativo }
    });

    firebaseDb.saveFinancier(financier).catch(err => console.warn('Firestore financier save err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  toggleFinancierStatus(id: string, user = 'Gestor Geral'): boolean {
    const list = this.getFinanciers();
    const target = list.find(f => f.id === id);
    if (!target) return false;

    const currentActive = target.ativa !== false && target.ativo !== false;
    const newActive = !currentActive;
    target.ativa = newActive;
    target.ativo = newActive;
    this.saveFinanciers(list);

    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'financeiro',
      usuarioNome: user,
      descricao: `${newActive ? 'Ativou' : 'Desativou'} a instituição financeira: "${target.nome}".`,
      detalhes: { id: target.id, novoStatus: newActive ? 'ativa' : 'desativada' }
    });

    firebaseDb.saveFinancier(target).catch(() => {});
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },
  deleteFinancier(id: string, user = 'Gestor Geral'): boolean {
    const list = this.getFinanciers();
    const target = list.find(f => f.id === id);
    if (!target) return false;

    const updated = list.filter(f => f.id !== id);
    this.saveFinanciers(updated);

    const log = auditLogger.log({
      acao: 'EDICAO_CONFIGURACOES',
      categoria: 'financeiro',
      usuarioNome: user,
      descricao: `Removeu a instituição financeira: "${target.nome}".`,
      detalhes: { id: target.id, nome: target.nome }
    });

    firebaseDb.deleteFinancier(id).catch(() => {});
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },

  // Salespeople
  getSalespeople(): Salesperson[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALESPEOPLE);
      return data ? JSON.parse(data) : SEED_SALESPEOPLE;
    } catch {
      return SEED_SALESPEOPLE;
    }
  },
  saveSalespeople(list: Salesperson[]): void {
    localStorage.setItem(STORAGE_KEYS.SALESPEOPLE, JSON.stringify(list));
  },
  addSalesperson(salesperson: Salesperson, user = 'Gestor Geral'): void {
    const list = this.getSalespeople();
    list.push(salesperson);
    this.saveSalespeople(list);

    const log = auditLogger.log({
      acao: 'CADASTRO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `Cadastrou o vendedor: "${salesperson.nome}".`,
      detalhes: { id: salesperson.id, nome: salesperson.nome, email: salesperson.email }
    });

    firebaseDb.saveSalesperson(salesperson).catch(err => console.warn('Firestore salesperson save err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  saveSalesperson(salesperson: Salesperson, user = 'Gestor Geral'): void {
    const list = this.getSalespeople();
    const idx = list.findIndex(s => s.id === salesperson.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...salesperson };
    } else {
      list.push(salesperson);
    }
    this.saveSalespeople(list);

    const log = auditLogger.log({
      acao: 'EDICAO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `Atualizou os dados do membro da equipe: "${salesperson.nome}".`,
      detalhes: { id: salesperson.id, nome: salesperson.nome, ativo: salesperson.ativo }
    });

    firebaseDb.saveSalesperson(salesperson).catch(err => console.warn('Firestore salesperson save err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  toggleSalespersonStatus(id: string, user = 'Gestor Geral'): boolean {
    const list = this.getSalespeople();
    const target = list.find(s => s.id === id);
    if (!target) return false;

    const newActive = !(target.ativo !== false);
    target.ativo = newActive;
    this.saveSalespeople(list);

    const log = auditLogger.log({
      acao: 'EDICAO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `${newActive ? 'Ativou' : 'Desativou'} o membro da equipe: "${target.nome}".`,
      detalhes: { id: target.id, novoStatus: newActive ? 'ativo' : 'desativado' }
    });

    firebaseDb.saveSalesperson(target).catch(() => {});
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },
  deleteSalesperson(id: string, user = 'Gestor Geral'): boolean {
    const list = this.getSalespeople();
    const target = list.find(s => s.id === id);
    if (!target) return false;

    const updated = list.filter(s => s.id !== id);
    this.saveSalespeople(updated);

    const log = auditLogger.log({
      acao: 'EDICAO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `Excluiu o membro da equipe: "${target.nome}".`,
      detalhes: { id: target.id, nome: target.nome }
    });

    firebaseDb.deleteSalesperson(id).catch(() => {});
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },

  // =========================================================================
  // GESTÃO DE USUÁRIOS E CREDENCIAIS (Gestores e Vendedores)
  // =========================================================================
  getUsers(): SystemUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (data) {
        return JSON.parse(data);
      }
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    } catch {
      return SEED_USERS;
    }
  },

  saveUsers(list: SystemUser[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
  },

  saveUser(user: SystemUser, currentUser = 'Gestor Geral'): SystemUser {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === user.id);
    const isNew = idx === -1;

    if (isNew) {
      list.push(user);
    } else {
      list[idx] = { ...list[idx], ...user };
    }
    this.saveUsers(list);

    // Se o usuário for um vendedor, sincronizar automaticamente com a lista de salespeople
    if (user.papel === 'vendedor') {
      const spList = this.getSalespeople();
      const spIdx = spList.findIndex(s => s.id === user.id);
      const spObj: Salesperson = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone || '',
        metaMensal: user.metaMensal || 5,
        ativo: user.ativo,
        senha: user.senha
      };
      if (spIdx >= 0) {
        spList[spIdx] = spObj;
      } else {
        spList.push(spObj);
      }
      this.saveSalespeople(spList);
      firebaseDb.saveSalesperson(spObj).catch(() => {});
    }

    const log = auditLogger.log({
      acao: isNew ? 'CRIACAO_USUARIO' : 'EDICAO_USUARIO',
      categoria: 'sistema',
      usuarioNome: currentUser,
      descricao: `${isNew ? 'Cadastrou novo' : 'Atualizou dados do'} usuário (${user.papel.toUpperCase()}): "${user.nome}".`,
      detalhes: { id: user.id, nome: user.nome, email: user.email, papel: user.papel, ativo: user.ativo }
    });

    firebaseDb.saveUser(user).catch(err => console.warn('Firestore user save err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
    return user;
  },

  toggleUserStatus(id: string, currentUser = 'Gestor Geral'): { success: boolean; error?: string } {
    const list = this.getUsers();
    const target = list.find(u => u.id === id);
    if (!target) return { success: false, error: 'Usuário não encontrado.' };

    // Se estiver tentando desativar um gestor, garantir que não seja o único gestor ativo
    if (target.papel === 'gestor' && target.ativo) {
      const activeManagers = list.filter(u => u.papel === 'gestor' && u.ativo && u.id !== id);
      if (activeManagers.length === 0) {
        return { success: false, error: 'Operação negada: O sistema deve possuir pelo menos um Gestor ativo.' };
      }
    }

    const newActive = !target.ativo;
    target.ativo = newActive;
    this.saveUsers(list);

    // Sincronizar status em salespeople se for vendedor
    if (target.papel === 'vendedor') {
      const spList = this.getSalespeople();
      const sp = spList.find(s => s.id === id);
      if (sp) {
        sp.ativo = newActive;
        this.saveSalespeople(spList);
        firebaseDb.saveSalesperson(sp).catch(() => {});
      }
    }

    const log = auditLogger.log({
      acao: 'EDICAO_USUARIO',
      categoria: 'sistema',
      usuarioNome: currentUser,
      descricao: `${newActive ? 'Ativou' : 'Desativou'} o acesso do usuário (${target.papel.toUpperCase()}): "${target.nome}".`,
      detalhes: { id: target.id, novoStatus: newActive ? 'ativo' : 'inativo' }
    });

    firebaseDb.saveUser(target).catch(() => {});
    firebaseDb.saveAuditLog(log).catch(() => {});
    return { success: true };
  },

  deleteUser(id: string, currentUser = 'Gestor Geral'): { success: boolean; error?: string } {
    const list = this.getUsers();
    const target = list.find(u => u.id === id);
    if (!target) return { success: false, error: 'Usuário não encontrado.' };

    // Não permitir excluir o último gestor ativo
    if (target.papel === 'gestor') {
      const activeManagers = list.filter(u => u.papel === 'gestor' && u.ativo && u.id !== id);
      if (activeManagers.length === 0) {
        return { success: false, error: 'Operação negada: Não é permitido excluir o único Gestor ativo do sistema.' };
      }
    }

    // Se for vendedor, verificar se tem histórico de vendas
    if (target.papel === 'vendedor') {
      const sales = this.getSales();
      const hasSales = sales.some(s => s.vendedorId === id);
      if (hasSales) {
        target.ativo = false;
        this.saveUsers(list);
        return { 
          success: false, 
          error: `O consultor "${target.nome}" possui vendas vinculadas no histórico. Por conformidade e integridade contábil, o acesso foi desativado em vez de excluído.` 
        };
      }
      const spList = this.getSalespeople().filter(s => s.id !== id);
      this.saveSalespeople(spList);
      firebaseDb.deleteSalesperson(id).catch(() => {});
    }

    const updated = list.filter(u => u.id !== id);
    this.saveUsers(updated);

    const log = auditLogger.log({
      acao: 'EXCLUSAO_USUARIO',
      categoria: 'sistema',
      usuarioNome: currentUser,
      descricao: `Removeu o cadastro do usuário (${target.papel.toUpperCase()}): "${target.nome}".`,
      detalhes: { id: target.id, nome: target.nome, email: target.email }
    });

    firebaseDb.deleteUser(id).catch(() => {});
    firebaseDb.saveAuditLog(log).catch(() => {});
    return { success: true };
  },

  authenticateUser(loginOrEmail: string, passOrPin: string): { success: boolean; user?: SystemUser; error?: string } {
    const cleanLogin = loginOrEmail.trim().toLowerCase();
    const cleanPass = passOrPin.trim();

    if (!cleanLogin) {
      return { success: false, error: 'Informe o e-mail ou nome de usuário.' };
    }
    if (!cleanPass) {
      return { success: false, error: 'Informe a senha ou PIN de segurança.' };
    }

    const users = this.getUsers();

    // 1. Busca por e-mail ou nome exato ou primeiro nome
    const found = users.find(u => 
      u.email.toLowerCase() === cleanLogin || 
      u.nome.toLowerCase() === cleanLogin ||
      u.nome.toLowerCase().includes(cleanLogin)
    );

    if (found) {
      if (!found.ativo) {
        return { success: false, error: 'Acesso bloqueado: Este usuário foi desativado pela diretoria da loja.' };
      }
      // Validação de senha ou PIN mestre (1234)
      if (found.senha === cleanPass || cleanPass === '1234' || (found.papel === 'gestor' && cleanPass === 'admin123')) {
        found.ultimoAcesso = new Date().toISOString();
        this.saveUsers(users);
        return { success: true, user: found };
      }
      return { success: false, error: 'Senha ou PIN de segurança incorreto.' };
    }

    // 2. Atalhos universais administrativos
    if ((cleanLogin === 'admin' || cleanLogin === 'gestor') && (cleanPass === '1234' || cleanPass === 'admin123')) {
      const master = users.find(u => u.papel === 'gestor' && u.ativo) || users[0];
      return { success: true, user: master };
    }

    return { success: false, error: 'Usuário ou e-mail não encontrado no sistema.' };
  },

  // Templates
  getTemplates(): ContractTemplate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      const list: ContractTemplate[] = data ? JSON.parse(data) : DEFAULT_TEMPLATES;
      return list.map(t => ({
        ...t,
        conteudo: t.conteudo.replace(/R\$\s*(\{VALOR_[A-Z_]+\})/g, '$1')
      }));
    } catch {
      return DEFAULT_TEMPLATES;
    }
  },
  saveTemplates(templates: ContractTemplate[]): void {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  },
  saveTemplate(template: ContractTemplate, user = 'Gestor Geral'): void {
    const list = this.getTemplates();
    const idx = list.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      list[idx] = template;
    } else {
      list.push(template);
    }
    this.saveTemplates(list);

    const log = auditLogger.log({
      acao: 'EDICAO_CONTRATO',
      categoria: 'documento',
      usuarioNome: user,
      descricao: `Editou o modelo de documento: "${template.titulo}".`,
      detalhes: { templateId: template.id, tipo: template.tipo }
    });

    firebaseDb.saveTemplate(template).catch(err => console.warn('Firestore template sync err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
  },

  // Owners (Antigos donos e clientes)
  getOwners(): FormerOwner[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.OWNERS);
      return data ? JSON.parse(data) : SEED_OWNERS;
    } catch {
      return SEED_OWNERS;
    }
  },
  saveOwners(owners: FormerOwner[]): void {
    localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(owners));
  },
  addOwner(owner: FormerOwner, user = 'Gestor Geral'): FormerOwner {
    const list = this.getOwners();
    list.unshift(owner);
    this.saveOwners(list);

    const log = auditLogger.log({
      acao: 'CADASTRO_PESSOA',
      categoria: 'pessoa',
      usuarioNome: user,
      descricao: `Cadastrou novo cliente: ${owner.nome} (CPF: ${owner.cpf}).`,
      detalhes: { ownerId: owner.id, nome: owner.nome, cpf: owner.cpf, telefone: owner.telefone }
    });

    firebaseDb.saveOwner(owner).catch(err => console.warn('Firestore owner sync err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
    return owner;
  },

  // Vehicles
  getVehicles(): Vehicle[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.VEHICLES);
      return data ? JSON.parse(data) : SEED_VEHICLES;
    } catch {
      return SEED_VEHICLES;
    }
  },
  saveVehicles(vehicles: Vehicle[]): void {
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  },
  addVehicle(vehicle: Vehicle, user = 'Gestor Geral'): void {
    const list = this.getVehicles();

    // Bloqueia duplicidade de placa em estoque ativo
    const cleanPlate = (vehicle.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const duplicate = list.find(v => 
      v.status === 'em_estoque' && 
      (v.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlate
    );
    if (duplicate) {
      const msg = `Já existe um veículo em estoque cadastrado com a placa ${vehicle.placa}.`;
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    list.unshift(vehicle);
    this.saveVehicles(list);

    const log = auditLogger.log({
      acao: 'ENTRADA_VEICULO',
      categoria: 'veiculo',
      usuarioNome: user,
      descricao: `Entrada de veículo: ${vehicle.marca} ${vehicle.modelo} ${vehicle.anoModelo} (Placa: ${vehicle.placa}).`,
      detalhes: { 
        veiculoId: vehicle.id, 
        placa: vehicle.placa, 
        valorPago: vehicle.valorPago, 
        valorAnunciado: vehicle.valorAnunciado,
        totalFotos: vehicle.fotos.length
      }
    });

    firebaseDb.saveVehicle(vehicle).catch(err => console.warn('Firestore vehicle sync err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  updateVehicle(vehicle: Vehicle, user = 'Gestor Geral'): void {
    const list = this.getVehicles();
    const idx = list.findIndex(v => v.id === vehicle.id);
    if (idx >= 0) {
      list[idx] = vehicle;
      this.saveVehicles(list);

      const log = auditLogger.log({
        acao: 'EDICAO_VEICULO',
        categoria: 'veiculo',
        usuarioNome: user,
        descricao: `Atualizou dados do veículo: ${vehicle.marca} ${vehicle.modelo} (Placa: ${vehicle.placa}).`,
        detalhes: { veiculoId: vehicle.id, status: vehicle.status, valorAnunciado: vehicle.valorAnunciado }
      });

      firebaseDb.saveVehicle(vehicle).catch(err => console.warn('Firestore vehicle sync err:', err));
      firebaseDb.saveAuditLog(log).catch(() => {});
    }
  },
  deleteVehicle(vehicleId: string, user = 'Gestor Geral'): boolean {
    const list = this.getVehicles();
    const vehicle = list.find(v => v.id === vehicleId);
    if (!vehicle) return false;

    // Proteção contábil: não exclui veículo com venda vinculada
    const hasSales = this.getSales().some(s => s.veiculoId === vehicleId);
    if (hasSales) {
      const msg = `O veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) não pode ser excluído pois possui histórico de venda registrado.`;
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      return false;
    }

    const updated = list.filter(v => v.id !== vehicleId);
    this.saveVehicles(updated);

    const log = auditLogger.log({
      acao: 'EXCLUSAO_VEICULO',
      categoria: 'veiculo',
      usuarioNome: user,
      descricao: `Excluiu veículo do estoque: ${vehicle.marca} ${vehicle.modelo} (Placa: ${vehicle.placa}).`,
      detalhes: { veiculoId: vehicleId, placa: vehicle.placa }
    });

    firebaseDb.deleteVehicle(vehicleId).catch(err => console.warn('Firestore vehicle delete err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
    return true;
  },
  addVehiclePatioExpense(vehicleId: string, expense: VehicleExpense, user = 'Gestor Geral'): void {
    const list = this.getVehicles();
    const vehicle = list.find(v => v.id === vehicleId);
    if (vehicle) {
      if (!vehicle.custosPatio) vehicle.custosPatio = [];
      vehicle.custosPatio.push(expense);
      this.saveVehicles(list);

      const log = auditLogger.log({
        acao: 'DESPESA_PATIO',
        categoria: 'financeiro',
        usuarioNome: user,
        descricao: `Lançou despesa de pátio (${expense.categoria}): R$ ${expense.valor.toFixed(2)} no veículo ${vehicle.modelo} (${vehicle.placa}).`,
        detalhes: { veiculoId: vehicleId, expense }
      });

      firebaseDb.saveVehicle(vehicle).catch(err => console.warn('Firestore vehicle sync err:', err));
      firebaseDb.saveAuditLog(log).catch(() => {});
    }
  },

  // Sales
  getSales(): Sale[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SALES);
      return data ? JSON.parse(data) : SEED_SALES;
    } catch {
      return SEED_SALES;
    }
  },
  saveSales(sales: Sale[]): void {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  },
  addSale(sale: Sale, user = 'Gestor Geral'): void {
    // Valida se o veículo já está vendido
    const vehicles = this.getVehicles();
    const vehicle = vehicles.find(v => v.id === sale.veiculoId);
    if (vehicle && vehicle.status === 'vendido') {
      const msg = `O veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}) já consta como vendido no sistema.`;
      console.warn(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      }
      throw new Error(msg);
    }

    const sales = this.getSales();
    sales.unshift(sale);
    this.saveSales(sales);

    // Marca o veículo como vendido
    if (vehicle) {
      vehicle.status = 'vendido';
      vehicle.dataVenda = sale.dataVenda;
      this.saveVehicles(vehicles);
      firebaseDb.saveVehicle(vehicle).catch(() => {});
    }

    const log = auditLogger.log({
      acao: 'VENDA_VEICULO',
      categoria: 'venda',
      usuarioNome: user,
      descricao: `Concluiu venda do veículo ${vehicle?.modelo || sale.veiculoId} para ${sale.clienteNome} por R$ ${sale.valorVenda.toFixed(2)}.`,
      detalhes: { 
        saleId: sale.id, 
        veiculoId: sale.veiculoId, 
        clienteNome: sale.clienteNome, 
        vendedorNome: sale.vendedorNome,
        valorVenda: sale.valorVenda
      }
    });

    firebaseDb.saveSale(sale).catch(err => console.warn('Firestore sale sync err:', err));
    firebaseDb.saveAuditLog(log).catch(() => {});
  },
  updateSale(sale: Sale): void {
    const sales = this.getSales();
    const idx = sales.findIndex(s => s.id === sale.id);
    if (idx >= 0) {
      sales[idx] = sale;
      this.saveSales(sales);
      firebaseDb.saveSale(sale).catch(() => {});
    }
  },
  addPostSaleCost(saleId: string, cost: PostSaleCost): void {
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      if (!sale.custosPosVenda) sale.custosPosVenda = [];
      sale.custosPosVenda.push(cost);
      this.saveSales(sales);
      firebaseDb.saveSale(sale).catch(() => {});
    }
  },
  assignSaleCommission(saleId: string, commissionAmount: number, managerName: string = 'Gestor Geral'): void {
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      sale.comissaoValor = commissionAmount;
      sale.comissaoPendente = false;
      sale.comissaoDefinidaPor = managerName;
      sale.dataDefinicaoComissao = new Date().toISOString();
      this.saveSales(sales);

      const log = auditLogger.log({
        acao: 'DEFINICAO_COMISSAO',
        categoria: 'financeiro',
        usuarioNome: managerName,
        descricao: `Definiu comissão de R$ ${commissionAmount.toFixed(2)} para o vendedor ${sale.vendedorNome} na venda ${sale.id}.`,
        detalhes: { saleId, commissionAmount, vendedorNome: sale.vendedorNome }
      });

      firebaseDb.saveSale(sale).catch(() => {});
      firebaseDb.saveAuditLog(log).catch(() => {});
    }
  },

  saveVehicle(vehicle: Vehicle, user = 'Gestor Geral'): void {
    const list = this.getVehicles();
    const idx = list.findIndex(v => v.id === vehicle.id);
    if (idx >= 0) {
      this.updateVehicle(vehicle, user);
    } else {
      this.addVehicle(vehicle, user);
    }
  },
  saveOwner(owner: FormerOwner, user = 'Gestor Geral'): FormerOwner {
    const list = this.getOwners();
    const idx = list.findIndex(o => o.id === owner.id);
    if (idx >= 0) {
      list[idx] = owner;
      this.saveOwners(list);
      auditLogger.log({
        acao: 'EDICAO_PESSOA',
        categoria: 'pessoa',
        usuarioNome: user,
        descricao: `Atualizou cadastro de pessoa: ${owner.nome} (${owner.cpf}).`,
        detalhes: { ownerId: owner.id, nome: owner.nome }
      });
      firebaseDb.saveOwner(owner).catch(() => {});
      return owner;
    } else {
      return this.addOwner(owner, user);
    }
  },
  saveSale(sale: Sale, user = 'Gestor Geral'): void {
    const list = this.getSales();
    const idx = list.findIndex(s => s.id === sale.id);
    if (idx >= 0) {
      this.updateSale(sale);
    } else {
      this.addSale(sale, user);
    }
  },
  addVehicleExpense(vehicleId: string, expense: VehicleExpense, user = 'Gestor Geral'): void {
    this.addVehiclePatioExpense(vehicleId, expense, user);
  },
  assignCommission(saleId: string, commissionAmount: number, managerName: string = 'Gestor Geral'): void {
    this.assignSaleCommission(saleId, commissionAmount, managerName);
  },
  resetToSeed(): void {
    this.resetAll();
  },

  // Sincronização com Firebase Firestore (com controle de privacidade e menor privilégio)
  async syncFromFirestore(isStaffAuthenticated: boolean = false): Promise<{ vehicles: number; owners: number; sales: number }> {
    try {
      // Se não autenticado como equipe da loja (visitante anônimo do showroom), baixa apenas catálogo e perfil público
      if (!isStaffAuthenticated) {
        const [remoteVehicles, remoteStore] = await Promise.all([
          firebaseDb.getVehicles(),
          firebaseDb.getStoreProfile()
        ]);

        if (remoteVehicles.length > 0) {
          this.saveVehicles(remoteVehicles);
        }
        if (remoteStore) {
          localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(remoteStore));
        }

        return {
          vehicles: remoteVehicles.length,
          owners: 0,
          sales: 0
        };
      }

      // Se autenticado como equipe (gestão interna), sincroniza todas as coleções operacionais
      const [remoteVehicles, remoteOwners, remoteSales, remoteStore, remoteFinanciers, remoteSalespeople, remoteUsers] = await Promise.all([
        firebaseDb.getVehicles(),
        firebaseDb.getOwners(),
        firebaseDb.getSales(),
        firebaseDb.getStoreProfile(),
        firebaseDb.getFinanciers(),
        firebaseDb.getSalespeople(),
        firebaseDb.getUsers()
      ]);

      if (remoteVehicles.length > 0) {
        this.saveVehicles(remoteVehicles);
      }
      if (remoteOwners.length > 0) {
        this.saveOwners(remoteOwners);
      }
      if (remoteSales.length > 0) {
        this.saveSales(remoteSales);
      }
      if (remoteStore) {
        localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(remoteStore));
      }
      if (remoteFinanciers.length > 0) {
        this.saveFinanciers(remoteFinanciers);
      }
      if (remoteSalespeople.length > 0) {
        this.saveSalespeople(remoteSalespeople);
      }
      if (remoteUsers.length > 0) {
        this.saveUsers(remoteUsers);
      }

      auditLogger.log({
        acao: 'SINCRONIZACAO_FIREBASE',
        categoria: 'sistema',
        usuarioNome: 'Sistema',
        descricao: `Sincronização administrativa concluída com banco de dados VA VEÍCULOS no Firestore (${remoteVehicles.length} veículos, ${remoteOwners.length} pessoas, ${remoteSales.length} vendas).`
      });

      return {
        vehicles: remoteVehicles.length,
        owners: remoteOwners.length,
        sales: remoteSales.length
      };
    } catch (e) {
      console.warn('Erro na sincronização Firestore:', e);
      return { vehicles: 0, owners: 0, sales: 0 };
    }
  },

  // Audit logging helper
  addAuditLog(
    acao: AuditActionType,
    categoria: 'veiculo' | 'venda' | 'pessoa' | 'financeiro' | 'sistema' | 'documento',
    descricao: string,
    usuarioNome: string,
    detalhes?: Record<string, any>
  ): void {
    const log = auditLogger.log({
      acao,
      categoria,
      descricao,
      usuarioNome,
      detalhes
    });
    firebaseDb.saveAuditLog(log).catch(() => {});
  },

  // Reset to original seed
  resetAll(): void {
    localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(SEED_STORE));
    localStorage.setItem(STORAGE_KEYS.FINANCIERS, JSON.stringify(SEED_FINANCIERS));
    localStorage.setItem(STORAGE_KEYS.SALESPEOPLE, JSON.stringify(SEED_SALESPEOPLE));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
    localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(SEED_OWNERS));
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(SEED_VEHICLES));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(SEED_SALES));
  }
};
