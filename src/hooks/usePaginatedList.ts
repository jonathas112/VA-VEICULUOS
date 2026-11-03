import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_CACHED_PAGES = 25;

export interface UsePaginatedListOptions<T> {
  // Array completo de itens (caso local/híbrido) OU função assíncrona para puxar do banco
  items?: T[];
  fetchPage?: (page: number, pageSize: number) => Promise<{ data: T[]; totalCount?: number }>;
  initialPageSize?: number;
  // Dependências que invalidam o cache (ex: filtros de busca, abas)
  dependencies?: any[];
}

export function usePaginatedList<T>({
  items,
  fetchPage,
  initialPageSize = 10,
  dependencies = []
}: UsePaginatedListOptions<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [paginatedItems, setPaginatedItems] = useState<T[]>([]);
  const [totalItems, setTotalItems] = useState(items ? items.length : 0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCurrentPageCached, setIsCurrentPageCached] = useState(false);

  // Cache em memória com limite LRU: chave = número da página, valor = array de itens
  const pageCacheRef = useRef<Map<number, T[]>>(new Map());
  const prevItemsRef = useRef<T[] | undefined>(items);

  // Helper para adicionar ao cache com limite LRU rígido (max 25 páginas para evitar sobrecarga de memória)
  const setPageInCache = useCallback((page: number, data: T[]) => {
    const cache = pageCacheRef.current;
    if (cache.has(page)) {
      cache.delete(page);
    } else if (cache.size >= MAX_CACHED_PAGES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }
    cache.set(page, data);
  }, []);

  // Limpa o cache e reinicia página sempre que filtros ou dependências externas mudarem
  useEffect(() => {
    pageCacheRef.current.clear();
    setCurrentPage(1);
    setIsCurrentPageCached(false);
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  // Caso 1: Paginação sobre array fornecido (local/híbrido com cache e invalidação imediata por mutação)
  useEffect(() => {
    if (items) {
      const newTotal = items.length;
      setTotalItems(newTotal);

      // Invalidação imediata quando o array de itens for atualizado/mutado
      if (prevItemsRef.current !== items) {
        pageCacheRef.current.clear();
        prevItemsRef.current = items;
      }

      const calculatedTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
      const safePage = Math.max(1, Math.min(currentPage, calculatedTotalPages));

      if (safePage !== currentPage) {
        setCurrentPage(safePage);
        return;
      }

      const startIdx = (safePage - 1) * pageSize;
      const endIdx = startIdx + pageSize;

      // Verifica se a página já existe no cache
      if (pageCacheRef.current.has(safePage)) {
        setPaginatedItems(pageCacheRef.current.get(safePage)!);
        setIsCurrentPageCached(true);
      } else {
        // Puxa a fatia sob demanda e armazena no cache LRU
        const slice = items.slice(startIdx, endIdx);
        setPageInCache(safePage, slice);
        setPaginatedItems(slice);
        setIsCurrentPageCached(false);
      }
    }
  }, [items, currentPage, pageSize, setPageInCache]);

  // Caso 2: Paginação assíncrona puxada sob demanda do banco de dados (ex: Firestore)
  const loadAsyncPage = useCallback(async (pageToLoad: number, currentSize: number) => {
    if (!fetchPage) return;

    // Se já estiver no cache, recupera instantaneamente sem requisição ao banco
    if (pageCacheRef.current.has(pageToLoad)) {
      setPaginatedItems(pageCacheRef.current.get(pageToLoad)!);
      setIsCurrentPageCached(true);
      return;
    }

    setIsLoading(true);
    setIsCurrentPageCached(false);

    try {
      const result = await fetchPage(pageToLoad, currentSize);
      setPageInCache(pageToLoad, result.data);
      setPaginatedItems(result.data);
      if (typeof result.totalCount === 'number') {
        setTotalItems(result.totalCount);
      }
    } catch (err) {
      console.warn('Erro ao carregar página sob demanda do banco:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, setPageInCache]);

  useEffect(() => {
    if (fetchPage) {
      loadAsyncPage(currentPage, pageSize);
    }
  }, [fetchPage, currentPage, pageSize, loadAsyncPage]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Navega para uma página garantindo limites
  const goToPage = useCallback((targetPage: number) => {
    const validPage = Math.max(1, Math.min(targetPage, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  // Altera o tamanho da página, invalidando o cache para recalcular os blocos
  const changePageSize = useCallback((newSize: number) => {
    pageCacheRef.current.clear();
    setPageSize(newSize);
    setCurrentPage(1);
    setIsCurrentPageCached(false);
  }, []);

  // Força invalidação de todo o cache
  const invalidateCache = useCallback(() => {
    pageCacheRef.current.clear();
    if (fetchPage) {
      loadAsyncPage(currentPage, pageSize);
    } else if (items) {
      const slice = items.slice(0, pageSize);
      setPageInCache(1, slice);
      setPaginatedItems(slice);
      setCurrentPage(1);
    }
  }, [fetchPage, items, currentPage, pageSize, loadAsyncPage, setPageInCache]);

  return {
    currentPage,
    pageSize,
    paginatedItems,
    totalPages,
    totalItems,
    isCurrentPageCached,
    isLoading,
    goToPage,
    changePageSize,
    invalidateCache
  };
}

