import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

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

  // Cache em memória de páginas já visitadas: chave = número da página, valor = array de itens
  const pageCacheRef = useRef<Map<number, T[]>>(new Map());

  // Limpa o cache sempre que filtros ou dependências mudarem
  useEffect(() => {
    pageCacheRef.current.clear();
    setCurrentPage(1);
    setIsCurrentPageCached(false);
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  // Caso 1: Paginação sobre array fornecido (local/híbrido com cache de páginas visitadas)
  useEffect(() => {
    if (items) {
      setTotalItems(items.length);
      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = startIdx + pageSize;

      // Verifica se a página já existe no cache
      if (pageCacheRef.current.has(currentPage)) {
        setPaginatedItems(pageCacheRef.current.get(currentPage)!);
        setIsCurrentPageCached(true);
      } else {
        // Puxa a fatia sob demanda e armazena no cache para consultas futuras
        const slice = items.slice(startIdx, endIdx);
        pageCacheRef.current.set(currentPage, slice);
        setPaginatedItems(slice);
        setIsCurrentPageCached(false);
      }
    }
  }, [items, currentPage, pageSize]);

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
      pageCacheRef.current.set(pageToLoad, result.data);
      setPaginatedItems(result.data);
      if (typeof result.totalCount === 'number') {
        setTotalItems(result.totalCount);
      }
    } catch (err) {
      console.warn('Erro ao carregar página sob demanda do banco:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage]);

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
      pageCacheRef.current.set(1, slice);
      setPaginatedItems(slice);
      setCurrentPage(1);
    }
  }, [fetchPage, items, currentPage, pageSize, loadAsyncPage]);

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

