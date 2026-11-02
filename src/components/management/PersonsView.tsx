import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Search, UserPlus, Phone, MapPin, 
  Car, ShoppingCart, MessageCircle, 
  Edit, X, Eye
} from 'lucide-react';
import { FormerOwner, Vehicle, Sale, StoreProfile } from '../../types';
import { formatCurrency, formatDate, maskCPF, maskPhone, maskCEP, isValidCPF, isValidPhone, isValidCEP } from '../../utils/formatters';
import { PaginationControls } from '../common/PaginationControls';
import { usePaginatedList } from '../../hooks/usePaginatedList';

interface PersonsViewProps {
  owners: FormerOwner[];
  vehicles: Vehicle[];
  sales: Sale[];
  store?: StoreProfile;
  onSaveOwner: (owner: FormerOwner) => void;
  onSelectVehicleHistory?: (vehicleId: string) => void;
  initialSearchTerm?: string;
}

export const PersonsView: React.FC<PersonsViewProps> = ({
  owners,
  vehicles,
  sales,
  onSaveOwner,
  initialSearchTerm = ''
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);
  const [selectedPersonForDetail, setSelectedPersonForDetail] = useState<FormerOwner | null>(null);
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);

  // Formulário de Pessoa
  const [formNome, setFormNome] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formRg, setFormRg] = useState('');
  const [formTelefone, setFormTelefone] = useState('(83) 9');
  const [formEndereco, setFormEndereco] = useState('');
  const [formCidade, setFormCidade] = useState('Areial');
  const [formEstado, setFormEstado] = useState('PB');
  const [formCep, setFormCep] = useState('58140-000');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formError, setFormError] = useState('');

  // Mapeamento de pessoas consolidadas
  const consolidatedPersons = useMemo(() => {
    // Unifica donos cadastrados com compradores únicos de vendas
    const personsMap = new Map<string, FormerOwner>();

    owners.forEach(owner => {
      personsMap.set(owner.id, { ...owner });
    });

    // Se houver algum comprador em vendas que ainda não tem ID na tabela owners, inclui como pessoa
    sales.forEach(s => {
      const existing = Array.from(personsMap.values()).find(
        p => p.cpf.replace(/\D/g, '') === s.clienteCpf.replace(/\D/g, '')
      );
      if (!existing && s.clienteNome) {
        const generatedId = 'buyer_' + s.clienteCpf.replace(/\D/g, '');
        personsMap.set(generatedId, {
          id: generatedId,
          nome: s.clienteNome,
          cpf: s.clienteCpf,
          rg: s.clienteRg,
          telefone: s.clienteTelefone,
          endereco: s.clienteEndereco,
          cidade: s.clienteCidade || 'Areial',
          estado: s.clienteEstado || 'PB',
          cep: s.clienteCep,
          dataCadastro: s.dataVenda
        });
      }
    });

    return Array.from(personsMap.values());
  }, [owners, sales]);

  // Filtro de busca
  const filteredPersons = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return consolidatedPersons;

    return consolidatedPersons.filter(p => {
      const matchName = p.nome.toLowerCase().includes(term);
      const matchCpf = p.cpf.toLowerCase().replace(/\D/g, '').includes(term.replace(/\D/g, ''));
      const matchPhone = p.telefone.toLowerCase().includes(term);
      const matchCity = p.cidade ? p.cidade.toLowerCase().includes(term) : false;
      return matchName || matchCpf || matchPhone || matchCity;
    });
  }, [consolidatedPersons, searchTerm]);

  // Paginação com cache sob demanda
  const pagination = usePaginatedList<FormerOwner>({
    items: filteredPersons,
    initialPageSize: 9,
    dependencies: [searchTerm, filteredPersons.length]
  });

  // Veículos vendidos e comprados da pessoa selecionada
  const personHistory = useMemo(() => {
    if (!selectedPersonForDetail) return { soldToStore: [], boughtFromStore: [], totalVolume: 0 };

    const personCleanCpf = selectedPersonForDetail.cpf.replace(/\D/g, '');

    // Veículos que a pessoa vendeu PARA a loja (onde ele era o antigo dono)
    const soldToStore = vehicles.filter(v => {
      if (v.antigoDonoId === selectedPersonForDetail.id) return true;
      const owner = owners.find(o => o.id === v.antigoDonoId);
      return owner && owner.cpf.replace(/\D/g, '') === personCleanCpf;
    });

    // Veículos que a pessoa comprou DA loja
    const boughtFromStore = sales.filter(s => {
      return s.clienteCpf.replace(/\D/g, '') === personCleanCpf;
    });

    const totalSoldValue = soldToStore.reduce((acc, v) => acc + (v.valorPago || 0), 0);
    const totalBoughtValue = boughtFromStore.reduce((acc, s) => acc + (s.valorVenda || 0), 0);

    return {
      soldToStore,
      boughtFromStore,
      totalVolume: totalSoldValue + totalBoughtValue
    };
  }, [selectedPersonForDetail, vehicles, sales, owners]);

  const handleOpenEdit = (person: FormerOwner) => {
    setFormNome(person.nome);
    setFormCpf(maskCPF(person.cpf));
    setFormRg(person.rg || '');
    setFormTelefone(maskPhone(person.telefone));
    setFormEndereco(person.endereco);
    setFormCidade(person.cidade || 'Areial');
    setFormEstado(person.estado || 'PB');
    setFormCep(maskCEP(person.cep || '58140-000'));
    setFormObservacoes(person.observacoes || '');
    setFormError('');
    setIsEditingPerson(true);
    setIsCreatingPerson(false);
  };

  const handleOpenCreate = () => {
    setFormNome('');
    setFormCpf('');
    setFormRg('');
    setFormTelefone('(83) 9');
    setFormEndereco('');
    setFormCidade('Areial');
    setFormEstado('PB');
    setFormCep('58140-000');
    setFormObservacoes('');
    setFormError('');
    setIsCreatingPerson(true);
    setIsEditingPerson(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      setFormError('Por favor, informe o nome completo da pessoa.');
      return;
    }
    if (!formCpf.trim() || !isValidCPF(formCpf)) {
      setFormError('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (formTelefone && !isValidPhone(formTelefone)) {
      setFormError('Informe um WhatsApp válido com DDD (10 ou 11 dígitos).');
      return;
    }
    if (formCep && !isValidCEP(formCep)) {
      setFormError('Informe um CEP válido com 8 dígitos.');
      return;
    }

    const ownerToSave: FormerOwner = {
      id: isEditingPerson && selectedPersonForDetail ? selectedPersonForDetail.id : 'owner_' + Date.now(),
      nome: formNome.trim(),
      cpf: maskCPF(formCpf),
      rg: formRg.trim(),
      telefone: maskPhone(formTelefone),
      endereco: formEndereco.trim(),
      cidade: formCidade.trim(),
      estado: formEstado.trim(),
      cep: maskCEP(formCep),
      observacoes: formObservacoes.trim(),
      dataCadastro: isEditingPerson && selectedPersonForDetail ? selectedPersonForDetail.dataCadastro : new Date().toISOString()
    };

    onSaveOwner(ownerToSave);
    setIsEditingPerson(false);
    setIsCreatingPerson(false);
    setSelectedPersonForDetail(ownerToSave);
  };

  const handleOpenWhatsApp = (telefone: string, nome: string) => {
    const clean = telefone.replace(/\D/g, '');
    const phoneWithDdd = clean.startsWith('55') ? clean : '55' + clean;
    const text = encodeURIComponent(`Olá ${nome}, tudo bem? Aqui é da VA Veículos em Areial-PB.`);
    window.open(`https://wa.me/${phoneWithDdd}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Pessoas & Clientes</h1>
          </div>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">
            Gestão de antigos proprietários e compradores: histórico financeiro individual, veículos transacionados e dados cadastrais.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto shadow-lg shadow-amber-500/20"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar Nova Pessoa
        </button>
      </div>

      {/* Busca */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nome, CPF, Telefone ou Cidade..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="text-xs text-neutral-400 whitespace-nowrap hidden sm:block">
          Total de <strong className="text-white tabular-nums">{filteredPersons.length}</strong> pessoas
        </div>
      </div>

      {/* Grid de Pessoas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pagination.totalItems === 0 ? (
          <div className="col-span-full text-center py-12 bg-neutral-900/40 rounded-2xl border border-neutral-800 text-neutral-500 text-xs">
            Nenhuma pessoa encontrada com o termo pesquisado.
          </div>
        ) : (
          pagination.paginatedItems.map((person) => {
            const cleanCpf = person.cpf.replace(/\D/g, '');
            const soldCount = vehicles.filter(v => v.antigoDonoId === person.id || owners.find(o => o.id === v.antigoDonoId)?.cpf.replace(/\D/g, '') === cleanCpf).length;
            const boughtCount = sales.filter(s => s.clienteCpf.replace(/\D/g, '') === cleanCpf).length;

            return (
              <div
                key={person.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                        {person.nome}
                      </h3>
                      <p className="text-neutral-400 text-xs font-mono mt-0.5">
                        CPF: {person.cpf}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
                      {person.cidade || 'Areial'} - {person.estado || 'PB'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-400 mb-4">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-amber-500" />
                      <span>{person.telefone || 'Sem telefone'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="truncate">{person.endereco || 'Endereço não informado'}</span>
                    </div>
                  </div>

                  {/* Badges de Atividade Comercial com a Loja */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/80 mb-4">
                    <div>
                      <span className="text-[10px] text-neutral-500 block">Vendeu p/ a Loja</span>
                      <strong className="text-amber-400 font-bold tabular-nums">
                        {soldCount} veículo(s)
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-500 block">Comprou da Loja</span>
                      <strong className="text-emerald-400 font-bold tabular-nums">
                        {boughtCount} veículo(s)
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-800/80">
                  <button
                    onClick={() => handleOpenWhatsApp(person.telefone, person.nome)}
                    className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Conversar no WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPersonForDetail(person);
                      setIsEditingPerson(false);
                      setIsCreatingPerson(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ver Dossiê
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Paginação com Cache */}
      {pagination.totalItems > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.goToPage}
          onPageSizeChange={pagination.changePageSize}
          pageSizeOptions={[6, 9, 18, 36]}
          isCached={pagination.isCurrentPageCached}
          isLoading={pagination.isLoading}
          itemLabel="pessoas e clientes"
        />
      )}

      {/* MODAL DE DOSSIÊ DA PESSOA */}
      {selectedPersonForDetail && !isEditingPerson && !isCreatingPerson && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative text-white my-8 max-h-[92vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedPersonForDetail.nome}
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    CPF: {selectedPersonForDetail.cpf} · {selectedPersonForDetail.cidade || 'Areial'} - {selectedPersonForDetail.estado || 'PB'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(selectedPersonForDetail)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar Dados
                </button>
                <button
                  onClick={() => setSelectedPersonForDetail(null)}
                  className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {/* Resumo Cadastral */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">WhatsApp</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <strong className="text-white text-sm">{selectedPersonForDetail.telefone}</strong>
                    <button
                      onClick={() => handleOpenWhatsApp(selectedPersonForDetail.telefone, selectedPersonForDetail.nome)}
                      className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Endereço Completo</span>
                  <strong className="text-white text-xs block mt-0.5">
                    {selectedPersonForDetail.endereco}, {selectedPersonForDetail.cidade} - {selectedPersonForDetail.estado}
                  </strong>
                  {selectedPersonForDetail.cep && (
                    <span className="text-[10px] text-neutral-400 font-mono">CEP: {selectedPersonForDetail.cep}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-neutral-500 block uppercase">Volume Transacionado com a Loja</span>
                  <strong className="text-amber-400 text-base font-extrabold tabular-nums block mt-0.5">
                    {formatCurrency(personHistory.totalVolume)}
                  </strong>
                </div>
              </div>

              {/* SEÇÃO 1: VEÍCULOS VENDIDOS PARA A LOJA */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Car className="w-4 h-4 text-amber-500" />
                    Veículos Vendidos para a VA Veículos ({personHistory.soldToStore.length})
                  </h4>
                  <span className="text-neutral-400 text-xs">
                    Entradas da Loja
                  </span>
                </div>

                {personHistory.soldToStore.length === 0 ? (
                  <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 text-neutral-500 italic">
                    Esta pessoa não possui registro de veículos vendidos para a loja.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {personHistory.soldToStore.map((veh) => (
                      <div key={veh.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-9 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 flex-shrink-0">
                            <img src={veh.fotos[0] || ''} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {veh.marca} {veh.modelo} {veh.anoModelo}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              Placa: <strong className="text-neutral-200">{veh.placa}</strong> · Cor: {veh.cor} · Entrada: {formatDate(veh.dataEntrada)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-500 block uppercase">Valor Pago pela Loja</span>
                            <strong className="text-amber-400 font-bold tabular-nums text-sm">
                              {formatCurrency(veh.valorPago)}
                            </strong>
                          </div>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                            veh.status === 'vendido' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-300'
                          }`}>
                            {veh.status === 'vendido' ? 'Já Revendido' : 'Em Estoque'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: VEÍCULOS COMPRADOS DA LOJA */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-500" />
                    Veículos Comprados da VA Veículos ({personHistory.boughtFromStore.length})
                  </h4>
                  <span className="text-neutral-400 text-xs">
                    Vendas Concluídas
                  </span>
                </div>

                {personHistory.boughtFromStore.length === 0 ? (
                  <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 text-neutral-500 italic">
                    Esta pessoa ainda não comprou nenhum veículo na loja.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {personHistory.boughtFromStore.map((sale) => {
                      const veh = vehicles.find(v => v.id === sale.veiculoId);
                      return (
                        <div key={sale.id} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-white text-sm">
                              {veh ? `${veh.marca} ${veh.modelo} (${veh.anoModelo})` : 'Veículo ' + sale.veiculoId}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              Data da Compra: {formatDate(sale.dataVenda)} · Vendedor: {sale.vendedorNome} · Pagamento: {sale.formaPagamento}
                            </div>
                          </div>

                          <div className="text-right self-end sm:self-auto">
                            <span className="text-[10px] text-neutral-500 block uppercase">Valor da Venda</span>
                            <strong className="text-emerald-400 font-bold tabular-nums text-sm">
                              {formatCurrency(sale.valorVenda)}
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
              <button
                onClick={() => setSelectedPersonForDetail(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs cursor-pointer transition-colors"
              >
                Fechar Dossiê
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO DE PESSOA */}
      {(isCreatingPerson || isEditingPerson) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative text-white my-8">
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                {isCreatingPerson ? 'Cadastrar Novo Cliente' : 'Editar Dados de Pessoa'}
              </h3>
              <button
                onClick={() => {
                  setIsCreatingPerson(false);
                  setIsEditingPerson(false);
                }}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: José Pereira da Silva"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">CPF (11 dígitos) *</label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={formCpf}
                    onChange={(e) => setFormCpf(maskCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">RG</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={formRg}
                    onChange={(e) => setFormRg(e.target.value)}
                    placeholder="Ex: 3.456.789 SSP-PB"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">WhatsApp *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(maskPhone(e.target.value))}
                    placeholder="(83) 98765-4321"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">CEP</label>
                  <input
                    type="text"
                    maxLength={9}
                    value={formCep}
                    onChange={(e) => setFormCep(maskCEP(e.target.value))}
                    placeholder="58140-000"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Endereço Residencial</label>
                <input
                  type="text"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formCidade}
                    onChange={(e) => setFormCidade(e.target.value)}
                    placeholder="Areial"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formEstado}
                    onChange={(e) => setFormEstado(e.target.value.toUpperCase())}
                    placeholder="PB"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Notas sobre preferências, perfil comercial, etc."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingPerson(false);
                    setIsEditingPerson(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold cursor-pointer transition-colors"
                >
                  Salvar Cadastro
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
