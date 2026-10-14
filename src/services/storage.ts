import { 
  StoreProfile, Financier, Salesperson, ContractTemplate, 
  FormerOwner, Vehicle, Sale, VehicleExpense, PostSaleCost 
} from '../types';
import { 
  SEED_STORE, SEED_FINANCIERS, SEED_SALESPEOPLE, 
  SEED_OWNERS, SEED_VEHICLES, SEED_SALES 
} from '../data/seedData';
import { DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { auditLogger } from './auditLogger';
import { firebaseDb } from './firebase';

const STORAGE_KEYS = {
  STORE: 'vaveiculos_store_v2',
  FINANCIERS: 'vaveiculos_financiers_v2',
  SALESPEOPLE: 'vaveiculos_salespeople_v2',
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
      descricao: `Cadastrou a financeira/banco: "${financier.nome}" (Taxa: ${financier.taxaMedia || 1.49}% a.m.).`,
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
      descricao: `Cadastrou o consultor/vendedor: "${salesperson.nome}".`,
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

  // Templates
  getTemplates(): ContractTemplate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      return data ? JSON.parse(data) : DEFAULT_TEMPLATES;
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
      descricao: `Cadastrou nova pessoa/cliente: ${owner.nome} (CPF: ${owner.cpf}).`,
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

  // Sincronização inicial com Firebase Firestore
  async syncFromFirestore(): Promise<{ vehicles: number; owners: number; sales: number }> {
    try {
      const [remoteVehicles, remoteOwners, remoteSales, remoteStore, remoteFinanciers, remoteSalespeople] = await Promise.all([
        firebaseDb.getVehicles(),
        firebaseDb.getOwners(),
        firebaseDb.getSales(),
        firebaseDb.getStoreProfile(),
        firebaseDb.getFinanciers(),
        firebaseDb.getSalespeople()
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

      auditLogger.log({
        acao: 'SINCRONIZACAO_FIREBASE',
        categoria: 'sistema',
        usuarioNome: 'Sistema',
        descricao: `Sincronização concluída com banco de dados VA VEÍCULOS no Firestore (${remoteVehicles.length} veículos, ${remoteOwners.length} pessoas, ${remoteSales.length} vendas).`
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

  // Reset to original seed
  resetAll(): void {
    localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(SEED_STORE));
    localStorage.setItem(STORAGE_KEYS.FINANCIERS, JSON.stringify(SEED_FINANCIERS));
    localStorage.setItem(STORAGE_KEYS.SALESPEOPLE, JSON.stringify(SEED_SALESPEOPLE));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
    localStorage.setItem(STORAGE_KEYS.OWNERS, JSON.stringify(SEED_OWNERS));
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(SEED_VEHICLES));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(SEED_SALES));
  }
};
