import React, { useState } from 'react';
import { 
  Users, ShieldCheck, UserCheck, Plus, Search, 
  Filter, KeyRound, Edit2, Trash2, CheckCircle2, 
  XCircle, AlertCircle, Phone, Mail, Award, Calendar,
  Eye, EyeOff, Lock, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { SystemUser, UserRole, Salesperson, StoreProfile } from '../../types';
import { PageHeader, KpiCard, StatusBadge, formStyles } from '../common/DesignSystem';
import { storageService } from '../../services/storage';
import { maskPhone, isValidPhone } from '../../utils/formatters';
import { PaginationControls } from '../common/PaginationControls';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface UsersManagementViewProps {
  currentUserRole: UserRole;
  store: StoreProfile;
  onRefreshData?: () => void;
  initialSearchTerm?: string;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  currentUserRole,
  store,
  onRefreshData,
  initialSearchTerm = ''
}) => {
  const [users, setUsers] = useState<SystemUser[]>(() => storageService.getUsers());
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [roleFilter, setRoleFilter] = useState<'todos' | 'gestor' | 'vendedor'>('todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');

  React.useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  // Modals state
  const [isCreateOrEditOpen, setIsCreateOrEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [userForPasswordReset, setUserForPasswordReset] = useState<SystemUser | null>(null);

  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formPapel, setFormPapel] = useState<UserRole>('vendedor');
  const [formSenha, setFormSenha] = useState('1234');
  const [formConfirmSenha, setFormConfirmSenha] = useState('1234');
  const [formMetaMensal, setFormMetaMensal] = useState<number>(5);
  const [formAtivo, setFormAtivo] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Reset Password Modal State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const refreshList = () => {
    setUsers(storageService.getUsers());
    if (onRefreshData) onRefreshData();
  };

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormNome('');
    setFormEmail('');
    setFormTelefone('(83) 9');
    setFormPapel('vendedor');
    setFormSenha('1234');
    setFormConfirmSenha('1234');
    setFormMetaMensal(5);
    setFormAtivo(true);
    setShowPassword(false);
    setIsCreateOrEditOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (u: SystemUser) => {
    setEditingUser(u);
    setFormNome(u.nome);
    setFormEmail(u.email);
    setFormTelefone(u.telefone || '');
    setFormPapel(u.papel);
    setFormSenha(u.senha);
    setFormConfirmSenha(u.senha);
    setFormMetaMensal(u.metaMensal || 5);
    setFormAtivo(u.ativo);
    setShowPassword(false);
    setIsCreateOrEditOpen(true);
  };

  // Submit User Create / Edit
  const handleSaveUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNome.trim() || !formEmail.trim()) {
      showNotification('error', 'Nome e E-mail são obrigatórios.');
      return;
    }

    if (formTelefone.trim() && !isValidPhone(formTelefone)) {
      showNotification('error', 'Por favor, informe um WhatsApp válido com DDD (10 ou 11 dígitos).');
      return;
    }

    if (formPapel === 'vendedor' && (isNaN(formMetaMensal) || formMetaMensal < 1 || formMetaMensal > 100)) {
      showNotification('error', 'A meta mensal deve ser um número entre 1 e 100 veículos.');
      return;
    }

    if (!editingUser && formSenha !== formConfirmSenha) {
      showNotification('error', 'A senha e a confirmação de senha não coincidem.');
      return;
    }

    // Check duplicate email
    const emailLower = formEmail.trim().toLowerCase();
    const duplicate = users.find(u => u.email.toLowerCase() === emailLower && u.id !== editingUser?.id);
    if (duplicate) {
      showNotification('error', `O e-mail "${formEmail}" já está cadastrado para o usuário ${duplicate.nome}.`);
      return;
    }

    const userId = editingUser ? editingUser.id : `user_${formPapel}_${Date.now()}`;

    const userObj: SystemUser = {
      id: userId,
      nome: formNome.trim(),
      email: emailLower,
      telefone: formTelefone.trim(),
      papel: formPapel,
      senha: formSenha.trim() || '1234',
      ativo: formAtivo,
      metaMensal: formPapel === 'vendedor' ? formMetaMensal : undefined,
      dataCriacao: editingUser ? editingUser.dataCriacao : new Date().toISOString(),
      ultimoAcesso: editingUser?.ultimoAcesso
    };

    storageService.saveUser(userObj, 'Gestor Geral');
    refreshList();
    setIsCreateOrEditOpen(false);
    showNotification('success', editingUser ? `Usuário "${userObj.nome}" atualizado com sucesso!` : `Novo ${userObj.papel === 'gestor' ? 'Gestor' : 'Vendedor'} cadastrado com sucesso!`);
  };

  // Toggle Active/Inactive
  const handleToggleStatus = (u: SystemUser) => {
    const res = storageService.toggleUserStatus(u.id, 'Gestor Geral');
    if (!res.success) {
      showNotification('error', res.error || 'Erro ao alterar status.');
      return;
    }
    refreshList();
    showNotification('success', `Status do usuário "${u.nome}" alterado para ${!u.ativo ? 'Ativo' : 'Inativo'}.`);
  };

  // Delete User
  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    const res = storageService.deleteUser(userToDelete.id, 'Gestor Geral');
    if (!res.success) {
      showNotification('error', res.error || 'Erro ao excluir usuário.');
    } else {
      showNotification('success', `Usuário "${userToDelete.nome}" removido do sistema.`);
    }
    setUserToDelete(null);
    refreshList();
  };

  // Password Reset
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForPasswordReset) return;

    if (!newPassword.trim()) {
      showNotification('error', 'Informe a nova senha ou PIN.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showNotification('error', 'As senhas não coincidem.');
      return;
    }

    const updatedUser: SystemUser = {
      ...userForPasswordReset,
      senha: newPassword.trim()
    };

    storageService.saveUser(updatedUser, 'Gestor Geral');
    refreshList();
    setIsResetPasswordOpen(false);
    setUserForPasswordReset(null);
    setNewPassword('');
    setConfirmNewPassword('');
    showNotification('success', `Senha do usuário "${updatedUser.nome}" redefinida com sucesso!`);
  };

  // Calculations for KPIs
  const totalUsers = users.length;
  const activeGestores = users.filter(u => u.papel === 'gestor' && u.ativo).length;
  const activeVendedores = users.filter(u => u.papel === 'vendedor' && u.ativo).length;
  const totalSalesGoal = users
    .filter(u => u.papel === 'vendedor' && u.ativo)
    .reduce((acc, u) => acc + (u.metaMensal || 0), 0);

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      u.nome.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.telefone && u.telefone.includes(query));

    const matchesRole = roleFilter === 'todos' || u.papel === roleFilter;
    const matchesStatus = 
      statusFilter === 'todos' || 
      (statusFilter === 'ativos' && u.ativo) ||
      (statusFilter === 'inativos' && !u.ativo);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Paginação com cache sob demanda
  const pagination = usePaginatedList<SystemUser>({
    items: filteredUsers,
    initialPageSize: 6,
    dependencies: [searchTerm, roleFilter, statusFilter, filteredUsers.length]
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumb="Administração • Controle de Acessos"
        title="Gestão de Usuários & Equipe"
        subtitle="Cadastre novos gestores ou vendedores, configure credenciais de login, senhas e controle o acesso ao sistema."
        action={
          currentUserRole === 'gestor' ? {
            label: '+ Cadastrar Novo Usuário',
            onClick: handleOpenCreateModal
          } : undefined
        }
      />

      {/* Floating feedback alert */}
      {feedbackMsg && (
        <div className={`p-4 rounded-[12px] flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in-50 ${
          feedbackMsg.type === 'success' 
            ? 'bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#4ADE80]' 
            : 'bg-[#D4130D]/10 border border-[#D4130D]/30 text-[#F87171]'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="cursor-pointer text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Mini-KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Usuários"
          value={totalUsers}
          icon={Users}
          subtext="Contas cadastradas no sistema"
        />
        <KpiCard
          title="Gestores Ativos"
          value={activeGestores}
          icon={ShieldCheck}
          subtext="Acesso administrativo total"
          isRedHighlight={true}
        />
        <KpiCard
          title="Consultores de Venda"
          value={activeVendedores}
          icon={UserCheck}
          subtext="Operadores comerciais"
        />
        <KpiCard
          title="Meta Mensal Global"
          value={`${totalSalesGoal} carros`}
          icon={Award}
          subtext="Soma das metas dos vendedores"
        />
      </div>

      {/* 3. Filters Bar */}
      <div className="p-4 bg-[#17171A] border border-[#2D2D32] rounded-[12px] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#A7A7AB] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
            className="w-full bg-[#202024] text-xs text-[#F5F5F5] pl-9 pr-3 py-2 rounded-[8px] border border-[#343439] focus:outline-none focus:border-[#D4130D]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-[#202024] p-1 rounded-[8px] border border-[#343439] text-xs">
            <button
              onClick={() => setRoleFilter('todos')}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                roleFilter === 'todos' ? 'bg-[#D4130D] text-white font-bold' : 'text-[#A7A7AB] hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setRoleFilter('gestor')}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                roleFilter === 'gestor' ? 'bg-[#D4130D] text-white font-bold' : 'text-[#A7A7AB] hover:text-white'
              }`}
            >
              Gestores ({users.filter(u => u.papel === 'gestor').length})
            </button>
            <button
              onClick={() => setRoleFilter('vendedor')}
              className={`px-2.5 py-1 rounded-[6px] font-medium transition-colors cursor-pointer ${
                roleFilter === 'vendedor' ? 'bg-[#D4130D] text-white font-bold' : 'text-[#A7A7AB] hover:text-white'
              }`}
            >
              Vendedores ({users.filter(u => u.papel === 'vendedor').length})
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#202024] text-xs text-[#CAC9CA] px-3 py-1.5 rounded-[8px] border border-[#343439] focus:outline-none focus:border-[#D4130D] cursor-pointer"
          >
            <option value="todos">Status: Todos</option>
            <option value="ativos">Somente Ativos</option>
            <option value="inativos">Somente Inativos</option>
          </select>
        </div>
      </div>

      {/* 4. Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pagination.paginatedItems.map((u) => {
          const isGestor = u.papel === 'gestor';

          return (
            <div
              key={u.id}
              className={`p-5 rounded-[14px] bg-[#17171A] border transition-all flex flex-col justify-between space-y-4 ${
                u.ativo 
                  ? isGestor ? 'border-[#D4130D]/40 shadow-sm' : 'border-[#2D2D32]' 
                  : 'border-[#2D2D32] opacity-60'
              }`}
            >
              {/* Top User Info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar Badge */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${
                      isGestor 
                        ? 'bg-[#D4130D]/20 text-[#D4130D] border-[#D4130D]/40' 
                        : 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/40'
                    }`}>
                      {u.nome.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-[#F5F5F5] truncate leading-tight font-display">
                        {u.nome}
                      </h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isGestor 
                          ? 'bg-[#D4130D]/10 text-[#D4130D] border border-[#D4130D]/30' 
                          : 'bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30'
                      }`}>
                        {isGestor ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {isGestor ? 'Gestor Geral' : 'Consultor de Vendas'}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                    u.ativo 
                      ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30' 
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-[#22C55E] animate-pulse' : 'bg-neutral-500'}`} />
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Details List */}
                <div className="space-y-1.5 text-xs text-[#CAC9CA] pt-1">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-[#A7A7AB] shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>

                  {u.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#A7A7AB] shrink-0" />
                      <span>{u.telefone}</span>
                    </div>
                  )}

                  {!isGestor && (
                    <div className="flex items-center gap-2 text-xs">
                      <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Meta Mensal: <strong className="text-white">{u.metaMensal || 5} veículos</strong></span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-[#68686E] pt-1 border-t border-[#2D2D32]/60">
                    <KeyRound className="w-3 h-3 shrink-0" />
                    <span>Senha: <strong className="text-[#A7A7AB] font-mono">••••</strong> (Configurada)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#2D2D32] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(u)}
                    className="p-1.5 rounded-[6px] bg-[#202024] hover:bg-[#2D2D32] text-[#CAC9CA] hover:text-white transition-colors cursor-pointer"
                    title="Editar Dados do Usuário"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserForPasswordReset(u);
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setIsResetPasswordOpen(true);
                    }}
                    className="p-1.5 rounded-[6px] bg-[#202024] hover:bg-[#2D2D32] text-[#CAC9CA] hover:text-white transition-colors cursor-pointer"
                    title="Redefinir Senha de Acesso"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(u)}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors cursor-pointer ${
                      u.ativo 
                        ? 'bg-[#D4130D]/10 hover:bg-[#D4130D]/20 text-[#D4130D]' 
                        : 'bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E]'
                    }`}
                  >
                    {u.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setUserToDelete(u)}
                  className="p-1.5 rounded-[6px] bg-[#202024] hover:bg-[#D4130D]/20 text-[#68686E] hover:text-[#D4130D] transition-colors cursor-pointer"
                  title="Excluir Usuário"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {pagination.totalItems === 0 && (
        <div className="p-12 text-center bg-[#17171A] border border-[#2D2D32] rounded-[14px]">
          <Users className="w-10 h-10 text-[#68686E] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#F5F5F5]">Nenhum usuário encontrado</h3>
          <p className="text-xs text-[#A7A7AB] mt-1">
            Tente ajustar os filtros de busca ou cadastre um novo usuário clicando no botão acima.
          </p>
        </div>
      )}

      {/* Paginação de Usuários com Cache */}
      {pagination.totalItems > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.goToPage}
          onPageSizeChange={pagination.changePageSize}
          pageSizeOptions={[3, 6, 12, 24]}
          isCached={pagination.isCurrentPageCached}
          isLoading={pagination.isLoading}
          itemLabel="usuários cadastrados"
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Cadastro e Edição de Usuário                                    */}
      {/* ========================================================================= */}
      {isCreateOrEditOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-[#17171A] border border-[#2D2D32] rounded-[16px] w-full max-w-lg overflow-hidden shadow-2xl relative text-[#F5F5F5] my-6">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#2D2D32] flex items-center justify-between bg-[#080809]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[8px] bg-[#D4130D]/10 text-[#D4130D]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#F5F5F5] font-display">
                    {editingUser ? `Editar Usuário: ${editingUser.nome}` : 'Cadastrar Novo Usuário da Loja'}
                  </h3>
                  <p className="text-[11px] text-[#A7A7AB]">
                    Defina o papel de acesso (Gestor ou Vendedor) e credenciais de login
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateOrEditOpen(false)}
                className="p-1.5 rounded-[6px] text-[#A7A7AB] hover:text-white hover:bg-[#202024] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUserSubmit} className="p-6 space-y-4">
              
              {/* Papel Selector */}
              <div className="space-y-1.5">
                <label className={formStyles.label}>Perfil de Acesso *</label>
                <div className="grid grid-cols-2 gap-2 bg-[#202024] p-1 rounded-[10px] border border-[#343439]">
                  <button
                    type="button"
                    onClick={() => setFormPapel('gestor')}
                    className={`py-2 px-3 rounded-[8px] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formPapel === 'gestor'
                        ? 'bg-[#D4130D] text-white font-bold shadow-sm'
                        : 'text-[#A7A7AB] hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Gestor Geral</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormPapel('vendedor')}
                    className={`py-2 px-3 rounded-[8px] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      formPapel === 'vendedor'
                        ? 'bg-[#3B82F6] text-white font-bold shadow-sm'
                        : 'text-[#A7A7AB] hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Vendedor</span>
                  </button>
                </div>
                <p className="text-[10px] text-[#A7A7AB] mt-1">
                  {formPapel === 'gestor' 
                    ? '• Gestor Geral: Acesso total a estoques, custos, exclusões, fixação de comissões e gestão de equipe.' 
                    : '• Vendedor: Acesso operacional ao pátio, registro de vendas e solicitação de comissões.'}
                </p>
              </div>

              {/* Nome Completo */}
              <div className="space-y-1">
                <label className={formStyles.label}>Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Ramos"
                  className={formStyles.input}
                />
              </div>

              {/* E-mail de Login */}
              <div className="space-y-1">
                <label className={formStyles.label}>E-mail de Login *</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="usuario@vaveiculos.com.br"
                  className={formStyles.input}
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-1">
                <label className={formStyles.label}>WhatsApp</label>
                <input
                  type="text"
                  maxLength={15}
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(maskPhone(e.target.value))}
                  placeholder="(83) 98765-4321"
                  className={formStyles.input}
                />
              </div>

              {/* Senha e Confirmação (Se novo usuário) */}
              {!editingUser && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className={formStyles.label}>Senha de Acesso *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formSenha}
                        onChange={(e) => setFormSenha(e.target.value)}
                        placeholder="••••"
                        className={`${formStyles.input} pr-8`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A7A7AB] hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={formStyles.label}>Confirmar Senha *</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formConfirmSenha}
                      onChange={(e) => setFormConfirmSenha(e.target.value)}
                      placeholder="••••"
                      className={formStyles.input}
                    />
                  </div>
                </div>
              )}

              {/* Meta Mensal (Apenas se Vendedor) */}
              {formPapel === 'vendedor' && (
                <div className="space-y-1 pt-1">
                  <label className={formStyles.label}>Meta Mensal de Vendas (Veículos)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formMetaMensal}
                    onChange={(e) => setFormMetaMensal(Number(e.target.value))}
                    className={formStyles.input}
                  />
                </div>
              )}

              {/* Status Ativo Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#CAC9CA]">
                  <input
                    type="checkbox"
                    checked={formAtivo}
                    onChange={(e) => setFormAtivo(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#202024] border-[#343439] text-[#D4130D] focus:ring-0 cursor-pointer"
                  />
                  <span>Usuário ativo (permite realizar login no sistema)</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[#2D2D32] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOrEditOpen(false)}
                  className="px-4 py-2 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] text-xs font-semibold text-[#CAC9CA] hover:text-white cursor-pointer transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-xs font-bold text-white cursor-pointer transition-colors shadow-sm"
                >
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Redefinição de Senha de Acesso                                 */}
      {/* ========================================================================= */}
      {isResetPasswordOpen && userForPasswordReset && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-[#17171A] border border-[#2D2D32] rounded-[16px] w-full max-w-sm overflow-hidden shadow-2xl relative text-[#F5F5F5]">
            
            <div className="px-6 py-4 border-b border-[#2D2D32] flex items-center justify-between bg-[#080809]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#D4130D]" />
                <h3 className="font-bold text-sm text-[#F5F5F5] font-display">
                  Redefinir Senha
                </h3>
              </div>
              <button onClick={() => setIsResetPasswordOpen(false)} className="text-[#A7A7AB] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <p className="text-xs text-[#CAC9CA]">
                Informe a nova senha para o usuário <strong className="text-white">{userForPasswordReset.nome}</strong>:
              </p>

              <div className="space-y-1">
                <label className={formStyles.label}>Nova Senha *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••"
                    className={`${formStyles.input} pr-8`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A7A7AB] hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className={formStyles.label}>Confirmar Nova Senha *</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••"
                  className={formStyles.input}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-3 py-1.5 rounded-[8px] bg-[#202024] text-xs font-semibold text-[#CAC9CA] hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-xs font-bold text-white cursor-pointer"
                >
                  Confirmar Nova Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Confirmação de Exclusão                                          */}
      {/* ========================================================================= */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-[#17171A] border border-[#2D2D32] rounded-[16px] w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#D4130D]/20 text-[#D4130D] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#F5F5F5] font-display">
                Excluir Usuário?
              </h3>
              <p className="text-xs text-[#A7A7AB]">
                Tem certeza que deseja remover o usuário <strong className="text-white">{userToDelete.nome}</strong> ({userToDelete.email})?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] text-xs font-semibold text-[#CAC9CA] hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-xs font-bold text-white cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

