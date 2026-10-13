import React, { useState } from 'react';
import { 
  X, Check, Calendar, Gauge, 
  Fuel, Settings, MessageCircle, ChevronLeft, 
  ChevronRight, Phone, Info
} from 'lucide-react';
import { Vehicle, StoreProfile } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { BrandLogo } from '../common/BrandLogo';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  store: StoreProfile;
}

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle,
  onClose,
  store
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  if (!vehicle) return null;

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Olá! Tenho interesse no ${vehicle.marca} ${vehicle.modelo} ${vehicle.versao} (${vehicle.anoModelo}) anunciado por ${formatCurrency(vehicle.valorAnunciado)} na VA Veículos em Areial-PB. Gostaria de mais informações!`
    );
    const phoneClean = (store.whatsapp || store.telefone || '83987654321').replace(/\D/g, '');
    window.open(`https://wa.me/55${phoneClean}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl relative text-white my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-neutral-700 flex items-center justify-center text-white transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[90vh] overflow-y-auto">
          
          {/* Left Column: Photos & Visuals (7 cols) */}
          <div className="lg:col-span-7 bg-black p-4 sm:p-6 flex flex-col justify-between">
            {/* Main Photo */}
            <div>
              <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 group">
                <img
                  src={vehicle.fotos[activePhotoIdx] || 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80'}
                  alt={`${vehicle.marca} ${vehicle.modelo}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />

                {/* Counter of photos */}
                {vehicle.fotos.length > 0 && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-[11px] text-neutral-300 font-medium">
                    Foto {activePhotoIdx + 1} de {vehicle.fotos.length}
                  </div>
                )}

                {/* Arrows if multiple photos */}
                {vehicle.fotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : vehicle.fotos.length - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/10 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActivePhotoIdx((prev) => (prev < vehicle.fotos.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center border border-white/10 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails (Supports up to 10 photos) */}
              {vehicle.fotos.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
                  {vehicle.fotos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePhotoIdx(i)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                        activePhotoIdx === i ? 'border-amber-400 scale-105 shadow-md shadow-amber-400/20' : 'border-neutral-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Localidade e Atendimento com Logo Institucional */}
            <div className="mt-6 p-4 rounded-xl border border-neutral-800 bg-neutral-950/60 text-xs text-neutral-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BrandLogo store={store} size="sm" showText={false} className="shrink-0" />
                <div>
                  <p className="font-semibold text-white">Disponível para visitação e teste</p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">
                    {store.nomeFantasia} · {store.endereco}, {store.cidade} - {store.estado}
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-amber-400 font-medium px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20 shrink-0">
                Pátio {store.cidade}
              </span>
            </div>
          </div>

          {/* Right Column: Specs & Direct WhatsApp Action (5 cols) */}
          <div className="lg:col-span-5 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-neutral-800 bg-neutral-900/80">
            <div>
              {/* Header */}
              <div className="mb-4">
                <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                  {vehicle.marca} • {vehicle.tipo === 'moto' ? 'MOTO' : 'CARRO'}
                </span>
                <h2 className="text-2xl font-bold font-display text-white mt-0.5">
                  {vehicle.modelo}
                </h2>
                <p className="text-neutral-400 text-sm">{vehicle.versao}</p>
                
                <div className="mt-4 p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] text-neutral-400 block font-medium">Preço à vista</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-display tabular-nums">
                      {formatCurrency(vehicle.valorAnunciado)}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    {vehicle.status === 'em_estoque' ? 'Disponível no pátio' : 'Vendido'}
                  </span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-6">
                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Ano</span>
                    <span className="font-semibold text-white">{vehicle.anoFabricacao}/{vehicle.anoModelo}</span>
                  </div>
                </div>

                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-neutral-400" />
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Quilometragem</span>
                    <span className="font-semibold text-white tabular-nums">{formatNumber(vehicle.quilometragem)} km</span>
                  </div>
                </div>

                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800 flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-neutral-400" />
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Combustível</span>
                    <span className="font-semibold text-white">{vehicle.combustivel}</span>
                  </div>
                </div>

                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-neutral-400" />
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Câmbio</span>
                    <span className="font-semibold text-white">{vehicle.cambio}</span>
                  </div>
                </div>

                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border border-neutral-700 bg-neutral-700" />
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Cor</span>
                    <span className="font-semibold text-white">{vehicle.cor}</span>
                  </div>
                </div>

                <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800 flex items-center gap-2">
                  <Info className="w-4 h-4 text-neutral-400" />
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Final da Placa</span>
                    <span className="font-semibold text-white">{vehicle.placa.slice(-2)}</span>
                  </div>
                </div>
              </div>

              {/* Highlights */}
              {vehicle.descricaoDestaques && vehicle.descricaoDestaques.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                    Destaques & Opcionais
                  </h4>
                  <div className="space-y-1.5">
                    {vehicle.descricaoDestaques.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-neutral-300">
                        <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-4 border-t border-neutral-800">
              <button
                onClick={handleWhatsApp}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-neutral-950" />
                Negociar via WhatsApp (DDD 83)
              </button>

              <div className="text-center">
                <span className="text-[11px] text-neutral-400 flex items-center justify-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-500" />
                  Telefone da loja: <strong className="text-white">{store.telefone || '(83) 3381-1234'}</strong> · {store.cidade} - {store.estado}
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
