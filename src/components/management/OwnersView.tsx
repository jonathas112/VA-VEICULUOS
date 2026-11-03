import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Phone, MapPin, 
  Car, ShoppingCart, ArrowDownLeft, 
  ArrowUpRight, Plus, X
} from 'lucide-react';
import { FormerOwner, Vehicle, Sale, UserRole } from '../../types';
import { formatCurrency, maskCPF, maskPhone, isValidCPF, isValidPhone } from '../../utils/formatters';
import { PageHeader, KpiCard, formStyles } from '../common/DesignSystem';

interface OwnersViewProps {
  owners: FormerOwner[];
  vehicles: Vehicle[];
  sales: Sale[];
  userRole?: UserRole;
  onAddOwner: (owner: FormerOwner) => void;
}

export const OwnersView: React.FC<OwnersViewProps> = ({
  owners,
  vehicles,
  sales,
  userRole = 'vendedor',
  onAddOwner
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingOwner, setIsAddingOwner] = useState(false);

  // New owner form state
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const filteredOwners = useMemo(() => {
    return owners.filter(o => {
      const q = searchTerm.toLowerCase();
      return (
        o.nome.toLowerCase().includes(q) ||
        o.cpf.toLowerCase().includes(q) ||
        o.endereco.toLowerCase().includes(q) ||
        o.telefone.toLowerCase().includes(q)
      );
    });
  }, [owners, searchTerm]);

  const handleCreateOwner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cpf.trim() || !endereco.trim()) {
      alert('Preencha os campos obrigatórios: Nome Completo, CPF e Endereço.');
      return;
    }

    if (!isValidCPF(cpf)) {
      alert('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    const cleanInputCpf = cpf.replace(/\D/g, '');
    const duplicate = owners.find(o => o.cpf.replace(/\D/g, '') === cleanInputCpf);
    if (duplicate) {
      alert(`Este CPF já está cadastrado para "${duplicate.nome}".`);
      return;
    }

    if (telefone.trim() && !isValidPhone(telefone)) {
      alert('Por favor, informe um WhatsApp válido com DDD (10 ou 11 dígitos).');
      return;
    }

    const newOwner: FormerOwner = {
      id: 'owner_' + Date.now(),
      nome: nome.trim(),
      cpf: maskCPF(cpf),
      telefone: telefone ? maskPhone(telefone) : '(83) 99999-0000',
      endereco: endereco.trim(),
      observacoes: observacoes ? observacoes.trim() : undefined,
      dataCadastro: new Date().toISOString()
    };

    onAddOwner(newOwner);
    setIsAddingOwner(false);
    setNome('');
    setCpf('');
    setTelefone('');
    setEndereco('');
    setObservacoes('');
  };

  const totalAcquiredVehicles = vehicles.filter(v => !!v.antigoDonoId).length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Page Header */}
      <PageHeader
        breadcrumb="Operação • Cadastro de Clientes e Parceiros"
        title="Pessoas & Antigos Donos"
        subtitle="Registro de fornecedores de veículos e clientes compradores com histórico comercial completo e dados para contratos."
        primaryAction={{
          label: "Cadastrar Pessoa",
          icon: UserPlus,
          onClick: () => setIsAddingOwner(true),
          id: "owners-btn-add-person"
        }}
      />

      {/* 2. Mini-KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Pessoas Cadastradas"
          value={owners.length}
          icon={Users}
          subtext="Base ativa de fornecedores & compradores"
        />
        <KpiCard
          title="Veículos Fornecidos"
          value={totalAcquiredVehicles}
          icon={Car}
          subtext="Entradas registradas via antigos donos"
        />
        <KpiCard
          title="Vendas a Clientes"
          value={sales.length}
          icon={ShoppingCart}
          subtext="Negócios concluídos vinculados"
        />
      </div>

      {/* 3. Modal de Cadastro de Pessoa */}
      {isAddingOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-[#17171A] border border-[#2D2D32] rounded-[12px] shadow-2xl overflow-hidden animate-in fade-in-50">
            <div className="px-6 py-4 border-b border-[#2D2D32] flex items-center justify-between bg-[#202024]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#D4130D]" />
                <h3 className="text-sm font-bold text-[#F5F5F5] font-display uppercase tracking-wider">
                  Cadastrar Nova Pessoa
                </h3>
              </div>
              <button
                onClick={() => setIsAddingOwner(false)}
                className="text-[#A7A7AB] hover:text-[#F5F5F5] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOwner} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className={formStyles.label}>Nome Completo *</label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    className={formStyles.input}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={formStyles.label}>CPF *</label>
                    <input
                      type="text"
                      required
                      maxLength={14}
                      value={cpf}
                      onChange={(e) => setCpf(maskCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className={`${formStyles.input} font-mono`}
                    />
                  </div>

                  <div>
                    <label className={formStyles.label}>WhatsApp</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={telefone}
                      onChange={(e) => setTelefone(maskPhone(e.target.value))}
                      placeholder="(83) 98765-4321"
                      className={`${formStyles.input} font-mono`}
                    />
                  </div>
                </div>

                <div>
                  <label className={formStyles.label}>Endereço Completo com CEP *</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, Número, Bairro, Cidade - UF, CEP"
                    className={formStyles.input}
                  />
                </div>

                <div>
                  <label className={formStyles.label}>Observações (Opcional)</label>
                  <textarea
                    maxLength={500}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={2}
                    placeholder="Ex: Conta corrente para pagamento, dados bancários Pix..."
                    className={formStyles.textarea}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#2D2D32]">
                <button
                  type="button"
                  onClick={() => setIsAddingOwner(false)}
                  className="px-4 py-2 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] text-xs font-semibold text-[#CAC9CA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Barra de Pesquisa */}
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[10px] p-4 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#A7A7AB] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            maxLength={100}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, CPF, telefone ou cidade..."
            className="w-full bg-[#202024] border border-[#343439] rounded-[8px] pl-9 pr-4 py-2 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#68686E] focus:outline-none focus:border-[#D4130D]"
          />
        </div>
      </div>

      {/* 5. Grade de Pessoas */}
      {filteredOwners.length === 0 ? (
        <div className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-12 text-center">
          <Users className="w-10 h-10 text-[#68686E] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#F5F5F5] font-display">
            Nenhuma pessoa localizada
          </h3>
          <p className="text-xs text-[#A7A7AB] max-w-sm mx-auto mt-1 mb-4">
            Não encontramos registros de pessoas correspondentes ao termo digitado.
          </p>
          <button
            onClick={() => setIsAddingOwner(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Cadastrar Pessoa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOwners.map(owner => {
            // Vehicles bought from this owner
            const ownedVehicles = vehicles.filter(v => v.antigoDonoId === owner.id);
            // Sales to this person (by CPF match or name)
            const boughtSales = sales.filter(s => s.clienteCpf === owner.cpf || s.clienteNome.toLowerCase() === owner.nome.toLowerCase());

            return (
              <div
                key={owner.id}
                className="bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5 flex flex-col justify-between space-y-4 hover:border-[#343439] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-[#F5F5F5] font-display">
                        {owner.nome}
                      </h4>
                      <p className="text-xs font-mono text-[#A7A7AB]">
                        CPF: {owner.cpf}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#202024] border border-[#2D2D32] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-[#A7A7AB]" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#CAC9CA] pt-2 border-t border-[#2D2D32]">
                    <div className="flex items-center gap-2 text-[#A7A7AB]">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-[#CAC9CA]" />
                      <span>{owner.telefone}</span>
                    </div>
                    <div className="flex items-start gap-2 text-[#A7A7AB]">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#CAC9CA] mt-0.5" />
                      <span className="leading-snug">{owner.endereco}</span>
                    </div>
                  </div>
                </div>

                {/* Histórico comercial do proprietário */}
                <div className="space-y-2 pt-3 border-t border-[#2D2D32]">
                  <span className="text-[10px] font-bold text-[#A7A7AB] uppercase tracking-wider block">
                    Histórico Comercial na Loja
                  </span>

                  {/* Veículos vendidos para a loja */}
                  {ownedVehicles.length > 0 ? (
                    <div className="space-y-1">
                      {ownedVehicles.map(v => (
                        <div
                          key={v.id}
                          className="p-2 rounded-[6px] bg-[#202024] text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-[#3B82F6]" />
                            <span className="font-semibold text-[#F5F5F5]">{v.marca} {v.modelo}</span>
                          </div>
                          {userRole === 'gestor' ? (
                            <span className="font-num font-bold text-[#CAC9CA]">{formatCurrency(v.valorPago)}</span>
                          ) : (
                            <span className="text-[10px] text-[#A7A7AB] font-mono italic">Restrito à Gerência</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#68686E]">
                      Nenhum veículo vendido para a loja.
                    </div>
                  )}

                  {/* Veículos comprados da loja */}
                  {boughtSales.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {boughtSales.map(s => (
                        <div
                          key={s.id}
                          className="p-2 rounded-[6px] bg-[#202024] text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E]" />
                            <span className="text-[#F5F5F5]">Compra de Veículo</span>
                          </div>
                          <span className="font-num font-bold text-[#22C55E]">{formatCurrency(s.valorVenda)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
