import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Calendar, Gauge, MapPin, Building2, Share2, 
  ChevronLeft, ChevronRight, MessageCircle, ArrowLeft, Check, Phone
} from 'lucide-react';
import { Vehicle, StoreProfile } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { BrandLogo } from '../common/BrandLogo';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  store: StoreProfile;
  allVehicles?: Vehicle[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  onClose,
  store,
  allVehicles = [],
  onSelectVehicle
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // 1. Bloqueia o scroll do body para evitar rolagem dupla
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // 2. Rola o container do modal para o topo sempre que o veículo muda
  useEffect(() => {
    setActivePhotoIdx(0);
    if (modalContainerRef.current) {
      modalContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [vehicle?.id]);

  if (!vehicle) return null;

  // Carros recomendados ("Carros que você pode gostar")
  const recommendedVehicles = allVehicles
    .filter(v => v.id !== vehicle.id && v.status === 'em_estoque')
    .slice(0, 4);

  // WhatsApp com mensagem pré-preenchida
  const handleWhatsAppContact = (customMsg?: string) => {
    const text = encodeURIComponent(
      customMsg || 
      `Olá! Tenho interesse no ${vehicle.marca} ${vehicle.modelo} ${vehicle.versao} (${vehicle.anoModelo}) anunciado por ${formatCurrency(vehicle.valorAnunciado)} na VA Veículos em Areial-PB. Gostaria de mais detalhes!`
    );
    const phoneClean = (store.whatsapp || store.telefone || '83987654321').replace(/\D/g, '');
    window.open(`https://wa.me/55${phoneClean}?text=${text}`, '_blank');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const fotos = vehicle.fotos && vehicle.fotos.length > 0 
    ? vehicle.fotos 
    : ['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80'];

  const prevPhoto = () => {
    setActivePhotoIdx((prev) => (prev === 0 ? fotos.length - 1 : prev - 1));
  };

  const nextPhoto = () => {
    setActivePhotoIdx((prev) => (prev === fotos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div 
      ref={modalContainerRef}
      className="fixed inset-0 z-50 overflow-y-auto bg-[#080809] text-[#F5F5F5] font-sans"
    >
      
      {/* 1. Barra Superior com Navegação e Retorno ao Estoque */}
      <header className="sticky top-0 z-30 bg-[#0D0D0F]/95 backdrop-blur-md border-b border-[#2D2D32] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#D4130D] text-xs font-bold text-[#CAC9CA] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4130D]" />
            <span>Voltar ao Estoque</span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs text-[#A7A7AB]">
            <span>Estoque</span>
            <span>•</span>
            <span className="text-[#CAC9CA]">{vehicle.marca}</span>
            <span>•</span>
            <span className="text-white font-medium">{vehicle.modelo}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <BrandLogo store={store} size="sm" />
          
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] text-[#CAC9CA] hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Compartilhar veículo"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="text-[#22C55E]">Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Compartilhar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] text-[#A7A7AB] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar detalhes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Conteúdo Principal da Ficha */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* Hero Section: Galeria de Fotos (Esquerda) + Informações de Venda (Direita) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Coluna Esquerda: Galeria de Fotos */}
          <div className="lg:col-span-7 space-y-3">
            {/* Foto Principal com Navegação */}
            <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full rounded-[14px] overflow-hidden bg-[#121214] border border-[#2D2D32] shadow-2xl">
              <img
                src={fotos[activePhotoIdx]}
                alt={`${vehicle.marca} ${vehicle.modelo} - Foto ${activePhotoIdx + 1}`}
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
              />

              {/* Tag de Contagem de Fotos */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-[6px] bg-black/75 backdrop-blur-sm text-[11px] font-medium text-white border border-white/10 font-mono">
                {activePhotoIdx + 1} de {fotos.length} fotos
              </div>

              {/* Botões de Navegação Anterior / Próximo */}
              {fotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 backdrop-blur-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10 backdrop-blur-sm"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Miniaturas em Carrossel Horizontal */}
            {fotos.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                {fotos.map((img, idx) => {
                  const isActive = idx === activePhotoIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`relative w-20 sm:w-24 h-16 rounded-[8px] overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                        isActive 
                          ? 'border-[#D4130D] ring-2 ring-[#D4130D]/30 scale-[1.02]' 
                          : 'border-[#2D2D32] opacity-60 hover:opacity-100 hover:border-[#CAC9CA]'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`Miniatura ${idx + 1}`} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita: Dados Principais e Ações de Compra */}
          <div className="lg:col-span-5 bg-[#17171A] border border-[#2D2D32] rounded-[16px] p-6 sm:p-7 space-y-5">
            
            {/* Título e Versão */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white font-display uppercase tracking-tight">
                  {vehicle.marca} {vehicle.modelo}
                </h1>
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-1.5 rounded-[6px] text-[#A7A7AB] hover:text-white transition-colors cursor-pointer"
                  title="Compartilhar"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm font-semibold text-[#CAC9CA] uppercase tracking-wide mt-1">
                {vehicle.versao}
              </p>
            </div>

            {/* Ficha Rápida com 4 Linhas */}
            <div className="space-y-2.5 text-xs">
              {/* Ano */}
              <div className="flex items-center justify-between py-1 border-b border-[#2D2D32]/60">
                <div className="flex items-center gap-2 text-[#A7A7AB]">
                  <Calendar className="w-4 h-4 text-[#A7A7AB]" />
                  <span>Ano</span>
                </div>
                <strong className="text-white font-semibold tabular-nums">
                  {vehicle.anoFabricacao}/{vehicle.anoModelo}
                </strong>
              </div>

              {/* Quilometragem */}
              <div className="flex items-center justify-between py-1 border-b border-[#2D2D32]/60">
                <div className="flex items-center gap-2 text-[#A7A7AB]">
                  <Gauge className="w-4 h-4 text-[#A7A7AB]" />
                  <span>Quilometragem</span>
                </div>
                <strong className="text-white font-semibold tabular-nums">
                  {formatNumber(vehicle.quilometragem)} Km
                </strong>
              </div>

              {/* Localização */}
              <div className="flex items-center justify-between py-1 border-b border-[#2D2D32]/60">
                <div className="flex items-center gap-2 text-[#A7A7AB]">
                  <MapPin className="w-4 h-4 text-[#D4130D]" />
                  <span>Localização</span>
                </div>
                <strong className="text-white uppercase font-semibold">
                  {store.cidade || 'AREIAL'} - {store.estado || 'PB'}
                </strong>
              </div>

              {/* Concessionária */}
              <div className="flex items-center justify-between py-1 border-b border-[#2D2D32]/60">
                <div className="flex items-center gap-2 text-[#A7A7AB]">
                  <Building2 className="w-4 h-4 text-[#A7A7AB]" />
                  <span>Concessionária</span>
                </div>
                <strong className="text-white uppercase font-semibold">
                  {store.nomeFantasia || 'VA VEÍCULOS'}
                </strong>
              </div>
            </div>

            {/* Preço em Destaque Grande e Link de Contato */}
            <div className="pt-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">
                  {formatCurrency(vehicle.valorAnunciado)}
                </span>

                <button
                  type="button"
                  onClick={() => handleWhatsAppContact()}
                  className="text-xs text-[#D4130D] hover:text-[#E3271F] font-bold underline decoration-dotted transition-colors cursor-pointer"
                >
                  Solicitar Contato
                </button>
              </div>
            </div>

            {/* Botão de Ação: "Fale com o vendedor" */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleWhatsAppContact()}
                className="w-full py-3.5 px-4 rounded-[10px] bg-[#D4130D] hover:bg-[#E3271F] text-white font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-lg shadow-[#D4130D]/20 group"
              >
                <MessageCircle className="w-4 h-4 text-white" />
                <span>Fale com o vendedor</span>
              </button>
            </div>

          </div>

        </section>

        {/* 3. SEÇÃO: Informações do Veículo (Quadro de 5 colunas idêntico ao modelo da imagem) */}
        <section className="bg-[#17171A] border border-[#2D2D32] rounded-[16px] p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-white font-display uppercase tracking-wider flex items-center gap-2 border-b border-[#2D2D32] pb-3">
            <span>Informações do veículo</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-6 gap-x-4 text-xs">
            {/* Modelo */}
            <div>
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Modelo</span>
              <strong className="text-white text-sm font-semibold uppercase">{vehicle.modelo}</strong>
            </div>

            {/* Final da Placa */}
            <div>
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Final da Placa</span>
              <strong className="text-white text-sm font-semibold font-mono">{vehicle.placa.slice(-1) || '0'}</strong>
            </div>

            {/* Versão */}
            <div className="sm:col-span-2 lg:col-span-1">
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Versão</span>
              <strong className="text-white text-xs font-semibold uppercase line-clamp-2">{vehicle.versao}</strong>
            </div>

            {/* Cor */}
            <div>
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Cor</span>
              <strong className="text-white text-sm font-semibold uppercase">{vehicle.cor}</strong>
            </div>

            {/* Marca */}
            <div>
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Marca</span>
              <strong className="text-white text-sm font-semibold uppercase">{vehicle.marca}</strong>
            </div>

            {/* Ano */}
            <div>
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Ano</span>
              <strong className="text-white text-sm font-semibold tabular-nums">{vehicle.anoFabricacao}/{vehicle.anoModelo}</strong>
            </div>

            {/* Quilometragem */}
            <div>
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Quilometragem</span>
              <strong className="text-white text-sm font-semibold tabular-nums">{formatNumber(vehicle.quilometragem)}</strong>
            </div>

            {/* Combustível */}
            <div>
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Combustível</span>
              <strong className="text-white text-sm font-semibold uppercase">{vehicle.combustivel}</strong>
            </div>

            {/* Câmbio */}
            <div>
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Câmbio</span>
              <strong className="text-white text-sm font-semibold uppercase">{vehicle.cambio}</strong>
            </div>

            {/* Grupo de Concessionária */}
            <div>
              <span className="text-[#A7A7AB] block text-[11px] mb-1">Grupo de Concessionária</span>
              <strong className="text-white text-sm font-semibold uppercase">{store.nomeFantasia || 'VA VEÍCULOS'}</strong>
            </div>
          </div>
        </section>

        {/* 4. SEÇÃO: Carros que você pode gostar (Diretamente abaixo das informações do veículo) */}
        {recommendedVehicles.length > 0 && (
          <section className="space-y-6 pt-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
                Carros que você pode gostar
              </h2>

              {/* Faixa indicativa com localização */}
              <div className="mt-2 p-3 rounded-[8px] bg-[#D4130D]/10 border border-[#D4130D]/30 text-xs text-[#CAC9CA] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#D4130D] shrink-0" />
                <span>
                  Você está vendo ofertas disponíveis em: <strong className="text-white">Areial - PB</strong>. Consulte nossa equipe para condições exclusivas.
                </span>
              </div>
            </div>

            {/* Grade de 4 Carros Recomendados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {recommendedVehicles.map(rec => (
                <div
                  key={rec.id}
                  onClick={() => onSelectVehicle ? onSelectVehicle(rec) : null}
                  className="bg-[#17171A] border border-[#2D2D32] hover:border-[#D4130D]/60 rounded-[14px] overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/70 flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    {/* Foto */}
                    <div className="relative aspect-[16/10] bg-[#080809] overflow-hidden">
                      <img
                        src={rec.fotos[0] || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80'}
                        alt={`${rec.marca} ${rec.modelo}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-[4px] bg-black/80 text-[9px] text-[#A7A7AB] font-mono">
                        Final {rec.placa.slice(-1) || '0'}
                      </div>
                    </div>

                    {/* Detalhes do Carro */}
                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-extrabold text-white uppercase font-display group-hover:text-[#D4130D] transition-colors truncate">
                        {rec.marca} {rec.modelo}
                      </h4>
                      <p className="text-[11px] text-[#A7A7AB] uppercase truncate font-medium">
                        {rec.versao}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-[#CAC9CA] pt-1">
                        <span>{rec.anoModelo}</span>
                        <span className="tabular-nums font-semibold">{formatNumber(rec.quilometragem)} KM</span>
                      </div>

                      <div className="pt-1">
                        <span className="text-lg font-black text-white font-display">
                          {formatCurrency(rec.valorAnunciado)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-[#A7A7AB] uppercase font-medium pt-1">
                        <MapPin className="w-3 h-3 text-[#D4130D] shrink-0" />
                        <span className="truncate">{store.nomeFantasia || 'VA VEÍCULOS'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectVehicle) onSelectVehicle(rec);
                      }}
                      className="w-full py-2 rounded-[6px] bg-[#222227] hover:bg-[#D4130D] text-white text-xs font-bold transition-colors text-center cursor-pointer group-hover:bg-[#D4130D]"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* 5. Rodapé da Vitrine */}
      <footer className="bg-[#080809] border-t border-[#2D2D32] mt-16 py-12 text-[#A7A7AB] text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
            <p>© {new Date().getFullYear()} {store.nomeFantasia}. Todos os direitos reservados.</p>
            <p>VA Veículos • Sistema Integrado de Gestão Automotiva · Areial - PB</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default VehicleDetailModal;
