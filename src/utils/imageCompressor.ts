/**
 * Utilitário de compressão e sanitização de imagens para a VA Veículos.
 * Permite envio de até 10 fotos por veículo e logotipo da loja
 * com compressão adaptativa em Canvas no navegador, garantindo
 * alta qualidade, sanitização e prevenção contra uploads maliciosos (ex: SVG/XSS).
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 a 1
  mimeType?: 'image/jpeg' | 'image/webp';
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_INPUT_FILE_SIZE = 15 * 1024 * 1024; // 15 MB limite de segurança para evitar travamento da aba

export const compressImageFile = async (
  file: File,
  options: CompressionOptions = {}
): Promise<string> => {
  const {
    maxWidth = 1280,
    maxHeight = 960,
    quality = 0.82,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    // 1. Whitelist estrita de MIME types rasterizados (bloqueia image/svg+xml e outros formatos com risco de script)
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return reject(new Error('Formato de imagem não permitido. Envie apenas arquivos JPEG, PNG ou WebP.'));
    }

    // 2. Validação de tamanho máximo de arquivo de entrada
    if (file.size > MAX_INPUT_FILE_SIZE) {
      return reject(new Error('O arquivo selecionado excede o limite máximo de 15 MB.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
    
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao processar dados da imagem.'));
      
      img.onload = () => {
        let { width, height } = img;

        // Redimensionamento proporcional seguro
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Contexto gráfico indisponível para sanitização e rasterização da imagem.'));
        }

        // Fundo branco limpo para formatos com perda (JPEG)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Suavização bilinear de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const base64 = canvas.toDataURL(mimeType, quality);
          resolve(base64);
        } catch {
          // Se falhar a compressão no mimeType específico, tenta jpeg padrão
          try {
            const fallbackBase64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve(fallbackBase64);
          } catch (err) {
            reject(err);
          }
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Processa múltiplos arquivos de imagens, limitando ao máximo estipulado (ex: 10 fotos por veículo)
 */
export const compressMultipleImages = async (
  files: FileList | File[],
  maxCount: number = 10,
  currentCount: number = 0
): Promise<string[]> => {
  const remainingSlots = Math.max(0, maxCount - currentCount);
  if (remainingSlots <= 0) return [];

  const filesToProcess = Array.from(files).slice(0, remainingSlots);
  const compressedResults: string[] = [];

  for (const file of filesToProcess) {
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 1280,
        maxHeight: 960,
        quality: 0.82
      });
      compressedResults.push(compressed);
    } catch (err) {
      console.warn('Erro ao comprimir imagem individual:', err);
    }
  }

  return compressedResults;
};
