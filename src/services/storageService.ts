import { storage, isFirebaseConfigured } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export interface UploadEvidenceOptions {
  developerCompanyId: string;
  clientCompanyId: string;
  projectId: string;
  reportId: string;
  itemId: string;
  type: 'original' | 'annotated' | 'attachment';
  dataUrlOrBase64: string;
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp';
}

export interface UploadResult {
  url: string;
  storagePath: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface EvidencePairUploadResult {
  originalUrl?: string;
  originalStoragePath?: string;
  annotatedUrl?: string;
  annotatedStoragePath?: string;
}

export class StorageUnavailableError extends Error {
  constructor(message: string, public readonly originalCause?: unknown) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Calculates accurate byte length from a Base64 or Data URL string
 */
export function getBase64ByteLength(dataUrlOrBase64: string): number {
  if (!dataUrlOrBase64) return 0;
  const base64Data = dataUrlOrBase64.includes(',')
    ? dataUrlOrBase64.split(',')[1]
    : dataUrlOrBase64;

  const cleanBase64 = base64Data.trim();
  const padding = cleanBase64.endsWith('==') ? 2 : cleanBase64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((cleanBase64.length * 3) / 4) - padding);
}

/**
 * Extracts MIME type from a data URL, defaulting to image/png
 */
export function detectMimeType(dataUrlOrBase64: string): 'image/png' | 'image/jpeg' | 'image/webp' {
  if (dataUrlOrBase64.startsWith('data:image/jpeg')) return 'image/jpeg';
  if (dataUrlOrBase64.startsWith('data:image/webp')) return 'image/webp';
  return 'image/png';
}

export const storageService = {
  /**
   * Upload an evidence image (original or annotated) to Cloud Storage.
   * STRICT: No silent Base64 fallback. If Storage is unavailable or fails,
   * it throws StorageUnavailableError so the user can be notified and retry.
   */
  async uploadIncidentImage(options: UploadEvidenceOptions): Promise<UploadResult> {
    const {
      developerCompanyId,
      clientCompanyId,
      projectId,
      reportId,
      itemId,
      type,
      dataUrlOrBase64,
    } = options;

    if (!dataUrlOrBase64) {
      throw new Error('No se proporcionaron datos de imagen para la subida.');
    }

    const mimeType = options.mimeType || detectMimeType(dataUrlOrBase64);
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Tipo de archivo '${mimeType}' no admitido. Utilice PNG, JPEG o WebP.`);
    }

    const sizeInBytes = getBase64ByteLength(dataUrlOrBase64);
    if (sizeInBytes > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(
        `La imagen (${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB) excede el tamaño máximo permitido de 10 MB.`
      );
    }

    if (!isFirebaseConfigured() || !storage) {
      throw new StorageUnavailableError(
        'El servicio de almacenamiento en la nube (Cloud Storage) no está configurado. La evidencia no puede ser almacenada de manera permanente.'
      );
    }

    // Unique non-colliding path: prevents overwrites and race conditions
    const timestamp = Date.now();
    const entropy = Math.random().toString(36).substring(2, 8);
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
    const storagePath = `tenants/${developerCompanyId}/clients/${clientCompanyId}/projects/${projectId}/incidents/${reportId}/${itemId}_${type}_${timestamp}_${entropy}.${extension}`;

    try {
      const storageRef = ref(storage, storagePath);
      await uploadString(storageRef, dataUrlOrBase64, 'data_url', {
        contentType: mimeType,
        customMetadata: {
          developerCompanyId,
          clientCompanyId,
          projectId,
          reportId,
          itemId,
          evidenceType: type,
          uploadedAt: new Date().toISOString(),
        },
      });

      const downloadUrl = await getDownloadURL(storageRef);

      return {
        url: downloadUrl,
        storagePath,
        sizeBytes: sizeInBytes,
        uploadedAt: new Date().toISOString(),
      };
    } catch (cloudStorageErr: any) {
      console.error('[StorageService] Error al subir archivo a Cloud Storage:', cloudStorageErr);
      throw new StorageUnavailableError(
        `Fallo al subir evidencia a Cloud Storage: ${cloudStorageErr.message || 'Error de red o permisos'}. El reporte no se ha enviado para evitar pérdida de evidencias.`,
        cloudStorageErr
      );
    }
  },

  /**
   * Uploads both original and annotated images as separate files in Cloud Storage
   */
  async uploadIncidentEvidencePair(
    options: Omit<UploadEvidenceOptions, 'type' | 'dataUrlOrBase64'> & {
      originalDataUrl?: string;
      annotatedDataUrl?: string;
    }
  ): Promise<EvidencePairUploadResult> {
    const result: EvidencePairUploadResult = {};

    if (options.originalDataUrl && options.originalDataUrl.startsWith('data:')) {
      const origUpload = await this.uploadIncidentImage({
        ...options,
        type: 'original',
        dataUrlOrBase64: options.originalDataUrl,
      });
      result.originalUrl = origUpload.url;
      result.originalStoragePath = origUpload.storagePath;
    } else if (options.originalDataUrl) {
      result.originalUrl = options.originalDataUrl;
    }

    if (options.annotatedDataUrl && options.annotatedDataUrl.startsWith('data:')) {
      const annotUpload = await this.uploadIncidentImage({
        ...options,
        type: 'annotated',
        dataUrlOrBase64: options.annotatedDataUrl,
      });
      result.annotatedUrl = annotUpload.url;
      result.annotatedStoragePath = annotUpload.storagePath;
    } else if (options.annotatedDataUrl) {
      result.annotatedUrl = options.annotatedDataUrl;
    }

    return result;
  },
};
