import React, { useState, useMemo } from 'react';
import { 
  Car, Search, SlidersHorizontal, 
  Gauge, Calendar, Sparkles, ArrowUpRight, CheckCircle2, 
  MapPin, Phone, MessageCircle, Award
} from 'lucide-react';
import { Vehicle, StoreProfile, VehicleType } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { VehicleDetailModal } from './VehicleDetailModal';

interface ShowroomViewProps {
  vehicles: Vehicle[];
  store: StoreProfile;
  onEnterManagement: () => void;
}

export const ShowroomView: React.FC<ShowroomViewProps> = ({
  vehicles,
  store,
  onEnterManagement
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'todos' | VehicleType>('todos');
  const [sortBy, setSortBy] = useState<'preco_menor' | 'preco_maior' | 'ano_novo' | 'km_menor'>('ano_novo');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Filter only in-stock vehicles for the public showroom
  const inStockVehicles = useMemo(() => {
    return vehicles.filter(v => v.status === 'em_estoque');
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return inStockVehicles
      .filter(v => {
        // Search
        const query = searchTerm.toLowerCase();
        const matchesSearch = 
          v.marca.toLowerCase().includes(query) ||
          v.modelo.toLowerCase().includes(query) ||
          v.versao.toLowerCase().includes(query) ||
          v.cor.toLowerCase().includes(query);

        // Type
        const matchesType = selectedType === 'todos' || v.tipo === selectedType;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'preco_menor') return a.valorAnunciado - b.valorAnunciado;
        if (sortBy === 'preco_maior') return b.valorAnunciado - a.valorAnunciado;
        if (sortBy === 'ano_novo') return b.anoModelo - a.anoModelo;
        if (sortBy === 'km_menor') return a.quilometragem - b.quilometragem;
        return 0;
      });
  }, [inStockVehicles, searchTerm, selectedType, sortBy]);

  const handleGeneralWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! Gostaria de consultar o estoque da VA Veículos em Areial-PB.`
    );
    const phoneClean = (store.whatsapp || store.telefone || '83987654321').replace(/\D/g, '');
    window.open(`https://wa.me/55${phoneClean}?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-[#2D2D32] bg-[#0D0D0F]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-[#D4130D]/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#17171A] border border-[#2D2D32] text-[#CAC9CA] text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#D4130D]" />
            VA Veículos • {store.cidade} - {store.estado} • Estoque Selecionado
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display text-white max-w-4xl mx-auto leading-tight">
            Transparência absoluta na escolha do seu <span className="text-[#D4130D]">próximo veículo</span>.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-[#A7A7AB] max-w-2xl mx-auto font-light leading-relaxed">
            Consulte nosso estoque de procedência comprovada em {store.cidade} - {store.estado}. Veículos revisados e com condições especiais de negociação.
          </p>

          {/* Quick value props */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-[#CAC9CA]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
              <span>Laudo Cautelar e Histórico Aprovado</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4130D]" />
              <span>Procedência e Documentação 100% em Dia</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Loja em Areial - PB (DDD 83)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="sticky top-16 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por marca, modelo, versão ou cor..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
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

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
                <button
                  onClick={() => setSelectedType('todos')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedType === 'todos' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setSelectedType('carro')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedType === 'carro' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Carros
                </button>
                <button
                  onClick={() => setSelectedType('moto')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    selectedType === 'moto' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Motos
                </button>
              </div>

              {/* Sort Order */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ano_novo">Mais Recentes</option>
                <option value="preco_menor">Menor Preço</option>
                <option value="preco_maior">Maior Preço</option>
                <option value="km_menor">Menor KM</option>
              </select>

              {/* WhatsApp direto */}
              <button
                onClick={handleGeneralWhatsApp}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp (DDD 83)
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Vehicles Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        
        {/* Results counter (sem legendas de repasse ou garantia) */}
        <div className="flex items-center justify-between gap-2 mb-6 pb-3 border-b border-neutral-800 text-xs">
          <div className="text-neutral-400">
            Exibindo <span className="font-bold text-white tabular-nums">{filteredVehicles.length}</span> veículos disponíveis em estoque na VA Veículos
          </div>
          <div className="text-neutral-500 text-[11px]">
            {store.cidade} - {store.estado}
          </div>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900/40 rounded-2xl border border-neutral-800">
            <Car className="w-12 h-12 text-neutral-600 mx-auto mb-3 stroke-1" />
            <h3 className="text-lg font-semibold text-white">Nenhum veículo encontrado</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
              Tente ajustar os filtros de busca ou limpe o termo digitado para visualizar todas as opções disponíveis.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('todos');
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Resetar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => setSelectedVehicle(vehicle)}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition-all duration-300 hover:shadow-2xl hover:shadow-black/60 flex flex-col group cursor-pointer"
              >
                {/* Photo container - SEM EMBLEMA DE GARANTIA E REPASSE */}
                <div className="relative aspect-[16/10] bg-neutral-950 overflow-hidden">
                  <img
                    src={vehicle.fotos[0] || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80'}
                    alt={`${vehicle.marca} ${vehicle.modelo}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />

                  {/* Foto Counter */}
                  {vehicle.fotos.length > 1 && (
                    <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] text-neutral-300 font-medium">
                      {vehicle.fotos.length} fotos
                    </div>
                  )}

                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[11px] text-neutral-300 font-mono">
                    Placa final {vehicle.placa.slice(-2)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-amber-400 font-bold mb-1">
                      {vehicle.marca}
                    </div>
                    <h3 className="text-lg font-bold text-white font-display group-hover:text-amber-400 transition-colors">
                      {vehicle.modelo}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                      {vehicle.versao}
                    </p>

                    {/* Quick Specs Icons */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-neutral-800/80 text-xs text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{vehicle.anoModelo}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="tabular-nums">{formatNumber(vehicle.quilometragem)} km</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-neutral-400 truncate">{vehicle.cambio}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="mt-5 pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 block uppercase font-medium">À Vista</span>
                      <span className="text-xl font-extrabold text-amber-400 font-display tabular-nums">
                        {formatCurrency(vehicle.valorAnunciado)}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVehicle(vehicle);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      Ver Detalhes
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Vehicle Detail Modal */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          store={store}
        />
      )}

      {/* Footer */}
      <footer className="bg-neutral-950 border-t border-neutral-800 mt-20 py-12 text-neutral-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-extrabold text-white text-base tracking-wider font-display">
                  VA VEÍCULOS
                </span>
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                  Areial - PB
                </span>
              </div>
              <p className="text-neutral-400 text-xs max-w-md leading-relaxed mb-3">
                Excelência no comércio de veículos seminovos. Transparência, procedência garantida e atendimento personalizado para Areial e todo o estado da Paraíba.
              </p>
              <div className="text-[11px] text-neutral-500 space-y-1">
                <p>{store.razaoSocial} • CNPJ: {store.cnpj}</p>
                <p>{store.endereco}, {store.cidade} - {store.estado}</p>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Atendimento</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>{store.telefone || '(83) 3381-1234'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp: {store.whatsapp || '(83) 98765-4321'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{store.cidade} - {store.estado}</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Acesso Restrito</h4>
              <p className="text-neutral-400 mb-3 text-xs">
                Painel interno para gestores e vendedores da VA Veículos.
              </p>
              <button
                onClick={onEnterManagement}
                className="px-4 py-2 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#D4130D] text-white font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                Painel de Gestão VA Veículos
                <ArrowUpRight className="w-3.5 h-3.5 text-[#D4130D]" />
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-[#2D2D32] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#A7A7AB]">
            <p>© {new Date().getFullYear()} {store.nomeFantasia}. Todos os direitos reservados.</p>
            <p>VA Veículos • Sistema Integrado de Gestão Automotiva · Areial - PB</p>
          </div>
        </div>
      </footer>

    </div>
  );
};
