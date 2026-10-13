import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Car, User, ShoppingCart, ArrowRight, ShieldCheck } from 'lucide-react';
import { Vehicle, FormerOwner, Sale, Salesperson } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  owners: FormerOwner[];
  sales: Sale[];
  salespeople: Salesperson[];
  onNavigateToTab: (tab: string, entityId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  owners,
  sales,
  salespeople,
  onNavigateToTab
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return { vehicles: [], owners: [], sales: [], salespeople: [] };

    const matchedVehicles = vehicles.filter(v =>
      v.marca.toLowerCase().includes(q) ||
      v.modelo.toLowerCase().includes(q) ||
      v.versao.toLowerCase().includes(q) ||
      v.placa.toLowerCase().includes(q) ||
      v.renavam.toLowerCase().includes(q) ||
      v.chassi.toLowerCase().includes(q) ||
      v.cor.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedOwners = owners.filter(o =>
      o.nome.toLowerCase().includes(q) ||
      o.cpf.toLowerCase().includes(q) ||
      o.telefone.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedSales = sales.filter(s =>
      s.clienteNome.toLowerCase().includes(q) ||
      s.clienteCpf.toLowerCase().includes(q) ||
      s.vendedorNome.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedSellers = salespeople.filter(sp =>
      sp.nome.toLowerCase().includes(q) ||
      sp.email.toLowerCase().includes(q)
    ).slice(0, 3);

    return {
      vehicles: matchedVehicles,
      owners: matchedOwners,
      sales: matchedSales,
      salespeople: matchedSellers
    };
  }, [query, vehicles, owners, sales, salespeople]);

  const totalResults = results.vehicles.length + results.owners.length + results.sales.length + results.salespeople.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#17171A] border border-[#2D2D32] rounded-[12px] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#2D2D32] bg-[#202024]">
          <Search className="w-5 h-5 text-[#A7A7AB] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por veículo, placa, RENAVAM, cliente, CPF, vendedor ou venda..."
            className="w-full bg-transparent text-sm text-[#F5F5F5] placeholder-[#68686E] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#A7A7AB] hover:text-[#F5F5F5] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-2 px-2 py-1 text-xs text-[#A7A7AB] hover:text-[#F5F5F5] bg-[#17171A] border border-[#2D2D32] rounded"
          >
            ESC
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 no-scrollbar">
          {query.trim().length < 2 && (
            <div className="py-10 text-center text-xs text-[#68686E]">
              Digite pelo menos 2 caracteres para pesquisar em todo o sistema.
            </div>
          )}

          {query.trim().length >= 2 && totalResults === 0 && (
            <div className="py-10 text-center text-sm text-[#A7A7AB]">
              Nenhum resultado encontrado para &ldquo;<span className="text-[#F5F5F5]">{query}</span>&rdquo;.
            </div>
          )}

          {/* Vehicles matched */}
          {results.vehicles.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-[#D4130D]" /> Veículos ({results.vehicles.length})
              </div>
              <div className="space-y-1">
                {results.vehicles.map(v => (
                  <button
                    key={v.id}
                    onClick={() => {
                      onNavigateToTab('inventory', v.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] text-left transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#F5F5F5] group-hover:text-[#D4130D] transition-colors">
                        {v.marca} {v.modelo} <span className="text-xs text-[#A7A7AB] font-normal">{v.versao}</span>
                      </div>
                      <div className="text-xs text-[#A7A7AB]">
                        Placa: <span className="text-[#CAC9CA] font-medium font-mono">{v.placa}</span> • {v.anoFabricacao}/{v.anoModelo} • {v.cor}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#F5F5F5] font-num">
                        {formatCurrency(v.valorAnunciado)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#A7A7AB] group-hover:text-[#D4130D]" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Owners / Clients matched */}
          {results.owners.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#3B82F6]" /> Pessoas / Antigos Donos ({results.owners.length})
              </div>
              <div className="space-y-1">
                {results.owners.map(o => (
                  <button
                    key={o.id}
                    onClick={() => {
                      onNavigateToTab('owners', o.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] text-left transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#F5F5F5] group-hover:text-[#3B82F6] transition-colors">
                        {o.nome}
                      </div>
                      <div className="text-xs text-[#A7A7AB]">
                        CPF: <span className="text-[#CAC9CA]">{o.cpf}</span> • Tel: {o.telefone}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#A7A7AB] group-hover:text-[#3B82F6]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sales matched */}
          {results.sales.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-[#22C55E]" /> Vendas Realizadas ({results.sales.length})
              </div>
              <div className="space-y-1">
                {results.sales.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onNavigateToTab('sales', s.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] text-left transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#F5F5F5]">
                        Cliente: {s.clienteNome}
                      </div>
                      <div className="text-xs text-[#A7A7AB]">
                        Vendedor: {s.vendedorNome} • Data: {new Date(s.dataVenda).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#22C55E] font-num">
                        {formatCurrency(s.valorVenda)}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#A7A7AB] group-hover:text-[#22C55E]" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Salespeople matched */}
          {results.salespeople.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" /> Equipe de Vendas ({results.salespeople.length})
              </div>
              <div className="space-y-1">
                {results.salespeople.map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => {
                      onNavigateToTab('settings');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] text-left transition-colors group cursor-pointer"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#F5F5F5]">
                        {sp.nome}
                      </div>
                      <div className="text-xs text-[#A7A7AB]">
                        {sp.email} • Tel: {sp.telefone}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#A7A7AB] group-hover:text-[#F59E0B]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#202024] border-t border-[#2D2D32] text-[11px] text-[#68686E] flex justify-between items-center">
          <span>Pressione ESC para fechar</span>
          <span>Pesquisa Global VA Veículos</span>
        </div>

      </div>
    </div>
  );
};
