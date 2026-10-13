import React, { useState } from 'react';
import { 
  X, UserPlus, Car, DollarSign, ShieldAlert, FileCheck, 
  Plus, Check, AlertCircle, Info, ChevronRight, Image as ImageIcon,
  Upload, Trash2
} from 'lucide-react';
import { 
  Vehicle, FormerOwner, VehicleType, CommercialCategory, 
  DetranDebt, ContractTemplate, StoreProfile 
} from '../../types';
import { 
  formatCurrency, maskCurrency, unmaskCurrency, 
  maskCPF, maskPhone, maskCEP, maskPlate, maskRenavam, isValidCPF 
} from '../../utils/formatters';
import { compressMultipleImages } from '../../utils/imageCompressor';

interface VehicleEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  owners: FormerOwner[];
  onSaveOwner: (owner: FormerOwner) => FormerOwner;
  onSaveVehicle: (vehicle: Vehicle) => void;
  templates: ContractTemplate[];
  store: StoreProfile;
  onOpenReceipt: (vehicle: Vehicle, owner: FormerOwner) => void;
}

export const VehicleEntryModal: React.FC<VehicleEntryModalProps> = ({
  isOpen,
  onClose,
  owners,
  onSaveOwner,
  onSaveVehicle,
  templates,
  store,
  onOpenReceipt
}) => {
  // Step 1: Owner selection/creation
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(owners[0]?.id || '');
  const [isCreatingNewOwner, setIsCreatingNewOwner] = useState(false);
  const [newOwner, setNewOwner] = useState({
    nome: '',
    cpf: '',
    rg: '',
    telefone: '(83) 9',
    endereco: '',
    cidade: 'Areial',
    estado: 'PB',
    cep: '58140-000',
    observacoes: ''
  });

  // Step 2: Vehicle Specs
  const [tipo, setTipo] = useState<VehicleType>('carro');
  const [marca, setMarca] = useState('Toyota');
  const [modelo, setModelo] = useState('');
  const [versao, setVersao] = useState('');
  const [anoFabricacao, setAnoFabricacao] = useState(new Date().getFullYear());
  const [anoModelo, setAnoModelo] = useState(new Date().getFullYear());
  const [cor, setCor] = useState('Preto');
  const [combustivel, setCombustivel] = useState<'Flex' | 'Gasolina' | 'Etanol' | 'Diesel' | 'Híbrido' | 'Elétrico'>('Flex');
  const [cambio, setCambio] = useState<'Automático' | 'Manual' | 'CVT' | 'Automatizado'>('Automático');
  const [quilometragem, setQuilometragem] = useState<number>(35000);
  const [placa, setPlaca] = useState('');
  const [chassi, setChassi] = useState('');
  const [renavam, setRenavam] = useState('');
  const [cadastradoPor, setCadastradoPor] = useState('Gestor Geral');
  
  // Fotos (upload até 10 fotos)
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotosList, setFotosList] = useState<string[]>([
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80'
  ]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);

  // Step 3: Financials & DETRAN (com máscaras R$)
  const [valorPagoStr, setValorPagoStr] = useState('R$ 85.000,00');
  const [categoriaComercial, setCategoriaComercial] = useState<CommercialCategory>('venda');
  const [temDebito, setTemDebito] = useState(false);
  const [valorDebitoStr, setValorDebitoStr] = useState('R$ 1.200,00');
  const [quemArcaDebito, setQuemArcaDebito] = useState<'loja' | 'antigo_dono'>('loja');
  const [descricaoDebito, setDescricaoDebito] = useState('IPVA e licenciamento em aberto');
  const [valorAnunciadoStr, setValorAnunciadoStr] = useState('R$ 98.900,00');
  const [modeloReciboId, setModeloReciboId] = useState<string>(
    templates.find(t => t.tipo === 'recibo_compra')?.id || 'recibo_compra_veiculo'
  );

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingPhotos(true);
      const compressed = await compressMultipleImages(files, 10, fotosList.length);
      setFotosList(prev => [...prev, ...compressed].slice(0, 10));
    } catch (err) {
      console.error('Erro ao comprimir fotos:', err);
    } finally {
      setIsUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleAddPhotoUrl = () => {
    if (fotoUrl.trim() && fotosList.length < 10) {
      setFotosList([...fotosList, fotoUrl.trim()]);
      setFotoUrl('');
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setFotosList(fotosList.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let ownerToUse: FormerOwner | undefined;

    if (isCreatingNewOwner) {
      if (!newOwner.nome.trim() || !newOwner.cpf.trim() || !newOwner.endereco.trim()) {
        alert('Por favor preencha Nome Completo, CPF e Endereço do antigo dono.');
        return;
      }
      if (!isValidCPF(newOwner.cpf)) {
        alert('O CPF do antigo dono é inválido.');
        return;
      }
      const createdOwner: FormerOwner = {
        id: 'owner_' + Date.now(),
        nome: newOwner.nome.trim(),
        cpf: maskCPF(newOwner.cpf),
        rg: newOwner.rg.trim(),
        telefone: maskPhone(newOwner.telefone),
        endereco: newOwner.endereco.trim(),
        cidade: newOwner.cidade || 'Areial',
        estado: newOwner.estado || 'PB',
        cep: maskCEP(newOwner.cep || '58140-000'),
        observacoes: newOwner.observacoes,
        criadoEm: new Date().toISOString()
      };
      ownerToUse = onSaveOwner(createdOwner);
    } else {
      ownerToUse = owners.find(o => o.id === selectedOwnerId);
    }

    if (!ownerToUse) {
      alert('Selecione ou cadastre o antigo dono do veículo.');
      return;
    }

    if (!modelo || !placa) {
      alert('Preencha os dados essenciais do veículo (Modelo e Placa).');
      return;
    }

    const valorPagoNum = unmaskCurrency(valorPagoStr);
    const valorAnunciadoNum = unmaskCurrency(valorAnunciadoStr);
    const valorDebitoNum = unmaskCurrency(valorDebitoStr);

    const debitoData: DetranDebt = {
      temDebito,
      valor: temDebito ? valorDebitoNum : 0,
      quemArca: temDebito ? quemArcaDebito : 'nenhum',
      descricao: temDebito ? descricaoDebito : ''
    };

    const newVehicle: Vehicle = {
      id: 'veh_' + Date.now(),
      tipo,
      marca,
      modelo,
      versao: versao || 'Completo',
      anoFabricacao: Number(anoFabricacao),
      anoModelo: Number(anoModelo),
      cor,
      combustivel,
      cambio,
      quilometragem: Number(quilometragem),
      placa: maskPlate(placa),
      chassi: chassi.toUpperCase() || `9BR${Date.now()}X`,
      renavam: maskRenavam(renavam) || `00${Math.floor(100000000 + Math.random() * 900000000)}`,
      categoriaComercial,
      status: 'em_estoque',
      fotos: fotosList.length > 0 ? fotosList : ['https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80'],
      antigoDonoId: ownerToUse.id,
      dataEntrada: new Date().toISOString(),
      cadastradoPor,
      valorPago: valorPagoNum,
      debitoDetran: debitoData,
      reciboCompraGerado: true,
      modeloReciboCompraId: modeloReciboId,
      valorAnunciado: valorAnunciadoNum,
      descricaoDestaques: [
        categoriaComercial === 'venda' ? 'Veículo revisado com garantia de 90 dias' : 'Repasse comercial no estado',
        'Veículo vistoriado e periciado em Areial-PB',
        `${cambio} • ${combustivel}`
      ],
      custosPatio: []
    };

    onSaveVehicle(newVehicle);
    onClose();

    // Trigger purchase receipt immediately so store can print for the seller
    onOpenReceipt(newVehicle, ownerToUse);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[16px] w-full max-w-4xl overflow-hidden shadow-2xl relative text-[#F5F5F5] my-8 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2D2D32] flex items-center justify-between bg-[#080809]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#D4130D] flex items-center justify-center text-white font-bold shadow-sm">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F5F5] font-display">
                Entrada & Cadastro de Novo Veículo
              </h3>
              <p className="text-xs text-[#A7A7AB]">
                Atribuição de antigo dono, fotos com compressão, débitos DETRAN e emissão de recibo de compra.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#202024] hover:bg-[#2D2D32] flex items-center justify-center text-[#A7A7AB] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* SECTION 1: ANTIGO DONO */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                1. Antigo Proprietário / Origem do Veículo
              </h4>

              <button
                type="button"
                onClick={() => setIsCreatingNewOwner(!isCreatingNewOwner)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
              >
                {isCreatingNewOwner ? '← Selecionar da Lista Existente' : '+ Cadastrar Novo Proprietário'}
              </button>
            </div>

            {!isCreatingNewOwner ? (
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Selecione o Antigo Dono:</label>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.nome} — CPF: {owner.cpf} ({owner.cidade || 'Areial'}/{owner.estado || 'PB'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-800">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={newOwner.nome}
                    onChange={(e) => setNewOwner({ ...newOwner, nome: e.target.value })}
                    placeholder="Nome do antigo proprietário"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">CPF (11 dígitos) *</label>
                  <input
                    type="text"
                    required
                    value={newOwner.cpf}
                    onChange={(e) => setNewOwner({ ...newOwner, cpf: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">RG</label>
                  <input
                    type="text"
                    value={newOwner.rg}
                    onChange={(e) => setNewOwner({ ...newOwner, rg: e.target.value })}
                    placeholder="Ex: 2.345.678 SSP/PB"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Telefone / WhatsApp (DDD 83) *</label>
                  <input
                    type="text"
                    required
                    value={newOwner.telefone}
                    onChange={(e) => setNewOwner({ ...newOwner, telefone: maskPhone(e.target.value) })}
                    placeholder="(83) 98765-4321"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">CEP</label>
                  <input
                    type="text"
                    value={newOwner.cep}
                    onChange={(e) => setNewOwner({ ...newOwner, cep: maskCEP(e.target.value) })}
                    placeholder="58140-000"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Cidade / Estado</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newOwner.cidade}
                      onChange={(e) => setNewOwner({ ...newOwner, cidade: e.target.value })}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={newOwner.estado}
                      onChange={(e) => setNewOwner({ ...newOwner, estado: e.target.value.toUpperCase() })}
                      className="w-12 bg-neutral-900 border border-neutral-700 rounded-lg px-1 py-2 text-xs text-white text-center focus:border-amber-500 focus:outline-none font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs text-neutral-400 block mb-1">Endereço Residencial *</label>
                  <input
                    type="text"
                    required
                    value={newOwner.endereco}
                    onChange={(e) => setNewOwner({ ...newOwner, endereco: e.target.value })}
                    placeholder="Rua, número, bairro"
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: DADOS DO VEÍCULO & ATÉ 10 FOTOS */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4" />
                2. Especificações do Veículo & Galeria (Até 10 Fotos)
              </h4>
              <span className="text-[11px] text-neutral-400">
                Cadastrado por: <strong className="text-white">{cadastradoPor}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="carro">Carro</option>
                  <option value="moto">Moto</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Marca *</label>
                <input
                  type="text"
                  required
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Modelo *</label>
                <input
                  type="text"
                  required
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ex: Corolla, Civic, Compass"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Versão / Motor</label>
                <input
                  type="text"
                  value={versao}
                  onChange={(e) => setVersao(e.target.value)}
                  placeholder="Ex: 2.0 XEi Flex"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Ano Fab. / Mod.</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={anoFabricacao}
                    onChange={(e) => setAnoFabricacao(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white focus:border-amber-500 focus:outline-none text-center"
                  />
                  <span className="self-center text-neutral-500">/</span>
                  <input
                    type="number"
                    value={anoModelo}
                    onChange={(e) => setAnoModelo(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-2 text-xs text-white focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Cor</label>
                <input
                  type="text"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Câmbio</label>
                <select
                  value={cambio}
                  onChange={(e) => setCambio(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="Automático">Automático</option>
                  <option value="Manual">Manual</option>
                  <option value="CVT">CVT</option>
                  <option value="Automatizado">Automatizado</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">KM Atual</label>
                <input
                  type="number"
                  value={quilometragem}
                  onChange={(e) => setQuilometragem(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Placa (Mercosul/Antiga) *</label>
                <input
                  type="text"
                  required
                  value={placa}
                  onChange={(e) => setPlaca(maskPlate(e.target.value))}
                  placeholder="ABC-1234 ou ABC1D23"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white uppercase focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Chassi</label>
                <input
                  type="text"
                  value={chassi}
                  onChange={(e) => setChassi(e.target.value)}
                  placeholder="17 dígitos"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white uppercase focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-neutral-400 block mb-1">RENAVAM (11 dígitos)</label>
                <input
                  type="text"
                  value={renavam}
                  onChange={(e) => setRenavam(maskRenavam(e.target.value))}
                  placeholder="11 dígitos numéricos"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* SEÇÃO DE FOTOS COM UPLOAD DE ATÉ 10 FOTOS */}
            <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-white uppercase tracking-wider block">
                    Fotos do Veículo (Upload de até 10 fotos com compressão)
                  </label>
                  <p className="text-[11px] text-neutral-400">
                    Otimizado e comprimido automaticamente para armazenamento direto no Firestore da VA Veículos.
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 tabular-nums">
                  {fotosList.length}/10 fotos
                </span>
              </div>

              {/* Botão de Upload Múltiplo */}
              <div className="flex flex-wrap items-center gap-3">
                <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  fotosList.length >= 10 
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' 
                    : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                }`}>
                  <Upload className="w-4 h-4 text-amber-500" />
                  {isUploadingPhotos ? 'Comprimindo fotos...' : 'Selecionar Fotos do Computador/Celular'}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    disabled={fotosList.length >= 10 || isUploadingPhotos}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Ou Link Direto URL */}
                <div className="flex-1 flex gap-2 min-w-[240px]">
                  <input
                    type="url"
                    value={fotoUrl}
                    onChange={(e) => setFotoUrl(e.target.value)}
                    placeholder="Ou cole uma URL de imagem..."
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhotoUrl}
                    disabled={fotosList.length >= 10 || !fotoUrl.trim()}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Galeria de Miniaturas (até 10 fotos) */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-2">
                {fotosList.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-700 group bg-neutral-900">
                    <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-white bg-black/70 px-1 rounded">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remover foto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: CONDIÇÕES DE COMPRA, DÉBITO DETRAN E MÁSCARAS R$ */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-4">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              3. Financeiro da Compra, Categoria e Débitos DETRAN
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Valor Pago ao Antigo Dono (R$) *</label>
                <input
                  type="text"
                  required
                  value={valorPagoStr}
                  onChange={(e) => setValorPagoStr(maskCurrency(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-amber-400 focus:border-amber-500 focus:outline-none tabular-nums"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Classificação Comercial</label>
                <select
                  value={categoriaComercial}
                  onChange={(e) => setCategoriaComercial(e.target.value as CommercialCategory)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="venda">Venda com Garantia Legal (Revisado)</option>
                  <option value="repasse">Repasse (Sem Garantia / No Estado)</option>
                </select>
                <span className="text-[10px] text-neutral-500 block mt-1">
                  {categoriaComercial === 'repasse' ? 'Sem garantia mecânica no atacado' : 'Garantia legal de 90 dias motor e câmbio'}
                </span>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">Preço Anunciado no Showroom (R$)</label>
                <input
                  type="text"
                  value={valorAnunciadoStr}
                  onChange={(e) => setValorAnunciadoStr(maskCurrency(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-bold text-emerald-400 focus:border-amber-500 focus:outline-none tabular-nums"
                />
              </div>
            </div>

            {/* DETRAN DEBTS CARD */}
            <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/60">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={temDebito}
                    onChange={(e) => setTemDebito(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <span>O veículo possui débito no DETRAN (Multas, IPVA, Licenciamento)?</span>
                </label>

                {temDebito && (
                  <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Débito Ativo
                  </span>
                )}
              </div>

              {temDebito && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-neutral-800">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Valor Devido (R$) *</label>
                    <input
                      type="text"
                      required={temDebito}
                      value={valorDebitoStr}
                      onChange={(e) => setValorDebitoStr(maskCurrency(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-red-400 font-bold focus:border-amber-500 focus:outline-none tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Quem irá arcar com o débito? *</label>
                    <select
                      value={quemArcaDebito}
                      onChange={(e) => setQuemArcaDebito(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="loja">A Loja Assume (Soma no Custo do Carro)</option>
                      <option value="antigo_dono">O Antigo Dono Arca (Descontado/Quitado)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Descrição do Débito</label>
                    <input
                      type="text"
                      value={descricaoDebito}
                      onChange={(e) => setDescricaoDebito(e.target.value)}
                      placeholder="Ex: 2 multas de velocidade + IPVA 2026"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recibo de Compra Modelo */}
            <div>
              <label className="text-xs text-neutral-400 block mb-1">Modelo de Recibo de Compra Timbrado:</label>
              <select
                value={modeloReciboId}
                onChange={(e) => setModeloReciboId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {templates.filter(t => t.tipo === 'recibo_compra').map(t => (
                  <option key={t.id} value={t.id}>
                    {t.titulo}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] border border-[#2D2D32] text-xs font-semibold text-[#CAC9CA] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Finalizar Entrada & Emitir Recibo de Compra
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
