/**
 * Utilitário de compressão de imagens para a VA Veículos.
 * Permite envio de até 10 fotos por veículo e logotipo da loja
 * com compressão adaptativa em Canvas no navegador, garantindo
 * alta qualidade e sincronização ágil no Firestore e cache local.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 a 1
  mimeType?: 'image/jpeg' | 'image/webp';
}

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
    // Validação básica
    if (!file.type.startsWith('image/')) {
      return reject(new Error('O arquivo selecionado não é uma imagem válida.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem.'));
    
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao processar dados da imagem.'));
      
      img.onload = () => {
        let { width, height } = img;

        // Redimensionamento proporcional
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
          return resolve(event.target?.result as string); // Fallback direto
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
