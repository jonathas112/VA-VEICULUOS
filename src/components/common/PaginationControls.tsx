import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Zap, Loader2 } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  isCached?: boolean;
  isLoading?: boolean;
  className?: string;
  itemLabel?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  isCached = false,
  isLoading = false,
  className = '',
  itemLabel = 'registros'
}) => {
  if (totalItems === 0) return null;

  const validTotalPages = Math.max(1, totalPages);
  const startItem = Math.min(totalItems, (currentPage - 1) * pageSize + 1);
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (validTotalPages <= maxVisible) {
      for (let i = 1; i <= validTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(validTotalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < validTotalPages - 2) pages.push('...');
      if (!pages.includes(validTotalPages)) pages.push(validTotalPages);
    }

    return pages;
  };

  return (
    <div className={`p-4 bg-[#121214] border border-[#2D2D32] rounded-[12px] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none ${className}`}>
      
      {/* Left side: Range information and cache badge */}
      <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
        <span className="text-[#A7A7AB]">
          Exibindo <strong className="text-[#F5F5F5] font-semibold">{startItem}</strong> a{' '}
          <strong className="text-[#F5F5F5] font-semibold">{endItem}</strong> de{' '}
          <strong className="text-[#F5F5F5] font-semibold">{totalItems}</strong> {itemLabel}
        </span>

        {/* Cache status badge */}
        {isCached && !isLoading && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30" title="Página carregada instantaneamente do cache em memória">
            <Zap className="w-3 h-3 text-[#22C55E]" />
            <span>Cache Ativo</span>
          </span>
        )}

        {/* Loading state indicator */}
        {isLoading && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4130D]/10 text-[#D4130D] border border-[#D4130D]/30">
            <Loader2 className="w-3 h-3 animate-spin text-[#D4130D]" />
            <span>Puxando do banco...</span>
          </span>
        )}

        {/* Page size selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2 pl-0 sm:pl-2 sm:border-l sm:border-[#2D2D32]">
            <span className="text-[#68686E] text-[11px]">Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-[#1A1A1E] text-[#CAC9CA] text-xs px-2 py-1 rounded-[6px] border border-[#2D2D32] focus:outline-none focus:border-[#D4130D] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First page button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1 || isLoading}
          className="p-1.5 rounded-[6px] text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#1A1A1E] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Primeira página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous page button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] font-semibold text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#1A1A1E] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Página anterior (recupera do cache sem consulta extra)"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Numbered page buttons */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-[#68686E]">
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading}
                className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#D4130D] text-white font-bold shadow-sm'
                    : 'text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#1A1A1E]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next page button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= validTotalPages || isLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] font-semibold text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#1A1A1E] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Próxima página (puxa sob demanda do banco se não estiver em cache)"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last page button */}
        <button
          type="button"
          onClick={() => onPageChange(validTotalPages)}
          disabled={currentPage >= validTotalPages || isLoading}
          className="p-1.5 rounded-[6px] text-[#A7A7AB] hover:text-[#F5F5F5] hover:bg-[#1A1A1E] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

