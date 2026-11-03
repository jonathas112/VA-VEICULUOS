import React, { useState, useMemo } from 'react';
import { 
  Car, Search, ChevronDown, SlidersHorizontal, 
  MapPin, Phone, MessageCircle, X, RotateCcw, Check
} from 'lucide-react';
import { Vehicle, StoreProfile, VehicleType } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { VehicleDetailModal } from './VehicleDetailModal';
import { BrandLogo } from '../common/BrandLogo';
import { PaginationControls } from '../common/PaginationControls';
import { usePaginatedList } from '../../hooks/usePaginatedList';

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
  // Filtro de Texto
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros em Accordion / Sanfona (estilo marketplace)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('todos');
  const [minYear, setMinYear] = useState<number | null>(null);
  const [maxKm, setMaxKm] = useState<number | null>(null);
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedCambios, setSelectedCambios] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<'todos' | VehicleType>('todos');
  
  // Ordenação
  const [sortBy, setSortBy] = useState<'ano_novo' | 'preco_menor' | 'preco_maior' | 'km_menor'>('ano_novo');
  
  // Modal de Detalhes
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Sanitização do nome da loja garantindo remoção de resíduos como "TESTE"
  const cleanStoreName = useMemo(() => {
    return (store?.nomeFantasia || 'VA Veículos Multimarcas')
      .replace(/\s*\bteste\b\s*/gi, ' ')
      .trim();
  }, [store?.nomeFantasia]);

  // Controle de Seções de Sanfona Abertas no Painel Lateral
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    marca: true,
    preco: true,
    ano: true,
    km: false,
    combustivel: false,
    cambio: false,
    tipo: false
  });

  // Gaveta de Filtros no Mobile
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Filtrar apenas veículos com status "em_estoque" para a vitrine
  const inStockVehicles = useMemo(() => {
    return vehicles.filter(v => v.status === 'em_estoque');
  }, [vehicles]);

  // Estatísticas Dinâmicas para os Filtros
  const brandStats = useMemo(() => {
    const map = new Map<string, number>();
    inStockVehicles.forEach(v => {
      map.set(v.marca, (map.get(v.marca) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([marca, count]) => ({ marca, count }))
      .sort((a, b) => b.count - a.count || a.marca.localeCompare(b.marca));
  }, [inStockVehicles]);

  const fuelStats = useMemo(() => {
    const set = new Set<string>();
    inStockVehicles.forEach(v => { if (v.combustivel) set.add(v.combustivel); });
    return Array.from(set).sort();
  }, [inStockVehicles]);

  const cambioStats = useMemo(() => {
    const set = new Set<string>();
    inStockVehicles.forEach(v => { if (v.cambio) set.add(v.cambio); });
    return Array.from(set).sort();
  }, [inStockVehicles]);

  // Contagem de Filtros Ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedBrands.length > 0) count += selectedBrands.length;
    if (selectedPriceRange !== 'todos') count++;
    if (minYear !== null) count++;
    if (maxKm !== null) count++;
    if (selectedFuels.length > 0) count += selectedFuels.length;
    if (selectedCambios.length > 0) count += selectedCambios.length;
    if (selectedType !== 'todos') count++;
    return count;
  }, [searchTerm, selectedBrands, selectedPriceRange, minYear, maxKm, selectedFuels, selectedCambios, selectedType]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBrands([]);
    setSelectedPriceRange('todos');
    setMinYear(null);
    setMaxKm(null);
    setSelectedFuels([]);
    setSelectedCambios([]);
    setSelectedType('todos');
    setSortBy('ano_novo');
  };

  // Toggle Marca
  const handleToggleBrand = (marca: string) => {
    setSelectedBrands(prev => 
      prev.includes(marca) ? prev.filter(b => b !== marca) : [...prev, marca]
    );
  };

  // Toggle Combustível
  const handleToggleFuel = (fuel: string) => {
    setSelectedFuels(prev => 
      prev.includes(fuel) ? prev.filter(f => f !== fuel) : [...prev, fuel]
    );
  };

  // Toggle Câmbio
  const handleToggleCambio = (cambio: string) => {
    setSelectedCambios(prev => 
      prev.includes(cambio) ? prev.filter(c => c !== cambio) : [...prev, cambio]
    );
  };

  // Filtragem multi-critério
  const filteredVehicles = useMemo(() => {
    return inStockVehicles
      .filter(v => {
        // Busca textual
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matches = 
            v.marca.toLowerCase().includes(q) ||
            v.modelo.toLowerCase().includes(q) ||
            v.versao.toLowerCase().includes(q) ||
            v.cor.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Tipo de Carroceria
        if (selectedType !== 'todos' && v.tipo !== selectedType) {
          return false;
        }

        // Marcas Selecionadas
        if (selectedBrands.length > 0 && !selectedBrands.includes(v.marca)) {
          return false;
        }

        // Faixa de Preço
        if (selectedPriceRange === 'ate_50' && v.valorAnunciado > 50000) return false;
        if (selectedPriceRange === '50_80' && (v.valorAnunciado < 50000 || v.valorAnunciado > 80000)) return false;
        if (selectedPriceRange === '80_120' && (v.valorAnunciado < 80000 || v.valorAnunciado > 120000)) return false;
        if (selectedPriceRange === 'acima_120' && v.valorAnunciado < 120000) return false;

        // Ano Mínimo
        if (minYear !== null && v.anoModelo < minYear) return false;

        // Quilometragem Máxima
        if (maxKm !== null && v.quilometragem > maxKm) return false;

        // Combustíveis
        if (selectedFuels.length > 0 && !selectedFuels.includes(v.combustivel)) return false;

        // Câmbios
        if (selectedCambios.length > 0 && !selectedCambios.includes(v.cambio)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'preco_menor') return a.valorAnunciado - b.valorAnunciado;
        if (sortBy === 'preco_maior') return b.valorAnunciado - a.valorAnunciado;
        if (sortBy === 'ano_novo') return b.anoModelo - a.anoModelo;
        if (sortBy === 'km_menor') return a.quilometragem - b.quilometragem;
        return 0;
      });
  }, [
    inStockVehicles, searchTerm, selectedType, selectedBrands, 
    selectedPriceRange, minYear, maxKm, selectedFuels, selectedCambios, sortBy
  ]);

  // Paginação sob demanda com cache
  const pagination = usePaginatedList<Vehicle>({
    items: filteredVehicles,
    initialPageSize: 9,
    dependencies: [
      searchTerm, selectedBrands, selectedPriceRange, minYear, 
      maxKm, selectedFuels, selectedCambios, selectedType, sortBy, filteredVehicles.length
    ]
  });

  const handleGeneralWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! Gostaria de consultar o estoque da VA Veículos em Areial-PB.`
    );
    const phoneClean = (store.whatsapp || store.telefone || '83987654321').replace(/\D/g, '');
    window.open(`https://wa.me/55${phoneClean}?text=${text}`, '_blank');
  };

  // Componente de Filtros Verticais (usado no desktop e no drawer mobile)
  const renderFilterContent = () => (
    <div className="space-y-4 text-xs select-none">
      
      {/* Top Header dos Filtros: "Aplicar" & "Limpar" */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2D2D32]">
        <span className="font-bold text-[#F5F5F5] uppercase tracking-wider text-xs">
          Filtros de Busca
        </span>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-[#A7A7AB] hover:text-[#D4130D] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Limpar
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            className="text-xs font-bold text-[#D4130D] hover:text-[#E3271F] uppercase tracking-wider cursor-pointer transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* 1. SEÇÃO: MARCA */}
      <div className="border-b border-[#2D2D32] pb-3">
        <button
          type="button"
          onClick={() => toggleSection('marca')}
          className="w-full flex items-center justify-between py-1 text-left text-[#F5F5F5] font-semibold hover:text-[#D4130D] transition-colors cursor-pointer"
        >
          <span>Marca {selectedBrands.length > 0 && `(${selectedBrands.length})`}</span>
          <ChevronDown className={`w-4 h-4 text-[#A7A7AB] transition-transform duration-200 ${openSections.marca ? 'rotate-180 text-[#D4130D]' : ''}`} />
        </button>

        {openSections.marca && (
          <div className="mt-2.5 space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {brandStats.length === 0 ? (
              <span className="text-[#68686E] text-[11px]">Nenhuma marca no estoque</span>
            ) : (
              brandStats.map(({ marca, count }) => {
                const isSelected = selectedBrands.includes(marca);
                return (
                  <label
                    key={marca}
                    className={`flex items-center justify-between p-1.5 rounded-[6px] hover:bg-[#202024] cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#202024] text-white font-medium' : 'text-[#CAC9CA]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-[#D4130D] border-[#D4130D] text-white' : 'border-[#3E3E44] bg-[#17171A]'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs">{marca}</span>
                    </div>
                    <span className="text-[11px] text-[#68686E] font-num">({count})</span>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isSelected}
                      onChange={() => handleToggleBrand(marca)}
                    />
                  </label>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 2. SEÇÃO: PREÇO */}
      <div className="border-b border-[#2D2D32] pb-3">
        <button
          type="button"
          onClick={() => toggleSection('preco')}
          className="w-full flex items-center justify-between py-1 text-left text-[#F5F5F5] font-semibold hover:text-[#D4130D] transition-colors cursor-pointer"
        >
          <span>Preço</span>
          <ChevronDown className={`w-4 h-4 text-[#A7A7AB] transition-transform duration-200 ${openSections.preco ? 'rotate-180 text-[#D4130D]' : ''}`} />
        </button>

        {openSections.preco && (
          <div className="mt-2.5 space-y-1">
            {[
              { id: 'todos', label: 'Todos os Valores' },
              { id: 'ate_50', label: 'Até R$ 50.000' },
              { id: '50_80', label: 'R$ 50.000 a R$ 80.000' },
              { id: '80_120', label: 'R$ 80.000 a R$ 120.000' },
              { id: 'acima_120', label: 'Acima de R$ 120.000' },
            ].map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedPriceRange(option.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  selectedPriceRange === option.id
                    ? 'bg-[#D4130D]/15 text-[#D4130D] font-bold border border-[#D4130D]/30'
                    : 'text-[#CAC9CA] hover:bg-[#202024]'
                }`}
              >
                <span>{option.label}</span>
                {selectedPriceRange === option.id && <span className="w-1.5 h-1.5 rounded-full bg-[#D4130D]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. SEÇÃO: ANO MODELO */}
      <div className="border-b border-[#2D2D32] pb-3">
        <button
          type="button"
          onClick={() => toggleSection('ano')}
          className="w-full flex items-center justify-between py-1 text-left text-[#F5F5F5] font-semibold hover:text-[#D4130D] transition-colors cursor-pointer"
        >
          <span>Ano</span>
          <ChevronDown className={`w-4 h-4 text-[#A7A7AB] transition-transform duration-200 ${openSections.ano ? 'rotate-180 text-[#D4130D]' : ''}`} />
        </button>

        {openSections.ano && (
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {[
              { label: 'Qualquer Ano', value: null },
              { label: '2024+', value: 2024 },
              { label: '2023+', value: 2023 },
              { label: '2022+', value: 2022 },
              { label: '2020+', value: 2020 },
              { label: '2018+', value: 2018 },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMinYear(item.value)}
                className={`px-2 py-1.5 rounded-[6px] text-center text-xs transition-colors cursor-pointer border ${
                  minYear === item.value
                    ? 'bg-[#D4130D] text-white font-bold border-[#D4130D]'
                    : 'bg-[#17171A] text-[#CAC9CA] border-[#2D2D32] hover:bg-[#202024]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. SEÇÃO: QUILOMETRAGEM */}
      <div className="border-b border-[#2D2D32] pb-3">
        <button
          type="button"
          onClick={() => toggleSection('km')}
          className="w-full flex items-center justify-between py-1 text-left text-[#F5F5F5] font-semibold hover:text-[#D4130D] transition-colors cursor-pointer"
        >
          <span>Quilometragem</span>
          <ChevronDown className={`w-4 h-4 text-[#A7A7AB] transition-transform duration-200 ${openSections.km ? 'rotate-180 text-[#D4130D]' : ''}`} />
        </button>

        {openSections.km && (
          <div className="mt-2.5 space-y-1">
            {[
              { label: 'Qualquer KM', value: null },
              { label: 'Até 25.000 km', value: 25000 },
              { label: 'Até 50.000 km', value: 50000 },
              { label: 'Até 80.000 km', value: 80000 },
              { label: 'Até 120.000 km', value: 120000 },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMaxKm(item.value)}
                className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  maxKm === item.value
                    ? 'bg-[#D4130D]/15 text-[#D4130D] font-bold border border-[#D4130D]/30'
                    : 'text-[#CAC9CA] hover:bg-[#202024]'
                }`}
              >
                <span>{item.label}</span>
                {maxKm === item.value && <span className="w-1.5 h-1.5 rounded-full bg-[#D4130D]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. SEÇÃO: COMBUSTÍVEL */}
      <div className="border-b border-[#2D2D32] pb-3">
        <button
          type="button"
          onClick={() => toggleSection('combustivel')}
          className="w-full flex items-center justify-between py-1 text-left text-[#F5F5F5] font-semibold hover:text-[#D4130D] transition-colors cursor-pointer"
        >
          <span>Combustível {selectedFuels.length > 0 && `(${selectedFuels.length})`}</span>
          <ChevronDown className={`w-4 h-4 text-[#A7A7AB] transition-transform duration-200 ${openSections.combustivel ? 'rotate-180 text-[#D4130D]' : ''}`} />
        </button>

        {openSections.combustivel && (
          <div className="mt-2.5 space-y-1.5">
            {fuelStats.map(fuel => {
              const isSelected = selectedFuels.includes(fuel);
              return (
                <label
                  key={fuel}
                  className={`flex items-center gap-2 p-1.5 rounded-[6px] hover:bg-[#202024] cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#202024] text-white font-medium' : 'text-[#CAC9CA]'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-[#D4130D] border-[#D4130D] text-white' : 'border-[#3E3E44] bg-[#17171A]'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="text-xs">{fuel}</span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isSelected}
                    onChange={() => handleToggleFuel(fuel)}
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. SEÇÃO: CÂMBIO */}
      <div className="border-b border-[#2D2D32] pb-3">
        <button
          type="button"
          onClick={() => toggleSection('cambio')}
          className="w-full flex items-center justify-between py-1 text-left text-[#F5F5F5] font-semibold hover:text-[#D4130D] transition-colors cursor-pointer"
        >
          <span>Câmbio {selectedCambios.length > 0 && `(${selectedCambios.length})`}</span>
          <ChevronDown className={`w-4 h-4 text-[#A7A7AB] transition-transform duration-200 ${openSections.cambio ? 'rotate-180 text-[#D4130D]' : ''}`} />
        </button>

        {openSections.cambio && (
          <div className="mt-2.5 space-y-1.5">
            {cambioStats.map(cambio => {
              const isSelected = selectedCambios.includes(cambio);
              return (
                <label
                  key={cambio}
                  className={`flex items-center gap-2 p-1.5 rounded-[6px] hover:bg-[#202024] cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#202024] text-white font-medium' : 'text-[#CAC9CA]'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-[#D4130D] border-[#D4130D] text-white' : 'border-[#3E3E44] bg-[#17171A]'
                  }`}>
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="text-xs">{cambio}</span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isSelected}
                    onChange={() => handleToggleCambio(cambio)}
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. SEÇÃO: TIPO DE VEÍCULO */}
      <div className="pb-1">
        <button
          type="button"
          onClick={() => toggleSection('tipo')}
          className="w-full flex items-center justify-between py-1 text-left text-[#F5F5F5] font-semibold hover:text-[#D4130D] transition-colors cursor-pointer"
        >
          <span>Carroceria</span>
          <ChevronDown className={`w-4 h-4 text-[#A7A7AB] transition-transform duration-200 ${openSections.tipo ? 'rotate-180 text-[#D4130D]' : ''}`} />
        </button>

        {openSections.tipo && (
          <div className="mt-2.5 space-y-1">
            {[
              { id: 'todos', label: 'Todos os tipos' },
              { id: 'carro', label: 'Carros (Passeio & SUV)' },
              { id: 'moto', label: 'Motos' },
              { id: 'utilitario', label: 'Utilitários & Picapes' },
            ].map(typeOpt => (
              <button
                key={typeOpt.id}
                type="button"
                onClick={() => setSelectedType(typeOpt.id as any)}
                className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs transition-colors cursor-pointer flex items-center justify-between ${
                  selectedType === typeOpt.id
                    ? 'bg-[#D4130D]/15 text-[#D4130D] font-bold border border-[#D4130D]/30'
                    : 'text-[#CAC9CA] hover:bg-[#202024]'
                }`}
              >
                <span>{typeOpt.label}</span>
                {selectedType === typeOpt.id && <span className="w-1.5 h-1.5 rounded-full bg-[#D4130D]" />}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );

  return (
    <div className="min-h-screen bg-[#080809] text-[#F5F5F5] flex flex-col font-sans">
      
      {/* 1. Barra Superior de Busca & Ações Rápidas */}
      <section className="sticky top-14 z-20 bg-[#080809]/95 backdrop-blur-md border-b border-[#2D2D32] py-3.5 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Campo de Busca Principal */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-[#68686E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={100}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por marca, modelo, versão ou cor..."
              className="w-full bg-[#17171A] border border-[#2D2D32] rounded-[10px] pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-[#68686E] focus:outline-none focus:border-[#D4130D] transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7A7AB] hover:text-white text-xs cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Botão de Filtro Mobile & Ordenação */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Botão de Filtros (Mobile) */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[#17171A] border border-[#2D2D32] text-xs font-semibold text-[#CAC9CA] hover:text-white cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#D4130D]" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#D4130D] text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Ordenação */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#68686E] hidden md:inline">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#17171A] border border-[#2D2D32] rounded-[8px] px-3 py-2 text-xs text-[#CAC9CA] focus:outline-none focus:border-[#D4130D] cursor-pointer"
              >
                <option value="ano_novo">Mais Recentes</option>
                <option value="preco_menor">Menor Preço</option>
                <option value="preco_maior">Maior Preço</option>
                <option value="km_menor">Menor KM</option>
              </select>
            </div>

            {/* WhatsApp Direto */}
            <button
              type="button"
              onClick={handleGeneralWhatsApp}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Falar no WhatsApp</span>
            </button>
          </div>

        </div>
      </section>

      {/* 3. Corpo Principal da Vitrine (Layout Duas Colunas: Filtros à Esquerda + Grade de Cards à Direita) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        <div className="flex items-start gap-8">
          
          {/* COLUNA ESQUERDA: Filtros Verticais em Sanfona (Desktop) */}
          <aside className="w-64 xl:w-72 shrink-0 hidden lg:block bg-[#121214] border border-[#2D2D32] rounded-[14px] p-5 sticky top-32">
            {renderFilterContent()}
          </aside>

          {/* COLUNA DIREITA: Grade de Carros & Paginação */}
          <div className="flex-1 min-w-0">
            
            {/* Header com contador de resultados e chips de filtros ativos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-[#2D2D32]">
              <div>
                <p className="text-xs text-[#A7A7AB]">
                  Exibindo <strong className="text-white font-bold tabular-nums">{filteredVehicles.length}</strong> de <strong className="text-white font-bold tabular-nums">{inStockVehicles.length}</strong> veículos em estoque
                </p>
              </div>

              {/* Badges de filtros ativos */}
              {activeFiltersCount > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedBrands.map(b => (
                    <span key={b} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#202024] text-[11px] text-[#CAC9CA] border border-[#2D2D32]">
                      {b}
                      <button onClick={() => handleToggleBrand(b)} className="hover:text-white"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {selectedPriceRange !== 'todos' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#202024] text-[11px] text-[#CAC9CA] border border-[#2D2D32]">
                      Preço filtrado
                      <button onClick={() => setSelectedPriceRange('todos')} className="hover:text-white"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  {minYear !== null && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#202024] text-[11px] text-[#CAC9CA] border border-[#2D2D32]">
                      {minYear}+
                      <button onClick={() => setMinYear(null)} className="hover:text-white"><X className="w-3 h-3" /></button>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] text-[#D4130D] hover:underline font-semibold ml-1 cursor-pointer"
                  >
                    Limpar todos
                  </button>
                </div>
              )}
            </div>

            {/* Caso sem resultados */}
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-20 bg-[#121214] rounded-[16px] border border-[#2D2D32] p-8">
                <Car className="w-12 h-12 text-[#68686E] mx-auto mb-3" />
                <h3 className="text-base font-bold text-white font-display">Nenhum veículo encontrado</h3>
                <p className="text-xs text-[#A7A7AB] mt-1 max-w-sm mx-auto">
                  Não encontramos nenhum veículo com as combinações de filtro selecionadas. Tente limpar alguns filtros para visualizar outras opções.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-5 px-4 py-2 rounded-[8px] bg-[#202024] hover:bg-[#D4130D] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Resetar Filtros
                </button>
              </div>
            ) : (
              
              /* GRADE DE CARROS (Estilo idêntico ao modelo da imagem, nas cores do VA Veículos) */
              <div className="flex-1 flex flex-col justify-between min-h-[520px]">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {pagination.paginatedItems.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      onClick={() => setSelectedVehicle(vehicle)}
                      className="bg-[#17171A] border border-[#2D2D32] hover:border-[#D4130D]/60 rounded-[14px] overflow-hidden transition-all duration-200 hover:shadow-2xl hover:shadow-black/70 flex flex-col group cursor-pointer"
                    >
                      {/* Foto superior */}
                      <div className="relative aspect-[16/10] bg-[#080809] overflow-hidden">
                        <img
                          src={vehicle.fotos[0] || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80'}
                          alt={`${vehicle.marca} ${vehicle.modelo}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {vehicle.fotos.length > 1 && (
                          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-[6px] bg-black/75 backdrop-blur-md text-[10px] text-[#F5F5F5] font-semibold border border-white/10">
                            {vehicle.fotos.length} fotos
                          </div>
                        )}
                        <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-[6px] bg-black/75 backdrop-blur-md text-[10px] text-[#A7A7AB] font-mono border border-white/10">
                          Final {vehicle.placa.slice(-2)}
                        </div>
                      </div>

                      {/* Conteúdo do Card (Estrutura idêntica à imagem de referência) */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          {/* Marca & Modelo em destaque superior (ex: CHEVROLET ONIX) */}
                          <h3 className="text-base font-extrabold text-[#F5F5F5] uppercase tracking-wide font-display group-hover:text-[#D4130D] transition-colors leading-snug">
                            {vehicle.marca} {vehicle.modelo}
                          </h3>

                          {/* Versão (ex: 1.0 TURBO ETANOL ECO...) */}
                          <p className="text-xs text-[#A7A7AB] uppercase truncate font-medium mt-0.5">
                            {vehicle.versao}
                          </p>

                          {/* Linha: Ano (esquerda) | Quilometragem (direita) */}
                          <div className="flex items-center justify-between text-xs text-[#CAC9CA] font-medium pt-3 pb-1 border-b border-[#2D2D32]/60">
                            <span className="font-semibold text-[#A7A7AB]">{vehicle.anoModelo}</span>
                            <span className="font-semibold tabular-nums text-white">
                              {formatNumber(vehicle.quilometragem)} KM
                            </span>
                          </div>

                          {/* Preço em destaque grande (ex: R$ 89.990) */}
                          <div className="pt-2">
                            <span className="text-2xl font-black text-white font-display tracking-tight">
                              {formatCurrency(vehicle.valorAnunciado)}
                            </span>
                          </div>

                          {/* Localização da Loja com ícone de pin (ex: 📍 VA VEÍCULOS • AREIAL - PB) */}
                          <div className="flex items-center gap-1.5 text-[11px] text-[#A7A7AB] uppercase font-semibold pt-1">
                            <MapPin className="w-3.5 h-3.5 text-[#D4130D] shrink-0" />
                            <span className="truncate">{cleanStoreName} • {store.cidade || 'Areial'} - {store.estado || 'PB'}</span>
                          </div>
                        </div>

                        {/* Botão full-width: "Ver detalhes" (Estilo idêntico ao modelo da imagem) */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVehicle(vehicle);
                            }}
                            className="w-full py-2.5 rounded-[8px] bg-[#222227] hover:bg-[#D4130D] text-white text-xs font-bold tracking-wide transition-all duration-200 text-center cursor-pointer shadow-sm group-hover:bg-[#D4130D]"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Paginação do Showroom com Cache em Memória */}
                {pagination.totalItems > 0 && (
                  <div className="mt-auto pt-10">
                    <PaginationControls
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      totalItems={pagination.totalItems}
                      pageSize={pagination.pageSize}
                      onPageChange={pagination.goToPage}
                      onPageSizeChange={pagination.changePageSize}
                      pageSizeOptions={[6, 9, 15, 30]}
                      isCached={pagination.isCurrentPageCached}
                      isLoading={pagination.isLoading}
                      itemLabel="carros em exposição"
                    />
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </main>

      {/* 4. Drawer de Filtros no Mobile */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#121214] border-l border-[#2D2D32] h-full p-5 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#2D2D32] mb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#D4130D]" />
                  <h3 className="font-bold text-white text-sm">Filtros do Estoque</h3>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-7 h-7 rounded-[6px] bg-[#202024] flex items-center justify-center text-[#A7A7AB] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {renderFilterContent()}
            </div>

            <div className="pt-4 border-t border-[#2D2D32] mt-6">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full py-2.5 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] text-white font-bold text-xs uppercase tracking-wider"
              >
                Ver {filteredVehicles.length} Veículo(s)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal de Ficha Técnica Completa do Veículo */}
      {selectedVehicle && (
        <VehicleDetailModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          store={store}
          allVehicles={inStockVehicles}
          onSelectVehicle={(v) => {
            setSelectedVehicle(v);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* 6. Rodapé da Vitrine */}
      <footer className="bg-[#080809] border-t border-[#2D2D32] mt-16 py-12 text-[#A7A7AB] text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="mb-3">
                <BrandLogo store={store} size="md" />
              </div>
              <p className="text-[#A7A7AB] text-xs max-w-md leading-relaxed mb-3">
                Excelência no comércio de veículos seminovos. Transparência, procedência garantida e atendimento personalizado para Areial e todo o estado da Paraíba.
              </p>
              <div className="text-[11px] text-[#68686E] space-y-1">
                <p>{store.razaoSocial} • CNPJ: {store.cnpj}</p>
                <p>{store.endereco}, {store.cidade} - {store.estado}</p>
              </div>
            </div>

            <div className="md:text-right">
              <h4 className="text-white font-semibold mb-3">Atendimento ao Cliente</h4>
              <ul className="space-y-2 text-xs md:inline-block md:text-left">
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
          </div>

          <div className="pt-6 border-t border-[#2D2D32] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#68686E]">
            <p>© {new Date().getFullYear()} {cleanStoreName}. Todos os direitos reservados.</p>
            <div className="flex items-center gap-4">
              <p>VA Veículos • Sistema Integrado de Gestão Automotiva · Areial - PB</p>
              <button
                type="button"
                onClick={onEnterManagement}
                className="hover:text-neutral-400 transition-colors cursor-pointer underline text-[11px]"
              >
                Acesso Restrito
              </button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default ShowroomView;
